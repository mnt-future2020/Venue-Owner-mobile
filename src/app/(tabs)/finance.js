import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
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
  ArrowUpRight,
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
import TransactionRow from "../../components/finance/TransactionRow";
import PayoutCard from "../../components/payout/PayoutCard";
import Header from "../../components/Header";
import FullScreenLoader from "../../components/ui/FullScreenLoader";
import DashboardSkeleton from "../../components/skeletons/DashboardSkeleton";
import useCachedResource from "../../hooks/useCachedResource";
import { CACHE_TTL } from "../../services/queryCache";
import TabRefreshContext from "../../context/TabRefreshContext";
import useNotificationBell from "../../hooks/useNotificationBell";
import useSearchAction from "../../hooks/useSearchAction";
import SwipeTabContext from "../../context/SwipeTabContext";

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
  const { inPager } = useContext(SwipeTabContext);
  if (!inPager) return null;

  const router = useRouter();
  const { refreshSignals } = useContext(TabRefreshContext);
  const { bellAction } = useNotificationBell();
  const searchAction = useSearchAction();
  const scrollRef = useRef(null);

  // --- Overview state
  const [dateFilter, setDateFilter] = useState({ preset: "all" });
  const [selectedVenueId, setSelectedVenueId] = useState("all"); // "all" or venue id
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "payouts"
  // Total Bookings card → Monthly Bookings modal (frontend parity:
  // VenueFinancePage.js:457 + dialog at :464-489).
  const [showMonthlyBookings, setShowMonthlyBookings] = useState(false);

  // ── Cached venues (shared with dashboard/venues screens) ────────────────
  const { data: venues = [] } = useCachedResource(
    "venue:owner-venues",
    async () => {
      const list = await venueService.getOwnerVenues();
      return Array.isArray(list) ? list : [];
    },
    { ttl: CACHE_TTL.venues, revalidateOnMount: false }
  );

  // ── Cached finance summary (keyed by venue + date range) ────────────────
  const summaryKey = `finance:summary:${selectedVenueId || "all"}:${dateFilter?.start_date || ""}:${dateFilter?.end_date || ""}`;
  const {
    data: summary,
    loading: summaryLoading,
    refresh: refreshSummary,
  } = useCachedResource(
    summaryKey,
    async () => {
      const params = {};
      if (dateFilter?.start_date) params.start_date = dateFilter.start_date;
      if (dateFilter?.end_date) params.end_date = dateFilter.end_date;
      if (selectedVenueId && selectedVenueId !== "all") params.venue_id = selectedVenueId;
      try {
        return await analyticsService.getFinanceSummary(params);
      } catch (err) {
        toast.error("Failed", err?.response?.data?.detail || "Could not load finance summary.");
        return null;
      }
    },
    { ttl: CACHE_TTL.dashboard, revalidateOnMount: false }
  );

  // ── Cached payouts bundle ───────────────────────────────────────────────
  const {
    data: payoutsBundle,
    loading: payoutsLoading,
    refresh: refreshPayouts,
  } = useCachedResource(
    "finance:payouts",
    async () => {
      const [psum, linked, txns] = await Promise.all([
        payoutService.getMySummary().catch(() => null),
        payoutService.getLinkedAccount().catch(() => null),
        // Develop 2026-05-26 (commit afe041e): per-booking transaction
        // history with settlement_status. Replaces the old paginated
        // /my-payouts settlement list as the Payouts tab data source —
        // frontend now reads the same endpoint via payoutAPI.myTransactions.
        payoutService.getMyTransactions().catch(() => null),
      ]);
      const transactions = Array.isArray(txns?.transactions)
        ? txns.transactions
        : [];
      return {
        payoutSummary: psum || null,
        linkedAccount: linked && linked.linked === false ? null : linked || null,
        myPayouts: transactions,
      };
    },
    { ttl: CACHE_TTL.dashboard, revalidateOnMount: false }
  );

  const payoutSummary = payoutsBundle?.payoutSummary || null;
  const linkedAccount = payoutsBundle?.linkedAccount || null;
  const myPayouts = payoutsBundle?.myPayouts || [];

  // Initial paint requires either cached data or a finished first fetch
  const loading = summaryLoading && summary === undefined;
  const refreshing = (summaryLoading && summary !== undefined) || (payoutsLoading && payoutsBundle !== undefined);

  // ── Refresh ──────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    if (activeTab === "overview") {
      refreshSummary().catch(() => {});
    } else {
      refreshPayouts().catch(() => {});
    }
  }, [activeTab, refreshSummary, refreshPayouts]);

  // Same-tab tap → scroll top + refresh
  useEffect(() => {
    if (!refreshSignals.finance) return;
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    onRefresh();
  }, [refreshSignals.finance]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDateChange = (filter) => setDateFilter(filter || { preset: "all" });
  const handleVenueChange = (vid) => setSelectedVenueId(vid);
  const handleTabChange = (tab) => setActiveTab(tab);

  const handleLinkBank = () => router.push("/(stack)/finance/link-bank");

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <DashboardSkeleton />
      </View>
    );
  }

  // ── Derived (web parity field names from finance_summary) ────────────────
  const totalBookings = summary?.total_bookings || 0;
  const netProfit = Number(summary?.net_profit || 0);
  const totalExpenses = Number(summary?.total_expenses || 0);
  const thisMonthNet = Number(summary?.current_month?.net || 0);
  const commissionPct = Number(summary?.commission_pct || 0);
  const monthlyTrend = Array.isArray(summary?.monthly_trend) ? summary.monthly_trend : [];

  // Header rendered once by SwipeableTabView above the pager.
  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
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
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={0.85}
              onPress={() => setShowMonthlyBookings(true)}
            >
              <StatCard
                icon={<CheckCircle size={18} color={PRIMARY_COLOR} strokeWidth={2.3} />}
                label="Total Bookings"
                value={String(totalBookings)}
                bgColor={`${PRIMARY_COLOR}1A`}
              />
            </TouchableOpacity>
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

      {/* Monthly Bookings modal — frontend parity
          (VenueFinancePage.js:464-489). Shown when user taps the Total
          Bookings stat card on the Overview tab. */}
      <Modal
        visible={showMonthlyBookings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthlyBookings(false)}
      >
        <Pressable
          style={styles.breakdownBackdrop}
          onPress={() => setShowMonthlyBookings(false)}
        >
          <Pressable style={styles.breakdownCard} onPress={() => {}}>
            <View style={styles.breakdownHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownTitle}>Monthly Bookings</Text>
                <Text style={styles.breakdownSubtitle}>
                  Booking count per month (last 6 months)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMonthlyBookings(false)}
                style={styles.breakdownCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.breakdownCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.breakdownBody}>
              {monthlyTrend.length > 0 ? (
                [...monthlyTrend].reverse().map((m) => (
                  <View
                    key={m.month}
                    style={[
                      styles.breakdownRow,
                      { backgroundColor: "rgba(15, 23, 42, 0.04)" },
                    ]}
                  >
                    <Text style={styles.breakdownRowLabel}>{m.month}</Text>
                    <Text
                      style={[
                        styles.breakdownRowValue,
                        { color: PRIMARY_COLOR },
                      ]}
                    >
                      {m.bookings || 0} bookings
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.breakdownEmpty}>No data available</Text>
              )}
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.breakdownTotalValue}>
                  {totalBookings} bookings
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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

