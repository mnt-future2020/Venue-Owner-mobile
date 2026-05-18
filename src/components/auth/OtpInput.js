import { useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const CODE_LENGTH = 6;

// Web parity: 6 cells, w-12 h-16, border-2, rounded-2xl, text-xl font-black
export default function OtpInput({ value, onChange, editable = true }) {
  const refs = useRef([]);

  const handleChange = (text, idx) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) {
      const next = [...value];
      next[idx] = "";
      onChange(next);
      return;
    }
    if (digits.length > 1) {
      const next = [...value];
      for (let i = 0; i < digits.length && idx + i < CODE_LENGTH; i++) {
        next[idx + i] = digits[i];
      }
      onChange(next);
      const focusIdx = Math.min(idx + digits.length, CODE_LENGTH - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    const next = [...value];
    next[idx] = digits[0];
    onChange(next);
    if (idx < CODE_LENGTH - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        const next = [...value];
        next[idx - 1] = "";
        onChange(next);
        refs.current[idx - 1]?.focus();
      } else if (value[idx]) {
        const next = [...value];
        next[idx] = "";
        onChange(next);
      }
    }
  };

  return (
    <View style={styles.row}>
      {value.map((digit, idx) => (
        <TextInput
          key={idx}
          ref={(r) => (refs.current[idx] = r)}
          style={[
            styles.cell,
            digit ? styles.cellActive : null,
            !editable ? styles.cellDisabled : null,
          ]}
          value={digit}
          onChangeText={(t) => handleChange(t, idx)}
          onKeyPress={(e) => handleKeyPress(e, idx)}
          keyboardType="number-pad"
          editable={editable}
          selectTextOnFocus
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          textContentType={idx === 0 ? "oneTimeCode" : "none"}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  cell: {
    width: 46,
    height: 60,
    borderWidth: 2,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 16,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  cellActive: {
    borderColor: PRIMARY_COLOR,
  },
  cellDisabled: {
    opacity: 0.5,
    borderColor: "#FECACA",
  },
});
