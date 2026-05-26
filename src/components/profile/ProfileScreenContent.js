import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  Camera,
  Clock,
  Globe,
  Trophy,
  Crown,
  GraduationCap,
  Edit3,
  Share2,
  Flame,
  Shield,
  Award,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Building2,
  Medal,
  Swords,
  Users,
  X,
  Calendar,
  Check,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Zap,
  Target,
  Footprints,
  ChevronRight,
  Send,
  Star,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import AppCard from "../ui/AppCard";
import PostsGrid from "./PostsGrid";
import FollowListSheet from "./FollowListSheet";
import EditProfileSheet from "./EditProfileSheet";
import ProfileSkeleton from "../skeletons/ProfileSkeleton";
import FinancePanel from "../venue/FinancePanel";
import playerService from "../../services/playerService";
import analyticsService from "../../services/analyticsService";
import socialService from "../../services/socialService";
import engagementService from "../../services/engagementService";
import authService from "../../services/authService";
import venueService from "../../services/venueService";
import { safePush } from "../../services/navigationGuard";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import * as Clipboard from "expo-clipboard";
import { PRIMARY_COLOR } from "../../constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const BASE_TABS = [
  { key: "posts", label: "Posts", IconComponent: null, ionIcon: "grid-outline" },
  { key: "stats", label: "Stats", IconComponent: BarChart3 },
];
const BOOKINGS_TAB = { key: "bookings", label: "Bookings", IconComponent: Calendar };
const BADGES_TAB = { key: "badges", label: "Badges", IconComponent: Award };
const FINANCE_TAB = { key: "finance", label: "Finance", IconComponent: TrendingUp };
const BOOKING_PAGE_SIZE = 10;

const SCORE_METRICS = [
  {
    icon: Swords,
    label: "Skill Mastery",
    weight: 40,
    key: "skill",
    desc: "Based on your competitive performance rating.",
    items: [
      "Beat stronger opponents to improve faster.",
      "Consistent high performance impacts this most.",
      "Rating growth contributes heavily to overall score.",
    ],
  },
  {
    icon: Trophy,
    label: "Win Rate",
    weight: 20,
    key: "win_rate",
    desc: "Your historical win and loss ratio.",
    items: [
      "Winning consistently improves your percentage.",
      "Every competitive game affects this metric.",
    ],
  },
  {
    icon: Crown,
    label: "Tournament Performance",
    weight: 15,
    key: "tournament",
    desc: "Participation and results in official events.",
    items: [
      "Top finishes add more value.",
      "Arena tournaments also contribute.",
    ],
  },
  {
    icon: GraduationCap,
    label: "Elite Training",
    weight: 10,
    key: "training",
    desc: "Professional coaching and training activity.",
    items: [
      "Book more sessions with certified coaches.",
      "Training hours support elite progression.",
    ],
  },
  {
    icon: Shield,
    label: "Reliability Factor",
    weight: 10,
    key: "reliability",
    desc: "Attendance, consistency and professionalism.",
    items: [
      "Punctual attendance protects this score.",
      "No-shows reduce reliability significantly.",
    ],
  },
  {
    icon: Footprints,
    label: "Experience Depth",
    weight: 5,
    key: "experience",
    desc: "Total match volume on the platform.",
    items: [
      "Stay active and keep playing regularly.",
    ],
  },
];

const TIER_DATA = [
  { tier: "Beginner", min: 0, max: 30, range: "0-30" },
  { tier: "Inter", min: 31, max: 50, range: "31-50" },
  { tier: "Advanced", min: 51, max: 70, range: "51-70" },
  { tier: "Pro", min: 71, max: 85, range: "71-85" },
  { tier: "Elite", min: 86, max: 100, range: "86-100" },
];

const ENGAGEMENT_ACTIONS = [
  { action: "Session Booking", points: "+10", sub: "Arena slot confirmation", icon: Sparkles },
  { action: "Daily Presence", points: "+5", sub: "Maintain your streak", icon: Flame },
  { action: "Feed Contributions", points: "+3", sub: "Each post published", icon: TrendingUp },
  { action: "Sport Stories", points: "+3", sub: "Story and update sharing", icon: Award },
  { action: "Arena Interaction", points: "+2", sub: "Likes and comments", icon: Zap },
];

const ENGAGEMENT_LEVELS = [
  { label: "Bench", threshold: 0 },
  { label: "Rookie", threshold: 20 },
  { label: "Pro", threshold: 40 },
  { label: "All-Star", threshold: 60 },
  { label: "Legend", threshold: 80 },
];

const BOOKING_STATUS_THEME = {
  confirmed: { bg: "#ECFDF5", text: "#059669" },
  completed: { bg: "#EFF6FF", text: "#2563EB" },
  cancelled: { bg: "#FEF2F2", text: "#DC2626" },
  pending: { bg: "#FFF7ED", text: "#D97706" },
  payment_pending: { bg: "#FFF7ED", text: "#D97706" },
  expired: { bg: "#F8FAFC", text: "#64748B" },
};

function fmt12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = String(timeStr).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return String(timeStr);
  const hr = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return m === 0 ? `${hr}:00 ${ampm}` : `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatBookingDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dateStr);
  }
}

function getBookingId(booking) {
  return booking?.id || booking?._id || "";
}

function getBookingTheme(status) {
  return BOOKING_STATUS_THEME[String(status || "").toLowerCase()] || BOOKING_STATUS_THEME.expired;
}

function getBookingRefundLabel(booking) {
  if (booking?.status !== "cancelled" || !booking?.refund_status) return "";
  if (booking?.refund_pct > 0 && booking?.total_amount) {
    const amount = Math.round(booking.total_amount * booking.refund_pct / 100);
    return `₹${amount.toLocaleString("en-IN")} (${booking.refund_pct}%)`;
  }
  return `Refund ${booking.refund_status}`;
}

function getTierInfo(rating) {
  const r = Number(rating || 0);
  if (r >= 2000) return { label: "Elite", color: "#34D399", bg: "#ECFDF5" };
  if (r >= 1700) return { label: "Pro", color: "#10B981", bg: "#ECFDF5" };
  if (r >= 1400) return { label: "Intermediate", color: "#059669", bg: "#ECFDF5" };
  return { label: "Beginner", color: "#64748B", bg: "#F8FAFC" };
}

function CircularProgress({ score, size = 72, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score || 0, 0), 100);
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
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
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>{score || 0}</Text>
    </View>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <AppCard style={[styles.metricCard, accent && styles.metricCardAccent]}>
      <Text style={[styles.metricValue, accent && styles.metricValueAccent]}>{value}</Text>
      <Text style={[styles.metricLabel, accent && styles.metricLabelAccent]}>{label}</Text>
      <Text style={[styles.metricSub, accent && styles.metricSubAccent]}>{sub}</Text>
    </AppCard>
  );
}

function ScoreRing({ score = 0, size = 82, strokeWidth = 4, arcRotation = 0, textSize = 18 }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${Math.max(8, (safeScore / 100) * circumference)} ${circumference}`;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
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
      <Text style={{ fontSize: textSize, fontWeight: "900", color: "#0F172A" }}>{safeScore}</Text>
    </View>
  );
}

/* ── Module-level cache ── */
const _pc = { card: null, stats: null, engagement: null, career: null, ready: false };

