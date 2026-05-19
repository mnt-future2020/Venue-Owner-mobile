import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  LogOut,
  Mail,
  Phone,
  Building2,
  Bell,
  Lock,
  ChevronRight,
  FileText,
  ShieldCheck,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safeReplace } from "../../services/navigationGuard";
import Header from "../../components/Header";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            safeReplace(router, "/(auth)/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header card with avatar */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name || "Venue Owner"}</Text>
          <View style={styles.roleBadge}>
            <ShieldCheck size={11} color={PRIMARY_COLOR} />
            <Text style={styles.roleText}>Venue Owner</Text>
          </View>
        </View>

        {/* Account section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <InfoRow icon={<Mail size={16} color="#6B7280" />} label="Email" value={user?.email || "—"} />
          <InfoRow
            icon={<Phone size={16} color="#6B7280" />}
            label="Phone"
            value={user?.phone ? `+91 ${user.phone}` : "—"}
          />
          <InfoRow
            icon={<Building2 size={16} color="#6B7280" />}
            label="Business"
            value={user?.business_name || "—"}
          />
          {user?.gst_number ? (
            <InfoRow
              icon={<FileText size={16} color="#6B7280" />}
              label="GST"
              value={user.gst_number}
              isLast
            />
          ) : null}
        </View>

        {/* Settings section */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.card}>
          <LinkRow icon={<Bell size={16} color="#6B7280" />} label="Notifications" />
          <LinkRow icon={<Lock size={16} color="#6B7280" />} label="Privacy & Security" isLast />
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.85}>
          <LogOut size={16} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Lobbi Venue · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, isLast }) {
  return (
    <View style={[styles.row, isLast ? styles.rowNoBorder : null]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({ icon, label, isLast }) {
  return (
    <TouchableOpacity style={[styles.linkRow, isLast ? styles.rowNoBorder : null]} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.linkText}>{label}</Text>
      <ChevronRight size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { padding: 20, paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${PRIMARY_COLOR}1A`,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  // Section label (above each card)
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },

  // Info row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowNoBorder: { borderBottomWidth: 0 },
  rowIcon: { width: 32, alignItems: "flex-start" },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  rowValue: { fontSize: 14, color: "#111827", fontWeight: "700" },

  // Link row
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  linkText: { flex: 1, fontSize: 13, color: "#111827", fontWeight: "700" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    marginTop: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "900",
    fontSize: 12,
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  version: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 24,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
