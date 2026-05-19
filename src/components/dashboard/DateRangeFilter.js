import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import CalendarPicker from "../ui/CalendarPicker";

// === Web parity — exact same preset keys + labels as frontend's date-range-filter.jsx
export const DATE_PRESETS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "last30", label: "Last 30 Days" },
  { key: "custom", label: "Custom Range" },
];

// Compute start/end ISO date strings from preset key (exact frontend logic)
export function getDatePreset(key) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const shift = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  };
  const startOfWeek = () => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay()); // Sunday = 0 (matches frontend)
    return d;
  };
  const startOfMonth = () => new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = () => new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = () => new Date(today.getFullYear(), today.getMonth(), 0);

  switch (key) {
    case "today":      return { start_date: fmt(today), end_date: fmt(today) };
    case "yesterday":  return { start_date: fmt(shift(-1)), end_date: fmt(shift(-1)) };
    case "last7":      return { start_date: fmt(shift(-6)), end_date: fmt(today) };
    case "thisWeek":   return { start_date: fmt(startOfWeek()), end_date: fmt(today) };
    case "thisMonth":  return { start_date: fmt(startOfMonth()), end_date: fmt(today) };
    case "lastMonth":  return { start_date: fmt(startOfLastMonth()), end_date: fmt(endOfLastMonth()) };
    case "last30":     return { start_date: fmt(shift(-29)), end_date: fmt(today) };
    default:           return { start_date: null, end_date: null };
  }
}

export function formatDateLabel(iso) {
  if (!iso) return "";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Web-parity DateRangeFilter.
 * value: { preset, start_date?, end_date? }
 * onChange: ({ preset, start_date, end_date }) => void
 */
export default function DateRangeFilter({ value, onChange }) {
  const preset = value?.preset || "all";
  const [customStart, setCustomStart] = useState(value?.start_date || "");
  const [customEnd, setCustomEnd] = useState(value?.end_date || "");

  // Keep local state in sync when value changes externally
  useEffect(() => {
    if (value?.preset === "custom") {
      setCustomStart(value?.start_date || "");
      setCustomEnd(value?.end_date || "");
    }
  }, [value?.preset, value?.start_date, value?.end_date]);

  const handlePresetChange = (key) => {
    if (key === "custom") {
      onChange?.({
        preset: "custom",
        start_date: customStart || undefined,
        end_date: customEnd || undefined,
      });
    } else if (key === "all") {
      onChange?.({ preset: "all" });
    } else {
      const range = getDatePreset(key);
      onChange?.({ preset: key, start_date: range.start_date, end_date: range.end_date });
    }
  };

  const handleCustomApply = () => {
    if (customStart || customEnd) {
      onChange?.({
        preset: "custom",
        start_date: customStart || undefined,
        end_date: customEnd || undefined,
      });
    }
  };

  // Active range badge top-right (mirrors web)
  const activeLabel = (() => {
    if (preset === "all") return null;
    if (preset === "custom") {
      const s = value?.start_date ? formatDateLabel(value.start_date) : "...";
      const e = value?.end_date ? formatDateLabel(value.end_date) : "...";
      return `${s} – ${e}`;
    }
    return DATE_PRESETS.find((p) => p.key === preset)?.label;
  })();

  return (
    <View style={styles.wrap}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <CalendarDays size={12} color="#6B7280" strokeWidth={2.2} />
        <Text style={styles.label}>Date Range</Text>
        {activeLabel ? (
          <Text style={styles.activeBadge} numberOfLines={1}>
            {activeLabel}
          </Text>
        ) : null}
      </View>

      {/* Preset chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {DATE_PRESETS.map((p) => {
          const active = preset === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => handlePresetChange(p.key)}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  active ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Custom Range pickers — inline, shown only when preset === "custom" */}
      {preset === "custom" ? (
        <View style={styles.customWrap}>
          <View style={styles.customRow}>
            <View style={styles.customField}>
              <CalendarPicker
                label="Start Date"
                value={customStart}
                onChange={setCustomStart}
                minDate=""
              />
            </View>
            <View style={styles.customField}>
              <CalendarPicker
                label="End Date"
                value={customEnd}
                onChange={setCustomEnd}
                minDate={customStart || ""}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.applyBtn,
              !customStart && !customEnd ? styles.applyBtnDisabled : null,
            ]}
            disabled={!customStart && !customEnd}
            onPress={handleCustomApply}
            activeOpacity={0.85}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  activeBadge: {
    marginLeft: "auto",
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    maxWidth: 220,
  },
  row: {
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  chipText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  chipTextActive: { color: "#FFFFFF" },
  chipTextInactive: { color: "#6B7280" },

  customWrap: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  customRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  customField: { flex: 1 },
  applyBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
