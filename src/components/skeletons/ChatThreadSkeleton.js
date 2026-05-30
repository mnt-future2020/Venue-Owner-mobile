import { StyleSheet, View } from "react-native";
import { SkeletonBox, SkeletonText } from "../ui/Skeleton";

// Alternating left/right bubbles with varying widths to mimic a real thread.
const BUBBLES = [
  { side: "left", width: "65%", lines: 1 },
  { side: "right", width: "45%", lines: 1 },
  { side: "left", width: "80%", lines: 2 },
  { side: "right", width: "55%", lines: 1 },
  { side: "left", width: "50%", lines: 1 },
  { side: "right", width: "70%", lines: 2 },
  { side: "left", width: "40%", lines: 1 },
  { side: "right", width: "60%", lines: 1 },
];

export default function ChatThreadSkeleton() {
  return (
    <View style={styles.screen}>
      {BUBBLES.map((b, i) => (
        <View
          key={i}
          style={[styles.bubbleRow, b.side === "right" && { justifyContent: "flex-end" }]}
        >
          <SkeletonBox
            width={b.width}
            height={b.lines === 2 ? 56 : 36}
            radius={16}
            style={b.side === "right" ? styles.rightBubble : styles.leftBubble}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 12,
    justifyContent: "flex-end", // newest messages at bottom, like real chat
  },
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  leftBubble: { backgroundColor: "#FFFFFF" },
  rightBubble: { backgroundColor: "#DBEAFE" },
});
