import { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  X,
  Info,
  CheckCircle,
  AlertCircle,
  CreditCard,
  History,
  RotateCcw,
} from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import bookingService from "../../services/bookingService";
import toast from "../../utils/toast";
import { getSportIconName } from "../../constants/venueConstants";

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

// Short payment-history timestamp — exact frontend parity (12-hour, en-IN).
// VenueOwnerDashboard.js:2316 → "8 May, 06:15 pm"
function fmtPaymentTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
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
  const [collectConfirmOpen, setCollectConfirmOpen] = useState(false);
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

  if (!booking) return null;

  // ----------------- actions
  // Mirrors frontend `bookingAPI.collectRemaining(id, { method: "cash" })`
  // and the "Collect Remaining Payment?" confirmation dialog. Method is
  // HARDCODED as cash (matches frontend; mobile previously asked the user
  // to pick Cash / UPI / Bank — that was an extra not in frontend).
  async function handleCollect() {
    if (!booking?.id && !booking?._id) return;
    const id = booking.id || booking._id;
    setBusy(true);
    try {
      const res = await bookingService.collectRemaining(id, "cash");
      toast.success(
        `Remaining ${fmtMoney(remaining)} collected successfully!`
      );
      setCollectConfirmOpen(false);
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

  // Frontend cancels directly on button tap with no confirmation dialog
  // (VenueOwnerDashboard.js:980-994). Mirroring that behaviour — mobile
  // previously had a confirmation modal with RefundPreview, removed.
  async function handleCancel() {
    if (!booking?.id && !booking?._id) return;
    const id = booking.id || booking._id;
    setBusy(true);
    try {
      const res = await bookingService.cancel(id);
      toast.success("Booking cancelled");
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
                        <MaterialCommunityIcons
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

                  {/* Per-payment history — exact frontend parity
                      (VenueOwnerDashboard.js:2306-2321). Renders one row per
                      payment entry with type, method, amount, and timestamp. */}
                  {Array.isArray(booking.payment_history) &&
                  booking.payment_history.length > 0 ? (
                    <View style={styles.paymentHistoryWrap}>
                      <Text style={styles.paymentHistoryHeading}>
                        Payment History
                      </Text>
                      {booking.payment_history.map((ph, idx) => {
                        const typeLabel =
                          ph.type === "advance"
                            ? "Advance"
                            : ph.type === "remaining"
                              ? "Remaining"
                              : "Full";
                        const methodLabel =
                          ph.method === "offline" ? "Cash" : ph.method || "";
                        return (
                          <View
                            key={`ph-${idx}`}
                            style={styles.paymentHistoryRow}
                          >
                            <Text style={styles.paymentHistoryLabel}>
                              {typeLabel} ({methodLabel})
                            </Text>
                            <Text style={styles.paymentHistoryAmount}>
                              {fmtMoney(ph.amount)}
                            </Text>
                            <Text style={styles.paymentHistoryTime}>
                              {fmtPaymentTime(ph.recorded_at)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
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
                {/* Frontend timeline shows only Created + Confirmed at; the
                    "Cancelled at" row was a mobile-only extra and has been
                    removed for parity (VenueOwnerDashboard.js:2411-2455). */}
              </View>

              {/* Refund Breakdown (cancelled bookings) — mirrors
                  VenueOwnerDashboard.js:2457-2521. Shown only when status is
                  cancelled AND refund_pct > 0. */}
              {booking.status === "cancelled" &&
              Number(booking.refund_pct) > 0 ? (
                <View style={[styles.card, styles.refundCard]}>
                  <View style={styles.cardHeader}>
                    <RotateCcw size={15} color="#EF4444" />
                    <Text style={[styles.cardHeaderTitle, { color: "#EF4444" }]}>
                      Refund Breakdown
                    </Text>
                  </View>
                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>REFUND TIER</Text>
                      <Text style={[styles.gridValue, { color: "#EF4444" }]}>
                        {booking.refund_pct}%
                      </Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>REFUND STATUS</Text>
                      <Text style={styles.gridValue}>
                        {titleCase(booking.refund_status) || "N/A"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>PLAYER REFUND</Text>
                      <Text style={styles.gridValue}>
                        {fmtMoney(booking.refund_amount)}
                      </Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>YOUR DEDUCTION</Text>
                      <Text style={[styles.gridValue, { color: "#EF4444" }]}>
                        -
                        {fmtMoney(
                          (Number(booking.refund_amount) || 0) -
                            Math.round(
                              ((Number(booking.commission_amount) || 0) *
                                (Number(booking.refund_pct) || 0)) /
                                100
                            )
                        )}
                      </Text>
                    </View>
                  </View>
                  {booking.cancelled_at ? (
                    <View style={styles.refundFooter}>
                      <Text style={styles.refundFooterText}>
                        Cancelled at {fmtDateTimeDDMM(booking.cancelled_at)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Actions — mirrors frontend exactly:
                  - Collect Remaining (walk-in + remaining > 0) opens the
                    "Collect Remaining Payment?" confirm; cash hardcoded.
                  - Cancel Booking fires the cancel API directly with no
                    confirmation (frontend does the same).
                  - NO "Contact Player" button — that was a mobile-only extra. */}
              <View style={styles.actions}>
                {isWalkIn && remaining > 0 ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => setCollectConfirmOpen(true)}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    <CreditCard size={16} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>
                      Collect Remaining {fmtMoney(remaining)}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Cancel — frontend parity (VenueOwnerDashboard.js:2523-2538):
                    venue owners can ONLY cancel walk-in bookings; online
                    (player-paid) bookings must be cancelled by the player. */}
                {isCancellable && isWalkIn ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger]}
                    onPress={handleCancel}
                    activeOpacity={0.85}
                    disabled={busy}
                  >
                    <X size={16} color="#FFFFFF" />
                    <Text style={styles.btnDangerText}>
                      {busy ? "Cancelling..." : "Cancel Booking"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Collect Remaining Payment? — single-step confirm dialog mirroring
          frontend (VenueOwnerDashboard.js:4153-4194). Cash is hardcoded;
          mobile previously asked the user to pick Cash / UPI / Bank — that
          method picker was an extra not in frontend. */}
      <Modal
        visible={collectConfirmOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !busy && setCollectConfirmOpen(false)}
      >
        <View style={pickStyles.overlay}>
          <View style={pickStyles.card}>
            <Text style={pickStyles.title}>Collect Remaining Payment?</Text>
            <Text style={pickStyles.sub}>
              This will mark{" "}
              <Text style={pickStyles.subStrong}>{fmtMoney(remaining)}</Text>{" "}
              as collected via cash. This action cannot be undone.
            </Text>
            <View style={pickStyles.confirmRow}>
              <TouchableOpacity
                style={[pickStyles.confirmBtn, pickStyles.confirmBtnSecondary]}
                onPress={() => !busy && setCollectConfirmOpen(false)}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={pickStyles.confirmBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pickStyles.confirmBtn, pickStyles.confirmBtnAmber]}
                onPress={handleCollect}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={pickStyles.confirmBtnAmberText}>
                  {busy ? "Collecting…" : "Collect Payment"}
                </Text>
              </TouchableOpacity>
            </View>
            {busy ? (
              <View style={pickStyles.busyOverlay}>
                <ActivityIndicator color={PRIMARY_COLOR} />
              </View>
            ) : null}
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
    maxHeight: "95%",
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
  /* Payment history list (walk-in only) — mirrors frontend
     VenueOwnerDashboard.js:2306-2321 */
  paymentHistoryWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 6,
  },
  paymentHistoryHeading: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  paymentHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentHistoryLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  paymentHistoryAmount: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#111827",
  },
  paymentHistoryTime: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#6B7280",
    minWidth: 100,
    textAlign: "right",
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

  // refund breakdown card (cancelled bookings)
  refundCard: {
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  refundFooter: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(239, 68, 68, 0.1)",
  },
  refundFooterText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
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
  // Bold amount inline in the confirm body — mirrors frontend's
  // `font-semibold text-foreground` span on the rupee amount.
  subStrong: {
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#111827",
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
  // Amber-600 — matches frontend's "Collect Payment" confirm button
  // (bg-amber-600 hover:bg-amber-700 text-white) in
  // VenueOwnerDashboard.js:4172.
  confirmBtnAmber: {
    backgroundColor: "#D97706",
  },
  confirmBtnAmberText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 13,
  },
});
