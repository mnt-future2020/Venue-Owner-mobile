import { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  X,
  Info,
  CheckCircle,
  AlertCircle,
  CreditCard,
  History,
  Phone,
} from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import bookingService from "../../services/bookingService";
import toast from "../../utils/toast";
import RefundPreview from "./RefundPreview";
import { getSportIconName } from "../../utils/sportIcons";

// ---------------------------------------------------------------- helpers
function fmtTime(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return hhmm || "";
  const [hStr, mStr = "00"] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${mStr.padStart(2, "0")} ${period}`;
}

function fmtDateLong(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(`${dateStr}T00:00:00+05:30`);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString("en-IN")}`;
}

function fmtDateTimeDDMM(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
  } catch {
    return String(ts);
  }
}

function titleCase(s) {
  if (!s) return "";
  return s
    .toString()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Status badge styling
const STATUS_STYLES = {
  confirmed: { bg: "#DBEAFE", fg: "#1E40AF", border: "#BFDBFE", label: "Confirmed", Icon: CheckCircle },
  completed: { bg: "#DBEAFE", fg: "#1E40AF", border: "#BFDBFE", label: "Completed", Icon: Info },
  pending: { bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A", label: "Pending", Icon: AlertCircle },
  payment_pending: { bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A", label: "Payment Pending", Icon: AlertCircle },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C", border: "#FECACA", label: "Cancelled", Icon: X },
  "no-show": { bg: "#FEE2E2", fg: "#B91C1C", border: "#FECACA", label: "No-Show", Icon: X },
  no_show: { bg: "#FEE2E2", fg: "#B91C1C", border: "#FECACA", label: "No-Show", Icon: X },
};

function getStatusMeta(status) {
  return (
    STATUS_STYLES[status] || {
      bg: "#F1F5F9",
      fg: "#475569",
      border: "#E2E8F0",
      label: status ? String(status).replace(/_/g, " ") : "Unknown",
      Icon: Info,
    }
  );
}

// ----------------------------------------------------- main sheet
export default function BookingDetailSheet({
  visible,
  booking,
  onClose,
  onChanged,
}) {
  const insets = useSafeAreaInsets();
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isWalkIn =
    booking?.booking_type === "walk_in" || booking?.booking_type === "walkin";
  const isConfirmed = booking?.status === "confirmed";
  const isCancellable = ["confirmed", "pending", "payment_pending"].includes(
    booking?.status
  );

  const remaining = Number(booking?.remaining_amount) || 0;
  const advance = Number(booking?.advance_amount) || 0;
  const total = Number(booking?.total_amount ?? booking?.amount) || 0;
  const commission = Number(booking?.commission_amount) || 0;
  const gst = Number(booking?.gst_on_commission) || 0;

  const yourEarnings = useMemo(() => {
    if (booking?.your_earnings != null) return Number(booking.your_earnings) || 0;
    return Math.max(0, total - commission - gst);
  }, [booking?.your_earnings, total, commission, gst]);

  const phone =
    booking?.host_phone || booking?.customer_phone || booking?.phone;

  if (!booking) return null;

  // ----------------- actions
  async function handleCollect(method) {
    if (!booking?.id && !booking?._id) return;
    const id = booking.id || booking._id;
    setBusy(true);
    try {
      const res = await bookingService.collectRemaining(id, method);
      toast.success("Payment collected");
      setMethodPickerOpen(false);
      onChanged?.(res);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to collect payment";
      toast.error(typeof msg === "string" ? msg : "Failed to collect payment");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!booking?.id && !booking?._id) return;
    const id = booking.id || booking._id;
    setBusy(true);
    try {
      const res = await bookingService.cancel(id);
      toast.success("Booking cancelled");
      setCancelConfirmOpen(false);
      onChanged?.(res);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to cancel booking";
      toast.error(typeof msg === "string" ? msg : "Failed to cancel booking");
    } finally {
      setBusy(false);
    }
  }

  function handleContact() {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    const cleaned = String(phone).replace(/\D/g, "").slice(-10);
    const waUrl = `whatsapp://send?phone=91${cleaned}`;
    Linking.openURL(waUrl).catch(() => {
      Linking.openURL(`tel:${cleaned}`).catch(() =>
        toast.error("Couldn't open contact app")
      );
    });
  }

  // ----------------- derived UI
  const idShort = booking.id ? `${String(booking.id).slice(0, 8)}...` : "—";
  const status = booking.status;
  const statusMeta = getStatusMeta(status);
  const StatusIcon = statusMeta.Icon;

  const gateway = booking.payment_gateway
    ? String(booking.payment_gateway).toUpperCase()
    : "CASHFREE";

  const turfLabel =
    booking.turf_name ||
    (booking.turf_number != null ? `Turf #${booking.turf_number}` : "Turf");

  const hostName =
    booking.host_name ||
    booking.customer_name ||
    booking.player_name ||
    "Guest";

  const lobbians = booking.num_players
    ? Number(booking.num_players)
    : Array.isArray(booking.players)
      ? booking.players.length + 1
      : null;

  const paymentMode =
    booking.payment_mode ||
    booking.payment_status ||
    (booking.collection_method ? booking.collection_method : null);

  const paidAt =
    booking.payment_details?.paid_at ||
    booking.paid_at ||
    booking.payment_details?.created_at ||
    null;

  const paymentId =
    booking.payment_details?.cf_payment_id ||
    booking.payment_id ||
    booking.cf_payment_id ||
    booking.payment_details?.test_payment_id ||
    booking.payment_details?.mock_payment_id ||
    null;

  const sportIconName = getSportIconName(
    booking.sport ? String(booking.sport).toLowerCase() : null
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.backdrop}
            onPress={onClose}
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  Booking Details
                </Text>
                <Text style={styles.subTitle} numberOfLines={1}>
                  Booking ID: {idShort}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Status banner */}
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                ]}
              >
                <View style={styles.statusLeft}>
                  <StatusIcon size={16} color={statusMeta.fg} />
                  <Text style={[styles.statusLabel, { color: statusMeta.fg }]}>
                    {statusMeta.label}
                  </Text>
                  {isWalkIn ? (
                    <View style={styles.walkinPill}>
                      <Text style={styles.walkinPillText}>WALK-IN</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.gatewayPill}>
                  <Text style={styles.gatewayText}>{gateway}</Text>
                </View>
              </View>

              {/* Card #1 — Booking info grid */}
              <View style={styles.card}>
                <View style={styles.gridRow}>
                  <GridCell label="VENUE" value={booking.venue_name || "—"} />
                  <GridCell label="HOST" value={hostName} />
                </View>
                <View style={styles.gridRow}>
                  <GridCell label="DATE" value={fmtDateLong(booking.date) || "—"} />
                  <GridCell
                    label="TIME"
                    value={`${fmtTime(booking.start_time)} - ${fmtTime(booking.end_time)}`}
                  />
                </View>
                <View style={styles.gridRow}>
                  <GridCell label="TURF" value={turfLabel} />
                  <GridCell
                    label="SPORT"
                    value={titleCase(booking.sport) || "—"}
                    leadingIcon={
                      booking.sport ? (
                        <Ionicons
                          name={sportIconName}
                          size={13}
                          color="#111827"
                        />
                      ) : null
                    }
                  />
                </View>
                {lobbians ? (
                  <View style={styles.gridRow}>
                    <GridCell label="LOBBIANS" value={String(lobbians)} />
                    <View style={styles.gridCellEmpty} />
                  </View>
                ) : null}
              </View>

              {/* Card #2 — Payment */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <CreditCard size={15} color={PRIMARY_COLOR} />
                  <Text style={styles.cardHeaderTitle}>Payment</Text>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCell}>
                    <Text style={styles.gridLabel}>YOUR EARNINGS</Text>
                    <Text style={styles.bigEarnings}>{fmtMoney(yourEarnings)}</Text>
                  </View>
                  <View style={styles.gridCell}>
                    <Text style={styles.gridLabel}>BOOKING AMOUNT</Text>
                    <Text style={styles.gridValue}>{fmtMoney(total)}</Text>
                    {commission > 0 || gst > 0 ? (
                      <Text style={styles.gridSubtext}>
                        (-{fmtMoney(commission)} commission
                        {gst > 0 ? ` -${fmtMoney(gst)} GST` : ""})
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <GridCell
                    label="PAYMENT MODE"
                    value={titleCase(paymentMode) || "Full"}
                  />
                  <GridCell
                    label="GATEWAY"
                    value={titleCase(booking.payment_gateway) || "Cashfree"}
                  />
                </View>

                {paidAt ? (
                  <View style={styles.kvRow}>
                    <Text style={styles.gridLabel}>PAID AT</Text>
                    <Text style={styles.gridValue}>{fmtDateTimeDDMM(paidAt)}</Text>
                  </View>
                ) : null}

                {paymentId ? (
                  <View style={styles.kvRow}>
                    <Text style={styles.gridLabel}>PAYMENT ID</Text>
                    <Text
                      style={[styles.gridValue, styles.mono]}
                      numberOfLines={1}
                    >
                      {paymentId}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Card — Advance breakdown (walk-in only) */}
              {isWalkIn &&
              booking.payment_status &&
              booking.payment_status !== "full" ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <CreditCard size={15} color="#D97706" />
                    <Text style={styles.cardHeaderTitle}>Payment Breakdown</Text>
                    <View
                      style={[
                        styles.statusPillRight,
                        booking.payment_status === "settled"
                          ? styles.statusPillRightSettled
                          : styles.statusPillRightAdvance,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillRightText,
                          booking.payment_status === "settled"
                            ? { color: PRIMARY_COLOR }
                            : { color: "#B45309" },
                        ]}
                      >
                        {booking.payment_status === "settled"
                          ? "Fully Settled"
                          : "Advance Paid"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>TOTAL</Text>
                      <Text style={styles.gridValue}>{fmtMoney(total)}</Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>ADVANCE</Text>
                      <Text style={[styles.gridValue, { color: "#B45309" }]}>
                        {fmtMoney(advance)}
                      </Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>REMAINING</Text>
                      <Text
                        style={[
                          styles.gridValue,
                          {
                            color:
                              remaining > 0 ? "#B91C1C" : PRIMARY_COLOR,
                          },
                        ]}
                      >
                        {remaining > 0 ? fmtMoney(remaining) : "Settled"}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Card #3 — Timeline */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <History size={15} color="#6B7280" />
                  <Text style={styles.cardHeaderTitle}>Timeline</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.timelineLabel}>Created</Text>
                  <Text style={styles.timelineValue}>
                    {fmtDateTimeDDMM(booking.created_at)}
                  </Text>
                </View>
                {isConfirmed && paidAt ? (
                  <View style={styles.kvRow}>
                    <Text style={styles.timelineLabel}>Confirmed at</Text>
                    <Text style={styles.timelineValue}>
                      {fmtDateTimeDDMM(paidAt)}
                    </Text>
                  </View>
                ) : null}
                {booking.cancelled_at ? (
                  <View style={styles.kvRow}>
                    <Text style={styles.timelineLabel}>Cancelled at</Text>
                    <Text style={styles.timelineValue}>
                      {fmtDateTimeDDMM(booking.cancelled_at)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {isWalkIn && remaining > 0 ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => setMethodPickerOpen(true)}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    <CreditCard size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>
                      Collect Remaining {fmtMoney(remaining)}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {isCancellable ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger]}
                    onPress={() => setCancelConfirmOpen(true)}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    <X size={16} color="#FFFFFF" />
                    <Text style={styles.btnDangerText}>Cancel Booking</Text>
                  </TouchableOpacity>
                ) : null}

                {phone ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={handleContact}
                    activeOpacity={0.85}
                  >
                    <Phone size={16} color="#111827" />
                    <Text style={styles.btnSecondaryText}>Contact Player</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Method picker overlay */}
      <Modal
        visible={methodPickerOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !busy && setMethodPickerOpen(false)}
      >
        <View style={pickStyles.overlay}>
          <View style={pickStyles.card}>
            <Text style={pickStyles.title}>Collect Payment</Text>
            <Text style={pickStyles.sub}>
              {fmtMoney(remaining)} remaining · how was it collected?
            </Text>
            <View style={pickStyles.btnRow}>
              {[
                { v: "cash", label: "Cash" },
                { v: "upi", label: "UPI" },
                { v: "bank_transfer", label: "Bank" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.v}
                  style={pickStyles.methodBtn}
                  onPress={() => handleCollect(opt.v)}
                  activeOpacity={0.85}
                  disabled={busy}
                >
                  <Text style={pickStyles.methodBtnText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={pickStyles.cancelBtn}
              onPress={() => !busy && setMethodPickerOpen(false)}
              activeOpacity={0.7}
              disabled={busy}
            >
              <Text style={pickStyles.cancelBtnText}>
                {busy ? "Working…" : "Cancel"}
              </Text>
            </TouchableOpacity>
            {busy ? (
              <View style={pickStyles.busyOverlay}>
                <ActivityIndicator color={PRIMARY_COLOR} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Cancel confirm with refund preview */}
      <Modal
        visible={cancelConfirmOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !busy && setCancelConfirmOpen(false)}
      >
        <View style={pickStyles.overlay}>
          <View style={pickStyles.card}>
            <Text style={pickStyles.title}>Cancel Booking?</Text>
            <Text style={pickStyles.sub}>
              This will cancel the booking and free the slot. Refund follows the
              tier below.
            </Text>
            <View style={{ marginVertical: 12 }}>
              <RefundPreview booking={booking} />
            </View>
            <View style={pickStyles.confirmRow}>
              <TouchableOpacity
                style={[pickStyles.confirmBtn, pickStyles.confirmBtnSecondary]}
                onPress={() => !busy && setCancelConfirmOpen(false)}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={pickStyles.confirmBtnSecondaryText}>
                  Keep Booking
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pickStyles.confirmBtn, pickStyles.confirmBtnDanger]}
                onPress={handleCancel}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={pickStyles.confirmBtnDangerText}>
                  {busy ? "Cancelling…" : "Confirm Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function GridCell({ label, value, leadingIcon }) {
  return (
    <View style={styles.gridCell}>
      <Text style={styles.gridLabel}>{label}</Text>
      <View style={styles.gridValueRow}>
        {leadingIcon ? (
          <View style={{ marginRight: 4 }}>{leadingIcon}</View>
        ) : null}
        <Text style={styles.gridValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ----------------------------------------------------- styles
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
  },
  subTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${PRIMARY_COLOR}0F`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // status banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
  },
  walkinPill: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  walkinPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#B45309",
    letterSpacing: 0.6,
  },
  gatewayPill: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  gatewayText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#6B7280",
    letterSpacing: 0.8,
  },

  // cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    flex: 1,
  },
  statusPillRight: {
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  statusPillRightSettled: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    borderColor: `${PRIMARY_COLOR}4D`,
  },
  statusPillRightAdvance: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  statusPillRightText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  // grid
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  gridCellEmpty: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#111827",
    flexShrink: 1,
  },
  gridValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridSubtext: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    marginTop: 2,
  },
  mono: {
    fontFamily: FONTS.body,
  },
  bigEarnings: {
    fontSize: 22,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    letterSpacing: -0.4,
  },
  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  // timeline rows
  timelineLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
  },
  timelineValue: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#111827",
  },

  // actions
  actions: {
    marginTop: 6,
    gap: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 9999,
    paddingHorizontal: 18,
  },
  btnPrimary: {
    backgroundColor: PRIMARY_COLOR,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnDanger: {
    backgroundColor: "#DC2626",
  },
  btnDangerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  btnSecondaryText: {
    color: "#111827",
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});

const pickStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  methodBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  methodBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  confirmRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnSecondary: {
    backgroundColor: "#F3F4F6",
  },
  confirmBtnSecondaryText: {
    color: "#475569",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 13,
  },
  confirmBtnDanger: {
    backgroundColor: "#DC2626",
  },
  confirmBtnDangerText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 13,
  },
});
