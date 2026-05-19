import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";

// Web parity: rounded-2xl card, icon-in-tinted-square, label uppercase tiny, value big bold
export default function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: bgColor || "rgba(5,150,105,0.1)" }]}>
        {icon}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    minHeight: 110,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
  },
});
