import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import authService from "../services/authService";
import queryCache from "../services/queryCache";
import cacheService from "../services/cacheService";
import { emitCacheEvent } from "../services/cacheEvents";
import { STORAGE_KEYS } from "../constants/storage";
import { API_BASE } from "../lib/axios";

const AuthContext = createContext(null);
const AuthLoadingContext = createContext(false);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Subscribe to ONLY the bootstrap-loading flag. The splash screen (index.js)
// needs this; nothing else does. Keeping it out of the main auth value means
// when bootstrap finishes (loading flips true → false) we don't tear the
// whole tree — only the splash component re-renders.
export const useAuthLoading = () => useContext(AuthLoadingContext);

/* Check if a JWT is expired (or will expire within bufferSec seconds) */
function isTokenExpired(token, bufferSec = 60) {
  try {
    const { exp } = jwtDecode(token);
    if (!exp) return true;
    return Date.now() / 1000 > exp - bufferSec;
  } catch {
    return true;
  }
}

/* Try refreshing tokens directly (without going through the interceptor) */
async function refreshTokens() {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;
  if (isTokenExpired(refreshToken, 0)) return null; // refresh token itself expired

  try {
    const res = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
    const newToken = res.data?.token;
    const newRefresh = res.data?.refresh_token;
    if (newToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.token, newToken);
      if (newRefresh) await AsyncStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
      return newToken;
    }
  } catch { /* refresh failed */ }
  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  /* Schedule a proactive refresh 5 min before access token expires */
  const scheduleRefresh = (accessToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      const { exp } = jwtDecode(accessToken);
      if (!exp) return;
      const msUntilExpiry = (exp * 1000) - Date.now() - (5 * 60 * 1000); // 5 min before
      if (msUntilExpiry <= 0) return; // already expired or too close
      refreshTimerRef.current = setTimeout(async () => {
        const newToken = await refreshTokens();
        if (newToken) {
          setToken(newToken);
          scheduleRefresh(newToken); // schedule next refresh
        }
      }, Math.min(msUntilExpiry, 2147483647)); // cap at max timeout
    } catch { /* ignore decode errors */ }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        let accessToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
        const cachedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);

        if (!accessToken) return; // no session

        // Show cached user immediately while we validate
        if (cachedUser) {
          try { setUser(JSON.parse(cachedUser)); } catch { /* corrupt cache */ }
        }

        // If access token expired, refresh BEFORE making any API call
        if (isTokenExpired(accessToken)) {
          const newToken = await refreshTokens();
          if (newToken) {
            accessToken = newToken;
          } else {
            // Both tokens expired — force logout
            await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.refreshToken, STORAGE_KEYS.user]);
            setToken(null);
            setUser(null);
            return;
          }
        }

        setToken(accessToken);

        // Fetch fresh user data. Only call setUser if the payload actually
        // changed vs the cached snapshot — otherwise the context value
        // recomputes with a new object reference, every consumer re-renders,
        // and the whole tree (Header + BottomTabBar + active screen) blinks
        // 1-3 seconds after app start. Deep-compare via JSON.
        try {
          const me = await authService.getMe();
          const meSerialized = JSON.stringify(me);
          if (meSerialized !== cachedUser) {
            setUser(me);
            await AsyncStorage.setItem(STORAGE_KEYS.user, meSerialized);
          }
          // Re-read token from storage (interceptor may have refreshed it)
          const latestToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
          if (latestToken && latestToken !== accessToken) {
            setToken(latestToken);
            accessToken = latestToken;
          }
        } catch (err) {
          if (err?.response?.status === 401) {
            // Interceptor already tried refresh and failed — clear session
            await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.refreshToken, STORAGE_KEYS.user]);
            setToken(null);
            setUser(null);
            return;
          }
          // Network error — keep cached user, don't logout
        }

        // Schedule proactive refresh
        scheduleRefresh(accessToken);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const setSession = async (data) => {
    await AsyncStorage.setItem(STORAGE_KEYS.token, data.token);
    if (data.refresh_token) {
      await AsyncStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    scheduleRefresh(data.token);
  };

  const login = async (identifier, password) => {
    const res = await authService.login(identifier, password);
    await setSession(res);
    return res;
  };

  const loginWithToken = async (data) => {
    await setSession(data);
  };

  const logout = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Hit the backend FIRST while the bearer token is still attached so the
    // server can revoke it (`invalidate_user_tokens` in routes/auth/auth.py:378).
    // Without this call, the access token stays valid on the server until its
    // natural expiry — a leaked token would remain usable after the user
    // believes they have logged out. Frontend does the same
    // (contexts/AuthContext.js:109). Best-effort: network failure must NOT
    // block the local sign-out, so swallow errors.
    try {
      await authService.logout();
    } catch {}
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.token,
      STORAGE_KEYS.refreshToken,
      STORAGE_KEYS.user,
    ]);
    // CRITICAL: clear every in-memory cache before swapping users. Without
    // this, the next user logs in and still sees the previous owner's
    // venues / bookings / slots etc. (module-level caches keyed by venueId
    // survive across logouts otherwise).
    try {
      queryCache.clear();
      cacheService.clear();
    } catch {}
    emitCacheEvent("auth:logout");
    setToken(null);
    setUser(null);
  };

  const updateUser = async (patch) => {
    const next = { ...(user || {}), ...(patch || {}) };
    setUser(next);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(next));
  };

  // Main value EXCLUDES `loading` so consumers (Header, screens) don't
  // re-render when bootstrap completes. The few consumers that need the
  // loading flag (just the splash screen) read it via useAuthLoading().
  const value = useMemo(
    () => ({ user, token, login, loginWithToken, logout, updateUser }),
    [user, token]
  );

  return (
    <AuthContext.Provider value={value}>
      <AuthLoadingContext.Provider value={loading}>
        {children}
      </AuthLoadingContext.Provider>
    </AuthContext.Provider>
  );
};
