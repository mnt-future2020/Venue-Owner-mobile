import { View, Text, StyleSheet } from "react-native";
import { FONTS } from "../../constants/theme";

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

export default function PayoutCard({ icon, label, value, description, color, bgColor }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(value)}
      </Text>
      {description ? (
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
      ) : null}
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
    minHeight: 130,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  // Manrope ExtraBold for the label (uppercase, tracked)
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  // Chivo Black for the big amount (display)
  value: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: FONTS.body,
    color: "#9CA3AF",
  },
});
