import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, QrCode, KeyRound } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import QRScanner from "../../components/checkin/QRScanner";
import TokenInput from "../../components/checkin/TokenInput";
import CheckinConfirmCard from "../../components/checkin/CheckinConfirmCard";
import bookingService from "../../services/bookingService";
import toast from "../../utils/toast";

/**
 * Backend QR format: `HORIZON_CHECKIN:<booking_id>:<token>`
 * Mobile passes the raw barcode value here and we extract the booking_id.
 * As a fallback for older formats, we also try base64 + raw-id heuristics.
 */
function extractBookingId(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();

  // 1. Canonical format
  if (trimmed.startsWith("HORIZON_CHECKIN:")) {
    const parts = trimmed.split(":");
    if (parts.length >= 2 && parts[1]) return parts[1];
  }

  // 2. Plain UUID-ish booking id
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidLike.test(trimmed)) return trimmed;

  // 3. Base64-wrapped — try decoding once
  try {
    // global.atob is available in RN >= 0.74 with Hermes
    const decoded =
      typeof atob === "function" ? atob(trimmed) : Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.startsWith("HORIZON_CHECKIN:")) {
      const parts = decoded.split(":");
      if (parts.length >= 2 && parts[1]) return parts[1];
    }
    if (uuidLike.test(decoded)) return decoded;
  } catch {
    /* ignore */
  }

  // Last resort — treat the raw value as the booking id
  return trimmed;
}

export default function CheckinScreen() {
  const router = useRouter();
  const [mode, setMode] = useState("scan"); // "scan" | "token"
  const [scanned, setScanned] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reset = useCallback(() => {
    setScanned(null);
    setResolving(false);
    setConfirming(false);
  }, []);

  const handleScan = useCallback(
    async (value) => {
      if (resolving || scanned) return;
      const bookingId = extractBookingId(value);
      if (!bookingId) {
        toast.error("Invalid QR", "Could not read the booking code.");
        return;
      }
      setResolving(true);
      try {
        const booking = await bookingService.get(bookingId);
        if (!booking) {
          toast.error("Not Found", "No booking matches that QR code.");
          reset();
          return;
        }
        setScanned(booking);
      } catch (err) {
        toast.error("Lookup Failed", err?.response?.data?.detail || "Try again.");
        reset();
      } finally {
        setResolving(false);
      }
    },
    [resolving, scanned, reset]
  );

  const handleToken = useCallback(
    async (token) => {
      if (resolving) return;
      setResolving(true);
      try {
        const res = await bookingService.checkin({ checkin_token: token });
        // Backend may return either { booking: {...} } or the booking directly
        const booking = res?.booking || res;
        if (!booking || (!booking.id && !booking.booking_id)) {
          toast.error("Invalid Token", "No booking matches that code.");
          return;
        }
        setScanned(booking);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          // Backend has no /iot/checkin endpoint — token-only lookup not supported.
          toast.error(
            "Token Lookup Unavailable",
            "Use Scan QR instead — token verification is not yet supported by the server.",
          );
        } else {
          toast.error("Token Failed", err?.response?.data?.detail || "Try again.");
        }
      } finally {
        setResolving(false);
      }
    },
    [resolving]
  );

  const handleConfirm = useCallback(async () => {
    if (!scanned || confirming) return;
    const bookingId = scanned.id || scanned.booking_id;
    if (!bookingId) {
      toast.error("Missing ID", "Booking id not available.");
      return;
    }
    setConfirming(true);
    try {
      await bookingService.checkin({ booking_id: bookingId });
      toast.success("Checked in", scanned.customer_name || scanned.host_name || "Welcome!");
      setTimeout(reset, 800);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // No server-side check-in endpoint exists yet — confirm locally and proceed.
        toast.success(
          "Check-in noted",
          `${scanned.customer_name || scanned.host_name || "Guest"} — server log not available.`,
        );
        setTimeout(reset, 1200);
      } else {
        toast.error("Check-in Failed", err?.response?.data?.detail || "Try again.");
        reset();
      }
    } finally {
      setConfirming(false);
    }
  }, [scanned, confirming, reset]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Booking</Text>
          <Text style={styles.title}>Check-in</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs */}
          <View style={styles.tabs}>
            <TabBtn
              icon={<QrCode size={14} color={mode === "scan" ? "#FFFFFF" : "#374151"} />}
              label="Scan QR"
              active={mode === "scan"}
              onPress={() => {
                reset();
                setMode("scan");
              }}
            />
            <TabBtn
              icon={<KeyRound size={14} color={mode === "token" ? "#FFFFFF" : "#374151"} />}
              label="Enter Token"
              active={mode === "token"}
              onPress={() => {
                reset();
                setMode("token");
              }}
            />
          </View>

          {/* Mode panel — hidden when a booking is resolved */}
          {!scanned && mode === "scan" && (
            <View style={styles.scanWrap}>
              <QRScanner enabled={!scanned && !resolving} onScan={handleScan} />
              {resolving ? (
                <View style={styles.resolvingPill}>
                  <Text style={styles.resolvingText}>Looking up booking…</Text>
                </View>
              ) : null}
            </View>
          )}

          {!scanned && mode === "token" && (
            <TokenInput onSubmit={handleToken} loading={resolving} />
          )}

          {/* Confirmation */}
          {scanned ? (
            <View style={{ marginTop: 18 }}>
              <CheckinConfirmCard
                booking={scanned}
                onConfirm={handleConfirm}
                onCancel={reset}
                loading={confirming}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabBtn({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active ? styles.tabActive : styles.tabInactive]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 1,
  },
  scroll: { padding: 16, paddingBottom: 40 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 9999,
    gap: 6,
  },
  tabActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabTextActive: { color: "#FFFFFF" },
  tabTextInactive: { color: "#374151" },
  scanWrap: {
    aspectRatio: 1,
    maxHeight: 380,
    minHeight: 280,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    position: "relative",
  },
  resolvingPill: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  resolvingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
