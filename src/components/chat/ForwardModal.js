import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Search, Send, X } from "lucide-react-native";
import chatService from "../../services/chatService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";

const ForwardItem = React.memo(function ForwardItem({ item, selectedId, onSelect }) {
  const id = item._id || item.id;
  const name = item.name || item.other_user?.name || item.group_name || "Unknown";
  const avatar = item.avatar || item.other_user?.avatar || item.group_avatar;
  const isSelected = selectedId === id;
  const handlePress = useCallback(() => onSelect(id), [onSelect, id]);

  return (
    <Pressable
      style={[styles.item, isSelected && styles.itemSelected]}
      onPress={handlePress}
    >
      {avatar ? (
        <Image
          source={{ uri: mediaUrl(avatar) }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {isSelected ? (
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

export default function ForwardModal({ messageId, visible, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (visible) {
      loadConversations();
      setSearch("");
      setSelectedId(null);
    }
  }, [visible]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await chatService.getUnifiedConversations();
      const list = data?.conversations || data || [];
      const arr = Array.isArray(list) ? list : [];
      setConversations(arr);
      setFiltered(arr);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setConversations([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(conversations);
      return;
    }
    const q = text.toLowerCase();
    setFiltered(
      conversations.filter((c) => {
        const name =
          c.name || c.other_user?.name || c.group_name || "";
        return name.toLowerCase().includes(q);
      })
    );
  };

  const handleForward = async () => {
    if (!selectedId || !messageId) return;
    setSending(true);
    try {
      const selected = conversations.find(
        (c) => (c._id || c.id) === selectedId
      );
      const targetType = selected?.type === "group" ? "group" : "dm";
      await chatService.forwardMessage({
        message_id: messageId,
        target_type: targetType,
        target_id: selectedId,
      });
      toast.success("Message forwarded");
      onClose?.();
    } catch (err) {
      console.error("Forward failed:", err);
      toast.error("Failed to forward message");
    } finally {
      setSending(false);
    }
  };

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const renderItem = useCallback(({ item }) => (
    <ForwardItem
      item={item}
      selectedId={selectedId}
      onSelect={handleSelect}
    />
  ), [selectedId, handleSelect]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No conversations found</Text>
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
          <Pressable onPress={onClose}>
            <X size={24} color="#111827" />
          </Pressable>
          <Text style={styles.title}>Forward Message</Text>
          <Pressable
            onPress={handleForward}
           
            disabled={!selectedId || sending}
            style={[
              styles.forwardBtn,
              (!selectedId || sending) && styles.forwardBtnDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={16} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => handleSearch("")}
             
            >
              <X size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Loading */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            renderItem={renderItem}
            estimatedItemSize={56}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              filtered.length === 0 ? styles.emptyList : undefined
            }
            keyboardShouldPersistTaps="handled"
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
  forwardBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  forwardBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    borderCurve: "continuous",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  itemSelected: {
    backgroundColor: "#F0FDF4",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  emptyList: {
    flexGrow: 1,
  },
});
