import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function GroupInfoSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset } : null]}
      showsVerticalScrollIndicator={false}
    >
      {/* Group header card */}
      <View style={styles.headerCard}>
        <SkeletonCircle size={88} />
        <SkeletonText width={180} height={20} style={{ marginTop: 14 }} />
        <SkeletonText width={140} height={12} style={{ marginTop: 8 }} />
        <SkeletonText width={220} height={12} style={{ marginTop: 14 }} />
        <View style={styles.headerActions}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.actionCol}>
              <SkeletonCircle size={40} />
              <SkeletonText width={48} height={10} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Members section */}
      <View style={styles.sectionHeader}>
        <SkeletonText width={120} height={14} />
        <SkeletonText width={48} height={12} />
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.memberRow}>
          <SkeletonCircle size={42} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText width="50%" height={14} />
            <SkeletonText width="30%" height={11} style={{ marginTop: 6 }} />
          </View>
          <SkeletonBox width={56} height={22} radius={11} />
        </View>
      ))}

      {/* Settings rows */}
      <View style={styles.settingsCard}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.settingsRow}>
            <SkeletonBox width={28} height={28} radius={8} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonText width="60%" height={13} />
            </View>
            <SkeletonBox width={20} height={20} radius={10} />
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  headerActions: { flexDirection: "row", gap: 24, marginTop: 20 },
  actionCol: { alignItems: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 6,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 12,
    marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 6,
    marginTop: 18,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.4)",
  },
});
