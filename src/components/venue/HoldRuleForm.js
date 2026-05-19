import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Platform,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { X, Clock } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const DAYS = [
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
];

const SCHEDULE_TYPES = [
  { key: "weekly", label: "Weekly" },
  { key: "one_time", label: "One-time" },
];

const emptyForm = {
  name: "",
  label: "",
  turf_numbers: [],
  schedule_type: "weekly",
  is_active: true,
  days_of_week: [],
  date_from: "",
  date_to: "",
  time_from: "18:00",
  time_to: "20:00",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmt12h(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return "";
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad2(m)} ${period}`;
}

function parseTime(hhmm) {
  if (!hhmm) return new Date(new Date().setHours(18, 0, 0, 0));
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function parseDate(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return new Date();
  const [y, m, d] = yyyy_mm_dd.split("-").map((s) => parseInt(s, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export default function HoldRuleForm({
  visible,
  initial,
  onClose,
  onSubmit,
  saving = false,
  turfOptions = [],
  title = "New Hold Rule",
}) {
  const [form, setForm] = useState(emptyForm);
  const [activePicker, setActivePicker] = useState(null);
  // activePicker: "time_from" | "time_to" | "date_from" | "date_to" | null

  useEffect(() => {
    if (visible) {
      setForm({ ...emptyForm, ...(initial || {}) });
      setActivePicker(null);
    }
  }, [visible, initial]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleDay = (day) =>
    setForm((p) => ({
      ...p,
      days_of_week: p.days_of_week.includes(day)
        ? p.days_of_week.filter((d) => d !== day)
        : [...p.days_of_week, day],
    }));

  const toggleTurf = (num) =>
    setForm((p) => ({
      ...p,
      turf_numbers: p.turf_numbers.includes(num)
        ? p.turf_numbers.filter((n) => n !== num)
        : [...p.turf_numbers, num],
    }));

  const validate = () => {
    if (!form.name.trim()) return "Rule name is required";
    if (form.schedule_type === "weekly" && form.days_of_week.length === 0)
      return "Select at least one day";
    if (
      form.schedule_type === "one_time" &&
      (!form.date_from || !form.date_to)
    )
      return "Start and end dates required";
    if (!form.time_from || !form.time_to) return "Time range required";
    return null;
  };

  const submit = () => {
    onSubmit?.(form, validate);
  };

  const onTimeChange = (which) => (event, selected) => {
    if (Platform.OS !== "ios") setActivePicker(null);
    if (!selected) return;
    const hhmm = `${pad2(selected.getHours())}:${pad2(selected.getMinutes())}`;
    setField(which, hhmm);
  };

  const onDateChange = (which) => (event, selected) => {
    if (Platform.OS !== "ios") setActivePicker(null);
    if (!selected) return;
    setField(which, isoDate(selected));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                Reserve slots to prevent public booking
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Rule Name *</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setField("name", v)}
                placeholder="e.g. School Academy Cricket"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            {/* Label */}
            <View style={styles.field}>
              <Text style={styles.label}>Label (optional)</Text>
              <TextInput
                value={form.label}
                onChangeText={(v) => setField("label", v)}
                placeholder="Short tag shown on slot card"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            {/* Turfs */}
            <View style={styles.field}>
              <Text style={styles.label}>Turfs (empty = all)</Text>
              <View style={styles.chipRow}>
                {turfOptions.map((t) => {
                  const on = form.turf_numbers.includes(t.number);
                  return (
                    <TouchableOpacity
                      key={t.number}
                      onPress={() => toggleTurf(t.number)}
                      style={[
                        styles.turfChip,
                        on ? styles.turfChipOn : styles.turfChipOff,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.turfChipText,
                          on
                            ? styles.turfChipTextOn
                            : styles.turfChipTextOff,
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {turfOptions.length === 0 ? (
                  <Text style={styles.emptySmall}>
                    No turfs configured yet.
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Schedule type */}
            <View style={styles.field}>
              <Text style={styles.label}>Schedule Type</Text>
              <View style={styles.segment}>
                {SCHEDULE_TYPES.map((s) => {
                  const on = form.schedule_type === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setField("schedule_type", s.key)}
                      style={[
                        styles.segmentBtn,
                        on && styles.segmentBtnOn,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          on
                            ? styles.segmentTextOn
                            : styles.segmentTextOff,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {form.schedule_type === "weekly" ? (
              <View style={styles.field}>
                <Text style={styles.label}>Days of Week</Text>
                <View style={styles.daysRow}>
                  {DAYS.map((d) => {
                    const on = form.days_of_week.includes(d.key);
                    return (
                      <TouchableOpacity
                        key={d.key}
                        onPress={() => toggleDay(d.key)}
                        style={[
                          styles.dayBtn,
                          on ? styles.dayBtnOn : styles.dayBtnOff,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayBtnText,
                            on ? styles.dayBtnTextOn : styles.dayBtnTextOff,
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {form.schedule_type === "one_time" ? (
              <View style={styles.fieldRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Date From</Text>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setActivePicker("date_from")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerBtnText}>
                      {form.date_from || "Pick a date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Date To</Text>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setActivePicker("date_to")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerBtnText}>
                      {form.date_to || "Pick a date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Time From</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setActivePicker("time_from")}
                  activeOpacity={0.7}
                >
                  <Clock size={13} color={PRIMARY_COLOR} strokeWidth={2.2} />
                  <Text style={styles.pickerBtnText}>
                    {fmt12h(form.time_from) || "Pick"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Time To</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setActivePicker("time_to")}
                  activeOpacity={0.7}
                >
                  <Clock size={13} color={PRIMARY_COLOR} strokeWidth={2.2} />
                  <Text style={styles.pickerBtnText}>
                    {fmt12h(form.time_to) || "Pick"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Active */}
            <View style={styles.activeRow}>
              <View>
                <Text style={styles.activeLabel}>Active</Text>
                <Text style={styles.activeSub}>
                  Inactive rules don't hold slots
                </Text>
              </View>
              <Switch
                value={form.is_active}
                onValueChange={(v) => setField("is_active", v)}
                trackColor={{ false: "#E5E7EB", true: `${PRIMARY_COLOR}80` }}
                thumbColor={form.is_active ? PRIMARY_COLOR : "#F9FAFB"}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={submit}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving…" : initial?.id ? "Update" : "Create"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Native pickers */}
          {activePicker === "time_from" ? (
            <DateTimePicker
              value={parseTime(form.time_from)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onTimeChange("time_from")}
            />
          ) : null}
          {activePicker === "time_to" ? (
            <DateTimePicker
              value={parseTime(form.time_to)}
              mode="time"
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onTimeChange("time_to")}
            />
          ) : null}
          {activePicker === "date_from" ? (
            <DateTimePicker
              value={parseDate(form.date_from)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange("date_from")}
            />
          ) : null}
          {activePicker === "date_to" ? (
            <DateTimePicker
              value={parseDate(form.date_to)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange("date_to")}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)" },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  body: { padding: 18, paddingBottom: 4, gap: 14 },
  field: { gap: 6 },
  fieldRow: { flexDirection: "row", gap: 10 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  input: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  turfChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  turfChipOn: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  turfChipOff: {
    backgroundColor: "#F9FAFB",
    borderColor: "rgba(229, 231, 235, 0.9)",
  },
  turfChipText: { fontSize: 11, fontWeight: "700" },
  turfChipTextOn: { color: "#FFFFFF" },
  turfChipTextOff: { color: "#374151" },
  emptySmall: { fontSize: 11, color: "#9CA3AF" },

  segment: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  segmentBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  segmentBtnOn: { backgroundColor: "#FFFFFF", shadowOpacity: 0.06 },
  segmentText: { fontSize: 11, fontWeight: "800" },
  segmentTextOn: { color: "#111827" },
  segmentTextOff: { color: "#9CA3AF" },

  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnOn: { backgroundColor: PRIMARY_COLOR },
  dayBtnOff: { backgroundColor: "#F3F4F6" },
  dayBtnText: { fontSize: 11, fontWeight: "800" },
  dayBtnTextOn: { color: "#FFFFFF" },
  dayBtnTextOff: { color: "#374151" },

  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  pickerBtnText: { fontSize: 13, fontWeight: "700", color: "#111827" },

  activeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  activeLabel: { fontSize: 13, fontWeight: "800", color: "#111827" },
  activeSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
