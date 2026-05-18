import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Web parity: h-12 (48px), rounded-full pill, brand-600 bg, font-black uppercase tracking-widest text-xs
export default function AuthButton({ title, onPress, loading, disabled, leftIcon }) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={[styles.buttonText, styles.loadingText]}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.row}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  loadingText: {
    marginLeft: 8,
  },
});
