import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Building2,
  Calendar,
  IndianRupee,
  TrendingUp,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import venueService from "../../services/venueService";
import analyticsService from "../../services/analyticsService";
import toast from "../../utils/toast";
import StatCard from "../../components/dashboard/StatCard";
import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import RevenueTrendChart from "../../components/dashboard/RevenueTrendChart";
import Header from "../../components/Header";
import FullScreenLoader from "../../components/ui/FullScreenLoader";
import useCachedResource from "../../hooks/useCachedResource";
import { CACHE_TTL } from "../../services/queryCache";
import TabRefreshContext from "../../context/TabRefreshContext";
import useNotificationBell from "../../hooks/useNotificationBell";
import SwipeTabContext from "../../context/SwipeTabContext";

// === Filter value → API params (web parity: pass start_date/end_date directly)
const filterToParams = (filter) => {
  if (!filter || filter.preset === "all") return {};
  const params = {};
  if (filter.start_date) params.start_date = filter.start_date;
  if (filter.end_date) params.end_date = filter.end_date;
  return params;
};

const formatRevenue = (val) => {
  const n = Number(val) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

export default function DashboardScreen() {
  // Swipeable pager guard — render nothing when this file is mounted by the
  // Stack underneath SwipeableTabView (prevents double-mount + gesture eating).
  const { inPager } = useContext(SwipeTabContext);
  if (!inPager) return null;

  const { user } = useAuth();
  const { refreshSignals } = useContext(TabRefreshContext);
  const scrollRef = useRef(null);
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [dateFilter, setDateFilter] = useState({ preset: "all" });

  // Venues list — cached. First-paint shows cached venues instantly;
  // background revalidation runs silently. Pull-to-refresh / same-tab tap
  // both call refresh() which bypasses isFresh.
  const {
    data: venues = [],
    loading,
    refreshing,
    refresh: refreshVenues,
  } = useCachedResource(
    "venue:owner-venues",
    async () => {
      const list = await venueService.getOwnerVenues();
      return Array.isArray(list) ? list : [];
    },
    { ttl: CACHE_TTL.venues, revalidateOnMount: false }
  );

  const { bellAction } = useNotificationBell();

  // Selected venue defaults to first venue once they load
  const selectedVenue = useMemo(() => {
    if (!Array.isArray(venues) || venues.length === 0) return null;
    if (selectedVenueId) {
      const match = venues.find((v) => v.id === selectedVenueId);
      if (match) return match;
    }
    return venues[0];
  }, [venues, selectedVenueId]);

  // Analytics fetch — cached by (venueId, date range). Hot keys are
  // (venue, all-time) and the user's most recent date range, both of which
  // stay in the cache, so returning to dashboard renders instantly.
  const analyticsKey = selectedVenue?.id
    ? `dashboard:analytics:${selectedVenue.id}:${dateFilter?.start_date || ""}:${dateFilter?.end_date || ""}`
    : null;
  const {
    data: analytics = null,
    loading: analyticsLoading,
    refresh: refreshAnalytics,
  } = useCachedResource(
    analyticsKey || "dashboard:analytics:noop",
    async () => {
      const venueId = selectedVenue?.id;
      if (!venueId) return null;
      try {
        return await analyticsService.getVenueAnalytics(venueId, filterToParams(dateFilter));
      } catch {
        return null;
      }
    },
    { ttl: CACHE_TTL.dashboard, enabled: !!analyticsKey, revalidateOnMount: false }
  );

  const onRefresh = useCallback(() => {
    Promise.all([
      refreshVenues().catch(() => {}),
      refreshAnalytics().catch(() => {}),
    ]).catch(() => {
      toast.error("Failed to load dashboard");
    });
  }, [refreshVenues, refreshAnalytics]);

  // Same-tab tap → scroll top + refresh
  useEffect(() => {
    if (!refreshSignals.dashboard) return;
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    onRefresh();
  }, [refreshSignals.dashboard]);

  const handleDateChange = (filter) => setDateFilter(filter);
  const handleSelectVenue = (v) => setSelectedVenueId(v?.id || null);

  const stats = useMemo(() => {
    const totalVenues = venues.length;
    const totalBookings = analytics?.total_bookings || 0;
    const totalRevenue = analytics?.total_revenue || 0;
    const avgBooking = analytics?.avg_booking_value || 0;
    const confirmedBookings = analytics?.confirmed_bookings || 0;
    const cancelledBookings = analytics?.cancelled_bookings || 0;
    const dailyRevenue = Array.isArray(analytics?.daily_revenue)
      ? analytics.daily_revenue
      : [];
    return {
      totalVenues,
      totalBookings,
      totalRevenue,
      avgBooking,
      confirmedBookings,
      cancelledBookings,
      dailyRevenue,
    };
  }, [venues, analytics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Header
          logo
          showLocation
          actions={[bellAction]}
        />
        <FullScreenLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header
        logo
        showLocation
        actions={[bellAction]}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* === Hero Banner — matches frontend welcome card (mobile width).
            Frontend hides its Unsplash image on narrow widths and shows ONLY
            the text block. Mobile previously had a Building2 icon inside a
            tinted square — that was an extra (frontend doesn't render any
            icon here). Removed for parity. */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Venue Owner</Text>
          <Text style={styles.heroTitle}>
            Welcome,{" "}
            <Text style={styles.heroName}>
              {user?.business_name || user?.name || "Owner"}
            </Text>
          </Text>
          <Text style={styles.heroSub}>
            Manage your venues, track revenue, and grow your sports business.
          </Text>
        </View>

        {/* === Venue selector (only when multiple) === */}
        {venues.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venueChips}
            style={{ marginBottom: 14 }}
          >
            {venues.map((v) => {
              const active = v.id === selectedVenue?.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => handleSelectVenue(v)}
                  style={[styles.vChip, active ? styles.vChipActive : styles.vChipInactive]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.vChipText,
                      active ? styles.vChipTextActive : styles.vChipTextInactive,
                    ]}
                    numberOfLines={1}
                  >
                    {v.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* === Date Range Filter === */}
        <DateRangeFilter value={dateFilter} onChange={handleDateChange} />

        {/* === 4 Stat Cards (2x2) === */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon={<Building2 size={18} color={PRIMARY_COLOR} strokeWidth={2.3} />}
              label="Total Venues"
              value={String(stats.totalVenues)}
              bgColor={`${PRIMARY_COLOR}1A`}
            />
            <View style={{ width: 12 }} />
            <StatCard
              icon={<Calendar size={18} color="#8B5CF6" strokeWidth={2.3} />}
              label="Total Bookings"
              value={analyticsLoading ? "…" : String(stats.totalBookings)}
              bgColor="rgba(139,92,246,0.1)"
            />
          </View>
          <View style={[styles.statsRow, { marginTop: 12 }]}>
            <StatCard
              icon={<IndianRupee size={18} color="#F59E0B" strokeWidth={2.3} />}
              label="Total Revenue"
              value={analyticsLoading ? "…" : formatRevenue(stats.totalRevenue)}
              bgColor="rgba(245,158,11,0.1)"
            />
            <View style={{ width: 12 }} />
            <StatCard
              icon={<TrendingUp size={18} color="#0EA5E9" strokeWidth={2.3} />}
              label="Avg Booking"
              value={analyticsLoading ? "…" : `₹${Math.round(stats.avgBooking)}`}
              bgColor="rgba(14,165,233,0.1)"
            />
          </View>
        </View>

        {/* === 3 sub-cards row: Total Revenue / Confirmed / Cancelled ===
            Frontend renders plain text labels without inline icons
            (VenueOwnerDashboard.js:1187-1213). The CheckCircle and XCircle
            icons mobile previously rendered next to the labels were extras
            and have been removed for parity. */}
        <View style={styles.subStatsRow}>
          <View style={styles.subStat}>
            <Text style={styles.subStatLabel}>Total Revenue</Text>
            <Text style={[styles.subStatValue, { color: PRIMARY_COLOR }]}>
              {fmtInr(stats.totalRevenue)}
            </Text>
          </View>
          <View style={styles.subStat}>
            <Text style={styles.subStatLabel}>Confirmed</Text>
            <Text style={[styles.subStatValue, { color: PRIMARY_COLOR }]}>
              {stats.confirmedBookings}
            </Text>
          </View>
          <View style={styles.subStat}>
            <Text style={styles.subStatLabel}>Cancelled</Text>
            <Text style={[styles.subStatValue, { color: "#EF4444" }]}>
              {stats.cancelledBookings}
            </Text>
          </View>
        </View>

        {/* === Revenue Trend Chart === */}
        <RevenueTrendChart dailyRevenue={stats.dailyRevenue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 40 },

  // Hero — single column text block (matches frontend mobile-width layout)
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  heroEyebrow: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 22,
  },
  heroName: { color: PRIMARY_COLOR },
  heroSub: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#6B7280",
    lineHeight: 15,
  },
  // Venue selector
  venueChips: { gap: 8, paddingVertical: 4 },
  vChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    maxWidth: 200,
  },
  vChipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  vChipInactive: { backgroundColor: "#FFFFFF", borderColor: "rgba(229, 231, 235, 0.7)" },
  vChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  vChipTextActive: { color: "#FFFFFF" },
  vChipTextInactive: { color: "#374151" },

  // Stats grid
  statsGrid: { marginTop: 16, marginBottom: 16 },
  statsRow: { flexDirection: "row" },

  // 3 sub-cards row
  subStatsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    gap: 8,
  },
  subStat: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  subStatLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  subStatValue: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
  },
});
