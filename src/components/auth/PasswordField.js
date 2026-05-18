import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  showPassword,
  onToggle,
  helperText,
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
          style={[styles.input, !editable && styles.inputDisabled]}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity onPress={onToggle} style={styles.eye} disabled={!editable}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    paddingRight: 44,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  eye: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  helper: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B7280",
  },
});
