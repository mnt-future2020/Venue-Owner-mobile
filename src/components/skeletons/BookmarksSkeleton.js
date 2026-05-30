import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

export default function BookmarksSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset } : null]}
      showsVerticalScrollIndicator={false}
    >
      <SkeletonText width={140} height={20} style={{ marginBottom: 16 }} />
      <View style={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.tile}>
            <SkeletonBox width="100%" height={160} radius={12} />
            <SkeletonText width="80%" height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48%", marginBottom: 14 },
});
