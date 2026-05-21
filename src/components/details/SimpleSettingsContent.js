import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Bell,
  MessageSquare,
  Shield,
  Globe,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Star,
  Info,
  FileText,
  ExternalLink,
  LogOut,
  Mail,
  Trash2,
  Award,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react-native";
import { safePush } from "../../services/navigationGuard";
import AppCard from "../ui/AppCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/axios";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";

const PREFS_KEY = "lobbi_user_preferences";

const DEFAULT_PREFS = {
  email_notifications: true,
  push_notifications: true,
};

export function SettingsContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Password change
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);


  // Preferences
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
        }
      } catch {
        // use defaults
      }
      setPrefsLoaded(true);
    };
    loadPrefs();
  }, []);

  const updatePref = useCallback(async (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (!oldPassword || !newPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.put("/auth/change-password", {
        current_password: oldPassword,
        new_password: newPassword,
      });
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordExpanded(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  }, [oldPassword, newPassword, confirmPassword]);


  const SettingsRow = ({ icon: Icon, iconColor, label, onPress, right, noBorder }) => (
    <TouchableOpacity
      style={[styles.settingsRow, !noBorder && styles.settingsRowBorder]}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingsIconWrap, { backgroundColor: (iconColor || PRIMARY_COLOR) + "15" }]}>
        <Icon size={18} color={iconColor || PRIMARY_COLOR} />
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
      {right || (onPress ? <ChevronRight size={18} color="#94A3B8" /> : null)}
    </TouchableOpacity>
  );

  const NOTIF_CHANNELS = [
    { key: "email", label: "Email Notifications", desc: "Booking confirmations, receipts, and important updates" },
    { key: "push", label: "Push Notifications", desc: "Real-time updates on your device" },
    { key: "in_app", label: "In-App Notifications", desc: "Activity feed and in-app alerts (always active)", locked: true },
  ];

  const [activeTab, setActiveTab] = useState("notifications");
  const TABS = [
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "security", icon: Lock, label: "Security" },
  ];

  return (
    <>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header — frontend Settings parity: icon + title + subtitle row */}
      <View style={styles.pageHeaderRow}>
        <View style={styles.pageHeaderIcon}>
          <SlidersHorizontal size={18} color={PRIMARY_COLOR} />
        </View>
        <View>
          <Text style={styles.pageHeaderTitle}>Settings</Text>
          <Text style={styles.pageHeaderDesc}>Manage your preferences</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.85}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} color={activeTab === tab.id ? "#FFFFFF" : "#64748B"} />
            <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <View style={styles.tabContent}>
          {prefsLoaded && NOTIF_CHANNELS.map((ch) => {
            const isActive = ch.locked ? true : (prefs[`${ch.key}_notifications`] !== false);
            return (
              <TouchableOpacity
                key={ch.key}
                activeOpacity={ch.locked ? 1 : 0.85}
                style={styles.notifCard}
                onPress={() => !ch.locked && updatePref(`${ch.key}_notifications`, !isActive)}
                disabled={ch.locked}
              >
                <View style={styles.notifCardInner}>
                  <View style={[styles.notifIconWrap, isActive ? styles.notifIconWrapActive : styles.notifIconWrapInactive]}>
                    <Bell size={18} color={isActive ? PRIMARY_COLOR : "#94A3B8"} />
                  </View>
                  <View style={styles.notifCardCopy}>
                    <View style={styles.notifCardTitleRow}>
                      <Text style={styles.notifCardTitle}>{ch.label}</Text>
                      {ch.locked ? <Lock size={12} color="#94A3B8" /> : null}
                    </View>
                    <Text style={styles.notifCardDesc}>{ch.desc}</Text>
                  </View>
                  <View style={[styles.notifToggle, ch.locked && { opacity: 0.4 }]}>
                    {isActive ? (
                      <View style={styles.toggleOn}><View style={styles.toggleKnobOn} /></View>
                    ) : (
                      <View style={styles.toggleOff}><View style={styles.toggleKnobOff} /></View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Security Tab — frontend parity: always-expanded "Account Security"
          card with shield icon + 3 labeled fields + footer tip. */}
      {activeTab === "security" && (
        <View style={styles.tabContent}>
          {/* Account Security header */}
          <View style={styles.securityHeaderRow}>
            <View style={styles.securityHeaderIcon}>
              <ShieldCheck size={20} color={PRIMARY_COLOR} />
            </View>
            <View>
              <Text style={styles.securityHeaderTitle}>Account Security</Text>
              <Text style={styles.securityHeaderSub}>Update your password</Text>
            </View>
          </View>

          {/* Password card */}
          <AppCard style={styles.sectionCard}>
            <View style={styles.passwordForm}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showOld}
                    style={styles.textInput}
                  />
                  <TouchableOpacity onPress={() => setShowOld(!showOld)} style={styles.eyeBtn}>
                    {showOld ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Create a strong password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNew}
                    style={styles.textInput}
                  />
                  <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                    {showNew ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNew}
                  style={styles.textInput}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!oldPassword || !newPassword || !confirmPassword) && styles.primaryBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={updatingPassword || !oldPassword || !newPassword || !confirmPassword}
                onPress={handleChangePassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </AppCard>

          {/* Footer tip */}
          <View style={styles.securityTip}>
            <Lock size={12} color="#D97706" />
            <Text style={styles.securityTipText}>
              Use a unique password you don't use on other sites.
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
    </>
  );
}

export function SupportContent() {
  // Kept for backwards compat - real support is at support screen
  return null;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },

  // Page Header (frontend: icon + title + subtitle row)
  pageHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  pageHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  pageHeaderDesc: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  // Security header (Account Security)
  securityHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 2 },
  securityHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  securityHeaderTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  securityHeaderSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },

  // Password form
  passwordForm: { gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1.2,
  },
  primaryBtnDisabled: { opacity: 0.5 },

  // Footer tip
  securityTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.15)",
    marginTop: 4,
  },
  securityTipText: { flex: 1, fontSize: 11, color: "#6B7280", lineHeight: 16 },

  // Tab Bar
  tabBar: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: "#F1F5F9",
  },
  tabBtnActive: { backgroundColor: PRIMARY_COLOR },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  tabBtnTextActive: { color: "#FFFFFF" },
  tabContent: { gap: 12 },

  // Notification Cards
  notifCard: {
    borderRadius: 24, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "rgba(226,232,240,0.4)",
    padding: 16,
  },
  notifCardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifIconWrapActive: { backgroundColor: `${PRIMARY_COLOR}15` },
  notifIconWrapInactive: { backgroundColor: "#F1F5F9" },
  notifCardCopy: { flex: 1, minWidth: 0 },
  notifCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifCardTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  notifCardDesc: { fontSize: 12, color: "#94A3B8", marginTop: 2, lineHeight: 17 },
  notifToggle: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  toggleOn: { width: 44, height: 24, borderRadius: 12, backgroundColor: PRIMARY_COLOR, justifyContent: "center", paddingHorizontal: 2 },
  toggleKnobOn: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF", alignSelf: "flex-end" },
  toggleOff: { width: 44, height: 24, borderRadius: 12, backgroundColor: "#E2E8F0", justifyContent: "center", paddingHorizontal: 2 },
  toggleKnobOff: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF", alignSelf: "flex-start" },

  sectionCard: { gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", color: "#94A3B8", fontFamily: "monospace", marginBottom: 4 },

  // Settings rows
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#334155" },
  settingsValue: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  lockedToggle: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  lockedToggleText: { fontSize: 11, fontWeight: "600", color: "#94A3B8" },

  // Expanded password section
  expandedSection: { gap: 10, paddingVertical: 8 },
  passwordField: { flexDirection: "row", alignItems: "center" },
  textInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  eyeBtn: { position: "absolute", right: 14 },

  primaryBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

});