export default function ProfileScreenContent() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [card, setCard] = useState(_pc.card);
  const [stats, setStats] = useState(_pc.stats);
  const [engagement, setEngagement] = useState(_pc.engagement);
  const [career, setCareer] = useState(_pc.career);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [posts, setPosts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [reviewedBookingIds, setReviewedBookingIds] = useState(new Set());
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingSearching, setBookingSearching] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewCommentFocused, setReviewCommentFocused] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [loading, setLoading] = useState(!_pc.ready);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["posts"]));
  const indicatorProgress = useRef(new Animated.Value(0)).current;
  const activeTabRef = useRef("posts");
  const bookingSearchRef = useRef("");
  bookingSearchRef.current = bookingSearch;
  const bookingSearchMountRef = useRef(true);
  const isOwnProfile = true; // Profile screen is always own profile
  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (isOwnProfile && (user?.role === "player" || user?.role === "coach")) {
      tabs.push(BOOKINGS_TAB);
    }
    tabs.push(BADGES_TAB);
    if (isOwnProfile && user?.role === "venue_owner") {
      tabs.push(FINANCE_TAB);
    }
    return tabs;
  }, [isOwnProfile, user?.role]);
  const tabWidth = useMemo(() => (SCREEN_WIDTH - 32) / Math.max(TABS.length, 1), [TABS.length]);
  const totalBookingPages = useMemo(() => Math.max(1, Math.ceil((bookingsTotal || 0) / BOOKING_PAGE_SIZE)), [bookingsTotal]);
  const [showFollowList, setShowFollowList] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(false);
  const [followListTab, setFollowListTab] = useState("followers");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLevelUpGuide, setShowLevelUpGuide] = useState(false);
  const [showEngagementGuide, setShowEngagementGuide] = useState(false);
  const [expandedMetricKey, setExpandedMetricKey] = useState(null);

  const loadBookings = useCallback(async (page = 1, query) => {
    setBookingsLoading(true);
    try {
      const params = { page, limit: BOOKING_PAGE_SIZE };
      const q = String(query ?? bookingSearchRef.current ?? "").trim();
      if (q) params.q = q;
      const data = await playerService.getBookings(params);
      const list = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data) ? data : [];
      setBookings(list);
      setBookingsTotal(data?.total || list.length);
      setBookingPage(page);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh && !_pc.ready) setLoading(true);
      const [me, myCard, playerStats] = await Promise.all([
        authService.getMe().catch(() => null),
        playerService.getMyPlayerCard().catch(() => null),
        analyticsService.getPlayerAnalytics().catch(() => null),
      ]);
      const targetId = myCard?.user_id || me?.id || null;
      const [engData, careerData] = await Promise.all([
        targetId ? engagementService.getEngagementScore(targetId).catch(() => null) : Promise.resolve(null),
        targetId ? analyticsService.getPlayerCareer(targetId).catch(() => null) : Promise.resolve(null),
      ]);
      if (me) updateUser(me);
      setCard(myCard);
      setStats(playerStats);
      setEngagement(engData);
      setCareer(careerData);
      await loadBookings(1, bookingSearchRef.current);
      _pc.card = myCard;
      _pc.stats = playerStats;
      _pc.engagement = engData;
      _pc.career = careerData;
      _pc.ready = true;
    } catch {
      if (!isRefresh && !_pc.ready) toast.error("Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBookings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload profile data when tab comes into focus (e.g. after follow/unfollow on other screens)
  useFocusEffect(
    useCallback(() => {
      if (_pc.ready) loadData(true);
    }, [loadData]),
  );

  useEffect(() => {
    if (bookingSearchMountRef.current) {
      bookingSearchMountRef.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      setBookingSearching(true);
      loadBookings(1, bookingSearchRef.current).finally(() => setBookingSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [bookingSearch, loadBookings]);

  useEffect(() => {
    let cancelled = false;
    const completedBookings = bookings.filter((b) => String(b.status || "").toLowerCase() === "completed");
    const completedVenueIds = [...new Set(completedBookings.map((b) => b.venue_id).filter(Boolean))];

    if (completedVenueIds.length === 0) {
      setReviewedBookingIds(new Set());
      return undefined;
    }

    Promise.allSettled(
      completedVenueIds.map((venueId) =>
        venueService.canReview(venueId).then((res) => {
          const eligible = Array.isArray(res?.eligible_bookings) ? res.eligible_bookings : [];
          return eligible.map((b) => getBookingId(b)).filter(Boolean);
        }).catch(() => [])
      )
    ).then((results) => {
      if (cancelled) return;
      const eligibleIds = new Set(results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
      const reviewed = new Set(
        completedBookings
          .map((booking) => getBookingId(booking))
          .filter((id) => id && !eligibleIds.has(id))
      );
      setReviewedBookingIds(reviewed);
    });

    return () => {
      cancelled = true;
    };
  }, [bookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleBookingPageChange = useCallback((nextPage) => {
    if (bookingsLoading || nextPage < 1 || nextPage > totalBookingPages || nextPage === bookingPage) return;
    loadBookings(nextPage);
  }, [bookingPage, bookingsLoading, loadBookings, totalBookingPages]);

  const handleOpenReceipt = useCallback((booking) => {
    const bookingId = getBookingId(booking);
    if (!bookingId) return;
    setSelectedBooking(null);
    safePush(router, `/(stack)/booking-receipt?bookingId=${encodeURIComponent(bookingId)}`);
  }, [router]);

  const handleCancelBooking = useCallback(async (booking) => {
    const bookingId = getBookingId(booking);
    if (!bookingId || cancellingBooking) return;
    setCancellingBooking(true);
    try {
      const response = await venueService.cancelBooking(bookingId);
      toast.success(response?.message || "Booking cancelled");
      setCancelConfirm(null);
      setSelectedBooking((prev) => prev && getBookingId(prev) === bookingId ? { ...prev, status: "cancelled" } : prev);
      await loadBookings(bookingPage, bookingSearchRef.current);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to cancel booking");
    } finally {
      setCancellingBooking(false);
    }
  }, [bookingPage, cancellingBooking, loadBookings, router]);

  const openReviewModal = useCallback((booking) => {
    if (!booking) return;
    setReviewBooking(booking);
    setReviewRating(0);
    setReviewComment("");
    setReviewCommentFocused(false);
    setSubmittingReview(false);
  }, []);

  const closeReviewModal = useCallback(() => {
    setReviewBooking(null);
    setReviewRating(0);
    setReviewComment("");
    setReviewCommentFocused(false);
    setSubmittingReview(false);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewBooking?.venue_id || !reviewBooking?.id || !reviewRating || submittingReview) return;
    setSubmittingReview(true);
    try {
      await venueService.submitReview(reviewBooking.venue_id, {
        rating: reviewRating,
        comment: reviewComment,
        booking_id: reviewBooking.id,
      });
      setReviewedBookingIds((prev) => new Set([...prev, reviewBooking.id]));
      toast.success("Review submitted");
      setSubmittingReview("done");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit review");
      setSubmittingReview(false);
    }
  }, [reviewBooking, reviewRating, reviewComment, submittingReview]);

  const displayUser = user || {};
  const tier = useMemo(() => getTierInfo(card?.skill_rating), [card?.skill_rating]);
  const avatarUri = card?.avatar || displayUser.avatar;

  const handleShare = async () => {
    // Frontend player-profile route is `/player-card/:userId` (App.js:481), so the
    // share link follows the same pattern. The URL is appended to the `message` body
    // because React Native's `Share.share` on Android forwards only `message` to
    // receiving apps (WhatsApp, Telegram, etc.) — same fix as bug #11 (venue share).
    const userId = displayUser?.id || card?.user_id;
    const profileUrl = userId ? `https://app.lobbi.in/player-card/${userId}` : "";
    const name = displayUser.name || "my";
    try {
      await Share.share({
        title: `${name} on Lobbi`,
        message: profileUrl
          ? `Check out ${name}'s profile on Lobbi!\n${profileUrl}`
          : `Check out ${name}'s profile on Lobbi!`,
        url: profileUrl,
      });
    } catch {
      // Share sheet was opened but a real failure occurred — fall back to clipboard.
      if (profileUrl) {
        try {
          await Clipboard.setStringAsync(profileUrl);
          toast.success("Link copied to clipboard!");
        } catch {
          toast.error("Could not copy link. Please copy it manually.");
        }
      }
    }
  };

  const openFollowList = (tab) => {
    setFollowListTab(tab);
    setShowFollowList(true);
  };

  const badges = useMemo(() => {
    return Array.isArray(card?.badges) ? card.badges : [];
  }, [card?.badges]);

  const engagementLevel = useMemo(() => {
    // Mirror frontend (PlayerCardPage:873-906) — reads only `engagementScore.score`.
    // Dropped the `engagement?.engagement_score` alias.
    const score = engagement?.score || 0;
    if (score >= 80) return "Legend";
    if (score >= 60) return "All-Star";
    if (score >= 40) return "Pro";
    if (score >= 20) return "Rookie";
    return "Bench";
  }, [engagement]);
  const overallScore = card?.overall_score ?? 0;
  const socialScore = engagement?.score || 0;
  // Exact mirror of frontend PlayerCardPage.winRate (line 196-206):
  //   wins / (wins + losses + draws) * 100
  // Previously divided by `total_games` which counts unrelated rows (e.g. bookings,
  // open matches) and inflated the % — Syed's 3W/6L/0D came out as 75% instead of 33%.
  const winRate = useMemo(() => {
    if (!card) return 0;
    const wins = card?.wins ?? 0;
    const losses = card?.losses ?? 0;
    const draws = card?.draws ?? 0;
    const denom = Math.max(wins + losses + draws, 1);
    return Math.round((wins / denom) * 100);
  }, [card]);
  // Exact mirror of frontend PlayerCardPage:1024 — `card.reliability_score ?? 0`
  // only. Dropped the mobile-only `card?.reliability` alias.
  const reliablePct = card?.reliability_score ?? 0;
  const matchTotal = Math.max((card?.wins || 0) + (card?.losses || 0) + (card?.draws || 0), 1);
  const winsPct = Math.round(((card?.wins || 0) / matchTotal) * 100);
  const lossesPct = Math.round(((card?.losses || 0) / matchTotal) * 100);
  const drawsPct = Math.max(0, 100 - winsPct - lossesPct);
  const joinedBadgeText = useMemo(() => {
    const rawDate = card?.created_at || displayUser?.created_at;
    if (!rawDate) return "";
    const joinedDate = new Date(rawDate);
    if (Number.isNaN(joinedDate.getTime())) return "";
    return joinedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
  }, [card?.created_at, displayUser?.created_at]);
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

  useEffect(() => {
    const currentIndex = Math.max(0, TABS.findIndex((tab) => tab.key === activeTab));
    activeTabRef.current = activeTab;
    Animated.timing(indicatorProgress, {
      toValue: currentIndex,
      useNativeDriver: true,
      duration: 12,
    }).start();
  }, [TABS, activeTab, indicatorProgress]);

  const handleTabChange = useCallback((nextTab) => {
    if (!nextTab || nextTab === activeTabRef.current) return;
    const nextIndex = Math.max(0, TABS.findIndex((tab) => tab.key === nextTab));
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
  }, [TABS, indicatorProgress]);

  const profileTabsSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 2,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) + 2,
        onPanResponderMove: (_, gestureState) => {
          const currentIndex = Math.max(0, TABS.findIndex((tab) => tab.key === activeTabRef.current));
          const relativeProgress = Math.max(-1, Math.min(1, -gestureState.dx / Math.max(SCREEN_WIDTH * 0.5, 1)));
          const dragProgress = Math.max(
            Math.max(0, currentIndex - 1),
            Math.min(Math.min(TABS.length - 1, currentIndex + 1), currentIndex + relativeProgress)
          );
          indicatorProgress.setValue(dragProgress);
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentIndex = Math.max(0, TABS.findIndex((tab) => tab.key === activeTabRef.current));
          let nextIndex = currentIndex;

          if (gestureState.dx <= -10 || gestureState.vx <= -0.05) {
            nextIndex = Math.min(TABS.length - 1, currentIndex + 1);
          } else if (gestureState.dx >= 10 || gestureState.vx >= 0.05) {
            nextIndex = Math.max(0, currentIndex - 1);
          }

          handleTabChange(TABS[nextIndex]?.key || activeTabRef.current);
        },
        onPanResponderTerminate: () => {
          const currentIndex = Math.max(0, TABS.findIndex((tab) => tab.key === activeTabRef.current));
          Animated.timing(indicatorProgress, {
            toValue: currentIndex,
            useNativeDriver: true,
            duration: 10,
          }).start();
        },
      }),
    [TABS, handleTabChange, indicatorProgress]
  );

  const indicatorTranslateX = indicatorProgress.interpolate({
    inputRange: TABS.map((_, index) => index),
    outputRange: TABS.map((_, index) => index * tabWidth),
    extrapolate: "clamp",
  });

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY_COLOR} colors={[PRIMARY_COLOR]} />
        }
      >
        {/* Profile Header */}
        <AppCard style={styles.heroShell}>
          <View style={styles.statsHeader}>
            <View style={styles.avatarShell}>
              <TouchableOpacity
                onPress={() => avatarUri ? setAvatarPreview(true) : setShowEditProfile(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarRing, !avatarUri && styles.avatarRingEmpty]}>
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
              <TouchableOpacity
                style={styles.cameraIcon}
                onPress={() => setShowEditProfile(true)}
                activeOpacity={0.85}
                hitSlop={8}
              >
                <Camera size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.topStats}>
              {[
                { label: "Posts", value: card?.post_count ?? 0, action: null },
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
            <Text style={styles.profileName}>{displayUser.name || "Player"}</Text>
            {(card?.current_streak || 0) > 0 && (
              <TouchableOpacity activeOpacity={0.85} style={styles.streakPill} onPress={() => handleTabChange("stats")}>
                <Flame size={11} color="#F97316" />
                <Text style={styles.streakText}>{card.current_streak}</Text>
              </TouchableOpacity>
            )}
            {card?.is_verified && (
              <Ionicons name="checkmark-circle" size={18} color={PRIMARY_COLOR} />
            )}
            <View style={[styles.tierPill, { backgroundColor: tier.bg, borderColor: tier.color }]}>
              <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.label}</Text>
            </View>
          </View>

          {/* Sports */}
          {filteredSports.length > 0 ? (
            <View style={styles.metaRow}>
              {filteredSports.map((sport, i) => (
                <View key={i} style={styles.sportPill}>
                  <Text style={styles.sportText}>{sport}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Bio */}
          <Text style={styles.bioText}>
            {card?.bio || displayUser.bio || "Bio not set yet."}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.actionButton}
              onPress={() => setShowEditProfile(true)}
            >
              <Edit3 size={14} color="#0F172A" />
              <Text style={styles.actionLabel}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={styles.actionButton} onPress={handleShare}>
              <Share2 size={14} color="#0F172A" />
              <Text style={styles.actionLabel}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Tabs */}
        <AppCard style={styles.tabsCard}>
          <View style={styles.tabsRow}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabIndicator,
                {
                  width: tabWidth,
                  transform: [{ translateX: indicatorTranslateX }],
                },
              ]}
            />
            {TABS.map((item) => {
              const active = activeTab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.92}
                  onPress={() => handleTabChange(item.key)}
                  style={styles.tabButton}
                >
                  {item.IconComponent ? (
                    <item.IconComponent size={18} color={active ? PRIMARY_COLOR : "#94A3B8"} />
                  ) : (
                    <Ionicons name={item.ionIcon} size={18} color={active ? PRIMARY_COLOR : "#94A3B8"} />
                  )}
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>

        <View {...profileTabsSwipeResponder.panHandlers} collapsable={false} style={styles.tabContentStack}>
        {/* Stats Tab */}
        {visitedTabs.has("stats") && (
          <View style={[styles.tabPageFill, activeTab === "stats" ? null : styles.hiddenTabPage]}>
            <View style={styles.statsTopGrid}>
              <TouchableOpacity
                style={styles.scorePanelPressable}
                activeOpacity={0.92}
                onPress={() => setShowLevelUpGuide(true)}
              >
                <AppCard style={styles.scorePanelCard}>
                  <View style={styles.scorePanelHeader}>
                    <Text style={styles.scorePanelEyebrow}>Overall Game Performance</Text>
                    <BarChart3 size={14} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.scorePanelBody}>
                    <ScoreRing score={overallScore} size={82} strokeWidth={4} arcRotation={0} textSize={18} />
                    <Text style={styles.scorePanelLevel}>{card?.overall_tier || tier.label}</Text>
                  </View>
                </AppCard>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scorePanelPressable}
                activeOpacity={0.92}
                onPress={() => setShowEngagementGuide(true)}
              >
                <AppCard style={styles.scorePanelCard}>
                  <View style={styles.scorePanelHeader}>
                    <Text style={styles.scorePanelEyebrow}>Social Media Engagement</Text>
                    <Globe size={14} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.scorePanelBody}>
                    <ScoreRing score={socialScore} size={82} strokeWidth={4} arcRotation={12} textSize={18} />
                    <Text style={styles.scorePanelLevel}>Level {engagementLevel}</Text>
                  </View>
                </AppCard>
              </TouchableOpacity>
            </View>

            <AppCard style={[styles.statsStripCard, styles.sectionSpacing]}>
              <View style={styles.statsStripRow}>
                {[
                  { value: card?.skill_rating || 1500, label: "Rating", accent: true },
                  { value: `${winRate}%`, label: "Win Rate" },
                  { value: `${reliablePct}%`, label: "Reliable" },
                ].map((item, index) => (
                  <View key={item.label} style={[styles.statsStripCell, index < 2 && styles.statsStripDivider]}>
                    <Text style={[styles.statsStripValue, item.accent && styles.statsStripValueAccent]}>{item.value}</Text>
                    <Text style={styles.statsStripLabel}>{item.label}</Text>
                    {!!item.sub && <Text style={styles.statsStripSub}>{item.sub}</Text>}
                  </View>
                ))}
              </View>
            </AppCard>

            <AppCard style={[styles.recordCard, styles.sectionSpacing]}>
              <View style={styles.recordTopRow}>
                {[
                  { value: card?.total_bookings ?? stats?.total_bookings ?? 0, label: "Bookings", Icon: CalendarDays },
                  { value: card?.total_games ?? stats?.total_games ?? 0, label: "Games Played", Icon: Swords, onPress: () => setShowGameHistory(true) },
                ].map((item, index) => (
                  <Pressable
                    key={item.label}
                    style={[styles.recordTopCell, index === 0 && styles.recordTopDivider]}
                    onPress={item.onPress}
                    disabled={!item.onPress}
                  >
                    <View style={styles.recordTopLabelRow}>
                      <item.Icon size={13} color="#94A3B8" />
                      <Text style={styles.recordTopLabel}>{item.label}</Text>
                      {item.onPress ? <ChevronRight size={11} color="#94A3B8" /> : null}
                    </View>
                    <Text style={styles.recordTopValue}>{item.value}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.recordBottom}>
                <Text style={styles.recordSectionLabel}>Match Record</Text>
                <View style={styles.recordBar}>
                  <View style={[styles.recordBarFill, { width: `${winsPct}%`, backgroundColor: "#10B981" }]} />
                  <View style={[styles.recordBarFill, { width: `${lossesPct}%`, backgroundColor: "#EF4444" }]} />
                  <View style={[styles.recordBarFill, { width: `${drawsPct}%`, backgroundColor: "#CBD5E1" }]} />
                </View>

                <View style={styles.recordSummaryRow}>
                  {[
                    { value: card?.wins || 0, label: "Wins", color: "#10B981" },
                    { value: card?.losses || 0, label: "Losses", color: "#EF4444" },
                    { value: card?.draws || 0, label: "Draws", color: "#CBD5E1" },
                  ].map((item, index) => (
                    <View key={item.label} style={[styles.recordSummaryCell, index < 2 && styles.recordSummaryDivider]}>
                      <View style={styles.recordSummaryLabelRow}>
                        <View style={[styles.recordSummaryDot, { backgroundColor: item.color }]} />
                        <Text style={styles.recordSummaryLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.recordSummaryValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </AppCard>

            {/* Sports Played */}
            {Object.keys(card?.sports_played || stats?.sports_played || {}).length > 0 && (
              <AppCard style={[styles.sportsPlayedCard, styles.sectionSpacing]}>
                <Text style={styles.recordSectionLabel}>Sports Played</Text>
                <View style={styles.sportsPlayedWrap}>
                  {Object.entries(card?.sports_played || stats?.sports_played || {})
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

            <AppCard style={[styles.careerOverviewCard, styles.sectionSpacing]}>
              <Text style={styles.recordSectionLabel}>Career Overview</Text>
              <View style={styles.careerOverviewRow}>
                {[
                  // Exact mirror of frontend CareerSection.js:16-21 — no extra
                  // fallbacks to card.total_games / stats.total_games. Those fields
                  // count win+loss+draw rows and inflate the "Matches" stat well
                  // beyond what the backend's `matches_played` field represents.
                  { value: `${career?.training_hours ?? 0}h`, label: "Training", Icon: Clock },
                  { value: career?.organizations?.length ?? 0, label: "Orgs", Icon: Users },
                  { value: career?.matches_played || 0, label: "Matches", Icon: Swords },
                  { value: career?.tournaments_played ?? 0, label: "Events", Icon: Medal },
                ].map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      styles.careerOverviewCell,
                      index < 3 && styles.careerOverviewDivider,
                    ]}
                  >
                    <item.Icon size={14} color="#94A3B8" />
                    <Text style={styles.careerOverviewValue}>{item.value}</Text>
                    <Text style={styles.careerOverviewLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </AppCard>
          </View>
        )}

        {/* Posts Tab */}
        {visitedTabs.has("posts") && (
          <View style={[styles.tabPageFill, activeTab === "posts" ? null : styles.hiddenTabPage]}>
            <View style={styles.postsContainer}>
              <PostsGrid userId={displayUser.id || "me"} />
            </View>
          </View>
        )}

        {/* Badges Tab */}
        {visitedTabs.has("badges") && (
          <View style={[styles.tabPageFill, activeTab === "badges" ? null : styles.hiddenTabPage]}>
            <AppCard style={styles.sectionCard}>
              <View style={styles.badgesHeaderRow}>
                <View style={styles.badgesHeaderLeft}>
                  <Award size={14} color={PRIMARY_COLOR} />
                  <Text style={styles.badgesEyebrow}>Achievements</Text>
                </View>
                <Text style={styles.badgesCount}>{badges.length} earned</Text>
              </View>
              {badges.length === 0 ? (
                <View style={styles.emptyBadgeState}>
                  <View style={styles.emptyBadgeIcon}>
                    <Award size={24} color="#94A3B8" />
                  </View>
                  <Text style={styles.emptyBadgeTitle}>No badges earned yet</Text>
                  <Text style={styles.emptyBadgeText}>Play matches and stay active to unlock achievements.</Text>
                </View>
              ) : (
                badges.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.badgeRow}>
                    <View style={styles.badgeIcon}>
                      {item.icon === "shield" ? (
                        <Shield size={20} color={PRIMARY_COLOR} />
                      ) : (
                        <Award size={20} color={PRIMARY_COLOR} />
                      )}
                    </View>
                    <View style={styles.badgeBody}>
                      <Text style={styles.badgeTitle}>{item.name}</Text>
                      <Text style={styles.badgeMeta}>
                        {item.description || "Achievement unlocked on Lobbi."}
                      </Text>
                    </View>
                    <BadgeCheck size={18} color={PRIMARY_COLOR} />
                  </View>
                ))
              )}
              {!!joinedBadgeText && <Text style={styles.badgesFooterText}>Joined {joinedBadgeText}</Text>}
            </AppCard>
          </View>
        )}

        {/* Finance Tab (venue_owner only) */}
        {visitedTabs.has("finance") && (
          <View style={[styles.tabPageFill, activeTab === "finance" ? null : styles.hiddenTabPage]}>
            <AppCard style={styles.sectionCard}>
              <FinancePanel />
            </AppCard>
          </View>
        )}

        {/* Bookings Tab */}
        {visitedTabs.has("bookings") && (
          <View style={[styles.tabPageFill, activeTab === "bookings" ? null : styles.hiddenTabPage]}>
            <AppCard style={styles.sectionCard}>
              <View style={styles.bookingHeaderRow}>
                <View style={styles.bookingHeaderCopy}>
                  <Text style={styles.sectionTitle}>Booking History</Text>
                  <Text style={styles.bookingHeaderMeta}>
                    {bookingsTotal || bookings.length} total booking{(bookingsTotal || bookings.length) === 1 ? "" : "s"}
                  </Text>
                </View>
                <View style={styles.bookingHeaderBadge}>
                  <Calendar size={14} color={PRIMARY_COLOR} />
                  <Text style={styles.bookingHeaderBadgeText}>Page {bookingPage}</Text>
                </View>
              </View>

              <View style={styles.bookingSearchWrap}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" />
                <TextInput
                  value={bookingSearch}
                  onChangeText={setBookingSearch}
                  placeholder="Search by venue or sport..."
                  placeholderTextColor="#94A3B8"
                  style={styles.bookingSearchInput}
                />
                {(bookingSearching || bookingsLoading) ? (
                  <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                ) : bookingSearch.trim() ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => setBookingSearch("")}>
                    <Ionicons name="close" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {bookingsLoading ? (
                <View style={styles.bookingLoadingState}>
                  <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                </View>
              ) : bookings.length === 0 ? (
                <View style={styles.emptyBookings}>
                  <Calendar size={40} color="#CBD5E1" />
                  <Text style={styles.emptyBookingsTitle}>
                    {bookingSearch.trim() ? "No bookings match your search" : "No bookings yet"}
                  </Text>
                  <Text style={styles.emptyBookingsText}>
                    {bookingSearch.trim()
                      ? "Try a different venue or sport keyword."
                      : "Your booking history will appear here once you make a reservation."}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.bookingCardsWrap}>
                    {bookings.map((booking, index) => {
                      const theme = getBookingTheme(booking.status);
                      const refundLabel = getBookingRefundLabel(booking);
                      const bookingId = getBookingId(booking);
                      const isReviewed = bookingId ? reviewedBookingIds.has(bookingId) : false;
                      const canReview = String(booking.status || "").toLowerCase() === "completed" && !isReviewed;
                      return (
                        <TouchableOpacity
                          key={bookingId || index}
                          activeOpacity={0.9}
                          style={styles.bookingHistoryCard}
                          onPress={() => setSelectedBooking(booking)}
                        >
                          <View style={styles.bookingCardTopRow}>
                            <Text numberOfLines={2} style={styles.bookingCardVenue}>
                              {booking.venue_name || booking.venue?.name || "Venue"}
                            </Text>
                            <Text style={styles.bookingCardAmount}>
                              {booking.total_amount || booking.amount ? `₹${Number(booking.total_amount || booking.amount).toLocaleString("en-IN")}` : ""}
                            </Text>
                          </View>
                          <Text style={styles.bookingCardMeta}>
                            {formatBookingDate(booking.date || booking.booking_date)}
                            {booking.start_time || booking.time ? ` | ${fmt12h(booking.start_time || booking.time)}` : ""}
                            {booking.end_time ? ` - ${fmt12h(booking.end_time)}` : ""}
                            {booking.sport ? ` | ${booking.sport}` : ""}
                          </Text>
                          <View style={styles.bookingBadgeRow}>
                            <View style={styles.bookingBadgeGroup}>
                              <View style={[styles.bookingStatusPill, { backgroundColor: theme.bg }]}>
                                <Text style={[styles.bookingStatusPillText, { color: theme.text }]}>
                                  {String(booking.status || "pending").replace(/_/g, " ")}
                                </Text>
                              </View>
                              {refundLabel ? (
                                <View style={styles.bookingRefundPill}>
                                  <Text style={styles.bookingRefundText}>{refundLabel}</Text>
                                </View>
                              ) : null}
                              {isReviewed ? (
                                <View style={styles.bookingReviewedPill}>
                                  <Star size={10} color="#D97706" fill="#D97706" />
                                  <Text style={styles.bookingReviewedText}>Reviewed</Text>
                                </View>
                              ) : null}
                            </View>
                            {canReview ? (
                              <TouchableOpacity
                                activeOpacity={0.86}
                                style={styles.bookingReviewBtn}
                                onPress={() => openReviewModal(booking)}
                              >
                                <MessageSquare size={10} color="#FFFFFF" />
                                <Text style={styles.bookingReviewBtnText}>Review</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {totalBookingPages > 1 ? (
                    <View style={styles.bookingPagination}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.bookingPageBtn, bookingPage <= 1 && styles.bookingPageBtnDisabled]}
                        disabled={bookingPage <= 1 || bookingsLoading}
                        onPress={() => handleBookingPageChange(bookingPage - 1)}
                      >
                        <Ionicons name="chevron-back" size={16} color={bookingPage <= 1 ? "#CBD5E1" : "#475569"} />
                      </TouchableOpacity>
                      {(() => {
                        const pages = [];
                        if (totalBookingPages <= 7) {
                          for (let i = 1; i <= totalBookingPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (bookingPage > 3) pages.push("…");
                          const start = Math.max(2, bookingPage - 1);
                          const end = Math.min(totalBookingPages - 1, bookingPage + 1);
                          for (let i = start; i <= end; i++) pages.push(i);
                          if (bookingPage < totalBookingPages - 2) pages.push("…");
                          pages.push(totalBookingPages);
                        }
                        return pages.map((p, i) =>
                          p === "…" ? (
                            <Text key={`e${i}`} style={styles.bookingPageEllipsis}>…</Text>
                          ) : (
                            <TouchableOpacity
                              key={p}
                              activeOpacity={0.85}
                              style={[styles.bookingPageNumBtn, p === bookingPage && styles.bookingPageNumBtnActive]}
                              onPress={() => handleBookingPageChange(p)}
                              disabled={bookingsLoading}
                            >
                              <Text style={[styles.bookingPageNumText, p === bookingPage && styles.bookingPageNumTextActive]}>{p}</Text>
                            </TouchableOpacity>
                          )
                        );
                      })()}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.bookingPageBtn, bookingPage >= totalBookingPages && styles.bookingPageBtnDisabled]}
                        disabled={bookingPage >= totalBookingPages || bookingsLoading}
                        onPress={() => handleBookingPageChange(bookingPage + 1)}
                      >
                        <Ionicons name="chevron-forward" size={16} color={bookingPage >= totalBookingPages ? "#CBD5E1" : "#475569"} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              )}
            </AppCard>
          </View>
        )}
        </View>

      </ScrollView>

      {/* Avatar Preview Lightbox */}
      <Modal
        visible={avatarPreview}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAvatarPreview(false)}
      >
        <Pressable style={styles.lightboxOverlay} onPress={() => setAvatarPreview(false)}>
          <View style={styles.lightboxContent} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setAvatarPreview(false)}
              activeOpacity={0.7}
            >
              <X size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Image
              source={{ uri: mediaUrl(avatarUri) }}
              style={styles.lightboxAvatar}
              contentFit="cover"
            />
            {displayUser.name ? (
              <Text style={styles.lightboxName}>{displayUser.name}</Text>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      {/* Modals */}
      <FollowListSheet
        visible={showFollowList}
        onClose={() => {
          setShowFollowList(false);
          loadData(true);
        }}
        userId={displayUser.id || "me"}
        initialTab={followListTab}
        onFollowChange={(_id, isNowFollowing) => {
          setCard((prev) =>
            prev
              ? {
                  ...prev,
                  following_count: isNowFollowing
                    ? (prev.following_count || 0) + 1
                    : Math.max(0, (prev.following_count || 1) - 1),
                }
              : prev,
          );
        }}
      />

      <EditProfileSheet
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        card={card}
        onSaved={() => loadData(true)}
      />

      {/* Game History Modal */}
      <Modal
        visible={showGameHistory}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowGameHistory(false)}
      >
        <View style={styles.gameHistoryOverlay}>
          <View style={[styles.gameHistorySheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.gameHistoryHeader}>
              <View>
                <Text style={styles.gameHistoryTitle}>Game History</Text>
                <Text style={styles.gameHistorySubtitle}>
                  {card?.total_games || 0} games across {(card?.game_history || []).length} sessions
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGameHistory(false)} style={styles.gameHistoryCloseBtn}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.gameHistorySummary}>
              {[
                { value: card?.wins || 0, label: "Wins", color: "#10B981" },
                { value: card?.losses || 0, label: "Losses", color: "#EF4444" },
                { value: card?.draws || 0, label: "Draws", color: "#94A3B8" },
              ].map((s, i) => (
                <View key={s.label} style={[styles.gameHistorySumCell, i < 2 && styles.gameHistorySumDivider]}>
                  <Text style={[styles.gameHistorySumValue, { color: s.color }]}>{s.value}</Text>
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
                  <Text style={styles.gameHistoryEmptyText}>No games recorded yet</Text>
                </View>
              }
              renderItem={({ item: g }) => {
                const userResult = g.winner === "draw" ? "draw" : (g.winner === `team_${g.user_team}` ? "win" : "loss");
                return (
                  <View style={styles.gameHistoryRow}>
                    <View style={styles.gameHistoryRowTop}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.gameHistorySport}>{g.sport}</Text>
                        <Text style={styles.gameHistoryVenue}>{g.venue_name}</Text>
                      </View>
                      <View style={[
                        styles.gameHistoryResultPill,
                        userResult === "win" && styles.gameHistoryResultWin,
                        userResult === "loss" && styles.gameHistoryResultLoss,
                        userResult === "draw" && styles.gameHistoryResultDraw,
                      ]}>
                        <Text style={[
                          styles.gameHistoryResultText,
                          userResult === "win" && { color: "#059669" },
                          userResult === "loss" && { color: "#EF4444" },
                          userResult === "draw" && { color: "#64748B" },
                        ]}>
                          {userResult === "win" ? "Won" : userResult === "loss" ? "Lost" : "Draw"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.gameHistoryMeta}>
                      <Text style={styles.gameHistoryMetaText}>{g.date}</Text>
                      <Text style={styles.gameHistoryMetaText}>{fmt12h(g.start_time)}–{fmt12h(g.end_time)}</Text>
                      <Text style={styles.gameHistoryGames}>{g.games_played} {g.games_played === 1 ? "game" : "games"}</Text>
                    </View>
                    <View style={styles.gameHistoryScoreLine}>
                      <Text style={[styles.gameHistoryScoreText, { color: "#10B981" }]}>W:{g.user_wins}</Text>
                      <Text style={[styles.gameHistoryScoreText, { color: "#EF4444" }]}>L:{g.user_losses}</Text>
                      <Text style={[styles.gameHistoryScoreText, { color: "#94A3B8" }]}>D:{g.draws}</Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedBooking}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedBooking(null)}
      >
        <View style={styles.bookingModalOverlay}>
          <TouchableOpacity style={styles.guideBackdrop} activeOpacity={1} onPress={() => setSelectedBooking(null)} />
          {selectedBooking ? (
            <View style={[styles.bookingDetailSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.guideHandleWrap}>
                <View style={styles.guideHandle} />
              </View>
              <View style={styles.bookingDetailHeader}>
                <View style={styles.bookingDetailHeaderCopy}>
                  <Text style={styles.bookingDetailTitle}>Booking Receipt</Text>
                  <Text style={styles.bookingDetailSubtitle}>
                    {selectedBooking.venue_name || selectedBooking.venue?.name || "Venue"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.guideCloseButton} onPress={() => setSelectedBooking(null)}>
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.bookingDetailScroll}
                contentContainerStyle={styles.bookingDetailContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Receipt Card — matches web BookingReceipt */}
                <View style={styles.receiptCard}>
                  {/* Header: Venue + Status */}
                  <View style={styles.receiptHeaderRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.receiptVenueName} numberOfLines={1}>
                        {selectedBooking.venue_name || selectedBooking.venue?.name || "Venue"}
                      </Text>
                      {selectedBooking.turf_name ? (
                        <Text style={styles.receiptTurfLine} numberOfLines={1}>
                          {selectedBooking.turf_name} · {selectedBooking.sport}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.receiptStatusBadge, { backgroundColor: getBookingTheme(selectedBooking.status).bg, borderColor: getBookingTheme(selectedBooking.status).text + "30" }]}>
                      <Text style={[styles.receiptStatusText, { color: getBookingTheme(selectedBooking.status).text }]}>
                        {String(selectedBooking.status || "pending").replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>

                  {/* Details Grid: Date · Time · Players */}
                  <View style={styles.receiptGrid}>
                    <View style={styles.receiptGridCell}>
                      <Calendar size={14} color={PRIMARY_COLOR} />
                      <Text style={styles.receiptGridText}>{formatBookingDate(selectedBooking.date || selectedBooking.booking_date)}</Text>
                    </View>
                    <View style={styles.receiptGridCell}>
                      <Clock size={14} color="#38BDF8" />
                      <Text style={styles.receiptGridText} numberOfLines={1}>
                        {fmt12h(selectedBooking.start_time || selectedBooking.time)}{selectedBooking.end_time ? ` - ${fmt12h(selectedBooking.end_time)}` : ""}
                      </Text>
                    </View>
                    {(selectedBooking.num_players || selectedBooking.player_count) ? (
                      <View style={styles.receiptGridCell}>
                        <Users size={14} color="#A78BFA" />
                        <Text style={styles.receiptGridText}>
                          {selectedBooking.num_players || selectedBooking.player_count} {(selectedBooking.num_players || selectedBooking.player_count) === 1 ? "Lobbian" : "Lobbians"}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Amount + Payment */}
                  {(selectedBooking.total_amount || selectedBooking.amount) ? (
                    <View style={styles.receiptAmountRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.receiptRupeeIcon}>₹</Text>
                        <Text style={styles.receiptAmountValue}>
                          {Number(selectedBooking.total_amount || selectedBooking.amount).toLocaleString("en-IN")}
                        </Text>
                      </View>
                      {selectedBooking.payment_details?.cf_payment_id || selectedBooking.payment_details?.razorpay_payment_id || selectedBooking.payment_details?.paid_at ? (
                        <View style={{ alignItems: "flex-end", flex: 1, minWidth: 0 }}>
                          {(selectedBooking.payment_details?.cf_payment_id || selectedBooking.payment_details?.razorpay_payment_id) ? (
                            <Text style={styles.receiptPaymentId} numberOfLines={1}>{selectedBooking.payment_details.cf_payment_id || selectedBooking.payment_details.razorpay_payment_id}</Text>
                          ) : null}
                          {selectedBooking.payment_details?.paid_at ? (
                            <Text style={styles.receiptPaidAt}>
                              {new Date(selectedBooking.payment_details.paid_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Refund info */}
                  {getBookingRefundLabel(selectedBooking) ? (
                    <View style={styles.receiptRefundRow}>
                      <Text style={styles.receiptRefundLabel}>Refund</Text>
                      <Text style={styles.receiptRefundValue}>{getBookingRefundLabel(selectedBooking)}</Text>
                    </View>
                  ) : null}

                  {/* QR Code */}
                  {selectedBooking.qr_data && selectedBooking.status === "confirmed" ? (
                    <View style={styles.qrCodeSection}>
                      <View style={styles.qrCodeWrap}>
                        <QRCode value={selectedBooking.qr_data} size={160} ecl="M" />
                      </View>
                      <Text style={styles.qrCodeHint}>Show this to venue staff to check in</Text>
                    </View>
                  ) : null}
                </View>

                {String(selectedBooking.status || "").toLowerCase() === "completed" && !reviewedBookingIds.has(getBookingId(selectedBooking)) ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.bookingReviewBtn, { minHeight: 48, borderRadius: 16 }]}
                    onPress={() => openReviewModal(selectedBooking)}
                  >
                    <MessageSquare size={16} color="#FFFFFF" />
                    <Text style={styles.bookingReviewBtnText}>Review Booking</Text>
                  </TouchableOpacity>
                ) : null}

                {selectedBooking.status === "confirmed" &&
                  (user?.role !== "venue_owner" || selectedBooking.booking_type === "walk_in") ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.bookingCancelBtn}
                    onPress={() => setCancelConfirm(selectedBooking)}
                  >
                    <Text style={styles.bookingCancelBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={!!cancelConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCancelConfirm(null)}
      >
        <View style={styles.bookingModalOverlay}>
          <TouchableOpacity style={styles.guideBackdrop} activeOpacity={1} onPress={() => setCancelConfirm(null)} />
          {cancelConfirm ? (
            <View style={[styles.bookingConfirmSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.guideHandleWrap}>
                <View style={styles.guideHandle} />
              </View>
              <Text style={styles.bookingConfirmTitle}>Cancel Booking?</Text>
              <Text style={styles.bookingConfirmText}>
                Are you sure you want to cancel your booking at {cancelConfirm.venue_name || cancelConfirm.venue?.name || "this venue"}?
              </Text>

              {/* Refund Policy Breakdown */}
              {(() => {
                const slotDate = cancelConfirm.date || cancelConfirm.booking_date;
                const slotTime = cancelConfirm.start_time || cancelConfirm.time;
                let hoursLeft = null;
                if (slotDate && slotTime) {
                  const [h, m] = String(slotTime).split(":").map(Number);
                  const slotDt = new Date(slotDate);
                  slotDt.setHours(h, m, 0, 0);
                  hoursLeft = Math.max(0, (slotDt - new Date()) / 3600000);
                }
                const tier = hoursLeft === null ? null : hoursLeft >= 24 ? "full" : hoursLeft >= 4 ? "half" : "none";
                const hoursLabel = hoursLeft !== null ? `${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m left` : null;
                const tiers = [
                  { key: "full", label: "24h+ before slot", refund: "100% refund", sub: "Refunded in 5-7 business days", color: "#10B981", bg: "rgba(16,185,129,0.1)", ring: "rgba(16,185,129,0.3)" },
                  { key: "half", label: "4–24h before slot", refund: "50% refund", sub: "Refunded in 5-7 business days", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", ring: "rgba(245,158,11,0.3)" },
                  { key: "none", label: "Less than 4h", refund: "No refund", sub: null, color: "#EF4444", bg: "rgba(239,68,68,0.1)", ring: "rgba(239,68,68,0.3)" },
                ];
                return (
                  <View style={styles.refundPolicyCard}>
                    <View style={styles.refundPolicyHeader}>
                      <Text style={styles.refundPolicyTitle}>Refund Policy</Text>
                      {hoursLabel ? <Text style={styles.refundPolicyTime}>{hoursLabel}</Text> : null}
                    </View>
                    {tiers.map((t) => (
                      <View key={t.key} style={[styles.refundPolicyRow, tier === t.key && { backgroundColor: t.bg, borderWidth: 1, borderColor: t.ring }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.refundPolicyLabel, tier === t.key && { color: "#0F172A", fontWeight: "600" }]}>{t.label}</Text>
                          {t.sub && tier === t.key ? <Text style={styles.refundPolicySub}>{t.sub}</Text> : null}
                        </View>
                        <Text style={[styles.refundPolicyValue, { color: t.color }]}>{t.refund}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              <View style={styles.bookingConfirmActions}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.bookingKeepBtn}
                  onPress={() => setCancelConfirm(null)}
                  disabled={cancellingBooking}
                >
                  <Text style={styles.bookingKeepBtnText}>Keep Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.bookingCancelDangerBtn}
                  onPress={() => handleCancelBooking(cancelConfirm)}
                  disabled={cancellingBooking}
                >
                  {cancellingBooking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.bookingCancelDangerBtnText}>Yes, Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={!!reviewBooking}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeReviewModal}
      >
        <View style={styles.reviewModalOverlay}>
          {reviewBooking ? (
            <View style={[styles.reviewSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {submittingReview === "done" ? (
                <View style={styles.reviewDoneState}>
                  <View style={styles.reviewDoneIcon}>
                    <Check size={24} color={PRIMARY_COLOR} />
                  </View>
                  <Text style={styles.reviewDoneTitle}>Thank you!</Text>
                  <Text style={styles.reviewDoneText}>Your review has been submitted</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.reviewDoneBtn}
                    onPress={closeReviewModal}
                  >
                    <Text style={styles.reviewDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <KeyboardAwareScrollView
                  enableOnAndroid
                  extraScrollHeight={80}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.reviewScrollContent}
                >
                  {/* Header */}
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewHeaderCopy}>
                      <Text style={styles.reviewTitle}>Rate your experience</Text>
                      <Text style={styles.reviewSubtitle}>
                        {reviewBooking.venue_name || reviewBooking.venue?.name || "Venue"}
                        {reviewBooking.date ? ` · ${new Date(reviewBooking.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.guideCloseButton} onPress={closeReviewModal}>
                      <X size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {/* Stars */}
                  <View style={styles.reviewStarsWrap}>
                    <View style={styles.reviewStarsRow}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <TouchableOpacity
                          key={score}
                          activeOpacity={0.8}
                          onPress={() => setReviewRating(score)}
                          style={styles.reviewStarBtn}
                        >
                          <Star
                            size={36}
                            color={score <= reviewRating ? "#FACC15" : "rgba(148,163,184,0.2)"}
                            fill={score <= reviewRating ? "#FACC15" : "transparent"}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {reviewRating > 0 ? (
                      <View style={styles.reviewFeedbackRow}>
                        <Text style={styles.reviewRatingEmoji}>
                          {["", "😞", "😐", "🙂", "😄", "🤩"][reviewRating]}
                        </Text>
                        <Text style={[
                          styles.reviewRatingLabel,
                          reviewRating <= 2 && { color: "#EF4444" },
                          reviewRating === 3 && { color: "#F59E0B" },
                          reviewRating >= 4 && { color: PRIMARY_COLOR },
                        ]}>
                          {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Comment */}
                  {reviewRating > 0 ? (
                    <View style={styles.reviewCommentWrap}>
                      <Text style={styles.reviewCommentLabel}>
                        COMMENT <Text style={styles.reviewCommentLabelMuted}>(optional)</Text>
                      </Text>
                      <TextInput
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        multiline
                        numberOfLines={3}
                        maxLength={500}
                        placeholder={reviewRating >= 4 ? "What did you enjoy most?" : reviewRating >= 3 ? "What could be improved?" : "What went wrong?"}
                        placeholderTextColor="rgba(148,163,184,0.3)"
                        style={styles.reviewCommentInput}
                        textAlignVertical="top"
                        onFocus={() => setReviewCommentFocused(true)}
                        onBlur={() => setReviewCommentFocused(false)}
                      />
                      <View style={styles.reviewCountRow}>
                        <Text style={[styles.reviewCountText, reviewComment.length > 450 && styles.reviewCountTextWarn]}>
                          {reviewComment.length}/500
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Submit */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.reviewSubmitBtn, (!reviewRating || submittingReview === true) && styles.reviewSubmitBtnDisabled]}
                    disabled={!reviewRating || submittingReview === true}
                    onPress={handleSubmitReview}
                  >
                    {submittingReview === true ? (
                      <View style={styles.reviewSubmitInner}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.reviewSubmitBtnText}>Submitting...</Text>
                      </View>
                    ) : (
                      <View style={styles.reviewSubmitInner}>
                        <Send size={16} color="#FFFFFF" />
                        <Text style={styles.reviewSubmitBtnText}>Submit Review</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </KeyboardAwareScrollView>
              )}
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={showLevelUpGuide}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          setExpandedMetricKey(null);
          setShowLevelUpGuide(false);
        }}
      >
        <View style={styles.guideOverlay}>
          <TouchableOpacity
            style={styles.guideBackdrop}
            activeOpacity={1}
            onPress={() => {
              setExpandedMetricKey(null);
              setShowLevelUpGuide(false);
            }}
          />
          <View style={[styles.guideSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.guideHandleWrap}>
              <View style={styles.guideHandle} />
            </View>
            <View style={[styles.guideHeader, { paddingTop: Math.max(insets.top * 0.15, 4) }]}>
              <View style={styles.guideTitleRow}>
                <View style={styles.guideIconBox}>
                  <TrendingUp size={18} color="#FFFFFF" />
                </View>
                <View style={styles.guideHeaderTextWrap}>
                  <Text style={styles.guideTitle}>Game Performance</Text>
                  <Text style={styles.guideSubtitle}>How your overall score is calculated</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.guideCloseButton}
                onPress={() => {
                  setExpandedMetricKey(null);
                  setShowLevelUpGuide(false);
                }}
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
                  <ScoreRing score={overallScore} size={80} strokeWidth={6} arcRotation={0} textSize={26} />
                  <View style={styles.guideSummaryBody}>
                    <Text style={styles.guideSummaryEyebrow}>Your Score</Text>
                    <Text style={styles.guideSummaryTitle}>{card?.overall_tier || tier.label}</Text>
                    <View style={styles.guideProgressTrack}>
                      <View style={[styles.guideProgressFill, { width: `${Math.max(0, Math.min(100, overallScore))}%` }]} />
                    </View>
                    <Text style={styles.guideSummaryMeta}>{overallScore} / 100</Text>
                  </View>
                </View>
              </View>

              <View style={styles.guideSectionHeader}>
                <View style={styles.guideSectionTitleRow}>
                  <Target size={14} color={PRIMARY_COLOR} />
                  <Text style={styles.guideSectionTitle}>Score Breakdown</Text>
                </View>
                <Text style={styles.guideSectionMeta}>100 pts max</Text>
              </View>

              {SCORE_METRICS.map((item) => {
                const ItemIcon = item.icon;
                const actualScore = card?.score_breakdown?.[item.key];
                const contributedPts =
                  actualScore !== undefined && actualScore !== null
                    ? Math.round((Number(actualScore) * item.weight) / 100)
                    : null;
                const expanded = expandedMetricKey === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.9}
                    style={styles.guideListCard}
                    onPress={() => setExpandedMetricKey((prev) => (prev === item.key ? null : item.key))}
                  >
                    <View style={styles.guideListHeader}>
                      <View style={styles.guideListIconBox}>
                        <ItemIcon size={16} color={PRIMARY_COLOR} />
                      </View>
                      <View style={styles.guideListBody}>
                        <View style={styles.guideListTitleRow}>
                          <Text style={styles.guideListTitle}>{item.label}</Text>
                          <Text style={styles.guideListWeight}>{item.weight}%</Text>
                        </View>
                        {actualScore !== undefined && actualScore !== null ? (
                          <View style={styles.guideMetricWrap}>
                            <View style={styles.guideMetricTrack}>
                              <View style={[styles.guideMetricFill, { width: `${Math.max(0, Math.min(100, Number(actualScore)))}%` }]} />
                            </View>
                            <Text style={styles.guideMetricValue}>{contributedPts}pts</Text>
                          </View>
                        ) : (
                          <Text style={styles.guideListDesc}>{item.desc}</Text>
                        )}
                      </View>
                      <View style={[styles.guideChevronWrap, expanded && styles.guideChevronWrapExpanded]}>
                        <ChevronRight size={14} color="#CBD5E1" />
                      </View>
                    </View>
                    {expanded ? (
                      <View style={styles.guideBulletWrap}>
                        <Text style={styles.guideListDesc}>{item.desc}</Text>
                        {item.items.map((bullet) => (
                          <View key={bullet} style={styles.guideBulletRow}>
                            <View style={styles.guideBulletDot} />
                            <Text style={styles.guideBulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.guideSectionTitleRow}>
                <Award size={14} color={PRIMARY_COLOR} />
                <Text style={styles.guideSectionTitle}>Tier Progression</Text>
              </View>
              <View style={styles.tierGrid}>
                {TIER_DATA.map((item) => {
                  const isCurrent = overallScore >= item.min && overallScore <= item.max;
                  const isPassed = overallScore > item.max;
                  return (
                    <View
                      key={item.tier}
                      style={[
                        styles.tierCard,
                        isCurrent && styles.tierCardActive,
                        isPassed && styles.tierCardPassed,
                      ]}
                    >
                      <Text style={[styles.tierCardTitle, isCurrent && styles.tierCardTitleActive]}>
                        {item.tier}
                      </Text>
                      <Text style={[styles.tierCardRange, isCurrent && styles.tierCardRangeActive]}>
                        {item.range}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
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
          <TouchableOpacity style={styles.guideBackdrop} activeOpacity={1} onPress={() => setShowEngagementGuide(false)} />
          <View style={[styles.guideSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.guideHandleWrap}>
              <View style={styles.guideHandle} />
            </View>
            <View style={[styles.guideHeader, { paddingTop: Math.max(insets.top * 0.15, 4) }]}>
              <View style={styles.guideTitleRow}>
                <View style={styles.guideIconBox}>
                  <Zap size={18} color="#FFFFFF" />
                </View>
                <View style={styles.guideHeaderTextWrap}>
                  <Text style={styles.guideTitle}>Social Media Engagement Level</Text>
                  <Text style={styles.guideSubtitle}>Weekly activity score resets every Monday</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.guideCloseButton} onPress={() => setShowEngagementGuide(false)}>
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
                  <ScoreRing score={socialScore} size={80} strokeWidth={6} arcRotation={12} textSize={26} />
                  <View style={styles.guideSummaryBody}>
                    <Text style={styles.guideSummaryEyebrow}>Your Level</Text>
                    <Text style={styles.guideSummaryTitle}>{engagementLevel}</Text>
                    <View style={styles.guideProgressTrack}>
                      <View style={[styles.guideProgressFill, { width: `${Math.max(0, Math.min(100, socialScore))}%` }]} />
                    </View>
                    <Text style={styles.guideSummaryMeta}>{socialScore} / 100 pts this week</Text>
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
                      ? socialScore >= item.threshold && socialScore < ENGAGEMENT_LEVELS[index + 1].threshold
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
                      <Text style={styles.levelCardThreshold}>{item.threshold}+</Text>
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
  content: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  // Avatar Preview Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxContent: {
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: -48,
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  lightboxAvatar: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  lightboxName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },

  heroShell: {
    padding: 0,
    overflow: "hidden",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  avatarShell: {
    position: "relative",
  },
  avatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 2,
    borderWidth: 2,
    borderColor: "#A7F3D0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  avatarRingEmpty: {
    borderColor: "#E5E7EB",
  },
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
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  topStats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  topStatItem: {
    alignItems: "center",
    gap: 3,
  },
  topStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
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
  profileName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
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
  bioText: {
    paddingHorizontal: 16,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
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
  streakText: {
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
  sportText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  tabsCard: {
    padding: 0,
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderTopColor: "#10B981",
    backgroundColor: "#10B9810D",
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
  statsTopGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  scorePanelPressable: {
    flex: 1,
  },
  scorePanelCard: {
    gap: 16,
    minHeight: 142,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 14,
  },
  scorePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  scorePanelEyebrow: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  scorePanelBody: {
    alignItems: "center",
    gap: 12,
  },
  scoreDial: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  scoreDialTrack: {
    position: "absolute",
    inset: 0,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: "#F8FAFC",
    backgroundColor: "#FFFFFF",
  },
  scoreDialArc: {
    position: "absolute",
    top: 3,
    width: 16,
    height: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  scoreDialArcOverall: {
    left: 33,
  },
  scoreDialArcEngagement: {
    left: 42,
    transform: [{ rotate: "12deg" }],
  },
  scoreDialValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  scorePanelLevel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: PRIMARY_COLOR,
    textAlign: "center",
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
    paddingHorizontal: 8,
    paddingVertical: 18,
  },
  statsStripDivider: {
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  statsStripValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  statsStripValueAccent: {
    color: PRIMARY_COLOR,
  },
  statsStripLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
    textAlign: "center",
  },
  statsStripSub: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#10B981",
    textAlign: "center",
  },
  recordCard: {
    paddingVertical: 0,
    overflow: "hidden",
  },
  recordTopRow: {
    flexDirection: "row",
  },
  recordTopCell: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 6,
  },
  recordTopDivider: {
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  recordTopLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordTopLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  recordTopValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  recordBottom: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 14,
  },
  recordSectionLabel: {
    paddingHorizontal: 14,
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
    marginHorizontal: 14,
    marginTop: 12,
  },
  recordBarFill: {
    height: "100%",
  },
  recordSummaryRow: {
    flexDirection: "row",
    marginTop: 14,
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
  careerOverviewCard: {
    gap: 14,
  },
  sportsPlayedCard: {
    gap: 12,
  },
  sportsPlayedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  sportsPlayedCount: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  careerListCard: {
    gap: 10,
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
  careerListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  careerListIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  careerListIconWin: {
    backgroundColor: "#ECFDF5",
  },
  careerListIconLoss: {
    backgroundColor: "#FEF2F2",
  },
  careerListIconNeutral: {
    backgroundColor: "#F8FAFC",
  },
  careerListBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  careerListTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  careerListDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  careerTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  careerTypePillWin: {
    backgroundColor: "#ECFDF5",
  },
  careerTypePillLoss: {
    backgroundColor: "#FEF2F2",
  },
  careerTypePillNeutral: {
    backgroundColor: "#F8FAFC",
  },
  careerTypeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  careerTypeTextWin: {
    color: "#10B981",
  },
  careerTypeTextLoss: {
    color: "#EF4444",
  },
  careerTypeTextNeutral: {
    color: "#64748B",
  },
  organizationWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  organizationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    maxWidth: "100%",
  },
  organizationName: {
    maxWidth: 120,
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  organizationType: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: PRIMARY_COLOR,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scoreBody: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scoreTier: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "47%",
    minHeight: 104,
    justifyContent: "center",
    gap: 6,
  },
  metricCardAccent: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  metricValueAccent: {
    color: PRIMARY_COLOR,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricLabelAccent: {
    color: PRIMARY_COLOR,
  },
  metricSub: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  metricSubAccent: {
    color: "#10B981",
  },
  engagementCard: {
    gap: 14,
  },
  engagementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  engagementGuideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
  },
  engagementGuideText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  engagementBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  engagementInfo: {
    flex: 1,
    gap: 4,
  },
  engagementLevel: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  engagementSub: {
    fontSize: 12,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  breakdownRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 8,
  },
  breakdownItem: {
    gap: 2,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  breakdownLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "capitalize",
  },
  engagementBreakdownSection: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  engagementBreakdownTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  engagementBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  engagementBreakdownLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "capitalize",
  },
  engagementBreakdownBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  engagementBreakdownBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
  },
  engagementBreakdownVal: {
    width: 30,
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
    textAlign: "right",
  },
  careerSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  careerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  careerItem: {
    width: "47%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  careerValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  careerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyBookings: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyBookingsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
  },
  emptyBookingsText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  bookingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bookingHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  bookingHeaderMeta: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  bookingHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },
  bookingHeaderBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  bookingSearchWrap: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  bookingSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  bookingLoadingState: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingCardsWrap: {
    gap: 12,
  },
  bookingHistoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 10,
  },
  bookingCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  bookingCardVenue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 20,
  },
  bookingCardAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  bookingCardMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  bookingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bookingBadgeGroup: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  bookingStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bookingStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bookingRefundPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
  },
  bookingRefundText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
    textTransform: "uppercase",
  },
  bookingReviewedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
  },
  bookingReviewedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
    textTransform: "uppercase",
  },
  bookingReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  bookingReviewBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  bookingPagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  bookingPageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  bookingPageBtnDisabled: {
    opacity: 0.3,
  },
  bookingPageNumBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  bookingPageNumBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  bookingPageNumText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  bookingPageNumTextActive: {
    color: "#FFFFFF",
  },
  bookingPageEllipsis: {
    width: 36,
    height: 36,
    textAlign: "center",
    lineHeight: 36,
    fontSize: 12,
    color: "#94A3B8",
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
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
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
  gameHistorySumLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", color: "#64748B", marginTop: 2 },
  gameHistoryEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
  gameHistoryEmptyText: { fontSize: 13, color: "#94A3B8" },
  gameHistoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  gameHistoryRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  gameHistorySport: { fontSize: 13, fontWeight: "600", color: "#0F172A", textTransform: "capitalize" },
  gameHistoryVenue: { fontSize: 11, color: "#64748B" },
  gameHistoryResultPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  gameHistoryResultWin: { backgroundColor: "rgba(16,185,129,0.1)" },
  gameHistoryResultLoss: { backgroundColor: "rgba(239,68,68,0.1)" },
  gameHistoryResultDraw: { backgroundColor: "#F1F5F9" },
  gameHistoryResultText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  gameHistoryMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  gameHistoryMetaText: { fontSize: 11, color: "#64748B" },
  gameHistoryGames: { fontSize: 12, fontWeight: "600", color: "#334155", marginLeft: "auto" },
  gameHistoryScoreLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  gameHistoryScoreText: { fontSize: 10, fontWeight: "700" },

  bookingModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.6)",
  },
  bookingDetailSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    overflow: "hidden",
  },
  bookingDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },
  bookingDetailHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  bookingDetailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  bookingDetailSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  bookingDetailScroll: {
    flexGrow: 0,
  },
  bookingDetailContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 14,
  },
  // Receipt card (matches web BookingReceipt)
  receiptCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.5)",
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 24,
    gap: 16,
  },
  receiptHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  receiptVenueName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  receiptTurfLine: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  receiptStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  receiptStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  receiptGrid: {
    flexDirection: "row",
    gap: 12,
  },
  receiptGridCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  receiptGridText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },
  receiptAmountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.4)",
  },
  receiptRupeeIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  receiptAmountValue: {
    fontSize: 22,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
  receiptPaymentId: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "monospace",
  },
  receiptPaidAt: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  receiptRefundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.4)",
  },
  receiptRefundLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  receiptRefundValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  qrCodeSection: {
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  qrCodeWrap: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  qrCodeHint: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  bookingReceiptBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingReceiptBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bookingCancelBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingCancelBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
  reviewModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.6)",
  },
  reviewSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    maxHeight: "90%",
  },
  reviewDoneState: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    gap: 4,
  },
  reviewDoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${PRIMARY_COLOR}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  reviewDoneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  reviewDoneText: {
    fontSize: 14,
    color: "rgba(100,116,139,0.6)",
    textAlign: "center",
    marginBottom: 12,
  },
  reviewDoneBtn: {
    minWidth: 100,
    height: 36,
    borderRadius: 999,
    paddingHorizontal: 24,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewDoneBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewScrollContent: {
    paddingBottom: 20,
    gap: 20,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.2)",
  },
  reviewHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  reviewSubtitle: {
    fontSize: 11,
    color: "rgba(148,163,184,0.5)",
    fontWeight: "500",
    marginTop: 2,
  },
  reviewStarsWrap: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reviewStarBtn: {
    padding: 4,
  },
  reviewFeedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reviewRatingLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  reviewRatingEmoji: {
    fontSize: 18,
  },
  reviewCommentWrap: {
    gap: 6,
    paddingHorizontal: 20,
  },
  reviewCommentLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(15,23,42,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  reviewCommentLabelMuted: {
    color: "rgba(148,163,184,0.3)",
    textTransform: "none",
    letterSpacing: 0,
  },
  reviewCommentInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.4)",
    backgroundColor: "rgba(248,250,252,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  reviewCountRow: {
    alignItems: "flex-end",
  },
  reviewCountText: {
    fontSize: 10,
    color: "rgba(148,163,184,0.3)",
    fontWeight: "700",
  },
  reviewCountTextWarn: {
    color: "#F59E0B",
  },
  reviewSubmitBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewSubmitBtnDisabled: {
    opacity: 0.5,
  },
  reviewSubmitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewSubmitBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bookingConfirmSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  bookingConfirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  bookingConfirmText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  refundPolicyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  refundPolicyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  refundPolicyTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  refundPolicyTime: { fontSize: 10, fontWeight: "500", color: "#94A3B8" },
  refundPolicyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refundPolicyLabel: { fontSize: 12, color: "#94A3B8" },
  refundPolicySub: { fontSize: 10, color: "#64748B", marginTop: 2 },
  refundPolicyValue: { fontSize: 12, fontWeight: "600" },
  bookingConfirmActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 18,
    paddingBottom: 8,
  },
  bookingKeepBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingKeepBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },
  bookingCancelDangerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingCancelDangerBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  postsContainer: {
    marginHorizontal: -16,
  },
  tabContentStack: {
    paddingTop: 2,
    flexGrow: 1,
  },
  tabPageFill: {
    flexGrow: 1,
  },
  hiddenTabPage: {
    display: "none",
  },
  sectionSpacing: {
    marginTop: 12,
  },
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
  guideSummaryDial: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  guideSummaryDialTrack: {
    position: "absolute",
    inset: 0,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: "rgba(148,163,184,0.12)",
    backgroundColor: "#FFFFFF",
  },
  guideSummaryDialArc: {
    position: "absolute",
    top: 4,
    width: 24,
    height: 7,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  guideSummaryDialArcOverall: {
    left: 28,
  },
  guideSummaryDialArcEngagement: {
    left: 37,
    transform: [{ rotate: "12deg" }],
  },
  guideSummaryDialValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
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
  guideSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  guideSectionMeta: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
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
  guideListTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  guideListTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  guideListWeight: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
  },
  guideListDesc: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 16,
  },
  guideChevronWrap: {
    transform: [{ rotate: "0deg" }],
  },
  guideChevronWrapExpanded: {
    transform: [{ rotate: "90deg" }],
  },
  guideMetricWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  guideMetricTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.14)",
    overflow: "hidden",
  },
  guideMetricFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.72)",
  },
  guideMetricValue: {
    fontSize: 10,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  guideBulletWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.12)",
    gap: 6,
  },
  guideBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  guideBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.45)",
    marginTop: 5,
  },
  guideBulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  tierGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  tierCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  tierCardActive: {
    backgroundColor: "rgba(16,185,129,0.14)",
    borderColor: "rgba(16,185,129,0.32)",
  },
  tierCardPassed: {
    backgroundColor: "rgba(16,185,129,0.08)",
  },
  tierCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  tierCardTitleActive: {
    color: PRIMARY_COLOR,
  },
  tierCardRange: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tierCardRangeActive: {
    color: PRIMARY_COLOR,
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
  sectionCard: {
    gap: 14,
  },
  badgesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgesHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgesEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748B",
  },
  badgesCount: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeBody: {
    flex: 1,
    gap: 4,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  badgeMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },
  badgesFooterText: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#CBD5E1",
  },
  emptyBadgeState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBadgeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  emptyBadgeText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});
