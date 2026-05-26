import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import chatService from "../services/chatService";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext({
  wishlistCount: 0,
  setWishlistCount: () => {},
  refreshUnreadCount: () => {},
  chatReadVersion: 0,
  notifyChatRead: () => {},
});

export function WishlistProvider({ children }) {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [chatReadVersion, setChatReadVersion] = useState(0);
  const { user } = useAuth();
  const intervalRef = useRef(null);
  const refreshInFlightRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const notifyChatRead = useCallback(() => {
    setChatReadVersion((v) => v + 1);
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }

    const now = Date.now();
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    if (now - lastRefreshAtRef.current < 300) {
      return null;
    }

    const run = (async () => {
      try {
        const data = await chatService.getUnifiedConversations({ force: true });
        const convos = data.conversations || data || [];
        if (Array.isArray(convos)) {
          const total = convos.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setWishlistCount(total);
          return total;
        }
      } catch {
        try {
          const [dms, groups] = await Promise.all([
            chatService.getConversations(),
            chatService.getGroups(),
          ]);
          const dmArr = Array.isArray(dms) ? dms : [];
          const grpArr = Array.isArray(groups) ? groups : [];
          const total = dmArr.reduce((s, c) => s + (c.unread_count || 0), 0)
            + grpArr.reduce((s, g) => s + (g.unread_count || 0), 0);
          setWishlistCount(total);
          return total;
        } catch {
          return null;
        }
      } finally {
        lastRefreshAtRef.current = Date.now();
        refreshInFlightRef.current = null;
      }
      return null;
    })();

    refreshInFlightRef.current = run;
    return run;
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      intervalRef.current = setInterval(refreshUnreadCount, 10000);
    } else {
      setWishlistCount(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, refreshUnreadCount]);

  const value = useMemo(
    () => ({ wishlistCount, setWishlistCount, refreshUnreadCount, chatReadVersion, notifyChatRead }),
    [wishlistCount, refreshUnreadCount, chatReadVersion, notifyChatRead]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}

export default WishlistContext;
