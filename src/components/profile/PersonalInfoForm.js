import { StyleSheet, Text, TextInput, View } from "react-native";
import { FONTS, PRIMARY_COLOR } from "../../constants/theme";

// Mirrors frontend/src/components/profile/PersonalInfoForm.js — venue_owner branch.
// Display mode: InfoRow list. Edit mode: form with name / email / phone (read-only)
// / bio / business_name / gst_number.
export default function PersonalInfoForm({ user, form, setForm, editing }) {
  if (!editing) return <Display user={user} />;

  return (
    <View style={styles.formCol}>
      <Field
        label="Name"
        value={form.name}
        onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
        autoComplete="name"
      />
      <Field
        label="Email"
        value={form.email}
        onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <View>
        <Text style={styles.label}>Phone</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+91</Text>
          </View>
          <TextInput
            value={form.phone}
            editable={false}
            placeholder="98765 43210"
            placeholderTextColor="#9CA3AF"
            style={styles.phoneInput}
          />
        </View>
      </View>
      <Field
        label="Bio"
        value={form.bio}
        onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
        placeholder="Tell Lobbians about yourself…"
        multiline
        rows={3}
      />
      <Field
        label="Business Name"
        value={form.business_name}
        onChangeText={(v) => setForm((p) => ({ ...p, business_name: v }))}
        placeholder="Your business name"
        autoComplete="organization"
      />
      <Field
        label="GST Number"
        value={form.gst_number}
        onChangeText={(v) => setForm((p) => ({ ...p, gst_number: v }))}
        placeholder="22AAAAA0000A1Z5"
        autoCapitalize="characters"
      />
    </View>
  );
}

function Field({ label, multiline, rows = 1, ...inputProps }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 24 * rows + 24, textAlignVertical: "top", paddingTop: 12 }]}
        placeholderTextColor="#9CA3AF"
        multiline={!!multiline}
        numberOfLines={multiline ? rows : 1}
        {...inputProps}
      />
    </View>
  );
}

function Display({ user }) {
  const hasBio = !!user?.bio;
  const hasSports = Array.isArray(user?.sports) && user.sports.length > 0;
  return (
    <View>
      <InfoRow label="Name" value={user?.name || "—"} />
      <InfoRow label="Email" value={user?.email || "—"} />
      <InfoRow label="Phone" value={user?.phone ? `+91 ${user.phone}` : "Not set"} />
      {hasBio ? (
        <View style={styles.blockRow}>
          <Text style={styles.blockLabel}>Bio</Text>
          <Text style={styles.blockValue}>{user.bio}</Text>
        </View>
      ) : null}
      {hasSports ? (
        <View style={styles.blockRow}>
          <Text style={styles.blockLabel}>Sports</Text>
          <View style={styles.chipsRow}>
            {user.sports.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{String(s).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {user?.business_name ? <InfoRow label="Business Name" value={user.business_name} /> : null}
      {user?.gst_number ? <InfoRow label="GST Number" value={user.gst_number} isLast /> : null}
    </View>
  );
}

function InfoRow({ label, value, isLast }) {
  return (
    <View style={[styles.row, isLast && styles.rowNoBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  formCol: { gap: 14 },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
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
  phoneRow: { flexDirection: "row" },
  phonePrefix: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  phonePrefixText: { fontSize: 14, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#6B7280" },
  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#9CA3AF",
    fontFamily: FONTS.bodyMedium,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  rowNoBorder: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, fontFamily: FONTS.bodyMedium, fontWeight: "500", color: "#6B7280" },
  rowValue: { fontSize: 13, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#111827", flex: 1, textAlign: "right" },
  blockRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  blockLabel: { fontSize: 13, fontFamily: FONTS.bodyMedium, fontWeight: "500", color: "#6B7280", marginBottom: 6 },
  blockValue: { fontSize: 13, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#111827", lineHeight: 20 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  chipText: { fontSize: 10, fontFamily: FONTS.bodyExtraBold, fontWeight: "900", color: PRIMARY_COLOR, letterSpacing: 0.8 },
});
