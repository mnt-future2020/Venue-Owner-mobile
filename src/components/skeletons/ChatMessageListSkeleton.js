import { StyleSheet, View } from "react-native";
import { SkeletonCircle, SkeletonText } from "../ui/Skeleton";

// Generic message-row list — used by PinnedMessagesModal and (optionally)
// MessageSearch cold-load placeholder.
export default function ChatMessageListSkeleton({ rows = 5 }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonCircle size={36} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText width="40%" height={12} />
            <SkeletonText width="90%" height={12} style={{ marginTop: 6 }} />
            <SkeletonText width="60%" height={10} style={{ marginTop: 6 }} />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.6)",
  },
});
