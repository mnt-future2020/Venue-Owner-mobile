import { View, Text, TextInput, StyleSheet } from "react-native";

// Web parity: h-12 (48px), rounded-[24px] full-pill, label 10px uppercase tracking-[0.2em]
export default function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "none",
  secureTextEntry = false,
  editable = true,
  helperText,
  errorText,
  autoFocus = false,
  maxLength,
  leftAdornment,
}) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {leftAdornment ? (
          <View style={styles.adornment}>
            <Text style={styles.adornmentText}>{leftAdornment}</Text>
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoFocus={autoFocus}
          maxLength={maxLength}
          style={[
            styles.input,
            leftAdornment ? styles.inputWithLeft : null,
            !editable && styles.inputDisabled,
          ]}
          placeholderTextColor="#9CA3AF"
        />
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
  row: {
    flexDirection: "row",
  },
  adornment: {
    height: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  adornmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  inputWithLeft: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  inputDisabled: {
    opacity: 0.6,
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
