import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import {
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

// Cashfree vendor states — match frontend status badge in VenueFinancePage
const STATUS_MAP = {
  ACTIVE: { label: "Active", color: "#10B981", icon: CheckCircle2 },
  active: { label: "Active", color: "#10B981", icon: CheckCircle2 },
  IN_BENE_CREATION: { label: "Pending", color: "#F59E0B", icon: Clock },
  pending_verification: { label: "Pending", color: "#F59E0B", icon: Clock },
  under_review: { label: "Under Review", color: "#F59E0B", icon: Clock },
  BLOCKED: { label: "Blocked", color: "#EF4444", icon: AlertTriangle },
  REJECTED: { label: "Rejected", color: "#EF4444", icon: AlertTriangle },
  rejected: { label: "Rejected", color: "#EF4444", icon: AlertTriangle },
};

export default function LinkedAccountCard({ account, onLink, onSync, onDelete, syncing }) {
  if (!account) {
    return (
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Banknote size={26} color={PRIMARY_COLOR} />
        </View>
        <Text style={styles.title}>No bank account linked</Text>
        <Text style={styles.description}>
          Link your bank account to receive settlements automatically.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={onLink} activeOpacity={0.85}>
          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.linkBtnText}>Link Bank Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = account?.cashfree_vendor_status || "IN_BENE_CREATION";
  const cfg = STATUS_MAP[status] || STATUS_MAP.IN_BENE_CREATION;
  const StatusIcon = cfg.icon;
  const bank = account?.bank_account || {};
  // Backend masks account_number to ****XXXX server-side; take last 4 chars
  const acctStr = String(bank.account_number || "");
  const last4 = acctStr.replace(/\*/g, "").slice(-4);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Banknote size={22} color={PRIMARY_COLOR} />
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${cfg.color}1A`, borderColor: `${cfg.color}66` },
          ]}
        >
          <StatusIcon size={11} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={styles.bankName}>{bank.bank_name || "Bank account"}</Text>
      <Text style={styles.account}>•••• •••• {last4 || "0000"}</Text>
      {bank.ifsc_code ? <Text style={styles.ifsc}>IFSC: {bank.ifsc_code}</Text> : null}
      {bank.beneficiary_name ? (
        <Text style={styles.beneficiary}>{bank.beneficiary_name}</Text>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          <RefreshCw size={13} color="#374151" />
          <Text style={styles.actionText}>{syncing ? "Syncing..." : "Sync Status"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDanger]}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Trash2 size={13} color="#EF4444" />
          <Text style={[styles.actionText, { color: "#EF4444" }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 5,
  },
  statusText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Empty state
  title: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#111827",
    marginTop: 12,
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 16,
  },

  // Linked state
  bankName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  account: {
    fontSize: 14,
    color: "#374151",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ifsc: { fontSize: 11, fontFamily: FONTS.bodyBold, color: "#6B7280", fontWeight: "700" },
  beneficiary: { fontSize: 11, fontFamily: FONTS.body, color: "#6B7280", marginTop: 4 },

  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  linkBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 12,
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    gap: 5,
  },
  actionDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  actionText: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
