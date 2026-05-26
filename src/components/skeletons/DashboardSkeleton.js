// Mirror of frontend PlayerDashboardSkeleton (SkeletonLoader.js:413-489).
// Welcome hero / 4 stat cards / quick search / 4 quick actions / 3 upcoming bookings.
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function DashboardSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome hero */}
      <View style={styles.hero}>
        <SkeletonText width={80} height={10} />
        <SkeletonText width="80%" height={26} style={{ marginTop: 12 }} />
        <SkeletonText width="100%" height={14} style={{ marginTop: 10 }} />
        <View style={styles.heroButtons}>
          <SkeletonBox width={128} height={44} radius={12} />
          <SkeletonBox width={160} height={44} radius={12} />
        </View>
      </View>

      {/* Stats grid: 2 x 2 */}
      <View style={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.statCard}>
            <View style={styles.statHeader}>
              <SkeletonText width={64} height={10} />
              <SkeletonBox width={36} height={36} radius={14} />
            </View>
            <SkeletonText width={64} height={26} style={{ marginTop: 16 }} />
          </View>
        ))}
      </View>

      {/* Quick search */}
      <View style={styles.searchCard}>
        <SkeletonText width={80} height={10} />
        <View style={styles.searchRow}>
          <SkeletonBox style={{ flex: 1 }} height={44} radius={12} />
          <SkeletonBox width={72} height={44} radius={12} />
        </View>
      </View>

      {/* Quick actions: 2 x 2 */}
      <View style={styles.actionsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} style={styles.actionCell} height={120} radius={20} />
        ))}
      </View>

      {/* Upcoming bookings */}
      <SkeletonText width={160} height={18} style={{ marginTop: 8, marginBottom: 12 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.bookingCard}>
          <View style={styles.bookingTop}>
            <View style={{ flex: 1 }}>
              <SkeletonText width="80%" height={14} />
              <SkeletonText width={96} height={10} style={{ marginTop: 8 }} />
            </View>
            <SkeletonBox width={72} height={22} radius={999} />
          </View>
          <View style={styles.bookingMeta}>
            <SkeletonText width={96} height={12} />
            <SkeletonText width={128} height={12} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 20,
    marginBottom: 16,
  },
  heroButtons: { flexDirection: "row", gap: 10, marginTop: 18 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 16,
  },
  statHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 16,
    marginBottom: 16,
  },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  actionCell: { flexBasis: "48%", flexGrow: 1 },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 16,
    marginBottom: 10,
  },
  bookingTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  bookingMeta: { flexDirection: "row", gap: 16, marginTop: 12 },
});
