import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function AuthLink({ text, linkText, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.wrap}>
      <Text style={styles.text}>
        {text} <Text style={styles.link}>{linkText}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
  },
  text: {
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
  },
  link: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
});
