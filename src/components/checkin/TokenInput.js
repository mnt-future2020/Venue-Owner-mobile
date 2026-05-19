import { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { KeyRound } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

/**
 * 8-character alphanumeric token input.
 *
 * Props:
 *  - onSubmit: (token: string) => void
 *  - loading: boolean
 *
 * Allows users to type an optional hyphen between the 4th and 5th character
 * (e.g. "AB12-CD34") but strips it before validating/submitting. Auto-uppercase.
 */
export default function TokenInput({ onSubmit, loading = false }) {
  const [raw, setRaw] = useState("");

  const cleaned = useMemo(
    () => raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8),
    [raw]
  );

  const display = useMemo(() => {
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }, [cleaned]);

  const ready = cleaned.length === 8;

  const handleChange = (val) => {
    setRaw(val.replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 9));
  };

  const handleSubmit = () => {
    if (!ready || loading) return;
    onSubmit?.(cleaned);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBubble}>
        <KeyRound size={22} color={PRIMARY_COLOR} />
      </View>
      <Text style={styles.title}>Enter Check-in Token</Text>
      <Text style={styles.subtitle}>
        Find the 8-character code on the booking confirmation
      </Text>

      <View style={styles.inputWrap}>
        <TextInput
          value={display}
          onChangeText={handleChange}
          placeholder="ABCD-1234"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          style={styles.input}
        />
        <Text style={styles.counter}>{cleaned.length}/8</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, (!ready || loading) && styles.btnDisabled]}
        activeOpacity={0.85}
        onPress={handleSubmit}
        disabled={!ready || loading}
      >
        <Text style={styles.btnText}>
          {loading ? "Verifying..." : "Verify Token"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    alignItems: "center",
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 8,
    lineHeight: 17,
  },
  inputWrap: {
    width: "100%",
    position: "relative",
    marginBottom: 14,
  },
  input: {
    height: 54,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 22,
    paddingRight: 64,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#111827",
    textAlign: "center",
  },
  counter: {
    position: "absolute",
    right: 18,
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
    lineHeight: 54,
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  btn: {
    width: "100%",
    height: 48,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
