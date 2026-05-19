import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Receipt, ArrowDownRight } from "lucide-react-native";
import SettlementStatusBadge from "./SettlementStatusBadge";

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export default function TransactionRow({ txn, onPress }) {
  const isRefund = !!txn?.refund_amount || txn?.type === "refund";
  const gross = txn?.gross || txn?.total_amount || 0;
  const venueNet = txn?.venue_net_share ?? txn?.net_amount ?? 0;
  const status = txn?.settlement_status || "pending_settlement";

  return (
    <TouchableOpacity onPress={() => onPress?.(txn)} style={styles.row} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        {isRefund ? (
          <ArrowDownRight size={18} color="#EF4444" />
        ) : (
          <Receipt size={18} color="#059669" />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {txn?.venue_name || "Venue"} {txn?.sport ? `· ${txn.sport}` : ""}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDate(txn?.date || txn?.created_at)}
          {txn?.start_time ? ` · ${txn.start_time}` : ""}
          {txn?.utr ? ` · UTR ${txn.utr}` : ""}
        </Text>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, isRefund && styles.amountRefund]}>
          {isRefund ? `-${fmt(txn?.refund_amount || gross)}` : fmt(venueNet)}
        </Text>
        <SettlementStatusBadge status={status} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  body: { flex: 1, marginRight: 10 },
  title: { fontSize: 13, fontWeight: "900", color: "#111827", marginBottom: 3 },
  meta: { fontSize: 10, color: "#9CA3AF" },
  amountWrap: { alignItems: "flex-end", gap: 4 },
  amount: { fontSize: 13, fontWeight: "900", color: "#059669" },
  amountRefund: { color: "#EF4444" },
});
