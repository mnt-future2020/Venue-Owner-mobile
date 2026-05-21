import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Shield,
  ShieldCheck,
} from "lucide-react-native";
import { FONTS, PRIMARY_COLOR } from "../../constants/theme";
import authService from "../../services/authService";
import toast from "../../utils/toast";

// Mirrors frontend/src/components/profile/PasswordChangeSection.js
// (strength meter, 4 rules, eye toggles, mismatch warning, Update Password CTA).

const DEFAULT_PW_FORM = { current: "", new_pw: "", confirm: "" };

function getStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "#94A3B8" };
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

export default function PasswordChangeSection() {
  const [pwForm, setPwForm] = useState(DEFAULT_PW_FORM);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const strength = useMemo(() => getStrength(pwForm.new_pw), [pwForm.new_pw]);
  const match = pwForm.new_pw && pwForm.confirm && pwForm.new_pw === pwForm.confirm;
  const mismatch = pwForm.confirm.length > 0 && pwForm.new_pw !== pwForm.confirm;

  const canSubmit = !!pwForm.current && !!pwForm.new_pw && !!pwForm.confirm && !mismatch && !saving;

  const onSubmit = async () => {
    if (!canSubmit) return;
    if (pwForm.new_pw !== pwForm.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(pwForm.current, pwForm.new_pw);
      toast.success("Password changed!");
      setPwForm(DEFAULT_PW_FORM);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <ShieldCheck size={18} color={PRIMARY_COLOR} strokeWidth={2.3} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Account Security</Text>
          <Text style={styles.headerSub}>Update your password</Text>
        </View>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        {/* Current */}
        <PasswordField
          label="Current Password"
          value={pwForm.current}
          onChangeText={(v) => setPwForm((p) => ({ ...p, current: v }))}
          placeholder="Enter current password"
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
        />

        {/* New */}
        <PasswordField
          label="New Password"
          value={pwForm.new_pw}
          onChangeText={(v) => setPwForm((p) => ({ ...p, new_pw: v }))}
          placeholder="Create a strong password"
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
        />

        {/* Strength meter + rules */}
        {pwForm.new_pw ? (
          <View style={styles.strengthBlock}>
            <View style={styles.barRow}>
              <View style={styles.bars}>
                {[1, 2, 3, 4].map((lvl) => (
                  <View
                    key={lvl}
                    style={[
                      styles.bar,
                      { backgroundColor: lvl <= strength.score ? strength.color : "#E5E7EB" },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
            <View style={styles.rulesRow}>
              {PW_RULES.map((r) => {
                const ok = r.test(pwForm.new_pw);
                return (
                  <View key={r.label} style={styles.rule}>
                    <CheckCircle2 size={12} color={ok ? "#10B981" : "#CBD5E1"} />
                    <Text style={[styles.ruleText, { color: ok ? "#059669" : "#94A3B8" }]}>
                      {r.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Confirm */}
        <View>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            value={pwForm.confirm}
            onChangeText={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
            placeholder="Re-enter new password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showNew}
            style={[
              styles.input,
              mismatch && { borderColor: "#FCA5A5" },
              match && { borderColor: "#86EFAC" },
            ]}
          />
          {mismatch ? (
            <View style={styles.hintRow}>
              <AlertTriangle size={12} color="#EF4444" />
              <Text style={[styles.hint, { color: "#EF4444" }]}>Passwords don't match</Text>
            </View>
          ) : null}
          {match ? (
            <View style={styles.hintRow}>
              <CheckCircle2 size={12} color="#10B981" />
              <Text style={[styles.hint, { color: "#10B981" }]}>Passwords match</Text>
            </View>
          ) : null}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
        >
          {saving ? (
            <View style={styles.submitInner}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitText}>Updating…</Text>
            </View>
          ) : (
            <View style={styles.submitInner}>
              <Shield size={16} color="#FFFFFF" strokeWidth={2.3} />
              <Text style={styles.submitText}>Update Password</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tip */}
      <View style={styles.tip}>
        <Lock size={12} color="#D97706" />
        <Text style={styles.tipText}>Use a unique password you don't use on other sites.</Text>
      </View>
    </View>
  );
}

function PasswordField({ label, value, onChangeText, placeholder, show, onToggle }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!show}
          style={[styles.input, { paddingRight: 48 }]}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn} hitSlop={10}>
          {show ? <EyeOff size={18} color="#6B7280" /> : <Eye size={18} color="#6B7280" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 11, color: "#94A3B8", fontFamily: FONTS.body, marginTop: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    padding: 18,
    gap: 14,
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  inputWrap: { position: "relative" },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    fontFamily: FONTS.bodyMedium,
  },
  eyeBtn: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  strengthBlock: { gap: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bars: { flex: 1, flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 9999 },
  strengthLabel: { fontSize: 11, fontFamily: FONTS.bodyBold, fontWeight: "700" },
  rulesRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  rule: { flexDirection: "row", alignItems: "center", gap: 4 },
  ruleText: { fontSize: 11, fontFamily: FONTS.bodyMedium },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  hint: { fontSize: 11, fontFamily: FONTS.bodyMedium },
  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { fontSize: 14, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#FFFFFF" },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipText: { fontSize: 11, color: "#6B7280", fontFamily: FONTS.body, lineHeight: 16, flex: 1 },
});
