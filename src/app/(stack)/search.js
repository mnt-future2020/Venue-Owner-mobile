// 100% mirror of frontend SocialFeedPage Discover Users panel
// (SocialFeedPage.js:2440-2542 + handleDiscoverSearch at lines 591-606).
//   - Placeholder: "Search by username..."
//   - Min query length: 2 chars before firing the API
//   - API: socialService.searchUsers → GET /users/search?q=... (same endpoint as frontend's userSearchAPI.search)
//   - Filter out current user from results
//   - Empty state when query < 2: "Type a name to search..."
//   - Empty state when query >= 2 with no results: "No users found"
//   - Per-row: avatar + name + sport label + Follow / Following button
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft, Search, X, User as UserIcon } from "lucide-react-native";
import socialService from "../../services/socialService";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";
import toast from "../../utils/toast";
import { safePush } from "../../services/navigationGuard";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Mirror frontend handleDiscoverSearch (SocialFeedPage.js:591-606): query must be 2+
  // chars before the API fires; results filter out the current viewer.
  const handleSearch = useCallback((text) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await socialService.searchUsers(text);
        const list = Array.isArray(data) ? data : data?.users || data?.results || [];
        setResults(list.filter((u) => (u.id || u._id) !== user?.id));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [user?.id]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleUserPress = useCallback((u) => {
    safePush(router, `/(stack)/player/${u.id || u._id}`);
  }, [router]);

  const handleFollow = useCallback(async (userId) => {
    const toggle = (u) => (u.id === userId ? { ...u, is_following: !u.is_following } : u);
    setResults((prev) => prev.map(toggle));
    try {
      const res = await socialService.toggleFollow(userId);
      const isNow = !!res.following;
      setResults((prev) => prev.map((u) => (u.id === userId ? { ...u, is_following: isNow } : u)));
    } catch {
      setResults((prev) => prev.map(toggle));
      toast.error("Failed");
    }
  }, []);

  const renderUser = useCallback(({ item }) => (
    <View style={styles.userRow}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => handleUserPress(item)} style={styles.avatarTap}>
        {item.avatar ? (
          <Image source={{ uri: mediaUrl(item.avatar) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <UserIcon size={20} color="#94A3B8" />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} onPress={() => handleUserPress(item)} style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name || "Player"}</Text>
        {item.sport ? (
          <Text style={styles.userSport}>{String(item.sport).toLowerCase()}</Text>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.followBtn, item.is_following && styles.followingBtn]}
        activeOpacity={0.8}
        onPress={() => handleFollow(item.id || item._id)}
      >
        <Text style={[styles.followBtnText, item.is_following && styles.followingBtnText]}>
          {item.is_following ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  ), [handleUserPress, handleFollow]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} hitSlop={10}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View style={[styles.searchWrap, focused && styles.searchWrapFocused]}>
          <Search size={16} color={focused ? PRIMARY_COLOR : "#9CA3AF"} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search by username..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); }} activeOpacity={0.7} hitSlop={8}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results / Hints */}
      {loading ? (
        <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Search size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {query.length >= 2 ? "No users found" : "Type a name to search..."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { padding: 4 },
  // Mirror frontend input (SocialFeedPage.js:2462-2468):
  //   `w-full h-10 pl-9 pr-3 bg-secondary border border-border rounded-xl text-sm`
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",          // bg-secondary
    borderWidth: 1,
    borderColor: "#E2E8F0",              // border-border
    borderRadius: 12,                    // rounded-xl
    paddingLeft: 12,
    paddingRight: 12,
    height: 40,                          // h-10
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,                        // text-sm
    color: "#111827",
    padding: 0,                          // remove default RN TextInput vertical padding
  },
  // Frontend focus: `focus:border-brand-600/40 focus:ring-2 focus:ring-brand-600/10`
  searchWrapFocused: {
    borderColor: PRIMARY_COLOR + "66",   // brand-600/40
    backgroundColor: PRIMARY_COLOR + "0D", // very faint brand tint (ring effect on RN)
  },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  // Frontend row layout (SocialFeedPage.js:2478-2527): avatar + name/sport + Follow button
  userRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  avatarTap: { width: 40, height: 40 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  userSport: { fontSize: 11, color: "#6B7280", marginTop: 2, textTransform: "capitalize" },

  // Frontend follow button (line 2515-2526): rounded-full, brand bg / muted bg when following
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  followingBtn: { backgroundColor: "#F3F4F6" },
  followBtnText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  followingBtnText: { color: "#6B7280" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
});
