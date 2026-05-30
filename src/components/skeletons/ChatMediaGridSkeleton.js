import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox } from "../ui/Skeleton";

// 3-column grid mirroring SharedMedia modal in chat/[conversationId].js
export default function ChatMediaGridSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <SkeletonBox key={i} width="31%" height={108} radius={10} style={styles.tile} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 12,
  },
  tile: { marginBottom: 8 },
});
