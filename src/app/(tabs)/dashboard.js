import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Building2,
  Calendar,
  IndianRupee,
  TrendingUp,
  Bell,
  CheckCircle,
  XCircle,
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
  const router = useRouter();
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [dateFilter, setDateFilter] = useState({ preset: "all" });
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadVenues = useCallback(async () => {
    const list = await venueService.getOwnerVenues();
    setVenues(Array.isArray(list) ? list : []);
    return list;
  }, []);

  const loadAnalytics = useCallback(async (venueId, filter) => {
    if (!venueId) {
      setAnalytics(null);
      return;
    }
    setAnalyticsLoading(true);
    try {
      const data = await analyticsService.getVenueAnalytics(
        venueId,
        filterToParams(filter)
      );
      setAnalytics(data || null);
    } catch (err) {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadVenues();
      const first = Array.isArray(list) && list.length ? list[0] : null;
      setSelectedVenue(first);
      if (first?.id) {
        await loadAnalytics(first.id, dateFilter);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      toast.error("Failed to Load", err?.response?.data?.detail || "Could not load venues.");
    } finally {
      setLoading(false);
    }
  }, [loadVenues, loadAnalytics, dateFilter]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const list = await loadVenues();
      const current = selectedVenue?.id
        ? list.find((v) => v.id === selectedVenue.id) || list[0]
        : list[0];
      setSelectedVenue(current || null);
      if (current?.id) await loadAnalytics(current.id, dateFilter);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDateChange = async (filter) => {
    setDateFilter(filter);
    if (selectedVenue?.id) await loadAnalytics(selectedVenue.id, filter);
  };

  const handleSelectVenue = async (v) => {
    setSelectedVenue(v);
    if (v?.id) await loadAnalytics(v.id, dateFilter);
  };

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
        <Header logo />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header
        logo
        actions={[
          {
            key: "notif",
            icon: <Bell size={16} color="#374151" strokeWidth={2.3} />,
            onPress: () =>
              toast.info("Coming soon", "Notifications in a later update."),
          },
        ]}
      />

      <ScrollView
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
        {/* === Hero Banner — matches web's welcome card === */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroEyebrow}>Venue Owner</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              Welcome,{" "}
              <Text style={styles.heroName}>
                {user?.business_name || user?.name || "Owner"}
              </Text>
            </Text>
            <Text style={styles.heroSub} numberOfLines={2}>
              Manage your venues, track revenue, and grow your sports business.
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Building2 size={36} color={PRIMARY_COLOR} strokeWidth={1.8} />
          </View>
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

        {/* === 3 sub-cards row: Total Revenue / Confirmed / Cancelled === */}
        <View style={styles.subStatsRow}>
          <View style={styles.subStat}>
            <Text style={styles.subStatLabel}>Total Revenue</Text>
            <Text style={[styles.subStatValue, { color: PRIMARY_COLOR }]}>
              {fmtInr(stats.totalRevenue)}
            </Text>
          </View>
          <View style={styles.subStat}>
            <View style={styles.subStatLabelRow}>
              <CheckCircle size={12} color={PRIMARY_COLOR} />
              <Text style={styles.subStatLabel}>Confirmed</Text>
            </View>
            <Text style={[styles.subStatValue, { color: PRIMARY_COLOR }]}>
              {stats.confirmedBookings}
            </Text>
          </View>
          <View style={styles.subStat}>
            <View style={styles.subStatLabelRow}>
              <XCircle size={12} color="#EF4444" />
              <Text style={styles.subStatLabel}>Cancelled</Text>
            </View>
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

  // Hero
  hero: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    alignItems: "center",
  },
  heroLeft: { flex: 1, paddingRight: 12 },
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
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
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
  },
  subStatLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
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
