import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  BellOff,
  ArrowUpDown,
  Search as SearchIcon,
  X as CloseIcon,
  Check as CheckIcon,
  CheckCheck,
} from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import notificationsService from "../../services/notificationsService";
import queryCache, { CACHE_TTL } from "../../services/queryCache";
import FullScreenLoader from "../../components/ui/FullScreenLoader";
import {
  isVisibleForVenueOwner,
} from "../../constants/notificationFilters";
import toast from "../../utils/toast";
import Header from "../../components/Header";
import EmptyState from "../../components/ui/EmptyState";

// Filter chips — mirrors frontend NotificationsPage filter set
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "slot_available", label: "Slot Alerts" },
  { key: "booking", label: "Bookings" },
  { key: "game_completed", label: "Completed" },
];

// Type → Ionicons name + colour (matches frontend's Lucide mapping
// 1:1 conceptually: location / time / trophy / generic bell)
function iconForType(type) {
  switch (type) {
    case "slot_available":
      return "location-outline";
    case "booking":
    case "booking_confirmed":
      return "time-outline";
    case "game_completed":
      return "trophy-outline";
    default:
      return "notifications-outline";
  }
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Group key: use the ISO date prefix AS-IS (do NOT convert to UTC).
// Frontend NotificationsPage.js groups by `n.created_at?.split("T")[0]` —
// matching that exactly preserves the original timezone's day boundary.
// Using `new Date(iso).toISOString().split("T")[0]` (UTC conversion)
// rolls early-morning IST notifications back to the previous day, inflating
// the next day's group count by 1-2.
function dateKey(iso) {
  if (!iso) return "Recent";
  return String(iso).split("T")[0] || "Recent";
}

// Local-time today/yesterday for the "Today" / "Yesterday" labels —
// matches the user's clock, not UTC.
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateLabel(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd === "Recent") return "Recent";
  const today = localDateKey(new Date());
  const yesterday = localDateKey(new Date(Date.now() - 86400000));
  if (yyyymmdd === today) return "Today";
  if (yyyymmdd === yesterday) return "Yesterday";
  try {
    return new Date(yyyymmdd + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return yyyymmdd;
  }
}

function NotificationRow({ item, onPress, onMarkRead }) {
  const iconColor = item.is_read ? "#94A3B8" : PRIMARY_COLOR;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(item)}
      style={[styles.card, !item.is_read && styles.cardUnread]}
    >
      <View
        style={[
          styles.iconBubble,
          { backgroundColor: item.is_read ? "#F1F5F9" : "#ECFDF5" },
        ]}
      >
        <Ionicons name={iconForType(item.type)} size={18} color={iconColor} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[styles.title, item.is_read && styles.titleRead]}
          >
            {item.title || "Update"}
          </Text>
          {!item.is_read ? <View style={styles.unreadDot} /> : null}
        </View>
        {item.message ? (
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}
        <Text style={styles.time}>{fmtTime(item.created_at)}</Text>
      </View>
      {!item.is_read ? (
        <TouchableOpacity
          style={styles.markBtn}
          activeOpacity={0.7}
          onPress={() => onMarkRead?.(item.id)}
          hitSlop={8}
        >
          <CheckIcon size={14} color={PRIMARY_COLOR} strokeWidth={2.8} />
        </TouchableOpacity>
      ) : (
        <View style={styles.chevWrap}>
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef(null);

  // Read initial items synchronously from queryCache so reopening the screen
  // shows yesterday's notifications immediately — silent background refresh
  // replaces them when the fetch completes. No pagination — frontend
  // NotificationsPage loads once with the default limit (30) and never
  // paginates. We mirror that so date-group counts match between web and
  // mobile.
  const initialItems = useMemo(() => {
    const cached = queryCache.getData("notifications:list");
    return Array.isArray(cached) ? cached : [];
  }, []);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search input — 200ms (matches frontend)
  const onChangeSearch = useCallback((value) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 200);
  }, []);

  // isRefresh: true when called from pull-to-refresh (skip the full-screen
  // spinner; the RefreshControl handles UI). Cached writes through queryCache
  // so re-entry to this screen renders the last list instantly.
  const load = useCallback(async ({ isRefresh = false } = {}) => {
    try {
      if (!isRefresh && !queryCache.has("notifications:list")) setLoading(true);
      const data = await notificationsService.list();
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      setItems(list);
      queryCache.patch("notifications:list", () => list, { ttl: CACHE_TTL.notifications });
    } catch (err) {
      toast.error(
        "Failed",
        err?.response?.data?.detail || "Could not load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Mount fetch: only when cache is empty. Cached items render immediately;
  // pull-to-refresh handles explicit refresh. Mirrors the user expectation
  // that revisiting a screen does not silently refetch + visibly re-render.
  useEffect(() => {
    if (!queryCache.has("notifications:list")) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note: frontend's NotificationsPage does NOT poll the list — only the
  // Navbar polls the unread-count endpoint for the Bell badge. The dashboard
  // already does that. Polling the list here flickers the screen back to
  // "Loading..." every 10 seconds AND wipes any pages the user has paginated
  // into, AND races with optimistic mark-read updates. Pull-to-refresh is
  // the manual refresh path.

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ isRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Strip player-only types (social/chat/group/mercenary) before any
  // count or grouping — venue owners shouldn't see these and they would
  // inflate the date-group counts vs the web view.
  const visibleItems = useMemo(
    () => items.filter(isVisibleForVenueOwner),
    [items]
  );

  const unreadCount = useMemo(
    () => visibleItems.filter((n) => !n.is_read).length,
    [visibleItems]
  );

  // Filter + search + sort + group-by-date — builds the FlatList data
  // array as alternating { _type: "header" } and { _type: "item" } rows.
  const listData = useMemo(() => {
    let filtered = visibleItems;
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (filter === "booking") {
      filtered = filtered.filter(
        (n) => n.type === "booking" || n.type === "booking_confirmed"
      );
    } else if (filter !== "all") {
      filtered = filtered.filter((n) => n.type === filter);
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered].sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });

    const out = [];
    const groupCount = new Map();
    let currentDate = null;
    let groupHeaderIndex = -1;
    for (const n of sorted) {
      const d = dateKey(n.created_at);
      if (d !== currentDate) {
        if (groupHeaderIndex >= 0) {
          out[groupHeaderIndex].count = groupCount.get(currentDate) || 0;
        }
        currentDate = d;
        groupHeaderIndex = out.length;
        out.push({ _type: "header", date: d, count: 0 });
      }
      groupCount.set(d, (groupCount.get(d) || 0) + 1);
      out.push({ _type: "item", ...n });
    }
    if (groupHeaderIndex >= 0) {
      out[groupHeaderIndex].count = groupCount.get(currentDate) || 0;
    }
    return out;
  }, [visibleItems, filter, sortOrder, debouncedSearch]);

  // Optimistic mark-read
  const handleMarkRead = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await notificationsService.markRead(id);
    } catch {
      // Silent revert is risky — log via toast but keep optimistic state
      // to match frontend behaviour. Backend will re-set on next refresh.
    }
  }, []);

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationsService.markAllRead();
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(
        "Failed",
        err?.response?.data?.detail || "Could not mark all as read."
      );
    }
  }, [unreadCount]);

  const handlePress = useCallback(
    (item) => {
      if (!item.is_read) handleMarkRead(item.id);
      // TODO: route by type (booking → /(stack)/venues with id, etc.)
    },
    [handleMarkRead]
  );

  const keyExtractor = useCallback((item, index) => {
    if (item._type === "header") return `h-${item.date}`;
    return item.id || `n-${index}`;
  }, []);

  const renderItem = useCallback(
    ({ item }) => {
      if (item._type === "header") {
        return (
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{fmtDateLabel(item.date)}</Text>
            <View style={styles.groupCount}>
              <Text style={styles.groupCountText}>{item.count}</Text>
            </View>
          </View>
        );
      }
      return (
        <NotificationRow
          item={item}
          onPress={handlePress}
          onMarkRead={handleMarkRead}
        />
      );
    },
    [handlePress, handleMarkRead]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Hero — title + unread count + Mark all */}
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroSub}>
              {loading
                ? "Loading..."
                : unreadCount > 0
                ? `${unreadCount} unread update${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up!"}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              activeOpacity={0.85}
              onPress={handleMarkAll}
            >
              <CheckCheck size={14} color={PRIMARY_COLOR} strokeWidth={2.5} />
              <Text style={styles.markAllBtnText}>Mark all</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search */}
        {visibleItems.length > 0 ? (
          <View style={styles.searchRow}>
            <SearchIcon size={15} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={onChangeSearch}
              placeholder="Search notifications"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  setDebouncedSearch("");
                }}
                hitSlop={8}
              >
                <CloseIcon size={14} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Filters + Sort */}
        <View style={styles.filtersRow}>
          <View style={styles.filtersChips}>
            {FILTERS.map((f) => {
              const active = f.key === filter;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[
              styles.sortBtn,
              sortOrder === "oldest" && styles.sortBtnActive,
            ]}
            activeOpacity={0.85}
            onPress={() =>
              setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))
            }
          >
            <ArrowUpDown
              size={14}
              color={sortOrder === "oldest" ? PRIMARY_COLOR : "#64748B"}
            />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [
      loading,
      unreadCount,
      handleMarkAll,
      visibleItems.length,
      search,
      onChangeSearch,
      filter,
      sortOrder,
    ]
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return <FullScreenLoader style={styles.initialLoad} />;
    }
    const filtersActive = filter !== "all" || !!debouncedSearch.trim();
    return (
      <View style={{ paddingTop: 24 }}>
        <EmptyState
          icon={BellOff}
          title="No notifications"
          subtitle={
            debouncedSearch.trim()
              ? "No notifications match your search"
              : filtersActive
              ? "Try a different filter"
              : "You're all caught up!"
          }
        />
      </View>
    );
  }, [loading, filter, debouncedSearch]);

  return (
    // edges={[]} — Header self-handles top inset (insets.top + 10 inside
    // Header.js:58). Adding "top" here would double-pad and leave a big
    // empty white strip above the header. Matches dashboard.js pattern.
    <SafeAreaView style={styles.safe} edges={[]}>
      <Header title="Notifications" subtitle="Updates and alerts" showBack />
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={<View style={{ height: 24 }} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_COLOR}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, gap: 12 },
  initialLoad: { paddingVertical: 60, alignItems: "center" },
  footerLoad: { paddingVertical: 18, alignItems: "center" },

  // Hero
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 12,
  },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroTitle: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
  },
  heroSub: { marginTop: 2, fontSize: 12, color: "#6B7280" },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}1A`,
  },
  markAllBtnText: {
    color: PRIMARY_COLOR,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    fontSize: 12,
  },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    fontWeight: "500",
    color: "#0F172A",
  },

  // Filters + Sort
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  filtersChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  filterChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#64748B",
  },
  filterChipTextActive: { color: "#FFFFFF" },
  sortBtn: {
    width: 36,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sortBtnActive: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    borderColor: `${PRIMARY_COLOR}55`,
  },

  // Date group header
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  groupCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
  },

  // Notification card
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    padding: 14,
  },
  cardUnread: {
    borderColor: `${PRIMARY_COLOR}55`,
    borderWidth: 1.5,
    backgroundColor: "#F0FDF4",
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#0F172A",
  },
  titleRead: { color: "#64748B", fontWeight: "600" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
  },
  message: {
    fontSize: 12,
    lineHeight: 17,
    color: "#475569",
    fontFamily: FONTS.bodyMedium,
  },
  time: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  markBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${PRIMARY_COLOR}1A`,
  },
  chevWrap: { width: 24, alignItems: "center", justifyContent: "center" },
});
