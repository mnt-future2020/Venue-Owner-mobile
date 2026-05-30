import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

// Mirrors PostsGrid — 2-column tile layout with caption underneath
export default function PostsGridSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset } : null]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.tile}>
            <SkeletonBox width="100%" height={170} radius={12} />
            <SkeletonText width="85%" height={11} style={{ marginTop: 8 }} />
            <SkeletonText width="55%" height={10} style={{ marginTop: 5 }} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 12, paddingBottom: 120 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48%", marginBottom: 14 },
});
