import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StoriesBar from "./StoriesBar";
import FeedTabs from "./FeedTabs";
import SuggestedFollows from "./SuggestedFollows";
import FeedPostCard from "./FeedPostCard";
import FeedLoadingState from "./FeedLoadingState";
import FeedEmptyState from "./FeedEmptyState";
import FeedStatsCard from "./FeedStatsCard";
import FeedStreakModal from "./FeedStreakModal";
import FeedCommentsSheet from "./FeedCommentsSheet";
import FeedShareSheet from "./FeedShareSheet";
import FeedPostMenuSheet from "./FeedPostMenuSheet";
import FollowModal from "./FollowModal";
import feedService from "../../services/feedService";
import chatService from "../../services/chatService";
import socialService from "../../services/socialService";
import cacheService from "../../services/cacheService";
import toast from "../../utils/toast";
import TabRefreshContext from "../../context/TabRefreshContext";
import SwipeTabContext from "../../context/SwipeTabContext";
import { useAuth } from "../../context/AuthContext";
import { PRIMARY_COLOR } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import { safePush } from "../../services/navigationGuard";

// Vertical gap between feed cards. Defined at module scope so the reference is stable
// across renders — FlashList re-mounts the separator if the component identity changes.
const ItemSeparator = () => <View style={{ height: 12 }} />;

/* ── Module-level cache — survives unmount/remount ── */
const _cache = {
  for_you: { posts: [], cursor: null, hasMore: false },
  following: { posts: [], cursor: null, hasMore: false },
  trending: { posts: [], cursor: null, hasMore: false },
  stories: [],
  engagement: null,
  suggested: [],
  ready: false, // true after first successful load
};

// Initialize cache from cacheService if available
const initializeCache = () => {
  if (cacheService.isPreloaded()) {
    const cachedData = cacheService.getAllData();
    _cache.for_you = cachedData.feedData.for_you;
    _cache.following = cachedData.feedData.following;
    _cache.stories = cachedData.stories;
    _cache.engagement = cachedData.engagement;
    _cache.suggested = cachedData.suggested;
    _cache.ready = cachedData.ready;
  }
};

