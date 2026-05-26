import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BellOff, ArrowDownUp, MapPin, Clock, CheckCircle, Zap } from "lucide-react-native";
import React from "react";
import AppCard from "../ui/AppCard";
import playerService from "../../services/playerService";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safePush } from "../../services/navigationGuard";
import { _notifBadge } from "../SwipeableTabView";
import NotificationsSkeleton from "../skeletons/NotificationsSkeleton";

// Per product request: keep only the "All" chip visible. Other filters are
// commented out (not deleted) so we can restore the full set later if needed.
// Original order matched frontend NotificationsPage.js:178-183.
const FILTERS = [
  { key: "all", label: "All" },
  // { key: "unread", label: "Unread" },
  // { key: "slot_available", label: "Slot Alerts" },
  // { key: "booking", label: "Bookings" },
  // { key: "game_completed", label: "Completed" },
];

// Exact mirror of frontend getIcon (NotificationsPage.js:121-133) — same lucide icons
// and same per-type colours.
function getIcon(type, size = 16) {
  switch (type) {
    case "slot_available":
      return <MapPin size={size} color="#4ADE80" />;       // green-400
    case "booking":
    case "booking_confirmed":
      return <Clock size={size} color="#34D399" />;        // brand-400
    case "game_completed":
      return <CheckCircle size={size} color="#34D399" />;  // emerald-400
    default:
      return <Zap size={size} color="#FBBF24" />;          // amber-400
  }
}

function formatTime(dateStr) {
  if (!dateStr) return "Just now";
  try {
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return "Just now"; }
}

function formatDateLabel(raw) {
  if (!raw) return "Recent";
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (raw === today) return "Today";
  if (raw === yesterday) return "Yesterday";
  try { return new Date(raw).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); } catch { return raw; }
}

// Memoized notification row to prevent re-renders during scroll
const NotificationRow = React.memo(function NotificationRow({ item, onPress, onMarkRead }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(item)}>
      <AppCard style={[styles.notificationCard, !item.is_read && styles.notificationCardUnread]}>
        <View style={styles.notificationIcon}>
          {getIcon(item.type, 16)}
        </View>
        <View style={styles.notificationBody}>
          <View style={styles.notificationHeading}>
            <Text numberOfLines={1} style={[styles.notificationTitle, item.is_read && styles.notificationTitleRead]}>
              {item.title || "Update"}
            </Text>
            {!item.is_read ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text numberOfLines={2} style={styles.notificationMessage}>{item.message || "No description available"}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
        </View>
        {/* Matches frontend (NotificationsPage.js:323-335): only the "mark read" button
            appears for unread rows. Read rows show NOTHING on the right side — the
            chevron arrow was a mobile-only addition that didn't exist on the web. */}
        {!item.is_read ? (
          <TouchableOpacity
            style={styles.markReadBtn}
            activeOpacity={0.7}
            onPress={() => onMarkRead(item.id || item._id)}
            hitSlop={8}
          >
            <Ionicons name="checkmark" size={16} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        ) : null}
      </AppCard>
    </TouchableOpacity>
  );
});

