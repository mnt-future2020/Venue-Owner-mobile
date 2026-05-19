import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Banknote, AlertCircle } from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../../constants/theme";
import AuthInput from "../../../components/auth/AuthInput";
import AuthButton from "../../../components/auth/AuthButton";
import payoutService from "../../../services/payoutService";
import toast from "../../../utils/toast";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const BUSINESS_TYPES = [
  "Gaming",
  "Retail",
  "Professional Services",
  "SaaS",
  "Other",
];

export default function LinkBankScreen() {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [pan, setPan] = useState("");
  const [bankName, setBankName] = useState("");
  const [businessType, setBusinessType] = useState("Gaming");
  const [loading, setLoading] = useState(false);

  const ifscErr = ifsc && !IFSC_RE.test(ifsc) ? "Invalid IFSC (e.g. HDFC0001234)" : "";
  const panErr = pan && !PAN_RE.test(pan) ? "Invalid PAN (e.g. ABCDE1234F)" : "";
  const accountErr = accountNumber && accountNumber.length < 6 ? "Account too short" : "";

  const canSubmit =
    accountNumber && IFSC_RE.test(ifsc) && beneficiary && PAN_RE.test(pan) && businessType && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await payoutService.linkAccount({
        account_number: accountNumber,
        ifsc_code: ifsc.toUpperCase(),
        beneficiary_name: beneficiary,
        pan_number: pan.toUpperCase(),
        bank_name: bankName || undefined,
        business_type: businessType,
      });
      toast.success("Linked", res?.message || "Bank account submitted to Cashfree.");
      router.replace("/(tabs)/finance");
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.error("Too Many Attempts", "Please wait and try again.");
      } else {
        toast.error("Failed", err?.response?.data?.detail || "Could not link account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Link Bank Account</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Hero icon */}
          <View style={styles.heroWrap}>
            <View style={styles.heroIcon}>
              <Banknote size={28} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.title}>Cashfree Vendor Setup</Text>
            <Text style={styles.subtitle}>
              We'll submit your details to Cashfree. Status changes from "Pending" to "Active" after verification.
            </Text>
          </View>

          {/* Info banner */}
          <View style={styles.banner}>
            <AlertCircle size={14} color="#D97706" />
            <Text style={styles.bannerText}>
              All fields verified by Cashfree. Wrong details cause rejection.
            </Text>
          </View>

          {/* Form */}
          <AuthInput
            label="Account Number"
            value={accountNumber}
            onChangeText={(v) => setAccountNumber(v.replace(/\D/g, ""))}
            placeholder="e.g. 1234567890"
            keyboardType="number-pad"
            editable={!loading}
            errorText={accountErr}
          />

          <AuthInput
            label="IFSC Code"
            value={ifsc}
            onChangeText={(v) => setIfsc(v.toUpperCase())}
            placeholder="HDFC0001234"
            editable={!loading}
            maxLength={11}
            errorText={ifscErr}
            helperText="11 chars: 4 letters + 0 + 6 alphanumeric"
          />

          <AuthInput
            label="Beneficiary Name"
            value={beneficiary}
            onChangeText={setBeneficiary}
            placeholder="As per bank records"
            autoCapitalize="words"
            editable={!loading}
          />

          <AuthInput
            label="PAN Number"
            value={pan}
            onChangeText={(v) => setPan(v.toUpperCase())}
            placeholder="ABCDE1234F"
            editable={!loading}
            maxLength={10}
            errorText={panErr}
          />

          <AuthInput
            label="Bank Name (Optional)"
            value={bankName}
            onChangeText={setBankName}
            placeholder="Auto-derived from IFSC"
            editable={!loading}
          />

          {/* Business type picker */}
          <Text style={styles.fieldLabel}>Business Type</Text>
          <View style={styles.bizGrid}>
            {BUSINESS_TYPES.map((bt) => {
              const active = businessType === bt;
              return (
                <TouchableOpacity
                  key={bt}
                  onPress={() => setBusinessType(bt)}
                  style={[styles.bizChip, active ? styles.bizChipActive : styles.bizChipInactive]}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.bizChipText, active ? styles.bizChipTextActive : styles.bizChipTextInactive]}>
                    {bt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <AuthButton
            title={loading ? "Submitting..." : "Link Account"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229,231,235,0.7)",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scroll: { padding: 20, paddingBottom: 40 },

  heroWrap: { alignItems: "center", marginBottom: 18 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
    paddingHorizontal: 12,
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    padding: 10,
    borderRadius: 10,
    marginBottom: 18,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: "#92400E",
    fontWeight: "600",
  },

  fieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 4,
  },
  bizGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  bizChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
  },
  bizChipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  bizChipInactive: { backgroundColor: "#FFFFFF", borderColor: "rgba(229,231,235,0.7)" },
  bizChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bizChipTextActive: { color: "#FFFFFF" },
  bizChipTextInactive: { color: "#374151" },
});
