import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Phone, ShieldCheck, Lock, CheckCircle2, RotateCcw, ArrowLeft } from "lucide-react-native";
import AuthScreen from "../../components/ui/AuthScreen";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import OtpInput from "../../components/auth/OtpInput";
import PasswordField from "../../components/auth/PasswordField";
import toast from "../../utils/toast";
import authService from "../../services/authService";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safeReplace } from "../../services/navigationGuard";

const PASS_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const SUCCESS_GREEN = "#10B981";

const cleanPhone = (v) => {
  let d = v.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  return d.slice(0, 10);
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=phone, 2=otp, 3=reset
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(0);
  const [resendsRemaining, setResendsRemaining] = useState(null);

  // Step 3 state
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const otpExpired = step === 2 && expiryCountdown <= 0 && resendsRemaining !== null;

  // Resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // OTP expiry
  useEffect(() => {
    if (expiryCountdown <= 0) return;
    const t = setInterval(() => setExpiryCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [expiryCountdown]);

  // === Step 1: Request OTP ===
  const handleRequestOTP = async () => {
    if (phone.length !== 10) {
      toast.error("Invalid Phone", "Please enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(phone);
      toast.success("OTP Sent", res?.message || "OTP sent via WhatsApp!");
      const cooldown = res?.resend_after || 60;
      setCountdown(cooldown);
      setExpiryCountdown(cooldown);
      setResendsRemaining(res?.max_resends ?? 3);
      setStep(2);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429) {
        toast.error("Too Many Requests", detail || "Please wait before requesting again.");
      } else {
        toast.error("Failed", detail || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // === Step 2: Verify OTP ===
  const handleVerifyOTP = useCallback(async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("OTP Required", "Please enter the complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone, code);
      if (!res?.reset_token) {
        toast.error("Failed", "OTP verified but reset token missing.");
        return;
      }
      toast.success("Verified", "OTP verified!");
      setResetToken(res.reset_token);
      setStep(3);
    } catch (err) {
      toast.error("Verification Failed", err?.response?.data?.detail || "Invalid OTP.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }, [otp, phone]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.every((d) => d !== "") && step === 2 && !loading) {
      handleVerifyOTP();
    }
  }, [otp, step, loading, handleVerifyOTP]);

  const handleResendOTP = async () => {
    if (countdown > 0 || resendsRemaining <= 0) return;
    setLoading(true);
    try {
      const res = await authService.resendOtp(phone);
      toast.success("OTP Sent", res?.message || "OTP resent!");
      const next = res?.resend_after || 120;
      setCountdown(next);
      setExpiryCountdown(next);
      setResendsRemaining(res?.resends_remaining ?? resendsRemaining - 1);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      toast.error("Resend Failed", err?.response?.data?.detail || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // === Step 3: Reset Password ===
  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Mismatch", "Passwords do not match.");
      return;
    }
    if (!PASS_RE.test(newPassword)) {
      toast.error("Weak Password", "Use 8+ chars with uppercase, lowercase and a number.");
      return;
    }
    if (!resetToken) {
      toast.error("Missing Token", "Verify OTP first.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      toast.success("Success", "Password reset successfully!");
      setTimeout(() => safeReplace(router, "/(auth)/login"), 800);
    } catch (err) {
      toast.error("Reset Failed", err?.response?.data?.detail || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Back button
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtp(["", "", "", "", "", ""]);
      setCountdown(0);
      setExpiryCountdown(0);
    } else {
      safeReplace(router, "/(auth)/login");
    }
  };

  const passInvalid = newPassword && !PASS_RE.test(newPassword);
  const confirmMismatch = confirmPassword && newPassword !== confirmPassword;

  return (
    <AuthScreen>
      {/* Back button */}
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
        <ArrowLeft size={14} color="#6B7280" />
        <Text style={styles.backText}>
          {step === 1 ? "Back to Login" : step === 2 ? "Change Number" : "Back to Login"}
        </Text>
      </TouchableOpacity>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step 1: Phone */}
      {step === 1 && (
        <View>
          <AuthHeader
            title="Forgot Password?"
            subtitle="Enter your registered phone number to receive an OTP via WhatsApp."
            icon={<Phone size={26} color={PRIMARY_COLOR} />}
          />
          <AuthInput
            label="Phone Number"
            value={phone}
            onChangeText={(v) => setPhone(cleanPhone(v))}
            placeholder="98765 43210"
            keyboardType="number-pad"
            editable={!loading}
            maxLength={10}
            leftAdornment="+91"
            autoFocus
          />
          <AuthButton
            title={loading ? "Sending..." : "Send OTP via WhatsApp"}
            onPress={handleRequestOTP}
            loading={loading}
            disabled={phone.length !== 10}
          />
        </View>
      )}

      {/* Step 2: OTP */}
      {step === 2 && (
        <View>
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
            title={loading ? "Verifying..." : "Verify OTP"}
            onPress={handleVerifyOTP}
            loading={loading}
            disabled={otpExpired || otp.some((d) => !d)}
          />

          {/* Resend block */}
          <View style={styles.resendWrap}>
            {countdown > 0 ? (
              <Text style={styles.resendText}>
                Resend OTP in <Text style={styles.resendBold}>{countdown}s</Text>
              </Text>
            ) : resendsRemaining > 0 ? (
              <TouchableOpacity onPress={handleResendOTP} disabled={loading} style={styles.resendLink} activeOpacity={0.7}>
                <RotateCcw size={13} color={PRIMARY_COLOR} />
                <Text style={styles.resendLinkText}>Resend OTP</Text>
                <Text style={styles.resendCount}>({resendsRemaining} left)</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.resendMaxWrap}>
                <Text style={styles.resendText}>Maximum resends reached.</Text>
                <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={styles.resendTryAgain}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Step 3: Reset password */}
      {step === 3 && (
        <View>
          <AuthHeader
            title="Set New Password"
            subtitle="Choose a strong password for your account."
            icon={<Lock size={26} color={SUCCESS_GREEN} />}
            iconBgColor={`${SUCCESS_GREEN}1A`}
          />
          <PasswordField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min 8 chars, uppercase, lowercase, number"
            editable={!loading}
            showPassword={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoFocus
            errorText={passInvalid ? "Must be 8+ chars with uppercase, lowercase, and number" : ""}
          />
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your new password"
            editable={!loading}
            showPassword={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            errorText={confirmMismatch ? "Passwords do not match" : ""}
          />
          <AuthButton
            title={loading ? "Resetting..." : "Reset Password"}
            onPress={handleResetPassword}
            loading={loading}
            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || passInvalid}
          />
        </View>
      )}
    </AuthScreen>
  );
}

// === Step indicator component (matches web) ===
function StepIndicator({ currentStep }) {
  return (
    <View style={stepStyles.row}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={stepStyles.group}>
          <View
            style={[
              stepStyles.circle,
              currentStep >= s ? stepStyles.circleActive : stepStyles.circleInactive,
            ]}
          >
            {currentStep > s ? (
              <CheckCircle2 size={16} color="#FFFFFF" />
            ) : (
              <Text style={[stepStyles.num, currentStep >= s ? stepStyles.numActive : stepStyles.numInactive]}>
                {s}
              </Text>
            )}
          </View>
          {s < 3 ? (
            <View style={[stepStyles.line, currentStep > s ? stepStyles.lineActive : stepStyles.lineInactive]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    marginTop: 4,
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  circleInactive: {
    backgroundColor: "#F3F4F6",
  },
  num: {
    fontSize: 12,
    fontWeight: "900",
  },
  numActive: {
    color: "#FFFFFF",
  },
  numInactive: {
    color: "#9CA3AF",
  },
  line: {
    width: 32,
    height: 2,
    marginHorizontal: 6,
  },
  lineActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  lineInactive: {
    backgroundColor: "rgba(229, 231, 235, 0.7)",
  },
});

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
  expiryBold: {
    color: "#111827",
    fontWeight: "900",
  },
  expiryExpired: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  resendWrap: {
    marginTop: 20,
    alignItems: "center",
  },
  resendText: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resendBold: {
    color: "#111827",
    fontWeight: "900",
  },
  resendLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendLinkText: {
    marginLeft: 6,
    marginRight: 6,
    fontSize: 11,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  resendCount: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  resendMaxWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendTryAgain: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
