// Mirror of frontend NotificationsSkeleton (SkeletonLoader.js:726-753).
// Header / 8 notification rows (circle + 3 lines).
import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function NotificationsSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset + 8 } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <SkeletonText width={160} height={28} style={{ marginBottom: 18 }} />

      {/* Notification items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={styles.notifCard}>
          <SkeletonCircle size={40} />
          <View style={styles.notifBody}>
            <SkeletonText width="100%" height={14} />
            <SkeletonText width="75%" height={12} style={{ marginTop: 8 }} />
            <SkeletonText width={96} height={10} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  notifCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 14,
    marginBottom: 10,
  },
  notifBody: { flex: 1 },
});
