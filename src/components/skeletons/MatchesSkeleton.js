// Mirror of frontend MatchmakingSkeleton (SkeletonLoader.js:807-843).
// Header / 3 filter pills / match cards.
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

export default function MatchesSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <SkeletonText width={192} height={28} style={{ marginBottom: 8 }} />
      <SkeletonText width={224} height={14} style={{ marginBottom: 20 }} />

      {/* Filters */}
      <View style={styles.filters}>
        <SkeletonBox width={120} height={42} radius={12} />
        <SkeletonBox width={120} height={42} radius={12} />
        <SkeletonBox width={120} height={42} radius={12} />
      </View>

      {/* Match cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.matchCard}>
          <View style={styles.matchHeader}>
            <SkeletonText width={128} height={18} />
            <SkeletonBox width={72} height={22} radius={999} />
          </View>
          <SkeletonText width="100%" height={14} style={{ marginTop: 12 }} />
          <SkeletonText width="75%" height={14} style={{ marginTop: 8 }} />
          <SkeletonBox width="100%" height={40} radius={12} style={{ marginTop: 16 }} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  filters: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  matchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 20,
    marginBottom: 12,
  },
  matchHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
