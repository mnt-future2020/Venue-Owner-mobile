// Mirror of frontend CoachListingSkeleton (SkeletonLoader.js:897-945).
// Header + button / description / search + filter / coach cards (avatar + name + chips + price).
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function CoachingSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <SkeletonText width={64} height={10} />
          <SkeletonText width={192} height={28} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBox width={120} height={42} radius={12} />
      </View>
      <SkeletonText width="100%" height={14} style={{ marginTop: 10, marginBottom: 18 }} />

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <SkeletonBox style={{ flex: 1 }} height={42} radius={12} />
        <SkeletonBox width={120} height={42} radius={12} />
      </View>

      {/* Coach cards — matches frontend CoachListingSkeleton (6 cards) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.coachCard}>
          <SkeletonCircle size={56} />
          <View style={styles.coachInfo}>
            <SkeletonText width={128} height={18} />
            <SkeletonText width="100%" height={12} style={{ marginTop: 8 }} />
            <SkeletonText width="75%" height={12} style={{ marginTop: 6 }} />
            <View style={styles.chipsRow}>
              <SkeletonBox width={56} height={18} radius={999} />
              <SkeletonBox width={56} height={18} radius={999} />
              <SkeletonBox width={72} height={18} radius={999} />
            </View>
          </View>
          <View style={styles.coachRight}>
            <SkeletonText width={64} height={20} />
            <SkeletonText width={48} height={10} style={{ marginTop: 6 }} />
            <SkeletonBox width={64} height={32} radius={999} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  headerRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  coachCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 16,
    marginBottom: 12,
  },
  coachInfo: { flex: 1 },
  coachRight: { alignItems: "flex-end" },
  chipsRow: { flexDirection: "row", gap: 6, marginTop: 10 },
});
