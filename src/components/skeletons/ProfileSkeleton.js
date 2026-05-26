// Mirror of frontend ProfileSkeleton (SkeletonLoader.js:756-804).
// Profile header (avatar + name + 2 buttons) / stats grid (4) / content tabs / 3 content blocks.
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function ProfileSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={styles.headerCard}>
        <SkeletonCircle size={96} />
        <SkeletonText width={192} height={22} style={{ marginTop: 14 }} />
        <SkeletonText width={240} height={14} style={{ marginTop: 10 }} />
        <View style={styles.headerButtons}>
          <SkeletonBox width={96} height={36} radius={12} />
          <SkeletonBox width={96} height={36} radius={12} />
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.statCard}>
            <SkeletonText width={48} height={24} style={{ alignSelf: "center" }} />
            <SkeletonText width={64} height={10} style={{ alignSelf: "center", marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Content tabs */}
      <View style={styles.tabsCard}>
        <View style={styles.tabsRow}>
          <SkeletonText width={64} height={14} />
          <SkeletonText width={80} height={14} />
          <SkeletonText width={64} height={14} />
        </View>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.contentBlock}>
            <SkeletonText width="100%" height={14} />
            <SkeletonText width="75%" height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  headerButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  statCard: {
    flexBasis: "23%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 14,
    alignItems: "center",
  },
  tabsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 20,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.5)",
    paddingBottom: 14,
    marginBottom: 16,
  },
  contentBlock: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
});
