import { StyleSheet, Text, View } from "react-native";
import { Lock } from "lucide-react-native";

export default function EncryptionBadge({ style }) {
  return (
    <View style={[styles.container, style]}>
      <Lock size={10} color="#9CA3AF" />
      <Text style={styles.text}>End-to-end encrypted</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 4,
  },
  text: { fontSize: 10, color: "#9CA3AF", letterSpacing: 0.2 },
});
