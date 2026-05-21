import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image as RNImage,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Play,
  FileText,
  Trash2,
  X,
  User,
} from "lucide-react-native";
import VideoCard from "../feed/VideoCard";
import feedService from "../../services/feedService";
import socialService from "../../services/socialService";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import FeedCommentsSheet from "../feed/FeedCommentsSheet";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const CELL_SIZE = (SCREEN_WIDTH - GRID_GAP * 4) / 3;

const timeAgo = (d) => {
  if (!d) return "";
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

// Component to render clickable text with links, mentions, and hashtags
function ClickableText({ text, style, numberOfLines }) {
  const parseText = (inputText) => {
    if (!inputText) return [{ text: "", type: "text" }];
    
    // Regex patterns for different types of content
    const patterns = {
      url: /(https?:\/\/[^\s]+)/gi,
      mention: /@(\w+)/gi,
      hashtag: /#(\w+)/gi,
    };
    
    let parts = [{ text: inputText, type: "text" }];
    
    // Process each pattern
    Object.entries(patterns).forEach(([type, regex]) => {
      const newParts = [];
      
      parts.forEach(part => {
        if (part.type !== "text") {
          newParts.push(part);
          return;
        }
        
        const matches = [...part.text.matchAll(regex)];
        if (matches.length === 0) {
          newParts.push(part);
          return;
        }
        
        let lastIndex = 0;
        matches.forEach(match => {
          // Add text before match
          if (match.index > lastIndex) {
            newParts.push({
              text: part.text.slice(lastIndex, match.index),
              type: "text"
            });
          }
          
          // Add the match
          newParts.push({
            text: match[0],
            type: type,
            value: type === "url" ? match[0] : match[1] // For mentions/hashtags, use captured group
          });
          
          lastIndex = match.index + match[0].length;
        });
        
        // Add remaining text
        if (lastIndex < part.text.length) {
          newParts.push({
            text: part.text.slice(lastIndex),
            type: "text"
          });
        }
      });
      
      parts = newParts;
    });
    
    return parts;
  };

  const handlePress = (type, value) => {
    switch (type) {
      case "url":
        Linking.openURL(value).catch(() => {
          // Silent fail for now, or could show an alert
          console.log("Could not open link:", value);
        });
        break;
      case "mention":
        // Handle mention tap - could navigate to user profile
        console.log("Mention tapped:", value);
        break;
      case "hashtag":
        // Handle hashtag tap - could search for hashtag
        console.log("Hashtag tapped:", value);
        break;
    }
  };

  const getTextStyle = (type) => {
    switch (type) {
      case "url":
        return { color: PRIMARY_COLOR, textDecorationLine: "underline" };
      case "mention":
        return { color: "#EC4899", fontWeight: "600" };
      case "hashtag":
        return { color: "#3B82F6", fontWeight: "600" };
      default:
        return {};
    }
  };

  const parts = parseText(text);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => (
        <Text
          key={index}
          style={[style, getTextStyle(part.type)]}
          onPress={part.type !== "text" ? () => handlePress(part.type, part.value || part.text) : undefined}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function getPostThumbnail(post) {
  if (post.media_urls?.length) return mediaUrl(post.media_urls[0]);
  if (post.media_url) return mediaUrl(post.media_url);
  if (post.images?.length) return mediaUrl(post.images[0]);
  if (post.image) return mediaUrl(post.image);
  return null;
}

function PostGridCell({ post, onPress }) {
  const thumb = getPostThumbnail(post);
  const isVideo = post.post_type === "video" || /\.(mp4|mov|webm)$/i.test(post.media_url || "");

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(post)} style={styles.cell}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.cellImage} contentFit="cover" />
      ) : (
        <View style={styles.cellTextBg}>
          <Text numberOfLines={4} style={styles.cellTextContent}>{post.content || "Post"}</Text>
        </View>
      )}
      {isVideo && (
        <View style={styles.videoOverlay}>
          <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      )}
      {!thumb && !isVideo && (
        <View style={styles.textIconOverlay}>
          <FileText size={14} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function PostDetailModal({ post, visible, onClose, onDelete, currentUserId }) {
  const insets = useSafeAreaInsets();
  const safePost = post ?? null;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentCursor, setCommentCursor] = useState(null);
  const [commentHasMore, setCommentHasMore] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [imageHeight, setImageHeight] = useState(240);
  const [videoMuted, setVideoMuted] = useState(true);
  const lastTap = useRef(0);
  const mediaScrollRef = useRef(null);
  const mediaScrollX = useRef(new Animated.Value(0)).current;
  const IMAGE_WIDTH = SCREEN_WIDTH - 32;

  // Check if this is a video post
  const images = safePost?.media_urls?.length
    ? safePost.media_urls
    : safePost?.media_url ? [safePost.media_url] : [];
  const primaryMediaUrl = images[0] ? mediaUrl(images[0]) : "";
  const isVideoPost = safePost?.post_type === "video" || /\.(mp4|mov|webm|m3u8)$/i.test(primaryMediaUrl);
  const hasMultipleImages = !isVideoPost && images.length > 1;

  useEffect(() => {
    if (visible && post?.id) {
      setLiked(post?.liked_by_me || false);
      setLikeCount(post?.likes_count || 0);
      setBookmarked(post?.bookmarked_by_me || false);
      loadComments();

      // Calculate image height from metadata or fetch
      if (isVideoPost) {
        // For videos, use a standard aspect ratio or metadata
        const metaW = post.media_width || post.width || post.image_width;
        const metaH = post.media_height || post.height || post.image_height;
        if (metaW && metaH) {
          const h = IMAGE_WIDTH / (metaW / metaH);
          setImageHeight(Math.max(200, Math.min(h, 420)));
        } else {
          setImageHeight(300); // Default video height
        }
      } else {
        const metaW = post.media_width || post.width || post.image_width;
        const metaH = post.media_height || post.height || post.image_height;
        if (metaW && metaH) {
          const rawHeight = IMAGE_WIDTH / (metaW / metaH);
          if (hasMultipleImages) {
            // Carousel: fixed bounds, cover mode crops
            setImageHeight(Math.min(Math.max(rawHeight, 240), 480));
          } else {
            // Single image: exact height from aspect ratio
            setImageHeight(Math.min(rawHeight, 620));
          }
        } else {
          const url = post.media_urls?.[0] || post.media_url;
          if (url) {
            RNImage.getSize(mediaUrl(url), (w, h) => {
              if (w && h) {
                const rawHeight = IMAGE_WIDTH / (w / h);
                if (hasMultipleImages) {
                  setImageHeight(Math.min(Math.max(rawHeight, 240), 480));
                } else {
                  setImageHeight(Math.min(rawHeight, 620));
                }
              }
            }, () => setImageHeight(hasMultipleImages ? 320 : 240));
          } else {
            setImageHeight(hasMultipleImages ? 320 : 240);
          }
        }
      }
    }
  }, [visible, post?.id, IMAGE_WIDTH, isVideoPost, hasMultipleImages]);

  const loadComments = async () => {
    if (!post?.id) return;
    setLoadingComments(true);
    try {
      const data = await feedService.getComments(post.id);
      setComments(data.comments || data || []);
      setCommentCursor(data?.next_cursor || null);
      setCommentHasMore(!!data?.has_more);
    } catch {
      // silent
    } finally {
      setLoadingComments(false);
    }
  };

  const loadMoreComments = async () => {
    if (!commentHasMore || !commentCursor || loadingMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const data = await feedService.getComments(post.id, commentCursor);
      setComments((prev) => [...prev, ...(data.comments || [])]);
      setCommentCursor(data?.next_cursor || null);
      setCommentHasMore(!!data?.has_more);
    } catch {
      // silent
    } finally {
      setLoadingMoreComments(false);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      if (!liked) handleLike();
    }
    lastTap.current = now;
  };

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      await feedService.toggleLike(post.id);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  };

  const handleBookmark = async () => {
    const wasSaved = bookmarked;
    setBookmarked(!wasSaved);
    try {
      await feedService.toggleBookmark(post.id);
      toast.success(wasSaved ? "Removed from saved" : "Saved!");
    } catch {
      setBookmarked(wasSaved);
      toast.error("Failed to save");
    }
  };

  const handleComment = async (text) => {
    const content = (text || commentInput).trim();
    if (!content || submitting) return false;
    setSubmitting(true);
    try {
      const res = await feedService.addComment(post.id, { content });
      setComments((prev) => [...prev, res.comment || res]);
      setCommentInput("");
      return true;
    } catch {
      toast.error("Failed to comment");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Post?", "This action cannot be undone. This post will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await socialService.deletePost(post.id);
            toast.success("Post deleted");
            onDelete?.(post.id);
            onClose();
          } catch {
            toast.error("Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleToggleVideoMute = () => {
    setVideoMuted(!videoMuted);
  };

  const { user: authUser } = useAuth();
  const isOwn = safePost?.user_id === currentUserId;
  const authorName = safePost?.user_name || "Player";
  const authorAvatar = isOwn ? (authUser?.avatar ?? safePost?.user_avatar) : safePost?.user_avatar;

  if (!safePost) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
          <View style={styles.modalAuthorRow}>
            {authorAvatar ? (
              <Image source={{ uri: mediaUrl(authorAvatar) }} style={styles.modalAvatar} contentFit="cover" />
            ) : (
              <View style={styles.modalAvatarFallback}>
                <User size={16} color="#94A3B8" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.modalAuthorName}>{authorName}</Text>
              <Text style={styles.modalTime}>{timeAgo(safePost.created_at)}</Text>
            </View>
            {isOwn && (
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                <Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable content — everything except input */}
        <ScrollView 
          style={styles.scrollBody} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {safePost.content ? (
            <View style={styles.contentBlock}>
              <ClickableText 
                text={safePost.content} 
                style={styles.modalContent}
              />
            </View>
          ) : null}

          {images.length > 0 && (
            <View style={styles.mediaWrap}>
              {isVideoPost ? (
                <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap}>
                  <VideoCard
                    source={primaryMediaUrl}
                    width={IMAGE_WIDTH}
                    muted={videoMuted}
                    isVisible={visible}
                    onToggleMute={handleToggleVideoMute}
                  />
                </TouchableOpacity>
              ) : hasMultipleImages ? (
                <>
                  <Animated.ScrollView
                    ref={mediaScrollRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled
                    nestedScrollEnabled
                    directionalLockEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    disableIntervalMomentum
                    decelerationRate="fast"
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: mediaScrollX } } }],
                      { useNativeDriver: false }
                    )}
                    disallowInterruption
                  >
                    {images.map((img, idx) => (
                      <TouchableOpacity 
                        key={`${safePost.id}-${idx}`} 
                        activeOpacity={1} 
                        onPress={handleDoubleTap}
                        style={{ width: IMAGE_WIDTH }}
                      >
                        <Image 
                          source={{ uri: mediaUrl(img) }} 
                          style={[styles.modalImage, { height: imageHeight }]} 
                          contentFit="cover" 
                        />
                      </TouchableOpacity>
                    ))}
                  </Animated.ScrollView>
                  <View style={styles.dotRow}>
                    {images.map((_, index) => {
                      const inputRange = [
                        (index - 1) * IMAGE_WIDTH,
                        index * IMAGE_WIDTH,
                        (index + 1) * IMAGE_WIDTH,
                      ];
                      const dotWidth = mediaScrollX.interpolate({
                        inputRange,
                        outputRange: [6, 18, 6],
                        extrapolate: "clamp",
                      });
                      const dotOpacity = mediaScrollX.interpolate({
                        inputRange,
                        outputRange: [0.62, 1, 0.62],
                        extrapolate: "clamp",
                      });

                      return (
                        <Animated.View
                          key={`${safePost.id}-dot-${index}`}
                          style={[styles.dot, styles.dotActive, { width: dotWidth, opacity: dotOpacity }]}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap}>
                  <Image 
                    source={{ uri: mediaUrl(images[0]) }} 
                    style={[styles.modalImage, { height: imageHeight }]} 
                    contentFit="cover" 
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={handleLike} style={styles.actionItem}>
              <Heart size={18} color={liked ? "#EC4899" : "#64748B"} fill={liked ? "#EC4899" : "none"} />
              <Text style={[styles.actionCount, liked && { color: "#EC4899" }]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCommentsSheet(true)} style={styles.actionItem}>
              <MessageSquare size={18} color="#64748B" />
              <Text style={styles.actionCount}>{safePost.comments_count || comments.length || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBookmark} style={styles.actionItem}>
              <Bookmark size={18} color={bookmarked ? PRIMARY_COLOR : "#64748B"} fill={bookmarked ? PRIMARY_COLOR : "none"} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Comments bottom sheet — same as feed */}
        <FeedCommentsSheet
          visible={showCommentsSheet}
          onClose={() => setShowCommentsSheet(false)}
          post={safePost}
          comments={comments}
          loading={loadingComments}
          submitting={submitting}
          onSubmit={handleComment}
          onLoadMore={loadMoreComments}
          hasMore={commentHasMore}
          currentUserId={currentUserId}
        />
      </View>
    </Modal>
  );
}

export default function PostsGrid({ userId, posts: externalPosts, onRefresh }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState(externalPosts || []);
  const [loading, setLoading] = useState(!externalPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  const loadPosts = useCallback(async (beforeCursor = null) => {
    try {
      if (!beforeCursor) setLoading(true);
      else setLoadingMore(true);
      const data = await socialService.getUserPosts(userId, beforeCursor);
      const newPosts = Array.isArray(data) ? data : (data?.posts || data?.items || []);
      if (beforeCursor) setPosts((prev) => [...prev, ...newPosts]);
      else setPosts(newPosts);
      setCursor(data?.next_cursor || null);
      setHasMore(data?.has_more ?? newPosts.length >= 20);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    if (externalPosts) { setPosts(externalPosts); setLoading(false); return; }
    loadPosts();
  }, [externalPosts, loadPosts]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && cursor) loadPosts(cursor);
  };

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    onRefresh?.();
  };

  const handleOpenPost = useCallback(async (post) => {
    setSelectedPost(post);
    if (!post?.id) return;
    try {
      const data = await feedService.getPost(post.id);
      const detailed = data?.post || data;
      if (detailed?.id) setSelectedPost((prev) => (prev?.id === post.id ? { ...prev, ...detailed } : prev));
    } catch { /* keep initial */ }
  }, []);

  const renderItem = useCallback(
    ({ item }) => <PostGridCell post={item} onPress={handleOpenPost} />,
    [handleOpenPost]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  if (!posts.length) {
    return (
      <View style={styles.emptyContainer}>
        <FileText size={48} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>No Posts Yet</Text>
        <Text style={styles.emptySubtitle}>Share your first training moment</Text>
      </View>
    );
  }

  return (
    <View style={styles.gridContainer}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item, idx) => item.id || `post-${idx}`}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        scrollEnabled={false}
        removeClippedSubviews
        maxToRenderPerBatch={9}
        windowSize={5}
        initialNumToRender={9}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={PRIMARY_COLOR} style={styles.footerLoader} /> : null}
      />
      <PostDetailModal
        post={selectedPost}
        visible={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={handleDelete}
        currentUserId={user?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: { width: "100%" },
  footerLoader: { marginVertical: 16 },
  gridRow: { gap: GRID_GAP },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginBottom: GRID_GAP,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  cellImage: { width: "100%", height: "100%" },
  cellTextBg: { flex: 1, padding: 8, justifyContent: "center", backgroundColor: "#059669" },
  cellTextContent: { color: "#FFFFFF", fontSize: 10, fontFamily: FONTS.bodyMedium, lineHeight: 15 },
  videoOverlay: { position: "absolute", top: 6, right: 6 },
  textIconOverlay: { position: "absolute", top: 6, right: 6 },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  emptyContainer: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, color: "#64748B", marginTop: 8 },
  emptySubtitle: { fontSize: 12, fontFamily: FONTS.body, color: "#94A3B8" },

  /* Modal */
  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E2E8F0" },
  modalAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  modalAuthorName: { fontSize: 12, fontFamily: FONTS.displayBold, color: "#0F172A" },
  modalTime: { fontSize: 10, fontFamily: FONTS.body, color: "#94A3B8" },
  iconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  scrollBody: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  contentBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  modalContent: { fontSize: 14, lineHeight: 22, color: "#0F172A", fontFamily: FONTS.body },
  mediaWrap: { marginHorizontal: 16, marginTop: 4, borderRadius: 12, overflow: "hidden", backgroundColor: "#F1F5F9" },
  modalImage: { width: SCREEN_WIDTH - 32 },
  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 6, position: "absolute", left: 0, right: 0, bottom: 10, zIndex: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.62)" },
  dotActive: { backgroundColor: "#FFFFFF" },

  /* Actions */
  modalActions: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 16 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontSize: 12, fontFamily: FONTS.bodyBold, color: "#64748B" },

  /* Comments header */
  commentsHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  commentsHeaderText: { fontSize: 11, fontFamily: FONTS.bodyBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 },

  /* Comments */
  commentsSection: { paddingHorizontal: 16, paddingBottom: 16 },
  commentRow: { flexDirection: "row", gap: 8, marginBottom: 10, alignItems: "flex-start" },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#F1F5F9" },
  commentBody: { flex: 1, gap: 1 },
  commentNameRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  commentAuthor: { fontSize: 11, fontFamily: FONTS.bodyBold, color: "#0F172A" },
  commentTime: { fontSize: 10, fontFamily: FONTS.body, color: "#94A3B8" },
  commentText: { fontSize: 12, lineHeight: 18, fontFamily: FONTS.body, color: "#475569" },
  noComments: { fontSize: 11, fontFamily: FONTS.body, color: "#94A3B8", textAlign: "center", paddingVertical: 12 },
  loadMoreText: { fontSize: 11, fontFamily: FONTS.bodySemiBold, color: PRIMARY_COLOR, paddingVertical: 2 },

  /* Comment input */
  commentInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", gap: 8, backgroundColor: "#FFFFFF" },
  commentInput: { flex: 1, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", paddingHorizontal: 14, fontSize: 12, fontFamily: FONTS.body, color: "#0F172A" },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY_COLOR, alignItems: "center", justifyContent: "center" },
});
