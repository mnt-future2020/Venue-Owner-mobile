import React, { useCallback, useContext, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Search,
  X,
  Plus,
  Users,
  UsersRound,
  CheckCircle,
  XCircle,
  Inbox,
  ChevronRight,
  CheckCheck,
  MessageCircle,
  Flame,
  UserPlus,
  Mic,
  ImageIcon,
  Clock,
  Ban,
  ShieldCheck,
  Loader2,
} from "lucide-react-native";
import chatService from "../../services/chatService";
import socialService from "../../services/socialService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { useLocation } from "../../context/LocationContext";
import SwipeTabContext from "../../context/SwipeTabContext";
import TabRefreshContext from "../../context/TabRefreshContext";
import { safePush } from "../../services/navigationGuard";
import SportPicker from "../shared/SportPicker";
import SportDropdownButton from "../shared/SportDropdownButton";
import ChatSkeleton from "../skeletons/ChatSkeleton";

import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

// ── Unified Conversation Row ────────────────────────────────
const ConversationRow = React.memo(function ConversationRow({ item, onPress, onLongPress, currentUserName, joinRequestCount, isTyping }) {
  const isGroup = item._type === "group";
  const title = isGroup
    ? item.name || "Group"
    : item.other_user?.name || item.name || "Chat";
  const avatar = isGroup
    ? item.avatar_url || item.display_avatar || item.avatar || ""
    : item.other_user?.avatar || item.avatar || "";
  // API returns last_message as a string (decrypted text preview)
  const lm = item.last_message;
  const isLastMsgDeleted = item.last_message_deleted || (typeof lm === "object" && lm?.deleted);
  let lastMsgContent = isLastMsgDeleted
    ? "\uD83D\uDEAB This message was deleted"
    : typeof lm === "string"
      ? lm
      : typeof lm === "object" && lm
        ? (lm.content || lm.text || lm.message || "")
        : "";

  // Detect media-type last messages (matches web ConversationList pattern)
  const isMediaMsg = lastMsgContent === "[media]" || lastMsgContent === "[image]" || lastMsgContent === "[voice]";
  const isVoiceMsg = lastMsgContent === "[voice]";
  // Detect raw S3/uploaded file names shown as preview
  if (/^(original-|[a-f0-9]{8,}[-_])/.test(lastMsgContent)) {
    lastMsgContent = "\uD83D\uDCF7 Photo";
  }

  const preview = isTyping
    ? "typing..."
    : (lastMsgContent || "");
  const unread = item.unread_count || 0;
  const lastMsgTime = item.last_message_at || item.last_activity
    || item.updated_at || item.updatedAt || item.created_at || "";
  const time = timeAgo(lastMsgTime);
  const isOnline = !isGroup && (item.other_user?.is_online || item.is_online);
  const memberCount = item.member_count || item.members_count;
  const initials = isGroup
    ? (item.name || "G").split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : (title.charAt(0) || "?").toUpperCase();

  // Streak for DMs (matches web ConversationList)
  const streak = !isGroup ? (item.other_user?.current_streak ?? 0) : 0;

  // Join request count for groups (admin only)
  const groupJoinReqs = isGroup && item.is_admin ? (joinRequestCount || 0) : 0;

  // Check if last message was sent by current user (backend returns last_message_by as a name string)
  const isOwnLastMsg = !!(item.last_message_by && currentUserName && item.last_message_by === currentUserName);

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress && onLongPress(item)}
      delayLongPress={500}
      style={[styles.convoRow, unread > 0 && styles.convoRowUnread]}
         >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image
            source={{ uri: mediaUrl(avatar) }}
            style={[styles.avatar, isGroup && styles.avatarGroupImg]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatarFallback, isGroup && styles.avatarGroup]}>
            {isGroup ? (
              <Users size={20} color={PRIMARY_COLOR} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
        )}
        {/* Online dot (DMs only) */}
        {!!isOnline && <View style={styles.onlineDot} />}
        {/* Group icon badge */}
        {isGroup && (
          <View style={styles.groupDotBadge}>
            <Users size={8} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.convoBody}>
        {/* Top: name + group badge + time */}
        <View style={styles.convoTopRow}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={[styles.convoName, unread > 0 && styles.convoNameBold]}>
              {title}
            </Text>
            {isGroup ? (
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>GROUP</Text>
              </View>
            ) : null}
            {streak > 0 ? (
              <View style={styles.streakBadge}>
                <Flame size={10} color="#F97316" fill="rgba(249,115,22,0.3)" />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            ) : null}
          </View>
          {groupJoinReqs > 0 ? (
            <View style={styles.joinReqBadge}>
              <UserPlus size={10} color="#FFFFFF" />
              <Text style={styles.joinReqBadgeText}>{groupJoinReqs}</Text>
            </View>
          ) : null}
          <Text style={[styles.convoTime, unread > 0 && styles.convoTimeUnread]}>
            {time}
          </Text>
        </View>

        {/* Bottom: preview + read status + member count + unread badge */}
        <View style={styles.convoBottomRow}>
          <View style={styles.previewRow}>
            {/* Read receipts for own messages */}
            {!isGroup && isOwnLastMsg ? (
              <CheckCheck size={14} color={item.last_message_read ? "#53BDEB" : "#B0B8C1"} strokeWidth={item.last_message_read ? 2.5 : 2} style={styles.flexShrink0} />
            ) : null}
            {isMediaMsg && !item.typing ? (
              <View style={styles.mediaPreviewRow}>
                {isVoiceMsg ? (
                  <Mic size={13} color="#9CA3AF" />
                ) : (
                  <ImageIcon size={13} color="#9CA3AF" />
                )}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.convoPreview,
                    unread > 0 && styles.convoPreviewBold,
                  ]}
                >
                  {isVoiceMsg ? "Voice message" : "Photo"}
                </Text>
              </View>
            ) : (
              <Text
                numberOfLines={1}
                style={[
                  styles.convoPreview,
                  isTyping && styles.convoPreviewTyping,
                  unread > 0 && styles.convoPreviewBold,
                ]}
              >
                {isGroup && memberCount ? `${memberCount} members  \u00B7  ${preview}` : preview}
              </Text>
            )}
          </View>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

// ── Request Banner ──────────────────────────────────────────
function RequestBanner({ count, onPress }) {
  if (!count) return null;
  return (
    <Pressable style={styles.requestBanner} onPress={onPress}>
      <View style={styles.requestBannerIcon}>
        <Inbox size={20} color={PRIMARY_COLOR} />
        <View style={styles.requestBannerBadge}>
          <Text style={styles.requestBannerBadgeText}>{count}</Text>
        </View>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.requestBannerTitle}>Message Requests</Text>
        <Text style={styles.requestBannerSub}>{count} pending — tap to review</Text>
      </View>
      <View style={styles.requestBannerArrow}>
        <ChevronRight size={16} color={PRIMARY_COLOR} />
      </View>
    </Pressable>
  );
}

