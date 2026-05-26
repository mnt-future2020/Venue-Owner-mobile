import React, { useCallback, useRef } from "react";
import {
  Dimensions,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
  CornerUpLeft,
  FileText,
  Pin,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";

const SCREEN_W = Dimensions.get("window").width;
const IMAGE_MAX_W = SCREEN_W * 0.65;
const REACTION_TOKEN_TO_EMOJI = {
  thumbsup: "👍",
  heart: "❤️",
  laugh: "😂",
  wow: "😮",
  fire: "🔥",
  clap: "👏",
};

function displayReaction(value) {
  if (!value) return "";
  return REACTION_TOKEN_TO_EMOJI[value] || value;
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

const REACTION_RIPPLE = { color: "rgba(15,23,42,0.06)", borderless: false };

const ReactionChip = React.memo(function ReactionChip({ emoji, meta, message, onReaction }) {
  const handlePress = useCallback((e) => {
    e?.stopPropagation?.();
    if (onReaction) onReaction(message, emoji);
  }, [onReaction, message, emoji]);

  return (
    <Pressable
      style={[styles.reactionChip, meta.mine && styles.reactionChipSelf]}
      onPress={handlePress}
      android_ripple={REACTION_RIPPLE}
      hitSlop={6}
    >
      <Text style={[styles.reactionEmoji, meta.mine && styles.reactionEmojiSelf]}>
        {emoji}
      </Text>
      {meta.count > 1 ? (
        <Text style={[styles.reactionCount, meta.mine && styles.reactionCountSelf]}>
          {meta.count}
        </Text>
      ) : null}
    </Pressable>
  );
});

function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isGrouped,
  highlight,
  onLongPress,
  onImagePress,
  onReply,
  onReplyQuoteTap,
  onPostPress,
  onVotePoll,
  onReaction,
  currentUserId,
}) {
  // Reanimated shared values for swipe-to-reply
  const swipeX = useSharedValue(0);
  const replied = useSharedValue(0); // 0 = not triggered, 1 = triggered

  // Callback to fire reply on JS thread
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;
  const messageRef = useRef(message);
  messageRef.current = message;

  const fireReply = () => {
    if (onReplyRef.current) onReplyRef.current(messageRef.current);
  };

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Swipe-to-reply gesture using react-native-gesture-handler (works inside scrollable lists)
  const swipeGesture = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      "worklet";
      const dx = Math.max(0, Math.min(e.translationX, 80));
      swipeX.value = dx;
      if (dx > 50 && replied.value === 0) {
        replied.value = 1;
        runOnJS(triggerHaptic)();
      }
    })
    .onEnd(() => {
      "worklet";
      if (replied.value === 1) {
        runOnJS(fireReply)();
      }
      replied.value = 0;
      swipeX.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  // Long-press gesture — more reliable than Pressable onLongPress inside GestureDetector
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const fireLongPress = (x, y) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onLongPressRef.current) onLongPressRef.current(messageRef.current, { pageX: x, pageY: y });
  };

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart((e) => {
      "worklet";
      runOnJS(fireLongPress)(e.absoluteX, e.absoluteY);
    });

  // Combine: long-press and swipe run simultaneously without blocking each other
  const composedGesture = Gesture.Race(longPressGesture, swipeGesture);

  // Animated styles
  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const replyIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeX.value,
      [0, 30, 50],
      [0, 0.3, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const senderAvatar =
    message.sender?.avatar ||
    message.user?.avatar ||
    message.sender_avatar ||
    message.user_avatar ||
    message.avatar ||
    "";
  const senderName = message.sender?.name || message.user?.name || "";
  const content = message.content || message.text || "";
  const sharedPost =
    message.shared_post ||
    (message.type === "shared_post" || message.metadata?.post_id
      ? message
      : null);
  const hasSharedPost = !!sharedPost;
  const isStoryShare = sharedPost?.type === "story";
  const hasMedia = !!message.media_url;
  const mediaType = message.media_type || "";
  const isImage = hasMedia && (!mediaType || mediaType === "image");
  const isDocument = hasMedia && mediaType === "document";
  const isImageOnly = isImage && !content;
  const isDeleted = message.deleted === true;
  const isForwarded = !!message.forwarded_from;
  const reactions = message.reactions || [];
  const poll = message.poll || null;
  const hasPoll = !!poll;
  const time = formatTime(message.created_at || message.timestamp);

  // Reply detection — backend sends reply_to (string ID) + reply_preview, reply_sender
  const hasReply =
    !isDeleted &&
    (message.reply_preview ||
      message.reply_sender ||
      (message.reply_to && typeof message.reply_to === "object"));
  const isTinyTextBubble =
    !!content &&
    !hasMedia &&
    !hasSharedPost &&
    !hasPoll &&
    !hasReply &&
    content.trim().length <= 4;

  const renderStatus = () => {
    if (!isOwn) return null;
    const status = message.status;
    const isGroupMsg = !!message.group_id;
    const grayColor = isImageOnly ? "rgba(255,255,255,0.7)" : "#B0B8C1";
    // Failed — red exclamation
    if (status === "failed")
      return <AlertCircle size={13} color="#EF4444" />;
    // Sending — clock icon
    if (status === "sending")
      return <Clock3 size={13} color={isImageOnly ? "rgba(255,255,255,0.7)" : "rgba(148,163,184,0.6)"} />;
    // Read — double check, blue (DM: read=true, Group: all seen or read=true)
    if (message.read === true)
      return <CheckCheck size={15} color="#53BDEB" strokeWidth={2.5} />;
    // Group messages: once sent to server = delivered to all members → double gray
    if (isGroupMsg)
      return <CheckCheck size={15} color={grayColor} strokeWidth={2} />;
    // DM: Delivered — double check, gray
    if (message.delivered === true || status === "delivered")
      return <CheckCheck size={15} color={grayColor} strokeWidth={2} />;
    // Sent — single check, gray
    return <Check size={14} color={grayColor} strokeWidth={2.5} />;
  };

  // ── Deleted message ──
  if (isDeleted) {
    return (
      <View style={[styles.row]}>
        <View style={[styles.rowContent, isOwn ? styles.rowContentOwn : styles.rowContentOther]}>
          {!isOwn && <View style={styles.avatarSpacer} />}
          <View style={[styles.bubble, styles.deletedBubble]}>
            <Text style={styles.deletedText}>
              {"\uD83D\uDEAB"} This message was deleted
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Reply preview ──
  const renderReplyPreview = () => {
    if (!hasReply) return null;

    // Handle both formats: reply_to as object or separate fields
    const replySender =
      message.reply_sender ||
      (typeof message.reply_to === "object" ? message.reply_to.sender : "") ||
      "";
    const replyContent =
      message.reply_preview ||
      (typeof message.reply_to === "object" ? message.reply_to.content : "") ||
      "";
    const replyMediaUrl = message.reply_media_url || "";
    const replyMediaType = message.reply_media_type || "";

    const replyId =
      typeof message.reply_to === "string"
        ? message.reply_to
        : typeof message.reply_to === "object" && message.reply_to
          ? message.reply_to.id || message.reply_to._id
          : null;

    return (
      <Pressable
        style={[styles.replyPreview, isOwn ? styles.replyPreviewOwn : null]}
        onPress={() => {
          if (replyId && onReplyQuoteTap) onReplyQuoteTap(replyId);
        }}
      >
        <View
          style={[styles.replyAccent, isOwn ? styles.replyAccentOwn : null]}
        />
        <View style={styles.replyBody}>
          <Text
            style={[styles.replyName, isOwn ? styles.replyNameOwn : null]}
            numberOfLines={1}
          >
            {replySender || "Reply"}
          </Text>
          <Text
            style={[styles.replyText, isOwn ? styles.replyTextOwn : null]}
            numberOfLines={1}
          >
            {replyMediaUrl && !replyContent
              ? replyMediaType === "voice" || replyMediaType === "audio"
                ? "\uD83C\uDFA4 Voice message"
                : replyMediaType === "document"
                  ? "\uD83D\uDCC4 Document"
                  : "\uD83D\uDCF7 Photo"
              : replyContent || "..."}
          </Text>
        </View>
        {!!replyMediaUrl && (!replyMediaType || replyMediaType === "image") ? (
          <Image
            source={{ uri: mediaUrl(replyMediaUrl) }}
            style={styles.replyThumb}
            contentFit="cover"
          />
        ) : null}
      </Pressable>
    );
  };

  // ── Reactions ──
  const renderReactions = () => {
    if (!reactions.length) return null;
    const grouped = {};
    reactions.forEach((r) => {
      const emoji = displayReaction(r.reaction || r.emoji);
      if (!grouped[emoji]) grouped[emoji] = { count: 0, mine: false };
      grouped[emoji].count += 1;
      if (
        String(r.user_id || r.user?.id || r.user?._id || "") ===
        String(currentUserId || "")
      ) {
        grouped[emoji].mine = true;
      }
    });
    return (
      <View
        style={[
          styles.reactionsBar,
          isOwn ? styles.reactionsBarOwn : styles.reactionsBarOther,
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.reactionsWrap}>
          {Object.entries(grouped).map(([emoji, meta]) => (
            <ReactionChip
              key={emoji}
              emoji={emoji}
              meta={meta}
              message={message}
              onReaction={onReaction}
            />
          ))}
        </View>
      </View>
    );
  };
  const renderPoll = () => {
    const pollData = message?.poll;
    if (!pollData) return null;
    const options = Array.isArray(pollData.options) ? pollData.options : [];
    const selectedOptionIndex = options.findIndex(
      (option) =>
        Array.isArray(option.votes) &&
        option.votes.some((vote) => String(vote) === String(currentUserId)),
    );
    const totalVotes = options.reduce(
      (sum, option) =>
        sum + (Array.isArray(option.votes) ? option.votes.length : 0),
      0,
    );
    return (
      <View style={[styles.pollCard, isOwn && styles.pollCardOwn]}>
        {pollData.question ? (
          <Text style={[styles.pollQuestion, isOwn && styles.pollQuestionOwn]}>
            {pollData.question}
          </Text>
        ) : null}
        {options.map((option, index) => {
          const voteCount = Array.isArray(option.votes)
            ? option.votes.length
            : 0;
          const percent =
            totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = selectedOptionIndex === index;
          return (
            <Pressable
              key={`${option.text || option.option || "option"}-${index}`}
              style={[
                styles.pollOption,
                isSelected && styles.pollOptionSelected,
              ]}
              onPress={(event) => {
                onVotePoll?.(message, index);
              }}
            >
              <View style={styles.pollOptionFillWrap}>
                <View
                  style={[
                    styles.pollOptionFill,
                    { width: `${Math.max(percent, isSelected ? 14 : 0)}%` },
                    isSelected && styles.pollOptionFillSelected,
                  ]}
                />
              </View>
              <View style={styles.pollOptionContent}>
                <Text
                  style={[
                    styles.pollOptionText,
                    isOwn && styles.pollOptionTextOwn,
                  ]}
                  numberOfLines={1}
                >
                  {option.text || option.option || `Option ${index + 1}`}
                </Text>
                <Text
                  style={[
                    styles.pollOptionMeta,
                    isOwn && styles.pollOptionMetaOwn,
                  ]}
                >
                  {percent}% • {voteCount} votes
                </Text>
              </View>
            </Pressable>
          );
        })}
        <Text style={[styles.pollFooter, isOwn && styles.pollFooterOwn]}>
          {totalVotes} total votes
        </Text>
      </View>
    );
  };

  const renderSpecialShare = () => null;

  // ── Shared post / story preview ──
  const renderSharedPost = () => {
    if (!hasSharedPost) return null;

    const postData = message.shared_post || {};
    const postId = postData.id || message.metadata?.post_id;
    const postMediaUrl = postData.media_url;
    const postUserAvatar = postData.user_avatar;
    const postUserName = postData.user_name || "";
    const postCaption = postData.content || "";
    const postBgColor = postData.bg_color;

    if (isStoryShare) {
      return (
        <View style={styles.storyShareContainer}>
          <Pressable
            onPress={() => {
              onPostPress?.(postId, "story");
            }}
            style={styles.storyShareCard}
          >
            {postMediaUrl ? (
              <Image
                source={{ uri: mediaUrl(postMediaUrl) }}
                style={styles.storyShareImage}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={
                  postBgColor
                    ? [postBgColor, postBgColor]
                    : ["#8B5CF6", "#EC4899"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyShareGradient}
              >
                {postCaption ? (
                  <Text style={styles.storyShareGradientText} numberOfLines={3}>
                    {postCaption}
                  </Text>
                ) : null}
              </LinearGradient>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
              style={styles.storyShareOverlay}
            />
            <View style={styles.storyShareFooter}>
              {postUserAvatar ? (
                <Image
                  source={{ uri: mediaUrl(postUserAvatar) }}
                  style={styles.storyShareAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.storyShareAvatarFallback}>
                  <Text style={styles.storyShareAvatarText}>
                    {postUserName.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <Text style={styles.storyShareUserName} numberOfLines={1}>
                {isOwn ? `${postUserName}'s story` : "Your story"}
              </Text>
            </View>
          </Pressable>
        </View>
      );
    }

    // Regular shared post card
    return (
      <Pressable
        onPress={(event) => {
          onPostPress?.(postId);
        }}
        style={[
          styles.postCard,
          isOwn ? styles.postCardOwn : styles.postCardOther,
        ]}
      >
        {!!postMediaUrl && (
          <Image
            source={{ uri: mediaUrl(postMediaUrl) }}
            style={styles.postCardImage}
            contentFit="cover"
          />
        )}
        <View style={styles.postCardBody}>
          <View style={styles.postCardUser}>
            {postUserAvatar ? (
              <Image
                source={{ uri: mediaUrl(postUserAvatar) }}
                style={styles.postCardAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.postCardAvatarFallback}>
                <Text style={styles.postCardAvatarText}>
                  {postUserName.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <Text
              style={[
                styles.postCardUserName,
                isOwn && styles.postCardUserNameOwn,
              ]}
              numberOfLines={1}
            >
              {postUserName}
            </Text>
          </View>
          {postCaption ? (
            <Text
              style={[
                styles.postCardCaption,
                isOwn && styles.postCardCaptionOwn,
              ]}
              numberOfLines={2}
            >
              {postCaption}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Reanimated.View
        style={[
          styles.row,
          isOwn ? styles.rowOwn : styles.rowOther,
          isGrouped && styles.rowGrouped,
          highlight && styles.rowSelected,
          rowAnimatedStyle,
        ]}
      >
        <Pressable
          style={[
            styles.rowContent,
            isOwn ? styles.rowContentOwn : styles.rowContentOther,
            highlight && styles.rowContentSelected,
          ]}
        >
          {/* Swipe reply icon */}
          <Reanimated.View
            style={[styles.swipeReplyIcon, replyIconAnimatedStyle]}
          >
            <CornerUpLeft size={18} color="#059669" />
          </Reanimated.View>

          {!isOwn && showAvatar ? (
            senderAvatar ? (
              <Image
                source={{ uri: mediaUrl(senderAvatar) }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {senderName.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )
          ) : !isOwn ? (
            <View style={styles.avatarSpacer} />
          ) : null}

          <View
            style={[
              styles.bubbleColumn,
              isOwn ? styles.bubbleColumnOwn : styles.bubbleColumnOther,
            ]}
          >
            {!isOwn && showAvatar && senderName ? (
              <Text style={styles.senderNameHeader} numberOfLines={1}>
                {senderName}
              </Text>
            ) : null}

            <View
              style={[
                styles.bubble,
                isOwn ? styles.bubbleOwn : styles.bubbleOther,
                isImageOnly && styles.bubbleImageOnly,
                isTinyTextBubble && styles.bubbleTinyText,
                highlight && styles.bubbleHighlight,
                highlight && isOwn && styles.bubbleSelectedOwn,
                highlight && !isOwn && styles.bubbleSelectedOther,
              ]}
            >
              {message.pinned ? (
                <View
                  style={[
                    styles.pinnedBadge,
                    isOwn ? styles.pinnedBadgeOwn : null,
                  ]}
                >
                  <Pin
                    size={10}
                    color={isOwn ? "rgba(255,255,255,0.5)" : "#D97706"}
                  />
                  <Text
                    style={[
                      styles.pinnedText,
                      isOwn ? styles.pinnedTextOwn : null,
                    ]}
                  >
                    Pinned
                  </Text>
                </View>
              ) : null}

              {isForwarded ? (
                <Text style={[styles.forwardedLabel, isOwn ? styles.forwardedLabelOwn : null]}>
                  {"\u21AA"} Forwarded
                </Text>
              ) : null}

              {renderReplyPreview()}
              {renderSharedPost()}
              {renderSpecialShare()}
              {renderPoll()}

              {isImage ? (
                <Pressable
                  onPress={() => {
                    onImagePress?.(message);
                  }}
                >
                  <Image
                    source={{ uri: mediaUrl(message.media_url) }}
                    style={[
                      styles.imageContent,
                      isImageOnly && styles.imageContentFull,
                    ]}
                    contentFit="cover"
                  />
                </Pressable>
              ) : null}

              {isDocument ? (
                <Pressable
                  style={styles.documentRow}
                  onPress={() => {
                    Linking.openURL(mediaUrl(message.media_url));
                  }}
                >
                  <View style={styles.documentIcon}>
                    <FileText
                      size={18}
                      color={isOwn ? "#FFFFFF" : PRIMARY_COLOR}
                    />
                  </View>
                  <Text
                    style={[
                      styles.documentName,
                      isOwn && styles.documentNameOwn,
                    ]}
                    numberOfLines={1}
                  >
                    {message.file_name || "Document"}
                  </Text>
                </Pressable>
              ) : null}

              {content && !isDeleted ? (
                <Text
                  style={[styles.messageText, isOwn && styles.messageTextOwn]}
                >
                  {content}
                </Text>
              ) : null}

              <View style={[styles.meta, isImageOnly && styles.metaOverlay]}>
                <Text
                  style={[
                    styles.time,
                    isOwn && styles.timeOwn,
                    isImageOnly && styles.timeOverlay,
                  ]}
                >
                  {time}
                </Text>
                {renderStatus()}
              </View>

              {/* Selection overlay — covers images, documents, and all content */}
              {highlight ? (
                <View style={[StyleSheet.absoluteFill, styles.selectionOverlay, { borderRadius: isImageOnly ? 18 : 16 }]}>
                  <View style={styles.selectionCheckCircle}>
                    <Check size={14} color="#FFFFFF" />
                  </View>
                </View>
              ) : null}
            </View>

            {renderReactions()}
          </View>
        </Pressable>
      </Reanimated.View>
    </GestureDetector>
  );
}

export default React.memo(MessageBubble, (prev, next) => {
  if (prev.highlight !== next.highlight) return false;
  if (prev.isOwn !== next.isOwn) return false;
  if (prev.isGrouped !== next.isGrouped) return false;
  if (prev.showAvatar !== next.showAvatar) return false;
  if (prev.currentUserId !== next.currentUserId) return false;
  const pm = prev.message;
  const nm = next.message;
  if (pm === nm) return true;
  if ((pm.id || pm._id) !== (nm.id || nm._id)) return false;
  if (pm.content !== nm.content) return false;
  if (pm.deleted !== nm.deleted) return false;
  if (pm.read !== nm.read) return false;
  if (pm.pinned !== nm.pinned) return false;
  if (pm.reactions !== nm.reactions) return false;
  return true;
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginBottom: 6,
    paddingHorizontal: 10,
    position: "relative",
  },
  rowGrouped: {
    marginBottom: 2,
  },
  rowSelected: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 18,
    borderCurve: "continuous",
  },
  rowTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: "transparent",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 1,
    zIndex: 2,
  },
  rowContentSelected: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderRadius: 18,
    borderCurve: "continuous",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  rowContentOwn: {
    justifyContent: "flex-end",
  },
  rowContentOther: {
    justifyContent: "flex-start",
  },
  rowOwn: {},
  rowOther: {},
  swipeReplyIcon: {
    position: "absolute",
    left: -30,
    top: "50%",
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: "continuous",
    marginRight: 6,
    marginTop: 2,
    backgroundColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: "continuous",
    marginRight: 6,
    marginTop: 2,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: PRIMARY_COLOR },
  avatarSpacer: { width: 36 },
  bubbleColumn: {
    flexShrink: 1,
    maxWidth: "74%",
  },
  bubbleColumnOwn: {
    alignItems: "flex-end",
  },
  bubbleColumnOther: {
    alignItems: "flex-start",
  },

  // Bubble
  bubble: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 16,
    borderCurve: "continuous",
    position: "relative",
    overflow: "visible",
  },
  bubbleOwn: {
    backgroundColor: PRIMARY_COLOR,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bubbleTinyText: {
    minWidth: 96,
    paddingRight: 18,
  },
  bubbleImageOnly: { paddingHorizontal: 4, paddingVertical: 4 },
  bubbleHighlight: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  bubbleSelectedOwn: {
    backgroundColor: "#047857",
    borderColor: "#6EE7B7",
  },
  bubbleSelectedOther: {
    backgroundColor: "#ECFDF5",
    borderColor: PRIMARY_COLOR,
  },
  selectionOverlay: {
    backgroundColor: "rgba(5,150,105,0.18)",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 6,
    overflow: "hidden",
  },
  selectionCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },

  // Pinned badge
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 4,
  },
  pinnedBadgeOwn: {},
  pinnedText: { fontSize: 10, fontWeight: "600", color: "#D97706" },
  pinnedTextOwn: { color: "rgba(255,255,255,0.5)" },

  // Forwarded label
  forwardedLabel: { fontSize: 11, fontStyle: "italic", color: "#64748B", marginBottom: 2 },
  forwardedLabelOwn: { color: "rgba(255,255,255,0.6)" },

  // Sender
  senderNameHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginLeft: 3,
    marginBottom: 3,
  },

  // Message text
  messageText: { fontSize: 15, lineHeight: 21, color: "#111827" },
  messageTextOwn: { color: "#FFFFFF" },

  // Deleted
  deletedBubble: {
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderCurve: "continuous",
  },
  deletedText: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },

  // Image
  imageContent: {
    width: IMAGE_MAX_W,
    height: IMAGE_MAX_W * 0.75,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  imageContentFull: {
    borderRadius: 14,
    borderCurve: "continuous",
  },

  // Document
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  documentName: { fontSize: 13, color: "#F9FAFB", flex: 1 },
  documentNameOwn: { color: "#FFFFFF" },

  // Meta (time + status) — compact, inline with text
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 2,
  },
  metaOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    borderCurve: "continuous",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 0,
  },
  time: { fontSize: 10, color: "#9CA3AF" },
  timeOwn: { color: "rgba(255,255,255,0.7)" },
  timeOverlay: { color: "rgba(255,255,255,0.8)" },

  // Reactions
  reactionsBar: {
    maxWidth: "88%",
    marginTop: 2,
    marginBottom: 0,
    alignSelf: "flex-start",
  },
  reactionsBarOwn: {
    alignSelf: "flex-end",
  },
  reactionsBarOther: {
    alignSelf: "flex-start",
  },
  reactionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderCurve: "continuous",
    minWidth: 32,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  reactionChipSelf: {
    backgroundColor: "#ECFDF5",
    borderColor: "rgba(5,150,105,0.35)",
  },
  reactionEmoji: { fontSize: 14 },
  reactionEmojiSelf: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: "#475569",
    marginLeft: 3,
    fontWeight: "700",
  },
  reactionCountSelf: {
    color: PRIMARY_COLOR,
  },
  specialCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 6,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  specialCardOwn: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  specialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  specialBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  specialTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  specialTitleOwn: {
    color: "#FFFFFF",
  },
  specialText: {
    fontSize: 12,
    color: "rgba(249,250,251,0.72)",
  },
  specialTextOwn: {
    color: "rgba(255,255,255,0.76)",
  },
  pollCard: {
    gap: 10,
    marginBottom: 6,
    padding: 10,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pollCardOwn: {},
  pollQuestion: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 18,
  },
  pollQuestionOwn: {
    color: "#111827",
  },
  pollOption: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 46,
    justifyContent: "center",
  },
  pollOptionSelected: {
    borderColor: "rgba(16,185,129,0.45)",
  },
  pollOptionFillWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  pollOptionFill: {
    height: "100%",
    backgroundColor: "rgba(5,150,105,0.08)",
  },
  pollOptionFillSelected: {
    backgroundColor: "rgba(16,185,129,0.18)",
  },
  pollOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pollOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  pollOptionTextOwn: {
    color: "#111827",
  },
  pollOptionMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  pollOptionMetaOwn: {
    color: "#9CA3AF",
  },
  pollFooter: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  pollFooterOwn: {
    color: "#94A3B8",
  },

  // Reply preview
  replyPreview: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 4,
  },
  replyPreviewOwn: { backgroundColor: "rgba(255,255,255,0.15)" },
  replyAccent: {
    width: 3,
    backgroundColor: PRIMARY_COLOR,
  },
  replyAccentOwn: { backgroundColor: "rgba(255,255,255,0.4)" },
  replyBody: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  replyName: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 1,
  },
  replyNameOwn: { color: "rgba(255,255,255,0.7)" },
  replyText: { fontSize: 11, color: "#9CA3AF" },
  replyTextOwn: { color: "rgba(255,255,255,0.5)" },
  replyThumb: { width: 40, height: 40 },

  // Story share
  storyShareContainer: { marginBottom: 4 },
  storyShareCard: {
    width: IMAGE_MAX_W,
    height: IMAGE_MAX_W * 0.6,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  storyShareImage: { width: "100%", height: "100%" },
  storyShareGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  storyShareGradientText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  storyShareOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  storyShareFooter: {
    position: "absolute",
    bottom: 8,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storyShareAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  storyShareAvatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  storyShareAvatarText: { fontSize: 9, fontWeight: "700", color: "#FFFFFF" },
  storyShareUserName: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },

  // Shared post card
  postCard: {
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 4,
  },
  postCardOwn: { backgroundColor: "rgba(0,0,0,0.15)" },
  postCardOther: { backgroundColor: "rgba(255,255,255,0.08)" },
  postCardImage: {
    width: IMAGE_MAX_W,
    height: IMAGE_MAX_W * 0.5,
  },
  postCardBody: { paddingHorizontal: 10, paddingVertical: 8 },
  postCardUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  postCardAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderCurve: "continuous",
  },
  postCardAvatarFallback: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  postCardAvatarText: { fontSize: 8, fontWeight: "700", color: "#F9FAFB" },
  postCardUserName: { fontSize: 12, fontWeight: "600", color: "#F9FAFB" },
  postCardUserNameOwn: { color: "#FFFFFF" },
  postCardCaption: {
    fontSize: 12,
    color: "rgba(249,250,251,0.6)",
    lineHeight: 16,
  },
  postCardCaptionOwn: { color: "rgba(255,255,255,0.6)" },
});
