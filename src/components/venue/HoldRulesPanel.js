import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Plus, Edit, Trash2, Lock, Clock } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import venueService from "../../services/venueService";
import toast from "../../utils/toast";
import HoldRuleForm from "./HoldRuleForm";

const DAYS = [
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
];

const SCHEDULE_LABEL = { weekly: "Weekly", one_time: "One-time" };

function pad2(n) {
  return String(n).padStart(2, "0");
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

export default function HoldRulesPanel({ venue }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const turfOptions = useMemo(() => {
    const list = [];
    const cfg = venue?.turf_config;
    if (Array.isArray(cfg)) {
      let idx = 1;
      for (const tc of cfg) {
        for (const t of tc.turfs || []) {
          list.push({
            number: idx,
            name: t.name || `Turf ${idx}`,
            sport: tc.sport,
          });
          idx++;
        }
      }
    }
    return list;
  }, [venue]);

  const load = async () => {
    if (!venue?.id) return;
    setLoading(true);
    try {
      const res = await venueService.getHoldRules(venue.id);
      setRules(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error("Load failed", err?.response?.data?.detail || "Try again");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [venue?.id]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (rule) => {
    setEditing({
      id: rule.id,
      name: rule.name || "",
      label: rule.label || "",
      turf_numbers: rule.turf_numbers || [],
      schedule_type: rule.schedule_type || "weekly",
      is_active: rule.is_active !== false,
      days_of_week: rule.days_of_week || [],
      date_from: rule.date_from || "",
      date_to: rule.date_to || "",
      time_from: rule.time_from || "18:00",
      time_to: rule.time_to || "20:00",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (data, validate) => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...data };
      delete payload.id;
      if (editing?.id) {
        await venueService.updateHoldRule(editing.id, payload);
        toast.success("Updated", "Hold rule saved.");
      } else {
        await venueService.createHoldRule(venue.id, payload);
        toast.success("Created", "Hold rule added.");
      }
      setFormOpen(false);
      load();
    } catch (e) {
      toast.error(
        "Save failed",
        e?.response?.data?.detail || "Try again"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule) => {
    try {
      await venueService.toggleHoldRule(rule.id);
      load();
    } catch {
      toast.error("Toggle failed", "Try again.");
    }
  };

  const confirmDelete = (rule) => {
    Alert.alert(
      "Delete hold rule?",
      `This will permanently delete "${rule.name}". This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await venueService.deleteHoldRule(rule.id);
              toast.success("Deleted", "Hold rule removed.");
              load();
            } catch (e) {
              toast.error(
                "Delete failed",
                e?.response?.data?.detail || "Try again"
              );
            }
          },
        },
      ]
    );
  };

  const formatScheduleSummary = (r) => {
    const range = `${fmt12h(r.time_from)} – ${fmt12h(r.time_to)}`;
    if (r.schedule_type === "weekly") {
      const days = (r.days_of_week || [])
        .map((d) => DAYS.find((x) => x.key === d)?.label)
        .filter(Boolean)
        .join(", ");
      return `${days || "No days"} · ${range}`;
    }
    if (r.schedule_type === "one_time") {
      return `${r.date_from} → ${r.date_to} · ${range}`;
    }
    return range;
  };

  const formatTurfs = (r) => {
    if (!r.turf_numbers || r.turf_numbers.length === 0) return "All turfs";
    return r.turf_numbers
      .map((n) => turfOptions.find((t) => t.number === n)?.name || `Turf ${n}`)
      .join(", ");
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.title}>Hold Rules</Text>
          <Text style={styles.subtitle}>
            Reserve slots for schools, academies, or recurring bookings.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Create Rule</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PRIMARY_COLOR} />
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Lock size={20} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.emptyTitle}>No hold rules yet</Text>
          <Text style={styles.emptySub}>
            Create one to reserve recurring slots.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {rules.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  {r.label ? (
                    <View style={styles.labelPill}>
                      <Text style={styles.labelPillText}>{r.label}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.scheduleType}>
                    {SCHEDULE_LABEL[r.schedule_type] || r.schedule_type}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Clock size={11} color="#9CA3AF" />
                  <Text style={styles.metaText}>
                    {formatScheduleSummary(r)}
                  </Text>
                </View>
                <Text style={styles.turfText}>{formatTurfs(r)}</Text>
              </View>

              <View style={styles.actions}>
                <Switch
                  value={r.is_active !== false}
                  onValueChange={() => toggle(r)}
                  trackColor={{ false: "#E5E7EB", true: `${PRIMARY_COLOR}80` }}
                  thumbColor={r.is_active !== false ? PRIMARY_COLOR : "#F9FAFB"}
                />
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(r)}
                  activeOpacity={0.7}
                >
                  <Edit size={14} color="#6B7280" strokeWidth={2.2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: "#FEF2F2" }]}
                  onPress={() => confirmDelete(r)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color="#EF4444" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <HoldRuleForm
        visible={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        saving={saving}
        turfOptions={turfOptions}
        title={editing?.id ? "Edit Hold Rule" : "New Hold Rule"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 14, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  loading: { alignItems: "center", paddingVertical: 30 },
  empty: {
    alignItems: "center",
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  emptySub: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  cardName: { fontSize: 13, fontWeight: "900", color: "#111827" },
  labelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  labelPillText: { fontSize: 9, color: "#92400E", fontWeight: "800" },
  scheduleType: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  metaText: { fontSize: 11, color: "#6B7280" },
  turfText: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
