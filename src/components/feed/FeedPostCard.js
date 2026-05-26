import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import {
  Animated,
  Dimensions,
  Image as RNImage,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heart, MessageSquare, Share2, Bookmark } from "lucide-react-native";
import { Image } from "expo-image";
import AppCard from "../ui/AppCard";
import VideoCard from "./VideoCard";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import SwipeTabContext from "../../context/SwipeTabContext";
import { safePush } from "../../services/navigationGuard";

const CARD_WIDTH = Dimensions.get("window").width - 32;
const MEDIA_WIDTH = CARD_WIDTH;

/* Module-level: ensures only one reaction picker is open across all cards */
const _reactionListeners = new Set();
function broadcastCloseReactions(exceptPostId) {
  _reactionListeners.forEach((fn) => fn(exceptPostId));
}
const REACTION_ITEMS = [
  { key: "fire", emoji: "🔥" },
  { key: "trophy", emoji: "🏆" },
  { key: "clap", emoji: "👏" },
  { key: "heart", emoji: "❤️" },
  { key: "100", emoji: "💯" },
  { key: "muscle", emoji: "💪" },
];
const REACTION_SUMMARY = {
  fire: "\uD83D\uDD25",
  trophy: "\uD83C\uDFC6",
  clap: "\uD83D\uDC4F",
  heart: "\u2764\uFE0F",
  100: "\uD83D\uDCAF",
  muscle: "\uD83D\uDCAA",
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

// Matches frontend SocialFeedPage post actions (lines 1754-1842) — all icons rendered at
// 20px (h-5 w-5) using lucide so the stroke weight and silhouette match the web exactly.
const POST_ACTION_ICON_SIZE = 20;
const POST_ACTION_DEFAULT_COLOR = "#64748B"; // matches frontend text-muted-foreground

const PostAction = React.memo(function PostAction({ Icon, count, onPress, active, iconColor, fillWhenActive }) {
  const color = iconColor || (active ? PRIMARY_COLOR : POST_ACTION_DEFAULT_COLOR);
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.actionBtn} onPress={onPress}>
      <Icon
        size={POST_ACTION_ICON_SIZE}
        color={color}
        fill={active && fillWhenActive ? color : "none"}
      />
      {typeof count === "number" ? (
        <Text style={[styles.actionCount, active && styles.actionCountActive]}>{count}</Text>
      ) : null}
    </TouchableOpacity>
  );
});

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function FeedPostCard({
  post,
  videosMuted = true,
  onToggleVideoMute,
  isVideoActive = false,
  onToggleLike,
  onReact,
  onToggleBookmark,
  onToggleFollow,
  onOpenComments,
  onOpenShare,
  onOpenMenu,
}) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { activeIndex: parentTabIndex, setPagerSwipeEnabled } = useContext(SwipeTabContext);
  const isOwnPost = post.is_own_post || (currentUser?.id && post.user_id === currentUser.id);
  const resolvedAvatar = isOwnPost ? (currentUser?.avatar ?? post.user_avatar) : post.user_avatar;
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const mediaUrls = useMemo(
    () => (post.media_urls?.length ? post.media_urls : post.media_url ? [post.media_url] : []),
    [post.media_url, post.media_urls]
  );
  const primaryMediaUrl = mediaUrls[0] ? mediaUrl(mediaUrls[0]) : "";
  const isVideoPost = useMemo(() => {
    if (!primaryMediaUrl) return false;
    return post.post_type === "video" || /\.(mp4|mov|webm|m3u8)$/i.test(primaryMediaUrl);
  }, [post.post_type, primaryMediaUrl]);
  // Use metadata dimensions immediately if available, avoiding async getSize jump
  const initialAspect = useMemo(() => {
    const metaW = post.media_width || post.width || post.image_width;
    const metaH = post.media_height || post.height || post.image_height;
    return metaW && metaH ? metaW / metaH : 4 / 5;
  }, [post.media_width, post.width, post.image_width, post.media_height, post.height, post.image_height]);
  const [imageAspectRatio, setImageAspectRatio] = useState(initialAspect);
  const [imageReady, setImageReady] = useState(!!initialAspect && initialAspect !== 4 / 5);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Subscribe to broadcast: close this picker when another card opens theirs
  useEffect(() => {
    const listener = (exceptPostId) => {
      if (exceptPostId !== post.id) setShowReactionPicker(false);
    };
    _reactionListeners.add(listener);
    return () => _reactionListeners.delete(listener);
  }, [post.id]);
  const [avatarPreview, setAvatarPreview] = useState(false);
  const mediaScrollRef = useRef(null);
  const mediaWrapRef = useRef(null);
  const mediaScrollX = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const carouselDraggingRef = useRef(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const hasMultipleImages = !isVideoPost && mediaUrls.length > 1;

  useEffect(() => {
    if (!showHeartBurst) return undefined;

    heartScale.setValue(0.4);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 9,
        stiffness: 180,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowHeartBurst(false);
    });

    return undefined;
  }, [heartScale, showHeartBurst]);

  useEffect(() => {
    if (isVideoPost || !primaryMediaUrl) return undefined;

    // Already have dimensions from metadata — skip network fetch
    const metaWidth = post.media_width || post.width || post.image_width;
    const metaHeight = post.media_height || post.height || post.image_height;
    if (metaWidth && metaHeight) {
      setImageAspectRatio(metaWidth / metaHeight);
      setImageReady(true);
      return undefined;
    }

    let mounted = true;
    RNImage.getSize(
      primaryMediaUrl,
      (width, height) => {
        if (mounted && width && height) {
          setImageAspectRatio(width / height);
          setImageReady(true);
        }
      },
      () => {
        if (mounted) {
          setImageAspectRatio(4 / 5);
          setImageReady(true);
        }
      }
    );

    return () => {
      mounted = false;
    };
  }, [isVideoPost, post.height, post.image_height, post.image_width, post.media_height, post.media_width, post.width, primaryMediaUrl]);

  const imageHeight = useMemo(() => {
    const safeRatio = imageReady ? imageAspectRatio : 4 / 5;
    const rawHeight = MEDIA_WIDTH / safeRatio;
    if (hasMultipleImages) {
      // Carousel: fixed bounds, cover mode crops
      return Math.min(Math.max(rawHeight, 240), 480);
    }
    // Single image: exact height from aspect ratio, no min — card wraps tightly around image
    return Math.min(rawHeight, 620);
  }, [imageAspectRatio, imageReady, hasMultipleImages]);

  const handleCarouselInteractionStart = () => {
    if (hasMultipleImages) {
      carouselDraggingRef.current = true;
      setPagerSwipeEnabled(false);
    }
  };

  const handleCarouselInteractionEnd = () => {
    if (carouselDraggingRef.current) {
      carouselDraggingRef.current = false;
      // Delay re-enable slightly to prevent accidental tab swipe after carousel settle
      setTimeout(() => setPagerSwipeEnabled(true), 100);
    }
  };

  const handleDoubleTapLike = () => {
    if (showReactionPicker) {
      setShowReactionPicker(false);
    }
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setShowHeartBurst(true);
      if (!post.liked_by_me) {
        onToggleLike?.(post.id);
      }
    }
    lastTapRef.current = now;
  };

  const shouldTruncateContent = (post.content || "").trim().length > 150;
  const reactionEntries = useMemo(
    () => Object.entries(post.reactions || {})
      .filter(([, value]) => value > 0)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 4),
    [post.reactions]
  );
  const handleReactionSelect = (reaction) => {
    onReact?.(post.id, reaction);
    setShowReactionPicker(false);
  };

  useEffect(() => () => {
    // Always re-enable pager swiping on unmount (prevents stuck lock on navigation)
    carouselDraggingRef.current = false;
    setPagerSwipeEnabled(true);
  }, [setPagerSwipeEnabled]);

  return (
    <AppCard style={styles.card}>
      <Pressable onPress={handleDoubleTapLike}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => {
              if (resolvedAvatar) {
                setAvatarPreview(true);
              } else if (post.user_id) {
                safePush(router, `/(stack)/player/${post.user_id}`);
              }
            }}>
              {resolvedAvatar ? (
                <Image source={{ uri: mediaUrl(resolvedAvatar) }} style={styles.avatar} cachePolicy="memory-disk" recyclingKey={String(post.user_id || resolvedAvatar)} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person-outline" size={18} color="#64748B" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.userMeta}>
              <View style={styles.nameRow}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => post.user_id && safePush(router, `/(stack)/player/${post.user_id}`)}>
                  <Text style={styles.userName}>{post.user_name || "Lobbi"}</Text>
                </TouchableOpacity>
                {post.is_following != null && !isOwnPost ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => onToggleFollow?.(post.user_id)}>
                    <Text style={[styles.followText, post.is_following && styles.followingText]}>
                      {post.is_following ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
            </View>
          </View>
          {/* <TouchableOpacity activeOpacity={0.85} style={styles.menuBtn} onPress={() => onOpenMenu?.({ ...post, is_own_post: isOwnPost })}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#64748B" />
          </TouchableOpacity> */}
        </View>
      </Pressable>

      {post.content ? (
        <Pressable onPress={handleDoubleTapLike}>
          <View style={styles.contentBlock}>
            {/* Matches frontend SocialFeedPage (line 1566-1583): content > 150 chars
                gets sliced + inline "...See more" button (`ml-1`). RN nested <Text>
                provides the same natural wrap behaviour — "See more" sits inline next to
                "..." when there's room on the last line, or wraps to its own line when
                the truncated text fills the row. Identical to the frontend's responsive
                rendering on both narrow and wide mobile widths. */}
            {shouldTruncateContent && !isContentExpanded ? (
              <Text style={styles.content}>
                {post.content.slice(0, 150).trimEnd()}
                {"... "}
                <Text
                  style={styles.expandTextInline}
                  onPress={() => setIsContentExpanded(true)}
                  suppressHighlighting
                >
                  See more
                </Text>
              </Text>
            ) : (
              <ClickableText text={post.content} style={styles.content} />
            )}
            {shouldTruncateContent && isContentExpanded ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setIsContentExpanded(false)}
                style={styles.expandButton}
              >
                <Text style={styles.expandText}>See less</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {mediaUrls.length > 0 ? (
        <View
          ref={mediaWrapRef}
          style={styles.mediaWrap}
        >
          {!imageReady && !isVideoPost ? (
            <Pressable onPress={handleDoubleTapLike}>
              <View style={[styles.postImage, { height: 200, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="image-outline" size={28} color="#CBD5E1" />
              </View>
            </Pressable>
          ) : isVideoPost ? (
            <Pressable onPress={handleDoubleTapLike}>
              <VideoCard
                source={primaryMediaUrl}
                width={MEDIA_WIDTH}
                muted={videosMuted}
                isVisible={isVideoActive}
                onToggleMute={onToggleVideoMute}
              />
            </Pressable>
          ) : hasMultipleImages ? (
            /* Multi-image carousel — NO Pressable wrapper so horizontal swipe gets priority */
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
              onTouchStart={handleCarouselInteractionStart}
              onScrollBeginDrag={handleCarouselInteractionStart}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: mediaScrollX } } }],
                { useNativeDriver: false }
              )}
              onScrollEndDrag={handleCarouselInteractionEnd}
              onMomentumScrollEnd={handleCarouselInteractionEnd}
              disallowInterruption
            >
              {mediaUrls.map((item, index) => (
                <Pressable key={`${post.id}-${index}`} onPress={handleDoubleTapLike}>
                  <Image
                    source={{ uri: mediaUrl(item) }}
                    style={[styles.postImage, { height: imageHeight }]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={`${post.id}-${index}`}
                  />
                </Pressable>
              ))}
            </Animated.ScrollView>
          ) : (
            <Pressable onPress={handleDoubleTapLike}>
              <Image
                source={{ uri: primaryMediaUrl }}
                style={[styles.postImage, { height: imageHeight }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={String(post.id)}
              />
            </Pressable>
          )}
          {!isVideoPost && hasMultipleImages ? (
            <View style={styles.dotsRow}>
              {mediaUrls.map((_, index) => {
                const inputRange = [
                  (index - 1) * MEDIA_WIDTH,
                  index * MEDIA_WIDTH,
                  (index + 1) * MEDIA_WIDTH,
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
                    key={`${post.id}-dot-${index}`}
                    style={[styles.dot, styles.dotActive, { width: dotWidth, opacity: dotOpacity }]}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {reactionEntries.length > 0 ? (
        <View style={styles.reactionSummaryRow}>
          {reactionEntries.map(([key, value]) => (
            <View key={`${post.id}-reaction-summary-${key}`} style={styles.reactionSummaryItem}>
              <Text style={styles.reactionSummaryEmoji}>{REACTION_SUMMARY[key] || key}</Text>
              <Text style={styles.reactionSummaryCount}>{value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showReactionPicker ? (
        <View style={styles.reactionBar}>
          {REACTION_ITEMS.map((item) => (
            <TouchableOpacity
              key={`${post.id}-${item.key}`}
              activeOpacity={0.9}
              style={[
                styles.reactionItem,
                post.my_reaction === item.key && styles.reactionItemActive,
              ]}
              onPress={() => handleReactionSelect(item.key)}
            >
              <Text style={styles.reactionEmoji}>{item.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <PostAction
            Icon={Heart}
            count={post.likes_count || 0}
            onPress={() => onToggleLike?.(post.id)}
            active={!!post.liked_by_me}
            iconColor={post.liked_by_me ? "#EC4899" : undefined}
            fillWhenActive
          />
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.actionBtn}
            onPress={() => {
              if (showReactionPicker) {
                setShowReactionPicker(false);
              } else {
                broadcastCloseReactions(post.id);
                setShowReactionPicker(true);
              }
            }}
          >
            <Text style={[styles.reactionBtnText, post.my_reaction && styles.reactionBtnTextActive]}>
              {post.my_reaction ? (REACTION_SUMMARY[post.my_reaction] || "+") : "+"}
            </Text>
          </TouchableOpacity>
          <PostAction
            Icon={MessageSquare}
            count={post.comments_count || 0}
            onPress={() => onOpenComments?.(post)}
          />
          <PostAction Icon={Share2} onPress={() => onOpenShare?.(post)} />
        </View>
        <TouchableOpacity activeOpacity={0.85} style={styles.saveBtn} onPress={() => onToggleBookmark?.(post.id)}>
          <Bookmark
            size={POST_ACTION_ICON_SIZE}
            color={post.bookmarked_by_me ? PRIMARY_COLOR : POST_ACTION_DEFAULT_COLOR}
            fill={post.bookmarked_by_me ? PRIMARY_COLOR : "none"}
          />
        </TouchableOpacity>
      </View>

      {/* Avatar preview lightbox */}
      <Modal visible={avatarPreview} transparent animationType="fade" onRequestClose={() => setAvatarPreview(false)} statusBarTranslucent>
        <Pressable style={styles.lightboxOverlay} onPress={() => setAvatarPreview(false)}>
          <View style={styles.lightboxContent}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setAvatarPreview(false)} activeOpacity={0.85}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Image source={{ uri: mediaUrl(resolvedAvatar) }} style={styles.lightboxImage} contentFit="cover" />
            {post.user_name ? <Text style={styles.lightboxName}>{post.user_name}</Text> : null}
            <TouchableOpacity
              style={styles.lightboxProfileBtn}
              activeOpacity={0.85}
              onPress={() => { setAvatarPreview(false); if (post.user_id) safePush(router, `/(stack)/player/${post.user_id}`); }}
            >
              <Text style={styles.lightboxProfileText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      {/* Heart burst overlay — covers entire card for text/image/video double tap */}
      {showHeartBurst ? (
        <Animated.View style={[styles.heartBurst, { transform: [{ scale: heartScale }] }]} pointerEvents="none">
          <Ionicons name="heart" size={72} color="#EC4899" />
        </Animated.View>
      ) : null}
    </AppCard>
  );
}

export default React.memo(FeedPostCard);

const styles = StyleSheet.create({
  /* Avatar lightbox */
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxContent: {
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: -48,
    right: 0,
    padding: 8,
  },
  lightboxImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  lightboxName: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  lightboxProfileBtn: {
    marginTop: 14,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  lightboxProfileText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },

  card: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: "hidden",
    marginHorizontal: 2,
    borderRadius: 26,
    borderColor: "#E7EDF4",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  userMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  followText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: PRIMARY_COLOR,
  },
  followingText: {
    color: "#64748B",
  },
  postTypeBadge: {
    backgroundColor: "#059669",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  postTypeBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  time: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#64748B",
  },
  content: {
    fontSize: 14,
    fontFamily: FONTS.body,
    lineHeight: 21,
    color: "#334155",
  },
  contentBlock: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  expandButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  expandText: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: PRIMARY_COLOR,
    textTransform: "capitalize",
  },
  // Inline "See more" inside the truncated <Text>. RN nested Text wraps naturally — sits
  // beside "..." when there's room, drops to its own line when the row is full. Matches
  // frontend's `text-brand-600 font-semibold ml-1` inline button (SocialFeedPage.js:1580).
  expandTextInline: {
    color: PRIMARY_COLOR,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
  },
  mediaWrap: {
    marginBottom: 0,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  postImage: {
    width: MEDIA_WIDTH,
    backgroundColor: "#E2E8F0",
  },
  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    zIndex: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },
  heartBurst: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -36,
    marginTop: -36,
    zIndex: 4,
  },
  reactionBar: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  reactionItem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionItemActive: {
    backgroundColor: "#ECFDF5",
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
  },
  reactionSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reactionSummaryEmoji: {
    fontSize: 14,
  },
  reactionSummaryCount: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
  },
  // Matches frontend SocialFeedPage actions row (line 1744): `px-4 py-2.5` (mobile)
  //   = paddingHorizontal: 16, paddingVertical: 10
  // + `border-t border-border/30 bg-muted/5` = subtle top border, faint background tint.
  actionsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.6)",
    backgroundColor: "rgba(248,250,252,0.4)",
  },
  // Frontend `sm:` breakpoint variant (which matches the visual reference screenshot):
  //   - `sm:gap-5` = 20px between actions (gap-4 mobile equivalent looked too wide)
  //   - `sm:justify-start sm:min-w-0` = no minimum width, content-width buttons
  // This produces the tight, content-hugging layout the user wants.
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 25,
  },
  // Frontend button at sm+: `flex items-center gap-2 group transition-colors min-h-[44px]
  // justify-start min-w-0` — keeps tap height but lets each button shrink to its content.
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },
  actionCount: {
    color: "#64748B",
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  actionCountActive: {
    color: PRIMARY_COLOR,
  },
  reactionBtnText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "700",
  },
  reactionBtnTextActive: {
    color: PRIMARY_COLOR,
    fontSize: 18,
  },
  // Frontend bookmark button (line 1832): `ml-1 sm:ml-2 min-h-[44px] min-w-[44px] flex
  // items-center justify-center` — same 44×44 tap target with centered content.
  saveBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
