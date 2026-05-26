// Mobile equivalent of frontend FeedSkeleton (SkeletonLoader.js:23-127).
// Frontend layout, adapted for mobile width (no right sidebar — that column is desktop-only):
//   - Stories row (5 circles)
//   - Tabs row (For You / Following labels)
//   - Post composer card (avatar + input)
//   - 3 post cards (header / content / image / actions)
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

const STORIES = 5;
const POSTS = 3;

export default function FeedSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Stories row */}
      <View style={styles.storiesRow}>
        {Array.from({ length: STORIES }).map((_, i) => (
          <View key={i} style={styles.storyItem}>
            <SkeletonCircle size={64} />
            <SkeletonText width={48} height={10} />
          </View>
        ))}
      </View>

      {/* Tabs row */}
      <View style={styles.tabsRow}>
        <SkeletonText width={64} height={14} />
        <SkeletonText width={80} height={14} />
      </View>

      {/* Post composer */}
      <View style={styles.composer}>
        <SkeletonCircle size={40} />
        <SkeletonBox style={{ flex: 1 }} height={40} radius={12} />
      </View>

      {/* Posts */}
      {Array.from({ length: POSTS }).map((_, i) => (
        <View key={i} style={styles.postCard}>
          {/* Post header */}
          <View style={styles.postHeader}>
            <SkeletonCircle size={40} />
            <View style={styles.postHeaderText}>
              <SkeletonText width={128} height={14} />
              <SkeletonText width={96} height={11} style={{ marginTop: 6 }} />
            </View>
          </View>

          {/* Post content */}
          <View style={styles.postBody}>
            <SkeletonText width="100%" height={14} />
            <SkeletonText width="75%" height={14} style={{ marginTop: 8 }} />
          </View>

          {/* Post image */}
          <View style={styles.postImageWrap}>
            <SkeletonBox width="100%" height={240} radius={16} />
          </View>

          {/* Post actions */}
          <View style={styles.postActions}>
            <SkeletonText width={48} height={14} />
            <SkeletonText width={48} height={14} />
            <SkeletonText width={48} height={14} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

  storiesRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    marginBottom: 12,
  },
  storyItem: { alignItems: "center", gap: 8, minWidth: 70 },

  tabsRow: {
    flexDirection: "row",
    gap: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.6)",
    paddingBottom: 14,
    marginBottom: 16,
  },

  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 16,
    marginBottom: 16,
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    marginBottom: 14,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  postHeaderText: { flex: 1 },

  postBody: { paddingHorizontal: 16, paddingBottom: 12 },

  postImageWrap: { paddingHorizontal: 16, paddingBottom: 12 },

  postActions: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.5)",
  },
});
