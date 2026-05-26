import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import socialService from "../../services/socialService";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import { safePush } from "../../services/navigationGuard";
import toast from "../../utils/toast";

export default function FollowModal({ visible, onClose, type, onFollowToggle }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    if (!visible || !user?.id || !type) return;

    let cancelled = false;
    setLoading(true);
    setSearchQuery("");
    setList([]);

    (async () => {
      try {
        const [res, followingRes] = await Promise.all([
          type === "followers"
            ? socialService.getFollowers(user.id)
            : socialService.getFollowing(user.id),
          socialService.getFollowing(user.id),
        ]);

        if (cancelled) return;

        const users = res?.users || res || [];
        const followingList = followingRes?.users || followingRes || [];
        const fIds = new Set(followingList.map((u) => u.id));
        setFollowingIds(fIds);
        setList(
          users.map((u) => ({ ...u, is_following: fIds.has(u.id) }))
        );
      } catch {
        if (!cancelled) {
          toast.error("Failed to load " + type);
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, type, user?.id, onClose]);

  const handleFollow = useCallback(
    async (userId) => {
      if (!userId || userId === user?.id) return;

      // Optimistic
      setList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_following: !u.is_following } : u
        )
      );
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });

      try {
        const res = await socialService.toggleFollow(userId);
        const isFollowing = !!res.following;
        setList((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, is_following: isFollowing } : u
          )
        );
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (isFollowing) next.add(userId);
          else next.delete(userId);
          return next;
        });
        onFollowToggle?.(userId, isFollowing);
      } catch {
        // Revert
        setList((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, is_following: !u.is_following } : u
          )
        );
        toast.error("Failed");
      }
    },
    [user?.id, onFollowToggle]
  );

  const handleUserPress = useCallback(
    (userId) => {
      onClose();
      safePush(router, `/(stack)/player/${userId}`);
    },
    [onClose, router]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((u) =>
      (u.name || u.username || "").toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const renderUser = useCallback(
    ({ item }) => (
      <View style={styles.userRow}>
        <TouchableOpacity
          style={styles.userTap}
          activeOpacity={0.85}
          onPress={() => handleUserPress(item.id)}
        >
          {item.avatar ? (
            <Image
              source={{ uri: mediaUrl(item.avatar) }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person-outline" size={16} color="#94A3B8" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name || item.username || "Player"}
            </Text>
            {item.sport ? (
              <Text style={styles.userSport} numberOfLines={1}>
                {item.sport}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {item.id !== user?.id ? (
          <TouchableOpacity
            style={[
              styles.followBtn,
              (item.is_following || followingIds.has(item.id)) && styles.followBtnActive,
            ]}
            activeOpacity={0.85}
            onPress={() => handleFollow(item.id)}
          >
            <Text
              style={[
                styles.followBtnText,
                (item.is_following || followingIds.has(item.id)) && styles.followBtnTextActive,
              ]}
            >
              {item.is_following || followingIds.has(item.id) ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [handleFollow, handleUserPress, followingIds, user?.id]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 8) }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {type === "followers" ? "Followers" : "Following"}
            </Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          {!loading && list.length > 0 ? (
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={14} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
            </View>
          ) : null}

          {/* List */}
          <View style={styles.listWrap}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={PRIMARY_COLOR}
                style={{ marginTop: 48 }}
              />
            ) : list.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="person-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  {type === "followers"
                    ? "No followers yet"
                    : "Not following anyone yet"}
                </Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={24} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  No results for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderUser}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    minHeight: 300,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontFamily: FONTS.body,
    padding: 0,
  },
  listWrap: {
    flex: 1,
    minHeight: 100,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  userTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  userSport: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#94A3B8",
    textTransform: "capitalize",
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    marginLeft: 8,
  },
  followBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  followBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: PRIMARY_COLOR,
  },
  followBtnTextActive: {
    color: "#FFFFFF",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "#94A3B8",
    textAlign: "center",
  },
});
