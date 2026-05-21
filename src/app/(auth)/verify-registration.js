import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ShieldCheck, RotateCcw, ArrowLeft } from "lucide-react-native";
import AuthScreen from "../../components/ui/AuthScreen";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthButton from "../../components/auth/AuthButton";
import OtpInput from "../../components/auth/OtpInput";
import toast from "../../utils/toast";
import authService from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safeReplace } from "../../services/navigationGuard";

export default function VerifyRegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { loginWithToken, logout } = useAuth();

  const phone = (params.phone || "").toString();
  const initialMax = parseInt(params.maxResends) || 3;
  const initialCooldown = parseInt(params.resendAfter) || 60;

  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(initialCooldown);
  const [expiryCountdown, setExpiryCountdown] = useState(initialCooldown);
  const [resendsRemaining, setResendsRemaining] = useState(initialMax);

  const otpExpired = expiryCountdown <= 0;

  useEffect(() => {
    if (!phone) {
      toast.error("Session Lost", "No registration session found. Please sign up again.");
      safeReplace(router, "/(auth)/register");
    }
  }, [phone, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const t = setInterval(() => setExpiryCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [expiryCountdown]);

  const handleVerify = useCallback(async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("OTP Required", "Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.registerVerifyOtp(phone, code);
      toast.success("Verified", res?.message || "Account created successfully!");
      if (res?.access_token) {
        await loginWithToken(res);
      }
      const role = res?.user?.role;
      const status = res?.user?.account_status;
      if (role !== "venue_owner") {
        toast.error("Wrong Role", "This app is for venue owners only.");
        await logout();
        safeReplace(router, "/(auth)/login");
        return;
      }
      if (status === "pending") {
        toast.info("Pending Approval", "Your venue account needs admin approval before you can manage venues.");
        await logout();
        safeReplace(router, "/(auth)/login");
        return;
      }
      safeReplace(router, "/(tabs)/dashboard");
    } catch (err) {
      toast.error("Verification Failed", err?.response?.data?.detail || "Invalid OTP.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }, [otp, phone, loginWithToken, logout, router]);

  useEffect(() => {
    if (otp.every((d) => d !== "") && !loading) handleVerify();
  }, [otp, loading, handleVerify]);

  const handleResend = async () => {
    if (countdown > 0 || resendsRemaining <= 0) return;
    setLoading(true);
    try {
      const res = await authService.registerResendOtp(phone);
      toast.success("OTP Sent", res?.message || "OTP resent!");
      const next = res?.resend_after || 120;
      setCountdown(next);
      setExpiryCountdown(next);
      setResendsRemaining(res?.resends_remaining ?? resendsRemaining - 1);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to resend OTP.";
      toast.error("Resend Failed", detail);
      if (err?.response?.status === 400 && detail.includes("form again")) {
        safeReplace(router, "/(auth)/register");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!phone) return null;

  return (
    <AuthScreen>
      <TouchableOpacity
        onPress={() => safeReplace(router, "/(auth)/register")}
        style={styles.backBtn}
        activeOpacity={0.7}
      >
        <ArrowLeft size={14} color="#6B7280" />
        <Text style={styles.backText}>Back to Sign Up</Text>
      </TouchableOpacity>

      <AuthHeader
        title="Verify OTP"
        subtitle={`Enter the 6-digit code sent to +91 ${phone} on WhatsApp.`}
        icon={<ShieldCheck size={26} color={PRIMARY_COLOR} />}
      />

      {!otpExpired ? (
        expiryCountdown > 0 ? (
          <Text style={styles.expiryText}>
            Code expires in{" "}
            <Text style={styles.expiryBold}>
              {Math.floor(expiryCountdown / 60)}:{String(expiryCountdown % 60).padStart(2, "0")}
            </Text>
          </Text>
        ) : null
      ) : (
        <Text style={styles.expiryExpired}>OTP expired. Please request a new one.</Text>
      )}

      <OtpInput value={otp} onChange={setOtp} editable={!loading && !otpExpired} />

      <AuthButton
        title={loading ? "Verifying..." : "Verify & Create Account"}
        onPress={handleVerify}
        loading={loading}
        disabled={otpExpired || otp.some((d) => !d)}
      />

      <View style={styles.resendWrap}>
        {countdown > 0 ? (
          <Text style={styles.resendText}>
            Resend OTP in <Text style={styles.resendBold}>{countdown}s</Text>
          </Text>
        ) : resendsRemaining > 0 ? (
          <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendLink} activeOpacity={0.7}>
            <RotateCcw size={13} color={PRIMARY_COLOR} />
            <Text style={styles.resendLinkText}>Resend OTP</Text>
            <Text style={styles.resendCount}>({resendsRemaining} left)</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.resendMaxWrap}>
            <Text style={styles.resendText}>Maximum resends reached.</Text>
            <TouchableOpacity onPress={() => safeReplace(router, "/(auth)/register")} activeOpacity={0.7}>
              <Text style={styles.resendTryAgain}>Start over</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingVertical: 4,
  },
  backText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  expiryText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  expiryBold: { color: "#111827", fontWeight: "900" },
  expiryExpired: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  resendWrap: { marginTop: 20, alignItems: "center" },
  resendText: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resendBold: { color: "#111827", fontWeight: "900" },
  resendLink: { flexDirection: "row", alignItems: "center" },
  resendLinkText: {
    marginLeft: 6,
    marginRight: 6,
    fontSize: 11,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  resendCount: { fontSize: 11, color: "#9CA3AF" },
  resendMaxWrap: { flexDirection: "row", alignItems: "center" },
  resendTryAgain: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
