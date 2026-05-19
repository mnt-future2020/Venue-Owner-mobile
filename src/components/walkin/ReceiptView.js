import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  CheckCircle,
  Share2,
  Printer,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
} from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import toast from "../../utils/toast";

// react-native-print is a native module; import lazily so unit tests don't fail
let RNPrint = null;
try {
  // eslint-disable-next-line global-require
  RNPrint = require("react-native-print").default || require("react-native-print");
} catch (e) {
  RNPrint = null;
}

const fmt12h = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
};

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * ReceiptView — Phase 5 walk-in step 3
 *
 * Props:
 *  - booking: full booking response from createBooking (has checkin_token, qr_data, etc.)
 *  - venue: venue object
 *  - onDone: () => void  (navigate back to dashboard)
 */
export default function ReceiptView({ booking, venue, onDone }) {
  if (!booking) return null;

  const token = booking.checkin_token || booking.id || "";
  const qrValue =
    booking.qr_data ||
    (booking.id ? `HORIZON_CHECKIN:${booking.id}:${token}` : token);

  const date = booking.date || "";
  const startTime = booking.start_time || "";
  const endTime = booking.end_time || "";
  const turf = booking.turf_name || `Turf ${booking.turf_number || ""}`;
  const sport = booking.sport || "";
  const customerName = booking.customer_name || "";
  const customerPhone = booking.customer_phone || "";
  const total = booking.total_amount ?? booking.custom_price ?? 0;
  const advance = booking.advance_amount ?? 0;
  const due = Math.max(0, Number(total) - Number(advance));

  const receiptLines = () => [
    `*Receipt — ${venue?.name || "Venue"}*`,
    "",
    `Date: ${date}`,
    `Time: ${fmt12h(startTime)} - ${fmt12h(endTime)}`,
    `Turf: ${turf}${sport ? ` (${sport})` : ""}`,
    "",
    customerName ? `Customer: ${customerName}` : null,
    customerPhone ? `Phone: +91${customerPhone}` : null,
    "",
    `Total: ₹${total}`,
    advance ? `Advance Paid: ₹${advance}` : null,
    due ? `Due at Venue: ₹${due}` : null,
    "",
    `Check-in Token: ${token}`,
    "",
    "Show this token / QR at the venue to check in.",
  ].filter(Boolean);

  const handleShareWhatsApp = async () => {
    const text = receiptLines().join("\n");
    const phoneClean = (customerPhone || "").replace(/\D/g, "");
    const url = phoneClean
      ? `whatsapp://send?phone=91${phoneClean}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        // Fallback to web wa.me
        const fallback = phoneClean
          ? `https://wa.me/91${phoneClean}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`;
        await Linking.openURL(fallback);
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      toast.error("WhatsApp open failed", err?.message || "Try again.");
    }
  };

  const handlePrint = async () => {
    if (!RNPrint) {
      toast.error("Print unavailable", "Printing module is not installed.");
      return;
    }
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title>
<style>
  body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:6mm;font-size:12px;color:#111}
  table{width:100%;border-collapse:collapse}td{padding:2px 0}
  .center{text-align:center}.divider{border-top:1px dashed #999;margin:6px 0}
  .bold{font-weight:bold}.total{font-size:18px;font-weight:900}
  .small{font-size:10px;color:#555}.token{font-size:22px;letter-spacing:6px;font-weight:900;text-align:center;padding:8px;border:1px dashed #555;margin:8px 0}
</style></head><body>
  <div class="center"><b>${escapeHtml(venue?.name || "Venue")}</b><br/>
  <span class="small">Walk-in Booking Receipt</span></div>
  <div class="divider"></div>
  <table>
    <tr><td>Date</td><td style="text-align:right">${escapeHtml(date)}</td></tr>
    <tr><td>Time</td><td style="text-align:right">${escapeHtml(fmt12h(startTime))} - ${escapeHtml(fmt12h(endTime))}</td></tr>
    <tr><td>Turf</td><td style="text-align:right">${escapeHtml(turf)}</td></tr>
    ${sport ? `<tr><td>Sport</td><td style="text-align:right">${escapeHtml(sport)}</td></tr>` : ""}
    ${customerName ? `<tr><td>Customer</td><td style="text-align:right">${escapeHtml(customerName)}</td></tr>` : ""}
    ${customerPhone ? `<tr><td>Phone</td><td style="text-align:right">+91 ${escapeHtml(customerPhone)}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <table>
    <tr><td class="bold">Total</td><td style="text-align:right" class="total">₹${escapeHtml(total)}</td></tr>
    ${advance ? `<tr><td>Advance</td><td style="text-align:right">₹${escapeHtml(advance)}</td></tr>` : ""}
    ${due ? `<tr><td>Due</td><td style="text-align:right">₹${escapeHtml(due)}</td></tr>` : ""}
  </table>
  <div class="divider"></div>
  <div class="center small">Check-in Token</div>
  <div class="token">${escapeHtml(token)}</div>
  <p class="center small">Show this at the venue.</p>
</body></html>`.trim();

    try {
      await RNPrint.print({ html });
    } catch (err) {
      toast.error("Print failed", err?.message || "Try again.");
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Success header */}
      <View style={styles.successHeader}>
        <View style={styles.successIconWrap}>
          <CheckCircle size={28} color={PRIMARY_COLOR} strokeWidth={2.4} />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed</Text>
        <Text style={styles.successSubtitle}>
          Receipt is ready to share or print.
        </Text>
      </View>

      {/* Receipt card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{venue?.name || "Walk-in Booking"}</Text>

        <View style={styles.rowLine}>
          <Calendar size={14} color="#6B7280" strokeWidth={2.4} />
          <Text style={styles.rowLineText}>{date}</Text>
        </View>
        <View style={styles.rowLine}>
          <Clock size={14} color="#6B7280" strokeWidth={2.4} />
          <Text style={styles.rowLineText}>
            {fmt12h(startTime)} – {fmt12h(endTime)}
          </Text>
        </View>
        <View style={styles.rowLine}>
          <MapPin size={14} color="#6B7280" strokeWidth={2.4} />
          <Text style={styles.rowLineText}>
            {turf}
            {sport ? ` • ${sport}` : ""}
          </Text>
        </View>
        {customerName ? (
          <View style={styles.rowLine}>
            <User size={14} color="#6B7280" strokeWidth={2.4} />
            <Text style={styles.rowLineText}>{customerName}</Text>
          </View>
        ) : null}
        {customerPhone ? (
          <View style={styles.rowLine}>
            <Phone size={14} color="#6B7280" strokeWidth={2.4} />
            <Text style={styles.rowLineText}>+91 {customerPhone}</Text>
          </View>
        ) : null}

        <View style={styles.priceBlock}>
          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>Total</Text>
            <Text style={styles.priceVal}>₹{total}</Text>
          </View>
          {advance ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceKeyMuted}>Advance Paid</Text>
              <Text style={styles.priceValMuted}>₹{advance}</Text>
            </View>
          ) : null}
          {due ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceKeyMuted}>Due at Venue</Text>
              <Text style={styles.priceValDue}>₹{due}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* QR + token */}
      <View style={styles.qrCard}>
        <Text style={styles.qrLabel}>Check-in Token</Text>
        <Text style={styles.token}>{token}</Text>
        <View style={styles.qrBox}>
          <QRCode value={String(qrValue)} size={160} color="#111827" backgroundColor="#FFFFFF" />
        </View>
        <Text style={styles.qrCaption}>
          Show this code at the venue to check in.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPrimary]}
          onPress={handleShareWhatsApp}
          activeOpacity={0.85}
        >
          <Share2 size={14} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.actionPrimaryText}>Share via WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionSecondary]}
          onPress={handlePrint}
          activeOpacity={0.85}
        >
          <Printer size={14} color="#111827" strokeWidth={2.4} />
          <Text style={styles.actionSecondaryText}>Print</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={onDone}
        activeOpacity={0.85}
      >
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },

  successHeader: { alignItems: "center", marginTop: 4 },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 2,
  },
  successSubtitle: { fontSize: 12, color: "#6B7280" },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 24,
    padding: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  rowLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  rowLineText: { fontSize: 13, color: "#374151", fontWeight: "600" },

  priceBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  priceKey: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  priceVal: {
    fontSize: 18,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
  priceKeyMuted: { fontSize: 11, color: "#6B7280", fontWeight: "700" },
  priceValMuted: { fontSize: 13, color: "#374151", fontWeight: "700" },
  priceValDue: { fontSize: 13, color: "#D97706", fontWeight: "900" },

  qrCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  token: {
    fontFamily: "Courier",
    fontSize: 28,
    letterSpacing: 6,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
  },
  qrBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  qrCaption: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 10,
    textAlign: "center",
  },

  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionPrimary: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  actionSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  actionSecondaryText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  doneBtn: {
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    color: "#374151",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
