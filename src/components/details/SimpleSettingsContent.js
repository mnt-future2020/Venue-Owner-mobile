import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
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
  CheckCircle2,
  AlertTriangle,
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

// Exact mirror of frontend PasswordChangeSection (PasswordChangeSection.js:22-42):
// 4-level strength score + 4 rule checklist.
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 2) return { score: 1, label: "Weak", color: "#EF4444" };
  if (s <= 3) return { score: 2, label: "Fair", color: "#F59E0B" };
  if (s <= 4) return { score: 3, label: "Good", color: PRIMARY_COLOR };
  return { score: 4, label: "Strong", color: "#10B981" };
}

const PW_RULES = [
  { test: (p) => p.length >= 8, label: "8+ characters" },
  { test: (p) => /[A-Z]/.test(p), label: "Uppercase" },
  { test: (p) => /[a-z]/.test(p), label: "Lowercase" },
  { test: (p) => /[0-9]/.test(p), label: "Number" },
];

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
    { id: "legal", icon: Shield, label: "Legal" },
  ];

  const LEGAL_LINKS = [
    {
      key: "privacy",
      icon: Shield,
      label: "Privacy Policy",
      desc: "How we collect, use, and protect your data",
      route: "/(stack)/privacy-policy",
    },
    {
      key: "terms",
      icon: FileText,
      label: "Terms of Service",
      desc: "Rules and conditions for using LOBBI",
      route: "/(stack)/terms",
    },
    {
      key: "refund",
      icon: Info,
      label: "Cancellation & Refund Policy",
      desc: "Refund windows, methods, and timelines",
      route: "/(stack)/refund-policy",
    },
  ];

  return (
    <>
    <KeyboardAwareScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={20}
      enableAutomaticScroll
      keyboardOpeningTime={150}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderLabel}>SETTINGS</Text>
        <Text style={styles.pageHeaderTitle}>
          Privacy & <Text style={{ color: PRIMARY_COLOR }}>Notifications</Text>
        </Text>
        <Text style={styles.pageHeaderDesc}>Control your notification channels and preferences.</Text>
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

      {/* Security Tab */}
      {activeTab === "security" && (
        <View style={styles.tabContent}>
          <AppCard style={styles.sectionCard}>
            <TouchableOpacity
              style={[styles.settingsRow, styles.settingsRowBorder]}
              activeOpacity={0.7}
              onPress={() => setPasswordExpanded(!passwordExpanded)}
            >
              <View style={styles.settingsIconWrap}>
                <Lock size={18} color={PRIMARY_COLOR} />
              </View>
              <Text style={styles.settingsLabel}>Change Password</Text>
              {passwordExpanded ? (
                <ChevronUp size={18} color="#94A3B8" />
              ) : (
                <ChevronDown size={18} color="#94A3B8" />
              )}
            </TouchableOpacity>

            {passwordExpanded && (
              <View style={styles.expandedSection}>
                {/* Each field labelled with the frontend's uppercase tracking-wider
                    label style (PasswordChangeSection.js:99-101). */}
                <Text style={styles.pwFieldLabel}>CURRENT PASSWORD</Text>
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

                <Text style={styles.pwFieldLabel}>NEW PASSWORD</Text>
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

                {/* Strength meter + rules checklist — exact mirror of frontend
                    PasswordChangeSection.js:154-205. 4 colored segments + label,
                    plus 4 rule chips that turn green as the criteria are met. */}
                {newPassword ? (() => {
                  const strength = getPasswordStrength(newPassword);
                  return (
                    <View style={styles.pwStrengthBlock}>
                      <View style={styles.pwStrengthRow}>
                        <View style={styles.pwStrengthBars}>
                          {[1, 2, 3, 4].map((lvl) => (
                            <View
                              key={lvl}
                              style={[
                                styles.pwStrengthBar,
                                { backgroundColor: lvl <= strength.score ? strength.color : "#E2E8F0" },
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={[styles.pwStrengthLabel, { color: strength.color }]}>
                          {strength.label}
                        </Text>
                      </View>

                      <View style={styles.pwRulesRow}>
                        {PW_RULES.map((r) => {
                          const ok = r.test(newPassword);
                          return (
                            <View key={r.label} style={styles.pwRuleChip}>
                              <CheckCircle2
                                size={11}
                                color={ok ? "#10B981" : "#CBD5E1"}
                                strokeWidth={2.5}
                              />
                              <Text style={[styles.pwRuleText, ok && styles.pwRuleTextOk]}>
                                {r.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })() : null}

                <Text style={styles.pwFieldLabel}>CONFIRM PASSWORD</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNew}
                  style={[
                    styles.textInput,
                    confirmPassword && newPassword !== confirmPassword && styles.textInputError,
                    confirmPassword && newPassword === confirmPassword && newPassword && styles.textInputMatch,
                  ]}
                />
                {/* Match / mismatch indicator (frontend PasswordChangeSection.js:228-252) */}
                {confirmPassword && newPassword !== confirmPassword ? (
                  <View style={styles.pwMatchRow}>
                    <AlertTriangle size={11} color="#EF4444" strokeWidth={2.5} />
                    <Text style={styles.pwMismatchText}>Passwords don't match</Text>
                  </View>
                ) : confirmPassword && newPassword === confirmPassword && newPassword ? (
                  <View style={styles.pwMatchRow}>
                    <CheckCircle2 size={11} color="#10B981" strokeWidth={2.5} />
                    <Text style={styles.pwMatchText}>Passwords match</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  activeOpacity={0.85}
                  disabled={updatingPassword}
                  onPress={handleChangePassword}
                >
                  {updatingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Shield size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.primaryBtnText}>Update Password</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Tip banner — mirrors frontend PasswordChangeSection.js:276-281 */}
                <View style={styles.pwTipBanner}>
                  <Lock size={13} color="#D97706" strokeWidth={2.5} />
                  <Text style={styles.pwTipText}>
                    Use a unique password you don&apos;t use on other sites.
                  </Text>
                </View>
              </View>
            )}
          </AppCard>
        </View>
      )}

      {/* Legal Tab */}
      {activeTab === "legal" && (
        <View style={styles.tabContent}>
          {LEGAL_LINKS.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              style={styles.notifCard}
              onPress={() => safePush(router, item.route)}
            >
              <View style={styles.notifCardInner}>
                <View style={[styles.notifIconWrap, styles.notifIconWrapActive]}>
                  <item.icon size={18} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.notifCardCopy}>
                  <Text style={styles.notifCardTitle}>{item.label}</Text>
                  <Text style={styles.notifCardDesc}>{item.desc}</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.legalFooter}>
            <Text style={styles.legalFooterTitle}>MAGIZH DIGITAL MARKETING SOLUTIONS PRIVATE LIMITED</Text>
            <Text style={styles.legalFooterMeta}>CIN: U63999TN2024PTC172597</Text>
            <Text style={styles.legalFooterMeta}>Last updated: December 1, 2025</Text>
          </View>
        </View>
      )}

      <View style={{ height: 24 }} />
    </KeyboardAwareScrollView>
    </>
  );
}

export function SupportContent() {
  // Kept for backwards compat - real support is at support screen
  return null;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },

  // Page Header
  pageHeader: { gap: 4, marginBottom: 8 },
  pageHeaderLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", color: "#94A3B8", fontFamily: "monospace" },
  pageHeaderTitle: { fontSize: 24, fontWeight: "700", color: "#0F172A", letterSpacing: -0.3, marginTop: 4 },
  pageHeaderDesc: { fontSize: 13, color: "#94A3B8", lineHeight: 20, marginTop: 4 },

  // Tab Bar
  tabBar: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tabBtn: {
    flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 10,
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
  textInputError: { borderColor: "rgba(239,68,68,0.4)" },
  textInputMatch: { borderColor: "rgba(16,185,129,0.4)" },

  // Password strength meter — 4 bars + label (mirrors frontend strength bar UI)
  pwStrengthBlock: { gap: 8, marginTop: -2, marginBottom: 4 },
  pwStrengthRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pwStrengthBars: { flex: 1, flexDirection: "row", gap: 4, height: 4 },
  pwStrengthBar: { flex: 1, borderRadius: 999 },
  pwStrengthLabel: { fontSize: 11, fontWeight: "700" },

  // Rules checklist — 4 chips that turn green as criteria are met
  pwRulesRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
  pwRuleChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  pwRuleText: { fontSize: 11, color: "#94A3B8" },
  pwRuleTextOk: { color: "#059669" },

  // Match/mismatch status under confirm input
  pwMatchRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  pwMatchText: { fontSize: 11, color: "#10B981", fontWeight: "600" },
  pwMismatchText: { fontSize: 11, color: "#EF4444", fontWeight: "600" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  // Field labels above each input — matches frontend `text-xs font-semibold uppercase tracking-wider`
  pwFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: 6,
  },

  // Tip banner at the bottom — matches frontend amber-tinted info banner
  pwTipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  pwTipText: {
    flex: 1,
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },

  // Legal tab footer
  legalFooter: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 4,
  },
  legalFooterTitle: { fontSize: 10, fontWeight: "900", color: "#0F172A", letterSpacing: 0.8, textAlign: "center" },
  legalFooterMeta: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },
});
