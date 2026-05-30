import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  Modal,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  ArrowLeft,
  BarChart3,
  Camera,
  Copy,
  CornerUpLeft,
  FileText,
  Mic,
  MoreVertical,
  Pencil,
  Forward,
  Users,
  ImageIcon,
  BellOff,
  Pin,
  PinOff,
  Settings,
  Trash2,
  UserPlus,
  MessageCircle,
  Search,
  X,
} from "lucide-react-native";

import { useAuth } from "../../../context/AuthContext";
import { useWishlist } from "../../../context/WishlistContext";
import chatService from "../../../services/chatService";
import { mediaUrl } from "../../../utils/media";
import toast from "../../../utils/toast";
import { PRIMARY_COLOR } from "../../../constants/theme";
import MessageBubble from "../../../components/chat/MessageBubble";
import ChatKeyboardComposer from "../../../components/ui/ChatKeyboardComposer";
import EncryptionBadge from "../../../components/ui/EncryptionBadge";
import InviteLinkModal from "../../../components/group/InviteLinkModal";
import JoinRequestsModal from "../../../components/group/JoinRequestsModal";
import EditGroupModal from "../../../components/group/EditGroupModal";
// Native keyboard emoji used instead of rn-emoji-keyboard
import { safePush } from "../../../services/navigationGuard";
import { API_BASE } from "../../../lib/axios";
import { KCKeyboardAvoidingView } from "../../../lib/keyboardController";
import { STORAGE_KEYS } from "../../../constants/storage";
import ChatThreadSkeleton from "../../../components/skeletons/ChatThreadSkeleton";
import ChatMediaGridSkeleton from "../../../components/skeletons/ChatMediaGridSkeleton";

const SOCKET_URL = API_BASE.replace(/\/api$/, "");

