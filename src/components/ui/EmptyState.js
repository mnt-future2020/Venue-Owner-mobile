import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      {Icon && <Icon size={48} color="#CBD5E1" />}
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, minHeight: 200 },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 16, marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 18, marginBottom: 20 },
  button: { backgroundColor: PRIMARY_COLOR, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
