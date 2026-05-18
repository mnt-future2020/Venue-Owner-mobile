import { View, Text, StyleSheet } from "react-native";
import Logo from "../Logo";

export default function AuthHeader({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <Logo size={50} variant="platform" />

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
