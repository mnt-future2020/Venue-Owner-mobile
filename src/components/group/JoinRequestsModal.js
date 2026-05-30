import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Check, Search, UserPlus, X } from "lucide-react-native";
import chatService from "../../services/chatService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { useWishlist } from "../../context/WishlistContext";
import JoinRequestsSkeleton from "../skeletons/JoinRequestsSkeleton";

export default function JoinRequestsModal({ visible, onClose, groupId }) {
  const { refreshUnreadCount, notifyChatRead } = useWishlist();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [search, setSearch] = useState("");

  const loadRequests = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await chatService.getJoinRequests(groupId);
      const list = Array.isArray(data) ? data : data?.requests || data?.data || [];
      setRequests(list);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (visible) {
      loadRequests();
      setSearch("");
    }
  }, [visible, loadRequests]);

  const handleApprove = async (request) => {
    const reqId = request.id || request._id || request.user_id;
    setLoadingId(reqId);
    try {
      await chatService.approveJoinRequest(groupId, reqId);
      setRequests((prev) => prev.filter((r) => (r.id || r._id || r.user_id) !== reqId));
      toast.success("Request approved");
      refreshUnreadCount?.();
      notifyChatRead();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (request) => {
    const reqId = request.id || request._id || request.user_id;
    setLoadingId(reqId);
    try {
      await chatService.rejectJoinRequest(groupId, reqId);
      setRequests((prev) => prev.filter((r) => (r.id || r._id || r.user_id) !== reqId));
      toast.success("Request rejected");
      refreshUnreadCount?.();
      notifyChatRead();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setLoadingId(null);
    }
  };

  const filteredRequests = search.trim()
    ? requests.filter((r) => {
        const name = r.user_name || r.name || r.user?.name || "";
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : requests;

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const renderItem = ({ item }) => {
    const name = item.user_name || item.name || item.user?.name || "Unknown";
    const avatar = item.user_avatar || item.avatar || item.user?.avatar || "";
    const initials = (name.charAt(0) || "?").toUpperCase();
    const reqId = item.id || item._id || item.user_id;
    const isItemLoading = loadingId === reqId;

    return (
      <View style={styles.requestRow}>
        <View style={styles.requestInfo}>
          {avatar ? (
            <Image
              source={{ uri: mediaUrl(avatar) }}
              style={styles.requestAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.requestAvatarFallback}>
              <Text style={styles.requestAvatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.requestName} numberOfLines={1}>{name}</Text>
        </View>

        <View style={styles.requestActions}>
          <Pressable
            style={[styles.approveBtn, isItemLoading && { opacity: 0.6 }]}
            onPress={() => handleApprove(item)}
            disabled={isItemLoading}
          >
            {isItemLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={13} color="#FFFFFF" />
                <Text style={styles.approveBtnText}>Accept</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.rejectBtn, isItemLoading && { opacity: 0.6 }]}
            onPress={() => handleReject(item)}
            disabled={isItemLoading}
          >
            <X size={14} color="#64748B" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Drag handle */}
          <View style={styles.dragHandle}><View style={styles.dragBar} /></View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <UserPlus size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.title}>Join Requests</Text>
                <Text style={styles.subtitle}>
                  {requests.length} pending {requests.length === 1 ? "request" : "requests"}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Search (only when > 3 requests) */}
          {requests.length > 3 ? (
            <View style={styles.searchWrap}>
              <Search size={14} color="#9CA3AF" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch("")}>
                  <X size={14} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* List */}
          {loading ? (
            <JoinRequestsSkeleton rows={4} />
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <UserPlus size={24} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>New requests will appear here</Text>
            </View>
          ) : filteredRequests.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.noResultsText}>No results for "{search}"</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRequests}
              keyExtractor={(item) => String(item.id || item._id || item.user_id)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
  },
  dragHandle: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  dragBar: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginVertical: 10,
    backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#111827" },
  listContent: { padding: 16, gap: 8 },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 13, fontWeight: "700", color: "#374151" },
  emptySubtitle: { fontSize: 11, color: "#94A3B8" },
  noResultsText: { fontSize: 13, color: "#94A3B8" },
  requestRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 14, backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#F1F5F9",
  },
  requestInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  requestAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
  requestAvatarFallback: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(5,150,105,0.08)", alignItems: "center", justifyContent: "center",
  },
  requestAvatarText: { fontSize: 14, fontWeight: "700", color: PRIMARY_COLOR },
  requestName: { fontSize: 13, fontWeight: "700", color: "#111827", flex: 1 },
  requestActions: { flexDirection: "row", gap: 6 },
  approveBtn: {
    height: 36, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: PRIMARY_COLOR, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 5,
  },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
});
