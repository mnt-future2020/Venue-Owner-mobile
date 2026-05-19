import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CalendarDays, Clock, ChevronRight } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import { getSportIconName } from "../../utils/sportIcons";

// ── helpers ─────────────────────────────────────────────────────────
function fmt12h(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return hhmm || "";
  const [hStr, mStr = "00"] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${mStr.padStart(2, "0")} ${period}`;
}

function titleCase(s) {
  if (!s) return "";
  return s
    .toString()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString("en-IN")}`;
}

// Mirror of frontend's statusConfig (VenueOwnerDashboard.js:1061)
const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmed",
    bg: "rgba(16, 185, 129, 0.15)",
    fg: "#059669",
    border: "rgba(16, 185, 129, 0.30)",
  },
  pending: {
    label: "Pending",
    bg: "rgba(245, 158, 11, 0.15)",
    fg: "#D97706",
    border: "rgba(245, 158, 11, 0.30)",
  },
  payment_pending: {
    label: "Awaiting Payment",
    bg: "rgba(14, 165, 233, 0.15)",
    fg: "#0284C7",
    border: "rgba(14, 165, 233, 0.30)",
  },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(239, 68, 68, 0.15)",
    fg: "#DC2626",
    border: "rgba(239, 68, 68, 0.20)",
  },
  expired: {
    label: "Expired",
    bg: "rgba(100, 116, 139, 0.15)",
    fg: "#64748B",
    border: "rgba(100, 116, 139, 0.20)",
  },
  completed: {
    label: "Completed",
    bg: "rgba(59, 130, 246, 0.15)",
    fg: "#2563EB",
    border: "rgba(59, 130, 246, 0.30)",
  },
  "no-show": {
    label: "No-Show",
    bg: "rgba(239, 68, 68, 0.15)",
    fg: "#DC2626",
    border: "rgba(239, 68, 68, 0.20)",
  },
  no_show: {
    label: "No-Show",
    bg: "rgba(239, 68, 68, 0.15)",
    fg: "#DC2626",
    border: "rgba(239, 68, 68, 0.20)",
  },
};

// Mirror of frontend amount: total - commission - gst (VenueOwnerDashboard.js:1767)
function netAmount(b) {
  const total = Number(b.total_amount) || 0;
  const commission = Number(b.commission_amount) || 0;
  const gst = Number(b.gst_on_commission) || 0;
  return total - commission - gst;
}

export default function BookingRow({ booking, onPress }) {
  if (!booking) return null;

  const isWalkIn =
    booking.booking_type === "walk_in" || booking.booking_type === "walkin";

  const displayName = isWalkIn
    ? booking.customer_name || booking.host_name || "Guest"
    : booking.host_name || booking.customer_name || "Guest";

  const venueLine =
    booking.turf_number != null
      ? `${booking.venue_name || ""} - Turf #${booking.turf_number}`
      : booking.venue_name || "";

  const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  const sportIcon = booking.sport
    ? getSportIconName(String(booking.sport).toLowerCase())
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(booking)}
      activeOpacity={0.85}
    >
      {/* Top row: name + walkin pill | status + chevron */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {isWalkIn ? (
              <View style={styles.walkinPill}>
                <Text style={styles.walkinPillText}>Walk-in</Text>
              </View>
            ) : null}
          </View>
          {venueLine ? (
            <Text style={styles.venueLine} numberOfLines={1}>
              {venueLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.topRight}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: sc.bg, borderColor: sc.border },
            ]}
          >
            <Text style={[styles.statusPillText, { color: sc.fg }]}>
              {sc.label}
            </Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </View>
      </View>

      {/* Bottom row: date · time · sport | net amount */}
      <View style={styles.bottomRow}>
        <View style={styles.metaWrap}>
          {booking.date ? (
            <View style={styles.metaItem}>
              <CalendarDays size={12} color="#6B7280" />
              <Text style={styles.metaText}>{booking.date}</Text>
            </View>
          ) : null}
          {booking.start_time ? (
            <View style={styles.metaItem}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.metaText}>
                {fmt12h(booking.start_time)}-{fmt12h(booking.end_time)}
              </Text>
            </View>
          ) : null}
          {booking.sport ? (
            <View style={styles.metaItem}>
              {sportIcon ? (
                <Ionicons name={sportIcon} size={12} color="#6B7280" />
              ) : null}
              <Text style={styles.metaText}>{titleCase(booking.sport)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.amount}>{fmtMoney(netAmount(booking))}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  topLeft: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 15,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  venueLine: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },

  topRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 2,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  walkinPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.30)",
    backgroundColor: "transparent",
  },
  walkinPillText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.3,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metaWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    flex: 1,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    fontWeight: "500",
    color: "#6B7280",
  },

  amount: {
    fontSize: 14,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    letterSpacing: -0.2,
  },
});
