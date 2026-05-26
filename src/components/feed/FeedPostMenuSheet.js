import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ExpoClipboard from "expo-clipboard";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safePush } from "../../services/navigationGuard";

export default function FeedPostMenuSheet({ visible, onClose, post, onDelete }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const postUrl = post?.id ? `https://app.lobbi.in/feed?post=${post.id}` : "";
  const isOwnPost = !!post?.is_own_post;

  const items = [
    {
      key: "profile",
      icon: "person-outline",
      title: "View profile",
      onPress: () => {
        if (post?.user_id) {
          safePush(router, `/(stack)/player/${post.user_id}`);
        } else {
          toast.info("Player profile not available");
        }
      },
    },
    {
      key: "copy",
      icon: "document-text-outline",
      title: "Copy caption",
      onPress: async () => {
        const text = String(post?.content || "").trim();
        if (!text) {
          toast.info("No caption to copy");
          return;
        }
        await ExpoClipboard.setStringAsync(text);
        toast.success("Caption copied");
      },
    },
    {
      key: "copy-link",
      icon: "link-outline",
      title: "Copy link",
      onPress: async () => {
        if (!postUrl) {
          toast.info("No link available");
          return;
        }
        await ExpoClipboard.setStringAsync(postUrl);
        toast.success("Link copied");
      },
    },
  ];

  if (isOwnPost) {
    items.push({
      key: "delete",
      icon: "trash-outline",
      title: "Delete post",
      destructive: true,
      onPress: () => onDelete?.(post),
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>More Options</Text>
          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.88}
              style={styles.item}
              onPress={() => {
                item.onPress?.();
                onClose?.();
              }}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={18} color={item.destructive ? "#EF4444" : PRIMARY_COLOR} />
              </View>
              <Text style={[styles.itemTitle, item.destructive && styles.itemTitleDestructive]}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  itemTitleDestructive: {
    color: "#EF4444",
  },
});
