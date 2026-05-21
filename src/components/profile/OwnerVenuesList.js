import { StyleSheet, Text, View } from "react-native";
import { Building2, MapPin, Star } from "lucide-react-native";
import { FONTS, PRIMARY_COLOR } from "../../constants/theme";
import EmptyState from "../ui/EmptyState";

// Mirrors frontend VenuesList for venue_owner profile.
// Header: "My Venues" + count.
// Per venue: name, city (+ area), status pill, sports chips, 3 stat boxes
// (Bookings / Revenue / Rating).
export default function OwnerVenuesList({ ownerVenues = [], venueAnalytics = {}, reviewSummaries = {} }) {
  if (ownerVenues.length === 0) {
    return (
      <View style={{ paddingVertical: 28 }}>
        <EmptyState
          icon={Building2}
          title="No venues added yet"
          subtitle="Add your first venue to get started"
        />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Building2 size={18} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <View>
          <Text style={styles.headerTitle}>My Venues</Text>
          <Text style={styles.headerSub}>
            {ownerVenues.length} venue{ownerVenues.length !== 1 ? "s" : ""} registered
          </Text>
        </View>
      </View>

      <View style={styles.cardsCol}>
        {ownerVenues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            analytics={venueAnalytics[venue.id] || {}}
            reviewSummary={reviewSummaries[venue.id]}
          />
        ))}
      </View>
    </View>
  );
}

function VenueCard({ venue, analytics, reviewSummary }) {
  const rating = reviewSummary?.avg_rating ?? reviewSummary?.average_rating;
  const ratingDisplay = rating !== undefined && rating !== null ? Number(rating).toFixed(1) : "N/A";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardName} numberOfLines={1}>{venue.name}</Text>
          <View style={styles.cityRow}>
            <MapPin size={12} color="#94A3B8" />
            <Text style={styles.cityText} numberOfLines={1}>
              {venue.city || ""}
              {venue.area ? `, ${venue.area}` : ""}
            </Text>
          </View>
        </View>
        <View style={[styles.statusPill, venue.status === "active" ? styles.statusActive : styles.statusOther]}>
          <Text style={[styles.statusText, venue.status === "active" ? styles.statusActiveText : styles.statusOtherText]}>
            {(venue.status || "active").toUpperCase()}
          </Text>
        </View>
      </View>

      {Array.isArray(venue.sports) && venue.sports.length > 0 ? (
        <View style={styles.sportsRow}>
          {venue.sports.map((sport) => (
            <View key={sport} style={styles.sportChip}>
              <Text style={styles.sportChipText}>{String(sport).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <StatBox label="Bookings" value={String(analytics.total_bookings || 0)} />
        <StatBox label="Revenue" value={`₹${(analytics.total_revenue || 0).toLocaleString("en-IN")}`} />
        <StatBox
          label="Rating"
          value={
            <View style={styles.ratingValue}>
              <Star size={12} color="#F59E0B" />
              <Text style={styles.statValueText}>{ratingDisplay}</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      {typeof value === "string" ? (
        <Text style={styles.statValueText}>{value}</Text>
      ) : (
        value
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: FONTS.displayBold, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 11, color: "#6B7280", fontFamily: FONTS.body, marginTop: 2 },

  cardsCol: { gap: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#111827", marginBottom: 4 },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cityText: { fontSize: 12, color: "#6B7280", fontFamily: FONTS.body, flexShrink: 1 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  statusActive: { backgroundColor: `${PRIMARY_COLOR}1A`, borderColor: `${PRIMARY_COLOR}55` },
  statusOther: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  statusText: { fontSize: 9, fontFamily: FONTS.bodyExtraBold, fontWeight: "900", letterSpacing: 1.2 },
  statusActiveText: { color: PRIMARY_COLOR },
  statusOtherText: { color: "#64748B" },

  sportsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sportChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  sportChipText: { fontSize: 9, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#475569", letterSpacing: 0.6 },

  statsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  statValueText: { fontSize: 13, fontFamily: FONTS.displayBold, fontWeight: "700", color: "#0F172A" },
  statLabel: { fontSize: 9, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#6B7280", letterSpacing: 0.8, textTransform: "uppercase" },

  ratingValue: { flexDirection: "row", alignItems: "center", gap: 4 },
});
