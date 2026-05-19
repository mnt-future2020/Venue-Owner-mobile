import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  TrendingUp,
  CheckCircle,
  IndianRupee,
  Calendar,
  Wallet,
  AlertCircle,
  Banknote,
  Clock,
  Plus,
} from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import analyticsService from "../../services/analyticsService";
import payoutService from "../../services/payoutService";
import venueService from "../../services/venueService";
import toast from "../../utils/toast";
import StatCard from "../../components/dashboard/StatCard";
import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import DropdownSelect from "../../components/ui/DropdownSelect";
import IncomeBySportTable from "../../components/finance/IncomeBySportTable";
import ExpenseBreakdownCard from "../../components/finance/ExpenseBreakdownCard";
import MonthlyTrendChart from "../../components/finance/MonthlyTrendChart";
import SettlementStatusBadge from "../../components/finance/SettlementStatusBadge";
import PayoutCard from "../../components/payout/PayoutCard";
import Header from "../../components/Header";

const fmtINR = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

// Date label for payout history rows (period_start → period_end)
const fmtPeriod = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
};

// Mask account number to last 4 chars (web parity — backend masks server-side)
const maskAcct = (str) => {
  const s = String(str || "");
  if (!s) return "****";
  const clean = s.replace(/\*/g, "");
  const last4 = clean.slice(-4);
  return last4 ? `•••• •••• ${last4}` : s;
};

