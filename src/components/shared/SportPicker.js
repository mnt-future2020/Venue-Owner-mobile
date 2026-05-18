import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CheckCircle, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Centralized sports data source
export const SPORTS_DATA = [
  { key: "", label: "Any Sport", mci: "trophy-outline" },
  { key: "football", label: "Football", mci: "soccer" },
  { key: "cricket", label: "Cricket", mci: "cricket" },
  { key: "badminton", label: "Badminton", mci: "badminton" },
  { key: "basketball", label: "Basketball", mci: "basketball" },
  { key: "tennis", label: "Tennis", mci: "tennis" },
  { key: "volleyball", label: "Volleyball", mci: "volleyball" },
  { key: "table_tennis", label: "Table Tennis", mci: "table-tennis" },
  { key: "hockey", label: "Hockey", mci: "hockey-sticks" },
  { key: "pickleball", label: "Pickleball", mci: "tennis" },
  { key: "swimming", label: "Swimming", mci: "swim" },
];

// Helper to get sport icon name
export const getSportIcon = (sportKey) => {
  const sport = SPORTS_DATA.find((s) => s.key === sportKey);
  return sport?.mci || "trophy-outline";
};

// Helper to get sport label
export const getSportLabel = (sportKey) => {
  const sport = SPORTS_DATA.find((s) => s.key === sportKey);
  return sport?.label || "Any Sport";
};

/**
 * Reusable Sport Picker Modal Component
 * 
 * @param {boolean} visible - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {string} selectedSport - Currently selected sport key
 * @param {function} onSelectSport - Callback when a sport is selected (receives sport key)
 */
export default function SportPicker({ visible, onClose, selectedSport, onSelectSport }) {
  const handleSelect = (sportKey) => {
    onSelectSport(sportKey);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Sport</Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>
          <FlatList
            data={SPORTS_DATA}
            keyExtractor={(item) => item.key || "_any"}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.item,
                  selectedSport === item.key && styles.itemActive,
                ]}
                onPress={() => handleSelect(item.key)}
              >
                <View style={styles.itemLeft}>
                  <MaterialCommunityIcons
                    name={item.mci}
                    size={20}
                    color={selectedSport === item.key ? PRIMARY_COLOR : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.itemText,
                      selectedSport === item.key && styles.itemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                {selectedSport === item.key ? (
                  <CheckCircle size={18} color={PRIMARY_COLOR} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: "continuous",
    maxHeight: "60%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F8FAFC",
  },
  itemActive: {
    backgroundColor: "rgba(5,150,105,0.04)",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemText: {
    fontSize: 15,
    color: "#374151",
  },
  itemTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
});
