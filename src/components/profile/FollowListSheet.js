import { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { X, Search, UserPlus, UserMinus, User } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import socialService from "../../services/socialService";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";
import toast from "../../utils/toast";
import { safePush } from "../../services/navigationGuard";

const SCREEN_WIDTH = Dimensions.get("window").width;

/* ── Memoized row — match frontend: Avatar + Name + Role · SR ── */
const FollowUserRow = memo(function FollowUserRow({
  item,
  currentUserId,
  onToggle,
  onNavigate,
}) {
  const [following, setFollowing] = useState(item.is_following || false);
  const [toggling, setToggling] = useState(false);
  const isMe = item.id === currentUserId || item._id === currentUserId;

  // Sync local state when parent updates is_following (e.g. toggled from the other tab)
  useEffect(() => {
    setFollowing(item.is_following || false);
  }, [item.is_following]);

  const handleToggle = async () => {
    if (toggling) return;
    const prev = following;
    setToggling(true);
    setFollowing(!prev); // optimistic
    try {
      const res = await socialService.toggleFollow(item.id || item._id);
      const isNowFollowing = !!res.following;
      setFollowing(isNowFollowing);
      onToggle?.(item.id || item._id, isNowFollowing);
    } catch {
      setFollowing(prev); // revert
      toast.error("Failed to update follow");
    } finally {
      setToggling(false);
    }
  };

  const name = item.name || "Player";
  const avatar = item.avatar;
  const sport = item.sport || item.primary_sport || "";

  return (
    <TouchableOpacity
      style={styles.userRow}
      activeOpacity={0.7}
      onPress={() => onNavigate(item.id || item._id)}
    >
      {avatar ? (
        <Image
          source={{ uri: mediaUrl(avatar) }}
          style={styles.userAvatar}
          contentFit="cover"
        />
      ) : (
        <View style={styles.userAvatarFallback}>
          <User size={16} color="#94A3B8" />
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {name}
        </Text>
        {sport ? (
          <Text style={styles.userSub} numberOfLines={1}>
            {sport}
          </Text>
        ) : null}
      </View>

      {!isMe && (
        <TouchableOpacity
          style={[
            styles.followBtn,
            following ? styles.followingBtn : styles.notFollowingBtn,
          ]}
          onPress={handleToggle}
          disabled={toggling}
          activeOpacity={0.85}
        >
          {toggling ? (
            <ActivityIndicator
              size="small"
              color={following ? "#64748B" : "#FFFFFF"}
            />
          ) : following ? (
            <>
              <UserMinus size={14} color="#64748B" />
              <Text style={styles.followingBtnText}>Following</Text>
            </>
          ) : (
            <>
              <UserPlus size={14} color="#FFFFFF" />
              <Text style={styles.followBtnText}>Follow</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

export default function FollowListSheet({
  visible,
  onClose,
  userId,
  initialTab = "followers",
  onFollowChange,
}) {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState(initialTab);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followersCursor, setFollowersCursor] = useState(null);
  const [followingCursor, setFollowingCursor] = useState(null);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);

  /* ── Swipe animation — driven by scroll position for realtime tracking ── */
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );

  const switchTab = useCallback((newTab) => {
    setTab(newTab);
    scrollRef.current?.scrollTo({
      x: newTab === "followers" ? 0 : SCREEN_WIDTH,
      animated: true,
    });
  }, []);

  const onScrollEnd = useCallback((e) => {
    const x = e.nativeEvent.contentOffset.x;
    setTab(x > SCREEN_WIDTH / 2 ? "following" : "followers");
  }, []);

  // Track who the current user follows — used to mark is_following on all lists
  const followingIdsRef = useRef(new Set());

  /* ── Data loading ── */
  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setSearch("");
      setFollowers([]);
      setFollowing([]);
      setFollowersCursor(null);
      setFollowingCursor(null);
      setHasMoreFollowers(true);
      setHasMoreFollowing(true);
      // Load following first to build the followingIds set, then load both lists
      loadFollowingIds().then(() => {
        loadFollowers(null, true);
        loadFollowing(null, true);
      });
      // Set initial scroll position
      const toX = initialTab === "followers" ? 0 : SCREEN_WIDTH;
      scrollX.setValue(toX);
      setTimeout(() => scrollRef.current?.scrollTo({ x: toX, animated: false }), 50);
    }
  }, [visible, userId]);

  // Fetch the current user's full following list to cross-reference is_following
  const loadFollowingIds = async () => {
    try {
      const targetId = user?.id;
      if (!targetId) return;
      const allIds = [];
      let cursor = null;
      // Paginate through all pages to collect every followed user ID
      for (let i = 0; i < 20; i++) {
        const data = await socialService.getFollowing(targetId, cursor);
        const items = data.following || data.users || data.items || [];
        items.forEach((u) => allIds.push(String(u.id || u._id)));
        cursor = data.next_cursor || null;
        if (!cursor || items.length < 20) break;
      }
      followingIdsRef.current = new Set(allIds);
    } catch {
      // silent
    }
  };

  // Mark is_following on each user by cross-referencing followingIdsRef
  const markFollowingStatus = (items) =>
    items.map((u) => ({
      ...u,
      is_following: followingIdsRef.current.has(String(u.id || u._id)),
    }));

  const loadFollowers = async (cursor = null, reset = false) => {
    if (loadingFollowers) return;
    setLoadingFollowers(true);
    try {
      const data = await socialService.getFollowers(userId, cursor, 20);
      const raw = data.followers || data.users || data.items || [];
      const items = markFollowingStatus(raw);
      if (reset) {
        setFollowers(items);
      } else {
        setFollowers((prev) => {
          const existingIds = new Set(prev.map((entry) => String(entry.id || entry._id)));
          return [...prev, ...items.filter((entry) => !existingIds.has(String(entry.id || entry._id)))];
        });
      }
      setFollowersCursor(data?.next_cursor || null);
      setHasMoreFollowers(typeof data?.has_more === "boolean" ? data.has_more : raw.length >= 20);
    } catch {
      // silent
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadFollowing = async (cursor = null, reset = false) => {
    if (loadingFollowing) return;
    setLoadingFollowing(true);
    try {
      const data = await socialService.getFollowing(userId, cursor, 20);
      const raw = data.following || data.users || data.items || [];
      // Everyone in the following list is someone the user follows
      const items = raw.map((u) => ({ ...u, is_following: true }));
      if (reset) {
        setFollowing(items);
      } else {
        setFollowing((prev) => {
          const existingIds = new Set(prev.map((entry) => String(entry.id || entry._id)));
          return [...prev, ...items.filter((entry) => !existingIds.has(String(entry.id || entry._id)))];
        });
      }
      setFollowingCursor(data?.next_cursor || null);
      setHasMoreFollowing(typeof data?.has_more === "boolean" ? data.has_more : raw.length >= 20);
    } catch {
      // silent
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleNavigate = useCallback(
    (id) => {
      onClose();
      safePush(router, `/(stack)/player/${id}`);
    },
    [onClose, router],
  );

  const handleEndReachedFollowers = useCallback(() => {
    if (hasMoreFollowers && !loadingFollowers && followersCursor) {
      loadFollowers(followersCursor);
    }
  }, [hasMoreFollowers, loadingFollowers, followersCursor]);

  const handleEndReachedFollowing = useCallback(() => {
    if (hasMoreFollowing && !loadingFollowing && followingCursor) {
      loadFollowing(followingCursor);
    }
  }, [hasMoreFollowing, loadingFollowing, followingCursor]);

  /* ── Filtered lists ── */
  const filteredFollowers = useMemo(() => {
    if (!search.trim()) return followers;
    const q = search.toLowerCase();
    return followers.filter((u) =>
      (u.name || "").toLowerCase().includes(q),
    );
  }, [followers, search]);

  const filteredFollowing = useMemo(() => {
    if (!search.trim()) return following;
    const q = search.toLowerCase();
    return following.filter((u) =>
      (u.name || "").toLowerCase().includes(q),
    );
  }, [following, search]);

  const handleFollowToggle = useCallback((toggledId, isNowFollowing) => {
    // Sync is_following across both lists
    const update = (u) =>
      String(u.id || u._id) === String(toggledId)
        ? { ...u, is_following: isNowFollowing }
        : u;
    setFollowers((prev) => prev.map(update));
    setFollowing((prev) => {
      if (isNowFollowing) {
        // Add to following list if not already there
        const exists = prev.some((u) => String(u.id || u._id) === String(toggledId));
        if (exists) return prev.map(update);
        // Find the user from followers list to add
        const userFromFollowers = followers.find(
          (u) => String(u.id || u._id) === String(toggledId),
        );
        if (userFromFollowers) {
          return [...prev, { ...userFromFollowers, is_following: true }];
        }
        return prev;
      }
      // Remove from following list when unfollowed
      return prev.filter((u) => String(u.id || u._id) !== String(toggledId));
    });
    // Keep the ref in sync
    if (isNowFollowing) {
      followingIdsRef.current.add(String(toggledId));
    } else {
      followingIdsRef.current.delete(String(toggledId));
    }
    // Notify parent to update counts immediately
    onFollowChange?.(toggledId, isNowFollowing);
  }, [onFollowChange, followers]);

  const renderItem = useCallback(
    ({ item }) => (
      <FollowUserRow
        item={item}
        currentUserId={user?.id}
        onToggle={handleFollowToggle}
        onNavigate={handleNavigate}
      />
    ),
    [user?.id, handleNavigate, handleFollowToggle],
  );

  const keyExtractor = useCallback(
    (item, idx) => item.id || item._id || `user-${idx}`,
    [],
  );

  /* ── Tab indicator animated style — tracks scroll position in realtime ── */
  const TAB_WIDTH = SCREEN_WIDTH / 2 - 28;
  const indicatorTranslateX = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0, TAB_WIDTH],
    extrapolate: "clamp",
  });

  const renderEmptyList = useCallback(
    (isLoading, listType) =>
      isLoading ? (
        <ActivityIndicator
          size="large"
          color={PRIMARY_COLOR}
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.emptyState}>
          <User size={32} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            {search
              ? `No results for "${search}"`
              : listType === "followers"
              ? "No followers yet"
              : "Not following anyone yet"}
          </Text>
        </View>
      ),
    [search],
  );

  const renderFooter = useCallback(
    (isLoading, listLength) =>
      isLoading && listLength > 0 ? (
        <ActivityIndicator
          size="small"
          color={PRIMARY_COLOR}
          style={{ marginVertical: 16 }}
        />
      ) : null,
    [],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header with tabs */}
        <View style={styles.header}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => switchTab("followers")}
              style={styles.tabBtn}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "followers" && styles.tabTextActive,
                ]}
              >
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchTab("following")}
              style={styles.tabBtn}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "following" && styles.tabTextActive,
                ]}
              >
                Following
              </Text>
            </TouchableOpacity>
            {/* Animated indicator */}
            <Animated.View
              style={[
                styles.tabIndicator,
                { transform: [{ translateX: indicatorTranslateX }] },
              ]}
            />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {/* Swipeable content */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onScrollEnd}
          bounces={false}
          style={styles.pager}
        >
          {/* Followers list */}
          <View style={{ width: SCREEN_WIDTH }}>
            <FlatList
              data={filteredFollowers}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 20 },
              ]}
              removeClippedSubviews
              onEndReached={handleEndReachedFollowers}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={renderEmptyList(loadingFollowers, "followers")}
              ListFooterComponent={renderFooter(
                loadingFollowers,
                filteredFollowers.length,
              )}
            />
          </View>

          {/* Following list */}
          <View style={{ width: SCREEN_WIDTH }}>
            <FlatList
              data={filteredFollowing}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 20 },
              ]}
              removeClippedSubviews
              onEndReached={handleEndReachedFollowing}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={renderEmptyList(loadingFollowing, "following")}
              ListFooterComponent={renderFooter(
                loadingFollowing,
                filteredFollowing.length,
              )}
            />
          </View>
        </Animated.ScrollView>
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  tabBtn: {
    width: SCREEN_WIDTH / 2 - 28,
    alignItems: "center",
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH / 2 - 28,
    height: 2.5,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  closeBtn: {
    padding: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  pager: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  userSub: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "capitalize",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  notFollowingBtn: {
    backgroundColor: PRIMARY_COLOR,
  },
  followingBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  followingBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
  },
});
