import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Building2 } from "lucide-react-native";
import AuthScreen from "../../components/ui/AuthScreen";
import Logo from "../../components/Logo";
import AuthInput from "../../components/auth/AuthInput";
import PasswordField from "../../components/auth/PasswordField";
import AuthButton from "../../components/auth/AuthButton";
import AuthLink from "../../components/auth/AuthLink";
import toast from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safePush, safeReplace } from "../../services/navigationGuard";
import authService from "../../services/authService";

const DEV_OWNER_EMAIL = "kansha2312@mntfuture.com";

export default function LoginScreen() {
  const router = useRouter();
  const { login, logout, loginWithToken } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);

  const handleOwnerLoginSuccess = async (res) => {
    const status = res?.user?.account_status;
    if (status === "pending") {
      toast.info("Pending Approval", "Your venue account is awaiting admin approval.");
      await logout();
      return false;
    }
    if (status === "rejected") {
      toast.error("Account Rejected", "Your venue registration was not approved. Contact support.");
      await logout();
      return false;
    }
    if (status === "suspended") {
      toast.error("Account Suspended", "Your account has been suspended. Contact support.");
      await logout();
      return false;
    }
    const userRole = res?.user?.role;
    if (userRole !== "venue_owner") {
      toast.error(
        "Access Denied",
        "This account is not a venue owner. Please sign in with the correct account."
      );
      await logout();
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id || !password) {
      toast.error("Login Failed", "Please enter email/phone and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await login(id, password);
      const ok = await handleOwnerLoginSuccess(res);
      if (ok) {
        toast.success("Welcome back!", "");
        safeReplace(router, "/(tabs)/feed");
      }
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.error("Too Many Attempts", "Please wait before trying again.");
      } else {
        toast.error("Login Failed", err?.response?.data?.detail || "Invalid credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const res = await authService.devLogin(DEV_OWNER_EMAIL);
      // dev-login returns same shape as login; persist session through context
      await loginWithToken(res);
      const ok = await handleOwnerLoginSuccess(res);
      if (ok) {
        toast.success("Dev Login", "Logged in as Venue Owner");
        safeReplace(router, "/(tabs)/feed");
      }
    } catch (err) {
      toast.error("Dev Login Failed", err?.response?.data?.detail || "Dev login is disabled.");
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <AuthScreen>
      {/* Bordered card wrapper — mobile parity (mobile login.js wraps
          the entire header + form in a white rounded card with a 1px
          gray border, padding 20). */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Logo size={50} variant="platform" />
          <Text style={styles.title}>Venue Owner Login</Text>
          <Text style={styles.subtitle}>Sign in to manage your facility</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
        <AuthInput
          label="Email / Phone Number"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Enter your email / phone"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <PasswordField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          editable={!loading}
          showPassword={showPass}
          onToggle={() => setShowPass((v) => !v)}
        />
        <AuthButton
          title={loading ? "Authenticating..." : "Sign In"}
          onPress={handleLogin}
          loading={loading}
        />
        <TouchableOpacity
          onPress={() => safePush(router, "/(auth)/forgot-password")}
          style={styles.forgotWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
        {/* <AuthLink
          text="Don't have an account?"
          linkText="Create Account"
          onPress={() => safePush(router, "/(auth)/register")}
        /> */}
        </View>

        {/* Dev quick-login (dev mode only) */}
        {__DEV__ && (
          <View style={styles.devWrap}>
            <Text style={styles.devLabel}>Quick Login (Dev)</Text>
            <TouchableOpacity
              onPress={handleDevLogin}
              disabled={devLoading}
              style={[styles.devBtn, devLoading && styles.devBtnDisabled]}
              activeOpacity={0.85}
            >
              {devLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Building2 size={16} color="#FFFFFF" />
              )}
              <Text style={styles.devBtnText}>Venue Owner</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  // Mobile parity: white card with rounded corners and a 1px gray border
  // wraps the entire login screen content (see mobile/src/app/(auth)/login.js).
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  forgotWrap: {
    marginTop: 18,
    alignItems: "center",
  },
  forgotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  devWrap: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  devLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B", // amber-500 (matches web Venue Owner badge)
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  devBtnDisabled: {
    opacity: 0.6,
  },
  devBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 8,
  },
});
