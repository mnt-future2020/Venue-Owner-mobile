import { useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const CODE_LENGTH = 6;

export default function OtpInput({ value, onChange, editable = true }) {
  const refs = useRef([]);

  const handleChange = (text, idx) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) {
      // Cleared this cell
      const next = [...value];
      next[idx] = "";
      onChange(next);
      return;
    }

    // Paste: multiple digits came in — fill from current cell forward
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

    // Single digit typed
    const next = [...value];
    next[idx] = digits[0];
    onChange(next);
    if (idx < CODE_LENGTH - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        // Current cell empty — go back and clear previous
        const next = [...value];
        next[idx - 1] = "";
        onChange(next);
        refs.current[idx - 1]?.focus();
      } else if (value[idx]) {
        // Current cell has digit — clear it
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
          style={[styles.cell, digit ? styles.cellActive : null]}
          value={digit}
          onChangeText={(t) => handleChange(t, idx)}
          onKeyPress={(e) => handleKeyPress(e, idx)}
          keyboardType="number-pad"
          editable={editable}
          selectTextOnFocus
          contextMenuHidden={false}
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
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cell: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  cellActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: "#ECFDF5",
  },
});
