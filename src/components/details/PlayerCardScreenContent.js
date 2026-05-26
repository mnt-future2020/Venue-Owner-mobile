import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  UserPlus,
  UserMinus,
  MessageCircle,
  Share2,
  Flame,
  Star,
  Trophy,
  Globe,
  Clock,
  Building2,
  Shield,
  Award,
  BarChart3,
  Heart,
  BookOpen,
  DollarSign,
  Calendar,
  TrendingUp,
  Sparkles,
  Zap,
  X,
  Medal,
  Target,
  Swords,
  GraduationCap,
  BadgeCheck,
  ChevronRight,
  MapPin,
  Users,
  CalendarDays,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../ui/AppCard";
import PostsGrid from "../profile/PostsGrid";
import FollowListSheet from "../profile/FollowListSheet";
import EditProfileSheet from "../profile/EditProfileSheet";
import ProfileSkeleton from "../skeletons/ProfileSkeleton";
import playerService from "../../services/playerService";
import coachingService from "../../services/coachingService";
import socialService from "../../services/socialService";
import engagementService from "../../services/engagementService";
import analyticsService from "../../services/analyticsService";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";
import chatService from "../../services/chatService";
import toast from "../../utils/toast";
import { safePush } from "../../services/navigationGuard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ENGAGEMENT_ACTIONS = [
  {
    action: "Session Booking",
    points: "+10",
    sub: "Arena slot confirmation",
    icon: Sparkles,
  },
  {
    action: "Daily Presence",
    points: "+5",
    sub: "Maintain your streak",
    icon: Flame,
  },
  {
    action: "Feed Contributions",
    points: "+3",
    sub: "Each post published",
    icon: TrendingUp,
  },
  {
    action: "Sport Stories",
    points: "+3",
    sub: "Story and update sharing",
    icon: Award,
  },
  {
    action: "Arena Interaction",
    points: "+2",
    sub: "Likes and comments",
    icon: Zap,
  },
];
const ENGAGEMENT_LEVELS = [
  { label: "Bench", threshold: 0 },
  { label: "Rookie", threshold: 20 },
  { label: "Pro", threshold: 40 },
  { label: "All-Star", threshold: 60 },
  { label: "Legend", threshold: 80 },
];
const SCREEN_HEIGHT = Dimensions.get("window").height;

function getTierInfo(rating) {
  const r = Number(rating || 0);
  if (r >= 2000) return { label: "Elite", color: "#34D399", bg: "#ECFDF5" };
  if (r >= 1700) return { label: "Pro", color: "#10B981", bg: "#ECFDF5" };
  if (r >= 1400)
    return { label: "Intermediate", color: "#059669", bg: "#ECFDF5" };
  return { label: "Beginner", color: "#64748B", bg: "#F8FAFC" };
}

function CircularProgress({ score, size = 72, strokeWidth = 6 }) {
  const progress = Math.min(Math.max(score || 0, 0), 100);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "#F1F5F9",
          position: "absolute",
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: PRIMARY_COLOR,
          borderLeftColor: progress > 75 ? PRIMARY_COLOR : "transparent",
          borderBottomColor: progress > 50 ? PRIMARY_COLOR : "transparent",
          borderRightColor: progress > 25 ? PRIMARY_COLOR : "transparent",
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
        {score || 0}
      </Text>
    </View>
  );
}

