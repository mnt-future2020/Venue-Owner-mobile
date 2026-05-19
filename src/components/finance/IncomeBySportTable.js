import { View, Text, StyleSheet } from "react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

// Web-parity Income by Sport card from VenueFinancePage.
// Renders:
//   Cricket / Football / ... rows (income_by_sport)
//   Total Revenue
//   If commission_total > 0:
//     - Commission (X%)
//     - GST on Commission (Y%)
//     - Your Earnings (net_income)
//
// Props:
//   summary: full finance summary object (preferred)
//   data:    legacy fallback — pure income_by_sport object
export default function IncomeBySportTable({ summary, data }) {
  const sportData = summary?.income_by_sport || data || {};
  const rows = Object.entries(sportData);
  const totalRevenue = summary?.total_income ?? rows.reduce((a, [, v]) => a + (Number(v) || 0), 0);
  const commission = Number(summary?.commission_total || 0);
  const gst = Number(summary?.gst_on_commission_total || 0);
  const commissionPct = summary?.commission_pct || 10;
  const gstPct = summary?.gst_pct || 18;
  const netIncome =
    summary?.net_income ??
    Math.round((Number(totalRevenue) - commission - gst) * 100) / 100;
  const hasCommission = commission > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Income by Sport</Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>No bookings yet</Text>
      ) : (
        <>
          {rows.map(([sport, amt]) => (
            <View key={sport} style={styles.row}>
              <Text style={styles.sport} numberOfLines={1}>
                {String(sport)}
              </Text>
              <Text style={styles.amount}>{fmt(amt)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Revenue</Text>
            <Text style={styles.totalValue}>{fmt(totalRevenue)}</Text>
          </View>
        </>
      )}

      {hasCommission ? (
        <View style={styles.breakdown}>
          <View style={styles.brRow}>
            <Text style={styles.brLabel}>Commission ({commissionPct}%)</Text>
            <Text style={[styles.brAmount, styles.negative]}>
              -{fmt(commission)}
            </Text>
          </View>
          <View style={styles.brRow}>
            <Text style={styles.brLabel}>GST on Commission ({gstPct}%)</Text>
            <Text style={[styles.brAmount, styles.negative]}>
              -{fmt(gst)}
            </Text>
          </View>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsLabel}>Your Earnings</Text>
            <Text style={styles.earningsValue}>{fmt(netIncome)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  title: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  empty: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#9CA3AF",
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  sport: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  amount: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#0EA5E9", // sky-400 — matches web text-sky-400
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
  },
  totalValue: {
    fontSize: 14,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },

  // Commission breakdown sub-section
  breakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
  },
  brRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  brLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  brAmount: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
  negative: { color: "#EF4444" }, // red-400/red-500
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    marginTop: 4,
  },
  earningsLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#111827",
  },
  earningsValue: {
    fontSize: 14,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#10B981", // emerald-500
  },
});
