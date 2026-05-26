// Mirror of frontend TournamentsSkeleton (SkeletonLoader.js:601-637).
// Header / search + 2 filter pills / tournament cards (single column on mobile).
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

export default function TournamentsSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <SkeletonText width={192} height={28} style={{ marginBottom: 8 }} />
      <SkeletonText width={224} height={14} style={{ marginBottom: 20 }} />

      {/* Search + filters */}
      <View style={styles.filters}>
        <SkeletonBox style={{ flex: 1 }} height={42} radius={12} />
        <SkeletonBox width={88} height={42} radius={12} />
      </View>

      {/* Tournament cards — matches frontend TournamentsSkeleton (6 cards) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.tournamentCard}>
          <SkeletonBox width="100%" height={180} radius={0} />
          <View style={styles.cardBody}>
            <SkeletonText width="100%" height={18} />
            <SkeletonText width="75%" height={14} style={{ marginTop: 10 }} />
            <View style={styles.cardFooter}>
              <SkeletonText width={96} height={14} />
              <SkeletonBox width={72} height={22} radius={999} />
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
  filters: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tournamentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    overflow: "hidden",
    marginBottom: 12,
  },
  cardBody: { padding: 20 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
});
