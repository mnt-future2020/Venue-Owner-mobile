import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Minus, Plus } from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import { getSportLabel } from "../../constants/venueConstants";
import bookingService from "../../services/bookingService";
import toast from "../../utils/toast";

// Mirrors frontend Walk-in Booking dialog
// (VenueOwnerDashboard.js:2545-2863). Opens inline as a modal over the
// Slots grid — no separate route.
//
// `slot` shape (from SlotsTab.handleSlotPress):
//   { date, turf_number, turf_name, sport, start_time, price,
//     maxConsecutive, slotPrices: [number], maxLobbians }

function fmt12h(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return hhmm || "";
  const [hStr, mStr = "00"] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${mStr.padStart(2, "0")} ${period}`;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

export default function WalkInBookingModal({
  visible,
  slot,
  venueId,
  slotDurationMinutes, // optional — fallback derived from slot times
  onClose,
  onBooked,
}) {
  const insets = useSafeAreaInsets();

  // Derive slot duration (minutes) from slot times if not passed
  const slotDur = useMemo(() => {
    if (slotDurationMinutes) return slotDurationMinutes;
    if (!slot?.start_time || !slot?.end_time) return 60;
    const [sh, sm] = slot.start_time.split(":").map(Number);
    const [eh, em] = slot.end_time.split(":").map(Number);
    const d = eh * 60 + em - (sh * 60 + sm);
    return d > 0 ? d : 60;
  }, [slot, slotDurationMinutes]);

  const minSlots = useMemo(() => Math.ceil(60 / slotDur), [slotDur]);
  const maxSlots = slot?.maxConsecutive || 1;
  const maxLobbians = slot?.maxLobbians || 1;

  // ── Local state ──
  const [duration, setDuration] = useState(minSlots);
  const [lobbians, setLobbians] = useState(1);
  const [customPrice, setCustomPrice] = useState(null);
  const [paymentType, setPaymentType] = useState("full");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state whenever a new slot opens
  useEffect(() => {
    if (visible) {
      setDuration(minSlots);
      setLobbians(1);
      setCustomPrice(null);
      setPaymentType("full");
      setAdvanceAmount("");
      setName("");
      setPhone("");
      setSubmitting(false);
    }
  }, [visible, minSlots]);

  // ── Derived values ──
  const slotPrices = slot?.slotPrices || [];
  const baseTotalPrice = useMemo(
    () => slotPrices.slice(0, duration).reduce((a, b) => a + (b || 0), 0),
    [slotPrices, duration]
  );
  const effectivePrice =
    customPrice !== null && customPrice !== ""
      ? Number(customPrice)
      : baseTotalPrice;

  const totalMin = slotDur * duration;
  const durDisplay = useMemo(() => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }, [totalMin]);

  const endTime = useMemo(
    () => (slot?.start_time ? addMinutes(slot.start_time, totalMin) : ""),
    [slot, totalMin]
  );

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const advanceNum = advanceAmount === "" ? 0 : Number(advanceAmount);
  const advanceValid =
    paymentType !== "advance" ||
    (advanceNum > 0 && advanceNum < effectivePrice);

  const canSubmit =
    !submitting &&
    name.trim().length > 0 &&
    phoneValid &&
    advanceValid;

  // ── Submit handler — mirrors frontend handleWalkInBook ──
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!phoneValid) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (paymentType === "advance") {
      if (advanceNum <= 0) {
        toast.error("Enter a valid advance amount");
        return;
      }
      if (advanceNum >= effectivePrice) {
        toast.error("Advance amount must be less than the total price");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        venue_id: venueId,
        date: slot.date,
        start_time: slot.start_time,
        end_time: endTime,
        turf_number: slot.turf_number,
        sport: slot.sport,
        booking_type: "walk_in",
        num_players: lobbians,
        customer_name: name.trim(),
        customer_phone: phone,
        payment_type: paymentType,
        ...(customPrice !== null && customPrice !== ""
          ? { custom_price: Number(customPrice) }
          : {}),
        ...(paymentType === "advance" && advanceAmount !== ""
          ? { advance_amount: advanceNum }
          : {}),
      };
      await bookingService.createBooking(payload);
      toast.success("Walk-in booking created!");
      onBooked?.();
      onClose?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Could not create booking"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!slot) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !submitting && onClose?.()}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={() => !submitting && onClose?.()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.card}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Walk-in Booking</Text>
                <Text style={styles.subtitle}>
                  Book a slot for a walk-in customer
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !submitting && onClose?.()}
                hitSlop={8}
                style={styles.closeBtn}
                disabled={submitting}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Turf / Sport / Date / Time grid */}
              <View style={styles.infoGrid}>
                <InfoCell label="Turf" value={slot.turf_name} />
                <InfoCell
                  label="Sport"
                  value={getSportLabel(slot.sport) || slot.sport}
                />
                <InfoCell label="Date" value={slot.date} />
                <InfoCell
                  label="Time"
                  value={`${fmt12h(slot.start_time)} - ${fmt12h(endTime)}`}
                />
              </View>

              {/* Duration counter */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Duration</Text>
                <View style={styles.counterRow}>
                  <CounterBtn
                    icon="minus"
                    onPress={() => {
                      setDuration((d) => Math.max(minSlots, d - 1));
                      setCustomPrice(null);
                      setAdvanceAmount("");
                    }}
                    disabled={duration <= minSlots}
                  />
                  <Text style={styles.counterValue}>{durDisplay}</Text>
                  <CounterBtn
                    icon="plus"
                    onPress={() => {
                      setDuration((d) => Math.min(maxSlots, d + 1));
                      setCustomPrice(null);
                      setAdvanceAmount("");
                    }}
                    disabled={duration >= maxSlots}
                  />
                </View>
              </View>

              {/* Lobbians counter */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Lobbians</Text>
                <View style={styles.counterRow}>
                  <CounterBtn
                    icon="minus"
                    onPress={() => setLobbians((n) => Math.max(1, n - 1))}
                    disabled={lobbians <= 1}
                  />
                  <Text style={styles.counterValue}>{lobbians}</Text>
                  <CounterBtn
                    icon="plus"
                    onPress={() =>
                      setLobbians((n) => Math.min(maxLobbians, n + 1))
                    }
                    disabled={lobbians >= maxLobbians}
                  />
                </View>
              </View>

              {/* Total Price */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Total Price</Text>
                <View style={styles.priceRow}>
                  <View style={styles.priceInputWrap}>
                    <Text style={styles.priceCurrency}>₹</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="number-pad"
                      value={String(
                        customPrice !== null ? customPrice : baseTotalPrice
                      )}
                      onChangeText={(v) => {
                        setCustomPrice(v === "" ? "" : Number(v));
                        setAdvanceAmount("");
                      }}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                      selectionColor={PRIMARY_COLOR}
                      includeFontPadding={false}
                      textAlignVertical="center"
                    />
                  </View>
                  {customPrice !== null &&
                  customPrice !== baseTotalPrice ? (
                    <TouchableOpacity
                      onPress={() => {
                        setCustomPrice(null);
                        setAdvanceAmount("");
                      }}
                      style={{ flexShrink: 1 }}
                    >
                      <Text style={styles.resetLink}>
                        Reset to ₹{baseTotalPrice.toLocaleString("en-IN")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Payment Type segmented */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Payment Type</Text>
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      paymentType === "full" && styles.segmentBtnFullActive,
                    ]}
                    onPress={() => {
                      setPaymentType("full");
                      setAdvanceAmount("");
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        paymentType === "full" && styles.segmentTextActive,
                      ]}
                    >
                      Full Payment
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      paymentType === "advance" &&
                        styles.segmentBtnAdvanceActive,
                    ]}
                    onPress={() => setPaymentType("advance")}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        paymentType === "advance" && styles.segmentTextActive,
                      ]}
                    >
                      Advance Payment
                    </Text>
                  </TouchableOpacity>
                </View>

                {paymentType === "advance" ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Text style={styles.fieldLabel}>Advance Amount *</Text>
                    <View style={styles.priceRow}>
                      <View
                        style={[
                          styles.priceInputWrap,
                          { borderColor: "rgba(217, 119, 6, 0.35)" },
                        ]}
                      >
                        <Text
                          style={[styles.priceCurrency, { color: "#D97706" }]}
                        >
                          ₹
                        </Text>
                        <TextInput
                          style={[styles.priceInput, { color: "#D97706" }]}
                          keyboardType="number-pad"
                          placeholder="Enter advance"
                          placeholderTextColor="#9CA3AF"
                          value={
                            advanceAmount === "" ? "" : String(advanceAmount)
                          }
                          onChangeText={(v) =>
                            setAdvanceAmount(v === "" ? "" : Number(v))
                          }
                          selectionColor="#D97706"
                          includeFontPadding={false}
                          textAlignVertical="center"
                        />
                      </View>
                    </View>
                    {advanceAmount !== "" &&
                    advanceNum > 0 &&
                    advanceNum < effectivePrice ? (
                      <View style={styles.advanceBreakdown}>
                        <Text style={styles.advanceBreakdownAdvance}>
                          Advance: ₹{advanceNum.toLocaleString("en-IN")}
                        </Text>
                        <Text style={styles.advanceBreakdownRemaining}>
                          Remaining: ₹
                          {(effectivePrice - advanceNum).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    ) : null}
                    {advanceAmount !== "" && advanceNum >= effectivePrice ? (
                      <Text style={styles.advanceError}>
                        Advance must be less than total price
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* Customer Name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter customer name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Customer Phone */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Customer Phone *</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={(v) =>
                      setPhone(v.replace(/\D/g, "").slice(0, 10))
                    }
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Sticky bottom button — safe-area aware */}
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 12) },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  paymentType === "advance" && styles.submitBtnAdvance,
                  !canSubmit && styles.submitBtnDisabled,
                ]}
                disabled={!canSubmit}
                onPress={handleSubmit}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <View style={styles.submitInner}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.submitText}>Booking…</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>
                    {paymentType === "advance" && advanceAmount !== "" && advanceNum > 0
                      ? `Book Now (Advance: ₹${advanceNum.toLocaleString("en-IN")})`
                      : "Book Now (Full Payment)"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function InfoCell({ label, value }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

function CounterBtn({ icon, onPress, disabled }) {
  const Icon = icon === "minus" ? Minus : Plus;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.counterBtn, disabled && styles.counterBtnDisabled]}
    >
      <Icon size={14} color="#0F172A" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  kbWrap: { flex: 1, justifyContent: "flex-end" },
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    minHeight: "50%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241, 245, 249, 0.8)",
  },

  scrollBody: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  infoCell: { width: "47%" },
  infoLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#0F172A",
  },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  counterBtnDisabled: { opacity: 0.35 },
  counterValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 60,
    textAlign: "center",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  // Pill wrapper around ₹ + numeric input — single bordered box so the
  // currency symbol sits inline with the value (no separate floating ₹).
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 140,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    gap: 6,
  },
  priceCurrency: {
    fontSize: 16,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
  // The input now flexes inside the wrap; height/padding live on the wrap.
  priceInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  resetLink: {
    fontSize: 11,
    color: "#6B7280",
    textDecorationLine: "underline",
  },

  segmentRow: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnFullActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  segmentBtnAdvanceActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  segmentText: { fontSize: 12, fontWeight: "800", color: "#0F172A" },
  segmentTextActive: { color: "#FFFFFF" },

  advanceBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  advanceBreakdownAdvance: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  advanceBreakdownRemaining: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  advanceError: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
  },

  input: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },

  phoneRow: { flexDirection: "row" },
  phonePrefix: {
    paddingHorizontal: 14,
    height: 42,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  phonePrefixText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },
  phoneInput: {
    flex: 1,
    height: 42,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnAdvance: { backgroundColor: "#D97706" },
  submitBtnDisabled: { opacity: 0.5 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
});
