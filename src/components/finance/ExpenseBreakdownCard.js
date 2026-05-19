import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

// Web-parity to VenueFinancePage's Expense Breakdown card.
// data: object map { category_key: amount } e.g. { maintenance: 1200, electricity: 800 }
// totalOverride: optional total (uses summary.total_expenses when given so it matches header card)
export default function ExpenseBreakdownCard({ data, totalOverride }) {
  const rows = Object.entries(data || {});
  const sumRows = rows.reduce((a, [, v]) => a + (Number(v) || 0), 0);
  const total = totalOverride != null ? totalOverride : sumRows;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Expense Breakdown</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>No expenses recorded</Text>
      ) : (
        <>
          {rows.map(([cat, amt]) => (
            <View key={cat} style={styles.row}>
              <Text style={styles.cat} numberOfLines={1}>
                {String(cat).replace(/_/g, " ")}
              </Text>
              <Text style={styles.amount}>{fmt(amt)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(total)}</Text>
          </View>
        </>
      )}
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
  cat: {
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
    color: "#F59E0B", // amber-500 — matches web text-amber-400
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#EF4444", // destructive — matches web text-destructive
  },
});
