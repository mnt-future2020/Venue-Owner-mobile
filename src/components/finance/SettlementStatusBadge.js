import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";

// Mirrors frontend settlement-row badges (VenueFinancePage line ~1373)
const STATUS_MAP = {
  pending_settlement: { label: "Pending", bg: "rgba(245,158,11,0.12)", color: "#D97706", border: "rgba(245,158,11,0.4)" },
  pending: { label: "Pending", bg: "rgba(245,158,11,0.12)", color: "#D97706", border: "rgba(245,158,11,0.4)" },
  on_hold: { label: "On Hold", bg: "rgba(245,158,11,0.12)", color: "#D97706", border: "rgba(245,158,11,0.4)" },
  released: { label: "Released", bg: "rgba(14,165,233,0.12)", color: "#0284C7", border: "rgba(14,165,233,0.4)" },
  processing: { label: "Processing", bg: "rgba(59,130,246,0.12)", color: "#2563EB", border: "rgba(59,130,246,0.4)" },
  completed: { label: "Settled", bg: "rgba(16,185,129,0.12)", color: "#059669", border: "rgba(16,185,129,0.4)" },
  settled: { label: "Settled", bg: "rgba(16,185,129,0.12)", color: "#059669", border: "rgba(16,185,129,0.4)" },
  failed: { label: "Failed", bg: "rgba(239,68,68,0.12)", color: "#DC2626", border: "rgba(239,68,68,0.4)" },
  cancelled: { label: "Cancelled", bg: "rgba(107,114,128,0.12)", color: "#6B7280", border: "rgba(107,114,128,0.4)" },
};

export default function SettlementStatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pending_settlement;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  text: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
