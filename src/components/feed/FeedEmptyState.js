import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function FeedEmptyState({ title = "No posts yet", description, onRetry }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="radio-outline" size={28} color={PRIMARY_COLOR} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description || "Dynamic feed data is not available right now."}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.button} activeOpacity={0.9} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  button: {
    marginTop: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
