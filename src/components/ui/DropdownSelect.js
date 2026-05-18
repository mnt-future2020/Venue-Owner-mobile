import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronDown, Check, Search, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function DropdownSelect({
  label,
  placeholder = "Select",
  value,
  options = [],
  onSelect,
  searchable = false,
  required = false,
  disabled = false,
  maxHeight = 220,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [open]);

  const dropdownHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });

  const dropdownOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
  });

  const chevronRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const normalized = useMemo(
    () => options.map((o) => (typeof o === "string" ? { key: o, label: o } : o)),
    [options]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return normalized;
    const q = search.trim().toLowerCase();
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, search]);

  const selectedLabel = useMemo(() => {
    const found = normalized.find((o) => o.key === value);
    return found ? found.label : "";
  }, [normalized, value]);

  const handleSelect = useCallback(
    (item) => {
      onSelect?.(item.key, item.label);
      setOpen(false);
      setSearch("");
    },
    [onSelect]
  );

  const toggle = useCallback(() => {
    setOpen((p) => !p);
  }, []);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}

      {/* Trigger */}
      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerOpen, disabled && styles.triggerDisabled]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={toggle}
      >
        <Text
          style={[styles.triggerText, !selectedLabel && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <ChevronDown size={16} color={open ? PRIMARY_COLOR : "#94A3B8"} />
        </Animated.View>
      </TouchableOpacity>

      {/* Animated Dropdown */}
      <Animated.View
        style={[
          styles.dropdown,
          {
            maxHeight: dropdownHeight,
            opacity: dropdownOpacity,
            overflow: "hidden",
          },
        ]}
      >
        {searchable && (
          <View style={styles.searchWrap}>
            <Search size={14} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <X size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No options found</Text>
          ) : (
            filtered.map((item) => {
              const selected = item.key === value;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.option, selected && styles.optionSelected]}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[styles.optionText, selected && styles.optionTextSelected]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {selected && <Check size={16} color={PRIMARY_COLOR} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 10 },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerOpen: {
    borderColor: PRIMARY_COLOR,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { flex: 1, fontSize: 14, color: "#0F172A", fontWeight: "500" },
  triggerPlaceholder: { color: "#94A3B8" },

  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#E2E8F0",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    margin: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: "#0F172A" },

  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  optionSelected: { backgroundColor: "#F0FDF4" },
  optionText: { flex: 1, fontSize: 14, color: "#334155", fontWeight: "500" },
  optionTextSelected: { color: PRIMARY_COLOR, fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#94A3B8", fontSize: 13, paddingVertical: 20 },
});
