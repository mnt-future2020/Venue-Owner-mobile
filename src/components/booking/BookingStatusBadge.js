import { View, Text, StyleSheet } from "react-native";

/**
 * Color-coded pill badge for booking.status.
 *
 * Backend statuses (see VENUE_OWNER_IMPLEMENTATION_PLAN Phase 4):
 *   pending → payment_pending → confirmed → completed | cancelled | no-show
 */
const STATUS_MAP = {
  confirmed: { label: "Confirmed", bg: "#ECFDF5", fg: "#059669", border: "#A7F3D0" },
  pending: { label: "Pending", bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A" },
  payment_pending: { label: "Payment Pending", bg: "#E0F2FE", fg: "#0369A1", border: "#BAE6FD" },
  completed: { label: "Completed", bg: "#F1F5F9", fg: "#475569", border: "#E2E8F0" },
  cancelled: { label: "Cancelled", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
  "no-show": { label: "No-Show", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
  no_show: { label: "No-Show", bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" },
};

export default function BookingStatusBadge({ status, size = "sm" }) {
  const meta = STATUS_MAP[status] || {
    label: status ? String(status).replace(/_/g, " ") : "Unknown",
    bg: "#F1F5F9",
    fg: "#475569",
    border: "#E2E8F0",
  };

  const isLg = size === "lg";

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: meta.bg,
          borderColor: meta.border,
          paddingHorizontal: isLg ? 12 : 10,
          paddingVertical: isLg ? 5 : 3,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: meta.fg, fontSize: isLg ? 12 : 10 },
        ]}
        numberOfLines={1}
      >
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