// 3 payout stat cards in a 2-column grid — frontend parity for content
// (VenueFinancePage.js:1307-1309 removes Last Payout) but we keep the
// existing 2-column visual rhythm. Row 1: Total Earned + Total Settled.
// Row 2: Pending in the left half, right half stays empty.
function PayoutSummaryGrid({ summary }) {
  const totalEarned = summary?.total_earned || 0;
  const totalSettled = summary?.total_settled || summary?.settled_total || 0;
  const pending = summary?.pending_settlement || summary?.floating_balance || 0;
  const pendingNet =
    summary?.pending_settlement_before_deductions || 0;
  const deductions = summary?.total_deductions || 0;
  // Three-bucket row — only render when at least one bucket has value
  // (frontend gate: VenueFinancePage.js:1296).
  const floating = summary?.floating_balance || 0;
  const releasedPending = summary?.released_pending || 0;
  const settledTotal = summary?.settled_total || 0;
  const showBuckets = floating > 0 || releasedPending > 0 || settledTotal > 0;
  const [showBreakdown, setShowBreakdown] = useState(false);
  return (
    <View style={styles.statsGrid}>
      {showBuckets ? (
        <View style={[styles.statsRow, { marginBottom: 12, gap: 8 }]}>
          <View style={{ flex: 1 }}>
            <PayoutCard
              icon={<Clock size={16} color="#0EA5E9" strokeWidth={2.3} />}
              label="On Hold (Floating)"
              value={floating}
              color="#0EA5E9"
              bgColor="rgba(14,165,233,0.10)"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PayoutCard
              icon={<ArrowUpRight size={16} color="#F59E0B" strokeWidth={2.3} />}
              label="Released (T+2)"
              value={releasedPending}
              color="#F59E0B"
              bgColor="rgba(245,158,11,0.10)"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PayoutCard
              icon={<CheckCircle size={16} color="#10B981" strokeWidth={2.3} />}
              label="Settled to Bank"
              value={settledTotal}
              color="#10B981"
              bgColor="rgba(16,185,129,0.10)"
            />
          </View>
        </View>
      ) : null}
      {/* Both rows use explicit 50% halves so the Pending card on row 2
          renders exactly the same width as the row 1 cards (an empty
          `flex: 1` placeholder didn't claim layout space reliably and
          made Pending look wider than its siblings). */}
      <View style={styles.statsRow}>
        <View style={styles.halfLeft}>
          {/* Frontend parity: tapping Total Earned opens a breakdown dialog
              (VenueFinancePage.js:1307 onClick={() => setShowEarningsBreakdown(true)}). */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowBreakdown(true)}
          >
            <PayoutCard
              icon={<IndianRupee size={18} color={PRIMARY_COLOR} strokeWidth={2.3} />}
              label="Total Earned"
              value={totalEarned}
              bgColor={`${PRIMARY_COLOR}1A`}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.halfRight}>
          <PayoutCard
            icon={<CheckCircle size={18} color="#10B981" strokeWidth={2.3} />}
            label="Total Settled"
            value={totalSettled}
            bgColor="rgba(16,185,129,0.1)"
          />
        </View>
      </View>
      <View style={[styles.statsRow, { marginTop: 12 }]}>
        <View style={styles.halfLeft}>
          <PayoutCard
            icon={<Clock size={18} color="#F59E0B" strokeWidth={2.3} />}
            label="Pending"
            value={pending}
            bgColor="rgba(245,158,11,0.1)"
          />
        </View>
        <View style={styles.halfRight} />
      </View>

      {/* Total Earned breakdown — mirrors frontend ResponsiveDialog
          (VenueFinancePage.js:1313-1343). */}
      <Modal
        visible={showBreakdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBreakdown(false)}
      >
        <Pressable
          style={styles.breakdownBackdrop}
          onPress={() => setShowBreakdown(false)}
        >
          <Pressable style={styles.breakdownCard} onPress={() => {}}>
            <View style={styles.breakdownHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownTitle}>Total Earned Breakdown</Text>
                <Text style={styles.breakdownSubtitle}>
                  How your total earnings are calculated
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBreakdown(false)}
                style={styles.breakdownCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.breakdownCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.breakdownBody}>
              <View
                style={[
                  styles.breakdownRow,
                  { backgroundColor: "rgba(16,185,129,0.06)" },
                ]}
              >
                <Text style={styles.breakdownRowLabel}>Settled Payouts</Text>
                <Text style={[styles.breakdownRowValue, { color: "#059669" }]}>
                  +{fmtINR(totalSettled)}
                </Text>
              </View>
              <View
                style={[
                  styles.breakdownRow,
                  { backgroundColor: "rgba(245,158,11,0.06)" },
                ]}
              >
                <Text style={styles.breakdownRowLabel}>Pending (net)</Text>
                <Text style={[styles.breakdownRowValue, { color: "#D97706" }]}>
                  +{fmtINR(pendingNet)}
                </Text>
              </View>
              <View
                style={[
                  styles.breakdownRow,
                  { backgroundColor: "rgba(239,68,68,0.06)" },
                ]}
              >
                <Text style={styles.breakdownRowLabel}>Deductions (all)</Text>
                <Text style={[styles.breakdownRowValue, { color: "#DC2626" }]}>
                  -{fmtINR(deductions)}
                </Text>
              </View>
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>Total Earned</Text>
                <Text style={styles.breakdownTotalValue}>
                  {fmtINR(totalEarned)}
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Renders per-booking transactions returned by payoutService.getMyTransactions
// (`/payouts/my-transactions`). Each row is a card matching the frontend
// VenueFinancePage transactions table — date+sport title, venue/time/host
// sub-row, status pill (4 states incl. cancelled), and money grid.
function PayoutHistorySection({ payouts }) {
  if (!payouts || payouts.length === 0) {
    return (
      <View style={{ marginTop: 8 }}>
        <Text style={styles.sectionLabel}>Transactions</Text>
        <View style={styles.emptyPayouts}>
          <Banknote size={40} color="#9CA3AF" strokeWidth={1.8} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyText}>No transactions yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.sectionLabel}>Transactions</Text>
      {payouts.map((t, i) => (
        <TransactionRow key={t.id || `txn-${i}`} txn={t} />
      ))}
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
  // Explicit 50% halves with internal gap padding — guarantees identical
  // widths for the payout summary cards in both rows.
  halfLeft: { width: "50%", paddingRight: 6 },
  halfRight: { width: "50%", paddingLeft: 6 },

  // Total Earned breakdown modal — frontend parity (VenueFinancePage.js:1313).
  breakdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#0F172A",
  },
  breakdownSubtitle: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#6B7280",
  },
  breakdownCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownCloseText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  breakdownBody: { gap: 10 },
  breakdownEmpty: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 14,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  breakdownRowLabel: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "#6B7280",
  },
  breakdownRowValue: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
  },
  breakdownTotalRow: {
    marginTop: 4,
    paddingTop: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#0F172A",
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },

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
