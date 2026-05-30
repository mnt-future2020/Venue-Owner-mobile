import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function GroupDiscoverySkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Search bar */}
      <SkeletonBox width="100%" height={44} radius={12} style={{ marginBottom: 12 }} />

      {/* Filter chips */}
      <View style={styles.chips}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} width={72} height={30} radius={15} />
        ))}
      </View>

      {/* Group cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonCircle size={52} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <SkeletonText width="65%" height={15} />
            <SkeletonText width="80%" height={11} style={{ marginTop: 6 }} />
            <View style={styles.metaRow}>
              <SkeletonText width={60} height={10} />
              <SkeletonText width={50} height={10} />
            </View>
          </View>
          <SkeletonBox width={64} height={30} radius={15} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  chips: { flexDirection: "row", gap: 8, marginBottom: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 14,
    marginBottom: 10,
  },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 8 },
});
