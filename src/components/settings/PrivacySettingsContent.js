import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Download,
  Trash2,
  BarChart3,
  Megaphone,
  Database,
  Search,
  FileText,
  AlertTriangle,
} from "lucide-react-native";
import { safeReplace } from "../../services/navigationGuard";
import AppCard from "../ui/AppCard";
import { useAuth } from "../../context/AuthContext";
import complianceService from "../../services/complianceService";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import PrivacySettingsSkeleton from "../skeletons/PrivacySettingsSkeleton";

export default function PrivacySettingsContent() {
  const router = useRouter();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Consent state
  const [consent, setConsent] = useState({
    data_collection: true,
    analytics: true,
    marketing: false,
  });

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    email: true,
    sms: false,
    push: true,
    in_app: true,
  });

  // Audit log
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [erasureLoading, setErasureLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [consentData, notifData, auditData] = await Promise.all([
        complianceService.getConsent().catch(() => ({})),
        complianceService.getNotificationPreferences().catch(() => ({})),
        complianceService.getAuditLog().catch(() => []),
      ]);
      if (consentData && Object.keys(consentData).length) {
        setConsent((prev) => ({ ...prev, ...consentData }));
      }
      if (notifData && Object.keys(notifData).length) {
        setNotifPrefs((prev) => ({ ...prev, ...notifData }));
      }
      setAuditLog(Array.isArray(auditData) ? auditData : []);
    } catch {
      toast.error("Failed to load privacy settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConsent = useCallback(async (key, value) => {
    const updated = { ...consent, [key]: value };
    setConsent(updated);
    setSaving(true);
    try {
      await complianceService.updateConsent(key, value);
    } catch {
      setConsent((prev) => ({ ...prev, [key]: !value }));
      toast.error("Failed to update consent");
    } finally {
      setSaving(false);
    }
  }, [consent]);

  const updateNotifPref = useCallback(async (key, value) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    setSaving(true);
    try {
      await complianceService.updateNotificationPreferences(updated);
    } catch {
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
      toast.error("Failed to update notification preference");
    } finally {
      setSaving(false);
    }
  }, [notifPrefs]);

  const handleExportData = useCallback(() => {
    Alert.alert(
      "Export My Data",
      "We'll prepare a copy of all your data and send it to your registered email address. This may take a few minutes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: async () => {
            setExporting(true);
            try {
              await complianceService.exportData();
              toast.success("Data export requested. Check your email shortly.");
            } catch {
              toast.error("Failed to request data export");
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data, highlights, bookings, and stats will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Are you absolutely sure? This action is irreversible.",
              [
                { text: "Go Back", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const api = require("../../lib/axios").default;
                      await api.delete("/auth/account");
                      await logout();
                      safeReplace(router, "/");
                      toast.success("Account deleted");
                    } catch (err) {
                      toast.error(err?.response?.data?.error || "Failed to delete account");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [logout, router]);

  const loadAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await complianceService.getAuditLog();
      setAuditLog(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load audit log");
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const handleRequestErasure = useCallback(() => {
    Alert.alert(
      "Request Data Erasure",
      "This action is irreversible. All your personal data will be permanently erased in accordance with data protection regulations. You will lose access to your account and all associated data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Erase My Data",
          style: "destructive",
          onPress: async () => {
            setErasureLoading(true);
            try {
              await complianceService.requestErasure();
              toast.success("Data erasure request submitted. You will receive a confirmation email.");
            } catch {
              toast.error("Failed to submit erasure request");
            } finally {
              setErasureLoading(false);
            }
          },
        },
      ]
    );
  }, []);

  const filteredAuditLog = auditSearch
    ? auditLog.filter(
        (entry) =>
          (entry.action || "").toLowerCase().includes(auditSearch.toLowerCase()) ||
          (entry.details || "").toLowerCase().includes(auditSearch.toLowerCase())
      )
    : auditLog;

  const formatTimestamp = useCallback((ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  }, []);

  const ToggleRow = ({ icon: Icon, iconColor, label, description, value, onValueChange, noBorder }) => (
    <View style={[styles.toggleRow, !noBorder && styles.toggleRowBorder]}>
      <View style={[styles.iconWrap, { backgroundColor: (iconColor || PRIMARY_COLOR) + "15" }]}>
        <Icon size={18} color={iconColor || PRIMARY_COLOR} />
      </View>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
        thumbColor={value ? PRIMARY_COLOR : "#CBD5E1"}
      />
    </View>
  );

  if (loading) {
    return <PrivacySettingsSkeleton />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Consent Section */}
      <AppCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Data & Consent</Text>
        <ToggleRow
          icon={Database}
          iconColor={PRIMARY_COLOR}
          label="Data Collection"
          description="Allow basic data collection for app functionality"
          value={consent.data_collection}
          onValueChange={(v) => updateConsent("data_collection", v)}
        />
        <ToggleRow
          icon={BarChart3}
          iconColor={PRIMARY_COLOR}
          label="Analytics"
          description="Help us improve by sharing anonymous usage data"
          value={consent.analytics}
          onValueChange={(v) => updateConsent("analytics", v)}
        />
        <ToggleRow
          icon={Megaphone}
          iconColor={PRIMARY_COLOR}
          label="Marketing"
          description="Receive personalized offers and promotions"
          value={consent.marketing}
          onValueChange={(v) => updateConsent("marketing", v)}
          noBorder
        />
      </AppCard>

      {/* Notification Preferences */}
      <AppCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notification Channels</Text>
        <ToggleRow
          icon={Mail}
          iconColor="#7C3AED"
          label="Email"
          description="Receive notifications via email"
          value={notifPrefs.email}
          onValueChange={(v) => updateNotifPref("email", v)}
        />
        <ToggleRow
          icon={MessageSquare}
          iconColor="#7C3AED"
          label="SMS"
          description="Receive notifications via text messages"
          value={notifPrefs.sms}
          onValueChange={(v) => updateNotifPref("sms", v)}
        />
        <ToggleRow
          icon={Bell}
          iconColor="#7C3AED"
          label="Push Notifications"
          description="Receive push notifications on your device"
          value={notifPrefs.push}
          onValueChange={(v) => updateNotifPref("push", v)}
        />
        <ToggleRow
          icon={Smartphone}
          iconColor="#7C3AED"
          label="In-App"
          description="Show notifications within the app"
          value={notifPrefs.in_app}
          onValueChange={(v) => updateNotifPref("in_app", v)}
          noBorder
        />
      </AppCard>

      {/* Data Actions */}
      <AppCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Your Data</Text>
        <TouchableOpacity
          style={styles.exportBtn}
          activeOpacity={0.85}
          onPress={handleExportData}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Download size={18} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Export My Data</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Download a copy of all your personal data including profile, bookings, highlights, and activity history.
        </Text>
      </AppCard>

      {/* Audit Log */}
      <AppCard style={styles.sectionCard}>
        <View style={styles.auditHeader}>
          <Text style={styles.sectionTitle}>Audit Log</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={loadAuditLog} disabled={auditLoading}>
            {auditLoading ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <Text style={styles.refreshLink}>Refresh</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search audit log..."
            placeholderTextColor="#94A3B8"
            value={auditSearch}
            onChangeText={setAuditSearch}
          />
        </View>
        {filteredAuditLog.length > 0 ? (
          filteredAuditLog.slice(0, 20).map((entry, idx) => (
            <View
              key={entry.id || idx}
              style={[
                styles.auditRow,
                idx < filteredAuditLog.length - 1 && idx < 19 && styles.auditRowBorder,
              ]}
            >
              <View style={styles.auditIconWrap}>
                <FileText size={14} color="#64748B" />
              </View>
              <View style={styles.auditInfo}>
                <Text style={styles.auditAction}>{entry.action || "Unknown action"}</Text>
                {entry.details ? (
                  <Text style={styles.auditDetails} numberOfLines={2}>
                    {entry.details}
                  </Text>
                ) : null}
                <Text style={styles.auditTimestamp}>
                  {formatTimestamp(entry.timestamp || entry.created_at)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.auditEmpty}>
            <FileText size={28} color="#CBD5E1" />
            <Text style={styles.auditEmptyText}>No audit log entries found</Text>
          </View>
        )}
      </AppCard>

      {/* Data Erasure */}
      <AppCard style={[styles.sectionCard, styles.erasureCard]}>
        <Text style={[styles.sectionTitle, { color: "#EF4444" }]}>Data Erasure</Text>
        <Text style={styles.erasureDescription}>
          Request permanent deletion of all your personal data. This action is irreversible and
          complies with data protection regulations.
        </Text>
        <TouchableOpacity
          style={styles.erasureBtn}
          activeOpacity={0.85}
          onPress={handleRequestErasure}
          disabled={erasureLoading}
        >
          {erasureLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <AlertTriangle size={18} color="#FFFFFF" />
              <Text style={styles.erasureBtnText}>Request Data Erasure</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.erasureHelperText}>
          Once submitted, your request will be processed within 30 days. You will receive a
          confirmation email when the erasure is complete.
        </Text>
      </AppCard>

      {/* Danger Zone */}
      <AppCard style={[styles.sectionCard, styles.dangerCard]}>
        <Text style={[styles.sectionTitle, { color: "#EF4444" }]}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.85}
          onPress={handleDeleteAccount}
        >
          <Trash2 size={18} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete My Account</Text>
        </TouchableOpacity>
        <Text style={styles.dangerHelperText}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </Text>
      </AppCard>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  sectionCard: { gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginBottom: 4 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#334155" },
  toggleDesc: { fontSize: 12, color: "#94A3B8", lineHeight: 16 },

  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 13,
    borderRadius: 12,
  },
  exportBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  helperText: { fontSize: 12, color: "#94A3B8", lineHeight: 17, textAlign: "center" },

  dangerCard: { borderColor: "#FEE2E2" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteBtnText: { color: "#EF4444", fontSize: 14, fontWeight: "800" },
  dangerHelperText: { fontSize: 12, color: "#EF4444", lineHeight: 17, textAlign: "center", opacity: 0.7 },

  // Audit Log
  auditHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  refreshLink: { fontSize: 13, fontWeight: "700", color: PRIMARY_COLOR },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#334155", padding: 0 },
  auditRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  auditRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  auditIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  auditInfo: { flex: 1, gap: 2 },
  auditAction: { fontSize: 13, fontWeight: "700", color: "#334155" },
  auditDetails: { fontSize: 12, color: "#64748B", lineHeight: 16 },
  auditTimestamp: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  auditEmpty: { alignItems: "center", paddingVertical: 20, gap: 8 },
  auditEmptyText: { fontSize: 13, color: "#94A3B8" },

  // Data Erasure
  erasureCard: { borderColor: "#FEE2E2" },
  erasureDescription: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  erasureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    paddingVertical: 13,
    borderRadius: 12,
  },
  erasureBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  erasureHelperText: {
    fontSize: 12,
    color: "#EF4444",
    lineHeight: 17,
    textAlign: "center",
    opacity: 0.7,
  },

  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  savingText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
});
