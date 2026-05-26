import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import chatService from "../../services/chatService";
import socialService from "../../services/socialService";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import { useAuth } from "../../context/AuthContext";

// Match frontend role label (SocialFeedPage.js:2624): `role === "player" ? "lobbian" : role`
function roleLabel(role) {
  if (!role) return "Lobbian";
  const lower = String(role).toLowerCase();
  if (lower === "player") return "Lobbian";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getConversationId(convo) {
  return convo?.id || convo?._id || convo?.conversation_id || "";
}

export default function FeedShareSheet({ visible, onClose, post }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // Default list = people I follow (matches frontend `shareFollowing` — SocialFeedPage.js:706)
  const [following, setFollowing] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [sending, setSending] = useState(null);
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardOpen = keyboardHeight > 0;
  const searchTimerRef = useRef(null);
  const followingLoadedRef = useRef(false);

  // Track the actual keyboard height so we can shift the entire sheet ABOVE the keyboard.
  // Without this, on Android with `statusBarTranslucent` Modal, the bottom portion of the
  // sheet (including the lower half of the FlatList) renders behind the keyboard, and
  // touches in that region are consumed by the keyboard so scroll never begins.
  useEffect(() => {
    const onShow = (e) => setKeyboardHeight(e?.endCoordinates?.height || 0);
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener("keyboardDidShow", onShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset state when the sheet closes
  useEffect(() => {
    if (!visible) {
      setFollowing([]);
      followingLoadedRef.current = false;
      setSending(null);
      setQuery("");
      setUserResults([]);
      setUserSearchLoading(false);
    }
  }, [visible]);

  // Match frontend (SocialFeedPage.js:712-722): load following the moment the share dialog
  // opens, not after the user taps an extra "Send" button. The dialog now opens directly to
  // the Send-to picker — no intermediate 3-icon sheet.
  useEffect(() => {
    if (!visible || !user?.id || followingLoadedRef.current) return;
    followingLoadedRef.current = true;
    setFollowingLoading(true);
    socialService
      .getFollowing(user.id)
      .then((data) => {
        const list = data?.users || data || [];
        setFollowing(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        toast.error("Failed to load following list");
      })
      .finally(() => setFollowingLoading(false));
  }, [visible, user?.id]);

  useEffect(() => {
    if (!visible) return undefined;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = query.trim();
    // Match frontend (SocialFeedPage.js:2592): only switch to search results when query is
    // 2+ chars. Below that we keep showing the following list and skip the API call.
    if (trimmed.length < 2) {
      setUserResults([]);
      setUserSearchLoading(false);
      return undefined;
    }

    setUserSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const users = await chatService.searchUsers(trimmed);
        setUserResults(Array.isArray(users) ? users : users?.users || []);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 280);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query, visible]);

  const postUrl = post?.id ? `https://app.lobbi.in/feed?post=${post.id}` : "";

  const handleSystemShare = async () => {
    try {
      const content = post?.content ? `${post.content.slice(0, 100)}\n\n${postUrl}` : postUrl;
      await Share.share({
        title: `${post?.user_name || "Player"} on Lobbi`,
        message: content,
        url: postUrl,
      });
    } catch {
      toast.error("Unable to share this post right now");
    }
    onClose?.();
  };

  const handleSendToUser = useCallback(
    async (targetUser) => {
      const targetUserId = targetUser?.id || targetUser?._id;
      if (!targetUserId || !post?.id || sending) return;
      const sendingKey = `user-${targetUserId}`;
      setSending(sendingKey);
      try {
        const convo = await chatService.startConversation(targetUserId);
        const convoId = getConversationId(convo) || getConversationId(convo?.conversation);
        if (!convoId) {
          throw new Error("Conversation unavailable");
        }

        await chatService.sendMessage(convoId, {
          content: `🔗 Shared a post by ${post.user_name || "Player"}`,
          type: "shared_post",
          shared_post: {
            id: post.id,
            user_name: post.user_name,
            user_avatar: post.user_avatar,
            content: (post.content || "").slice(0, 200),
            media_url: post.media_url || (post.media_urls?.length ? post.media_urls[0] : ""),
          },
          metadata: { post_id: post.id },
        });

        toast.success("Post shared!");
        onClose?.();
      } catch {
        toast.error("Failed to share post");
      } finally {
        setSending(null);
      }
    },
    [onClose, post, sending]
  );

  // Match frontend (SocialFeedPage.js:2592):
  //   list = (shareSearch.length >= 2 ? shareResults : shareFollowing)
  // i.e. show following by default, switch to search-results when query has 2+ chars.
  const trimmedQuery = query.trim();
  const listData = trimmedQuery.length >= 2 ? userResults : following;
  const listLoading = trimmedQuery.length >= 2 ? userSearchLoading : followingLoading;

  // ── Send-to picker view ──
  // Matches frontend: opens directly to the Send-to dialog (no intermediate 3-icon sheet).
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        {/* paddingBottom shifts the entire flex-end stack (backdrop + sheet) up by the
            exact keyboard height. Combined with the sheet's explicit pixel height below,
            this guarantees the sheet's bottom edge sits flush with the keyboard top and
            the FlatList area is entirely visible (no part hidden behind the keyboard). */}
        <View style={[styles.overlay, { paddingBottom: keyboardHeight }]}>
          {/* Backdrop is a SIBLING above the sheet (not absoluteFill). It fills the empty
              space above the sheet via flex:1 and never overlaps the sheet area, so it
              cannot intercept touches that belong to the FlatList. */}
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                // Sheet height — explicit pixel sizing so the layout is predictable.
                //   - Keyboard closed: 75% of screen (matches frontend `max-h-[70vh]`).
                //   - Keyboard open (search focused): expand to 95% of the visible area
                //     above the keyboard, so the search input + results list fills almost
                //     the entire visible area without going behind the keyboard.
                height: keyboardOpen
                  ? Math.round((SCREEN_HEIGHT - keyboardHeight - insets.top) * 0.95)
                  : Math.round(SCREEN_HEIGHT * 0.75),
                paddingBottom: keyboardOpen ? 12 : Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Ionicons name="paper-plane-outline" size={16} color="#0F172A" />
                  <Text style={styles.title}>Send to</Text>
                </View>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {post?.user_name}: {post?.content?.slice(0, 80) || "📷 Photo"}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputRow}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search people..."
                placeholderTextColor="#94A3B8"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ) : null}
            </View>

            {listLoading ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ marginVertical: 32 }} />
            ) : listData.length > 0 ? (
              <FlatList
                data={listData}
                keyExtractor={(item) => String(item.id || item._id || item.user_id)}
                // Taps on rows DO dismiss the keyboard (handled = default RN UX).
                keyboardShouldPersistTaps="handled"
                // Do NOT use keyboardDismissMode — user wants the keyboard to stay open
                // while scrolling filtered results so the search context is preserved.
                keyboardDismissMode="none"
                // CRITICAL fix for Android Modal + keyboard + FlatList scroll bug.
                // React Native GitHub #19466: when `removeClippedSubviews` is true (the
                // default on Android), the native Dialog's input-mode handling collides
                // with the FlatList's gesture responder and scroll is blocked while the
                // keyboard is up. Forcing it off restores scrolling without dismissing
                // the keyboard.
                removeClippedSubviews={false}
                nestedScrollEnabled
                style={styles.convoList}
                renderItem={({ item }) => {
                  const userId = item.id || item._id || item.user_id;
                  const sendingKey = `user-${userId}`;
                  const isSending = sending === sendingKey;
                  const avatar = item.avatar || item.user_avatar;
                  return (
                    <TouchableOpacity
                      style={styles.convoItem}
                      activeOpacity={0.85}
                      disabled={!!sending}
                      onPress={() => handleSendToUser(item)}
                    >
                      {avatar ? (
                        <Image source={{ uri: mediaUrl(avatar) }} style={styles.convoAvatar} />
                      ) : (
                        <View style={[styles.convoAvatar, styles.convoAvatarFallback]}>
                          <Ionicons name="person-outline" size={18} color="#64748B" />
                        </View>
                      )}
                      <View style={styles.convoInfo}>
                        <Text style={styles.convoName} numberOfLines={1}>
                          {item.name || item.username || "Player"}
                        </Text>
                        <Text style={styles.convoLastMsg} numberOfLines={1}>
                          {roleLabel(item.role)}
                        </Text>
                      </View>
                      {isSending ? (
                        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                      ) : (
                        <Ionicons name="paper-plane-outline" size={18} color={PRIMARY_COLOR} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text style={styles.emptyText}>
                  {trimmedQuery.length >= 2
                    ? "No users found"
                    : "Follow people to share posts with them"}
                </Text>
              </View>
            )}

            {/* "Copy Link" button — matches frontend Share2 button (SocialFeedPage.js:2639-2647).
                Frontend label says "Copy Link" but the handler calls navigator.share (Web Share
                API) which on mobile devices opens the OS share sheet. The native equivalent is
                Share.share, so this button opens the system share sheet. */}
            <TouchableOpacity activeOpacity={0.85} style={styles.copyLinkBtn} onPress={handleSystemShare}>
              <Ionicons name="link-outline" size={16} color="#64748B" />
              <Text style={styles.copyLinkText}>Copy Link</Text>
            </TouchableOpacity>
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
  // Backdrop tap-target — sized to take only the empty space above the sheet (flex: 1
  // inside the column-flex overlay, with the sheet having an explicit height below). This
  // guarantees backdrop touches never overlap the sheet/FlatList area.
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginRight: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  // ── 3 icon buttons row ──
  iconsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 16,
  },
  iconItem: {
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  // ── Conversation picker ──
  // Match frontend's `flex-1 overflow-y-auto` pattern (SocialFeedPage.js:2591) — the user
  // list fills the remaining height inside the 70%-screen sheet instead of locking to a
  // fixed pixel height (which clipped the list on tall screens and overflowed on short ones).
  convoList: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  convoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    // Match frontend row padding `p-3` (SocialFeedPage.js:2606) — equal padding on all sides
    // so the send icon has breathing room from the right edge.
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  convoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  convoAvatarFallback: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  convoInfo: {
    flex: 1,
    gap: 2,
  },
  convoName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  convoLastMsg: {
    fontSize: 12,
    color: "#94A3B8",
  },
  emptyText: {
    textAlign: "center",
    marginVertical: 32,
    fontSize: 14,
    color: "#94A3B8",
  },
  emptyInlineText: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 8,
  },
  copyLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  copyLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});
