import { View, Text, StyleSheet } from "react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

// Backend (venue_finance.finance_summary) returns:
//   total_income, commission_total, gst_on_commission_total, cf_fees_total,
//   platform_gross, platform_net (LOBBI Net = commission + GST − CF fees).
// Your Net Share = total_income − commission − GST − CF fees (CF fee is owner-borne).
export default function CommissionBreakdown({ data }) {
  const total = data?.total_income || 0;
  const commission = data?.commission_total || 0;
  const gst = data?.gst_on_commission_total ?? data?.gst_on_commission ?? 0;
  const cfFees = data?.cf_fees_total ?? data?.cf_total_fees ?? 0;
  const venueNet =
    data?.venue_net_share ?? Math.round((total - commission - gst - cfFees) * 100) / 100;
  const lobbiNet =
    data?.platform_net ?? data?.lobbi_net ?? Math.round((commission + gst - cfFees) * 100) / 100;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Commission Breakdown</Text>
      <Row label="Total Revenue" value={fmt(total)} />
      <Row label="Commission (10%)" value={`-${fmt(commission)}`} negative />
      <Row label="GST on Commission (18%)" value={`-${fmt(gst)}`} negative />
      <Row label="Cashfree Fees" value={`-${fmt(cfFees)}`} negative />
      <View style={styles.divider} />
      <Row label="Your Net Share" value={fmt(venueNet)} bold color={PRIMARY_COLOR} />
      <Row label="LOBBI Platform Net" value={fmt(lobbiNet)} muted />
    </View>
  );
}

function Row({ label, value, negative, bold, color, muted }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, muted && styles.muted]}>{label}</Text>
      <Text
        style={[
          styles.value,
          negative && styles.negative,
          bold && styles.bold,
          color && { color },
          muted && styles.muted,
        ]}
      >
        {value}
      </Text>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: { fontSize: 13, fontFamily: FONTS.bodySemiBold, color: "#374151", fontWeight: "600" },
  value: { fontSize: 13, fontFamily: FONTS.bodyBold, color: "#111827", fontWeight: "700" },
  negative: { color: "#EF4444" },
  // Chivo Black for "Your Net Share" amount (display font, per design tokens)
  bold: { fontSize: 16, fontFamily: FONTS.displayBlack, fontWeight: "900" },
  muted: { color: "#9CA3AF", fontFamily: FONTS.bodySemiBold, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 },
});
