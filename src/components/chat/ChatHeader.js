import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  X,
  CornerUpLeft,
  Copy,
  Pin,
  PinOff,
  Share2,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const ChatHeader = ({
  name = "Chat",
  avatar = "",
  isGroup = false,
  onlineStatus,
  typing = false,
  typingUser,
  onBack,
  onSearch,
  onMenu,
  selectedMessage,
  onAction,
  onDismissSelection,
  userId,
}) => {
  // ── Stable action callbacks ──
  const handleReactEmoji = useCallback((emoji) => {
    onAction?.(`react:${emoji}`);
  }, [onAction]);
  const handleReply = useCallback(() => onAction?.("reply"), [onAction]);
  const handleCopy = useCallback(() => onAction?.("copy"), [onAction]);
  const handlePin = useCallback(() => onAction?.("pin"), [onAction]);
  const handleForward = useCallback(() => onAction?.("forward"), [onAction]);
  const handleEdit = useCallback(() => onAction?.("edit"), [onAction]);
  const handleDelete = useCallback(() => onAction?.("delete"), [onAction]);

  // ── Derive initials for fallback avatar ──
  const initials = useMemo(() => (name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase(), [name]);

  // ── Status text ──
  const statusText = useMemo(() => {
    if (typing) return `${typingUser || "Someone"} is typing...`;
    if (isGroup) return "Group";
    if (onlineStatus?.online) return "online";
    if (onlineStatus?.last_seen) return `last seen ${onlineStatus.last_seen}`;
    return "";
  }, [typing, typingUser, isGroup, onlineStatus]);

  const isOnline = !isGroup && onlineStatus?.online;

  // ── WhatsApp-style action bar (when message is selected) ──
  if (selectedMessage) {
    const isOwn =
      String(selectedMessage.user_id || selectedMessage.sender_id) ===
      String(userId);

    return (
      <View style={styles.actionBar}>
        <Pressable
          onPress={onDismissSelection}
          style={styles.backBtn}
        >
          <X size={22} color="#374151" />
        </Pressable>

        {/* Emoji reactions row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reactionScroll}
          contentContainerStyle={styles.reactionScrollContent}
        >
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleReactEmoji(emoji)}
              style={styles.reactionBtn}
            >
              <Text style={styles.reactionBtnText}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Action icons */}
        <View style={styles.actionBarIcons}>
          <Pressable
            onPress={handleReply}
            style={styles.actionBarBtn}
          >
            <CornerUpLeft size={20} color="#374151" />
          </Pressable>
          <Pressable
            onPress={handleCopy}
            style={styles.actionBarBtn}
          >
            <Copy size={20} color="#374151" />
          </Pressable>
          <Pressable
            onPress={handlePin}
            style={styles.actionBarBtn}
          >
            {selectedMessage.pinned ? (
              <PinOff size={20} color="#374151" />
            ) : (
              <Pin size={20} color="#374151" />
            )}
          </Pressable>
          <Pressable
            onPress={handleForward}
            style={styles.actionBarBtn}
          >
            <Share2 size={20} color="#374151" />
          </Pressable>
          {isOwn ? (
            <>
              <Pressable
                onPress={handleEdit}
                style={styles.actionBarBtn}
              >
                <Pencil size={20} color="#374151" />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={styles.actionBarBtn}
              >
                <Trash2 size={20} color="#EF4444" />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Normal header ──
  return (
    <View style={styles.header}>
      {/* Back button */}
      <Pressable
        onPress={onBack}
        style={styles.backBtn}
       
      >
        <ArrowLeft size={22} color="#374151" />
      </Pressable>

      {/* Avatar + name + status */}
      <Pressable style={styles.headerProfile}>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image
              source={{ uri: mediaUrl(avatar) }}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
          )}
          {/* Online green dot */}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={styles.headerName}>
            {name}
          </Text>
          {statusText !== "" && (
            <Text
              numberOfLines={1}
              style={[
                styles.headerStatus,
                isOnline && { color: "#22C55E" },
                typing && { color: PRIMARY_COLOR },
              ]}
            >
              {statusText}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Action buttons */}
      <View style={styles.headerActions}>
        <Pressable
          style={styles.headerActionBtn}
         
          onPress={onSearch}
        >
          <Search size={18} color="#6B7280" />
        </Pressable>
        <Pressable
          style={styles.headerActionBtn}
         
          onPress={onMenu}
        >
          <MoreVertical size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Action bar (WhatsApp-style when message selected)
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#ECFDF5",
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
    gap: 4,
  },
  reactionScroll: { flexShrink: 1 },
  reactionScrollContent: { gap: 2 },
  reactionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionBtnText: { fontSize: 18 },
  actionBarIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },

  // Normal header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarContainer: {
    position: "relative",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: "continuous",
    backgroundColor: "#E5E7EB",
  },
  headerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: "continuous",
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderCurve: "continuous",
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
    gap: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerStatus: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  headerActions: {
    flexDirection: "row",
    gap: 2,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(ChatHeader);
