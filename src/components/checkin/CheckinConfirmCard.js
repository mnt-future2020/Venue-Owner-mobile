import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MapPin, Clock, User as UserIcon, Activity, CheckCircle } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

/**
 * Booking detail card shown after a successful QR / token resolve.
 *
 * Props:
 *  - booking: { venue_name, turf_name, turf_number, date, start_time, end_time,
 *               customer_name, host_name, sport }
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - loading: boolean
 */
export default function CheckinConfirmCard({ booking, onConfirm, onCancel, loading = false }) {
  if (!booking) return null;

  const turf = booking.turf_name || (booking.turf_number ? `Turf #${booking.turf_number}` : "Turf");
  const customer = booking.customer_name || booking.host_name || "Walk-in";
  const time =
    booking.start_time && booking.end_time
      ? `${booking.start_time} – ${booking.end_time}`
      : booking.start_time || "—";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBubble}>
          <CheckCircle size={22} color={PRIMARY_COLOR} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Booking Found</Text>
          <Text style={styles.title} numberOfLines={1}>
            {booking.venue_name || "Booking"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Row
        icon={<MapPin size={16} color="#6B7280" />}
        label="Turf"
        value={turf}
      />
      <Row
        icon={<Clock size={16} color="#6B7280" />}
        label="Time"
        value={time}
        sub={booking.date}
      />
      <Row
        icon={<UserIcon size={16} color="#6B7280" />}
        label="Customer"
        value={customer}
      />
      {booking.sport ? (
        <Row
          icon={<Activity size={16} color="#6B7280" />}
          label="Sport"
          value={String(booking.sport).charAt(0).toUpperCase() + String(booking.sport).slice(1)}
        />
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.8}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.btnDisabled]}
          activeOpacity={0.85}
          onPress={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmText}>Confirm Check-in</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ icon, label, value, sub }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  rowSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
