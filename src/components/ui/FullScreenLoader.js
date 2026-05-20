import { ActivityIndicator, StyleSheet, View } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Single source of truth for the "screen is loading" state. Used on every
// screen's first-ever visit (when the cache is empty) so the loading UX is
// identical everywhere — centered large primary-color spinner on a neutral
// background. After data arrives the cache makes subsequent visits instant.
export default function FullScreenLoader({ style, color = PRIMARY_COLOR }) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
});
