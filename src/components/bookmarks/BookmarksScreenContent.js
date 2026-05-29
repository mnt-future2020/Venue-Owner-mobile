import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import feedService from "../../services/feedService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { FONTS, PRIMARY_COLOR } from "../../constants/theme";
import { safePush } from "../../services/navigationGuard";
import { onCacheEvent } from "../../services/cacheEvents";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 8;
const GRID_CELL = (SCREEN_WIDTH - 32 - GRID_GAP) / 2;
const _bk = { posts: [], nextCursor: null, hasMore: true, ready: false };

// Clear cached bookmarks on logout so the next user doesn't briefly see
// the previous account's saved posts.
onCacheEvent("auth:logout", () => {
  _bk.posts = [];
  _bk.nextCursor = null;
  _bk.hasMore = true;
  _bk.ready = false;
});

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d` : new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hasMedia(post) {
  return !!(post?.media_url || post?.image || post?.thumbnail || post?.video_url || post?.images?.length || post?.media_urls?.length);
}

function getPrimaryMedia(post) {
  const file = post?.media_urls?.[0] || post?.images?.[0] || post?.media_url || post?.image || post?.thumbnail || post?.video_url || "";
  return file ? mediaUrl(file) : "";
}

function getPostId(post) {
  return post?.id || post?._id || "";
}

export default function BookmarksScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const searchRef = useRef(null);

  const [posts, setPosts] = useState(_bk.posts);
  const [loading, setLoading] = useState(!_bk.ready);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(_bk.nextCursor);
  const [hasMore, setHasMore] = useState(_bk.hasMore);

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  const [activePost, setActivePost] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentPages, setCommentPages] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const loadBookmarks = useCallback(async (beforeCursor = null, isRefresh = false) => {
    try {
      if (!beforeCursor && !isRefresh && !_bk.ready) setLoading(true);
      if (beforeCursor) setLoadingMore(true);
      const data = await feedService.getBookmarks(beforeCursor);
      const list = data?.posts || data?.items || (Array.isArray(data) ? data : []);
      const incomingCursor = data?.next_cursor || null;
      const incomingHasMore = typeof data?.has_more === "boolean" ? data.has_more : list.length >= 20;

      if (!beforeCursor) {
        setPosts(list);
        _bk.posts = list;
        _bk.ready = true;
      } else {
        setPosts((prev) => {
          const seen = new Set(prev.map((item) => String(item.id || item._id)));
          const merged = [...prev, ...list.filter((item) => !seen.has(String(item.id || item._id)))];
          _bk.posts = merged;
          return merged;
        });
      }

      _bk.nextCursor = incomingCursor;
      _bk.hasMore = incomingHasMore;
      setNextCursor(incomingCursor);
      setHasMore(incomingHasMore);
    } catch {
      toast.error("Failed to load saved posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks(null);
  }, [loadBookmarks]);

  useEffect(() => {
    if (!showSearch) return undefined;
    const timer = setTimeout(() => searchRef.current?.focus?.(), 120);
    return () => clearTimeout(timer);
  }, [showSearch]);

  const mediaCount = useMemo(() => posts.filter((post) => hasMedia(post)).length, [posts]);
  const textCount = useMemo(() => posts.filter((post) => !hasMedia(post)).length, [posts]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((post) => `${post.user_name || ""} ${post.content || ""}`.toLowerCase().includes(q));
    }
    if (filterType === "media") result = result.filter((post) => hasMedia(post));
    if (filterType === "text") result = result.filter((post) => !hasMedia(post));
    result.sort((a, b) => {
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return sortOrder === "newest" ? right - left : left - right;
    });
    return result;
  }, [posts, search, filterType, sortOrder]);

  const updatePost = useCallback((postId, updater) => {
    setPosts((prev) => {
      const nextPosts = prev.map((post) => String(post.id || post._id) === String(postId) ? updater(post) : post);
      _bk.posts = nextPosts;
      return nextPosts;
    });
    setActivePost((prev) => prev && String(prev.id || prev._id) === String(postId) ? updater(prev) : prev);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setNextCursor(null);
    setHasMore(true);
    loadBookmarks(null, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    loadBookmarks(nextCursor);
  };

  const handleUnsave = async (postId) => {
    try {
      await feedService.toggleBookmark(postId);
      setPosts((prev) => {
        const nextPosts = prev.filter((post) => String(post.id || post._id) !== String(postId));
        _bk.posts = nextPosts;
        return nextPosts;
      });
      if (activePost && String(activePost.id || activePost._id) === String(postId)) setActivePost(null);
      toast.success("Removed from saved");
    } catch {
      toast.error("Failed to remove bookmark");
    }
  };

  const handleLike = async (postId) => {
    updatePost(postId, (post) => ({
      ...post,
      liked_by_me: !post.liked_by_me,
      likes_count: (post.likes_count || 0) + (post.liked_by_me ? -1 : 1),
    }));
    try {
      await feedService.toggleLike(postId);
    } catch {
      updatePost(postId, (post) => ({
        ...post,
        liked_by_me: !post.liked_by_me,
        likes_count: (post.likes_count || 0) + (post.liked_by_me ? -1 : 1),
      }));
      toast.error("Failed to update like");
    }
  };

  const loadComments = useCallback(async (postId, after = null) => {
    try {
      const data = await feedService.getComments(postId, after);
      const incoming = data?.comments || [];
      setCommentsByPost((prev) => ({ ...prev, [postId]: after ? [...(prev[postId] || []), ...incoming] : incoming }));
      setCommentPages((prev) => ({
        ...prev,
        [postId]: { cursor: data?.next_cursor || null, hasMore: !!data?.has_more, loading: false },
      }));
    } catch {
      setCommentPages((prev) => ({ ...prev, [postId]: { ...(prev[postId] || {}), loading: false } }));
      toast.error("Failed to load comments");
    }
  }, []);

  const openPost = (post) => {
    const postId = getPostId(post);
    if (postId) {
      safePush(router, { pathname: "/(stack)/feed/[postId]", params: { postId: String(postId) } });
    }
  };

  const handleLoadMoreComments = async (postId) => {
    const page = commentPages[postId];
    if (!page?.hasMore || page.loading) return;
    setCommentPages((prev) => ({ ...prev, [postId]: { ...(prev[postId] || {}), loading: true } }));
    await loadComments(postId, page.cursor);
  };

  const handleComment = async (postId) => {
    const text = String(commentInputs[postId] || "").trim();
    if (!text || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const created = await feedService.addComment(postId, { content: text });
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), created] }));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      updatePost(postId, (post) => ({ ...post, comments_count: (post.comments_count || 0) + 1 }));
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const renderGridItem = ({ item }) => {
    const thumb = getPrimaryMedia(item);
    return (
      <TouchableOpacity style={styles.gridCard} activeOpacity={0.92} onPress={() => openPost(item)}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.gridImage} contentFit="cover" />
        ) : (
          <View style={styles.gridTextCard}>
            <Text numberOfLines={5} style={styles.gridText}>{item.content || "Saved post"}</Text>
            <Text numberOfLines={1} style={styles.gridAuthor}>{item.user_name || "Player"}</Text>
          </View>
        )}
        <View style={styles.gridShade}>
          <View style={styles.gridStats}>
            <Text style={styles.gridStat}>{item.likes_count || 0} likes</Text>
            <Text style={styles.gridStat}>{item.comments_count || 0} comments</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.85} style={styles.unsaveFab} onPress={() => handleUnsave(item.id || item._id)}>
          <Ionicons name="bookmark" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }) => {
    const thumb = getPrimaryMedia(item);
    const isOwnItem = item.user_id === user?.id;
    const itemAvatar = isOwnItem ? (user?.avatar ?? item.user_avatar) : item.user_avatar;
    return (
      <TouchableOpacity style={styles.listCard} activeOpacity={0.92} onPress={() => openPost(item)}>
        {thumb ? <Image source={{ uri: thumb }} style={styles.listThumb} contentFit="cover" /> : null}
        <View style={styles.listBody}>
          <View style={styles.listTop}>
            <View style={styles.authorRow}>
              {itemAvatar ? (
                <Image source={{ uri: mediaUrl(itemAvatar) }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarFallback}><Ionicons name="person-outline" size={12} color="#64748B" /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.authorName}>{item.user_name || "Player"}</Text>
                <Text style={styles.authorTime}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.inlineUnsave} onPress={() => handleUnsave(item.id || item._id)}>
              <Ionicons name="bookmark" size={15} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>
          <Text numberOfLines={thumb ? 3 : 4} style={styles.listText}>{item.content || "Saved media post"}</Text>
          <View style={styles.listStats}>
            <Text style={styles.listStatText}>{item.likes_count || 0} likes</Text>
            <Text style={styles.listStatText}>{item.comments_count || 0} comments</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const activePostId = getPostId(activePost);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredPosts}
        key={viewMode}
        keyExtractor={(item) => String(item.id || item._id)}
        numColumns={viewMode === "grid" ? 2 : 1}
        renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
        columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY_COLOR} colors={[PRIMARY_COLOR]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.heroTitle}>Saved</Text>
            <Text style={styles.heroSubtitle}>{posts.length} {posts.length === 1 ? "post" : "posts"}</Text>

            {posts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {[
                  { key: "all", label: `All (${posts.length})`, icon: "bookmark-outline" },
                  { key: "media", label: `Media (${mediaCount})`, icon: "image-outline" },
                  { key: "text", label: `Text (${textCount})`, icon: "document-text-outline" },
                ].map((chip) => {
                  const active = filterType === chip.key;
                  return (
                    <TouchableOpacity key={chip.key} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilterType(chip.key)}>
                      <Ionicons name={chip.icon} size={15} color={active ? "#FFFFFF" : "#64748B"} />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={styles.toolbar}>
              <View style={{ flex: 1 }}>
                {showSearch ? (
                  <View style={styles.searchWrap}>
                    <Ionicons name="search-outline" size={16} color="#64748B" />
                    <TextInput ref={searchRef} value={search} onChangeText={setSearch} placeholder="Search saved posts..." placeholderTextColor="#94A3B8" style={styles.searchInput} />
                    <TouchableOpacity activeOpacity={0.85} onPress={() => { setShowSearch(false); setSearch(""); }}>
                      <Ionicons name="close" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity activeOpacity={0.85} style={styles.searchToggle} onPress={() => setShowSearch(true)}>
                    <Ionicons name="search-outline" size={16} color="#64748B" />
                    <Text style={styles.searchToggleText}>Search saved posts...</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity activeOpacity={0.85} style={styles.iconBtn} onPress={() => setSortOrder((prev) => prev === "newest" ? "oldest" : "newest")}>
                <Ionicons name="swap-vertical-outline" size={17} color={PRIMARY_COLOR} />
              </TouchableOpacity>

              <View style={styles.viewToggle}>
                <TouchableOpacity activeOpacity={0.85} style={[styles.viewBtn, viewMode === "grid" && styles.viewBtnActive]} onPress={() => setViewMode("grid")}>
                  <Ionicons name="grid-outline" size={16} color={viewMode === "grid" ? PRIMARY_COLOR : "#64748B"} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} style={[styles.viewBtn, viewMode === "list" && styles.viewBtnActive]} onPress={() => setViewMode("list")}>
                  <Ionicons name="list-outline" size={16} color={viewMode === "list" ? PRIMARY_COLOR : "#64748B"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={hasMore ? (
          <TouchableOpacity activeOpacity={0.85} style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? <ActivityIndicator size="small" color={PRIMARY_COLOR} /> : <Text style={styles.loadMoreText}>Load More</Text>}
          </TouchableOpacity>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="bookmark-outline" size={34} color="#94A3B8" /></View>
            <Text style={styles.emptyTitle}>{search.trim() || filterType !== "all" ? "Nothing matched" : "No saved posts yet"}</Text>
            <Text style={styles.emptySubtitle}>{search.trim() || filterType !== "all" ? "Try a different search or filter." : "Tap the bookmark icon on any post to save it here for later."}</Text>
            {!search.trim() && filterType === "all" ? (
              <TouchableOpacity activeOpacity={0.85} style={styles.browseFeedBtn} onPress={() => router.replace("/(tabs)/feed")}>
                <Text style={styles.browseFeedText}>Browse Feed</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      <Modal visible={!!activePost} transparent animationType="fade" onRequestClose={() => setActivePost(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => setActivePost(null)} />
          {activePost ? (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
              <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity activeOpacity={0.85} style={styles.modalProfile} onPress={() => { setActivePost(null); if (activePost.user_id) safePush(router, `/(stack)/player/${activePost.user_id}`); }}>
                    {(() => { const mAvatar = activePost.user_id === user?.id ? (user?.avatar ?? activePost.user_avatar) : activePost.user_avatar; return mAvatar ? <Image source={{ uri: mediaUrl(mAvatar) }} style={styles.modalAvatar} contentFit="cover" /> : <View style={styles.avatarFallback}><Ionicons name="person-outline" size={12} color="#64748B" /></View>; })()}
                    <View><Text style={styles.authorName}>{activePost.user_name || "Player"}</Text><Text style={styles.authorTime}>{timeAgo(activePost.created_at)}</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.85} style={styles.iconBtn} onPress={() => setActivePost(null)}>
                    <Ionicons name="close" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {activePost.content ? <Text style={styles.modalText}>{activePost.content}</Text> : null}
                  {getPrimaryMedia(activePost) ? <Image source={{ uri: getPrimaryMedia(activePost) }} style={styles.modalImage} contentFit="cover" /> : null}

                  <View style={styles.modalActions}>
                    <TouchableOpacity activeOpacity={0.85} style={styles.actionBtn} onPress={() => handleLike(activePost.id || activePost._id)}>
                      <Ionicons name={activePost.liked_by_me ? "heart" : "heart-outline"} size={18} color={activePost.liked_by_me ? "#EC4899" : "#64748B"} />
                      <Text style={styles.actionText}>{activePost.likes_count || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.85} style={styles.actionBtn} onPress={() => handleUnsave(activePost.id || activePost._id)}>
                      <Ionicons name="bookmark" size={18} color={PRIMARY_COLOR} />
                    </TouchableOpacity>
                    {activePost.user_id && String(activePost.user_id) !== String(user?.id) ? (
                      <TouchableOpacity activeOpacity={0.85} style={styles.actionBtn} onPress={() => { setActivePost(null); safePush(router, `/(stack)/player/${activePost.user_id}`); }}>
                        <Ionicons name="person-outline" size={18} color="#64748B" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.commentsHeading}>Comments ({activePost.comments_count || 0})</Text>
                  {(commentsByPost[activePostId] || []).length === 0 ? (
                    <Text style={styles.commentsEmpty}>No comments yet</Text>
                  ) : (
                    (commentsByPost[activePostId] || []).map((comment) => (
                      <View key={comment.id || comment._id} style={styles.commentRow}>
                        {(() => { const cAvatar = comment.user_id === user?.id ? (user?.avatar ?? comment.user_avatar) : comment.user_avatar; return cAvatar ? <Image source={{ uri: mediaUrl(cAvatar) }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatarFallback}><Ionicons name="person-outline" size={12} color="#64748B" /></View>; })()}
                        <View style={styles.commentBubble}>
                          <View style={styles.commentMetaRow}>
                            <Text style={styles.commentUser}>{comment.user_name || "Player"}</Text>
                            <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
                          </View>
                          <Text style={styles.commentText}>{comment.content}</Text>
                        </View>
                      </View>
                    ))
                  )}

                  {commentPages[activePostId]?.hasMore ? (
                    <TouchableOpacity activeOpacity={0.85} style={styles.moreCommentsBtn} onPress={() => handleLoadMoreComments(activePostId)} disabled={commentPages[activePostId]?.loading}>
                      {commentPages[activePostId]?.loading ? <ActivityIndicator size="small" color={PRIMARY_COLOR} /> : <Text style={styles.moreCommentsText}>Load more comments</Text>}
                    </TouchableOpacity>
                  ) : null}
                </ScrollView>

                <View style={styles.commentComposer}>
                  <TextInput
                    value={commentInputs[activePostId] || ""}
                    onChangeText={(text) => setCommentInputs((prev) => ({ ...prev, [activePostId]: text }))}
                    placeholder="Add a comment..."
                    placeholderTextColor="#94A3B8"
                    style={styles.commentInput}
                    multiline
                  />
                  <TouchableOpacity activeOpacity={0.85} style={[styles.sendBtn, !(commentInputs[activePostId] || "").trim() && styles.sendBtnDisabled]} onPress={() => handleComment(activePostId)} disabled={!(commentInputs[activePostId] || "").trim() || commentSubmitting}>
                    {commentSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  headerBlock: { paddingBottom: 18 },
  heroTitle: { fontSize: 28, color: "#0F172A", fontFamily: FONTS.displayBold },
  heroSubtitle: { marginTop: 4, fontSize: 13, color: "#64748B", fontFamily: FONTS.bodyMedium },
  chipsRow: { gap: 10, paddingTop: 14, paddingBottom: 14, paddingRight: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  chipText: { fontSize: 13, color: "#64748B", fontFamily: FONTS.bodyBold },
  chipTextActive: { color: "#FFFFFF" },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchToggle: { height: 46, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  searchToggleText: { fontSize: 14, color: "#64748B", fontFamily: FONTS.body },
  searchWrap: { height: 46, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: FONTS.body },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  viewToggle: { flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 999, padding: 3 },
  viewBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  viewBtnActive: { backgroundColor: "#FFFFFF" },
  gridRow: { justifyContent: "space-between", marginBottom: GRID_GAP },
  gridCard: { width: GRID_CELL, height: GRID_CELL, borderRadius: 22, overflow: "hidden", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  gridImage: { width: "100%", height: "100%", backgroundColor: "#E2E8F0" },
  gridTextCard: { flex: 1, padding: 14, justifyContent: "space-between" },
  gridText: { fontSize: 13, lineHeight: 19, color: "#334155", fontFamily: FONTS.body },
  gridAuthor: { fontSize: 11, color: "#64748B", fontFamily: FONTS.bodyBold },
  gridShade: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(15,23,42,0.42)" },
  gridStats: { flexDirection: "row", gap: 12 },
  gridStat: { fontSize: 12, color: "#FFFFFF", fontFamily: FONTS.bodyBold },
  unsaveFab: { position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(15,23,42,0.45)", alignItems: "center", justifyContent: "center" },
  listCard: { borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden", marginBottom: 12 },
  listThumb: { width: "100%", height: 180, backgroundColor: "#E2E8F0" },
  listBody: { padding: 16, gap: 12 },
  listTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  authorName: { fontSize: 13, color: "#0F172A", fontFamily: FONTS.bodyBold },
  authorTime: { fontSize: 11, color: "#94A3B8", fontFamily: FONTS.body },
  inlineUnsave: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#ECFDF5" },
  listText: { fontSize: 14, lineHeight: 21, color: "#334155", fontFamily: FONTS.body },
  listStats: { flexDirection: "row", gap: 16 },
  listStatText: { fontSize: 12, color: "#64748B", fontFamily: FONTS.bodyBold },
  loadMoreBtn: { marginTop: 8, height: 48, borderRadius: 16, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#CFEFDE", alignItems: "center", justifyContent: "center" },
  loadMoreText: { fontSize: 14, color: PRIMARY_COLOR, fontFamily: FONTS.bodyBold },
  emptyState: { alignItems: "center", paddingTop: 44, paddingBottom: 20, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 19, color: "#0F172A", fontFamily: FONTS.displayBold },
  emptySubtitle: { maxWidth: 260, textAlign: "center", fontSize: 13, lineHeight: 20, color: "#64748B", fontFamily: FONTS.body },
  browseFeedBtn: { marginTop: 16, backgroundColor: PRIMARY_COLOR, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 11 },
  browseFeedText: { color: "#FFFFFF", fontSize: 14, fontFamily: FONTS.bodyBold },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalSheet: { minHeight: 420, maxHeight: "88%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalProfile: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  modalAvatar: { width: 32, height: 32, borderRadius: 16 },
  modalContent: { padding: 18, gap: 16 },
  modalText: { fontSize: 15, lineHeight: 24, color: "#334155", fontFamily: FONTS.body },
  modalImage: { width: "100%", height: 240, borderRadius: 18, backgroundColor: "#E2E8F0" },
  modalActions: { flexDirection: "row", gap: 10 },
  actionBtn: { minWidth: 44, height: 38, borderRadius: 19, backgroundColor: "#F8FAFC", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionText: { fontSize: 12, color: "#64748B", fontFamily: FONTS.bodyBold },
  commentsHeading: { fontSize: 12, color: "#64748B", fontFamily: FONTS.bodyBold, textTransform: "uppercase", letterSpacing: 0.5 },
  commentsEmpty: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 14, fontFamily: FONTS.body },
  commentRow: { flexDirection: "row", gap: 10 },
  commentBubble: { flex: 1, borderRadius: 16, backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  commentMetaRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  commentUser: { fontSize: 12, color: "#0F172A", fontFamily: FONTS.bodyBold },
  commentTime: { fontSize: 10, color: "#94A3B8", fontFamily: FONTS.body },
  commentText: { fontSize: 13, lineHeight: 18, color: "#334155", fontFamily: FONTS.body },
  moreCommentsBtn: { paddingVertical: 6, alignItems: "flex-start" },
  moreCommentsText: { fontSize: 12, color: PRIMARY_COLOR, fontFamily: FONTS.bodyBold },
  commentComposer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 18, paddingTop: 12 },
  commentInput: { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", textAlignVertical: "top", fontFamily: FONTS.body },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY_COLOR, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.45 },
});
