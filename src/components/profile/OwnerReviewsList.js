import { StyleSheet, Text, View } from "react-native";
import { MapPin, Star } from "lucide-react-native";
import { FONTS, PRIMARY_COLOR } from "../../constants/theme";

// Mirrors frontend ReviewsList — header with total review/venue count
// then a card per venue: MapPin + name + city/area + amber rating badge.
export default function OwnerReviewsList({ ownerVenues = [], reviewSummaries = {} }) {
  if (ownerVenues.length === 0) {
    return (
      <View style={styles.emptyAllWrap}>
        <View style={styles.emptyAllIcon}>
          <Star size={26} color="rgba(245, 158, 11, 0.5)" />
        </View>
        <Text style={styles.emptyAllTitle}>No venues registered</Text>
        <Text style={styles.emptyAllSub}>Add a venue to start receiving reviews</Text>
      </View>
    );
  }

  const totalReviewsAll = ownerVenues.reduce((sum, v) => {
    const s = reviewSummaries[v.id];
    return sum + (s?.total ?? s?.total_reviews ?? 0);
  }, 0);

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Star size={18} color="#F59E0B" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Customer Reviews</Text>
          <Text style={styles.headerSub}>
            {totalReviewsAll} {totalReviewsAll === 1 ? "review" : "reviews"} across {ownerVenues.length}{" "}
            {ownerVenues.length === 1 ? "venue" : "venues"}
          </Text>
        </View>
      </View>

      <View style={styles.cardsCol}>
        {ownerVenues.map((venue) => (
          <VenueReviewCard
            key={venue.id}
            venue={venue}
            reviewSummary={reviewSummaries[venue.id] || { avg_rating: 0, total: 0 }}
          />
        ))}
      </View>
    </View>
  );
}

function VenueReviewCard({ venue, reviewSummary }) {
  const avg = Number(reviewSummary.avg_rating ?? reviewSummary.average_rating ?? 0);
  const total = Number(reviewSummary.total ?? reviewSummary.total_reviews ?? 0);
  const distribution = reviewSummary.distribution ?? reviewSummary.rating_distribution ?? {};
  const hasReviews = total > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.pinBox}>
            <MapPin size={16} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
            <Text style={styles.venueCity} numberOfLines={1}>
              {venue.city || ""}
              {venue.area ? `, ${venue.area}` : ""}
            </Text>
          </View>
        </View>
        {hasReviews ? (
          <View style={styles.ratingBadge}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingValue}>{avg.toFixed(1)}</Text>
            <Text style={styles.ratingTotal}>({total})</Text>
          </View>
        ) : (
          <View style={styles.noRatingBadge}>
            <Text style={styles.noRatingText}>No reviews</Text>
          </View>
        )}
      </View>

      {/* Distribution bars — 5★ down to 1★, each filled amber proportional
          to the count for that rating bucket. Matches frontend ReviewsList. */}
      {hasReviews ? (
        <View style={styles.distWrap}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = Number(distribution[star] ?? distribution[String(star)] ?? 0);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <View key={star} style={styles.distRow}>
                <View style={styles.distLabel}>
                  <Text style={styles.distStarNumber}>{star}</Text>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                </View>
                <View style={styles.distBarTrack}>
                  <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyAllWrap: {
    paddingVertical: 56,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  emptyAllIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyAllTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "rgba(15, 23, 42, 0.7)" },
  emptyAllSub: { fontSize: 12, color: "rgba(100, 116, 139, 0.55)", marginTop: 4 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#0F172A" },
  headerSub: { fontSize: 11, color: "rgba(100, 116, 139, 0.6)", marginTop: 2 },

  cardsCol: { gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  pinBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: { flex: 1, minWidth: 0 },
  venueName: { fontSize: 13, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#0F172A" },
  venueCity: { fontSize: 11, color: "rgba(100, 116, 139, 0.5)", marginTop: 2 },

  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
  },
  ratingValue: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  ratingTotal: { fontSize: 10, color: "rgba(100, 116, 139, 0.5)" },
  noRatingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  noRatingText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8 },

  /* Rating distribution bars (5★ → 1★) */
  distWrap: { marginTop: 14, gap: 6 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  distLabel: { flexDirection: "row", alignItems: "center", gap: 3, width: 24 },
  distStarNumber: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  distBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 9999,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 9999,
  },
  distCount: { fontSize: 11, fontWeight: "600", color: "#64748B", minWidth: 16, textAlign: "right" },
});
