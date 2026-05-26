import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL as ENV_API_URL } from "@env";
import { STORAGE_KEYS } from "../constants/storage";
import toast from "../utils/toast";

// Throttle network-error toasts — a single connectivity outage can fire dozens of failed
// requests at once, we only want the user to see one "No internet" message.
let lastNetworkErrorToastAt = 0;
function notifyNetworkError(error) {
  const now = Date.now();
  if (now - lastNetworkErrorToastAt < 4000) return;
  lastNetworkErrorToastAt = now;
  const message =
    error?.code === "ECONNABORTED"
      ? "Request timed out. Please check your internet."
      : "No internet connection. Please try again.";
  toast.error(message);
}

const rawBase = ENV_API_URL || "http://localhost:8000";
const API_BASE = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
const ENABLE_HTTP_LOGS = __DEV__ && globalThis.__LOBBI_HTTP_LOGS__ === true;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/resend-otp",
  "/auth/reset-password",
  "/auth/register/send-otp",
  "/auth/register/verify-otp",
  "/auth/register/resend-otp",
];

api.interceptors.request.use(async (config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url?.includes(p));
  if (!isPublic) {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  if (ENABLE_HTTP_LOGS) {
    const method = (config.method || "GET").toUpperCase();
    const url = `${config.baseURL || ""}${config.url || ""}`;
    console.log(`[HTTP] ${method} ${url}`);
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => {
    if (ENABLE_HTTP_LOGS) {
      const method = (res.config?.method || "GET").toUpperCase();
      const url = `${res.config?.baseURL || ""}${res.config?.url || ""}`;
      console.log(`[HTTP] ${res.status} ${method} ${url}`);
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes("/auth/");
    if (ENABLE_HTTP_LOGS) {
      const method = (original?.method || "GET").toUpperCase();
      const url = `${original?.baseURL || ""}${original?.url || ""}`;
      const status = error.response?.status || "NetworkError";
      console.log(`[HTTP] ${status} ${method} ${url}`);
    }

    // Network failures (server unreachable, DNS error, request timeout, airplane mode etc.)
    // have no `error.response`. Surface a single throttled toast so the user knows the
    // request failed because of connectivity — the OfflineBanner already shows the
    // persistent state, this toast handles the moment-of-action failure feedback.
    if (!error.response && !error.config?._silentNetworkError) {
      notifyNetworkError(error);
    }

    if (error.response?.status === 401 && !original?._retry && !isAuthCall) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
        if (refreshToken) {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const nextToken = res.data.token;
          await AsyncStorage.setItem(STORAGE_KEYS.token, nextToken);
          if (res.data.refresh_token) {
            await AsyncStorage.setItem(STORAGE_KEYS.refreshToken, res.data.refresh_token);
          }
          processQueue(null, nextToken);
          original.headers.Authorization = `Bearer ${nextToken}`;
          return api(original);
        }
      } catch (refreshErr) {
        processQueue(refreshErr);
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.token,
          STORAGE_KEYS.refreshToken,
          STORAGE_KEYS.user,
        ]);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
