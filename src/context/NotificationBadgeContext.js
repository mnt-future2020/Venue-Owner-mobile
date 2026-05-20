import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import useCachedResource from "../hooks/useCachedResource";
import { CACHE_TTL } from "../services/queryCache";
import notificationsService from "../services/notificationsService";
import { isVisibleForVenueOwner } from "../constants/notificationFilters";

// Single source of truth for the venue Bell badge. Without this, every tab
// (dashboard / venues / finance / profile) was running its OWN useCachedResource
// + setInterval, causing duplicate GET /notifications calls every 10s and
// repeated Header re-renders (visible as a whole-screen blink).
const NotificationBadgeContext = createContext({
  unreadCount: 0,
  bellAction: null,
  refresh: () => {},
});

export function NotificationBadgeProvider({ children }) {
  const router = useRouter();

  const { data: unreadCount = 0, refresh } = useCachedResource(
    "notifications:venue-unread",
    async () => {
      const data = await notificationsService.list();
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      return list.filter((n) => !n.is_read && isVisibleForVenueOwner(n)).length;
    },
    { ttl: CACHE_TTL.notifications, revalidateOnMount: true }
  );

  // Refresh recreates on every render; keep a stable callback so the context
  // value doesn't invalidate and cascade re-renders through every Header.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const stableRefresh = useCallback(() => refreshRef.current(), []);

  // ONE poll for the entire app — every 10s, matching frontend Navbar.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRef.current().catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const onPress = useCallback(
    () => router.push("/(stack)/notifications"),
    [router]
  );

  const bellAction = useMemo(
    () => ({
      key: "notif",
      icon: <Bell size={16} color="#374151" strokeWidth={2.3} />,
      badge: unreadCount > 0 ? unreadCount : null,
      onPress,
    }),
    [unreadCount, onPress]
  );

  const value = useMemo(
    () => ({ unreadCount, bellAction, refresh: stableRefresh }),
    [unreadCount, bellAction, stableRefresh]
  );

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export default NotificationBadgeContext;
