import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pin, Trash2, X } from "lucide-react-native";
import chatService from "../../services/chatService";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import ChatMessageListSkeleton from "../skeletons/ChatMessageListSkeleton";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PinnedItem = React.memo(function PinnedItem({ item, isAdmin, onUnpin }) {
  const id = item._id || item.id;
  const sender = item.sender?.name || item.user?.name || "Unknown";
  const content = item.content || item.text || "";
  const time = formatTime(item.created_at || item.pinned_at);
  const handlePress = useCallback(() => onUnpin(id), [onUnpin, id]);

  return (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Pin size={14} color={PRIMARY_COLOR} />
        <Text style={styles.senderName} numberOfLines={1}>
          {sender}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text style={styles.content} numberOfLines={3}>
        {content}
      </Text>
      {isAdmin ? (
        <Pressable style={styles.unpinBtn} onPress={handlePress}>
          <Trash2 size={14} color="#EF4444" />
          <Text style={styles.unpinText}>Unpin</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

export default function PinnedMessagesModal({
  conversationId,
  isGroup,
  visible,
  onClose,
  isAdmin,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && conversationId) {
      loadPinned();
    }
  }, [visible, conversationId]);

  const loadPinned = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (isGroup) {
        data = await chatService.getPinnedGroupMessages(conversationId);
      } else {
        data = await chatService.getPinnedMessages(conversationId);
      }
      setMessages(Array.isArray(data) ? data : data?.messages || []);
    } catch (err) {
      console.error("Failed to load pinned messages:", err);
      setError("Failed to load pinned messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = useCallback(async (messageId) => {
    try {
      if (isGroup) {
        await chatService.unpinGroupMessage(conversationId, messageId);
      } else {
        await chatService.unpinMessage(conversationId, messageId);
      }
      setMessages((prev) =>
        prev.filter((m) => (m._id || m.id) !== messageId)
      );
      toast.success("Message unpinned");
    } catch (err) {
      console.error("Unpin failed:", err);
      toast.error("Failed to unpin message");
    }
  }, [conversationId, isGroup]);

  const renderItem = useCallback(({ item }) => (
    <PinnedItem item={item} isAdmin={isAdmin} onUnpin={handleUnpin} />
  ), [isAdmin, handleUnpin]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Pin size={32} color="#D1D5DB" />
        <Text style={styles.emptyText}>No pinned messages</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pinned Messages</Text>
          <Pressable onPress={onClose}>
            <X size={24} color="#111827" />
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <ChatMessageListSkeleton rows={5} />
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={loadPinned}
              style={styles.retryBtn}
             
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={messages}
            keyExtractor={(item) =>
              item._id || item.id || Math.random().toString()
            }
            renderItem={renderItem}
            estimatedItemSize={80}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              messages.length === 0 ? styles.emptyList : styles.list
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 12,
    gap: 8,
  },
  messageCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  content: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  unpinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#FEE2E2",
  },
  unpinText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  emptyList: {
    flexGrow: 1,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
