import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";

// Frontend parity card — mirrors VenueFinancePage.js:1346-1384 transactions row.
// Layout:
//   ┌──────────────────────────────────────────────────────┐
//   │ {date} | {sport}                       [STATUS PILL] │
//   │ {venue_name} | {start}-{end} | Booked by {host}      │
//   │ Total ₹X   Commission -₹Y   Your Share ₹Z   [Refund] │
//   └──────────────────────────────────────────────────────┘
//
// Consumes the response of `GET /payouts/my-transactions` (venue_owner only,
// added on develop 2026-05-26).

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso) => {
  if (!iso) return "—";
  // Backend stores date as ISO `YYYY-MM-DD` for booking date.
  const parts = String(iso).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
};
const titleSport = (s) =>
  (s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_CFG = {
  cancelled: {
    label: "Cancelled",
    bg: "rgba(239, 68, 68, 0.10)",
    text: "#DC2626",
    border: "rgba(239, 68, 68, 0.20)",
  },
  settled: {
    label: "Settled",
    bg: "rgba(16, 185, 129, 0.10)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.20)",
  },
  released: {
    label: "Released",
    bg: "rgba(59, 130, 246, 0.10)",
    text: "#2563EB",
    border: "rgba(59, 130, 246, 0.20)",
  },
  on_hold: {
    label: "On Hold",
    bg: "rgba(245, 158, 11, 0.10)",
    text: "#D97706",
    border: "rgba(245, 158, 11, 0.20)",
  },
};

export default function TransactionRow({ txn }) {
  const status = txn?.settlement_status;
  const cfg = STATUS_CFG[status] || {
    label: txn?.booking_status || "—",
    bg: "rgba(107, 114, 128, 0.10)",
    text: "#6B7280",
    border: "rgba(107, 114, 128, 0.20)",
  };
  const total = Number(txn?.total_amount) || 0;
  const commission = Number(txn?.commission ?? txn?.commission_amount) || 0;
  const yourShare = Number(txn?.venue_share) || 0;
  const refund = Number(txn?.refund_amount) || 0;

  return (
    <View style={styles.card}>
      {/* Header row: date + sport on the left, status pill on the right */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {fmtDate(txn?.date)} | {titleSport(txn?.sport)}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {[
              txn?.venue_name,
              txn?.start_time && txn?.end_time
                ? `${txn.start_time} - ${txn.end_time}`
                : null,
              txn?.host_name ? `Booked by ${txn.host_name}` : null,
            ]
              .filter(Boolean)
              .join(" | ")}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <Text style={[styles.pillText, { color: cfg.text }]}>
            {cfg.label}
          </Text>
        </View>
      </View>

      {/* Money grid — fixed 4 columns always (Total / Commission / Your Share /
          Refund) so every card has identical height. Refund cell shows "—"
          when refund_amount is 0/missing instead of being conditionally
          rendered (which previously made some cards taller than others). */}
      <View style={styles.grid}>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Total</Text>
          <Text style={styles.gridValue}>{fmt(total)}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Commission</Text>
          <Text style={[styles.gridValue, styles.commission]}>
            -{fmt(commission)}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Your Share</Text>
          <Text style={[styles.gridValue, styles.yourShare]}>
            {fmt(yourShare)}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={styles.gridLabel}>Refund</Text>
          <Text
            style={[
              styles.gridValue,
              refund > 0 ? styles.commission : styles.gridValueMuted,
            ]}
          >
            {refund > 0 ? `-${fmt(refund)}` : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerLeft: { flex: 1, gap: 2 },
  title: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#6B7280",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    // No flexWrap — fixed single row keeps all cards the same height.
    gap: 8,
  },
  gridCell: { flex: 1, minWidth: 0 },
  gridLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#111827",
  },
  gridValueMuted: { color: "#9CA3AF" },
  commission: { color: "#DC2626" },
  yourShare: { color: "#059669" },
});
