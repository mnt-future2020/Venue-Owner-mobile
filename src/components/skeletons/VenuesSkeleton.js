// Mirror of frontend VenueDiscoverySkeleton (SkeletonLoader.js:688-723).
// Search bar / filter chips / venue cards grid (single column on mobile).
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

export default function VenuesSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Search bar */}
      <SkeletonBox width="100%" height={48} radius={14} style={{ marginBottom: 16 }} />

      {/* Filter chips */}
      <View style={styles.filters}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} width={88} height={34} radius={999} />
        ))}
      </View>

      {/* Venue cards — matches frontend VenueDiscoverySkeleton (9 cards) */}
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.venueCard}>
          <SkeletonBox width="100%" height={180} radius={0} />
          <View style={styles.venueBody}>
            <SkeletonText width="80%" height={16} />
            <SkeletonText width="60%" height={12} style={{ marginTop: 8 }} />
            <View style={styles.venueFooter}>
              <SkeletonText width={64} height={14} />
              <SkeletonBox width={64} height={24} radius={999} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  filters: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  venueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    overflow: "hidden",
    marginBottom: 12,
  },
  venueBody: { padding: 16 },
  venueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
});