// Animated typing dots (WhatsApp-style bouncing)
function TypingDots() {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(dot, {
            toValue: -4,
            duration: 300,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: PRIMARY_COLOR,
    opacity: 0.7,
  };
  return (
    <View
      style={typingStyles.container}
    >
      <RNAnimated.View
        style={[dotStyle, { transform: [{ translateY: dot1 }] }]}
      />
      <RNAnimated.View
        style={[dotStyle, { transform: [{ translateY: dot2 }] }]}
      />
      <RNAnimated.View
        style={[dotStyle, { transform: [{ translateY: dot3 }] }]}
      />
    </View>
  );
}
const typingStyles = StyleSheet.create({
  container: { flexDirection: "row", gap: 3, alignItems: "center", height: 12 },
});
const SCREEN = Dimensions.get("window");
const REACTION_EMOJIS = [
  "\uD83D\uDC4D",
  "\u2764\uFE0F",
  "\uD83D\uDE02",
  "\uD83D\uDE2E",
  "\uD83D\uDD25",
  "\uD83D\uDC4F",
];
const REACTION_TO_BACKEND = {
  "\uD83D\uDC4D": "thumbsup",
  "\u2764\uFE0F": "heart",
  "\uD83D\uDE02": "laugh",
  "\uD83D\uDE2E": "wow",
  "\uD83D\uDD25": "fire",
  "\uD83D\uDC4F": "clap",
};

const BACKEND_TO_REACTION = Object.fromEntries(
  Object.entries(REACTION_TO_BACKEND).map(([k, v]) => [v, k]),
);
function displayReaction(value) {
  if (!value) return "";
  return BACKEND_TO_REACTION[value] || value;
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const dA = new Date(a);
  const dB = new Date(b);
  return (
    dA.getFullYear() === dB.getFullYear() &&
    dA.getMonth() === dB.getMonth() &&
    dA.getDate() === dB.getDate()
  );
}

/**
 * Enrich reply_preview / reply_sender fields on messages that have reply_to
 * but are missing the preview data. Matches the web useDmChat enrichment pattern.
 */
function enrichReplies(msgs) {
  const byId = {};
  for (const m of msgs) {
    const id = m.id || m._id;
    if (id) byId[id] = m;
  }
  for (const m of msgs) {
    const replyId =
      typeof m.reply_to === "string"
        ? m.reply_to
        : typeof m.reply_to === "object" && m.reply_to
          ? m.reply_to.id || m.reply_to._id
          : null;
    if (replyId && !m.reply_preview && byId[replyId]) {
      const ref = byId[replyId];
      m.reply_preview =
        (ref.content || "").slice(0, 80) ||
        (ref.media_url ? "Media" : "\u2026");
      m.reply_sender =
        ref.sender_name || ref.sender?.name || ref.user?.name || "Unknown";
      if (ref.media_url) {
        m.reply_media_url = ref.media_url;
        m.reply_media_type = ref.media_type;
      }
    }
  }
  return msgs;
}

const InlineForwardRow = React.memo(function InlineForwardRow({ item, onForward }) {
  const handlePress = useCallback(() => onForward(item), [onForward, item]);
  return (
    <Pressable style={styles.forwardItem} onPress={handlePress}>
      <View style={styles.headerAvatarFallback}>
        <Text style={styles.headerAvatarText}>
          {(item.name || item.other_user?.name || "C")
            .substring(0, 2)
            .toUpperCase()}
        </Text>
      </View>
      <Text style={styles.forwardItemText} numberOfLines={1}>
        {item.name || item.other_user?.name || "Conversation"}
      </Text>
    </Pressable>
  );
});

const SearchResultRow = React.memo(function SearchResultRow({ item, onPress }) {
  const id = item.id || item._id;
  const handlePress = useCallback(() => onPress(id), [onPress, id]);
  return (
    <Pressable style={styles.searchResultItem} onPress={handlePress}>
      <View style={styles.searchResultTop}>
        <Text style={styles.searchResultSender} numberOfLines={1}>
          {item.sender_name || item.sender?.name || "User"}
        </Text>
        <Text style={styles.searchResultTime}>
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </Text>
      </View>
      <Text style={styles.searchResultContent} numberOfLines={1}>
        {item.content || item.text || (item.media_url ? "Media" : "")}
      </Text>
    </Pressable>
  );
});

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshUnreadCount, notifyChatRead } = useWishlist();
  const params = useLocalSearchParams();
  const { conversationId, name, avatar, type, otherUserId } = params;
  const isGroup = type === "group";

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [pinnedSearchQuery, setPinnedSearchQuery] = useState("");

  const filteredPinnedMessages = useMemo(() => {
    if (!pinnedSearchQuery.trim()) return pinnedMessages;
    const q = pinnedSearchQuery.toLowerCase();
    return pinnedMessages.filter(
      (m) =>
        (m.content || "").toLowerCase().includes(q) ||
        (m.sender_name || m.sender?.name || "").toLowerCase().includes(q),
    );
  }, [pinnedMessages, pinnedSearchQuery]);
  const [mediaItems, setMediaItems] = useState([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [composerFocusTrigger, setComposerFocusTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [forwardConversations, setForwardConversations] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [showSelectedMoreMenu, setShowSelectedMoreMenu] = useState(false);
  const [selectedMessageAnchor, setSelectedMessageAnchor] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const showScrollToBottomRef = useRef(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [highlightMsgId, setHighlightMsgId] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState(null);
  const [resolvedName, setResolvedName] = useState(
    name ? decodeURIComponent(name) : "",
  );
  const [resolvedAvatar, setResolvedAvatar] = useState(
    avatar ? decodeURIComponent(avatar) : "",
  );
  const [resolvedOtherUserId, setResolvedOtherUserId] = useState(
    otherUserId || "",
  );
  const [conversationMeta, setConversationMeta] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [joinRequestCount, setJoinRequestCount] = useState(0);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);

  const keyboardHeightRef = useRef(0);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Refs for values accessed inside WebSocket handler (avoids stale closures + reconnects)
  const resolvedNameRef = useRef(resolvedName);
  const resolvedOtherUserIdRef = useRef(resolvedOtherUserId);
  const otherUserIdRef = useRef(otherUserId);
  const loadMessagesRef = useRef(loadMessages);
  const resolveConversationMetaRef = useRef(resolveConversationMeta);
  resolvedNameRef.current = resolvedName;
  resolvedOtherUserIdRef.current = resolvedOtherUserId;
  otherUserIdRef.current = otherUserId;
  loadMessagesRef.current = loadMessages;
  resolveConversationMetaRef.current = resolveConversationMeta;
  const isAtBottomRef = useRef(true);

  const userId = String(user?.id || user?._id || "");
  const requestStatus = conversationMeta?.status || "";
  const requesterId = String(conversationMeta?.requester_id || "");
  const isIncomingRequest =
    !isGroup &&
    requestStatus === "request" &&
    requesterId &&
    requesterId !== userId;
  const isOutgoingRequest =
    !isGroup && requestStatus === "request" && requesterId === userId;
  const isDeclinedRequest = !isGroup && requestStatus === "declined";
  const isGroupCreator = String(groupInfo?.created_by || "") === userId;
  const isGroupAdmin =
    isGroup &&
    (groupInfo?.is_admin ||
      isGroupCreator ||
      (groupInfo?.admins || []).includes(userId));
  const mentionSuggestions = useMemo(() => {
    if (!isGroup) return [];
    const members = Array.isArray(groupInfo?.member_details)
      ? groupInfo.member_details
      : [];
    return members
      .map((member) => ({
        id: String(member.id || member._id || ""),
        name: member.name || member.username || member.display_name || "Member",
      }))
      .filter((member) => member.id && member.id !== userId);
  }, [groupInfo, isGroup, userId]);
  const resetPollComposer = useCallback(() => {
    setShowPollComposer(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setCreatingPoll(false);
  }, []);

  const clamp = useCallback((value, min, max) => {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  }, []);

  const clearSelectedMessageState = useCallback(() => {
    setSelectedMessage(null);
    setSelectedMessageAnchor(null);
    setShowSelectedMoreMenu(false);
  }, []);

  const closeSelectedMenu = useCallback(() => {
    setShowSelectedMoreMenu(false);
  }, []);

  const upsertRealtimeMessage = useCallback(
    (incoming) => {
      if (!incoming) return;
      setMessages((prev) => {
        const normalized = incoming.message || incoming.data || incoming;
        const incomingId = normalized.id || normalized._id;
        if (!incomingId) return prev;

        // Enrich reply_preview from existing messages if the incoming msg has reply_to
        const replyId =
          typeof normalized.reply_to === "string"
            ? normalized.reply_to
            : typeof normalized.reply_to === "object" && normalized.reply_to
              ? normalized.reply_to.id || normalized.reply_to._id
              : null;
        if (replyId && !normalized.reply_preview) {
          const ref = prev.find((m) => (m.id || m._id) === replyId);
          if (ref) {
            normalized.reply_preview =
              (ref.content || "").slice(0, 80) ||
              (ref.media_url ? "Media" : "\u2026");
            normalized.reply_sender =
              ref.sender_name ||
              ref.sender?.name ||
              ref.user?.name ||
              "Unknown";
            if (ref.media_url) {
              normalized.reply_media_url = ref.media_url;
              normalized.reply_media_type = ref.media_type;
            }
          }
        }

        const existingIndex = prev.findIndex(
          (item) => (item.id || item._id) === incomingId,
        );
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...normalized };
          return next;
        }

        const tempIndex = prev.findIndex(
          (item) =>
            typeof (item.id || item._id) === "string" &&
            String(item.id || item._id).startsWith("temp_") &&
            String(
              item.user_id ||
                item.sender_id ||
                item.sender?.id ||
                item.sender?._id,
            ) === String(userId) &&
            (item.content || "") === (normalized.content || ""),
        );

        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = {
            ...next[tempIndex],
            ...normalized,
            status: "sent",
          };
          return next;
        }

        if (isAtBottomRef.current) {
          // Auto-scroll to show new message when user is at bottom
          setTimeout(() => {
            flatListRef.current?.scrollToOffset?.({
              offset: 0,
              animated: true,
            });
          }, 50);
        } else {
          setNewMsgCount((c) => c + 1);
        }
        return [normalized, ...prev];
      });
    },
    [userId],
  );

  const resolveConversationMeta = useCallback(
    async (options = {}) => {
      if (isGroup) return;
      try {
        const data = await chatService.getUnifiedConversations();
        const list = Array.isArray(data) ? data : data?.conversations || [];
        const convo = list.find(
          (item) => item.id === conversationId || item._id === conversationId,
        );
        if (!convo) return;
        setConversationMeta(convo);
        if (!resolvedName) {
          const otherName =
            convo.display_name || convo.other_user?.name || convo.name || "";
          if (otherName) setResolvedName(otherName);
        }
        if (!resolvedAvatar) {
          const otherAv = convo.other_user?.avatar || convo.avatar || "";
          if (otherAv) setResolvedAvatar(otherAv);
        }
        const otherId =
          convo.other_user?.id ||
          convo.participants?.find((p) => String(p) !== String(userId)) ||
          "";
        if (otherId) {
          setResolvedOtherUserId(String(otherId));
          if (!options.skipOnlineRefresh) {
            chatService
              .onlineStatus(otherId)
              .then(setOnlineStatus)
              .catch(() => {});
          }
        }
      } catch {}
    },
    [conversationId, isGroup, resolvedAvatar, resolvedName, userId],
  );

  // ── Load Messages ───────────────────────────────────────
  const loadMessages = useCallback(
    async (before = null) => {
      try {
        const fetchFn = isGroup
          ? chatService.getGroupMessages
          : chatService.getMessages;
        const data = await fetchFn(conversationId, before);
        const msgs = Array.isArray(data)
          ? data
          : data?.messages || data?.data || [];

        // API returns oldest-first. Reverse to newest-first for inverted FlatList.
        const sorted = [...msgs].reverse();

        // Enrich reply_preview / reply_sender from referenced messages (matches web useDmChat)
        enrichReplies(sorted);

        if (before) {
          setMessages((prev) => {
            const byId = new Map();
            for (const m of prev) byId.set(m.id || m._id, m);
            for (const m of sorted) {
              const id = m.id || m._id;
              if (!byId.has(id)) byId.set(id, m);
            }
            const merged = Array.from(byId.values()).sort((a, b) => {
              const tA =
                new Date(a.created_at || a.createdAt || 0).getTime() || 0;
              const tB =
                new Date(b.created_at || b.createdAt || 0).getTime() || 0;
              return tB - tA; // descending: newest first for inverted
            });
            enrichReplies(merged);
            return merged;
          });
        } else {
          setMessages(sorted);
        }

        setHasMore(msgs.length >= 20);
      } catch (err) {
        if (!before) toast.error("Failed to load messages");
      }
    },
    [conversationId, isGroup],
  );

  // ── Resolve name/avatar/otherUserId if not passed via params ────────
  useEffect(() => {
    resolveConversationMeta();
  }, [resolveConversationMeta]);

  useEffect(() => {
    if (!isGroup || !conversationId) return;
    let alive = true;
    chatService
      .getGroup(conversationId)
      .then((data) => {
        if (alive) setGroupInfo(data || null);
      })
      .catch(() => {
        if (alive) setGroupInfo(null);
      });
    return () => {
      alive = false;
    };
  }, [conversationId, isGroup]);

  // Auto-fetch join request count for admins of private groups
  useEffect(() => {
    if (!isGroup || !isGroupAdmin || !groupInfo?.is_private) {
      setJoinRequestCount(0);
      return;
    }
    chatService
      .getJoinRequests(conversationId)
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : data?.requests || data?.data || [];
        setJoinRequestCount(list.length);
      })
      .catch(() => {});
  }, [isGroup, isGroupAdmin, groupInfo?.is_private, conversationId]);

  // ── Initial Load ────────────────────────────────────────
  useEffect(() => {
    let ws = null;
    let pingInterval = null;
    let retryTimer = null;
    let retryCount = 0;
    let alive = true;

    const scheduleReconnect = () => {
      if (!alive) return;
      const delay = Math.min(1000 * 2 ** retryCount, 15000);
      retryCount += 1;
      retryTimer = setTimeout(connectWs, delay);
    };

    const connectWs = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
        if (!token || !alive) return;
        const wsUrl =
          SOCKET_URL.replace(/^http/, "ws") + `/api/chat/ws?token=${token}`;
        ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setSocketConnected(true);
          retryCount = 0;
          setTyping(false);
          setTypingUser("");
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!alive) return;
          try {
            const msg = JSON.parse(event.data);
            if (!msg || msg.type === "pong") return;

            if (
              msg.type === "online_status" &&
              !isGroup &&
              String(msg.user_id) ===
                String(resolvedOtherUserIdRef.current || otherUserIdRef.current)
            ) {
              setOnlineStatus((prev) => ({
                ...(prev || {}),
                online: !!msg.online,
              }));
              return;
            }

            if (
              msg.type === "typing" &&
              !isGroup &&
              msg.conversation_id === conversationId &&
              String(msg.user_id) !== String(userId)
            ) {
              setTyping(true);
              setTypingUser(resolvedNameRef.current || "Someone");
              if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                setTyping(false);
                setTypingUser("");
              }, 3000);
              return;
            }

            if (
              msg.type === "request_accepted" &&
              !isGroup &&
              msg.conversation_id === conversationId
            ) {
              setConversationMeta((prev) =>
                prev ? { ...prev, status: "active" } : prev,
              );
              toast.success("Request accepted");
              return;
            }

            if (
              msg.type === "new_message" &&
              msg.conversation_id === conversationId
            ) {
              upsertRealtimeMessage(msg.message || msg);
              if (!isGroup) {
                resolveConversationMetaRef.current?.({
                  skipOnlineRefresh: true,
                });
                // Mark the incoming message as read since user is viewing this chat
                chatService.markDmRead(conversationId).catch(() => {});
                refreshUnreadCount?.();
                notifyChatRead();
              }
              return;
            }

            if (
              msg.type === "message_deleted" &&
              msg.conversation_id === conversationId
            ) {
              // Soft-delete: mark as deleted instead of full reload to preserve enrichment
              const delId = msg.message_id;
              if (delId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    (m.id || m._id) === delId ? { ...m, deleted: true } : m,
                  ),
                );
              } else {
                loadMessagesRef.current();
              }
              return;
            }

            if (
              msg.type === "message_reaction" &&
              msg.conversation_id === conversationId
            ) {
              // Apply reaction delta inline to preserve enriched reply data
              const rMsgId = msg.message_id;
              if (rMsgId) {
                setMessages((prev) =>
                  prev.map((m) => {
                    if ((m.id || m._id) !== rMsgId) return m;
                    const reactions = Array.isArray(msg.reactions)
                      ? msg.reactions
                      : m.reactions || [];
                    return { ...m, reactions };
                  }),
                );
              } else {
                loadMessagesRef.current();
              }
              return;
            }

            // Read receipts — mark all messages as read (double tick)
            if (
              msg.type === "messages_read" &&
              msg.conversation_id === conversationId
            ) {
              setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
              return;
            }

            if (
              msg.type === "poll_update" &&
              msg.conversation_id === conversationId
            ) {
              loadMessagesRef.current();
              return;
            }

            if (
              msg.type === "group_message" &&
              msg.group_id === conversationId
            ) {
              upsertRealtimeMessage(msg.message || msg);
              // Mark as read since user is viewing this group chat
              chatService.markGroupRead(conversationId).catch(() => {});
              refreshUnreadCount?.();
              notifyChatRead();
              return;
            }

            if (
              msg.type === "group_message_deleted" &&
              msg.group_id === conversationId
            ) {
              const gDelId = msg.message_id;
              if (gDelId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    (m.id || m._id) === gDelId ? { ...m, deleted: true } : m,
                  ),
                );
              } else {
                loadMessagesRef.current();
              }
              return;
            }

            if (
              msg.type === "group_reaction" &&
              msg.group_id === conversationId
            ) {
              const grMsgId = msg.message_id;
              if (grMsgId && Array.isArray(msg.reactions)) {
                setMessages((prev) =>
                  prev.map((m) => {
                    if ((m.id || m._id) !== grMsgId) return m;
                    return { ...m, reactions: msg.reactions };
                  }),
                );
              } else {
                loadMessagesRef.current();
              }
              return;
            }

            if (
              msg.type === "group_poll_update" &&
              msg.group_id === conversationId
            ) {
              loadMessagesRef.current();
              return;
            }

            // Group dissolved or user removed — navigate back to chat list
            if (
              (msg.type === "group_deleted" || msg.type === "group_member_removed") &&
              msg.group_id === conversationId
            ) {
              toast.info(msg.type === "group_deleted" ? "This group has been deleted" : "You were removed from this group");
              refreshUnreadCount?.();
              notifyChatRead();
              router.back();
              return;
            }

            if (
              msg.type === "group_typing" &&
              msg.group_id === conversationId &&
              String(msg.user_id) !== String(userId)
            ) {
              setTyping(true);
              setTypingUser(msg.user_name || "Someone");
              if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                setTyping(false);
                setTypingUser("");
              }, 3000);
              return;
            }
          } catch {}
        };

        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          setSocketConnected(false);
          if (alive) scheduleReconnect();
        };

        ws.onerror = () => {
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        scheduleReconnect();
      }
    };

    connectWs();

    return () => {
      alive = false;
      setSocketConnected(false);
      if (pingInterval) clearInterval(pingInterval);
      if (retryTimer) clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {}
      socketRef.current = null;
    };
  }, [conversationId, isGroup, userId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMessages();
      setLoading(false);
      // Backend marks DMs as read during GET /messages, so refresh unread counts after load
      refreshUnreadCount?.();
      notifyChatRead();
    };
    init();
  }, [loadMessages]);

  // ── Message polling (backend allows only 1 WebSocket per user, frontend uses it) ──
  useEffect(() => {
    if (socketConnected) return;
    let alive = true;
    let lastMsgId = null;

    // Fetch online status for DM conversations
    const targetUserId = otherUserId || resolvedOtherUserId;
    if (!isGroup && targetUserId) {
      chatService
        .onlineStatus(targetUserId)
        .then(setOnlineStatus)
        .catch(() => {});
    }

    // Poll for new messages every 8 seconds (WebSocket handles real-time)
    const pollInterval = setInterval(async () => {
      if (!alive) return;
      try {
        const fetchFn = isGroup
          ? chatService.getGroupMessages
          : chatService.getMessages;
        const data = await fetchFn(conversationId);
        const msgs = Array.isArray(data)
          ? data
          : data?.messages || data?.data || [];

        // Reverse to newest-first for inverted FlatList.
        const sorted = [...msgs].reverse();

        // Enrich reply previews from referenced messages
        enrichReplies(sorted);

        // Only update if new messages arrived
        const newLastId = sorted[0]?.id;
        if (newLastId && newLastId !== lastMsgId) {
          lastMsgId = newLastId;
          setMessages(sorted);
        }
      } catch {}
    }, 8000);

    // Poll typing every 5 seconds
    const typingInterval = setInterval(async () => {
      if (!alive) return;
      try {
        const fn = chatService.getTyping;
        if (fn) {
          const data = await fn(conversationId);
          if (data?.typing && String(data.user_id) !== String(userId)) {
            setTyping(true);
            setTypingUser(data.user_name || "");
            if (typingTimeoutRef.current)
              clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setTyping(false);
              setTypingUser("");
            }, 3000);
          }
        }
      } catch {}
    }, 5000);

    return () => {
      alive = false;
      clearInterval(pollInterval);
      clearInterval(typingInterval);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [
    conversationId,
    userId,
    isGroup,
    otherUserId,
    resolvedOtherUserId,
    socketConnected,
  ]);

  // ── Auto-scroll when chat area shrinks (keyboard, emoji panel, reply) ──
  const chatAreaHeightRef = useRef(0);
  const handleChatAreaLayout = useCallback((e) => {
    const newHeight = e.nativeEvent.layout.height;
    const prevHeight = chatAreaHeightRef.current;
    chatAreaHeightRef.current = newHeight;
    // If area shrank (keyboard/emoji opened), scroll to latest message
    if (prevHeight > 0 && newHeight < prevHeight - 30) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      }, 80);
    }
  }, []);

  // ── Scroll to bottom when replying so latest message stays visible ──
  useEffect(() => {
    if (replyTo) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      }, 200);
    }
  }, [replyTo]);

  // ── Keyboard height tracking + auto-scroll ──
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e) => {
      keyboardHeightRef.current = e.endCoordinates?.height || 300;
      // Auto-scroll to bottom so latest message stays visible above keyboard
      setTimeout(() => {
        flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      }, 100);
    };
    const onHide = () => { keyboardHeightRef.current = 0; };
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  // ── Heartbeat to keep user online + poll other user status ──
  useEffect(() => {
    if (isGroup) return;
    // Send initial heartbeat to mark ourselves online
    chatService.heartbeat?.().catch(() => {});
    const interval = setInterval(() => {
      chatService.heartbeat?.().catch(() => {});
      // Re-fetch other user's online status
      const targetId = resolvedOtherUserId || otherUserId;
      if (targetId) {
        chatService
          .onlineStatus(targetId)
          .then(setOnlineStatus)
          .catch(() => {});
      }
    }, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isGroup, otherUserId, resolvedOtherUserId]);

  // ── Mark as read + keep unread badges in sync ──────────
  useFocusEffect(
    useCallback(() => {
      const syncReadState = async () => {
        if (!conversationId) return;
        if (isGroup) {
          chatService.markGroupRead(conversationId).catch(() => {});
        } else {
          chatService.markDmRead(conversationId).catch(() => {});
        }
        refreshUnreadCount?.();
        notifyChatRead();
      };
      syncReadState();
      // Also notify on blur (when user leaves chat) so list refreshes with updated read state
      return () => {
        refreshUnreadCount?.();
        notifyChatRead();
      };
    }, [conversationId, isGroup, refreshUnreadCount, notifyChatRead]),
  );

  // ── Send Message ────────────────────────────────────────
  const handleSend = async (content) => {
    const tempId = `temp_${Date.now()}`;
    const reply = replyTo;
    const tempMsg = {
      id: tempId,
      _id: tempId,
      content,
      type: "text",
      sender: user,
      user: user,
      user_id: userId,
      sender_id: userId,
      sender_name: user?.name || "",
      sender_avatar: user?.avatar || "",
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: "sending",
      ...(isGroup ? { group_id: conversationId } : { conversation_id: conversationId }),
      // Flat reply fields matching web useDmChat pattern
      reply_to: reply ? reply.id || reply._id : null,
      reply_preview: reply
        ? (reply.content || "").slice(0, 80) ||
          (reply.media_url ? "Media" : undefined)
        : undefined,
      reply_sender: reply
        ? reply.sender_name ||
          reply.sender?.name ||
          reply.user?.name ||
          "Unknown"
        : undefined,
      reply_media_url: reply?.media_url || undefined,
      reply_media_type: reply?.media_type || undefined,
    };
    setReplyTo(null);

    setMessages((prev) => [tempMsg, ...prev]);

    // Auto-scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      isAtBottomRef.current = true;
      setShowScrollToBottom(false);
      setNewMsgCount(0);
    }, 50);

    try {
      const sendFn = isGroup
        ? chatService.sendGroupMessage
        : chatService.sendMessage;
      const res = await sendFn(conversationId, {
        content,
        reply_to: reply?.id || reply?._id || null,
      });

      setMessages((prev) =>
        prev.map((m) => {
          if ((m.id || m._id) !== tempId) return m;
          const server = { ...res, ...(res.message || {}), status: "sent" };
          // Preserve enriched reply fields if server doesn't return them
          if (tempMsg.reply_preview && !server.reply_preview) {
            server.reply_preview = tempMsg.reply_preview;
            server.reply_sender = tempMsg.reply_sender;
            server.reply_media_url = tempMsg.reply_media_url;
            server.reply_media_type = tempMsg.reply_media_type;
          }
          return server;
        }),
      );
      resolveConversationMeta({ skipOnlineRefresh: true });
      // Update chat list preview with latest message
      notifyChatRead();
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id) === tempId ? { ...m, status: "failed" } : m,
        ),
      );
      toast.error("Failed to send message");
    }
  };

  // ── Typing Indicator ───────────────────────────────────
  const emitTyping = useCallback(() => {
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      // Send via WebSocket (instant) for both DM and group
      if (isGroup) {
        ws.send(
          JSON.stringify({ type: "group_typing", group_id: conversationId }),
        );
      } else {
        ws.send(
          JSON.stringify({ type: "typing", conversation_id: conversationId }),
        );
      }
    } else {
      // Fallback to HTTP API only when WebSocket is disconnected
      const fn = isGroup ? chatService.sendGroupTyping : chatService.sendTyping;
      fn(conversationId).catch(() => {});
    }
  }, [conversationId, isGroup]);

  // ── Load More ───────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[messages.length - 1]; // inverted: last = oldest
    const cursor = oldest?.created_at || oldest?.createdAt || oldest?.id;
    await loadMessages(cursor);
    setLoadingMore(false);
  }, [loadingMore, hasMore, messages, loadMessages]);

  const handleScroll = useCallback(
    (e) => {
      const offsetY = e.nativeEvent.contentOffset?.y || 0;
      // Inverted: offset 0 = bottom (newest messages)
      const atBottom = offsetY < 40;
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        if (showScrollToBottomRef.current) {
          showScrollToBottomRef.current = false;
          setShowScrollToBottom(false);
        }
        if (newMsgCount) setNewMsgCount(0);
        return;
      }
      if (!showScrollToBottomRef.current) {
        showScrollToBottomRef.current = true;
        setShowScrollToBottom(true);
      }
    },
    [newMsgCount],
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    showScrollToBottomRef.current = false;
    setShowScrollToBottom(false);
    setNewMsgCount(0);
  }, []);

  const handleJumpToMessage = useCallback(
    (msgId, listOverride) => {
      const list = Array.isArray(listOverride) ? listOverride : messages;
      const idx = list.findIndex((m) => (m.id || m._id) === msgId);
      if (idx >= 0) {
        setHighlightMsgId(msgId);
        flatListRef.current?.scrollToIndex?.({ index: idx, animated: true });
        setTimeout(() => setHighlightMsgId(null), 1200);
        return true;
      }
      return false;
    },
    [messages],
  );

  // ── Attachment ──────────────────────────────────────────
  const handleMediaPick = async () => {
    try {
      let ImagePicker;
      try {
        ImagePicker = require("expo-image-picker");
      } catch {
        toast.error("Image picker not available");
        return;
      }

      const { requestPermission } = require("../../../utils/permissions");
      await requestPermission(
        () => ImagePicker.requestMediaLibraryPermissionsAsync(),
        "Photo Library"
      );

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      if (!assets.length) return;

      toast.success(
        assets.length > 1
          ? `Uploading ${assets.length} files...`
          : "Uploading...",
      );

      const sendFn = isGroup
        ? chatService.sendGroupMessage
        : chatService.sendMessage;

      for (const asset of assets) {
        if (!asset?.uri) continue;

        const mediaType = asset.type === "video" ? "video" : "image";
        const fileUri = asset.fileCopyUri || asset.uri;
        const fileName = asset.fileName || `${mediaType}_${Date.now()}.${mediaType === "video" ? "mp4" : "jpg"}`;
        const mimeType = asset.mimeType || (mediaType === "video" ? "video/mp4" : "image/jpeg");

        const formData = new FormData();
        formData.append("file", { uri: fileUri, name: fileName, type: mimeType });

        const uploadRes = await chatService.uploadFile(formData);
        const uploadedUrl = uploadRes.url || uploadRes.media_url || "";
        const res = await sendFn(conversationId, {
          content: "",
          media_url: uploadedUrl,
          media_type: uploadRes.file_type || mediaType,
          file_name: uploadRes.filename || fileName,
        });
        setMessages((prev) => [res.message || res, ...prev]);
      }
    } catch (err) {
      console.warn("[chat] media attach failed:", err?.message);
      toast.error(err?.message || "Failed to attach file");
    }
  };

  const handleDocPick = async () => {
    try {
      let DocumentPicker;
      try {
        DocumentPicker = require("expo-document-picker");
      } catch {
        toast.error("Document picker not available");
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fileUri = asset.fileCopyUri || asset.uri;
      const fileName = asset.name || `document_${Date.now()}`;
      const mimeType = asset.mimeType || "application/octet-stream";

      const formData = new FormData();
      formData.append("file", { uri: fileUri, name: fileName, type: mimeType });

      toast.success("Uploading...");
      const uploadRes = await chatService.uploadFile(formData);
      const uploadedUrl = uploadRes.url || uploadRes.media_url || "";

      const sendFn = isGroup
        ? chatService.sendGroupMessage
        : chatService.sendMessage;
      const res = await sendFn(conversationId, {
        content: "",
        media_url: uploadedUrl,
        media_type: "document",
        file_name: uploadRes.filename || fileName,
      });
      setMessages((prev) => [res.message || res, ...prev]);
    } catch (err) {
      console.warn("[chat] doc attach failed:", err?.message);
      toast.error(err?.message || "Failed to attach document");
    }
  };

  const handleOpenGroupInfo = useCallback(() => {
    if (!isGroup) return;
    setShowMenu(false);
    safePush(router, `/(stack)/group-info/${conversationId}`);
  }, [conversationId, isGroup, router]);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const handleAttachment = () => setShowAttachMenu(true);

  // ── Long Press — set selected message (top action bar renders) ──
  const selectMessage = useCallback(
    (message, nativeEvent) => {
      const msgSenderId =
        message.user_id ||
        message.sender_id ||
        (typeof message.sender === "string"
          ? message.sender
          : message.sender?.id || message.sender?._id) ||
        message.user?.id ||
        message.user?._id;
      const isOwnMsg = String(msgSenderId) === String(userId);
      setSelectedMessage({ ...message, _isOwn: isOwnMsg });
      const pageX = Number(
        nativeEvent?.pageX ?? nativeEvent?.locationX ?? SCREEN.width / 2,
      );
      const pageY = Number(
        nativeEvent?.pageY ?? nativeEvent?.locationY ?? SCREEN.height / 2,
      );
      const trayWidth = 276;
      const trayHeight = 52;
      const left = clamp(
        pageX - trayWidth / 2,
        12,
        SCREEN.width - trayWidth - 12,
      );
      const topAbove = clamp(
        pageY - trayHeight - 16,
        insets.top + 56,
        SCREEN.height - trayHeight - 180,
      );
      const topBelow = clamp(
        pageY + 16,
        insets.top + 56,
        SCREEN.height - trayHeight - 180,
      );
      setSelectedMessageAnchor({
        left,
        top: pageY > SCREEN.height * 0.62 ? topAbove : topBelow,
      });
    },
    [clamp, insets.top, userId],
  );

  const handleLongPress = useCallback(
    (message, nativeEvent) => {
      selectMessage(message, nativeEvent, false);
    },
    [selectMessage],
  );

  // ── Action bar helpers ──
  const selectedMsgAction = async (action) => {
    const msg = selectedMessage;
    if (!msg) return;
    const msgId = msg.id || msg._id;
    const isOwnMsg = msg._isOwn;

    switch (action) {
      case "reply": {
        const sName =
          msg.sender?.name ||
          msg.user?.name ||
          msg.sender_name ||
          (isOwnMsg ? user?.name || "You" : resolvedName || "Chat") ||
          "User";
        setReplyTo({ ...msg, sender_name: sName });
        setComposerFocusTrigger((c) => c + 1);
        break;
      }
      case "copy":
        try {
          const expClipboard = require("expo-clipboard");
          await expClipboard.setStringAsync(msg.content || msg.text || "");
        } catch {
          try {
            const Clipboard = require("react-native").Clipboard;
            if (Clipboard?.setString)
              Clipboard.setString(msg.content || msg.text || "");
          } catch {}
        }
        break;
      case "pin": {
        const isPinned = msg.pinned === true;
        try {
          if (isPinned) {
            const fn = isGroup
              ? chatService.unpinGroupMessage
              : chatService.unpinMessage;
            await fn(conversationId, msgId);
            setMessages((prev) =>
              prev.map((m) =>
                (m.id || m._id) === msgId ? { ...m, pinned: false } : m,
              ),
            );
          } else {
            const fn = isGroup
              ? chatService.pinGroupMessage
              : chatService.pinMessage;
            await fn(conversationId, msgId);
            setMessages((prev) =>
              prev.map((m) =>
                (m.id || m._id) === msgId ? { ...m, pinned: true } : m,
              ),
            );
          }
        } catch {}
        break;
      }
      case "forward":
        setForwardMsg(msg);
        setShowForwardModal(true);
        setForwardLoading(true);
        chatService
          .getUnifiedConversations()
          .then((data) => {
            const list = Array.isArray(data) ? data : data?.conversations || [];
            setForwardConversations(
              list.filter((item) => (item.id || item._id) !== conversationId),
            );
          })
          .catch(() => setForwardConversations([]))
          .finally(() => setForwardLoading(false));
        break;
      case "delete": {
        const delFn = isGroup ? chatService.deleteGroupMessage : chatService.deleteMessage;
        const msgTime = new Date(msg.created_at || msg.createdAt || 0).getTime();
        const withinOneHour = (Date.now() - msgTime) < 3600000;
        const canDeleteForEveryone = (isOwnMsg && withinOneHour) || (isGroup && isGroupAdmin);

        const buttons = [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete for Me",
            onPress: async () => {
              try {
                await delFn(conversationId, msgId, "for_me");
                setMessages((prev) => prev.filter((m) => (m.id || m._id) !== msgId));
              } catch (err) {
                toast.error(err?.message || "Failed to delete");
              }
            },
          },
        ];
        if (canDeleteForEveryone) {
          buttons.push({
            text: "Delete for Everyone",
            style: "destructive",
            onPress: async () => {
              try {
                await delFn(conversationId, msgId, "for_everyone");
                setMessages((prev) =>
                  prev.map((m) => (m.id || m._id) === msgId ? { ...m, deleted: true, content: "" } : m),
                );
                notifyChatRead();
              } catch (err) {
                toast.error(err?.message || "Failed to delete");
              }
            },
          });
        }
        Alert.alert(
          "Delete Message",
          canDeleteForEveryone
            ? "Choose how to delete this message."
            : isOwnMsg
              ? "This message is older than 1 hour and can only be deleted for you."
              : "This message can only be deleted for you.",
          buttons,
        );
        break;
      }
      default:
        // Emoji reaction — toggle: tap same emoji to remove, different to switch
        if (action.startsWith("react:")) {
          const emoji = action.replace("react:", "");
          const backendEmoji = REACTION_TO_BACKEND[emoji] || emoji;
          // Check if user already reacted with this exact emoji
          const existingReactions = Array.isArray(msg.reactions)
            ? msg.reactions
            : [];
          const myExisting = existingReactions.find(
            (r) =>
              String(r.user_id) === String(userId) &&
              (r.reaction === emoji ||
                r.emoji === emoji ||
                r.reaction === backendEmoji ||
                r.emoji === backendEmoji),
          );

          // Optimistic update — apply immediately before API call
          const snapshotReactions = existingReactions;
          setMessages((prev) =>
            prev.map((m) => {
              if ((m.id || m._id) !== msgId) return m;
              const oldReactions = Array.isArray(m.reactions)
                ? m.reactions
                : [];
              if (myExisting) {
                return {
                  ...m,
                  reactions: oldReactions.filter(
                    (r) =>
                      !(
                        String(r.user_id) === String(userId) &&
                        (r.reaction === emoji ||
                          r.emoji === emoji ||
                          r.reaction === backendEmoji ||
                          r.emoji === backendEmoji)
                      ),
                  ),
                };
              } else {
                const withoutMine = oldReactions.filter(
                  (r) => String(r.user_id) !== String(userId),
                );
                withoutMine.push({
                  reaction: emoji,
                  emoji: backendEmoji,
                  user_id: userId,
                });
                return { ...m, reactions: withoutMine };
              }
            }),
          );

          // Fire API in background — rollback on failure
          const reactFn = isGroup
            ? chatService.reactGroupMessage
            : chatService.reactToMessage;
          reactFn(conversationId, msgId, backendEmoji).catch(() => {
            setMessages((prev) =>
              prev.map((m) =>
                (m.id || m._id) === msgId
                  ? { ...m, reactions: snapshotReactions }
                  : m,
              ),
            );
          });
        }
    }
    clearSelectedMessageState();
  };

  // ── Mute / Pinned / Media / Clear / Search ─────────────
  const handleMuteToggle = async () => {
    setShowMenu(false);
    try {
      if (isGroup) {
        await chatService.toggleGroupMute(conversationId);
      } else {
        await chatService.muteConversation(conversationId);
      }
      setIsMuted((p) => !p);
    } catch {}
  };

  const handleOpenPinned = async () => {
    setShowMenu(false);
    setShowPinnedModal(true);
    try {
      const fn = isGroup
        ? chatService.getPinnedGroupMessages
        : chatService.getPinnedMessages;
      const data = await fn(conversationId);
      setPinnedMessages(Array.isArray(data) ? data : data?.messages || []);
    } catch {
      setPinnedMessages([]);
    }
  };

  const handleOpenMedia = async () => {
    setShowMenu(false);
    setShowMediaModal(true);
    setMediaLoading(true);
    try {
      const fn = isGroup ? chatService.getGroupMedia : chatService.getMedia;
      const data = await fn(conversationId);
      setMediaItems(Array.isArray(data) ? data : data?.media || []);
    } catch {
      setMediaItems([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleClearChat = () => {
    setShowMenu(false);
    Alert.alert(
      "Clear Chat",
      "This will clear all messages for you. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const fn = isGroup
                ? chatService.clearGroupChat
                : chatService.clearChat;
              await fn(conversationId);
              setMessages([]);
              toast.success("Chat cleared");
            } catch {
              toast.error("Failed to clear chat");
            }
          },
        },
      ],
    );
  };

  const searchTimerRef = useRef(null);
  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (!query || query.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const fn = isGroup
            ? chatService.searchGroupMessages
            : chatService.searchMessages;
          const data = await fn(conversationId, query);
          setSearchResults(
            Array.isArray(data) ? data : data?.results || data?.messages || [],
          );
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    [conversationId, isGroup],
  );
  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const handleForwardToConvo = useCallback(async (convo) => {
    try {
      await chatService.forwardMessage({
        source_type: isGroup ? "group" : "dm",
        source_id: conversationId,
        message_id: forwardMsg?.id || forwardMsg?._id,
        target_type:
          convo.type === "group" || convo._type === "group" ? "group" : "dm",
        target_id: convo.id || convo._id,
      });
      toast.success("Message forwarded");
    } catch {
      toast.error("Failed to forward");
    }
    setShowForwardModal(false);
    setForwardMsg(null);
  }, [isGroup, conversationId, forwardMsg]);

  const renderForwardItem = useCallback(({ item: convo }) => (
    <InlineForwardRow item={convo} onForward={handleForwardToConvo} />
  ), [handleForwardToConvo]);

  const handleSearchResultPress = useCallback((msgId) => {
    setShowSearchBar(false);
    setSearchQuery("");
    setSearchResults([]);
    handleJumpToMessage(msgId, messagesRef.current);
  }, [handleJumpToMessage]);

  const renderSearchResult = useCallback(({ item: r }) => (
    <SearchResultRow item={r} onPress={handleSearchResultPress} />
  ), [handleSearchResultPress]);

  const handleCreatePoll = async () => {
    const question = pollQuestion.trim();
    const validOptions = pollOptions.map((item) => item.trim()).filter(Boolean);
    if (!question || validOptions.length < 2) {
      toast.error("Need a question and at least 2 options");
      return;
    }
    setCreatingPoll(true);
    try {
      if (isGroup) {
        await chatService.createGroupPoll(conversationId, {
          question,
          options: validOptions,
        });
      } else {
        await chatService.createPoll(conversationId, question, validOptions);
      }
      resetPollComposer();
      await loadMessages();
      toast.success("Poll created");
    } catch {
      toast.error("Failed to create poll");
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleVotePoll = async (message, optionIndex) => {
    try {
      if (isGroup) {
        await chatService.voteGroupPoll(
          conversationId,
          message.id || message._id,
          optionIndex,
        );
      } else {
        await chatService.votePoll(
          conversationId,
          message.id || message._id,
          optionIndex,
        );
      }
      await loadMessages();
    } catch {
      toast.error("Failed to vote");
    }
  };

  // ── Stable callbacks for MessageBubble (avoids breaking React.memo) ──
  const handleImagePress = useCallback((msg) => {
    setShowImageViewer(mediaUrl(msg.media_url || msg.content || msg.text));
  }, []);

  const handleReplyPress = useCallback((msg) => {
    const sName =
      msg.sender?.name ||
      msg.user?.name ||
      msg.sender_name ||
      (String(msg.user_id || msg.sender_id) === String(userId)
        ? user?.name || "You"
        : resolvedNameRef.current || "Chat") ||
      "User";
    setReplyTo({ ...msg, sender_name: sName });
    setComposerFocusTrigger((c) => c + 1);
  }, [userId, user?.name]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleReplyQuoteTap = useCallback((replyMsgId) => {
    handleJumpToMessage(replyMsgId, messagesRef.current);
  }, [handleJumpToMessage]);

  const handlePostPress = useCallback((postId, type) => {
    if (!postId) return;
    if (type === "story") {
      // Navigate to story viewer with the story creator's user ID
      // The story-viewer groups stories by user, so we need the user ID
      const storyMsg = messagesRef.current?.find((m) => {
        const sp = m.shared_post;
        return sp && (sp.id === postId) && sp.type === "story";
      });
      const storyUserId = storyMsg?.shared_post?.user_id || resolvedOtherUserIdRef.current || otherUserIdRef.current;
      if (storyUserId) {
        safePush(router, {
          pathname: "/(stack)/feed/story-viewer",
          params: { userId: storyUserId, storyId: postId },
        });
      }
      return;
    }
    safePush(router, {
      pathname: "/(stack)/feed/[postId]",
      params: { postId },
    });
  }, [router]);

  const handleBubbleReaction = useCallback((msg, emoji) => {
    const msgId = msg.id || msg._id;
    const backendEmoji = REACTION_TO_BACKEND[emoji] || emoji;
    const existingReactions = Array.isArray(msg.reactions) ? msg.reactions : [];
    const myExisting = existingReactions.find(
      (r) =>
        String(r.user_id) === String(userId) &&
        displayReaction(r.reaction || r.emoji) === emoji,
    );
    const snapshotReactions = existingReactions;
    setMessages((prev) =>
      prev.map((m) => {
        if ((m.id || m._id) !== msgId) return m;
        const old = Array.isArray(m.reactions) ? m.reactions : [];
        if (myExisting) {
          return {
            ...m,
            reactions: old.filter(
              (r) =>
                !(
                  String(r.user_id) === String(userId) &&
                  displayReaction(r.reaction || r.emoji) === emoji
                ),
            ),
          };
        }
        const withoutMine = old.filter(
          (r) => String(r.user_id) !== String(userId),
        );
        withoutMine.push({ reaction: emoji, emoji: backendEmoji, user_id: userId });
        return { ...m, reactions: withoutMine };
      }),
    );
    const reactFn = isGroup ? chatService.reactGroupMessage : chatService.reactToMessage;
    reactFn(conversationId, msgId, backendEmoji).catch(() => {
      setMessages((prev) =>
        prev.map((m) =>
          (m.id || m._id) === msgId ? { ...m, reactions: snapshotReactions } : m,
        ),
      );
      toast.error("Failed to react");
    });
  }, [userId, isGroup, conversationId]);

  // ── Render Item ─────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }) => {
      // Support all possible sender ID field formats from backend
      const msgSenderId =
        item.user_id ||
        item.sender_id ||
        (typeof item.sender === "string"
          ? item.sender
          : item.sender?.id || item.sender?._id) ||
        item.user?.id ||
        item.user?._id ||
        item.from_id ||
        item.from;
      const isOwn = String(msgSenderId) === String(userId);

      // Inverted + newest-first: index 0 = newest (bottom), index N = oldest (top)
      // index - 1 = newer (visually below), index + 1 = older (visually above)
      const olderMsg = messagesRef.current[index + 1]; // visually above
      const newerMsg = messagesRef.current[index - 1]; // visually below
      const olderSenderId =
        olderMsg?.user_id ||
        olderMsg?.sender_id ||
        (typeof olderMsg?.sender === "string"
          ? olderMsg.sender
          : olderMsg?.sender?.id || olderMsg?.sender?._id) ||
        olderMsg?.user?.id ||
        olderMsg?.user?._id;
      const newerSenderId =
        newerMsg?.user_id ||
        newerMsg?.sender_id ||
        (typeof newerMsg?.sender === "string"
          ? newerMsg.sender
          : newerMsg?.sender?.id || newerMsg?.sender?._id) ||
        newerMsg?.user?.id ||
        newerMsg?.user?._id;

      // Show avatar when this is the last message from this sender before a different sender (visually above = older)
      const showAvatar =
        !isOwn &&
        (!olderMsg ||
          String(olderSenderId) !== String(msgSenderId) ||
          !isSameDay(
            item.created_at || item.createdAt,
            olderMsg?.created_at || olderMsg?.createdAt,
          ));

      // Grouped = same sender as the newer message below for tighter spacing
      const isGrouped =
        newerMsg &&
        String(newerSenderId) === String(msgSenderId) &&
        isSameDay(
          item.created_at || item.createdAt,
          newerMsg?.created_at || newerMsg?.createdAt,
        );

      // Date separator: show when date differs from older message above
      const currentDate = item.created_at || item.createdAt;
      const olderDate = olderMsg?.created_at || olderMsg?.createdAt;
      const showDateSep = !olderMsg || !isSameDay(currentDate, olderDate);

      const bubble = (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          showAvatar={showAvatar}
          isGrouped={!!isGrouped}
          highlight={highlightMsgId === (item.id || item._id) || (selectedMessage && (selectedMessage.id || selectedMessage._id) === (item.id || item._id))}
          onLongPress={handleLongPress}
          onImagePress={handleImagePress}
          onReply={handleReplyPress}
          onReplyQuoteTap={handleReplyQuoteTap}
          onPostPress={handlePostPress}
          onVotePoll={handleVotePoll}
          onReaction={handleBubbleReaction}
          currentUserId={userId}
        />
      );

      return (
        <View>
          {showDateSep ? (
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>
                {formatDateSeparator(currentDate)}
              </Text>
              <View style={styles.dateLine} />
            </View>
          ) : null}
          {bubble}
        </View>
      );
    },
    [userId, resolvedName, handleJumpToMessage, handleLongPress, handleImagePress, handleReplyPress, handleReplyQuoteTap, handlePostPress, handleVotePoll, handleBubbleReaction, highlightMsgId, selectedMessage],
  );

  // ── Header ──────────────────────────────────────────────
  const decodedName = resolvedName || "Chat";
  const decodedAvatar = resolvedAvatar || "";
  const nameInitials = decodedName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* ── Header / Action Bar ─────────────────────────── */}
      {selectedMessage ? (
        /* WhatsApp-style top action bar when message is selected */
        <View style={styles.actionBar}>
          <Pressable onPress={clearSelectedMessageState} style={styles.backBtn}>
            <ArrowLeft size={22} color="#374151" />
          </Pressable>

          <View style={styles.flex1} />

          {/* Main actions: Reply, Forward, Delete */}
          <View style={styles.actionBarIcons}>
            <Pressable
              onPress={() => selectedMsgAction("reply")}
              style={styles.actionBarBtn}
            >
              <CornerUpLeft size={20} color="#374151" />
            </Pressable>
            <Pressable
              onPress={() => selectedMsgAction("forward")}
              style={styles.actionBarBtn}
            >
              <Forward size={20} color="#374151" />
            </Pressable>
            <Pressable
              onPress={() => selectedMsgAction("delete")}
              style={styles.actionBarBtn}
            >
              <Trash2 size={20} color="#EF4444" />
            </Pressable>
            {/* 3-dot menu for more options */}
            <Pressable
              style={styles.actionBarBtn}
              onPress={() => setShowSelectedMoreMenu((prev) => !prev)}
            >
              <MoreVertical size={20} color="#374151" />
            </Pressable>
          </View>
        </View>
      ) : (
        /* Normal header */
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#374151" />
          </Pressable>

          <Pressable
            style={styles.headerProfile}
            onPress={() => {
              if (isGroup) {
                handleOpenGroupInfo();
                return;
              }
              const targetId = resolvedOtherUserId || otherUserId;
              if (targetId) safePush(router, `/(stack)/player/${targetId}`);
            }}
          >
            {decodedAvatar ? (
              <Image
                source={{ uri: mediaUrl(decodedAvatar) }}
                style={styles.headerAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarText}>{nameInitials}</Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text numberOfLines={1} style={styles.headerName}>
                {decodedName}
              </Text>
              <Text
                style={[
                  styles.headerStatus,
                  !isGroup && onlineStatus?.online && { color: "#22C55E" },
                ]}
              >
                {typing
                  ? `${typingUser || "Someone"} is typing...`
                  : isGroup
                    ? "Group"
                    : onlineStatus?.online
                      ? "online"
                      : onlineStatus?.last_seen
                        ? `last seen ${timeAgo(onlineStatus.last_seen)}`
                        : ""}
              </Text>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            {isGroup &&
            isGroupAdmin &&
            groupInfo?.is_private &&
            joinRequestCount > 0 ? (
              <Pressable
                style={styles.joinRequestBadgeBtn}
                onPress={() => setShowJoinRequestsModal(true)}
              >
                <UserPlus size={14} color="#D97706" />
                <Text style={styles.joinRequestBadgeText}>
                  {joinRequestCount}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.headerActionBtn}
              onPress={() => {
                setShowSearchBar((p) => !p);
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Search size={18} color="#6B7280" />
            </Pressable>
            <Pressable
              style={styles.headerActionBtn}
              onPress={() => setShowMenu(true)}
            >
              <MoreVertical size={18} color="#6B7280" />
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Search Bar ─────────────────────────────────────── */}
      {showSearchBar && (
        <View style={styles.searchBar}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search messages..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            autoFocus
          />
          {searchLoading && (
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          )}
          <Pressable
            onPress={() => {
              setShowSearchBar(false);
              setSearchQuery("");
              setSearchResults([]);
            }}
          >
            <X size={18} color="#6B7280" />
          </Pressable>
        </View>
      )}
      {showSearchBar && searchResults.length > 0 ? (
        <View style={styles.searchResultsDropdown}>
          <FlatList
            data={searchResults}
            keyExtractor={(item, idx) =>
              String(item.id || item._id || `sr-${idx}`)
            }
            keyboardShouldPersistTaps="handled"
            renderItem={renderSearchResult}
          />
        </View>
      ) : null}

      {/* ── Messages ────────────────────────────────────── */}
      <KCKeyboardAvoidingView
        style={styles.chatArea}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        onLayout={handleChatAreaLayout}
      >
        {loading ? (
          <ChatThreadSkeleton />
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIconWrap}>
              <MessageCircle size={32} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.emptyChatTitle}>No messages yet</Text>
            <Text style={styles.emptyChatSubtitle}>
              Send a message to start the conversation
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) =>
              String(item.id || item._id || `msg-${index}`)
            }
            renderItem={renderItem}
            inverted
            maxToRenderPerBatch={15}
            windowSize={11}
            initialNumToRender={20}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex?.({
                  index: info.index,
                  animated: true,
                });
              }, 200);
            }}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={PRIMARY_COLOR}
                  style={styles.loadingMoreIndicator}
                />
              ) : null
            }
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          />
        )}

        {/* Typing Indicator */}
        {typing ? (
          <View style={styles.typingBar}>
            <View style={styles.typingBubble}>
              <TypingDots />
            </View>
            <Text style={styles.typingText}>
              {typingUser || "Someone"} is typing
            </Text>
          </View>
        ) : null}

        {/* ── Input ──────────────────────────────────────── */}
        <EncryptionBadge />
        {isIncomingRequest ? (
          <View style={styles.requestBanner}>
            <View style={styles.requestBannerTextWrap}>
              <Text style={styles.requestBannerTitle}>Message request</Text>
              <Text style={styles.requestBannerSubtext}>
                Accept this request to start chatting.
              </Text>
            </View>
            <View style={styles.requestBannerActions}>
              <Pressable
                style={styles.requestGhostBtn}
                onPress={async () => {
                  try {
                    await chatService.declineRequest(conversationId);
                    setConversationMeta((prev) =>
                      prev ? { ...prev, status: "declined" } : prev,
                    );
                    toast.success("Request declined");
                  } catch {
                    toast.error("Failed to decline request");
                  }
                }}
              >
                <Text style={styles.requestGhostText}>Decline</Text>
              </Pressable>
              <Pressable
                style={styles.requestPrimaryBtn}
                onPress={async () => {
                  try {
                    await chatService.acceptRequest(conversationId);
                    setConversationMeta((prev) =>
                      prev ? { ...prev, status: "active" } : prev,
                    );
                    toast.success("Request accepted");
                  } catch {
                    toast.error("Failed to accept request");
                  }
                }}
              >
                <Text style={styles.requestPrimaryText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        ) : isOutgoingRequest ? (
          <View style={styles.requestInfoBanner}>
            <Text style={styles.requestInfoText}>
              Request sent. You can chat once the other user accepts.
            </Text>
          </View>
        ) : isDeclinedRequest ? (
          <View style={styles.requestInfoBanner}>
            <Text style={styles.requestInfoText}>
              This message request was declined.
            </Text>
          </View>
        ) : null}
        <ChatKeyboardComposer
          onSend={handleSend}
          onAttachment={handleAttachment}
          disabled={isIncomingRequest || isOutgoingRequest || isDeclinedRequest}
          mentionSuggestions={mentionSuggestions}
          focusTrigger={composerFocusTrigger}
          onTyping={emitTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
        {showScrollToBottom ? (
          <Pressable style={styles.scrollToBottomBtn} onPress={scrollToBottom}>
            <Text style={styles.scrollToBottomText}>{"\u2193"}</Text>
            {newMsgCount > 0 ? (
              <View style={styles.scrollToBottomBadge}>
                <Text style={styles.scrollToBottomBadgeText}>
                  {newMsgCount > 99 ? "99+" : newMsgCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </KCKeyboardAvoidingView>

      {/* ── Attachment Menu (WhatsApp-style) ─────────────── */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachMenu(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.attachOverlay}
          onPress={() => setShowAttachMenu(false)}
        >
          <View
            style={[
              styles.attachSheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.attachGrid}>
              {[
                {
                  icon: ImageIcon,
                  label: "Photos & Videos",
                  color: "#7C3AED",
                  onPress: () => {
                    setShowAttachMenu(false);
                    handleMediaPick();
                  },
                },
                // { icon: Camera, label: "Camera", color: "#EC4899", onPress: () => { setShowAttachMenu(false); handleMediaPick(); } },
                {
                  icon: FileText,
                  label: "Document",
                  color: "#3B82F6",
                  onPress: () => {
                    setShowAttachMenu(false);
                    handleDocPick();
                  },
                },
                ...(isGroup
                  ? [
                      {
                        icon: BarChart3,
                        label: "Poll",
                        color: PRIMARY_COLOR,
                        onPress: () => {
                          setShowAttachMenu(false);
                          setShowPollComposer(true);
                        },
                      },
                    ]
                  : []),
              ].map((item, i) => (
                <Pressable
                  key={i}
                  style={styles.attachItem}
                  onPress={item.onPress}
                >
                  <View
                    style={[
                      styles.attachIconCircle,
                      { backgroundColor: item.color },
                    ]}
                  >
                    <item.icon size={22} color="#FFFFFF" />
                  </View>
                  <Text style={styles.attachLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Image Viewer Modal ───────────────────────────── */}
      {showImageViewer && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageViewer(null)}
          statusBarTranslucent
        >
          <Pressable
            style={styles.imageViewerBg}
            onPress={() => setShowImageViewer(null)}
          >
            <Image
              source={{ uri: mediaUrl(showImageViewer) }}
              style={styles.imageViewerImg}
              contentFit="contain"
            />
          </Pressable>
        </Modal>
      )}

      {/* ── Header 3-dot dropdown ────────────────────────── */}
      {showMenu ? (
        <>
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setShowMenu(false)}
          />
          <View style={[styles.dropdownMenu, { top: insets.top + 48, right: 8 }]}>
            {!isGroup ? (
              <>
                <Pressable style={styles.dropdownItem} onPress={handleMuteToggle}>
                  <BellOff size={15} color={isMuted ? "#F59E0B" : "#374151"} />
                  <Text style={styles.dropdownText}>
                    {isMuted ? "Unmute" : "Mute"}
                  </Text>
                </Pressable>
                <Pressable style={styles.dropdownItem} onPress={handleOpenPinned}>
                  <Pin size={15} color="#374151" />
                  <Text style={styles.dropdownText}>Pinned messages</Text>
                </Pressable>
                <Pressable style={styles.dropdownItem} onPress={handleOpenMedia}>
                  <ImageIcon size={15} color="#374151" />
                  <Text style={styles.dropdownText}>Shared media</Text>
                </Pressable>
                <Pressable style={styles.dropdownItem} onPress={handleClearChat}>
                  <Trash2 size={15} color="#EF4444" />
                  <Text style={[styles.dropdownText, { color: "#EF4444" }]}>
                    Clear chat
                  </Text>
                </Pressable>
              </>
            ) : null}
            {isGroup ? (
              <>
                <Pressable style={styles.dropdownItem} onPress={handleOpenPinned}>
                  <Pin size={15} color="#374151" />
                  <Text style={styles.dropdownText}>Pinned messages</Text>
                </Pressable>
                <Pressable style={styles.dropdownItem} onPress={handleOpenMedia}>
                  <ImageIcon size={15} color="#374151" />
                  <Text style={styles.dropdownText}>Shared media</Text>
                </Pressable>
                {isGroupAdmin ? (
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowMenu(false);
                      setTimeout(() => setShowEditGroupModal(true), 300);
                    }}
                  >
                    <Settings size={15} color="#374151" />
                    <Text style={styles.dropdownText}>Group settings</Text>
                  </Pressable>
                ) : null}
                {isGroupAdmin && groupInfo?.is_private ? (
                  <Pressable
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowMenu(false);
                      setShowJoinRequestsModal(true);
                    }}
                  >
                    <UserPlus size={15} color="#374151" />
                    <Text style={styles.dropdownText}>Join Requests</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.dropdownItem} onPress={handleOpenGroupInfo}>
                  <Users size={15} color="#374151" />
                  <Text style={styles.dropdownText}>Members</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      {selectedMessage ? (
        <View pointerEvents="box-none" style={styles.selectedReactionLayer}>
          <View
            style={[
              styles.selectedReactionTray,
              {
                left: selectedMessageAnchor?.left ?? 12,
                top: selectedMessageAnchor?.top ?? insets.top + 64,
              },
            ]}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.selectedReactionBtn}
                onPress={() => selectedMsgAction(`react:${emoji}`)}
              >
                <Text style={styles.selectedReactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {selectedMessage && showSelectedMoreMenu ? (
        <>
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={closeSelectedMenu}
          />
          <View style={[styles.dropdownMenu, { top: insets.top + 48, right: 8 }]}>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => selectedMsgAction("reply")}
            >
              <CornerUpLeft size={15} color="#374151" />
              <Text style={styles.dropdownText}>Reply</Text>
            </Pressable>
            {selectedMessage?.content ? (
              <Pressable
                style={styles.dropdownItem}
                onPress={() => selectedMsgAction("copy")}
              >
                <Copy size={15} color="#374151" />
                <Text style={styles.dropdownText}>Copy</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.dropdownItem}
              onPress={() => selectedMsgAction("forward")}
            >
              <Forward size={15} color="#374151" />
              <Text style={styles.dropdownText}>Forward</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => selectedMsgAction("pin")}
            >
              {selectedMessage?.pinned ? (
                <PinOff size={15} color="#374151" />
              ) : (
                <Pin size={15} color="#374151" />
              )}
              <Text style={styles.dropdownText}>
                {selectedMessage?.pinned ? "Unpin" : "Pin"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <Modal
        visible={showPollComposer}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={resetPollComposer}
      >
        <View style={styles.sheetOverlay}>
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create Poll</Text>
              <Pressable onPress={resetPollComposer}>
                <X size={22} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <TextInput
                value={pollQuestion}
                onChangeText={setPollQuestion}
                placeholder="Ask something..."
                placeholderTextColor="#94A3B8"
                style={styles.pollQuestionInput}
              />
              {pollOptions.map((option, index) => (
                <TextInput
                  key={`poll-option-${index}`}
                  value={option}
                  onChangeText={(text) =>
                    setPollOptions((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? text : item,
                      ),
                    )
                  }
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#94A3B8"
                  style={styles.pollOptionInput}
                />
              ))}
              {pollOptions.length < 5 ? (
                <Pressable
                  style={styles.pollAddOptionBtn}
                  onPress={() => setPollOptions((prev) => [...prev, ""])}
                >
                  <Text style={styles.pollAddOptionText}>Add option</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.requestPrimaryBtn,
                  styles.pollCreateBtn,
                  creatingPoll && styles.pollCreateBtnDisabled,
                ]}
                disabled={creatingPoll}
                onPress={handleCreatePoll}
              >
                <Text style={styles.requestPrimaryText}>
                  {creatingPoll ? "Creating..." : "Create Poll"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <InviteLinkModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        groupId={conversationId}
      />

      <JoinRequestsModal
        visible={showJoinRequestsModal}
        onClose={() => {
          setShowJoinRequestsModal(false);
          // Refresh count after closing
          if (isGroupAdmin && groupInfo?.is_private) {
            chatService
              .getJoinRequests(conversationId)
              .then((data) => {
                const list = Array.isArray(data)
                  ? data
                  : data?.requests || data?.data || [];
                setJoinRequestCount(list.length);
              })
              .catch(() => {});
          }
        }}
        groupId={conversationId}
      />

      {groupInfo ? (
        <EditGroupModal
          visible={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          group={groupInfo}
          onUpdate={(updated) => {
            setGroupInfo((prev) => ({ ...prev, ...updated }));
          }}
        />
      ) : null}

      {/* ── Pinned Messages Modal (matches web) ────────────── */}
      <Modal
        visible={showPinnedModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowPinnedModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.pinnedHeaderLeft}>
                <Pin size={16} color={PRIMARY_COLOR} />
                <Text style={styles.sheetTitle}>Pinned Messages</Text>
              </View>
              <Pressable onPress={() => setShowPinnedModal(false)}>
                <X size={22} color="#64748B" />
              </Pressable>
            </View>

            {pinnedMessages.length > 0 ? (
              <View style={styles.pinnedSearchWrap}>
                <Search size={14} color="#9CA3AF" />
                <TextInput
                  value={pinnedSearchQuery}
                  onChangeText={setPinnedSearchQuery}
                  placeholder="Search messages..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.pinnedSearchInput}
                />
                {pinnedSearchQuery ? (
                  <Pressable onPress={() => setPinnedSearchQuery("")}>
                    <X size={14} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <ScrollView contentContainerStyle={styles.sheetBody}>
              {pinnedMessages.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Pin size={32} color="#CBD5E1" />
                  <Text style={styles.sheetEmptyText}>No pinned messages</Text>
                </View>
              ) : filteredPinnedMessages.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyText}>No results</Text>
                </View>
              ) : (
                filteredPinnedMessages.map((msg) => (
                  <Pressable
                    key={msg.id || msg._id}
                    style={styles.pinnedItem}
                    onPress={() => {
                      setShowPinnedModal(false);
                      setPinnedSearchQuery("");
                      handleJumpToMessage(msg.id || msg._id, messages);
                    }}
                  >
                    <View style={styles.pinnedItemHeader}>
                      <Text style={styles.pinnedSender} numberOfLines={1}>
                        {msg.sender_name ||
                          msg.sender?.name ||
                          msg.user?.name ||
                          "User"}
                      </Text>
                      <Text style={styles.pinnedTime}>
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )
                          : ""}
                      </Text>
                    </View>
                    <Text style={styles.pinnedContent} numberOfLines={3}>
                      {msg.content ||
                        msg.text ||
                        (msg.media_url ? "Media" : "\u2026")}
                    </Text>
                    {msg.media_url &&
                    (!msg.media_type || msg.media_type === "image") ? (
                      <Image
                        source={{ uri: mediaUrl(msg.media_url) }}
                        style={styles.pinnedMediaThumb}
                        contentFit="cover"
                      />
                    ) : null}
                    <Pressable
                      style={styles.pinnedUnpinBtn}
                      onPress={() => {
                        const msgId = msg.id || msg._id;
                        const fn = isGroup
                          ? chatService.unpinGroupMessage
                          : chatService.unpinMessage;
                        fn(conversationId, msgId)
                          .then(() => {
                            setPinnedMessages((prev) =>
                              prev.filter((m) => (m.id || m._id) !== msgId),
                            );
                            setMessages((prev) =>
                              prev.map((m) =>
                                (m.id || m._id) === msgId
                                  ? { ...m, pinned: false }
                                  : m,
                              ),
                            );
                            toast.success("Unpinned");
                          })
                          .catch(() => toast.error("Failed to unpin"));
                      }}
                    >
                      <PinOff size={12} color="#EF4444" />
                      <Text style={styles.pinnedUnpinText}>Unpin</Text>
                    </Pressable>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Shared Media Modal ────────────────────────────── */}
      <Modal
        visible={showMediaModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Shared Media</Text>
              <Pressable onPress={() => setShowMediaModal(false)}>
                <X size={22} color="#64748B" />
              </Pressable>
            </View>
            {mediaLoading ? (
              <ChatMediaGridSkeleton />
            ) : mediaItems.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <ImageIcon size={32} color="#CBD5E1" />
                <Text style={styles.sheetEmptyText}>No shared media</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.mediaGrid}>
                {mediaItems.map((item, idx) => {
                  const uri = item.media_url || item.url || item.uri || "";
                  return (
                    <Pressable
                      key={item.id || item._id || idx}
                      onPress={() => {
                        setShowMediaModal(false);
                        setShowImageViewer(mediaUrl(uri));
                      }}
                    >
                      <Image
                        source={{ uri: mediaUrl(uri) }}
                        style={styles.mediaThumb}
                        contentFit="cover"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Forward Message Modal ─────────────────────────── */}
      <Modal
        visible={showForwardModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setShowForwardModal(false);
          setForwardMsg(null);
        }}
      >
        <View style={styles.sheetOverlay}>
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Forward To</Text>
              <Pressable
                onPress={() => {
                  setShowForwardModal(false);
                  setForwardMsg(null);
                }}
              >
                <X size={22} color="#64748B" />
              </Pressable>
            </View>
            {forwardLoading ? (
              <View style={styles.sheetEmpty}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              </View>
            ) : forwardConversations.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyText}>No conversations</Text>
              </View>
            ) : (
              <FlatList
                data={forwardConversations}
                keyExtractor={(item) => String(item.id || item._id)}
                renderItem={renderForwardItem}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Attachment menu
  attachOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  attachSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: "continuous",
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  attachGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "flex-start",
  },
  attachItem: {
    alignItems: "center",
    width: 70,
    gap: 8,
  },
  attachIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  attachLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },

  // Action bar (WhatsApp-style when message selected)
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#ECFDF5",
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
    gap: 4,
  },
  selectedCountPill: {
    height: 28,
    minWidth: 28,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 8,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  reactionScroll: { flexShrink: 1 },
  reactionScrollContent: { gap: 2 },
  reactionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionBtnText: { fontSize: 18 },
  actionBarIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#E5E7EB",
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerStatus: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  joinRequestBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  joinRequestBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
    fontVariant: ["tabular-nums"],
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },

  // Chat area
  flex1: {
    flex: 1,
  },
  loadingMoreIndicator: {
    marginVertical: 16,
  },
  chatArea: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 8,
  },
  chatComposer: {
    backgroundColor: "#FFFFFF",
  },
  inputSection: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    zIndex: 2,
  },
  inputMover: {
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Date separator — WhatsApp-style centered pill
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  dateLine: {
    width: 0,
    height: 0,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    backgroundColor: "#E8ECF1",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderCurve: "continuous",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
  },

  // Empty chat — rendered outside the inverted FlatList
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyChatIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderCurve: "continuous",
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyChatTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
  },
  emptyChatSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },

  // Typing indicator
  typingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingBubble: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    borderCurve: "continuous",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: "#64748B",
  },

  // Image viewer
  imageViewerBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerImg: {
    width: "90%",
    height: "70%",
  },

  // Menu popup
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  selectedMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  selectedReactionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedReactionTray: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderCurve: "continuous",
    paddingHorizontal: 8,
    paddingVertical: 7,
    maxWidth: SCREEN.width - 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  selectedReactionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedReactionEmoji: {
    fontSize: 19,
  },
  menuPopup: {
    position: "absolute",
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 4,
    minWidth: 180,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  selectedMenuPopup: {
    position: "absolute",
    backgroundColor: "#111B21",
    borderRadius: 14,
    borderCurve: "continuous",
    paddingVertical: 6,
    minWidth: 176,
    elevation: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  selectedMenuPreview: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  selectedMenuPreviewText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },
  selectedMenuEmoji: {
    fontSize: 17,
    width: 18,
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F9FAFB",
  },
  menuItemTextDark: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  dropdownMenu: {
    position: "absolute",
    zIndex: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 6,
    minWidth: 180,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111B21",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#F9FAFB",
    paddingVertical: 6,
  },
  searchResultsDropdown: {
    maxHeight: "40%",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  searchResultTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  searchResultSender: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    flex: 1,
  },
  searchResultTime: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  searchResultContent: {
    fontSize: 13,
    color: "#64748B",
  },
  scrollToBottomBtn: {
    position: "absolute",
    right: 14,
    bottom: 90,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scrollToBottomText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
  scrollToBottomBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  scrollToBottomBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  // Sheet modals (pinned / media)
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    maxHeight: "70%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  sheetBody: {
    padding: 16,
    gap: 12,
  },
  sheetEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  sheetEmptyText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  messageInfoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageInfoLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#94A3B8",
  },
  messageInfoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  messageInfoBtn: {
    marginTop: 4,
  },
  requestBanner: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#DCFCE7",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  requestBannerTextWrap: {
    gap: 4,
  },
  requestBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  requestBannerSubtext: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  requestBannerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  requestGhostBtn: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
  },
  requestGhostText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  requestPrimaryBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  requestPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  requestInfoBanner: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  requestInfoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
  },
  pollQuestionInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  pollOptionInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  pollAddOptionBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "#ECFDF5",
  },
  pollAddOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  pollCreateBtn: {
    marginTop: 8,
  },
  pollCreateBtnDisabled: {
    opacity: 0.6,
  },
  seenByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  seenByTextWrap: {
    flex: 1,
    gap: 2,
  },
  seenByName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  seenByTime: {
    fontSize: 12,
    color: "#64748B",
  },

  // Pinned items (matches web design)
  pinnedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinnedSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 40,
  },
  pinnedSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  pinnedItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pinnedItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pinnedSender: {
    fontSize: 12,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    flex: 1,
  },
  pinnedTime: {
    fontSize: 10,
    color: "#94A3B8",
    flexShrink: 0,
  },
  pinnedContent: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  pinnedMediaThumb: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },
  pinnedUnpinBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#FEF2F2",
    marginTop: 4,
  },
  pinnedUnpinText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },

  // Media grid
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 4,
  },
  mediaThumb: {
    width: 108,
    height: 108,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#E2E8F0",
  },

  // Forward modal
  forwardItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  forwardItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
});
