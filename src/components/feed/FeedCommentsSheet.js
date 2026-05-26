import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { PRIMARY_COLOR } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import { Image } from "expo-image";
import CommentKeyboardComposer from "../ui/CommentKeyboardComposer";
import {
  useKeyboardState,
  useReanimatedKeyboardAnimation,
  useResizeMode,
} from "../../lib/keyboardController";
import { useAuth } from "../../context/AuthContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.56;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.88;
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

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

function CommentItem({ item, currentUserId }) {
  const { user: authUser } = useAuth();
  const isOwn = currentUserId && item.user_id === currentUserId;
  const avatar = isOwn ? (authUser?.avatar ?? item.user_avatar) : item.user_avatar;
  const commentText = String(item.content || "");

  const handleOpenLink = async (url) => {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    try {
      await Linking.openURL(normalizedUrl);
    } catch {}
  };

  const renderCommentText = () => {
    if (!commentText) return null;
    const parts = commentText.split(URL_PATTERN);

    return parts.map((part, index) => {
      if (!part) return null;
      const isUrl = URL_PATTERN.test(part);
      URL_PATTERN.lastIndex = 0;

      if (isUrl) {
        return (
          <Text key={`${item.id || item._id || "comment"}-link-${index}`} style={styles.commentLink} onPress={() => handleOpenLink(part)}>
            {part}
          </Text>
        );
      }

      return (
        <Text key={`${item.id || item._id || "comment"}-text-${index}`} style={styles.commentText}>
          {part}
        </Text>
      );
    });
  };

  return (
    <View style={styles.commentRow}>
      {avatar ? (
        <Image source={{ uri: mediaUrl(avatar) }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person-outline" size={14} color="#64748B" />
        </View>
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentUser}>{item.user_name || "Player"}</Text>
          <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{renderCommentText()}</Text>
      </View>
    </View>
  );
}

export default function FeedCommentsSheet({
  visible,
  onClose,
  post,
  comments = [],
  loading,
  submitting,
  onSubmit,
  onLoadMore,
  hasMore,
  currentUserId,
}) {
  useResizeMode();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerHeight, setComposerHeight] = useState(92);
  const listRef = useRef(null);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const latestCommentKey = comments[0]?._id || comments[0]?.id || null;

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value + composerHeight + 18,
  }));

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      await onLoadMore?.();
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      setExpanded(false);
      setInput("");
      setComposerHeight(92);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !keyboardVisible) return;
    setExpanded(true);
  }, [keyboardVisible, visible]);

  useEffect(() => {
    if (!visible || !listRef.current) return undefined;

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: comments.length > 1 });
    });

    return () => cancelAnimationFrame(frame);
  }, [latestCommentKey, visible]);

  const handleSend = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text) return;
    const ok = await onSubmit?.(text);
    if (ok !== false) {
      setInput("");
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 12,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -35) {
          setExpanded(true);
        } else if (gestureState.dy > 80 && !keyboardVisible && expanded) {
          setExpanded(false);
        } else if (gestureState.dy > 100 && !keyboardVisible && !expanded) {
          onClose?.();
        }
      },
    })
  ).current;

  // When keyboard is visible: FULL SCREEN so KeyboardStickyView has room.
  // This is critical — emoji keyboard is taller than normal keyboard,
  // and a fixed-height sheet clips the composer behind the keyboard.
  const sheetHeight = keyboardVisible
    ? SCREEN_HEIGHT
    : expanded
      ? EXPANDED_HEIGHT
      : COLLAPSED_HEIGHT;

  const handleComposerHeightChange = useCallback((nextHeight) => {
    if (!nextHeight) return;
    setComposerHeight((prev) => (Math.abs(prev - nextHeight) < 2 ? prev : nextHeight));
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
            },
          ]}
        >
          <View style={[styles.dragArea, { paddingTop: Math.max(insets.top * 0.22, 8) }]} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setExpanded((prev) => !prev)}
              activeOpacity={0.85}
              style={styles.expandButton}
            >
              <Ionicons name={expanded || keyboardVisible ? "chevron-down" : "chevron-up"} size={18} color="#64748B" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Comments</Text>
              <Text style={styles.subtitle}>{post?.comments_count || comments.length || 0} replies</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.contentWrap, contentAnimatedStyle]}>
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={PRIMARY_COLOR} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                style={styles.list}
                data={comments}
                keyExtractor={(item, index) => item._id || item.id || `${item.user_id || "user"}-${index}`}
                renderItem={({ item }) => (
                  <CommentItem item={item} currentUserId={currentUserId} />
                )}
                scrollEnabled={comments.length > 0}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
                bounces={false}
                overScrollMode="never"
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                contentContainerStyle={
                  comments.length ? styles.listContent : styles.emptyContent
                }
                ListFooterComponent={
                  loadingMore ? (
                    <View style={{ paddingVertical: 12, alignItems: "center" }}>
                      <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No comments yet. Be the first to join the conversation.</Text>
                }
              />
            )}
          </Animated.View>

          <CommentKeyboardComposer
            value={input}
            onChangeText={setInput}
            onSubmit={handleSend}
            submitting={submitting}
            onFocus={() => setExpanded(true)}
            onHeightChange={handleComposerHeightChange}
            visible={visible}
            placeholder="Write a comment"
          />
        </View>
      </View>
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
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  dragArea: {
    alignItems: "center",
    paddingBottom: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  expandButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  list: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingTop: 4,
    gap: 14,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 120,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBody: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  commentTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  commentLink: {
    color: PRIMARY_COLOR,
    textDecorationLine: "underline",
  },
});
