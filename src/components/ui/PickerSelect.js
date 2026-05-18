import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronDown, Search, X, Check } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

/**
 * Reusable dropdown-style picker for React Native.
 *
 * Props:
 *  - label: string (field label above the picker)
 *  - placeholder: string
 *  - value: string (currently selected value)
 *  - options: Array<{ key: string, label: string }> OR Array<string>
 *  - onSelect: (key: string, label: string) => void
 *  - searchable: boolean (show search bar in modal)
 *  - required: boolean (show * after label)
 *  - disabled: boolean
 */
export default function PickerSelect({
  label,
  placeholder = "Select",
  value,
  options = [],
  onSelect,
  searchable = false,
  required = false,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const normalized = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === "string" ? { key: opt, label: opt } : opt
      ),
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

  return (
    <>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => setVisible(true)}
      >
        <Text
          style={[styles.triggerText, !selectedLabel && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={16} color="#94A3B8" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || "Select"}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchWrap}>
                <Search size={16} color="#94A3B8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  autoFocus
                />
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const selected = item.key === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect?.(item.key, item.label);
                      setVisible(false);
                      setSearch("");
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selected && <Check size={18} color={PRIMARY_COLOR} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No options found</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
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
    paddingVertical: 14,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  triggerPlaceholder: {
    color: "#94A3B8",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  list: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: "#ECFDF5",
  },
  optionText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    paddingVertical: 24,
  },
});
