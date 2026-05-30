import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function PostDetailSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset } : null]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={styles.authorRow}>
          <SkeletonCircle size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText width="55%" height={14} />
            <SkeletonText width="40%" height={11} style={{ marginTop: 6 }} />
          </View>
          <SkeletonBox width={24} height={24} radius={12} />
        </View>

        <SkeletonText width="95%" height={14} style={{ marginTop: 14 }} />
        <SkeletonText width="80%" height={14} style={{ marginTop: 6 }} />

        <SkeletonBox width="100%" height={320} radius={14} style={{ marginTop: 14 }} />

        <View style={styles.actionsRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} width={48} height={28} radius={14} />
          ))}
        </View>
      </View>

      <SkeletonText width={120} height={14} style={{ marginTop: 18, marginBottom: 12 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.commentRow}>
          <SkeletonCircle size={36} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <SkeletonText width="60%" height={12} />
            <SkeletonText width="90%" height={12} style={{ marginTop: 6 }} />
            <SkeletonText width="45%" height={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 16,
  },
  authorRow: { flexDirection: "row", alignItems: "center" },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  commentRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 12,
    marginBottom: 10,
  },
});
