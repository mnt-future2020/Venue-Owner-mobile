import { StyleSheet, Text, View } from "react-native";
import { AlertCircle, Upload, XCircle } from "lucide-react-native";
import { FONTS } from "../../constants/theme";

// Mirrors frontend/src/components/profile/VerificationBanner.js — venue_owner branch.
// Shown only when role === "venue_owner" AND doc_verification_status !== "verified"
// AND account_status !== "active".
//
// Three states based on doc_verification_status:
//   - "rejected"        → red, XCircle, "Documents Rejected", rejectionReason
//   - "pending_review"  → amber, AlertCircle, "Documents Under Review", review message
//   - "not_uploaded"/?  → blue, Upload, "Upload Verification Documents", upload message
export default function VerificationBanner({ user }) {
  const role = user?.role;
  const docStatus = user?.doc_verification_status;
  const accountStatus = user?.account_status;
  const rejectionReason = user?.doc_rejection_reason;

  if (role !== "venue_owner") return null;
  if (docStatus === "verified") return null;
  if (accountStatus === "active") return null;

  let theme;
  let Icon;
  let title;
  let body;

  if (docStatus === "rejected") {
    theme = { bg1: "#DC2626", bg2: "#B91C1C" };
    Icon = XCircle;
    title = "Documents Rejected";
    body = rejectionReason || "Please re-upload corrected documents.";
  } else if (docStatus === "pending_review") {
    theme = { bg1: "#F59E0B", bg2: "#EA580C" };
    Icon = AlertCircle;
    title = "Documents Under Review";
    body = "Your documents are being reviewed by the admin. You will be notified once approved.";
  } else {
    // not_uploaded OR missing
    theme = { bg1: "#2563EB", bg2: "#0891B2" };
    Icon = Upload;
    title = "Upload Verification Documents";
    body = "Please upload your business documents to get your account verified.";
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.bg1, borderColor: theme.bg2 }]}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Icon size={22} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  body: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontFamily: FONTS.bodyMedium,
    fontWeight: "500",
    lineHeight: 18,
  },
});
