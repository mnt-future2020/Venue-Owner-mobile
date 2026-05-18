import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function ScreenPlaceholder({ icon = "grid-outline", title, description }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconShell}>
        <Ionicons name={icon} size={34} color={PRIMARY_COLOR} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  iconShell: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 320,
  },
});
