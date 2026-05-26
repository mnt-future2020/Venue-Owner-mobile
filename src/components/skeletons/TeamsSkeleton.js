// Mirror of frontend TeamsSkeleton (SkeletonLoader.js:640-685).
// Header / 2 tabs / search / team cards (avatar + name + content + button).
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function TeamsSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <SkeletonText width={160} height={28} style={{ marginBottom: 8 }} />
      <SkeletonText width={224} height={14} style={{ marginBottom: 18 }} />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <SkeletonText width={80} height={14} />
        <SkeletonText width={96} height={14} />
      </View>

      {/* Search */}
      <SkeletonBox width="100%" height={44} radius={12} style={{ marginBottom: 16 }} />

      {/* Team cards — matches frontend TeamsSkeleton (6 cards) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <SkeletonCircle size={48} />
            <View style={{ flex: 1 }}>
              <SkeletonText width={128} height={14} />
              <SkeletonText width={96} height={12} style={{ marginTop: 8 }} />
            </View>
          </View>
          <View style={styles.teamBody}>
            <SkeletonText width="100%" height={12} />
            <SkeletonText width="75%" height={12} style={{ marginTop: 8 }} />
          </View>
          <View style={styles.teamFooter}>
            <SkeletonBox width="100%" height={36} radius={12} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  tabsRow: {
    flexDirection: "row",
    gap: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.5)",
    paddingBottom: 14,
    marginBottom: 16,
  },
  teamCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 20,
    marginBottom: 12,
  },
  teamHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  teamBody: { marginBottom: 14 },
  teamFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.5)",
  },
});
