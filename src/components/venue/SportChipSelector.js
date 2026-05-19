import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Plus, X, Check, ChevronDown } from "lucide-react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PRIMARY_COLOR } from "../../constants/theme";
import {
  SPORT_SUGGESTIONS,
  getSportLabel,
  getSportIconName,
} from "../../constants/venueConstants";

// Mirrors frontend SportChipSelector.js — vertical chip with icon on top
// then label, plus check badge in top-right when selected.
export default function SportChipSelector({ selected = [], onChange }) {
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const normalizedSelected = selected.map((s) => String(s).toLowerCase());

  const toggleSport = (sport) => {
    const key = sport.toLowerCase();
    if (normalizedSelected.includes(key)) {
      onChange(selected.filter((s) => s.toLowerCase() !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const addCustomSport = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!normalizedSelected.includes(key)) {
      onChange([...selected, key]);
    }
    setCustomInput("");
  };

  const customSports = selected.filter(
    (s) =>
      !SPORT_SUGGESTIONS.some((sug) => sug.toLowerCase() === s.toLowerCase())
  );

  return (
    <View style={styles.wrapper}>
      {/* Predefined Sport Grid — 2 columns on mobile */}
      <View style={styles.grid}>
        {SPORT_SUGGESTIONS.map((sport) => {
          const key = sport.toLowerCase();
          const isSelected = normalizedSelected.includes(key);
          const iconName = getSportIconName(key);
          return (
            <TouchableOpacity
              key={sport}
              onPress={() => toggleSport(sport)}
              activeOpacity={0.85}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
              ]}
            >
              {isSelected ? (
                <View style={styles.checkBadge}>
                  <Check size={13} color={PRIMARY_COLOR} strokeWidth={3} />
                </View>
              ) : null}
              <MaterialCommunityIcons
                name={iconName}
                size={20}
                color={isSelected ? PRIMARY_COLOR : "#6B7280"}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
                numberOfLines={1}
              >
                {sport}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom sports pills */}
      {customSports.length > 0 ? (
        <View style={styles.customRow}>
          {customSports.map((s) => (
            <View key={s} style={styles.customChip}>
              <Text style={styles.customChipText}>{getSportLabel(s)}</Text>
              <TouchableOpacity
                onPress={() => onChange(selected.filter((x) => x !== s))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={12} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {/* Add custom toggle */}
      <TouchableOpacity
        onPress={() => setShowCustom((p) => !p)}
        style={styles.addCustomToggle}
        activeOpacity={0.7}
      >
        <Plus size={13} color="#6B7280" strokeWidth={2.5} />
        <Text style={styles.addCustomText}>Add custom sport</Text>
        <ChevronDown
          size={12}
          color="#6B7280"
          style={[showCustom && styles.chevronRotated]}
        />
      </TouchableOpacity>

      {showCustom ? (
        <View style={styles.customInputRow}>
          <TextInput
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="Type a sport name..."
            placeholderTextColor="#9CA3AF"
            style={styles.customInput}
            onSubmitEditing={addCustomSport}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={addCustomSport}
            disabled={!customInput.trim()}
            style={[
              styles.addBtn,
              !customInput.trim() && styles.addBtnDisabled,
            ]}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  // 3-column grid on mobile (matches frontend sm:grid-cols-3 density)
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: "31.5%",
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    position: "relative",
  },
  chipSelected: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    borderColor: PRIMARY_COLOR,
  },
  chipUnselected: {
    backgroundColor: "#F3F4F6",
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: PRIMARY_COLOR },
  chipTextUnselected: { color: "#6B7280" },
  checkBadge: { position: "absolute", top: 6, right: 6 },
  customRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 6,
  },
  customChipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  addCustomToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
  },
  addCustomText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  chevronRotated: { transform: [{ rotate: "180deg" }] },
  customInputRow: { flexDirection: "row", gap: 8 },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  addBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
