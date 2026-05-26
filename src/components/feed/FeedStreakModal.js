import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeedStatsCard from "./FeedStatsCard";

export default function FeedStreakModal({ visible, onClose, engagement, onPromptReply }) {
  const insets = useSafeAreaInsets();
  const sheetPaddingBottom = 24 + Math.max(0, insets.bottom);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: sheetPaddingBottom }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Streak Points</Text>
              <Text style={styles.subtitle}>Your feed performance snapshot</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.closeButton}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FeedStatsCard engagement={engagement} onPromptReply={onPromptReply} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
});
