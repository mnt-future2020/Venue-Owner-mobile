import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AuthScreen from "../../components/ui/AuthScreen";
import Logo from "../../components/Logo";
import AuthInput from "../../components/auth/AuthInput";
import PasswordField from "../../components/auth/PasswordField";
import AuthButton from "../../components/auth/AuthButton";
import AuthLink from "../../components/auth/AuthLink";
import toast from "../../utils/toast";
import authService from "../../services/authService";
import { safePush, safeReplace } from "../../services/navigationGuard";

const PASS_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const cleanPhone = (v) => {
  let d = v.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  return d.slice(0, 10);
};

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const passInvalid = password.length > 0 && !PASS_RE.test(password);

  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error("Name Required", "Please enter your full name.");
      return;
    }
    if (!PASS_RE.test(password)) {
      toast.error("Weak Password", "Use 8+ chars with uppercase, lowercase and a number.");
      return;
    }
    if (phone.length !== 10) {
      toast.error("Invalid Phone", "Please enter a valid 10-digit phone number.");
      return;
    }
    if (!businessName.trim()) {
      toast.error("Business Required", "Please enter your venue/business name.");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.registerSendOtp({
        name: name.trim(),
        password,
        phone,
        role: "venue_owner",
        business_name: businessName.trim(),
        gst_number: gstNumber.trim(),
      });
      toast.success("OTP Sent", res?.message || "OTP sent via WhatsApp!");
      safePush(router, {
        pathname: "/(auth)/verify-registration",
        params: {
          phone,
          maxResends: String(res?.max_resends ?? 3),
          resendAfter: String(res?.resend_after ?? 60),
        },
      });
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.error("Too Many Attempts", "Please wait before trying again.");
      } else {
        toast.error("Registration Failed", err?.response?.data?.detail || "Failed to send OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <View style={styles.logoWrap}>
        <Logo size={32} />
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>Create Venue Account</Text>
        <Text style={styles.subtitle}>Register your facility on Lobbi</Text>
      </View>

      <View style={styles.form}>
        <AuthInput
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          editable={!loading}
        />
        <PasswordField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Min 8 chars, uppercase, lowercase, number"
          editable={!loading}
          showPassword={showPass}
          onToggle={() => setShowPass((v) => !v)}
          errorText={passInvalid ? "Must be 8+ chars with uppercase, lowercase, and number" : ""}
        />
        <AuthInput
          label="Phone (WhatsApp OTP)"
          value={phone}
          onChangeText={(v) => setPhone(cleanPhone(v))}
          placeholder="98765 43210"
          keyboardType="number-pad"
          editable={!loading}
          maxLength={10}
          leftAdornment="+91"
        />
        <Text style={styles.helperText}>We'll send an OTP to verify your number via WhatsApp.</Text>

        <AuthInput
          label="Business Name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Your sports facility name"
          editable={!loading}
        />
        <AuthInput
          label="GST Number (optional)"
          value={gstNumber}
          onChangeText={setGstNumber}
          placeholder="29AABCR1234F1Z5"
          editable={!loading}
          autoCapitalize="characters"
        />

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Venue owner accounts require admin verification before going live.
          </Text>
        </View>

        <AuthButton
          title={loading ? "Sending OTP..." : "Verify & Create Account"}
          onPress={handleRegister}
          loading={loading}
          disabled={phone.length !== 10}
        />

        <AuthLink
          text="Already have an account?"
          linkText="Sign In"
          onPress={() => safeReplace(router, "/(auth)/login")}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center", marginBottom: 20 },
  titleWrap: { alignItems: "center", marginBottom: 24 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  subtitle: { marginTop: 6, fontSize: 13, color: "#6B7280" },
  form: { width: "100%" },
  helperText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  notice: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
  },
  noticeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 16,
  },
});
