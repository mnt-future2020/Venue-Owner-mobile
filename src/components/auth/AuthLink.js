import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Web parity: text-xs font-bold uppercase tracking-widest muted, link in brand-600
export default function AuthLink({ text, linkText, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.wrap} activeOpacity={0.7}>
      <Text style={styles.text}>
        {text ? `${text} ` : ""}
        <Text style={styles.link}>{linkText}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    alignItems: "center",
  },
  text: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  link: {
    color: PRIMARY_COLOR,
    fontWeight: "900",
  },
});