// ── Request Row ─────────────────────────────────────────────
// Exact mirror of frontend MessageRequestsModal row (MessageRequestsModal.js:170-249):
//   - tap avatar / name → open player profile
//   - amber pending clock badge bottom-right on the avatar
//   - subtitle: last_message OR "Wants to message you"
//   - Accept: full pill with ShieldCheck + "Accept" text
//   - Decline: circular icon-only Ban button (no label)
//   - per-row processing state disables both buttons + shows spinner on Accept
const RequestRow = React.memo(function RequestRow({ item, processing, onAccept, onDecline, onOpenProfile }) {
  const otherUser = item.other_user || {};
  const name = otherUser.name || item.name || "Unknown";
  const avatar = otherUser.avatar || "";
  const userId = otherUser.id || otherUser._id;
  const preview = item.last_message?.content || item.last_message || "Wants to message you";

  return (
    <View style={styles.requestRow}>
      {/* Avatar tap → profile */}
      <Pressable onPress={() => userId && onOpenProfile?.(userId)} style={styles.requestAvatarWrap}>
        {avatar ? (
          <Image source={{ uri: mediaUrl(avatar) }} style={styles.requestAvatar} contentFit="cover" />
        ) : (
          <View style={styles.requestAvatarFallback}>
            <UserPlus size={20} color="#94A3B8" />
          </View>
        )}
        {/* Amber pending clock badge — matches MessageRequestsModal.js:205-207 */}
        <View style={styles.requestPendingBadge}>
          <Clock size={9} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Pressable>

      {/* Name + last-message preview */}
      <Pressable onPress={() => userId && onOpenProfile?.(userId)} style={styles.requestInfo}>
        <Text style={styles.requestName} numberOfLines={1}>{name}</Text>
        <Text style={styles.requestPreview} numberOfLines={1}>
          {typeof preview === "string" ? preview : "Wants to message you"}
        </Text>
      </Pressable>

      {/* Accept = pill, Decline = icon-only circle (mirrors frontend exactly) */}
      <View style={styles.requestActions}>
        <Pressable
          onPress={() => onAccept(item)}
          disabled={!!processing}
          style={[styles.acceptBtn, processing && styles.actionDisabled]}
        >
          {processing ? (
            <Loader2 size={14} color="#FFFFFF" />
          ) : (
            <>
              <ShieldCheck size={14} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={() => onDecline(item)}
          disabled={!!processing}
          style={[styles.declineIconBtn, processing && styles.actionDisabled]}
        >
          <Ban size={14} color="#94A3B8" />
        </Pressable>
      </View>
    </View>
  );
});

const DiscoverGroupCard = React.memo(function DiscoverGroupCard({ item, onOpen, onJoin, joiningGroupId }) {
  const id = item.id || item._id;
  const handleOpen = useCallback(() => onOpen({ ...item, _type: "group" }), [onOpen, item]);
  const handleJoin = useCallback(() => onJoin(item), [onJoin, item]);
  const isJoining = joiningGroupId === id;
  const coverUrl = item.cover_url || item.avatar_url || item.display_avatar || item.avatar;
  const memberCount = item.member_count || item.members?.length || 0;

  return (
    <View style={styles.discoverCard}>
      {/* Cover / Avatar area */}
      <View style={styles.discoverCover}>
        {coverUrl ? (
          <Image source={{ uri: mediaUrl(coverUrl) }} style={styles.discoverCoverImg} contentFit="cover" />
        ) : (
          <View style={styles.discoverCoverFallback}>
            <Users size={28} color={PRIMARY_COLOR} />
          </View>
        )}
        {item.is_private ? (
          <View style={styles.discoverPrivacyBadge}>
            <Text style={styles.discoverPrivacyText}>Private</Text>
          </View>
        ) : null}
        {item.sport ? (
          <View style={styles.discoverSportBadge}>
            <Text style={styles.discoverSportBadgeText}>{item.sport}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.discoverBody}>
        <Text style={styles.discoverTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.discoverMetaRow}>
          <View style={styles.discoverMetaPill}>
            <Users size={11} color="#64748B" />
            <Text style={styles.discoverMetaText}>{memberCount} {memberCount === 1 ? "member" : "members"}</Text>
          </View>
          {item.friends_count ? (
            <View style={styles.discoverMetaPill}>
              <Text style={styles.discoverMetaText}>{item.friends_count} friends</Text>
            </View>
          ) : null}
          {item.group_type ? (
            <View style={styles.discoverMetaPill}>
              <Text style={styles.discoverMetaText}>{item.group_type}</Text>
            </View>
          ) : null}
        </View>
        {item.description ? (
          <Text style={styles.discoverDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Action */}
        {item.is_member ? (
          <Pressable style={styles.discoverActionBtnOpen} onPress={handleOpen}>
            <Text style={styles.discoverActionTextOpen}>Open Group</Text>
            <ChevronRight size={14} color="#64748B" />
          </Pressable>
        ) : item.has_pending_request ? (
          <View style={styles.discoverActionBtnPending}>
            <Text style={styles.discoverActionTextPending}>Request Sent</Text>
          </View>
        ) : (
          <Pressable style={styles.discoverActionBtn} disabled={isJoining} onPress={handleJoin}>
            {isJoining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Plus size={14} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.discoverActionText}>{item.is_private ? "Request to Join" : "Join Group"}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
});

// Mirror of frontend UserRow (NewChatModal → UserRow.js):
//   - avatar + emerald "online" dot bottom-right
//   - bold name
//   - subtitle: role label ("ATHLETE" for players) + separator dot + skill rating "SR"
//   - chat icon button on the right
const NewChatUserRow = React.memo(function NewChatUserRow({ item, onSelect }) {
  const handlePress = useCallback(() => onSelect(item), [onSelect, item]);
  const roleLabel = (item.role === "player" ? "Athlete" : item.role || "Player").toUpperCase();
  const skillRating = item.skill_rating;
  return (
    <Pressable onPress={handlePress} style={styles.userRow}>
      <View style={styles.userAvatarWrap}>
        {item.avatar ? (
          <Image source={{ uri: mediaUrl(item.avatar) }} style={styles.userAvatar} contentFit="cover" />
        ) : (
          <View style={styles.userAvatarFallback}>
            <Text style={styles.avatarInitials}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.userOnlineDotRing}>
          <View style={styles.userOnlineDot} />
        </View>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.userName} numberOfLines={1}>{item.name || item.username}</Text>
        <View style={styles.userMetaRow}>
          <Text style={styles.userRoleLabel} numberOfLines={1}>{roleLabel}</Text>
          {skillRating ? (
            <>
              <View style={styles.userMetaDot} />
              <Text style={styles.userSkillRating} numberOfLines={1}>{skillRating} SR</Text>
            </>
          ) : null}
        </View>
      </View>
      <Pressable onPress={handlePress} style={styles.newChatMsgBtn}>
        <MessageCircle size={18} color={PRIMARY_COLOR} />
      </Pressable>
    </Pressable>
  );
});

// ── New Chat Modal (Full-screen with Followers / Following tabs) ──
function NewChatModal({ visible, onClose, onSelectUser }) {
  const insets = useSafeAreaInsets();
  const pageWidth = Dimensions.get("window").width;
  const tabWidth = pageWidth / 2;
  const { user } = useAuth();
  const userId = user?.id || user?._id || "";
  const [activeTab, setActiveTab] = useState("followers");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const pagerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && userId) {
      setLoading(true);
      Promise.all([
        socialService.getFollowers(userId, null, 100).catch(() => ({})),
        socialService.getFollowing(userId, null, 100).catch(() => ({})),
      ]).then(([fRes, gRes]) => {
        setFollowers(Array.isArray(fRes) ? fRes : fRes?.followers || fRes?.users || fRes?.data || []);
        setFollowing(Array.isArray(gRes) ? gRes : gRes?.following || gRes?.users || gRes?.data || []);
      }).finally(() => setLoading(false));
    }
  }, [visible, userId]);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await chatService.searchUsers(text.trim());
        setSearchResults(Array.isArray(data) ? data : data?.users || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
  };

  const handleClose = () => { setQuery(""); setSearchResults([]); setActiveTab("followers"); onClose(); };

  const currentList = query.trim()
    ? searchResults
    : activeTab === "followers" ? followers : following;

  const pageContentStyle = useMemo(
    () => ({ padding: 16, paddingBottom: Math.max(insets.bottom + 16, 24), gap: 4 }),
    [insets.bottom]
  );

  const pagerPageStyle = useMemo(
    () => ({ width: pageWidth, flex: 1 }),
    [pageWidth]
  );

  const pagerData = useMemo(
    () => [
      { key: "followers", data: followers, empty: "No followers yet" },
      { key: "following", data: following, empty: "Not following anyone yet" },
    ],
    [followers, following]
  );

  const scrollToTab = useCallback((tabKey) => {
    const nextIndex = tabKey === "following" ? 1 : 0;
    setActiveTab(tabKey);
    pagerRef.current?.scrollToOffset?.({ offset: nextIndex * pageWidth, animated: true });
  }, [pageWidth]);

  const handlePagerMomentumEnd = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x || 0;
    const nextIndex = Math.round(offsetX / pageWidth);
    setActiveTab(nextIndex === 1 ? "following" : "followers");
  }, [pageWidth]);

  const handleUserSelect = useCallback((item) => {
    onSelectUser(item);
    handleClose();
  }, [onSelectUser, handleClose]);

  const renderUser = useCallback(({ item }) => (
    <NewChatUserRow item={item} onSelect={handleUserSelect} />
  ), [handleUserSelect]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent />
        <View style={styles.modalHeader}>
          <Pressable
            onPress={handleClose}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color="#374151" />
          </Pressable>
          <Text style={styles.modalTitle}>New Conversation</Text>
          <View style={styles.spacer30} />
        </View>

        {/* Followers / Following Tabs */}
        <View style={styles.newChatTabsRow}>
          <Animated.View
            style={[
              styles.newChatTabIndicator,
              {
                width: tabWidth,
                transform: [
                  {
                    translateX: scrollX.interpolate({
                      inputRange: [0, pageWidth],
                      outputRange: [0, tabWidth],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />
          <Pressable
            style={styles.newChatTab}
            onPress={() => scrollToTab("followers")}
          >
            <Text style={[styles.newChatTabText, activeTab === "followers" && styles.newChatTabTextActive]}>
              Followers{followers.length ? ` (${followers.length})` : ""}
            </Text>
          </Pressable>
          <Pressable
            style={styles.newChatTab}
            onPress={() => scrollToTab("following")}
          >
            <Text style={[styles.newChatTabText, activeTab === "following" && styles.newChatTabTextActive]}>
              Following{following.length ? ` (${following.length})` : ""}
            </Text>
          </Pressable>
        </View>

        <View style={styles.modalSearchWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput value={query} onChangeText={handleSearch} placeholder="Search by name..." placeholderTextColor="#9CA3AF" style={styles.modalSearchInput} />
        </View>

        {(loading || searching) && <ActivityIndicator color={PRIMARY_COLOR} style={styles.loaderMargin} />}

        {query.trim() ? (
          <FlashList
            data={currentList}
            keyExtractor={(item) => String(item.id || item._id || item.user_id)}
            contentContainerStyle={pageContentStyle}
            renderItem={renderUser}
            estimatedItemSize={60}
            ListEmptyComponent={
              !loading && !searching ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : null
            }
          />
        ) : (
          <Animated.FlatList
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={pagerData}
            keyExtractor={(item) => item.key}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={pagerPageStyle}>
                <FlashList
                  data={item.data}
                  keyExtractor={(userItem) => String(userItem.id || userItem._id || userItem.user_id)}
                  renderItem={renderUser}
                  estimatedItemSize={60}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={pageContentStyle}
                  ListEmptyComponent={
                    !loading && !searching ? (
                      <Text style={styles.emptyText}>{item.empty}</Text>
                    ) : null
                  }
                />
              </View>
            )}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={handlePagerMomentumEnd}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            directionalLockEnabled
            snapToAlignment="start"
            scrollEventThrottle={16}
            removeClippedSubviews={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

/* ── Module-level cache ── */
const _cc = { conversations: [], groups: [], requests: [], ready: false };
const MAIN_CHAT_TABS = [
  { key: "all", label: "Chat" },
  { key: "groups", label: "Groups" },
  { key: "requests", label: "Requests" },
];

// ── Main Component ──────────────────────────────────────────
export default function ChatScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pageWidth = Dimensions.get("window").width;
  const { user } = useAuth();
  const { activeIndex: parentTabIndex, goToTab, headerHeight: sharedHeaderHeight, setPagerSwipeEnabled } = useContext(SwipeTabContext);
  const { refreshSignals } = useContext(TabRefreshContext);
  const currentUserId = user?.id || user?._id || "";
  const { setWishlistCount, chatReadVersion } = useWishlist();
  const { location } = useLocation();
  const userCity = location?.city;

  /* ── Collapsible header animation (Reanimated) ── */
  const headerTranslateY = useSharedValue(0);
  const mainScrollX = useRef(new Animated.Value(0)).current;
  const headerHeightRef = useRef(0);
  const stickyHeaderHeightRef = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabsHeaderWidth, setTabsHeaderWidth] = useState(0);
  const lastScrollYRef = useRef(0);
  const mainPagerRef = useRef(null);
  const activeTabRef = useRef("all");
  const activeTabIndexRef = useRef(0);

  const onHeaderLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (!headerHeightRef.current || headerHeightRef.current !== h) {
      headerHeightRef.current = h;
      setHeaderHeight(h);
    }
  }, []);

  const onStickyHeaderLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (!stickyHeaderHeightRef.current || stickyHeaderHeightRef.current !== h) {
      stickyHeaderHeightRef.current = h;
    }
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    lastScrollYRef.current = offsetY;
  }, []);

  const [conversations, setConversations] = useState(_cc.conversations);
  const [groups, setGroups] = useState(_cc.groups);
  const [requests, setRequests] = useState(_cc.requests);
  const [loading, setLoading] = useState(!_cc.ready);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const searchTimerRef = useRef(null);
  const handleSearchChange = useCallback((text) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      startTransition(() => setDeferredSearch(text));
    }, 200);
  }, []);
  const handleSearchClear = useCallback(() => {
    setSearch("");
    setDeferredSearch("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);
  const [typingMap, setTypingMap] = useState({}); // { conversationId: timestamp }
  const [activeTab, setActiveTab] = useState("all");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showDiscoverGroups, setShowDiscoverGroups] = useState(false);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [joiningGroupId, setJoiningGroupId] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", description: "", group_type: "community", sport: "", is_private: false, max_members: "50", avatar_url: "", cover_url: "", _sportOpen: false });
  const [groupFormError, setGroupFormError] = useState("");

  const handleCreateGroup = useCallback(async () => {
    if (!groupForm.name.trim()) { setGroupFormError("Group name is required"); return; }
    setGroupFormError("");
    setCreatingGroup(true);
    try {
      await chatService.createGroup({
        name: groupForm.name.trim(),
        description: groupForm.description || undefined,
        group_type: groupForm.group_type || "community",
        sport: groupForm.sport || undefined,
        is_private: groupForm.is_private,
        max_members: groupForm.max_members ? parseInt(groupForm.max_members, 10) : 50,
        avatar_url: groupForm.avatar_url || undefined,
        cover_url: groupForm.cover_url || undefined,
        city: userCity || undefined,
      });
      toast.success("Group created!");
      setShowCreateGroup(false);
      setGroupForm({ name: "", description: "", group_type: "community", sport: "", is_private: false, max_members: "50", avatar_url: "", cover_url: "", _sportOpen: false });
      loadData();
    } catch (err) {
      setGroupFormError(err?.response?.data?.error || "Failed to create group");
    } finally { setCreatingGroup(false); }
  }, [groupForm]);

  const loadData = useCallback(async () => {
    if (!_cc.ready) setLoading(true);
    try {
      // Use unified endpoint (same as frontend) — returns merged DMs + Groups with proper fields
      const [unified, reqs] = await Promise.all([
        chatService.getUnifiedConversations(),
        chatService.getRequests(),
      ]);
      const allConvos = unified.conversations || unified || [];
      const list = Array.isArray(allConvos) ? allConvos : [];
      // Split into DMs and Groups based on type field
      const dmList = list.filter((c) => c.type !== "group").map((c) => ({ ...c, _type: "dm" }));
      const grpList = list.filter((c) => c.type === "group").map((g) => ({ ...g, _type: "group" }));
      const reqList = Array.isArray(reqs) ? reqs : reqs?.requests || [];
      setConversations(dmList);
      setGroups(grpList);
      setRequests(reqList);
      _cc.conversations = dmList;
      _cc.groups = grpList;
      _cc.requests = reqList;
      _cc.ready = true;
      // Update bottom tab badge without fetching unified conversations again
      const totalUnread = [...dmList, ...grpList].reduce((sum, item) => sum + (item?.unread_count || 0), 0);
      setWishlistCount(totalUnread);
    } catch {
      if (!_cc.ready) toast.error("Failed to load chats");
    } finally { setLoading(false); }
  }, [setWishlistCount, currentUserId]);

  useEffect(() => {
    if (_cc.ready) {
      setConversations(_cc.conversations);
      setGroups(_cc.groups);
      setRequests(_cc.requests);
    }
    loadData();
  }, [loadData]);

  // Refresh on screen focus (when returning from a chat — matches web's "chat-read" event)
  const navigation = useNavigation();
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (parentTabIndex === 4) loadData();
    });
    return unsub;
  }, [navigation, parentTabIndex, loadData]);

  // Instant refresh when chat detail marks messages as read (global signal via context)
  const chatReadVersionRef = useRef(chatReadVersion);
  useEffect(() => {
    if (chatReadVersion > chatReadVersionRef.current) {
      chatReadVersionRef.current = chatReadVersion;
      loadData();
    }
  }, [chatReadVersion, loadData]);

  // Refresh conversations when chat tab becomes active or app returns to foreground
  const prevTabRef = useRef(parentTabIndex);
  useEffect(() => {
    if (parentTabIndex === 4 && prevTabRef.current !== 4) {
      loadData();
      // Disable parent pager — internal pager handles all horizontal swipes on Chat tab
      setPagerSwipeEnabled?.(false);
    } else if (parentTabIndex !== 4 && prevTabRef.current === 4) {
      // Leaving Chat — re-enable parent pager for other tabs
      setPagerSwipeEnabled?.(true);
    }
    prevTabRef.current = parentTabIndex;

    if (parentTabIndex === 4) {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") loadData();
      });
      return () => { sub.remove(); };
    }
    return undefined;
  }, [parentTabIndex, loadData]);

  // Keep a ref to typingMap for stable access from renderItem
  const typingMapRef = useRef(typingMap);
  typingMapRef.current = typingMap;

  // Clear stale typing indicators every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingMap((prev) => {
        const now = Date.now();
        const next = {};
        let changed = false;
        for (const [id, ts] of Object.entries(prev)) {
          if (now - ts < 3000) next[id] = ts;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Poll conversation list every 5s when chat tab is active
  // (No separate WebSocket — backend only allows one WS per user, chat detail screen uses it)
  useEffect(() => {
    if (parentTabIndex !== 4) return;
    const hasListChanged = (prev, next) => {
      if (prev.length !== next.length) return true;
      for (let i = 0; i < prev.length; i++) {
        const a = prev[i], b = next[i];
        if ((a.id || a._id) !== (b.id || b._id)) return true;
        if (a.unread_count !== b.unread_count) return true;
        if (a.last_message_at !== b.last_message_at) return true;
        if (a.last_message !== b.last_message) return true;
        if ((a.other_user?.avatar || "") !== (b.other_user?.avatar || "")) return true;
        if ((a.avatar_url || "") !== (b.avatar_url || "")) return true;
      }
      return false;
    };
    const doRefresh = () => {
      chatService.getUnifiedConversations({ force: true }).then((unified) => {
        const allConvos = unified.conversations || unified || [];
        const list = Array.isArray(allConvos) ? allConvos : [];
        const dmList = list.filter((c) => c.type !== "group").map((c) => ({ ...c, _type: "dm" }));
        const grpList = list.filter((c) => c.type === "group").map((g) => ({ ...g, _type: "group" }));
        if (hasListChanged(_cc.conversations, dmList)) {
          setConversations(dmList);
          _cc.conversations = dmList;
        }
        if (hasListChanged(_cc.groups, grpList)) {
          setGroups(grpList);
          _cc.groups = grpList;
        }
        const totalUnread = list.reduce((sum, item) => sum + (item?.unread_count || 0), 0);
        setWishlistCount(totalUnread);
      }).catch(() => {});
    };
    const interval = setInterval(doRefresh, 5000);
    return () => clearInterval(interval);
  }, [parentTabIndex, setWishlistCount]);

  // Load discover groups when modal opens
  useEffect(() => {
    if (!showDiscoverGroups) return;
    setDiscoverLoading(true);
    Promise.all([
      chatService.discoverGroups().catch(() => []),
      chatService.recommendedGroups().catch(() => []),
    ]).then(([discover, recommended]) => {
      const dList = Array.isArray(discover) ? discover : discover?.groups || [];
      const rList = Array.isArray(recommended) ? recommended : recommended?.groups || [];
      const all = [...rList, ...dList];
      // Deduplicate by id
      const seen = new Set();
      const unique = all.filter((g) => {
        const gid = g.id || g._id;
        if (seen.has(gid)) return false;
        seen.add(gid);
        return true;
      });
      setDiscoverGroups(unique);
    }).finally(() => setDiscoverLoading(false));
  }, [showDiscoverGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Tab bar same-tab press → refresh
  useEffect(() => {
    if (!refreshSignals.chat) return;
    handleRefresh();
  }, [refreshSignals.chat]);

  // Unified list: merge DMs + Groups, sort by last activity
  const unified = useMemo(() => {
    const all = [...conversations, ...groups];
    all.sort((a, b) => {
      const getTime = (x) => {
        const t = x.last_message_at || x.last_activity || (typeof x.last_message === "object" ? x.last_message?.created_at : null) || x.updated_at || x.updatedAt || x.created_at || "";
        const d = new Date(t);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      return getTime(b) - getTime(a);
    });
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) =>
      [item.name, item.other_user?.name, typeof item.last_message === "string" ? item.last_message : item.last_message?.content].some(
        (v) => v?.toLowerCase().includes(q)
      )
    );
  }, [conversations, groups, deferredSearch]);

  const filteredUnified = useMemo(() => {
    let list = unified;
    // Keep the base pager data stable and only remove empty DM rows.
    list = list.filter((c) => {
      if (c._type === "group") return true;
      // Only show DM if there's actual message content or unread messages
      const lm = c.last_message;
      const hasMessage = typeof lm === "string"
        ? lm.trim().length > 0
        : (lm && typeof lm === "object" && (lm.content || lm.text || lm.media_url));
      return hasMessage || (c.unread_count && c.unread_count > 0);
    });
    return list;
  }, [unified]);

  const mainTabWidth = tabsHeaderWidth > 0 ? tabsHeaderWidth / MAIN_CHAT_TABS.length : 0;
  const mainPagerData = useMemo(() => MAIN_CHAT_TABS, []);
  const filteredDiscoverGroups = useMemo(
    () => discoverGroups.filter((g) => !discoverSearch || g.name?.toLowerCase().includes(discoverSearch.toLowerCase())),
    [discoverGroups, discoverSearch]
  );
  const groupsUnreadCount = useMemo(
    () => groups.reduce((sum, g) => sum + (g?.unread_count || 0), 0),
    [groups]
  );
  const chatsUnreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c?.unread_count || 0), 0),
    [conversations]
  );

  const getTabListData = useCallback((tabKey) => {
    if (tabKey === "requests") return requests;
    if (tabKey === "groups") return filteredUnified.filter((item) => item._type === "group");
    return filteredUnified.filter((item) => item._type !== "group");
  }, [filteredUnified, requests]);

  const handleMainTabPress = useCallback((tabKey) => {
    const nextIndex = MAIN_CHAT_TABS.findIndex((item) => item.key === tabKey);
    if (nextIndex < 0) return;
    activeTabIndexRef.current = nextIndex;
    activeTabRef.current = tabKey;
    setActiveTab(tabKey);
    mainPagerRef.current?.scrollToOffset?.({ offset: nextIndex * pageWidth, animated: true });
  }, [pageWidth]);


  // Track drag on internal pager to detect edge swipe to parent tab
  const dragStartXRef = useRef(null);
  const handleInternalDragBegin = useCallback((event) => {
    dragStartXRef.current = event.nativeEvent.contentOffset.x;
  }, []);
  const handleInternalDragEnd = useCallback((event) => {
    const startX = dragStartXRef.current;
    const endX = event.nativeEvent.contentOffset.x;
    dragStartXRef.current = null;
    // On the first sub-tab, user dragged right (swipe gesture) but pager stayed at 0
    if (startX !== null && startX <= 0 && endX <= 0 && activeTabIndexRef.current === 0) {
      const velocity = event.nativeEvent.velocity?.x || 0;
      const translation = event.nativeEvent.contentOffset.x - (startX || 0);
      // velocity > 0 or significant drag = navigate to Venues
      if (velocity > 0.15 || translation < -30) {
        goToTab(3);
      }
    }
  }, [goToTab]);

  const handleMainPagerMomentumEnd = useCallback((event) => {
    const offsetX = event.nativeEvent.contentOffset.x || 0;
    const nextIndex = Math.round(offsetX / pageWidth);
    const nextTab = MAIN_CHAT_TABS[nextIndex]?.key || "all";
    activeTabIndexRef.current = nextIndex;
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
  }, [pageWidth]);

  const handleMainPagerScroll = useMemo(
    () => Animated.event(
      [{ nativeEvent: { contentOffset: { x: mainScrollX } } }],
      {
        useNativeDriver: true,
        listener: (event) => {
          const offsetX = event.nativeEvent.contentOffset.x || 0;
          const rawIndex = offsetX / pageWidth;
          const nextIndex = Math.min(
            MAIN_CHAT_TABS.length - 1,
            Math.max(0, Math.floor(rawIndex + 0.18))
          );
          if (nextIndex !== activeTabIndexRef.current) {
            activeTabIndexRef.current = nextIndex;
            const nextTab = MAIN_CHAT_TABS[nextIndex]?.key || "all";
            activeTabRef.current = nextTab;
            setActiveTab(nextTab);
          }
        },
      }
    ),
    [mainScrollX, pageWidth]
  );

  const handlePress = useCallback((item) => {
    const isGroup = item._type === "group";
    const name = isGroup ? item.name || "Group" : item.other_user?.name || item.name || "Chat";
    const avatar = isGroup ? item.avatar_url || item.display_avatar || item.avatar || "" : item.other_user?.avatar || item.avatar || "";
    const id = item.id || item._id || item.conversation_id;
    const otherUserId = item.other_user?.id || item.other_user?._id || "";
    safePush(router,
      `/(stack)/chat/${id}?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}&type=${isGroup ? "group" : "dm"}&otherUserId=${otherUserId}`
    );
  }, [router]);

  const handleLongPress = useCallback((item) => {
    const isGroup = item._type === "group";
    const id = item.id || item._id || item.conversation_id;
    Alert.alert(
      "Clear Chat",
      "This will delete all messages in this conversation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              if (isGroup) {
                await chatService.clearGroupChat(id);
              } else {
                await chatService.clearChat(id);
              }
              toast.success("Chat cleared");
              loadData();
            } catch (err) {
              toast.error(err?.response?.data?.detail || "Failed to clear chat");
            }
          },
        },
      ]
    );
  }, [loadData]);

  const handleDiscoverJoin = useCallback(async (item) => {
    const groupId = item.id || item._id;
    if (!groupId || joiningGroupId) return;
    setJoiningGroupId(groupId);
    try {
      if (item.is_private) {
        await chatService.requestJoin(groupId);
        toast.success("Join request sent!");
        setDiscoverGroups((prev) => prev.map((group) => (
          (group.id || group._id) === groupId
            ? { ...group, has_pending_request: true }
            : group
        )));
      } else {
        await chatService.joinGroup(groupId);
        toast.success(`Joined ${item.name}`);
        setDiscoverGroups((prev) => prev.map((group) => (
          (group.id || group._id) === groupId
            ? {
                ...group,
                is_member: true,
                member_count: (group.member_count || group.members?.length || 0) + 1,
              }
            : group
        )));
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to join group");
    } finally {
      setJoiningGroupId("");
    }
  }, [joiningGroupId, loadData]);

  const renderDiscoverItem = useCallback(({ item }) => (
    <DiscoverGroupCard
      item={item}
      onOpen={handlePress}
      onJoin={handleDiscoverJoin}
      joiningGroupId={joiningGroupId}
    />
  ), [handlePress, handleDiscoverJoin, joiningGroupId]);

  // Mirrors frontend `processingId` state (MessageRequestsModal.js:16) — disables both
  // buttons on the SPECIFIC row being acted on while the API resolves.
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const handleAccept = useCallback(async (item) => {
    const id = item.id || item._id || item.conversation_id;
    setProcessingRequestId(id);
    try {
      await chatService.acceptRequest(id);
      toast.success("Request accepted");
      setRequests((prev) => prev.filter((r) => (r.id || r._id) !== (item.id || item._id)));
      loadData();
    } catch { toast.error("Failed to accept"); }
    finally { setProcessingRequestId(null); }
  }, [loadData]);

  const handleDecline = useCallback(async (item) => {
    Alert.alert("Decline Request", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline", style: "destructive",
        onPress: async () => {
          const id = item.id || item._id || item.conversation_id;
          setProcessingRequestId(id);
          try {
            await chatService.declineRequest(id);
            toast.success("Declined");
            setRequests((prev) => prev.filter((r) => (r.id || r._id) !== (item.id || item._id)));
            loadData();
          } catch { toast.error("Failed"); }
          finally { setProcessingRequestId(null); }
        },
      },
    ]);
  }, [loadData]);

  const handleOpenRequesterProfile = useCallback((userId) => {
    if (!userId) return;
    safePush(router, `/(stack)/player/${userId}`);
  }, [router]);

  const handleNewChat = useCallback(async (user) => {
    try {
      const data = await chatService.startConversation(user.id || user._id || user.user_id);
      const convoId = data.id || data._id || data.conversation_id;
      safePush(router, `/(stack)/chat/${convoId}?name=${encodeURIComponent(user.name || "Chat")}&avatar=${encodeURIComponent(user.avatar || "")}&type=dm`);
    } catch { toast.error("Failed to start conversation"); }
  }, [router]);

  const currentUserName = user?.name || "";

  const conversationKeyExtractor = useCallback(
    (item, i) => String(item.id || item._id || item.conversation_id || `c-${i}`),
    []
  );


  const renderConversationItem = useCallback(
    ({ item }) => {
      const convoId = item.id || item._id;
      const typingTs = typingMapRef.current[convoId];
      const typing = typingTs && (Date.now() - typingTs < 3000);
      return (
        <ConversationRow
          item={item}
          onPress={handlePress}
          onLongPress={handleLongPress}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          joinRequestCount={item._type === "group" ? (item.join_request_count || 0) : 0}
          isTyping={!!typing}
        />
      );
    },
    [currentUserId, currentUserName, handleLongPress, handlePress]
  );

  const renderRequestItem = useCallback(
    ({ item }) => (
      <RequestRow
        item={item}
        processing={processingRequestId === (item.id || item._id || item.conversation_id)}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onOpenProfile={handleOpenRequesterProfile}
      />
    ),
    [handleAccept, handleDecline, handleOpenRequesterProfile, processingRequestId]
  );

  const renderRequestBanner = useCallback(
    () => <RequestBanner count={requests.length} onPress={() => handleMainTabPress("requests")} />,
    [handleMainTabPress, requests.length]
  );

  const tabPageStyle = useMemo(() => ({ width: pageWidth, flex: 1 }), [pageWidth]);

  const renderTabPage = useCallback(({ item: tab }) => {
    const tabData = getTabListData(tab.key);
    return (
      <View style={tabPageStyle}>
        <FlashList
          data={tabData}
          keyExtractor={conversationKeyExtractor}
          renderItem={tab.key === "requests" ? renderRequestItem : renderConversationItem}
          estimatedItemSize={72}
          drawDistance={250}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            tabData.length === 0 ? styles.emptyContainer : styles.listContent,
            { paddingTop: headerHeight },
          ]}
          scrollEventThrottle={32}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PRIMARY_COLOR}
              colors={[PRIMARY_COLOR]}
              progressViewOffset={headerHeight}
            />
          }
          ListHeaderComponent={tab.key !== "requests" ? renderRequestBanner : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MessageCircle size={32} color={PRIMARY_COLOR} />
              </View>
              {/* Groups tab: ICON ONLY — per product request, no title/subtitle/CTA.
                  Chat tab: full empty state with "Start a Chat" button.
                  Requests tab: friendly "All clear" wording (matches frontend
                  MessageRequestsModal.js:151-161). */}
              {tab.key !== "groups" ? (
                <>
                  <Text style={styles.emptyTitle}>{tab.key === "requests" ? "All clear" : "No conversations yet"}</Text>
                  {/* <Text style={styles.emptySubtitle}>
                    {tab.key === "requests" ? "No pending message requests" : "Start chatting with athletes and groups."}
                  </Text> */}
                  {/* {tab.key !== "requests" ? (
                    <Pressable style={styles.emptyBtn} onPress={() => setShowNewChat(true)}>
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.emptyBtnText}>Start a Chat</Text>
                    </Pressable>
                  ) : null} */}
                </>
              ) : null}
            </View>
          }
        />
      </View>
    );
  }, [
    conversationKeyExtractor,
    getTabListData,
    handleRefresh,
    handleScroll,
    headerHeight,
    refreshing,
    renderConversationItem,
    renderRequestBanner,
    renderRequestItem,
    tabPageStyle,
  ]);

  return (
    <View
      style={styles.container}
    >
      {/* Collapsible Header — slides up on scroll down */}
      <Reanimated.View
        style={[styles.headerOverlay, headerAnimatedStyle]}
        onLayout={onHeaderLayout}
        collapsable={false}
      >
        <View style={[styles.headerBg, { paddingTop: sharedHeaderHeight || insets.top }]}>
          {/* Header */}
          <View style={styles.header} onLayout={onStickyHeaderLayout}>
            <View style={styles.tabsHeaderRow} onLayout={(e) => setTabsHeaderWidth(e.nativeEvent.layout.width)}>
              {mainTabWidth > 0 ? (
                <Animated.View
                  style={[
                    styles.tabHeaderIndicator,
                    {
                      width: mainTabWidth - 4,
                      transform: [
                        {
                          translateX: mainScrollX.interpolate({
                            inputRange: [0, pageWidth, pageWidth * 2],
                            outputRange: [2, mainTabWidth + 2, mainTabWidth * 2 + 2],
                            extrapolate: "clamp",
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ) : null}
              {MAIN_CHAT_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={styles.tabHeaderBtn}
                                   onPress={() => handleMainTabPress(tab.key)}
                >
                  <Text style={[styles.tabHeaderText, activeTab === tab.key && styles.tabHeaderTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.key === "all" && chatsUnreadCount > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{chatsUnreadCount > 99 ? "99+" : chatsUnreadCount}</Text>
                    </View>
                  )}
                  {tab.key === "groups" && groupsUnreadCount > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{groupsUnreadCount > 99 ? "99+" : groupsUnreadCount}</Text>
                    </View>
                  )}
                  {tab.key === "requests" && requests.length > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{requests.length}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
           
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
            {search.length > 0 && (
              <Pressable onPress={handleSearchClear} style={styles.searchClear}>
                <X size={16} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

        </View>
      </Reanimated.View>

      {/* List */}
      {loading ? (
        <ChatSkeleton />
      ) : (
        <Animated.FlatList
          ref={mainPagerRef}
          horizontal
          scrollEnabled
          pagingEnabled
          data={mainPagerData}
          keyExtractor={(item) => item.key}
          renderItem={renderTabPage}
          getItemLayout={(_, index) => ({
            length: pageWidth,
            offset: pageWidth * index,
            index,
          })}
          onScroll={handleMainPagerScroll}
          onScrollBeginDrag={handleInternalDragBegin}
          onScrollEndDrag={handleInternalDragEnd}
          onMomentumScrollEnd={handleMainPagerMomentumEnd}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          disableIntervalMomentum
          directionalLockEnabled
          nestedScrollEnabled
          overScrollMode="never"
          snapToAlignment="start"
          snapToInterval={pageWidth}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          scrollEventThrottle={16}
        />
      )}

      {/* Floating Action Button */}
      {activeTab !== "requests" ? (
        <Pressable
          style={styles.fab}
                   onPress={() => {
            if (activeTab === "groups") setShowDiscoverGroups(true);
            else setShowNewChat(true);
          }}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      ) : null}

      {/* New Chat Modal */}
      <NewChatModal visible={showNewChat} onClose={() => setShowNewChat(false)} onSelectUser={handleNewChat} />

      {/* Discover Groups Screen */}
      <Modal visible={showDiscoverGroups} animationType="slide" statusBarTranslucent onRequestClose={() => setShowDiscoverGroups(false)}>
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDiscoverGroups(false)} style={styles.iconBtn}>
              <ArrowLeft size={22} color="#374151" />
            </Pressable>
            <Text style={styles.modalTitle}>Discover Groups</Text>
            <Pressable
              style={styles.discoverCreateBtn}
              onPress={() => { setShowDiscoverGroups(false); setShowCreateGroup(true); }}
            >
              <Plus size={14} color="#FFF" />
              <Text style={styles.discoverCreateBtnText}>Create</Text>
            </Pressable>
          </View>
          <Text style={styles.discoverSubtitle}>
            Find communities, connect with players
          </Text>
          {/* Search */}
          <View style={[styles.searchWrap, styles.discoverSearchWrap]}>
            <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              value={discoverSearch}
              onChangeText={setDiscoverSearch}
              placeholder="Search groups..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
          </View>
          {discoverLoading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY_COLOR} /></View>
          ) : (
            <FlashList
              data={filteredDiscoverGroups}
              keyExtractor={(item, i) => String(item.id || item._id || i)}
              estimatedItemSize={200}
              contentContainerStyle={styles.discoverListContent}
              ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
              ListHeaderComponent={
                filteredDiscoverGroups.length > 0 ? (
                  <View style={styles.discoverHeaderRow}>
                    <Text style={styles.discoverHeaderLabel}>RECOMMENDED FOR YOU</Text>
                    <Text style={styles.discoverHeaderHint}>AI-powered</Text>
                  </View>
                ) : null
              }
              renderItem={renderDiscoverItem}
              ListEmptyComponent={
                <View style={styles.discoverEmpty}>
                  <Users size={32} color="#9CA3AF" />
                  <Text style={styles.discoverEmptyText}>No groups found</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Create Group Modal (matches web) */}
      <Modal visible={showCreateGroup} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { setShowCreateGroup(false); setGroupFormError(""); }}>
        <View style={styles.groupModalOverlay}>
          <View style={styles.groupModalContainer}>
            {/* Drag handle */}
            <View style={styles.groupDragHandle}><View style={styles.groupDragBar} /></View>
            <View style={styles.groupModalHeader}>
              <View style={styles.groupModalHeaderLeft}>
                <View style={styles.groupModalHeaderIcon}>
                  <UsersRound size={16} color={PRIMARY_COLOR} />
                </View>
                <View>
                  <Text style={styles.groupModalTitle}>Create Group</Text>
                  <Text style={styles.groupModalSubtitle}>Build your community</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowCreateGroup(false)} style={styles.groupModalCloseBtn}><X size={16} color="#94A3B8" /></Pressable>
            </View>
            <KeyboardAwareScrollView enableOnAndroid extraScrollHeight={60} contentContainerStyle={styles.groupModalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Cover Image */}
              <Text style={styles.groupFieldLabel}>COVER IMAGE</Text>
              <Pressable style={styles.groupCoverUpload} onPress={async () => {
                try {
                  const ImagePicker = require("expo-image-picker");
                  const { requestPermission } = require("../../utils/permissions");
                  await requestPermission(
                    () => ImagePicker.requestMediaLibraryPermissionsAsync(),
                    "Photo Library"
                  );
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
                  if (!result.canceled && result.assets?.[0]?.uri) {
                    const formData = new FormData();
                    formData.append("file", { uri: result.assets[0].uri, name: "cover.jpg", type: "image/jpeg" });
                    const res = await chatService.uploadFile(formData);
                    setGroupForm((p) => ({ ...p, cover_url: res.url || res.media_url || "" }));
                  }
                } catch { toast.error("Failed to upload cover"); }
              }}>
                {groupForm.cover_url ? (
                  <Image source={{ uri: mediaUrl(groupForm.cover_url) }} style={styles.groupCoverImage} contentFit="cover" />
                ) : (
                  <View style={styles.groupCoverPlaceholder}>
                    <ImageIcon size={20} color="#9CA3AF" />
                    <Text style={styles.groupCoverPlaceholderText}>Tap to upload</Text>
                  </View>
                )}
              </Pressable>

              {/* Avatar */}
              <Text style={styles.groupFieldLabel}>AVATAR</Text>
              <View style={styles.groupAvatarRow}>
                <Pressable style={styles.groupAvatarUpload} onPress={async () => {
                  try {
                    const ImagePicker = require("expo-image-picker");
                    const { requestPermission } = require("../../utils/permissions");
                    await requestPermission(
                      () => ImagePicker.requestMediaLibraryPermissionsAsync(),
                      "Photo Library"
                    );
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
                    if (!result.canceled && result.assets?.[0]?.uri) {
                      const formData = new FormData();
                      formData.append("file", { uri: result.assets[0].uri, name: "avatar.jpg", type: "image/jpeg" });
                      const res = await chatService.uploadFile(formData);
                      setGroupForm((p) => ({ ...p, avatar_url: res.url || res.media_url || "" }));
                    }
                  } catch { toast.error("Failed to upload avatar"); }
                }}>
                  {groupForm.avatar_url ? (
                    <Image source={{ uri: mediaUrl(groupForm.avatar_url) }} style={styles.groupAvatarImage} contentFit="cover" />
                  ) : (
                    <UsersRound size={24} color="rgba(5,150,105,0.5)" />
                  )}
                </Pressable>
                <Text style={styles.groupAvatarHint}>Tap to upload group photo</Text>
              </View>

              {/* Group Name */}
              <Text style={styles.groupFieldLabel}>GROUP NAME *</Text>
              <TextInput value={groupForm.name} onChangeText={(v) => { setGroupForm((p) => ({ ...p, name: v })); if (groupFormError) setGroupFormError(""); }} placeholder="e.g. Chennai Football Club" placeholderTextColor="#94A3B8" style={[styles.groupTextField, groupFormError ? styles.groupFieldError : null]} />
              {groupFormError ? <Text style={styles.groupErrorText}>{groupFormError}</Text> : null}

              {/* Description */}
              <Text style={styles.groupFieldLabel}>DESCRIPTION</Text>
              <TextInput value={groupForm.description} onChangeText={(v) => setGroupForm((p) => ({ ...p, description: v }))} placeholder="What's this group about?" placeholderTextColor="#94A3B8" multiline numberOfLines={3} style={[styles.groupTextField, { height: 72, textAlignVertical: "top" }]} />

              {/* Group Type */}
              <Text style={styles.groupFieldLabel}>TYPE</Text>
              <View style={styles.groupTypeRow}>
                <Pressable style={[styles.groupTypeBtn, groupForm.group_type === "community" && styles.groupTypeBtnActive]} onPress={() => setGroupForm((p) => ({ ...p, group_type: "community", max_members: "50" }))}>
                  <Text style={[styles.groupTypeBtnText, groupForm.group_type === "community" && styles.groupTypeBtnTextActive]}>Community</Text>
                </Pressable>
                <Pressable style={[styles.groupTypeBtn, groupForm.group_type === "club" && styles.groupTypeBtnActive]} onPress={() => setGroupForm((p) => ({ ...p, group_type: "club", max_members: "20" }))}>
                  <Text style={[styles.groupTypeBtnText, groupForm.group_type === "club" && styles.groupTypeBtnTextActive]}>Club</Text>
                </Pressable>
              </View>

              {/* Sport Selector */}
              <Text style={styles.groupFieldLabel}>SPORT</Text>
              <SportDropdownButton
                selectedSport={groupForm.sport}
                onPress={() => setGroupForm((p) => ({ ...p, _sportOpen: true }))}
                style={styles.sportDropdownBtn}
              />

              {/* Private Toggle */}
              <View style={styles.groupPrivateCard}>
                <View style={styles.privateToggleInfo}>
                  <Text style={styles.groupPrivateTitle}>{groupForm.is_private ? "Private Group" : "Public Group"}</Text>
                  <Text style={styles.groupPrivateDesc}>{groupForm.is_private ? "Members must request to join" : "Anyone can join this group"}</Text>
                </View>
                <Pressable style={[styles.groupSwitch, groupForm.is_private && styles.groupSwitchActive]} onPress={() => setGroupForm((p) => ({ ...p, is_private: !p.is_private }))}>
                  <View style={[styles.groupSwitchThumb, groupForm.is_private && styles.groupSwitchThumbActive]} />
                </Pressable>
              </View>

              {/* Max Members */}
              <View style={styles.groupFieldLabelRow}>
                <Text style={styles.groupFieldLabel}>MAX MEMBERS</Text>
                <Text style={styles.groupFieldLabelHint}>(max {groupForm.group_type === "club" ? "20" : "50"})</Text>
              </View>
              <TextInput
                value={groupForm.max_members}
                onChangeText={(v) => {
                  const limit = groupForm.group_type === "club" ? 20 : 50;
                  const num = parseInt(v, 10);
                  if (v === "") { setGroupForm((p) => ({ ...p, max_members: "" })); return; }
                  if (!isNaN(num)) {
                    setGroupForm((p) => ({ ...p, max_members: String(Math.min(Math.max(num, 2), limit)) }));
                  }
                }}
                placeholder={groupForm.group_type === "club" ? "20" : "50"}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.groupTextField}
              />

            </KeyboardAwareScrollView>

            {/* Footer — separated like web */}
            <View style={[styles.groupFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <Pressable style={styles.groupCancelBtn} onPress={() => setShowCreateGroup(false)}>
                <Text style={styles.groupCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.groupCreateBtn, creatingGroup && { opacity: 0.5 }]} disabled={creatingGroup} onPress={handleCreateGroup}>
                {creatingGroup ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.groupCreateBtnText}>Create</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sport Picker Modal - Using Shared Component */}
      <SportPicker
        visible={!!groupForm._sportOpen}
        onClose={() => setGroupForm((p) => ({ ...p, _sportOpen: false }))}
        selectedSport={groupForm.sport}
        onSelectSport={(sportKey) => setGroupForm((p) => ({ ...p, sport: sportKey, _sportOpen: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Collapsible header overlay
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
  headerBg: {
    backgroundColor: "#FFFFFF",
  },

  // Header — matches frontend "Chats" + icons
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18, borderCurve: "continuous",
    alignItems: "center", justifyContent: "center",
  },
  newChatBtn: {
    width: 36, height: 36, borderRadius: 18, borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },

  // Search — always visible
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    height: 36,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 13, color: "#0F172A" },
  searchClear: { padding: 4 },

  // Tabs
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // Header tabs
  tabsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    position: "relative",
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    borderCurve: "continuous",
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabHeaderIndicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
  },
  tabHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderCurve: "continuous",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
  },
  tabHeaderTextActive: {
    color: "#FFFFFF",
  },
  tabBadge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Request Banner
  requestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.1)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  requestBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: "rgba(5,150,105,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  requestBannerBadge: {
    position: "absolute", top: -2, right: -2,
    minWidth: 18, height: 18, borderRadius: 9, borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  requestBannerBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  requestBannerTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  requestBannerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  requestBannerArrow: { width: 32, height: 32, borderRadius: 16, borderCurve: "continuous", backgroundColor: "rgba(5,150,105,0.08)", alignItems: "center", justifyContent: "center" },

  // Conversation Row
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 14,
    borderCurve: "continuous",
    gap: 12,
  },
  convoRowUnread: {
    backgroundColor: "rgba(5,150,105,0.08)",
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 48, height: 48, borderRadius: 24, borderCurve: "continuous", backgroundColor: "#E5E7EB" },
  avatarGroupImg: { borderRadius: 12, borderCurve: "continuous" },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24, borderCurve: "continuous",
    backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  avatarGroup: {
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.12)",
  },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: PRIMARY_COLOR },
  onlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, borderCurve: "continuous",
    backgroundColor: "#10B981",
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  groupDotBadge: {
    position: "absolute", bottom: -1, right: -1,
    width: 18, height: 18, borderRadius: 9, borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },

  convoBody: { flex: 1, gap: 3 },
  convoTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  convoName: { fontSize: 14, fontWeight: "500", color: "#0F172A", flexShrink: 1 },
  convoNameBold: { fontWeight: "700" },
  groupBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 3,
    borderCurve: "continuous",
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.12)",
  },
  groupBadgeText: { fontSize: 9, fontWeight: "700", color: PRIMARY_COLOR, letterSpacing: 0.5 },
  convoTime: { fontSize: 11, color: "#9CA3AF", flexShrink: 0 },
  convoTimeUnread: { color: PRIMARY_COLOR, fontWeight: "600" },

  streakBadge: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 },
  streakText: { fontSize: 9, fontWeight: "800", color: "#F97316" },
  joinReqBadge: {
    flexDirection: "row", alignItems: "center", gap: 2,
    height: 20, minWidth: 20, paddingHorizontal: 6,
    borderRadius: 10, borderCurve: "continuous", backgroundColor: "#F59E0B",
    justifyContent: "center", flexShrink: 0,
  },
  joinReqBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  convoBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  previewRow: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0, gap: 4 },
  mediaPreviewRow: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0, gap: 4 },
  convoPreview: { flex: 1, fontSize: 13, color: "#9CA3AF" },
  convoPreviewTyping: { color: PRIMARY_COLOR, fontStyle: "italic" },
  convoPreviewBold: { color: "#374151", fontWeight: "500" },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10, borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6, flexShrink: 0,
  },
  unreadText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  // Request Row — mirrors frontend MessageRequestsModal row (MessageRequestsModal.js:172-249)
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  requestAvatarWrap: { position: "relative", width: 48, height: 48 },
  requestAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9" },
  requestAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: PRIMARY_COLOR + "15", alignItems: "center", justifyContent: "center" },
  // Amber clock badge bottom-right — matches frontend `bg-amber-500 border-2 border-card`
  requestPendingBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  requestInfo: { flex: 1, minWidth: 0, gap: 2 },
  requestName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  requestPreview: { fontSize: 12, color: "#94A3B8" },
  requestActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  // Accept = pill with brand background + ShieldCheck + "Accept"
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  acceptBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  // Decline = circular icon-only with subtle border (matches `h-9 w-9 rounded-full border`)
  declineIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.5 },

  // Utility
  flex1: { flex: 1 },
  flexShrink0: { flexShrink: 0 },
  iconBtn: { padding: 10 },
  spacer30: { width: 30 },
  loaderMargin: { marginTop: 20 },
  privateToggleInfo: { flex: 1, gap: 2 },

  // Discover Groups — header
  discoverCreateBtn: { backgroundColor: PRIMARY_COLOR, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 5 },
  discoverCreateBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  discoverSubtitle: { paddingHorizontal: 16, fontSize: 14, color: "#64748B", marginBottom: 12, lineHeight: 20 },
  discoverSearchWrap: { marginHorizontal: 16, marginBottom: 14 },
  discoverListContent: { paddingHorizontal: 16, paddingBottom: 40 },
  discoverHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  discoverHeaderLabel: { fontSize: 11, fontWeight: "800", color: "#64748B", letterSpacing: 0.8, textTransform: "uppercase" },
  discoverHeaderHint: { fontSize: 10, fontWeight: "500", color: "#94A3B8", marginLeft: "auto" },
  discoverEmpty: { alignItems: "center", paddingTop: 60, gap: 10 },
  discoverEmptyText: { fontSize: 14, color: "#94A3B8" },

  // Discover Groups — cards
  discoverCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.6)",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  discoverCover: {
    height: 100,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  discoverCoverImg: {
    width: "100%",
    height: "100%",
  },
  discoverCoverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  discoverPrivacyBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
  },
  discoverPrivacyText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  discoverSportBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(5,150,105,0.9)",
  },
  discoverSportBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF", textTransform: "capitalize" },
  discoverBody: {
    padding: 14,
    gap: 8,
  },
  discoverTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  discoverMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  discoverMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  discoverMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "capitalize",
  },
  discoverDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },
  discoverActionBtn: {
    height: 42,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  discoverActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  discoverActionBtnOpen: {
    height: 42,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  discoverActionTextOpen: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  discoverActionBtnPending: {
    height: 42,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
  },
  discoverActionTextPending: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: { flex: 1 },
  listContent: { paddingBottom: 80 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 10,
  },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, borderCurve: "continuous", backgroundColor: "rgba(5,150,105,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", maxWidth: 220, lineHeight: 18, marginBottom: 24 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 24, backgroundColor: PRIMARY_COLOR, borderRadius: 20, borderCurve: "continuous", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  emptyBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { textAlign: "center", marginTop: 40, color: "#9CA3AF", fontSize: 14 },

  // Modals
  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalSearchWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: "#F3F4F6", borderRadius: 12, borderCurve: "continuous", paddingHorizontal: 12, height: 42 },
  modalSearchInput: { flex: 1, fontSize: 14, color: "#111827" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16, borderCurve: "continuous" },
  userAvatarWrap: { position: "relative" },
  userAvatar: { width: 44, height: 44, borderRadius: 22, borderCurve: "continuous", backgroundColor: "#E5E7EB" },
  userAvatarFallback: { width: 44, height: 44, borderRadius: 22, borderCurve: "continuous", backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  // Online indicator dot (matches frontend UserRow.js:22-24 — emerald bullet with white ring)
  userOnlineDotRing: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  userOnlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#10B981" },
  userName: { fontSize: 15, fontWeight: "800", color: "#111827", letterSpacing: -0.2 },
  // Frontend subtitle row (UserRow.js:38-50) — "ATHLETE • 1500 SR" pattern
  userMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  userRoleLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, textTransform: "uppercase" },
  userMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1" },
  userSkillRating: { fontSize: 10, fontWeight: "900", color: PRIMARY_COLOR, letterSpacing: 0.2 },

  // Create Group Modal
  groupModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  groupModalContainer: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: "continuous", maxHeight: "90%" },
  groupModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  groupModalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  groupModalHeaderIcon: { width: 36, height: 36, borderRadius: 18, borderCurve: "continuous", backgroundColor: "rgba(5,150,105,0.1)", alignItems: "center", justifyContent: "center" },
  groupModalTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  groupModalSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  groupModalCloseBtn: { width: 32, height: 32, borderRadius: 16, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  groupModalBody: { padding: 20, paddingBottom: 32 },
  groupFieldLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 0.8, marginBottom: 6, marginTop: 16 },
  groupFieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 6 },
  groupFieldLabelHint: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  groupTextField: { backgroundColor: "#F8FAFC", borderRadius: 12, borderCurve: "continuous", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#0F172A", borderWidth: 1, borderColor: "#E5E7EB" },
  groupFieldError: { borderColor: "#EF4444" },
  groupErrorText: { fontSize: 12, color: "#EF4444", marginTop: 4, marginLeft: 2 },

  // Cover upload
  groupCoverUpload: { height: 110, borderRadius: 14, borderCurve: "continuous", borderWidth: 1.5, borderColor: "#E5E7EB", borderStyle: "dashed", overflow: "hidden", backgroundColor: "#F8FAFC" },
  groupCoverImage: { width: "100%", height: "100%" },
  groupCoverPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  groupCoverPlaceholderText: { fontSize: 11, color: "#9CA3AF" },

  // Avatar upload
  groupAvatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  groupAvatarUpload: { width: 56, height: 56, borderRadius: 14, borderCurve: "continuous", backgroundColor: "rgba(5,150,105,0.08)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  groupAvatarImage: { width: 56, height: 56, borderRadius: 14 },
  groupAvatarHint: { fontSize: 11, color: "#94A3B8" },

  // Group type selector (pill buttons like web)
  groupTypeRow: { flexDirection: "row", gap: 6 },
  groupTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center", backgroundColor: "#F1F5F9" },
  groupTypeBtnActive: { backgroundColor: PRIMARY_COLOR },
  groupTypeBtnText: { fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "capitalize" },
  groupTypeBtnTextActive: { color: "#FFFFFF" },

  // Sport selector button (kept for custom styling)
  sportDropdownBtn: {
    // Additional custom styles can be added here if needed
  },

  // Private toggle card
  groupPrivateCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, padding: 14, backgroundColor: "#F8FAFC", borderRadius: 14, borderCurve: "continuous", borderWidth: 1, borderColor: "#E5E7EB" },
  groupPrivateTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  groupPrivateDesc: { fontSize: 12, color: "#64748B" },
  groupSwitch: { width: 48, height: 28, borderRadius: 14, borderCurve: "continuous", backgroundColor: "#D1D5DB", padding: 2, justifyContent: "center" },
  groupSwitchActive: { backgroundColor: PRIMARY_COLOR },
  groupSwitchThumb: { width: 24, height: 24, borderRadius: 12, borderCurve: "continuous", backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  groupSwitchThumbActive: { alignSelf: "flex-end" },

  // Drag handle
  groupDragHandle: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  groupDragBar: { width: 32, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },

  // Footer
  groupFooter: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  groupCancelBtn: { flex: 1, height: 44, borderRadius: 14, borderCurve: "continuous", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  groupCancelBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  groupCreateBtn: { flex: 1, height: 44, borderRadius: 14, borderCurve: "continuous", backgroundColor: PRIMARY_COLOR, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  groupCreateBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // New Chat Modal tabs & message button
  newChatTabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", position: "relative" },
  newChatTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  newChatTabIndicator: {
    position: "absolute",
    left: 0,
    bottom: -1,
    height: 2,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
  },
  newChatTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  newChatTabTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  // Matches frontend UserRow chat-icon button (UserRow.js:53-55): subtle light background
  // with brand-colored icon, not solid filled.
  newChatMsgBtn: {
    width: 40, height: 40, borderRadius: 14, borderCurve: "continuous",
    backgroundColor: "rgba(241,245,249,0.8)",
    borderWidth: 1, borderColor: "rgba(226,232,240,0.6)",
    alignItems: "center", justifyContent: "center",
  },
});
