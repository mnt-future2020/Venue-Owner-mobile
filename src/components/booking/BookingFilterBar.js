import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Search, ArrowUpDown, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const DATE_OPTS = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This Week" },
];

const STATUS_OPTS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTS = [
  { value: "all", label: "All" },
  { value: "online", label: "Online" },
  { value: "walk_in", label: "Walk-in" },
];

/**
 * Filter bar for bookings list.
 *
 * Props:
 *   status, onStatus,
 *   dateFilter, onDateFilter,
 *   bookingType, onBookingType,
 *   sortOrder, onSortOrder,
 *   searchQuery, onSearch   (parent should debounce/handle)
 *
 * Search input here debounces locally at 300ms before calling onSearch.
 */
export default function BookingFilterBar({
  status,
  onStatus,
  dateFilter,
  onDateFilter,
  bookingType,
  onBookingType,
  sortOrder,
  onSortOrder,
  searchQuery,
  onSearch,
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery || "");

  // keep local in sync if parent resets
  useEffect(() => {
    setLocalQuery(searchQuery || "");
  }, [searchQuery]);

  // debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearch?.(localQuery);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  return (
    <View style={styles.wrap}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            value={localQuery}
            onChangeText={setLocalQuery}
            placeholder="Search name, phone, booking ID"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {localQuery ? (
            <TouchableOpacity
              onPress={() => setLocalQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => onSortOrder?.(sortOrder === "asc" ? "desc" : "asc")}
          activeOpacity={0.75}
        >
          <ArrowUpDown size={14} color="#0F172A" />
          <Text style={styles.sortBtnText}>
            {sortOrder === "asc" ? "Oldest" : "Newest"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date chips */}
      <ChipGroup label="Date" value={dateFilter} options={DATE_OPTS} onChange={onDateFilter} />

      {/* Status chips */}
      <ChipGroup label="Status" value={status} options={STATUS_OPTS} onChange={onStatus} />

      {/* Type chips */}
      <ChipGroup label="Type" value={bookingType} options={TYPE_OPTS} onChange={onBookingType} />
    </View>
  );
}

function ChipGroup({ label, value, options, onChange }) {
  return (
    <View style={styles.chipGroup}>
      <Text style={styles.chipGroupLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {options.map((opt) => {
          const active = (value || "all") === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange?.(opt.value)}
              activeOpacity={0.75}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 24,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 0,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  chipGroup: {
    marginBottom: 8,
  },
  chipGroupLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingRight: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
