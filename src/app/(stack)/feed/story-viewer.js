import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { getStoryGradientColors, STORY_GRADIENTS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import TabRefreshContext from "../../../context/TabRefreshContext";
import feedService from "../../../services/feedService";
import chatService from "../../../services/chatService";
import toast from "../../../utils/toast";
import { mediaUrl } from "../../../utils/media";
import { FONTS, PRIMARY_COLOR } from "../../../constants/theme";
import {
  KCKeyboardAvoidingView,
  useKeyboardState,
} from "../../../lib/keyboardController";

const STORY_DURATION = 8000;

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function StoryViewerScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { user } = useAuth();
  const { triggerRefresh } = useContext(TabRefreshContext);
  const insets = useSafeAreaInsets();

  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const wasLongPressRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const keyboardVisible = useKeyboardState((s) => s.isVisible);

  // Pause/resume story based on keyboard visibility
  const prevKeyboardRef = useRef(false);
  useEffect(() => {
    if (keyboardVisible && !prevKeyboardRef.current) setPaused(true);
    if (!keyboardVisible && prevKeyboardRef.current) setPaused(false);
    prevKeyboardRef.current = keyboardVisible;
  }, [keyboardVisible]);

  /* ── Safe navigation ── */
  const safeGoBack = useCallback(() => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/feed");
      }
    } catch {
      router.replace("/(tabs)/feed");
    }
  }, [router]);

  /* ── Load stories ── */
  const loadStories = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await feedService.getStories();
      const safe = groups || [];
      setStoryGroups(safe);
      const idx = safe.findIndex((g) => String(g.user_id) === String(userId));
      setGroupIndex(idx >= 0 ? idx : 0);
      setStoryIndex(0);
    } catch {
      toast.error("Failed to load stories");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadStories(); }, [loadStories]);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories?.[storyIndex];
  const isOwnStory = String(currentGroup?.user_id) === String(user?.id);
  const segments = useMemo(() => currentGroup?.stories || [], [currentGroup]);

  /* ── Prefetch nearby media ── */
  useEffect(() => {
    [currentGroup?.stories?.[storyIndex + 1], storyGroups[groupIndex + 1]?.stories?.[0]]
      .filter((s) => s?.media_url)
      .forEach((s) => Image.prefetch?.(mediaUrl(s.media_url), "memory-disk").catch(() => {}));
  }, [currentGroup, groupIndex, storyGroups, storyIndex]);

  /* ── Navigation ── */
  const goNext = useCallback(() => {
    if (!currentGroup) { safeGoBack(); return; }
    if (storyIndex + 1 < (currentGroup.stories?.length || 0)) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex + 1 < storyGroups.length) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      safeGoBack();
    }
  }, [currentGroup, groupIndex, safeGoBack, storyGroups.length, storyIndex]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      const prev = storyGroups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(Math.max((prev?.stories?.length || 1) - 1, 0));
    }
  }, [groupIndex, storyGroups, storyIndex]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  /* ── Timer ── */
  const startTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(progressIntervalRef.current);
    startTimeRef.current = Date.now();
    const remaining = STORY_DURATION - elapsedRef.current;

    progressIntervalRef.current = setInterval(() => {
      const el = elapsedRef.current + (Date.now() - startTimeRef.current);
      setProgress(Math.min(el / STORY_DURATION, 1));
    }, 16);

    timerRef.current = setTimeout(() => {
      clearInterval(progressIntervalRef.current);
      elapsedRef.current = 0;
      goNextRef.current();
    }, remaining);
  }, []);

  const pauseTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(progressIntervalRef.current);
    elapsedRef.current += Date.now() - (startTimeRef.current || Date.now());
    startTimeRef.current = 0;
  }, []);

  const resetAndStart = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
    startTimer();
  }, [startTimer]);

  /* ── Story change → view + play ── */
  const storyId = currentStory?.id;
  useEffect(() => {
    if (!storyId) return;
    feedService.viewStory(storyId).catch(() => {});
    if (!paused) resetAndStart();
    else { elapsedRef.current = 0; setProgress(0); }
    return () => { clearTimeout(timerRef.current); clearInterval(progressIntervalRef.current); };
  }, [storyId]); // eslint-disable-line

  /* ── Pause/resume ── */
  useEffect(() => {
    if (!storyId) return;
    if (paused) pauseTimer(); else startTimer();
  }, [paused]); // eslint-disable-line

  /* ── Touch: long-press, swipe, tap ── */
  const handlePressIn = useCallback(() => {
    isLongPressRef.current = false;
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      wasLongPressRef.current = true;
      setPaused(true);
    }, 200);
  }, []);

  const handlePressOut = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      setPaused(false);
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    const t = e.nativeEvent;
    touchStartRef.current = { x: t.pageX, y: t.pageY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const t = e.nativeEvent;
    const dx = t.pageX - touchStartRef.current.x;
    const dy = t.pageY - touchStartRef.current.y;
    if (Date.now() - touchStartRef.current.time > 300) return;
    if (dy < -80 && Math.abs(dy) > Math.abs(dx)) { safeGoBack(); return; }
    if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext(); else goPrev();
    }
  }, [goNext, goPrev, safeGoBack]);

  const handleTapLeft = useCallback(() => {
    if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }
    goPrev();
  }, [goPrev]);

  const handleTapRight = useCallback(() => {
    if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }
    goNext();
  }, [goNext]);

  /* ── Reply ── */
  const handleReply = useCallback(async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !currentStory?.id || isOwnStory || replySending) return;
    setReplySending(true);
    try {
      const convo = await chatService.startConversation(currentGroup.user_id);
      const convoId = convo?.id || convo?._id || convo?.conversation_id || convo?.conversation?.id;
      if (!convoId) throw new Error("Conversation unavailable");
      await chatService.sendMessage(convoId, {
        content: trimmed,
        shared_post: {
          id: currentStory.id,
          user_name: currentGroup.user_name,
          user_avatar: currentGroup.user_avatar,
          content: currentStory.content || "",
          media_url: currentStory.media_url || "",
          bg_color: currentStory.bg_color || "",
          type: "story",
        },
      });
      setReplyText("");
      toast.success("Reply sent!");
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setReplySending(false);
    }
  }, [currentGroup, currentStory, isOwnStory, replySending, replyText]);

  /* ── Delete ── */
  const openDeleteConfirm = () => { setPaused(true); setShowDeleteConfirm(true); };
  const cancelDelete = () => { setShowDeleteConfirm(false); setPaused(false); };

  const confirmDelete = async () => {
    if (!currentStory?.id || deleting) return;
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await feedService.deleteStory(currentStory.id);
      triggerRefresh("feed");
      toast.success("Story deleted");
      const latest = await feedService.getStories();
      const safe = latest || [];
      if (!safe.length) { safeGoBack(); return; }
      setStoryGroups(safe);
      const idx = safe.findIndex((g) => String(g.user_id) === String(currentGroup?.user_id));
      if (idx >= 0) { setGroupIndex(idx); setStoryIndex(0); } else { safeGoBack(); }
    } catch {
      toast.error("Failed to delete story");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Loading state ── */
  if (loading || !currentStory) {
    return (
      <SafeAreaView style={styles.loadingWrap} edges={["top", "bottom"]}>
        <Text style={styles.loadingText}>Loading story...</Text>
      </SafeAreaView>
    );
  }

  /* ── Render ── */
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KCKeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {segments.map((story, i) => (
            <View key={story.id || `seg-${i}`} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: i < storyIndex ? "100%" : i > storyIndex ? "0%" : `${progress * 100}%` },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userBlock}>
            {(currentGroup?.user_avatar || (isOwnStory && user?.avatar)) ? (
              <Image source={{ uri: mediaUrl(currentGroup?.user_avatar || user?.avatar) }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person-outline" size={17} color="#FFFFFF" />
              </View>
            )}
            <View>
              <Text style={styles.userName}>{isOwnStory ? "Your Story" : currentGroup?.user_name || "Story"}</Text>
              <Text style={styles.userMeta}>{timeAgo(currentStory.created_at)}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* <TouchableOpacity activeOpacity={0.85} onPress={() => setPaused((p) => !p)} style={styles.headerBtn}>
              <Ionicons name={paused ? "play" : "pause"} size={18} color="#FFFFFF" />
            </TouchableOpacity> */}
            {isOwnStory ? (
              <TouchableOpacity activeOpacity={0.85} onPress={openDeleteConfirm} style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity activeOpacity={0.85} onPress={safeGoBack} style={styles.headerBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Story content + nav overlay */}
        {/* `bg_color` can be either a gradient key (Tailwind class from frontend, e.g.
            "from-green-500 to-brand-600") OR — for legacy stories — a hex string. If
            it's a known gradient key, render a LinearGradient; otherwise fall back to
            a flat backgroundColor so old stories keep working. */}
        {(() => {
          const isGradientKey = STORY_GRADIENTS.some((g) => g.key === currentStory.bg_color);
          const flatBg = currentStory.media_url
            ? "#000"
            : (isGradientKey ? undefined : (currentStory.bg_color || "#059669"));
          return (
            <View style={[styles.storyCard, flatBg ? { backgroundColor: flatBg } : null]}>
              {!currentStory.media_url && isGradientKey ? (
                <LinearGradient
                  colors={getStoryGradientColors(currentStory.bg_color)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              {currentStory.media_url ? (
                <Image
                  source={{ uri: mediaUrl(currentStory.media_url) }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              ) : null}
          {currentStory.content ? (
            <Text style={styles.storyText}>{currentStory.content}</Text>
          ) : null}

          {/* Paused — no visible indicator */}

          {/* Tap + swipe zones */}
          <View style={styles.navOverlay} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Pressable style={styles.navLeft} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handleTapLeft} />
            <Pressable style={styles.navRight} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handleTapRight} />
          </View>
            </View>
          );
        })()}

        {/* Own story: view count (inline) */}
        {isOwnStory ? (
          <View style={styles.viewsRow}>
            <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.viewsText}>
              {currentStory?.view_count || 0} {(currentStory?.view_count || 0) === 1 ? "view" : "views"}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Reply bar — below story card, sticks above keyboard */}
      {!isOwnStory ? (
        <View style={[styles.replyOuter, { paddingBottom: keyboardVisible ? 4 : insets.bottom + 8 }]}>
          <View style={styles.replyBar}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder={`Reply to ${currentGroup?.user_name?.split(" ")[0] || ""}...`}
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.replyInput}
              editable={!replySending}
              returnKeyType="send"
              onSubmitEditing={handleReply}
            />
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
              onPress={handleReply}
              disabled={!replyText.trim() || replySending}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Delete modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={cancelDelete} statusBarTranslucent>
        <Pressable style={styles.deleteOverlay} onPress={cancelDelete}>
          <View style={styles.deleteCard}>
            <View style={styles.deleteBody}>
              <Text style={styles.deleteTitle}>Delete Story?</Text>
              <Text style={styles.deleteDesc}>This story will be permanently removed and can't be recovered.</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity activeOpacity={0.85} onPress={confirmDelete} disabled={deleting} style={styles.deleteAction}>
              <Text style={styles.deleteActionText}>{deleting ? "Deleting..." : "Delete"}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity activeOpacity={0.85} onPress={cancelDelete} style={styles.deleteAction}>
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      </KCKeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#03120D",
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#03120D",
  },
  loadingText: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },

  /* Progress */
  progressRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
  },

  /* Header */
  header: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  userName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  userMeta: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "rgba(255,255,255,0.5)",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  /* Story card */
  storyCard: {
    flex: 1,
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  storyText: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: FONTS.bodyExtraBold,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 24,
    zIndex: 1,
  },

  /* Paused indicator */
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  pausedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Reply — below story card in normal flow */
  replyOuter: {
    paddingHorizontal: 14,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 6,
    height: 48,
  },
  replyInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  viewsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
  },
  viewsText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "rgba(255,255,255,0.5)",
  },

  /* Nav overlay */
  navOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 2,
  },
  navLeft: {
    flex: 0.3,
  },
  navRight: {
    flex: 0.7,
  },

  /* Delete modal */
  deleteOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  deleteCard: {
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  deleteBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: "center",
  },
  deleteTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginBottom: 6,
  },
  deleteDesc: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  deleteAction: {
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteActionText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#EF4444",
  },
  cancelActionText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
  },
});
