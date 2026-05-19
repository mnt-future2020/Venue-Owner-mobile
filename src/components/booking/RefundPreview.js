import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Info } from "lucide-react-native";

/**
 * Matches backend formula (see VENUE_OWNER_IMPLEMENTATION_PLAN.md ref):
 *   ≥24h → 100%
 *   4–24h → 50%
 *   <4h  → 0%
 *
 * booking.date is expected as YYYY-MM-DD; start_time as HH:MM (24h).
 * Times are treated as IST. We don't try to be too clever — we just build
 * a local Date with explicit IST offset (+05:30) so previews remain correct
 * regardless of device timezone.
 */
function parseSlotISTtoUTC(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // dateStr: 2026-05-20, timeStr: "18:00" or "18:00:00"
  const isoLike = `${dateStr}T${timeStr.length === 5 ? timeStr + ":00" : timeStr}+05:30`;
  const t = Date.parse(isoLike);
  return Number.isNaN(t) ? null : t;
}

export function computeRefund(booking, now = Date.now()) {
  const amount = Number(booking?.total_amount ?? booking?.amount ?? 0) || 0;
  const slotMs = parseSlotISTtoUTC(booking?.date, booking?.start_time);
  if (!slotMs) {
    return { pct: 0, amount: 0, hoursUntil: 0, tier: "unknown" };
  }
  const hoursUntil = (slotMs - now) / (1000 * 60 * 60);
  let pct = 0;
  let tier = "none";
  if (hoursUntil >= 24) {
    pct = 100;
    tier = "full";
  } else if (hoursUntil >= 4) {
    pct = 50;
    tier = "half";
  } else {
    pct = 0;
    tier = "none";
  }
  const refundAmount = Math.floor((amount * pct) / 100);
  return { pct, amount: refundAmount, hoursUntil, tier };
}

const TIER_STYLE = {
  full: { bg: "#ECFDF5", border: "#A7F3D0", fg: "#047857", title: "Full refund eligible" },
  half: { bg: "#FEF3C7", border: "#FDE68A", fg: "#B45309", title: "Partial refund (50%)" },
  none: { bg: "#FEF2F2", border: "#FECACA", fg: "#B91C1C", title: "Not eligible for refund" },
  unknown: { bg: "#F1F5F9", border: "#E2E8F0", fg: "#475569", title: "Refund preview unavailable" },
};

export default function RefundPreview({ booking }) {
  const result = useMemo(() => computeRefund(booking), [booking]);
  const style = TIER_STYLE[result.tier] || TIER_STYLE.unknown;
  const hoursLabel = (() => {
    const h = result.hoursUntil;
    if (h <= 0) return "Slot already started";
    if (h < 1) return `${Math.round(h * 60)} min until slot`;
    if (h < 24) return `${h.toFixed(1)}h until slot`;
    return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h until slot`;
  })();

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
    >
      <Text style={[styles.title, { color: style.fg }]}>{style.title}</Text>
      <Text style={[styles.amount, { color: style.fg }]}>
        You'll refund ₹{result.amount.toLocaleString("en-IN")} ({result.pct}%)
      </Text>
      <Text style={styles.sub}>{hoursLabel}</Text>
      <View style={styles.infoRow}>
        <Info size={11} color="#64748B" />
        <Text style={styles.infoText}>
          Limit: max 3 full refunds per user per 7 days.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  title: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  infoText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
});
