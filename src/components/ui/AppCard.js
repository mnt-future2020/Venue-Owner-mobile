import React from "react";
import { StyleSheet, View } from "react-native";

export default React.memo(function AppCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EDF4",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
});