export default function NotificationsScreenContent() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const searchTimerRef = useRef(null);
  const handleSearchChange = useCallback((text) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      startTransition(() => setDeferredSearch(text));
    }, 200);
  }, []);
  const handleSearchClear = useCallback(() => {
    setSearch("");
    setDeferredSearch("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);
  const [sortOrder, setSortOrder] = useState("newest");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Exact mirror of frontend loadNotifications (NotificationsPage.js:54-63):
  // one fetch on mount, no polling, no client-side type filtering.
  const loadNotifications = useCallback(async (before = null) => {
    try {
      if (before) setLoadingMore(true);
      const data = await playerService.getNotifications(before);
      const list = data?.notifications || (Array.isArray(data) ? data : []);
      if (before) {
        setNotifications((prev) => [...prev, ...list]);
      } else {
        setNotifications(list);
      }
      setCursor(data?.next_cursor || null);
      setHasMore(!!data?.has_more);
    } catch {
      if (!before) setNotifications([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Mirror frontend (NotificationsPage.js:50-52): load ONCE on mount. No setInterval —
  // the previous 10-second poll was incorrectly labelled "matches web polling" but the
  // frontend has no polling at all. Removing it eliminates the re-render loop (bug #16).
  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const patch = useCallback((updater) => {
    setNotifications((prev) => updater(prev));
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && cursor) loadNotifications(cursor);
  }, [loadingMore, hasMore, cursor, loadNotifications]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  // Build flat list data with section headers
  const listData = useMemo(() => {
    const filtered = notifications
      .filter((item) => {
        if (filter === "unread") return !item.is_read;
        if (filter === "booking") return item.type === "booking" || item.type === "booking_confirmed";
        if (filter === "slot_available") return item.type === "slot_available";
        if (filter === "game_completed") return item.type === "game_completed";
        return true;
      })
      .filter((item) => {
        if (!deferredSearch.trim()) return true;
        const query = deferredSearch.trim().toLowerCase();
        return item.title?.toLowerCase().includes(query) || item.message?.toLowerCase().includes(query);
      });
    filtered.sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });

    // Group by date and flatten with section headers
    const result = [];
    let currentDate = null;
    let groupCount = 0;
    let groupStartIdx = -1;
    for (const item of filtered) {
      const raw = item.created_at?.split("T")?.[0] || "Recent";
      if (raw !== currentDate) {
        // Patch count into previous header
        if (groupStartIdx >= 0 && result[groupStartIdx]) {
          result[groupStartIdx].count = groupCount;
        }
        currentDate = raw;
        groupCount = 0;
        groupStartIdx = result.length;
        result.push({ _type: "header", date: raw, label: formatDateLabel(raw), count: 0 });
      }
      groupCount++;
      result.push({ _type: "item", ...item });
    }
    // Patch last header count
    if (groupStartIdx >= 0 && result[groupStartIdx]) {
      result[groupStartIdx].count = groupCount;
    }
    return result;
  }, [filter, notifications, deferredSearch, sortOrder]);

  const handleMarkRead = useCallback(async (id) => {
    patch((prev = []) => prev.map((item) => ((item.id || item._id) === id ? { ...item, is_read: true } : item)));
    try {
      await playerService.markNotificationRead(id);
      _notifBadge.refresh?.();
    } catch { toast.error("Failed to update notification"); }
  }, [patch]);

  const handleMarkAll = useCallback(async () => {
    patch((prev = []) => prev.map((item) => ({ ...item, is_read: true })));
    try {
      await playerService.markAllNotificationsRead();
      _notifBadge.refresh?.();
      toast.success("All notifications marked as read");
    } catch { toast.error("Failed to mark all as read"); }
  }, [patch]);

  const handleNotificationPress = useCallback((notification) => {
    if (!notification.is_read) handleMarkRead(notification.id || notification._id);
    const type = notification.type || "";
    const data = notification.data || notification.metadata || {};
    if (type === "booking" || type === "booking_confirmed") {
      if (data.venue_id) safePush(router, { pathname: "/(stack)/venues/[id]", params: { id: data.venue_id } });
    } else if (type === "match" || type === "match_request" || type === "game_completed") {
      safePush(router, "/(tabs)/matches");
    } else if (type === "message" || type === "chat") {
      if (data.conversation_id) safePush(router, { pathname: "/(stack)/chat/[conversationId]", params: { conversationId: data.conversation_id, name: data.sender_name || "Chat" } });
      else safePush(router, "/(tabs)/chat");
    } else if (type === "follow" || type === "social") {
      if (data.user_id) safePush(router, { pathname: "/(stack)/player/[userId]", params: { userId: data.user_id } });
    } else if (type === "slot_available") {
      if (data.venue_id) safePush(router, { pathname: "/(stack)/venues/[id]", params: { id: data.venue_id } });
      else safePush(router, "/(tabs)/venues");
    } else if (type === "tournament") {
      if (data.tournament_id) safePush(router, { pathname: "/(stack)/tournaments/[id]", params: { id: data.tournament_id } });
    } else if (type === "coaching" || type === "session") {
      safePush(router, "/(stack)/coaching");
    }
  }, [handleMarkRead, router]);

  const keyExtractor = useCallback((item, index) => {
    if (item._type === "header") return `header-${item.date}`;
    return item.id || item._id || `notif-${index}`;
  }, []);

  const renderItem = useCallback(({ item }) => {
    if (item._type === "header") {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel}>{item.label}</Text>
          <View style={styles.groupCountBadge}>
            <Text style={styles.groupCountText}>{item.count}</Text>
          </View>
        </View>
      );
    }
    return <NotificationRow item={item} onPress={handleNotificationPress} onMarkRead={handleMarkRead} />;
  }, [handleNotificationPress, handleMarkRead]);

  const headerComponent = useMemo(() => (
    <AppCard style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroSubtitle}>
            {unreadCount ? `${unreadCount} unread updates waiting for you` : "You're all caught up!"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} activeOpacity={0.9} onPress={handleMarkAll}>
            <Ionicons name="checkmark-done-outline" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {notifications.length > 0 ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search notifications"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={handleSearchClear} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.filtersAndSort}>
        <View style={styles.filtersRow}>
          {FILTERS.map((item) => {
            const active = item.key === filter;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.9}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.85}
          onPress={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
        >
          <ArrowDownUp size={14} color="#64748B" />
          <Text style={styles.sortBtnText}>{sortOrder === "newest" ? "Newest" : "Oldest"}</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  ), [unreadCount, notifications.length, search, filter, sortOrder, handleMarkAll, handleSearchChange, handleSearchClear]);

  const emptyComponent = useMemo(() => (
    <AppCard style={styles.emptyCard}>
      <BellOff size={40} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptyDesc}>
        {deferredSearch.trim() ? "No notifications match your search" : filter !== "all" ? "Try a different filter" : "You're all caught up!"}
      </Text>
    </AppCard>
  ), [deferredSearch, filter]);

  if (loading) {
    return <NotificationsSkeleton />;
  }

  return (
    <FlatList
      data={listData}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={emptyComponent}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={PRIMARY_COLOR} style={{ paddingVertical: 16 }} /> : null}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  // Hero
  heroCard: { gap: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  heroSubtitle: { marginTop: 4, fontSize: 13, color: "#64748B" },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
  markAllButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "#ECFDF5" },
  markAllText: { color: PRIMARY_COLOR, fontWeight: "800", fontSize: 12 },

  // Search
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, paddingHorizontal: 14, backgroundColor: "#F8FAFC" },
  searchInput: { flex: 1, paddingVertical: 13, color: "#0F172A", fontSize: 14 },

  // Filters + Sort
  filtersAndSort: { flexDirection: "row", alignItems: "center", gap: 10 },
  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  filterChipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  filterChipText: { fontWeight: "700", fontSize: 12, color: "#64748B" },
  filterChipTextActive: { color: "#FFFFFF" },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF", flexShrink: 0,
  },
  sortBtnText: { fontSize: 11, fontWeight: "600", color: "#64748B" },

  // Skeleton
  skeletonWrap: { gap: 12 },
  skeletonCard: { padding: 16 },
  skeletonRow: { flexDirection: "row", gap: 12 },
  skeletonIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#F1F5F9" },
  skeletonLines: { flex: 1, gap: 8, justifyContent: "center" },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: "#F1F5F9" },

  // Groups
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  groupLabel: { fontSize: 12, fontWeight: "800", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6 },
  groupCountBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  groupCountText: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },

  // Notification cards
  notificationCard: { flexDirection: "row", gap: 12 },
  notificationCardUnread: { borderColor: `${PRIMARY_COLOR}40`, backgroundColor: "#F0FDF4", borderWidth: 1.5 },
  notificationIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" },
  notificationBody: { flex: 1, gap: 4 },
  notificationHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  notificationTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#0F172A" },
  notificationTitleRead: { color: "#64748B", fontWeight: "600" },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: PRIMARY_COLOR },
  notificationMessage: { fontSize: 13, lineHeight: 19, color: "#475569" },
  notificationTime: { fontSize: 12, color: "#94A3B8" },
  markReadBtn: { alignSelf: "center", width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#ECFDF5" },

  // Empty state
  emptyCard: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 4 },
  emptyDesc: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
});
