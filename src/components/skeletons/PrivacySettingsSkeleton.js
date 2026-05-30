import { ScrollView, StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

export default function PrivacySettingsSkeleton({ topOffset = 0 }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, topOffset ? { paddingTop: topOffset } : null]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 3 }).map((_, section) => (
        <View key={section}>
          <SkeletonText width={140} height={11} style={styles.sectionLabel} />
          <View style={styles.card}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.row, i === 3 && styles.rowLast]}>
                <SkeletonBox width={32} height={32} radius={8} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <SkeletonText width="55%" height={14} />
                  <SkeletonText width="80%" height={11} style={{ marginTop: 6 }} />
                </View>
                <SkeletonBox width={44} height={26} radius={13} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 120 },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.5)",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
});