export default function FinanceScreen() {
  const router = useRouter();

  // --- Overview state
  const [summary, setSummary] = useState(null);
  const [dateFilter, setDateFilter] = useState({ preset: "all" });
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState("all"); // "all" or venue id

  // --- Payouts state
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [myPayouts, setMyPayouts] = useState([]);
  const [payoutsLoaded, setPayoutsLoaded] = useState(false);

  // --- UI state
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "payouts"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async (filter, venueId) => {
    const params = {};
    if (filter?.start_date) params.start_date = filter.start_date;
    if (filter?.end_date) params.end_date = filter.end_date;
    if (venueId && venueId !== "all") params.venue_id = venueId;
    try {
      const data = await analyticsService.getFinanceSummary(params);
      setSummary(data);
    } catch (err) {
      toast.error("Failed", err?.response?.data?.detail || "Could not load finance summary.");
    }
  }, []);

  const loadVenues = useCallback(async () => {
    try {
      const list = await venueService.getOwnerVenues();
      setVenues(Array.isArray(list) ? list : []);
    } catch {
      setVenues([]);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    try {
      const [psum, linked, list] = await Promise.all([
        payoutService.getMySummary().catch(() => null),
        payoutService.getLinkedAccount().catch(() => null),
        payoutService.getMyPayouts({ page: 1, limit: 20 }).catch(() => null),
      ]);
      setPayoutSummary(psum || null);
      setLinkedAccount(linked && linked.linked === false ? null : linked || null);
      const payouts = Array.isArray(list)
        ? list
        : Array.isArray(list?.settlements)
        ? list.settlements
        : Array.isArray(list?.payouts)
        ? list.payouts
        : [];
      setMyPayouts(payouts);
      setPayoutsLoaded(true);
    } catch (err) {
      toast.error("Failed", err?.response?.data?.detail || "Could not load payouts.");
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadVenues(), loadSummary({ preset: "all" }, "all"), loadPayouts()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh ──────────────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "overview") {
      await loadSummary(dateFilter, selectedVenueId);
    } else {
      await loadPayouts();
    }
    setRefreshing(false);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDateChange = async (filter) => {
    setDateFilter(filter || { preset: "all" });
    await loadSummary(filter, selectedVenueId);
  };

  const handleVenueChange = async (vid) => {
    setSelectedVenueId(vid);
    await loadSummary(dateFilter, vid);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "payouts" && !payoutsLoaded) loadPayouts();
  };

  const handleLinkBank = () => router.push("/(stack)/finance/link-bank");

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Header title="Finance" subtitle="Revenue, expenses, invoices & payouts" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived (web parity field names from finance_summary) ────────────────
  const totalBookings = summary?.total_bookings || 0;
  const netProfit = Number(summary?.net_profit || 0);
  const totalExpenses = Number(summary?.total_expenses || 0);
  const thisMonthNet = Number(summary?.current_month?.net || 0);
  const commissionPct = Number(summary?.commission_pct || 0);
  const monthlyTrend = Array.isArray(summary?.monthly_trend) ? summary.monthly_trend : [];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header title="Finance" subtitle="Revenue, expenses, invoices & payouts" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY_COLOR} />
        }
      >
        {/* Venue selector — matches web: dropdown with check on active item */}
        {venues.length > 0 ? (
          <View style={styles.venueDropdownWrap}>
            <DropdownSelect
              value={selectedVenueId}
              onSelect={(key) => handleVenueChange(key)}
              options={[
                { key: "all", label: "All Venues" },
                ...venues.map((v) => ({ key: v.id, label: v.name })),
              ]}
              placeholder="All Venues"
            />
          </View>
        ) : null}

        {/* Date filter */}
        <DateRangeFilter value={dateFilter} onChange={handleDateChange} />

        {/* 4 stat cards (2x2) — web parity */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon={<CheckCircle size={18} color={PRIMARY_COLOR} strokeWidth={2.3} />}
              label="Total Bookings"
              value={String(totalBookings)}
              bgColor={`${PRIMARY_COLOR}1A`}
            />
            <View style={{ width: 12 }} />
            <StatCard
              icon={
                <TrendingUp
                  size={18}
                  color={netProfit >= 0 ? "#10B981" : "#EF4444"}
                  strokeWidth={2.3}
                />
              }
              label="Net Profit"
              value={fmtINR(netProfit)}
              color={netProfit >= 0 ? "#10B981" : "#EF4444"}
              bgColor={netProfit >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)"}
            />
          </View>
          <View style={[styles.statsRow, { marginTop: 12 }]}>
            <StatCard
              icon={<Wallet size={18} color="#F59E0B" strokeWidth={2.3} />}
              label="Expenses"
              value={fmtINR(totalExpenses)}
              color="#F59E0B"
              bgColor="rgba(245,158,11,0.1)"
            />
            <View style={{ width: 12 }} />
            <StatCard
              icon={<Calendar size={18} color="#0EA5E9" strokeWidth={2.3} />}
              label="This Month"
              value={fmtINR(thisMonthNet)}
              color="#0EA5E9"
              bgColor="rgba(14,165,233,0.1)"
            />
          </View>
        </View>

        {/* Commission banner — amber/30 border, web parity */}
        {commissionPct > 0 ? (
          <View style={styles.banner}>
            <AlertCircle size={14} color="#F59E0B" strokeWidth={2.3} />
            <Text style={styles.bannerText}>
              Platform commission:{" "}
              <Text style={styles.bannerBold}>{commissionPct}%</Text> +{" "}
              <Text style={styles.bannerBold}>18% GST</Text> on commission
            </Text>
          </View>
        ) : null}

        {/* Tab strip */}
        <View style={styles.tabStrip}>
          {[
            { id: "overview", label: "Overview" },
            { id: "payouts", label: "Payouts" },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleTabChange(t.id)}
                style={[styles.tabBtn, active ? styles.tabBtnActive : null]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* === Overview tab === */}
        {activeTab === "overview" ? (
          <View>
            <IncomeBySportTable summary={summary} />
            <ExpenseBreakdownCard
              data={summary?.expenses_by_category}
              totalOverride={totalExpenses}
            />
            <MonthlyTrendChart monthlyTrend={monthlyTrend} />
          </View>
        ) : null}

        {/* === Payouts tab === */}
        {activeTab === "payouts" ? (
          <View>
            <BankAccountCard linkedAccount={linkedAccount} onLink={handleLinkBank} />
            <PayoutSummaryGrid summary={payoutSummary} />
            <PayoutHistorySection payouts={myPayouts} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

// Inline Bank Account card — web parity VenueFinancePage Payouts tab.
function BankAccountCard({ linkedAccount, onLink }) {
  const hasAccount = !!linkedAccount;
  const verified = !!linkedAccount?.bank_account_verified;
  const vendorStatus = linkedAccount?.cashfree_vendor_status;
  const isRejected = vendorStatus === "rejected" || vendorStatus === "REJECTED";
  const badgeLabel = verified ? "Verified" : isRejected ? "Failed" : "Pending Verification";
  const badgeColor = verified ? PRIMARY_COLOR : isRejected ? "#EF4444" : "#F59E0B";

  return (
    <View style={styles.bankCard}>
      <View style={styles.bankHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bankTitle}>Bank Account</Text>
          <Text style={styles.bankSubtitle}>
            Link your bank account to receive venue payouts
          </Text>
        </View>
        {hasAccount ? (
          <View style={[styles.bankPill, { backgroundColor: badgeColor }]}>
            <Text style={styles.bankPillText}>{badgeLabel}</Text>
          </View>
        ) : null}
      </View>

      {hasAccount ? (
        <View style={styles.bankGrid}>
          <BankField label="Account" value={maskAcct(linkedAccount.bank_account?.account_number)} mono />
          <BankField label="IFSC" value={linkedAccount.bank_account?.ifsc_code || "—"} mono />
          <BankField label="Name" value={linkedAccount.bank_account?.beneficiary_name || "—"} />
          <BankField label="Bank" value={linkedAccount.bank_account?.bank_name || "—"} />
          <BankField label="PAN" value={linkedAccount.pan_masked || "—"} mono />
          <BankField label="Status" value={verified ? "Verified" : "Pending Verification"} />
        </View>
      ) : (
        <TouchableOpacity style={styles.linkBtn} onPress={onLink} activeOpacity={0.85}>
          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.linkBtnText}>Link Bank Account</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BankField({ label, value, mono }) {
  return (
    <View style={styles.bankFieldCell}>
      <Text style={styles.bankFieldLabel}>{label}</Text>
      <Text
        style={[
          styles.bankFieldValue,
          mono
            ? {
                fontFamily: Platform.select({
                  ios: "Menlo",
                  android: "monospace",
                  default: "monospace",
                }),
              }
            : null,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// 4 payout stat cards in 2x2 grid (web parity).
function PayoutSummaryGrid({ summary }) {
  const totalEarned = summary?.total_earned || 0;
  const totalSettled = summary?.total_settled || summary?.settled_total || 0;
  const pending = summary?.pending_settlement || summary?.floating_balance || 0;
  const lastAmount = summary?.last_payout_amount;
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statsRow}>
        <PayoutCard
          icon={<IndianRupee size={18} color={PRIMARY_COLOR} strokeWidth={2.3} />}
          label="Total Earned"
          value={totalEarned}
          bgColor={`${PRIMARY_COLOR}1A`}
        />
        <View style={{ width: 12 }} />
        <PayoutCard
          icon={<CheckCircle size={18} color="#10B981" strokeWidth={2.3} />}
          label="Total Settled"
          value={totalSettled}
          bgColor="rgba(16,185,129,0.1)"
        />
      </View>
      <View style={[styles.statsRow, { marginTop: 12 }]}>
        <PayoutCard
          icon={<Clock size={18} color="#F59E0B" strokeWidth={2.3} />}
          label="Pending"
          value={pending}
          bgColor="rgba(245,158,11,0.1)"
        />
        <View style={{ width: 12 }} />
        {/* Last payout — show ₹value or "—" when null */}
        <View style={styles.lastPayoutCard}>
          <View style={styles.lastPayoutIcon}>
            <Banknote size={18} color="#0EA5E9" strokeWidth={2.3} />
          </View>
          <Text style={styles.lastPayoutLabel}>Last Payout</Text>
          <Text style={styles.lastPayoutValue} numberOfLines={1} adjustsFontSizeToFit>
            {lastAmount != null && lastAmount !== 0 ? fmtINR(lastAmount) : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PayoutHistorySection({ payouts }) {
  if (!payouts || payouts.length === 0) {
    return (
      <View style={{ marginTop: 8 }}>
        <Text style={styles.sectionLabel}>Payout History</Text>
        <View style={styles.emptyPayouts}>
          <Banknote size={40} color="#9CA3AF" strokeWidth={1.8} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyText}>
            No payouts yet. Payouts are processed by the platform admin.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.sectionLabel}>Payout History</Text>
      <View style={styles.payoutListCard}>
        {payouts.map((p, i) => (
          <View
            key={p.id || i}
            style={[styles.payoutRow, i === payouts.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.payoutAmount}>{fmtINR(p.net_amount || 0)}</Text>
              <Text style={styles.payoutMeta} numberOfLines={1}>
                {fmtPeriod(p.period_start)} → {fmtPeriod(p.period_end)}
              </Text>
              {p.transfer_utr ? (
                <Text style={styles.payoutUtr} numberOfLines={1}>
                  UTR: {p.transfer_utr}
                </Text>
              ) : null}
            </View>
            <SettlementStatusBadge status={p.status || "pending"} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 40 },

  // Venue dropdown wrapper — used when multiple owner venues exist
  venueDropdownWrap: {
    marginBottom: 12,
  },

  // Stat cards grid (used for both header stats and payout summary 2x2)
  statsGrid: { marginTop: 12, marginBottom: 12 },
  statsRow: { flexDirection: "row" },

  // Commission banner — web parity: amber bg/border
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#92400E",
    fontWeight: "500",
  },
  bannerBold: {
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#92400E",
  },

  // Tabs strip
  tabStrip: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: PRIMARY_COLOR },
  tabText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  tabTextActive: { color: PRIMARY_COLOR },
  tabTextInactive: { color: "#9CA3AF" },

  // Bank account card
  bankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  bankHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  bankTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#111827",
  },
  bankSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#9CA3AF",
    marginTop: 2,
  },
  bankPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginLeft: 8,
  },
  bankPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bankFieldCell: {
    width: "50%",
    paddingVertical: 6,
    paddingRight: 8,
  },
  bankFieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  bankFieldValue: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    fontWeight: "600",
    color: "#111827",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 9999,
    gap: 6,
  },
  linkBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Last payout custom card (PayoutCard formats with ₹; need "—" fallback)
  lastPayoutCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    minHeight: 130,
  },
  lastPayoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(14,165,233,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  lastPayoutLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  lastPayoutValue: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#0EA5E9",
    letterSpacing: -0.3,
  },

  // Section label (web admin-section-label parity)
  sectionLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
    marginLeft: 4,
  },

  // Payout history list
  payoutListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  payoutAmount: {
    fontSize: 15,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  payoutMeta: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#9CA3AF",
  },
  payoutUtr: {
    fontSize: 10,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    color: "#6B7280",
    marginTop: 2,
  },
  emptyPayouts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
});
