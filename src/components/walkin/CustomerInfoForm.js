import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { User, Phone, IndianRupee, CreditCard, Banknote } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import AuthInput from "../auth/AuthInput";

/**
 * CustomerInfoForm — Phase 5 walk-in step 2
 *
 * Props:
 *  - value: {
 *      customer_name, customer_phone, custom_price,
 *      payment_type ("full" | "advance"), advance_amount,
 *      payment_mode ("cash" | "upi" | "bank_transfer")
 *    }
 *  - basePrice: number — turf price for one slot
 *  - onChange: (partial) => void
 */
const PAYMENT_TYPES = [
  { id: "full", label: "Full" },
  { id: "advance", label: "Advance" },
];

const PAYMENT_MODES = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "upi", label: "UPI", icon: CreditCard },
  { id: "bank_transfer", label: "Bank Transfer", icon: CreditCard },
];

function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

export default function CustomerInfoForm({ value = {}, basePrice = 0, onChange }) {
  const {
    customer_name = "",
    customer_phone = "",
    custom_price = "",
    payment_type = "full",
    advance_amount = "",
    payment_mode = "cash",
  } = value;

  const phoneError = useMemo(() => {
    if (!customer_phone) return "";
    const digits = digitsOnly(customer_phone);
    if (digits.length !== 10) return "Enter a 10-digit mobile number.";
    if (!/^[6-9]\d{9}$/.test(digits)) return "Number must start with 6-9.";
    return "";
  }, [customer_phone]);

  const effectivePrice =
    custom_price !== "" && custom_price != null
      ? Number(custom_price)
      : Number(basePrice) || 0;

  const advanceError = useMemo(() => {
    if (payment_type !== "advance") return "";
    if (advance_amount === "" || advance_amount == null) return "";
    const adv = Number(advance_amount);
    if (!(adv > 0)) return "Advance must be greater than 0.";
    if (adv >= effectivePrice)
      return "Advance must be less than total price.";
    return "";
  }, [payment_type, advance_amount, effectivePrice]);

  const setField = (key) => (v) => onChange?.({ [key]: v });

  const setPhone = (txt) => {
    // Strip non-digits, drop leading 91, cap at 10 digits
    const digits = digitsOnly(txt).replace(/^91/, "").slice(0, 10);
    onChange?.({ customer_phone: digits });
  };

  return (
    <View>
      <AuthInput
        label="Customer Name"
        value={customer_name}
        onChangeText={setField("customer_name")}
        placeholder="e.g. Arjun Singh"
        autoCapitalize="words"
      />

      <AuthInput
        label="Mobile Number"
        value={customer_phone}
        onChangeText={setPhone}
        placeholder="9876543210"
        keyboardType="phone-pad"
        maxLength={10}
        leftAdornment="+91"
        errorText={phoneError || undefined}
      />

      <AuthInput
        label={`Price ${basePrice ? `(default ₹${basePrice})` : ""}`}
        value={String(custom_price ?? "")}
        onChangeText={(t) =>
          onChange?.({ custom_price: t.replace(/[^0-9]/g, "") })
        }
        placeholder={String(basePrice || "")}
        keyboardType="numeric"
        leftAdornment="₹"
      />

      {/* Payment type */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Payment Type</Text>
        <View style={styles.radioRow}>
          {PAYMENT_TYPES.map((opt) => {
            const active = payment_type === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.radioPill, active && styles.radioPillActive]}
                onPress={() => onChange?.({ payment_type: opt.id })}
                activeOpacity={0.8}
              >
                <View style={[styles.radioDot, active && styles.radioDotActive]} />
                <Text style={[styles.radioText, active && styles.radioTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {payment_type === "advance" && (
        <AuthInput
          label="Advance Amount"
          value={String(advance_amount ?? "")}
          onChangeText={(t) =>
            onChange?.({ advance_amount: t.replace(/[^0-9]/g, "") })
          }
          placeholder="e.g. 500"
          keyboardType="numeric"
          leftAdornment="₹"
          errorText={advanceError || undefined}
          helperText={
            !advanceError && effectivePrice
              ? `Remaining ₹${Math.max(
                  0,
                  effectivePrice - (Number(advance_amount) || 0),
                )} due at venue`
              : undefined
          }
        />
      )}

      {/* Payment mode */}
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Payment Mode</Text>
        <View style={styles.radioRow}>
          {PAYMENT_MODES.map((opt) => {
            const active = payment_mode === opt.id;
            const Icon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.radioPill, active && styles.radioPillActive]}
                onPress={() => onChange?.({ payment_mode: opt.id })}
                activeOpacity={0.8}
              >
                <Icon
                  size={13}
                  color={active ? "#FFFFFF" : "#374151"}
                  strokeWidth={2.4}
                />
                <Text style={[styles.radioText, active && styles.radioTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Summary line */}
      <View style={styles.summary}>
        <Text style={styles.summaryKey}>Total</Text>
        <Text style={styles.summaryVal}>₹{effectivePrice}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 18 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  radioRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
  },
  radioPillActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    backgroundColor: "transparent",
  },
  radioDotActive: {
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
  },
  radioText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  radioTextActive: { color: "#FFFFFF" },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
  },
  summaryKey: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065F46",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
});