function ScoreRing({
  score = 0,
  size = 82,
  strokeWidth = 4,
  arcRotation = 0,
  textSize = 18,
}) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${Math.max(8, (safeScore / 100) * circumference)} ${circumference}`;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size / 2,
          backgroundColor: "#FFFFFF",
        }}
      />
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F8FAFC"
          strokeWidth={strokeWidth}
          fill="#FFFFFF"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={PRIMARY_COLOR}
          strokeWidth={strokeWidth + 1}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={strokeDasharray}
          rotation={-90 + arcRotation}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <Text style={{ fontSize: textSize, fontWeight: "900", color: "#0F172A" }}>
        {safeScore}
      </Text>
    </View>
  );
}

function fmt12h(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

export default function PlayerCardScreenContent({ onNameLoaded }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams();
  const { user } = useAuth();
  const [card, setCard] = useState(null);
  const [stats, setStats] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [career, setCareer] = useState(null);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["posts"]));
  const indicatorProgress = useRef(new Animated.Value(0)).current;
  const activeTabRef = useRef("posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowList, setShowFollowList] = useState(false);
  const [followListTab, setFollowListTab] = useState("followers");
  const [avatarPreview, setAvatarPreview] = useState(false);
  const [coachData, setCoachData] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEngagementGuide, setShowEngagementGuide] = useState(false);

  const isOwnProfile = !userId || userId === "me" || userId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : userId;

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        const cardData = isOwnProfile
          ? await playerService.getMyPlayerCard().catch(() => null)
          : await playerService.getPlayerCard(userId).catch(() => null);
        setCard(cardData);

        if (cardData) {
          setIsFollowing(cardData.is_following || false);
          if (onNameLoaded && cardData.name) onNameLoaded(cardData.name);
        }

        // Load additional data in parallel
        const promises = [];

        if (!isOwnProfile && userId) {
          promises.push(
            engagementService.getEngagementScore(userId).catch(() => null),
            engagementService.getCompatibility(userId).catch(() => null),
            socialService.getFollowStatus(userId).catch(() => null),
          );
        } else {
          promises.push(
            engagementService.getMyEngagement().catch(() => null),
            Promise.resolve(null),
            Promise.resolve(null),
          );
        }

        // If coach, load coach data
        if (cardData?.role === "coach" && userId) {
          promises.push(coachingService.getCoach(userId).catch(() => null));
        } else {
          promises.push(Promise.resolve(null));
        }

        // Career stats
        const targetId = userId || user?._id || user?.id;
        if (targetId) {
          promises.push(
            analyticsService
              .getPlayerAnalytics({ user_id: targetId })
              .catch(() => null),
            analyticsService.getPlayerCareer?.(targetId).catch(() => null),
          );
        } else {
          promises.push(Promise.resolve(null), Promise.resolve(null));
        }

        const [
          engData,
          compatData,
          followStatus,
          coach,
          statsData,
          careerData,
        ] = await Promise.all(promises);
        setEngagement(engData);
        setCompatibility(compatData);
        if (followStatus?.is_following !== undefined) {
          setIsFollowing(followStatus.is_following);
        }
        setCoachData(coach);
        setStats(statsData);
        if (careerData) setCareer(careerData);
      } catch {
        if (!isRefresh) toast.error("Failed to load player card");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, isOwnProfile, user?.id],
  );

  useEffect(() => {
    let cancelled = false;
    loadData().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleFollow = async () => {
    if (followLoading) return;
    const prev = isFollowing;
    const prevCount = card?.followers_count || 0;
    // Optimistic update
    setIsFollowing(!prev);
    setCard((c) =>
      c
        ? {
            ...c,
            followers_count: !prev ? prevCount + 1 : Math.max(0, prevCount - 1),
          }
        : c,
    );
    setFollowLoading(true);
    try {
      const res = await socialService.toggleFollow(userId);
      setIsFollowing(!!res.following);
    } catch {
      // Revert on error
      setIsFollowing(prev);
      setCard((c) => (c ? { ...c, followers_count: prevCount } : c));
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      const data = await chatService.startConversation(userId);
      const convoId = data.id || data._id || data.conversation_id;
      const name = card?.name || card?.username || "Chat";
      const avatar = card?.avatar || "";
      safePush(
        router,
        `/(stack)/chat/${convoId}?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}&type=dm`,
      );
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${card?.name || "this player"}'s profile on Lobbi!`,
      });
    } catch {
      // cancelled
    }
  };

  const openFollowList = (tab) => {
    setFollowListTab(tab);
    setShowFollowList(true);
  };

  const tier = useMemo(
    () => getTierInfo(card?.skill_rating),
    [card?.skill_rating],
  );
  const filteredSports = useMemo(() => {
    const rawSports =
      Array.isArray(card?.sports) && card.sports.length > 0
        ? card.sports
        : card?.primary_sport
          ? [card.primary_sport]
          : [];

    return rawSports
      .map((sport) => String(sport || "").trim())
      .filter((sport) => sport && sport.toLowerCase() !== "none")
      .slice(0, 3);
  }, [card?.primary_sport, card?.sports]);

  const tabs = useMemo(() => {
    const base = [
      {
        key: "posts",
        label: "Posts",
        IconComponent: null,
        ionIcon: "grid-outline",
      },
      { key: "stats", label: "Stats", IconComponent: BarChart3 },
    ];
    if (card?.role === "coach" || coachData) {
      base.push({ key: "coaching", label: "Coaching", IconComponent: Users });
    }
    if (isOwnProfile) {
      base.push({ key: "badges", label: "Badges", IconComponent: Award });
    }
    return base;
  }, [card?.role, coachData, isOwnProfile]);
  const tabWidth = useMemo(
    () => (SCREEN_WIDTH - 32) / Math.max(tabs.length, 1),
    [tabs.length],
  );

  const badges = useMemo(() => {
    if (Array.isArray(card?.badges) && card.badges.length) return card.badges;
    return [
      { name: "Starter", description: "Your first steps in Lobbi." },
      {
        name: "Reliable",
        description: "Consistent bookings and participation.",
      },
    ];
  }, [card?.badges]);

  // Match frontend PlayerCardPage exactly — it reads `engagementScore.level`
  // straight from the API (`/engagement/score`). Fall back to a local score-band
  // mapping if the backend hasn't included `level` yet (older payloads).
  const engagementLevel = useMemo(() => {
    if (engagement?.level) return engagement.level;
    const score = engagement?.score || engagement?.engagement_score || 0;
    if (score >= 80) return "Legend";
    if (score >= 60) return "All-Star";
    if (score >= 40) return "Pro";
    if (score >= 20) return "Rookie";
    return "Bench";
  }, [engagement]);
  const overallScore = card?.overall_score ?? 0;
  // Exact mirror of frontend PlayerCardPage stat field reads — same source fields,
  // same fallbacks (default skill rating 1500, no `stats`/`career` aliases). The
  // mobile-only aliases were defensive but masked backend data inconsistencies and
  // let stale fields override the canonical card values.
  const socialScore = engagement?.score || 0;
  const ratingValue = card?.skill_rating ?? user?.skill_rating ?? 1500;
  const gamesPlayed = card?.total_games ?? user?.total_games ?? 0;
  const bookingsCount = card?.total_bookings ?? 0;
  const wins = card?.wins ?? 0;
  const losses = card?.losses ?? 0;
  const draws = card?.draws ?? 0;
  const matchTotal = Math.max(wins + losses + draws, 1);
  // Win rate — frontend PlayerCardPage.js:196-206: wins / (wins+losses+draws) * 100
  const winRate = Math.round((wins / matchTotal) * 100);
  const reliablePct = card?.reliability_score ?? 0;
  const winsPct = Math.round((wins / matchTotal) * 100);
  const lossesPct = Math.round((losses / matchTotal) * 100);
  const drawsPct = Math.max(0, 100 - winsPct - lossesPct);
  const trainingValue = career?.training_hours ?? 0;
  // Exact mirror of frontend CareerSection.js:16-21 — same field names, same fallbacks.
  // Removed mobile-only `organizations_count`/`orgs`/`matches`/`events`/`tournaments`
  // aliases and the `gamesPlayed` fallback (which counted win+loss+draw rows and
  // inflated the Matches stat beyond what the backend's `matches_played` represents).
  const orgsValue = career?.organizations?.length ?? 0;
  const matchesValue = career?.matches_played || 0;
  const eventsValue = career?.tournaments_played ?? 0;

  useEffect(() => {
    const currentIndex = Math.max(
      0,
      tabs.findIndex((tab) => tab.key === activeTab),
    );
    activeTabRef.current = activeTab;
    Animated.timing(indicatorProgress, {
      toValue: currentIndex,
      useNativeDriver: true,
      duration: 12,
    }).start();
  }, [activeTab, indicatorProgress, tabs]);

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTabRef.current) return;
      const nextIndex = Math.max(
        0,
        tabs.findIndex((tab) => tab.key === nextTab),
      );
      activeTabRef.current = nextTab;
      setVisitedTabs((prev) => {
        if (prev.has(nextTab)) return prev;
        const next = new Set(prev);
        next.add(nextTab);
        return next;
      });
      indicatorProgress.stopAnimation();
      Animated.timing(indicatorProgress, {
        toValue: nextIndex,
        useNativeDriver: true,
        duration: 10,
      }).start();
      setActiveTab(nextTab);
    },
    [indicatorProgress, tabs],
  );

  const publicTabsSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
        onPanResponderMove: (_, gestureState) => {
          const currentIndex = Math.max(
            0,
            tabs.findIndex((tab) => tab.key === activeTabRef.current),
          );
          const relativeProgress = Math.max(
            -1,
            Math.min(1, -gestureState.dx / Math.max(SCREEN_WIDTH * 0.5, 1)),
          );
          const dragProgress = Math.max(
            Math.max(0, currentIndex - 1),
            Math.min(
              Math.min(tabs.length - 1, currentIndex + 1),
              currentIndex + relativeProgress,
            ),
          );
          indicatorProgress.setValue(dragProgress);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentIndex = Math.max(
            0,
            tabs.findIndex((tab) => tab.key === activeTabRef.current),
          );
          let nextIndex = currentIndex;
          if (gestureState.dx <= -10 || gestureState.vx <= -0.05) {
            nextIndex = Math.min(tabs.length - 1, currentIndex + 1);
          } else if (gestureState.dx >= 10 || gestureState.vx >= 0.05) {
            nextIndex = Math.max(0, currentIndex - 1);
          }
          handleTabChange(tabs[nextIndex]?.key || activeTabRef.current);
        },
        onPanResponderTerminate: () => {
          const currentIndex = Math.max(
            0,
            tabs.findIndex((tab) => tab.key === activeTabRef.current),
          );
          Animated.timing(indicatorProgress, {
            toValue: currentIndex,
            useNativeDriver: true,
            duration: 10,
          }).start();
        },
      }),
    [handleTabChange, indicatorProgress, tabs],
  );

  const indicatorTranslateX = indicatorProgress.interpolate({
    inputRange: tabs.map((_, index) => index),
    outputRange: tabs.map((_, index) => index * tabWidth),
    extrapolate: "clamp",
  });

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!card) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Player Not Found</Text>
            <Text style={styles.emptySubtitle}>
              This profile may have been removed or is unavailable.
            </Text>
          </View>
        </AppCard>
      </ScrollView>
    );
  }

  const avatarUri = card.avatar || (isOwnProfile ? user?.avatar : null);
  const postCount = card.post_count ?? 0;
  const renderedTabs = tabs.map((item) => {
    const active = activeTab === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        activeOpacity={0.92}
        onPress={() => handleTabChange(item.key)}
        style={styles.tabButton}
      >
        {item.IconComponent ? (
          <item.IconComponent
            size={22}
            color={active ? PRIMARY_COLOR : "#94A3B8"}
          />
        ) : (
          <Ionicons
            name={item.ionIcon}
            size={18}
            color={active ? PRIMARY_COLOR : "#94A3B8"}
          />
        )}
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <>
      <ScrollView
        collapsable={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8),
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
      >
        {/* Hero Card */}
        <AppCard style={styles.heroCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatarShell}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => avatarUri && setAvatarPreview(true)}
              >
                <View
                  style={[
                    styles.avatarRing,
                    card?.is_verified && styles.avatarRingVerified,
                    !avatarUri && styles.avatarRingEmpty,
                  ]}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: mediaUrl(avatarUri) }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons name="person-outline" size={28} color="#64748B" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              {card?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={PRIMARY_COLOR}
                  />
                </View>
              )}
            </View>

            <View style={styles.topStats}>
              {[
                { label: "Posts", value: postCount, action: null },
                {
                  label: "Followers",
                  value: card?.followers_count ?? 0,
                  action: () => openFollowList("followers"),
                },
                {
                  label: "Following",
                  value: card?.following_count ?? 0,
                  action: () => openFollowList("following"),
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.topStatItem}
                  onPress={item.action}
                  disabled={!item.action}
                  activeOpacity={0.7}
                >
                  <Text style={styles.topStatValue}>{item.value}</Text>
                  <Text style={styles.topStatLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name Row */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{card.name || "Player"}</Text>
            {(card?.current_streak || 0) > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.streakPill}
                onPress={() => handleTabChange("stats")}
              >
                <Flame size={11} color="#F97316" />
                <Text style={styles.streakPillText}>{card.current_streak}</Text>
              </TouchableOpacity>
            )}
            {card?.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={PRIMARY_COLOR}
              />
            )}
            {/* Tier pill — only for players, label sourced from backend's
                `overall_tier` (matches frontend PlayerCardPage tier memo). */}
            {card?.role === "player" ? (
              <View
                style={[
                  styles.tierPill,
                  { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
                ]}
              >
                <Text style={[styles.tierPillText, { color: "#10B981" }]}>
                  {(card?.overall_tier || "Beginner").toUpperCase()}
                </Text>
              </View>
            ) : null}

            {/* Role pill — Venue Owner / Coach. Mirrors frontend
                PlayerCardHeader.js:148-156 (player & super_admin skipped). */}
            {card?.role && card.role !== "player" && card.role !== "super_admin" ? (
              <View
                style={[
                  styles.tierPill,
                  card.role === "venue_owner"
                    ? { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }
                    : card.role === "coach"
                      ? { backgroundColor: "#F5F3FF", borderColor: "#C4B5FD" }
                      : { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
                ]}
              >
                <Text
                  style={[
                    styles.tierPillText,
                    card.role === "venue_owner"
                      ? { color: "#D97706" }
                      : card.role === "coach"
                        ? { color: "#8B5CF6" }
                        : { color: "#64748B" },
                  ]}
                >
                  {card.role === "venue_owner"
                    ? "VENUE OWNER"
                    : card.role === "coach"
                      ? "COACH"
                      : card.role.replace("_", " ").toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Sports */}
          {filteredSports.length > 0 ? (
            <View style={styles.metaRow}>
              {filteredSports.map((sport, i) => (
                <View key={i} style={styles.sportPill}>
                  <Text style={styles.sportPillText}>{sport}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Bio */}
          <Text style={styles.bioText}>
            {card.bio ||
              (card.role === "coach"
                ? "Coaching bio not set yet."
                : "Bio not set yet.")}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.actionButton}
                  onPress={() => setShowEditProfile(true)}
                >
                  <Text style={styles.actionLabel}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <Share2 size={14} color="#0F172A" />
                  <Text style={styles.actionLabel}>Share</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton,
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? "#64748B" : "#FFFFFF"}
                    />
                  ) : isFollowing ? (
                    <>
                      <UserMinus size={14} color="#64748B" />
                      <Text style={styles.followingLabel}>Following</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} color="#FFFFFF" />
                      <Text style={styles.followLabel}>Follow</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.actionButton}
                  onPress={handleMessage}
                >
                  <MessageCircle size={14} color="#0F172A" />
                  <Text style={styles.actionLabel}>Message</Text>
                </TouchableOpacity>
                {card.role === "coach" ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.shareBtn}
                    onPress={() => setActiveTab("coaching")}
                  >
                    <Ionicons name="chevron-down" size={18} color="#64748B" />
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </AppCard>

        {/* Tabs */}
        <AppCard style={styles.tabsCard}>
          <View style={styles.tabsShell}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabsIndicator,
                {
                  width: tabWidth,
                  transform: [{ translateX: indicatorTranslateX }],
                },
              ]}
            />
            <View style={styles.tabsRow}>{renderedTabs}</View>
          </View>
        </AppCard>

        <View
          style={styles.tabContentStack}
          {...publicTabsSwipeResponder.panHandlers}
        >
          {visitedTabs.has("posts") && (
            <View
              style={[
                styles.tabPageFill,
                activeTab === "posts" ? null : styles.hiddenTabPage,
              ]}
            >
              <View style={styles.postsContainer}>
                <PostsGrid userId={targetUserId} />
              </View>
            </View>
          )}

          {visitedTabs.has("stats") && (
            <View
              style={[
                styles.tabPageFill,
                activeTab === "stats" ? styles.statsPage : styles.hiddenTabPage,
              ]}
            >
              {/* Score cards — gated exactly like frontend PlayerCardPage:
                  - Overall Game Performance: only for role === "player"
                  - Social Media Engagement: only when score > 0
                  Venue owner / coach with no engagement → no cards shown. */}
              {(card?.role === "player" && card?.overall_score !== undefined) || socialScore > 0 ? (
                <View style={styles.scoreCardsRow}>
                  {card?.role === "player" && card?.overall_score !== undefined ? (
                    <AppCard style={styles.scoreDialCard}>
                      <View style={styles.scoreDialHeader}>
                        <Text style={styles.scoreDialTitle}>
                          OVERALL GAME PERFORMANCE
                        </Text>
                        <BarChart3 size={14} color={PRIMARY_COLOR} />
                      </View>
                      <View style={styles.scoreDialBody}>
                        <ScoreRing
                          score={overallScore}
                          size={96}
                          strokeWidth={5}
                          arcRotation={0}
                          textSize={22}
                        />
                        <Text style={styles.scoreDialLabel}>
                          {(card?.overall_tier || tier.label).toUpperCase()}
                        </Text>
                      </View>
                    </AppCard>
                  ) : null}

                  {socialScore > 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.92}
                      style={styles.scoreDialPressable}
                      onPress={() => setShowEngagementGuide(true)}
                    >
                      <AppCard style={styles.scoreDialCard}>
                        <View style={styles.scoreDialHeader}>
                          <Text style={styles.scoreDialTitle}>
                            SOCIAL MEDIA ENGAGEMENT
                          </Text>
                          <Globe size={14} color={PRIMARY_COLOR} />
                        </View>
                        <View style={styles.scoreDialBody}>
                          <ScoreRing
                            score={socialScore}
                            size={96}
                            strokeWidth={5}
                            arcRotation={12}
                            textSize={22}
                          />
                          <Text style={styles.scoreDialLabel}>
                            LEVEL {engagementLevel.toUpperCase()}
                          </Text>
                        </View>
                      </AppCard>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {/* Player-only stats (hidden for coach & venue_owner) — mirrors
                  frontend PlayerCardPage.js:1000 `card.role === "player" && (…)` */}
              {card?.role === "player" ? (
              <>

              <AppCard style={styles.statsStripCard}>
                <View style={styles.statsStripRow}>
                  <View
                    style={[styles.statsStripCell, styles.statsStripDivider]}
                  >
                    <Text
                      style={[
                        styles.statsStripValue,
                        styles.statsStripValueAccent,
                      ]}
                    >
                      {ratingValue}
                    </Text>
                    <Text style={styles.statsStripLabel}>RATING</Text>
                  </View>
                  <View
                    style={[styles.statsStripCell, styles.statsStripDivider]}
                  >
                    <Text style={styles.statsStripValue}>{winRate}%</Text>
                    <Text style={styles.statsStripLabel}>WIN RATE</Text>
                  </View>
                  <View style={styles.statsStripCell}>
                    <Text style={styles.statsStripValue}>{reliablePct}%</Text>
                    <Text style={styles.statsStripLabel}>RELIABLE</Text>
                  </View>
                </View>
              </AppCard>

              <AppCard style={styles.recordCard}>
                <View style={styles.recordTopRow}>
                  <View style={[styles.recordTopCell, styles.recordTopDivider]}>
                    <View style={styles.recordMiniHeader}>
                      <CalendarDays size={12} color="#94A3B8" />
                      <Text style={styles.recordMiniLabel}>BOOKINGS</Text>
                    </View>
                    <Text style={styles.recordTopValue}>{bookingsCount}</Text>
                  </View>
                  <Pressable
                    style={styles.recordTopCell}
                    onPress={() => setShowGameHistory(true)}
                  >
                    <View style={styles.recordMiniHeader}>
                      <Swords size={12} color="#94A3B8" />
                      <Text style={styles.recordMiniLabel}>GAMES PLAYED</Text>
                      <ChevronRight size={11} color="#94A3B8" />
                    </View>
                    <Text style={styles.recordTopValue}>{gamesPlayed}</Text>
                  </Pressable>
                </View>

                <View style={styles.recordSection}>
                  <Text style={styles.recordSectionLabel}>MATCH RECORD</Text>
                  <View style={styles.recordBar}>
                    <View
                      style={[
                        styles.recordBarFill,
                        { width: `${winsPct}%`, backgroundColor: "#10B981" },
                      ]}
                    />
                    <View
                      style={[
                        styles.recordBarFill,
                        { width: `${lossesPct}%`, backgroundColor: "#EF4444" },
                      ]}
                    />
                    <View
                      style={[
                        styles.recordBarFill,
                        { width: `${drawsPct}%`, backgroundColor: "#CBD5E1" },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.recordSummaryRow}>
                  <View
                    style={[
                      styles.recordSummaryCell,
                      styles.recordSummaryDivider,
                    ]}
                  >
                    <View style={styles.recordSummaryLabelRow}>
                      <View
                        style={[
                          styles.recordSummaryDot,
                          { backgroundColor: "#10B981" },
                        ]}
                      />
                      <Text style={styles.recordSummaryLabel}>WINS</Text>
                    </View>
                    <Text style={styles.recordSummaryValue}>{wins}</Text>
                  </View>
                  <View
                    style={[
                      styles.recordSummaryCell,
                      styles.recordSummaryDivider,
                    ]}
                  >
                    <View style={styles.recordSummaryLabelRow}>
                      <View
                        style={[
                          styles.recordSummaryDot,
                          { backgroundColor: "#EF4444" },
                        ]}
                      />
                      <Text style={styles.recordSummaryLabel}>LOSSES</Text>
                    </View>
                    <Text style={styles.recordSummaryValue}>{losses}</Text>
                  </View>
                  <View style={styles.recordSummaryCell}>
                    <View style={styles.recordSummaryLabelRow}>
                      <View
                        style={[
                          styles.recordSummaryDot,
                          { backgroundColor: "#CBD5E1" },
                        ]}
                      />
                      <Text style={styles.recordSummaryLabel}>DRAWS</Text>
                    </View>
                    <Text style={styles.recordSummaryValue}>{draws}</Text>
                  </View>
                </View>
              </AppCard>

              {/* Sports Played */}
              {Object.keys(card?.sports_played || {}).length > 0 && (
                <AppCard style={styles.sportsPlayedCard}>
                  <Text style={styles.recordSectionLabel}>SPORTS PLAYED</Text>
                  <View style={styles.sportsPlayedWrap}>
                    {Object.entries(card.sports_played)
                      .sort(([, a], [, b]) => b - a)
                      .map(([sport, count]) => (
                        <View key={sport} style={styles.sportsPlayedChip}>
                          <Text style={styles.sportsPlayedName}>{sport}</Text>
                          <Text style={styles.sportsPlayedCount}>{count}</Text>
                        </View>
                      ))}
                  </View>
                </AppCard>
              )}

              <AppCard style={styles.careerOverviewCard}>
                <View style={styles.careerMiniHeader}>
                  <Medal size={12} color="#94A3B8" />
                  <Text style={styles.recordSectionLabelInline}>
                    CAREER OVERVIEW
                  </Text>
                </View>
                <View style={styles.careerOverviewRow}>
                  <View
                    style={[
                      styles.careerOverviewCell,
                      styles.careerOverviewDivider,
                    ]}
                  >
                    <Clock size={15} color="#94A3B8" />
                    <Text style={styles.careerOverviewValue}>
                      {trainingValue}h
                    </Text>
                    <Text style={styles.careerOverviewLabel}>TRAINING</Text>
                  </View>
                  <View
                    style={[
                      styles.careerOverviewCell,
                      styles.careerOverviewDivider,
                    ]}
                  >
                    <Users size={15} color="#94A3B8" />
                    <Text style={styles.careerOverviewValue}>{orgsValue}</Text>
                    <Text style={styles.careerOverviewLabel}>ORGS</Text>
                  </View>
                  <View
                    style={[
                      styles.careerOverviewCell,
                      styles.careerOverviewDivider,
                    ]}
                  >
                    <Swords size={15} color="#94A3B8" />
                    <Text style={styles.careerOverviewValue}>
                      {matchesValue}
                    </Text>
                    <Text style={styles.careerOverviewLabel}>MATCHES</Text>
                  </View>
                  <View style={styles.careerOverviewCell}>
                    <Medal size={15} color="#94A3B8" />
                    <Text style={styles.careerOverviewValue}>
                      {eventsValue}
                    </Text>
                    <Text style={styles.careerOverviewLabel}>EVENTS</Text>
                  </View>
                </View>
              </AppCard>
              </>
              ) : null}
            </View>
          )}

          {visitedTabs.has("badges") && (
            <View
              style={[
                styles.tabPageFill,
                activeTab === "badges"
                  ? styles.sectionSpacing
                  : styles.hiddenTabPage,
              ]}
            >
              <AppCard style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Badges</Text>
                {badges.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.badgeRow}>
                    <View style={styles.badgeIcon}>
                      <Award size={18} color={PRIMARY_COLOR} />
                    </View>
                    <View style={styles.badgeBody}>
                      <Text style={styles.badgeTitle}>{item.name}</Text>
                      <Text style={styles.badgeMeta}>
                        {item.description || "Achievement unlocked on Lobbi."}
                      </Text>
                    </View>
                  </View>
                ))}
              </AppCard>
            </View>
          )}

          {visitedTabs.has("coaching") &&
            activeTab === "coaching" &&
            (coachData || card?.role === "coach") && (
              <View style={[styles.tabPageFill, styles.sectionSpacing]}>
                <AppCard style={styles.coachCard}>
                  <Text style={styles.sectionTitle}>Coaching Profile</Text>

                  {(coachData?.bio || card?.coach_bio) && (
                    <View style={styles.coachSection}>
                      <Text style={styles.coachSectionLabel}>About</Text>
                      <Text style={styles.coachBio}>
                        {coachData?.bio || card?.coach_bio}
                      </Text>
                    </View>
                  )}

                  <View style={styles.coachStatsRow}>
                    {[
                      {
                        label: "Experience",
                        value:
                          coachData?.experience_years ||
                          card?.experience_years ||
                          "N/A",
                        suffix: coachData?.experience_years ? " yrs" : "",
                      },
                      {
                        label: "Students",
                        value:
                          coachData?.total_students ||
                          card?.total_students ||
                          0,
                        suffix: "",
                      },
                      {
                        label: "Rating",
                        value:
                          coachData?.coach_rating ||
                          card?.coach_rating ||
                          "N/A",
                        suffix: "",
                      },
                    ].map((stat) => (
                      <View key={stat.label} style={styles.coachStatItem}>
                        <Text style={styles.coachStatValue}>
                          {stat.value}
                          {stat.suffix}
                        </Text>
                        <Text style={styles.coachStatLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>

                  {(coachData?.specializations || card?.specializations || [])
                    .length > 0 && (
                    <View style={styles.coachSection}>
                      <Text style={styles.coachSectionLabel}>
                        Specializations
                      </Text>
                      <View style={styles.specRow}>
                        {(
                          coachData?.specializations ||
                          card?.specializations ||
                          []
                        ).map((spec, idx) => (
                          <View key={idx} style={styles.specPill}>
                            <Text style={styles.specText}>{spec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {(coachData?.session_price || card?.session_price) && (
                    <View style={styles.priceRow}>
                      <DollarSign size={16} color={PRIMARY_COLOR} />
                      <Text style={styles.priceText}>
                        {"\u20B9"}
                        {coachData?.session_price || card?.session_price} /
                        session
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.bookSessionBtn}
                    activeOpacity={0.9}
                    onPress={() => safePush(router, "/(stack)/coaching")}
                  >
                    <Calendar size={16} color="#FFFFFF" />
                    <Text style={styles.bookSessionText}>Book Session</Text>
                  </TouchableOpacity>
                </AppCard>
              </View>
            )}
        </View>
      </ScrollView>

      <Modal visible={avatarPreview} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setAvatarPreview(false)}>
        <Pressable style={styles.lightboxOverlay} onPress={() => setAvatarPreview(false)}>
          <View onStartShouldSetResponder={() => true} style={styles.lightboxContent}>
            <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setAvatarPreview(false)} activeOpacity={0.7}>
              <X size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Image source={{ uri: mediaUrl(avatarUri) }} style={styles.lightboxImage} contentFit="cover" />
            {card?.name ? <Text style={styles.lightboxName}>{card.name}</Text> : null}
          </View>
        </Pressable>
      </Modal>

      <FollowListSheet
        visible={showFollowList}
        onClose={() => {
          setShowFollowList(false);
          loadData(true);
        }}
        userId={targetUserId}
        initialTab={followListTab}
        onFollowChange={(_id, isNowFollowing) => {
          setCard((prev) => {
            if (!prev) return prev;
            // If viewing own profile, update following_count
            // If viewing other's profile, update followers_count
            if (isOwnProfile) {
              return {
                ...prev,
                following_count: isNowFollowing
                  ? (prev.following_count || 0) + 1
                  : Math.max(0, (prev.following_count || 1) - 1),
              };
            }
            return {
              ...prev,
              followers_count: isNowFollowing
                ? (prev.followers_count || 0) + 1
                : Math.max(0, (prev.followers_count || 1) - 1),
            };
          });
        }}
      />

      {isOwnProfile && (
        <EditProfileSheet
          visible={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          card={card}
          onSaved={() => {
            setShowEditProfile(false);
            loadData(true);
          }}
        />
      )}

      {/* Game History Modal */}
      <Modal
        visible={showGameHistory}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowGameHistory(false)}
      >
        <View style={styles.gameHistoryOverlay}>
          <View
            style={[
              styles.gameHistorySheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.gameHistoryHeader}>
              <View>
                <Text style={styles.gameHistoryTitle}>Game History</Text>
                <Text style={styles.gameHistorySubtitle}>
                  {card?.total_games || 0} games across{" "}
                  {(card?.game_history || []).length} sessions
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowGameHistory(false)}
                style={styles.gameHistoryCloseBtn}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.gameHistorySummary}>
              {[
                { value: card?.wins || 0, label: "Wins", color: "#10B981" },
                { value: card?.losses || 0, label: "Losses", color: "#EF4444" },
                { value: card?.draws || 0, label: "Draws", color: "#94A3B8" },
              ].map((s, i) => (
                <View
                  key={s.label}
                  style={[
                    styles.gameHistorySumCell,
                    i < 2 && styles.gameHistorySumDivider,
                  ]}
                >
                  <Text
                    style={[styles.gameHistorySumValue, { color: s.color }]}
                  >
                    {s.value}
                  </Text>
                  <Text style={styles.gameHistorySumLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <FlatList
              data={card?.game_history || []}
              keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.gameHistoryEmpty}>
                  <Swords size={24} color="#CBD5E1" />
                  <Text style={styles.gameHistoryEmptyText}>
                    No games recorded yet
                  </Text>
                </View>
              }
              renderItem={({ item: g }) => {
                const userResult =
                  g.winner === "draw"
                    ? "draw"
                    : g.winner === `team_${g.user_team}`
                      ? "win"
                      : "loss";
                return (
                  <View style={styles.gameHistoryRow}>
                    <View style={styles.gameHistoryRowTop}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text style={styles.gameHistorySport}>{g.sport}</Text>
                        <Text style={styles.gameHistoryVenue}>
                          {g.venue_name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.gameHistoryResultPill,
                          userResult === "win" && styles.gameHistoryResultWin,
                          userResult === "loss" && styles.gameHistoryResultLoss,
                          userResult === "draw" && styles.gameHistoryResultDraw,
                        ]}
                      >
                        <Text
                          style={[
                            styles.gameHistoryResultText,
                            userResult === "win" && { color: "#059669" },
                            userResult === "loss" && { color: "#EF4444" },
                            userResult === "draw" && { color: "#64748B" },
                          ]}
                        >
                          {userResult === "win"
                            ? "Won"
                            : userResult === "loss"
                              ? "Lost"
                              : "Draw"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.gameHistoryMeta}>
                      <Text style={styles.gameHistoryMetaText}>{g.date}</Text>
                      <Text style={styles.gameHistoryMetaText}>
                        {fmt12h(g.start_time)}–{fmt12h(g.end_time)}
                      </Text>
                      <Text style={styles.gameHistoryGames}>
                        {g.games_played}{" "}
                        {g.games_played === 1 ? "game" : "games"}
                      </Text>
                    </View>
                    <View style={styles.gameHistoryScoreLine}>
                      <Text
                        style={[
                          styles.gameHistoryScoreText,
                          { color: "#10B981" },
                        ]}
                      >
                        W:{g.user_wins}
                      </Text>
                      <Text
                        style={[
                          styles.gameHistoryScoreText,
                          { color: "#EF4444" },
                        ]}
                      >
                        L:{g.user_losses}
                      </Text>
                      <Text
                        style={[
                          styles.gameHistoryScoreText,
                          { color: "#94A3B8" },
                        ]}
                      >
                        D:{g.draws}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEngagementGuide}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowEngagementGuide(false)}
      >
        <View style={styles.guideOverlay}>
          <TouchableOpacity
            style={styles.guideBackdrop}
            activeOpacity={1}
            onPress={() => setShowEngagementGuide(false)}
          />
          <View
            style={[
              styles.guideSheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.guideHandleWrap}>
              <View style={styles.guideHandle} />
            </View>
            <View
              style={[
                styles.guideHeader,
                { paddingTop: Math.max(insets.top * 0.15, 4) },
              ]}
            >
              <View style={styles.guideTitleRow}>
                <View style={styles.guideIconBox}>
                  <Zap size={18} color="#FFFFFF" />
                </View>
                <View style={styles.guideHeaderTextWrap}>
                  <Text style={styles.guideTitle}>
                    Social Media Engagement Level
                  </Text>
                  <Text style={styles.guideSubtitle}>
                    Weekly activity score resets every Monday
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.guideCloseButton}
                onPress={() => setShowEngagementGuide(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.guideScroll}
              contentContainerStyle={styles.guideScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.guideSummaryCard}>
                <View style={styles.guideSummaryRow}>
                  <ScoreRing
                    score={socialScore}
                    size={80}
                    strokeWidth={6}
                    arcRotation={12}
                    textSize={26}
                  />
                  <View style={styles.guideSummaryBody}>
                    <Text style={styles.guideSummaryEyebrow}>Your Level</Text>
                    <Text style={styles.guideSummaryTitle}>
                      {engagementLevel}
                    </Text>
                    <View style={styles.guideProgressTrack}>
                      <View
                        style={[
                          styles.guideProgressFill,
                          {
                            width: `${Math.max(0, Math.min(100, socialScore))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.guideSummaryMeta}>
                      {socialScore} / 100 pts this week
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.guideSectionTitleRow}>
                <Sparkles size={14} color={PRIMARY_COLOR} />
                <Text style={styles.guideSectionTitle}>How to Earn Points</Text>
              </View>
              {ENGAGEMENT_ACTIONS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <View key={item.action} style={styles.guideListCard}>
                    <View style={styles.guideListHeader}>
                      <View style={styles.guideListIconBox}>
                        <ItemIcon size={16} color={PRIMARY_COLOR} />
                      </View>
                      <View style={styles.guideListBody}>
                        <Text style={styles.guideListTitle}>{item.action}</Text>
                        <Text style={styles.guideListDesc}>{item.sub}</Text>
                      </View>
                      <Text style={styles.engagementPoints}>{item.points}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.guideSectionTitleRow}>
                <Award size={14} color={PRIMARY_COLOR} />
                <Text style={styles.guideSectionTitle}>Level Progression</Text>
              </View>
              <View style={styles.levelGrid}>
                {ENGAGEMENT_LEVELS.map((item, index) => {
                  const isActive = socialScore >= item.threshold;
                  const isCurrent =
                    index < ENGAGEMENT_LEVELS.length - 1
                      ? socialScore >= item.threshold &&
                        socialScore < ENGAGEMENT_LEVELS[index + 1].threshold
                      : socialScore >= item.threshold;
                  return (
                    <View
                      key={item.label}
                      style={[
                        styles.levelCard,
                        isCurrent && styles.levelCardCurrent,
                      ]}
                    >
                      <View
                        style={[
                          styles.levelCardMarker,
                          isCurrent
                            ? styles.levelCardMarkerCurrent
                            : isActive
                              ? styles.levelCardMarkerPassed
                              : null,
                        ]}
                      />
                      <Text
                        style={[
                          styles.levelCardLabel,
                          isCurrent
                            ? styles.levelCardLabelCurrent
                            : isActive
                              ? styles.levelCardLabelPassed
                              : null,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.levelCardThreshold}>
                        {item.threshold}+
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, flexGrow: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#94A3B8" },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#475569" },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  heroCard: { padding: 0, overflow: "hidden" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  avatarShell: { position: "relative" },
  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  lightboxContent: { alignItems: "center" },
  lightboxCloseBtn: { position: "absolute", top: -48, right: 0, padding: 8, zIndex: 10 },
  lightboxImage: { width: 280, height: 280, borderRadius: 140, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  lightboxName: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" },
  avatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 2,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  avatarRingEmpty: {
    borderColor: "#E5E7EB",
  },
  avatarRingVerified: { borderColor: "#A7F3D0" },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 39,
    backgroundColor: "#E2E8F0",
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  verifiedBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
  },
  topStats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  topStatItem: { alignItems: "center", gap: 3 },
  topStatValue: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  topStatLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  name: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  roleText: {
    paddingHorizontal: 16,
    marginTop: 4,
    fontSize: 14,
    color: "#64748B",
  },
  bioText: {
    paddingHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
  },
  viewRatingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    backgroundColor: "#ECFDF5",
  },
  viewRatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  streakPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#F97316",
    lineHeight: 12,
  },
  sportPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  sportPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compatCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#FDF2F8",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  compatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compatTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  compatScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  compatCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#EC4899",
    alignItems: "center",
    justifyContent: "center",
  },
  compatPercent: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EC4899",
  },
  compatBarWrap: {
    flex: 1,
    gap: 4,
  },
  compatBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FCE7F3",
  },
  compatBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EC4899",
  },
  compatDesc: {
    fontSize: 11,
    fontWeight: "600",
    color: "#BE185D",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  followButton: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  followingButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  followingLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsCard: { padding: 0, overflow: "hidden" },
  tabsShell: {
    position: "relative",
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
  },
  tabsIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#10B9810D",
    borderTopWidth: 3,
    borderTopColor: "#10B981",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 15,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
  },
  tabLabelActive: {
    color: PRIMARY_COLOR,
    fontWeight: "700",
  },
  tabContentStack: {
    paddingTop: 2,
    flexGrow: 1,
  },
  tabPageFill: {
    flexGrow: 1,
  },
  statsPage: {
    paddingTop: 12,
    gap: 12,
  },
  hiddenTabPage: {
    display: "none",
  },
  sectionSpacing: {
    marginTop: 12,
  },
  scoreCardsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  scoreDialPressable: {
    flex: 1,
  },
  scoreDialCard: {
    flex: 1,
    minHeight: 144,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  scoreDialHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  scoreDialTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
    lineHeight: 14,
  },
  scoreDialBody: {
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
  },
  scoreDialLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  statsStripCard: {
    paddingVertical: 0,
    overflow: "hidden",
  },
  statsStripRow: {
    flexDirection: "row",
  },
  statsStripCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 4,
  },
  statsStripDivider: {
    borderRightWidth: 1,
    borderRightColor: "#EEF2F7",
  },
  statsStripValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  statsStripValueAccent: {
    color: PRIMARY_COLOR,
  },
  statsStripLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  statsStripSub: {
    fontSize: 10,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
  },
  recordCard: {
    overflow: "hidden",
    padding: 0,
  },
  recordTopRow: {
    flexDirection: "row",
  },
  recordTopCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  recordTopDivider: {
    borderRightWidth: 1,
    borderRightColor: "#EEF2F7",
  },
  recordMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordMiniLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  recordTopValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  recordSection: {
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  recordSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  recordBar: {
    flexDirection: "row",
    height: 7,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  recordBarFill: {
    height: "100%",
  },
  recordSummaryRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  recordSummaryCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  recordSummaryDivider: {
    borderRightWidth: 1,
    borderRightColor: "#EEF2F7",
  },
  recordSummaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordSummaryDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  recordSummaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  recordSummaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  // Game History Modal
  gameHistoryOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.6)",
  },
  gameHistorySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    overflow: "hidden",
  },
  gameHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  gameHistoryTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  gameHistorySubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  gameHistoryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  gameHistorySummary: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  gameHistorySumCell: { flex: 1, alignItems: "center" },
  gameHistorySumDivider: { borderRightWidth: 1, borderRightColor: "#E2E8F0" },
  gameHistorySumValue: { fontSize: 18, fontWeight: "800" },
  gameHistorySumLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    color: "#64748B",
    marginTop: 2,
  },
  gameHistoryEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  gameHistoryEmptyText: { fontSize: 13, color: "#94A3B8" },
  gameHistoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  gameHistoryRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  gameHistorySport: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    textTransform: "capitalize",
  },
  gameHistoryVenue: { fontSize: 11, color: "#64748B" },
  gameHistoryResultPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gameHistoryResultWin: { backgroundColor: "rgba(16,185,129,0.1)" },
  gameHistoryResultLoss: { backgroundColor: "rgba(239,68,68,0.1)" },
  gameHistoryResultDraw: { backgroundColor: "#F1F5F9" },
  gameHistoryResultText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  gameHistoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  gameHistoryMetaText: { fontSize: 11, color: "#64748B" },
  gameHistoryGames: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginLeft: "auto",
  },
  gameHistoryScoreLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  gameHistoryScoreText: { fontSize: 10, fontWeight: "700" },

  sportsPlayedCard: { gap: 12 },
  sportsPlayedWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sportsPlayedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sportsPlayedName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    textTransform: "capitalize",
  },
  sportsPlayedCount: { fontSize: 11, fontWeight: "700", color: PRIMARY_COLOR },
  careerOverviewCard: {
    gap: 14,
  },
  careerMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordSectionLabelInline: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  careerOverviewRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    marginTop: -2,
  },
  careerOverviewCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 18,
  },
  careerOverviewDivider: {
    borderRightWidth: 1,
    borderRightColor: "#EEF2F7",
  },
  careerOverviewValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  careerOverviewLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
    textAlign: "center",
  },
  postsContainer: { marginHorizontal: -16 },
  sectionCard: { gap: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  badgeRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBody: { flex: 1, gap: 4 },
  badgeTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  badgeMeta: { fontSize: 13, lineHeight: 19, color: "#64748B" },
  // Coach styles
  coachCard: { gap: 16 },
  coachSection: { gap: 6 },
  coachSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coachBio: { fontSize: 14, lineHeight: 22, color: "#475569" },
  coachStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
  },
  coachStatItem: { alignItems: "center", gap: 4 },
  coachStatValue: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  coachStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  specRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  specPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  specText: { fontSize: 12, fontWeight: "700", color: PRIMARY_COLOR },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
  },
  priceText: { fontSize: 16, fontWeight: "800", color: PRIMARY_COLOR },
  bookSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR,
  },
  bookSessionText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  guideOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.6)",
    justifyContent: "flex-end",
  },
  guideBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  guideSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  guideHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  guideHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(100,116,139,0.24)",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  guideIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  guideHeaderTextWrap: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  guideSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  guideCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  guideScroll: {
    flexGrow: 0,
  },
  guideScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 14,
  },
  guideSummaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  guideSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  guideSummaryBody: {
    flex: 1,
  },
  guideSummaryEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  guideSummaryTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  guideProgressTrack: {
    marginTop: 12,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.14)",
    overflow: "hidden",
  },
  guideProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  guideSummaryMeta: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  guideSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guideSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  guideListCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  guideListHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  guideListIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  guideListBody: {
    flex: 1,
    minWidth: 0,
  },
  guideListTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  guideListDesc: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 16,
  },
  engagementPoints: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    backgroundColor: "rgba(16,185,129,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  levelGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  levelCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "transparent",
  },
  levelCardCurrent: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.42)",
  },
  levelCardMarker: {
    width: 26,
    height: 8,
    borderRadius: 999,
    marginBottom: 10,
    backgroundColor: "#E5E7EB",
  },
  levelCardMarkerCurrent: {
    backgroundColor: PRIMARY_COLOR,
  },
  levelCardMarkerPassed: {
    backgroundColor: "#D1D5DB",
  },
  levelCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
    textAlign: "center",
    color: "#6B7280",
  },
  levelCardLabelCurrent: {
    color: PRIMARY_COLOR,
  },
  levelCardLabelPassed: {
    color: "#6B7280",
  },
  levelCardThreshold: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
    textAlign: "center",
  },
});
