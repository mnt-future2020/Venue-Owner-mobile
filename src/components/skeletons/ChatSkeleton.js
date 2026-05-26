// Mirror of frontend ChatSkeleton (SkeletonLoader.js:846-894).
// Mobile-only sidebar pattern: header (title + 2 action buttons) / search / 8 conversation rows.
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function ChatSkeleton({ topOffset = 0 }) {
  return (
    <View style={[styles.screen, topOffset ? { paddingTop: topOffset } : null]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <SkeletonText width={96} height={22} />
          <View style={styles.headerActions}>
            <SkeletonBox width={36} height={36} radius={12} />
            <SkeletonBox width={36} height={36} radius={12} />
          </View>
        </View>
        {/* Search */}
        <SkeletonBox width="100%" height={40} radius={12} style={{ marginTop: 14 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.row}>
            <SkeletonCircle size={48} />
            <View style={styles.rowBody}>
              <SkeletonText width={128} height={14} />
              <SkeletonText width="100%" height={12} style={{ marginTop: 8 }} />
            </View>
            <View style={styles.rowRight}>
              <SkeletonText width={48} height={10} />
              <SkeletonBox width={20} height={20} radius={999} style={{ marginTop: 8 }} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.5)",
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", gap: 8 },
  list: { padding: 12, paddingBottom: 120 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 20,
  },
  rowBody: { flex: 1 },
  rowRight: { alignItems: "flex-end" },
});
