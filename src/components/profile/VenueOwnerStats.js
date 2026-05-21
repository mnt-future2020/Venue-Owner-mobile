import { StyleSheet, Text, View } from "react-native";
import { Building2, Calendar, IndianRupee, Star, TrendingUp } from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

// Mirrors frontend/src/components/profile/VenueOwnerStats.js — 4 stat cards
// in a 2x2 grid below a header row. Values aggregate across ownerVenues.
//
// Inputs:
//   ownerVenues       — array of venues
//   venueAnalytics    — { [venueId]: { total_bookings, total_revenue } }
//   reviewSummaries   — { [venueId]: { average_rating } }
export default function VenueOwnerStats({ ownerVenues = [], venueAnalytics = {}, reviewSummaries = {} }) {
  const totalBookings = Object.values(venueAnalytics || {}).reduce(
    (s, a) => s + (a?.total_bookings || 0),
    0
  );
  const totalRevenue = Object.values(venueAnalytics || {}).reduce(
    (s, a) => s + (a?.total_revenue || 0),
    0
  );
  const ratings = Object.values(reviewSummaries || {}).filter((r) => r?.average_rating > 0);
  const ratingSum = ratings.reduce((s, r) => s + (Number(r.average_rating) || 0), 0);
  const avgRating = ratings.length > 0 ? (ratingSum / ratings.length).toFixed(1) : "N/A";

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <TrendingUp size={18} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Business Overview</Text>
          <Text style={styles.headerSub}>Your venue performance metrics</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Card
          Icon={Building2}
          value={String(ownerVenues.length || 0)}
          label="Venues"
          tint={PRIMARY_COLOR}
        />
        <Card
          Icon={Calendar}
          value={String(totalBookings)}
          label="Bookings"
          tint={PRIMARY_COLOR}
        />
        <Card
          Icon={IndianRupee}
          value={`₹${(totalRevenue || 0).toLocaleString("en-IN")}`}
          label="Revenue"
          tint="#F59E0B"
        />
        <Card Icon={Star} value={avgRating} label="Avg Rating" tint={PRIMARY_COLOR} />
      </View>
    </View>
  );
}

function Card({ Icon, value, label, tint }) {
  return (
    <View style={[styles.card, { borderColor: `${tint}33`, backgroundColor: `${tint}1A` }]}>
      <Icon size={22} color={tint} strokeWidth={2.3} />
      <Text style={[styles.cardValue, { color: tint }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: FONTS.displayBold, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 11, color: "#6B7280", fontFamily: FONTS.body, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cardValue: { fontSize: 22, fontFamily: FONTS.displayBlack, fontWeight: "900", letterSpacing: -0.3 },
  cardLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
