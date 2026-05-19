import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, ChevronLeft, ShoppingCart } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../../constants/theme";
import venueService from "../../../services/venueService";
import bookingService from "../../../services/bookingService";
import toast from "../../../utils/toast";
import SlotPicker from "../../../components/walkin/SlotPicker";
import CustomerInfoForm from "../../../components/walkin/CustomerInfoForm";
import ReceiptView from "../../../components/walkin/ReceiptView";

const STEP_LABELS = {
  slot: "Pick Slot",
  customer: "Customer & Payment",
  receipt: "Receipt",
};
const STEP_ORDER = ["slot", "customer", "receipt"];

function computeEndTime(startTime, durationMin = 60) {
  if (!startTime) return "";
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const eh = Math.floor((total / 60) % 24);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

const todayStr = () => {
  const d = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function WalkinScreen() {
  const router = useRouter();
  const [step, setStep] = useState("slot");
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  const [slotState, setSlotState] = useState({
    venue: null,
    date: todayStr(),
    sport: "",
    slot: null,
  });

  const [customer, setCustomer] = useState({
    customer_name: "",
    customer_phone: "",
    custom_price: "",
    payment_type: "full",
    advance_amount: "",
    payment_mode: "cash",
  });

  // Initial venue load
  useEffect(() => {
    let active = true;
    setLoadingVenues(true);
    venueService
      .getOwnerVenues()
      .then((list) => {
        if (!active) return;
        const vs = Array.isArray(list) ? list : [];
        setVenues(vs);
        setSlotState((prev) => ({
          ...prev,
          venue: prev.venue || (vs.length ? vs[0] : null),
        }));
      })
      .catch((err) =>
        toast.error("Could not load venues", err?.response?.data?.detail || "Try again."),
      )
      .finally(() => active && setLoadingVenues(false));
    return () => {
      active = false;
    };
  }, []);

  const stepIndex = STEP_ORDER.indexOf(step);

  const handleSlotChange = useCallback((partial) => {
    setSlotState((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleCustomerChange = useCallback((partial) => {
    setCustomer((prev) => ({ ...prev, ...partial }));
  }, []);

  const canProceedFromSlot = useMemo(
    () => Boolean(slotState.venue && slotState.date && slotState.slot),
    [slotState],
  );

  const phoneDigits = (customer.customer_phone || "").replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10 && /^[6-9]\d{9}$/.test(phoneDigits);
  const nameValid = (customer.customer_name || "").trim().length > 0;

  const basePrice = useMemo(() => slotState.slot?.price || 0, [slotState.slot]);
  const effectivePrice =
    customer.custom_price !== "" && customer.custom_price != null
      ? Number(customer.custom_price)
      : Number(basePrice) || 0;

  const advanceValid =
    customer.payment_type !== "advance" ||
    (customer.advance_amount !== "" &&
      Number(customer.advance_amount) > 0 &&
      Number(customer.advance_amount) < effectivePrice);

  const canSubmit = canProceedFromSlot && nameValid && phoneValid && advanceValid;

  const handleBack = () => {
    if (step === "slot") {
      router.back();
      return;
    }
    if (step === "customer") {
      setStep("slot");
      return;
    }
    if (step === "receipt") {
      // Receipt is terminal — going back returns to dashboard
      router.back();
    }
  };

  const handleNext = async () => {
    if (step === "slot") {
      if (!canProceedFromSlot) {
        toast.error("Please pick a slot first.");
        return;
      }
      setStep("customer");
      return;
    }
    if (step === "customer") {
      if (!nameValid) {
        toast.error("Customer name is required.");
        return;
      }
      if (!phoneValid) {
        toast.error("Enter a valid 10-digit mobile number.");
        return;
      }
      if (!advanceValid) {
        toast.error("Advance amount must be > 0 and less than total.");
        return;
      }
      await createBooking();
    }
  };

  const createBooking = async () => {
    if (!slotState.slot || !slotState.venue) return;
    setSubmitting(true);
    try {
      const venue = slotState.venue;
      const slot = slotState.slot;
      const slotDurationMin = venue.slot_duration_minutes || 60;
      const endTime = slot.end_time || computeEndTime(slot.start_time, slotDurationMin);

      const payload = {
        venue_id: venue.id,
        date: slotState.date,
        start_time: slot.start_time,
        end_time: endTime,
        turf_number: slot.turf_number,
        sport: slot.sport || slotState.sport || "",
        booking_type: "walk_in",
        // Match frontend payload: always send num_players (defaults to 1)
        num_players: 1,
        customer_name: customer.customer_name.trim(),
        customer_phone: phoneDigits,
        ...(customer.custom_price !== "" && customer.custom_price != null
          ? { custom_price: Number(customer.custom_price) }
          : {}),
        payment_type: customer.payment_type,
        ...(customer.payment_type === "advance" && customer.advance_amount !== ""
          ? { advance_amount: Number(customer.advance_amount) }
          : {}),
        // Backend always overrides to "offline" for walk-in path; sent for clarity.
        // The selected mode (cash/upi/bank_transfer) is displayed locally only —
        // backend does not currently persist this distinction.
        payment_mode: "offline",
      };

      const res = await bookingService.createBooking(payload);
      setCreatedBooking(res);
      setStep("receipt");
      toast.success("Walk-in booking created");
    } catch (err) {
      toast.error(
        "Could not create booking",
        err?.response?.data?.detail || "Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    router.replace("/(tabs)/dashboard");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111827" strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Walk-in Booking</Text>
          <Text style={styles.headerSubtitle}>
            Step {stepIndex + 1} of {STEP_ORDER.length} • {STEP_LABELS[step]}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.posBtn}
          onPress={() => router.replace("/(stack)/pos")}
          activeOpacity={0.7}
        >
          <ShoppingCart size={14} color={PRIMARY_COLOR} strokeWidth={2.4} />
          <Text style={styles.posBtnText}>POS</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((stepIndex + 1) / STEP_ORDER.length) * 100}%` },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loadingVenues ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
          ) : step === "slot" ? (
            <SlotPicker
              venues={venues}
              selected={slotState}
              onChange={handleSlotChange}
            />
          ) : step === "customer" ? (
            <CustomerInfoForm
              value={customer}
              basePrice={basePrice}
              onChange={handleCustomerChange}
            />
          ) : (
            <ReceiptView
              booking={createdBooking}
              venue={slotState.venue}
              onDone={handleDone}
            />
          )}
        </ScrollView>

        {/* Footer controls (hidden on receipt) */}
        {step !== "receipt" && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footBtn, styles.footSecondary]}
              onPress={handleBack}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <ChevronLeft size={16} color="#374151" strokeWidth={2.4} />
              <Text style={styles.footSecondaryText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footBtn,
                styles.footPrimary,
                (!canProceedFromSlot && step === "slot") ||
                (step === "customer" && !canSubmit) ||
                submitting
                  ? styles.footDisabled
                  : null,
              ]}
              onPress={handleNext}
              activeOpacity={0.85}
              disabled={
                submitting ||
                (step === "slot" && !canProceedFromSlot) ||
                (step === "customer" && !canSubmit)
              }
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.footPrimaryText}>
                    {step === "customer" ? "Create Booking" : "Next"}
                  </Text>
                  <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.4} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  headerCenter: { flex: 1, marginHorizontal: 10 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  posBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  posBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
  },
  footBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footSecondary: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  footSecondaryText: {
    color: "#374151",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  footPrimary: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  footPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  footDisabled: { opacity: 0.5 },
});
