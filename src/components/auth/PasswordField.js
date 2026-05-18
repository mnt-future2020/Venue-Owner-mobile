import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Web parity: pill input + lucide Eye/EyeOff toggle (brand color) at right
export default function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  showPassword,
  onToggle,
  helperText,
  errorText,
  autoFocus = false,
}) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={!showPassword}
          editable={editable}
          autoCapitalize="none"
          autoFocus={autoFocus}
          style={[styles.input, !editable && styles.inputDisabled]}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity onPress={onToggle} style={styles.eye} disabled={!editable} activeOpacity={0.7}>
          {showPassword ? (
            <EyeOff size={18} color={PRIMARY_COLOR} />
          ) : (
            <Eye size={18} color={PRIMARY_COLOR} />
          )}
        </TouchableOpacity>
      </View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      {!errorText && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 46,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  eye: {
    position: "absolute",
    right: 14,
    padding: 4,
  },
  helper: {
    marginTop: 6,
    fontSize: 10,
    color: "#9CA3AF",
  },
  error: {
    marginTop: 6,
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
