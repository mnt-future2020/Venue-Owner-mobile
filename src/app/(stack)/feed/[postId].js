import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../../../components/Header";
import FeedPostCard from "../../../components/feed/FeedPostCard";
import FeedCommentsSheet from "../../../components/feed/FeedCommentsSheet";
import FeedShareSheet from "../../../components/feed/FeedShareSheet";
import FeedPostMenuSheet from "../../../components/feed/FeedPostMenuSheet";
import FeedEmptyState from "../../../components/feed/FeedEmptyState";
import feedService from "../../../services/feedService";
import socialService from "../../../services/socialService";
import toast from "../../../utils/toast";
import { PRIMARY_COLOR } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import PostDetailSkeleton from "../../../components/skeletons/PostDetailSkeleton";

const VIEWPORT_HEIGHT = Dimensions.get("window").height;

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  const [menuPost, setMenuPost] = useState(null);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      const data = await feedService.getPost(postId);
      setPost(data.post || data);
    } catch {
      toast.error("Post not found");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPost();
  }, [loadPost]);

  const handleToggleLike = useCallback(async (id) => {
    setPost((prev) => prev ? {
      ...prev,
      liked_by_me: !prev.liked_by_me,
      likes_count: prev.likes_count + (prev.liked_by_me ? -1 : 1),
    } : prev);
    try {
      await feedService.toggleLike(id);
    } catch {
      loadPost();
    }
  }, [loadPost]);

  const handleReact = useCallback(async (id, reaction) => {
    setPost((prev) => prev ? { ...prev, my_reaction: reaction } : prev);
    try {
      await feedService.reactToPost(id, reaction);
    } catch {
      loadPost();
    }
  }, [loadPost]);

  const handleToggleBookmark = useCallback(async (id) => {
    setPost((prev) => prev ? { ...prev, bookmarked_by_me: !prev.bookmarked_by_me } : prev);
    try {
      await feedService.toggleBookmark(id);
    } catch {
      loadPost();
    }
  }, [loadPost]);

  const handleToggleFollow = useCallback(async (userId) => {
    const prev = post?.is_following;
    setPost((p) => p ? { ...p, is_following: !p.is_following } : p);
    try {
      const res = await socialService.toggleFollow(userId);
      setPost((p) => p ? { ...p, is_following: !!res.following } : p);
    } catch {
      setPost((p) => p ? { ...p, is_following: prev } : p);
      toast.error("Failed to update follow");
    }
  }, [post?.is_following]);

  const openComments = useCallback(async (p) => {
    setActiveCommentPost(p);
    setCommentsLoading(true);
    try {
      const data = await feedService.getComments(p.id);
      setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const handleCommentSubmit = useCallback(async (text) => {
    if (!activeCommentPost || !text.trim()) return false;
    setCommentSubmitting(true);
    try {
      await feedService.addComment(activeCommentPost.id, { content: text.trim() });
      const data = await feedService.getComments(activeCommentPost.id);
      setComments(data.comments || []);
      setPost((prev) => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
      return true;
    } catch {
      toast.error("Failed to add comment");
      return false;
    } finally {
      setCommentSubmitting(false);
    }
  }, [activeCommentPost]);

  const handleDeletePost = useCallback(async (postToDelete) => {
    const targetId = postToDelete?.id || postToDelete?._id || postId;
    if (!targetId) return;

    setMenuPost(null);
    try {
      await feedService.deletePost(targetId);
      setPost(null);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  }, [postId]);

  return (
    // Reserve the OS gesture-nav strip at the bottom. Without this, the
    // ScrollView extends into Android's home-indicator / back-swipe zone
    // and the bottom 24-48 px steal touches from the scroller — so vertical
    // drags that start near the bottom edge get swallowed by the system
    // gesture instead of scrolling the post.
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <Header title="Post" showBack />

      {loading ? (
        <PostDetailSkeleton />
      ) : !post ? (
        <FeedEmptyState
          title="Post not found"
          description="This post may have been deleted or is no longer available."
          onRetry={loadPost}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          // Outer View already reserves `insets.bottom`, so content needs
          // only its own visual breathing room here.
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY_COLOR} colors={[PRIMARY_COLOR]} />
          }
        >
          <View style={{ paddingTop: 12 }}>
            <FeedPostCard
              post={post}
              viewportHeight={VIEWPORT_HEIGHT}
              onToggleLike={handleToggleLike}
              onReact={handleReact}
              onToggleBookmark={handleToggleBookmark}
              onToggleFollow={handleToggleFollow}
              onOpenComments={openComments}
              onOpenShare={setSharePost}
              onOpenMenu={setMenuPost}
            />
          </View>
        </ScrollView>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
});
