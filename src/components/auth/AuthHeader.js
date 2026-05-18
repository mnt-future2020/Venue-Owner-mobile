import { View, Text, StyleSheet } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Web parity: optional brand-pill icon + display-large bold uppercase + muted subtitle
export default function AuthHeader({ title, subtitle, icon, iconBgColor }) {
  return (
    <View style={styles.container}>
      {icon ? (
        <View style={[styles.iconWrap, iconBgColor ? { backgroundColor: iconBgColor } : null]}>
          {icon}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${PRIMARY_COLOR}1A`, // 10% alpha
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 8,
    lineHeight: 18,
  },
});
