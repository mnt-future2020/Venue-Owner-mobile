import { StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonCircle, SkeletonText } from "../ui/Skeleton";

export default function JoinRequestsSkeleton({ rows = 4 }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonCircle size={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText width="55%" height={14} />
            <SkeletonText width="40%" height={11} style={{ marginTop: 6 }} />
            <SkeletonText width="80%" height={11} style={{ marginTop: 6 }} />
          </View>
          <View style={styles.actions}>
            <SkeletonBox width={36} height={36} radius={18} />
            <SkeletonBox width={36} height={36} radius={18} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    padding: 12,
    marginBottom: 10,
  },
  actions: { flexDirection: "row", gap: 8 },
});
