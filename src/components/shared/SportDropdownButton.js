import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ChevronRight } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import { getSportIcon, getSportLabel } from "./SportPicker";

/**
 * Reusable Sport Dropdown Button Component
 * 
 * @param {string} selectedSport - Currently selected sport key
 * @param {function} onPress - Callback when button is pressed
 * @param {object} style - Additional styles for the button
 */
export default function SportDropdownButton({ selectedSport, onPress, style }) {
  const icon = getSportIcon(selectedSport);
  const label = getSportLabel(selectedSport);

  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={selectedSport ? PRIMARY_COLOR : "#94A3B8"}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          !selectedSport && styles.placeholder,
        ]}
      >
        {label}
      </Text>
      <ChevronRight size={14} color="#94A3B8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  placeholder: {
    color: "#94A3B8",
  },
});