// Initialize on module load
initializeCache();

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const didMountRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const feedAbortRef = useRef(null);
  const autoPrefetchRef = useRef(null);
  const storiesRef = useRef(_cache.stories);
  const engagementRef = useRef(_cache.engagement);
  const suggestedRef = useRef(_cache.suggested);
  const isAlgoRankedRef = useRef(false);
  const { refreshSignals } = useContext(TabRefreshContext);
  const { onContentScroll, headerHeight: sharedHeaderHeight } = useContext(SwipeTabContext);
  const [activeTab, setActiveTab] = useState("for_you");
  const [stories, setStories] = useState(_cache.stories);
  const [engagement, setEngagement] = useState(_cache.engagement);
  const [suggested, setSuggested] = useState(_cache.suggested);
  const [posts, setPosts] = useState(_cache.for_you.posts);
  const [loading, setLoading] = useState(!_cache.ready && !cacheService.isPreloaded());
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [followModalType, setFollowModalType] = useState(null); // null | "followers" | "following"
  const [videosMuted, setVideosMuted] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [nextCursor, setNextCursor] = useState(_cache.for_you.cursor);
  const [hasMore, setHasMore] = useState(_cache.for_you.hasMore);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchPostResults, setSearchPostResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTab, setSearchTab] = useState("players");
  const searchTimerRef = useRef(null);

  useEffect(() => {
    storiesRef.current = stories;
    _cache.stories = stories;
  }, [stories]);

  useEffect(() => {
    engagementRef.current = engagement;
    _cache.engagement = engagement;
  }, [engagement]);

  useEffect(() => {
    suggestedRef.current = suggested;
    _cache.suggested = suggested;
  }, [suggested]);

  // Keep cache in sync with optimistic UI updates
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    if (posts.length > 0) {
      const c = _cache[activeTabRef.current];
      if (c) c.posts = posts;
    }
  }, [posts]);

  useEffect(() => {
    return () => {
      if (autoPrefetchRef.current) {
        clearTimeout(autoPrefetchRef.current);
      }
    };
  }, []);

  const loadFeed = useCallback(
    async (tab = activeTab, showLoader = true, cursor = null) => {
      if (cursor && loadingMoreRef.current) return;

      // Abort in-flight fresh loads on tab switch (not "load more")
      if (!cursor && feedAbortRef.current) {
        feedAbortRef.current.abort();
      }
      const abortController = !cursor ? new AbortController() : null;
      if (abortController) feedAbortRef.current = abortController;

      // Check if we have preloaded data and this is the first load
      if (!cursor && cacheService.isPreloaded() && !_cache.ready) {
        const cachedData = cacheService.getAllData();
        
        // Set state from preloaded data
        setPosts(cachedData.feedData[tab]?.posts || []);
        setNextCursor(cachedData.feedData[tab]?.cursor || null);
        setHasMore(cachedData.feedData[tab]?.hasMore || false);
        setStories(cachedData.stories);
        setEngagement(cachedData.engagement);
        setSuggested(cachedData.suggested);
        
        // Update module cache
        _cache.for_you = cachedData.feedData.for_you;
        _cache.following = cachedData.feedData.following;
        _cache.stories = cachedData.stories;
        _cache.engagement = cachedData.engagement;
        _cache.suggested = cachedData.suggested;
        _cache.ready = true;
        
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      if (cursor) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else if (showLoader && !_cache.ready) {
        // Only show full-screen loader on the very first load ever
        setLoading(true);
      }

      try {
        const feedPromise = tab === "trending"
          ? feedService.getTrending(cursor || undefined)
          : feedService.getFeed(tab, cursor);

        const [feedData, storiesData, engagementData, suggestedData] = await Promise.all([
          feedPromise,
          cursor ? Promise.resolve(storiesRef.current) : feedService.getStories().catch(() => []),
          cursor ? Promise.resolve(engagementRef.current) : feedService.getMyEngagement().catch(() => null),
          cursor
            ? Promise.resolve(suggestedRef.current)
            : Promise.all([
                feedService.getSuggestedFollows().catch(() => []),
                feedService.getRecommendedPlayers(10).catch(() => []),
              ]).then(([suggestedFollows, recommendedPlayers]) => {
                isAlgoRankedRef.current = !!recommendedPlayers?.length;
                return recommendedPlayers?.length ? recommendedPlayers : suggestedFollows;
              }),
        ]);

        const incomingPosts = feedData?.posts || [];

        // Prefetch post media into the disk cache — chunked at 8 with 120 ms stagger
        // (HTTP/2 connection-pool sweet spot, won't starve other API calls). Only
        // images are prefetched; videos stream when active so cold-starting them
        // through prefetch is wasted bandwidth. Avatars + cover images come via the
        // post's own URL so they're already covered by this list.
        const imageUrls = incomingPosts
          .filter((p) => {
            if (!p) return false;
            const url = p.media_url || p.media_urls?.[0] || "";
            if (!url) return false;
            // Skip videos — they shouldn't be prefetched as still images.
            return !(p.post_type === "video" || /\.(mp4|mov|webm|m3u8)$/i.test(url));
          })
          .map((p) => p.media_url || p.media_urls?.[0])
          .filter(Boolean);
        if (imageUrls.length) {
          const CHUNK = 8;
          Image.prefetch(imageUrls.slice(0, CHUNK)).catch(() => {});
          for (let i = CHUNK; i < imageUrls.length; i += CHUNK) {
            const chunk = imageUrls.slice(i, i + CHUNK);
            setTimeout(() => { Image.prefetch(chunk).catch(() => {}); }, ((i / CHUNK) * 120));
          }
        }

        // Update state
        setPosts((prev) => {
          if (!cursor) return incomingPosts;
          const existing = new Set(prev.map((item) => item.id));
          return [...prev, ...incomingPosts.filter((item) => !existing.has(item.id))];
        });
        setNextCursor(feedData?.next_cursor || null);
        setHasMore(!!feedData?.has_more);

        if (!cursor) {
          setStories(storiesData || []);
          setEngagement(engagementData);
          setSuggested(suggestedData || []);
        }

        // ── Persist to module cache ──
        const tabCache = _cache[tab] || _cache.for_you;
        if (!cursor) {
          tabCache.posts = incomingPosts;
        } else {
          const existing = new Set(tabCache.posts.map((p) => p.id));
          tabCache.posts = [...tabCache.posts, ...incomingPosts.filter((p) => !existing.has(p.id))];
        }
        tabCache.cursor = feedData?.next_cursor || null;
        tabCache.hasMore = !!feedData?.has_more;

        if (!cursor) {
          _cache.stories = storiesData || [];
          _cache.engagement = engagementData;
          _cache.suggested = suggestedData || [];
        }
        _cache.ready = true;
        
        // Update cache service
        if (!cursor) {
          cacheService.setFeedData(tab, feedData);
          cacheService.setStories(storiesData);
          cacheService.setEngagement(engagementData);
          cacheService.setSuggested(suggestedData);
          cacheService.setReady(true);
        }
      } catch (error) {
        // Silently ignore aborted requests (user switched tabs)
        if (error?.name === "AbortError") return;
        // Only show error toast if there's no cached data to display
        if (!_cache.ready && !cacheService.isPreloaded()) {
          toast.error("Failed to load feed");
        }
      } finally {
        loadingMoreRef.current = false;
        if (cursor) {
          setTimeout(() => setLoadingMore(false), 0);
        } else {
          setLoadingMore(false);
        }
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    // Restore cached data for this tab instantly (no loader)
    const cached = _cache[activeTab];
    if (cached && cached.posts.length > 0) {
      setPosts(cached.posts);
      setNextCursor(cached.cursor);
      setHasMore(cached.hasMore);
      setStories(_cache.stories);
      setEngagement(_cache.engagement);
      setSuggested(_cache.suggested);
      // Silent background refresh
      loadFeed(activeTab, false);
    } else {
      // First-ever load for this tab
      loadFeed(activeTab, true);
    }
  }, [activeTab, loadFeed]);

  useEffect(() => {
    if (loading || refreshing || loadingMore || !hasMore || !nextCursor || posts.length < 1) return;
    if (posts.length > 10) return;
    if (loadingMoreRef.current) return;

    if (autoPrefetchRef.current) {
      clearTimeout(autoPrefetchRef.current);
    }

    autoPrefetchRef.current = setTimeout(() => {
      loadFeed(activeTab, false, nextCursor);
    }, 120);

    return () => {
      if (autoPrefetchRef.current) {
        clearTimeout(autoPrefetchRef.current);
      }
    };
  }, [activeTab, hasMore, loadFeed, loading, loadingMore, nextCursor, posts.length, refreshing]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (!refreshSignals.feed) return;

    scrollRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    setRefreshing(true);
    loadFeed(activeTab, false);
  }, [activeTab, loadFeed, refreshSignals.feed]);

  const handleRefresh = useCallback(() => {
    setNextCursor(null);
    setHasMore(false);
    setRefreshing(true);
    loadFeed(activeTab, false, null);
  }, [activeTab, loadFeed]);

  const handleToggleLike = useCallback(
    async (postId) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                liked_by_me: !post.liked_by_me,
                likes_count: (post.likes_count || 0) + (post.liked_by_me ? -1 : 1),
              }
            : post
        )
      );

      try {
        await feedService.toggleLike(postId);
      } catch {
        toast.error("Failed to update like");
        loadFeed(activeTab, false);
      }
    },
    [activeTab, loadFeed]
  );

  const handleToggleBookmark = useCallback(
    async (postId) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                bookmarked_by_me: !post.bookmarked_by_me,
              }
            : post
        )
      );

      try {
        await feedService.toggleBookmark(postId);
      } catch {
        toast.error("Failed to update saved post");
        loadFeed(activeTab, false);
      }
    },
    [activeTab, loadFeed]
  );

  const handleReactToPost = useCallback(
    async (postId, reaction) => {
      const previousPosts = posts;

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

          const nextReactions = { ...(post.reactions || {}) };
          const oldReaction = post.my_reaction;

          if (oldReaction) {
            nextReactions[oldReaction] = Math.max((nextReactions[oldReaction] || 1) - 1, 0);
          }

          if (oldReaction !== reaction) {
            nextReactions[reaction] = (nextReactions[reaction] || 0) + 1;
          }

          return {
            ...post,
            my_reaction: oldReaction === reaction ? null : reaction,
            reactions: nextReactions,
          };
        })
      );

      try {
        const response = await feedService.reactToPost(postId, reaction);
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  my_reaction: response.reaction || null,
                }
              : post
          )
        );
      } catch {
        setPosts(previousPosts);
        toast.error("Failed to update reaction");
      }
    },
    [posts]
  );

  const handleToggleFollow = useCallback(async (userId) => {
    if (!userId) return;

    const previousPosts = posts;
    const previousSuggested = suggested;
    const nextFollowing = !previousPosts.find((post) => post.user_id === userId)?.is_following;

    setPosts((prev) =>
      prev.map((post) => (post.user_id === userId ? { ...post, is_following: nextFollowing } : post))
    );
    setSuggested((prev) =>
      prev.map((item) =>
        (item.id || item.user_id) === userId ? { ...item, is_following: nextFollowing } : item
      )
    );

    try {
      const response = await socialService.toggleFollow(userId);
      const isFollowing = !!response.following;
      setPosts((prev) =>
        prev.map((post) => (post.user_id === userId ? { ...post, is_following: isFollowing } : post))
      );
      setSuggested((prev) =>
        prev.map((item) =>
          (item.id || item.user_id) === userId ? { ...item, is_following: isFollowing } : item
        )
      );
      toast.success(isFollowing ? "Following!" : "Unfollowed");
      // Refresh engagement counts (followers/following may have changed)
      feedService.getMyEngagement().then((data) => {
        if (data) setEngagement(data);
      }).catch(() => {});
    } catch {
      setPosts(previousPosts);
      setSuggested(previousSuggested);
      toast.error("Failed to update follow status");
    }
  }, [posts, suggested]);

  const openComments = useCallback(async (post) => {
    setActiveCommentPost(post);
    setCommentsLoading(true);
    setComments([]);

    try {
      const data = await feedService.getComments(post.id);
      setComments(data?.comments || data || []);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const handleCommentSubmit = useCallback(
    async (text) => {
      if (!activeCommentPost?.id) return false;

      setCommentSubmitting(true);
      try {
        const response = await feedService.addComment(activeCommentPost.id, { content: text });
        const newComment = response.comment || {
          id: `temp-${Date.now()}`,
          content: text,
          created_at: new Date().toISOString(),
          user_name: "You",
        };

        setComments((prev) => [newComment, ...prev]);
        setPosts((prev) =>
          prev.map((post) =>
            post.id === activeCommentPost.id
              ? { ...post, comments_count: (post.comments_count || 0) + 1 }
              : post
          )
        );
        setActiveCommentPost((prev) =>
          prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev
        );
        return true;
      } catch {
        toast.error("Failed to add comment");
        return false;
      } finally {
        setCommentSubmitting(false);
      }
    },
    [activeCommentPost]
  );
  const handleLoadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loading || refreshing || loadingMoreRef.current) return;
    loadFeed(activeTab, false, nextCursor);
  }, [activeTab, hasMore, loading, loadFeed, nextCursor, refreshing]);

  const handleScroll = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      // Collapse/expand shared header only — no manual preload (FlatList onEndReached handles it)
      onContentScroll?.(offsetY);
    },
    [onContentScroll]
  );

  // Stable callback refs so renderItem doesn't get new function references
  const toggleMuteRef = useRef(() => setVideosMuted((p) => !p));
  const handleToggleLikeRef = useRef(handleToggleLike);
  handleToggleLikeRef.current = handleToggleLike;
  const handleReactRef = useRef(handleReactToPost);
  handleReactRef.current = handleReactToPost;
  const handleToggleBookmarkRef = useRef(handleToggleBookmark);
  handleToggleBookmarkRef.current = handleToggleBookmark;
  const handleToggleFollowRef = useRef(handleToggleFollow);
  handleToggleFollowRef.current = handleToggleFollow;
  const openCommentsRef = useRef(openComments);
  openCommentsRef.current = openComments;

  const stableToggleMute = useCallback(() => toggleMuteRef.current(), []);
  const stableLike = useCallback((id) => handleToggleLikeRef.current(id), []);
  const stableReact = useCallback((id, r) => handleReactRef.current(id, r), []);
  const stableBookmark = useCallback((id) => handleToggleBookmarkRef.current(id), []);
  const stableFollow = useCallback((id) => handleToggleFollowRef.current(id), []);
  const stableComments = useCallback((p) => openCommentsRef.current(p), []);

  const isVideoFeedPost = useCallback((post) => {
    const media = post?.media_urls?.[0] || post?.media_url || "";
    if (!media) return false;
    return post?.post_type === "video" || /\.(mp4|mov|webm|m3u8)$/i.test(String(media));
  }, []);

  const activeVideoIdRef = useRef(activeVideoId);
  activeVideoIdRef.current = activeVideoId;
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 80,
  });
  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    const nextActiveVideoId =
      viewableItems.find(
        ({ item, isViewable }) =>
          isViewable &&
          item &&
          item._type !== "suggested_follows" &&
          isVideoFeedPost(item)
      )?.item?.id || null;

    if (activeVideoIdRef.current !== nextActiveVideoId) {
      activeVideoIdRef.current = nextActiveVideoId;
      setActiveVideoId(nextActiveVideoId);
    }
  });

  // Insert SuggestedFollows inline at a random spot between posts 2-4
  const suggestedInsertIdx = useRef(Math.floor(Math.random() * 3) + 2).current;

  const feedData = useMemo(() => {
    if (!posts.length || !suggested.length) return posts;
    const idx = Math.min(suggestedInsertIdx, posts.length);
    const copy = [...posts];
    copy.splice(idx, 0, { _type: "suggested_follows" });
    return copy;
  }, [posts, suggested, suggestedInsertIdx]);

  const renderItem = useCallback(
    ({ item }) => {
      if (item._type === "suggested_follows") {
        return <SuggestedFollows users={suggested} onToggleFollow={stableFollow} isAlgoRanked={isAlgoRankedRef.current} />;
      }
      const post = item;
      return (
          <FeedPostCard
            post={post}
            videosMuted={videosMuted}
            onToggleVideoMute={stableToggleMute}
            isVideoActive={activeVideoId === post.id}
            onToggleLike={stableLike}
            onReact={stableReact}
            onToggleBookmark={stableBookmark}
            onToggleFollow={stableFollow}
            onOpenComments={stableComments}
            onOpenShare={setSharePost}
            onOpenMenu={setMenuPost}
          />
      );
    },
    [videosMuted, activeVideoId,
     stableToggleMute, stableLike,
     stableReact, stableBookmark, stableFollow, stableComments, suggested]
  );

  const handleCreateStory = useCallback(() => safePush(router, "/(stack)/feed/create-story"), [router]);
  const handlePromptReply = useCallback(() => {
    const prompt = engagement?.daily_prompt || "";
    safePush(router, { pathname: "/(stack)/feed/create-post", params: prompt ? { prompt } : {} });
  }, [router, engagement]);
  const handleOpenStory = useCallback(
    (storyGroup) => {
      // Optimistically mark this group as viewed — ring turns grey instantly
      setStories((prev) =>
        prev.map((g) =>
          g.user_id === storyGroup.user_id ? { ...g, has_unviewed: false } : g
        )
      );
      safePush(router, { pathname: "/(stack)/feed/story-viewer", params: { userId: String(storyGroup.user_id || "") } });
    },
    [router]
  );

  const handleFollowModalToggle = useCallback((userId, isFollowing) => {
    // Sync follow state across feed posts + suggested
    setPosts((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, is_following: isFollowing } : p))
    );
    setSuggested((prev) =>
      prev.map((item) =>
        (item.id || item.user_id) === userId ? { ...item, is_following: isFollowing } : item
      )
    );
    // Refresh engagement counts
    feedService.getMyEngagement().then((data) => {
      if (data) setEngagement(data);
    }).catch(() => {});
  }, []);

  const listHeader = useMemo(
    () => (
      <View>
        <View style={{ height: 10 }} />
        <StoriesBar stories={stories} onCreateStory={handleCreateStory} onOpenStory={handleOpenStory} currentUserId={user?.id} />
        {/* {engagement ? (
          <View style={{ marginBottom: 8 }}>
            <FeedStatsCard
              engagement={engagement}
              onStatPress={() => setShowStreakModal(true)}
              onFollowersPress={() => setFollowModalType("followers")}
              onFollowingPress={() => setFollowModalType("following")}
              onPromptReply={handlePromptReply}
            />
          </View>
        ) : null} */}
        <FeedTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          onDiscover={() => {
            setSearchTab("players");
            setShowSearchModal(true);
          }}
          onPost={() => safePush(router, "/(stack)/feed/create-post")}
        />
      </View>
    ),
    [stories, activeTab, engagement, handleCreateStory, handleOpenStory, handlePromptReply, router]
  );

  const listEmpty = useMemo(
    () => (
      <FeedEmptyState
        title="No posts yet"
        description="Be the first to share something!"
        onRetry={handleRefresh}
      />
    ),
    [handleRefresh]
  );

  const keyExtractor = useCallback(
    (item) => item._type === "suggested_follows" ? "__suggested__" : String(item.id || item._id),
    []
  );

  // FlashList recycles cells within the same type pool. Mixing video / photo / text
  // posts in one pool forces layout work each scroll (different heights + inner trees).
  // Splitting into 4 narrow pools means a recycled cell of one kind is always reused
  // for the same kind → no layout thrashing, no image blink, no <Video> re-mount.
  const getItemType = useCallback((item) => {
    if (item._type === "suggested_follows") return "suggested";
    const hasMedia = (item.media_urls?.length || !!item.media_url);
    if (!hasMedia) return "post_text";
    const primaryUrl = item.media_url || item.media_urls?.[0] || "";
    const isVideo = item.post_type === "video" || /\.(mp4|mov|webm|m3u8)$/i.test(primaryUrl);
    return isVideo ? "post_video" : "post_photo";
  }, []);


  /* ── User + Post Search / Discover (debounced) ── */
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      setSearchPostResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const [exploreRes, chatRes, postsRes] = await Promise.allSettled([
          feedService.explore(text.trim()),
          chatService.searchUsers(text.trim()),
          feedService.searchPosts(text.trim()),
        ]);
        const exploreUsers = exploreRes.status === "fulfilled" ? (exploreRes.value?.users || []) : [];
        const chatUsers = chatRes.status === "fulfilled" ? (chatRes.value || []) : [];
        const posts = postsRes.status === "fulfilled" ? (postsRes.value?.posts || postsRes.value?.results || []) : [];
        // Merge and deduplicate users by id
        const seen = new Set();
        const merged = [];
        for (const u of [...exploreUsers, ...chatUsers]) {
          const uid = u.id || u._id;
          if (uid && !seen.has(uid)) {
            seen.add(uid);
            merged.push(u);
          }
        }
        setSearchResults(merged);
        setSearchPostResults(Array.isArray(posts) ? posts : []);
      } catch {
        toast.error("Search failed");
        setSearchResults([]);
        setSearchPostResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, []);

  const handleDiscoverFollow = useCallback(async (userId) => {
    if (!userId) return;
    // Optimistic update
    setSearchResults((prev) =>
      prev.map((u) =>
        (u.id || u._id) === userId ? { ...u, is_following: !u.is_following } : u
      )
    );
    try {
      const res = await socialService.toggleFollow(userId);
      const isFollowing = !!res.following;
      setSearchResults((prev) =>
        prev.map((u) =>
          (u.id || u._id) === userId ? { ...u, is_following: isFollowing } : u
        )
      );
    } catch {
      // Revert on error
      setSearchResults((prev) =>
        prev.map((u) =>
          (u.id || u._id) === userId ? { ...u, is_following: !u.is_following } : u
        )
      );
      toast.error("Failed to update follow status");
    }
  }, []);

  const handleSearchUserPress = useCallback((user) => {
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchResults([]);
    safePush(router, `/(stack)/player/${user.id}`);
  }, [router]);

  const closeSearchModal = useCallback(() => {
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchPostResults([]);
    setSearchTab("players");
  }, []);

  const handleSearchPostPress = useCallback((post) => {
    const postId = post?.id || post?._id;
    if (!postId) return;
    closeSearchModal();
    safePush(router, { pathname: "/(stack)/feed/[postId]", params: { postId: String(postId) } });
  }, [closeSearchModal, router]);

  const handleDeletePost = useCallback(async (postToDelete) => {
    const postId = postToDelete?.id || postToDelete?._id;
    if (!postId) return;

    setMenuPost(null);
    const previousPosts = posts;
    setPosts((prev) => prev.filter((item) => String(item.id || item._id) !== String(postId)));

    try {
      await feedService.deletePost(postId);
      const activeCache = _cache[activeTab];
      if (activeCache) {
        activeCache.posts = activeCache.posts.filter((item) => String(item.id || item._id) !== String(postId));
      }
      toast.success("Post deleted");
    } catch {
      setPosts(previousPosts);
      if (_cache[activeTab]) {
        _cache[activeTab].posts = previousPosts;
      }
      toast.error("Failed to delete post");
    }
  }, [activeTab, posts]);

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenWrap}>
        {loading ? (
          <FeedLoadingState topOffset={sharedHeaderHeight} />
        ) : (
          <FlashList
            ref={scrollRef}
            data={feedData}
            keyExtractor={keyExtractor}
            // Separate recycling pools per cell type (text / photo / video / suggested)
            // so a recycled cell is always reused for the same shape. Prevents image
            // flicker and inner-tree remount when scrolling between heterogeneous posts.
            getItemType={getItemType}
            // Average card heights per type — helps FlashList lay out the next viewport
            // before the user gets there. Off-by-50px is fine; off-by-200 causes jank.
            estimatedItemSize={520}
            contentContainerStyle={{ paddingTop: sharedHeaderHeight || 0, paddingHorizontal: 14, paddingBottom: 108 }}
            ItemSeparatorComponent={ItemSeparator}
            // Render ahead by ~1 screen so cells are already mounted when they scroll into view
            drawDistance={600}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#059669" colors={["#059669"]} progressViewOffset={sharedHeaderHeight || 0} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            viewabilityConfig={viewabilityConfigRef.current}
            onViewableItemsChanged={onViewableItemsChangedRef.current}
            ListHeaderComponent={listHeader}
            renderItem={renderItem}
            ListEmptyComponent={listEmpty}
          />
        )}
      </View>

      <FeedStreakModal visible={showStreakModal} onClose={() => setShowStreakModal(false)} engagement={engagement} onPromptReply={handlePromptReply} />
      <FeedCommentsSheet
        visible={!!activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
        post={activeCommentPost}
        comments={comments}
        loading={commentsLoading}
        submitting={commentSubmitting}
        onSubmit={handleCommentSubmit}
        currentUserId={user?.id || user?._id}
      />
      <FeedShareSheet visible={!!sharePost} onClose={() => setSharePost(null)} post={sharePost} />
      <FeedPostMenuSheet visible={!!menuPost} onClose={() => setMenuPost(null)} post={menuPost} onDelete={handleDeletePost} />
      <FollowModal
        visible={!!followModalType}
        onClose={() => setFollowModalType(null)}
        type={followModalType}
        onFollowToggle={handleFollowModalToggle}
      />

      {/* Search / Discovery Modal — Players + Posts */}
      <Modal visible={showSearchModal} transparent animationType="slide" onRequestClose={closeSearchModal} statusBarTranslucent>
        <Pressable style={styles.searchOverlay} onPress={closeSearchModal}>
          <Pressable style={[styles.searchSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.searchHandle} />
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Discover</Text>
              <TouchableOpacity style={styles.searchCloseBtn} onPress={closeSearchModal} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputRow}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchChange("")} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
            {/* Search Tabs */}
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: searchTab === "players" ? PRIMARY_COLOR : "transparent" }}
                onPress={() => setSearchTab("players")}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: searchTab === "players" ? PRIMARY_COLOR : "#94A3B8" }}>
                  Players {searchResults.length > 0 ? `(${searchResults.length})` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: searchTab === "posts" ? PRIMARY_COLOR : "transparent" }}
                onPress={() => setSearchTab("posts")}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: searchTab === "posts" ? PRIMARY_COLOR : "#94A3B8" }}>
                  Posts {searchPostResults.length > 0 ? `(${searchPostResults.length})` : ""}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchResultsWrap}>
              {searchLoading ? (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ marginTop: 24 }} />
              ) : searchTab === "players" ? (
                searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => String(item.id || item._id)}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <View style={styles.searchResultItem}>
                        <TouchableOpacity style={styles.searchResultTapArea} activeOpacity={0.85} onPress={() => handleSearchUserPress(item)}>
                          {item.avatar ? (
                            <Image source={{ uri: mediaUrl(item.avatar) }} style={styles.searchResultAvatar} />
                          ) : (
                            <View style={[styles.searchResultAvatar, styles.searchResultAvatarFallback]}>
                              <Ionicons name="person-outline" size={18} color="#64748B" />
                            </View>
                          )}
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{item.name || "Player"}</Text>
                            {(item.sport || item.primary_sport) ? (
                              <Text style={styles.searchResultSport}>{item.sport || item.primary_sport}</Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.followBtn, item.is_following && styles.followBtnActive]}
                          activeOpacity={0.85}
                          onPress={() => handleDiscoverFollow(item.id || item._id)}
                        >
                          <Ionicons name={item.is_following ? "checkmark" : "person-add-outline"} size={14} color={item.is_following ? "#FFFFFF" : PRIMARY_COLOR} />
                          <Text style={[styles.followBtnText, item.is_following && styles.followBtnTextActive]}>
                            {item.is_following ? "Following" : "Follow"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                ) : searchQuery.trim().length > 0 ? (
                  <Text style={styles.searchEmptyText}>No players found</Text>
                ) : (
                  <Text style={styles.searchEmptyText}>Type a name to search</Text>
                )
              ) : (
                searchPostResults.length > 0 ? (
                  <FlatList
                    data={searchPostResults}
                    keyExtractor={(item) => `post-${item.id || item._id}`}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item: post }) => (
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" }}
                        activeOpacity={0.85}
                        onPress={() => handleSearchPostPress(post)}
                      >
                        {(post.media_url || post.images?.[0] || post.image) ? (
                          <Image
                            source={{ uri: mediaUrl(post.media_url || post.images?.[0] || post.image) }}
                            style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#E2E8F0" }}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="document-text-outline" size={20} color="#94A3B8" />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A" }}>{post.user_name || "Player"}</Text>
                          <Text numberOfLines={2} style={{ fontSize: 12, color: "#475569", lineHeight: 17 }}>
                            {post.content || "Media post"}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                            <Text style={{ fontSize: 11, color: "#94A3B8" }}>{post.likes_count || 0} likes</Text>
                            <Text style={{ fontSize: 11, color: "#94A3B8" }}>{post.comments_count || 0} comments</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                ) : searchQuery.trim().length > 0 ? (
                  <Text style={styles.searchEmptyText}>No posts found</Text>
                ) : (
                  <Text style={styles.searchEmptyText}>Type a name to search posts</Text>
                )
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  screenWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 108,
    gap: 16,
  },
  /* ── Search Modal ── */
  searchOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  searchSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "80%",
  },
  searchHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  searchCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  searchResultsWrap: {
    minHeight: 120,
    maxHeight: 360,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  searchResultTapArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    backgroundColor: "transparent",
  },
  followBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  followBtnTextActive: {
    color: "#FFFFFF",
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  searchResultAvatarFallback: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultInfo: {
    flex: 1,
    gap: 2,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  searchResultSport: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "capitalize",
  },
  searchEmptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#94A3B8",
  },
});
