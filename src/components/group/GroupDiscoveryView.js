import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  Search,
  X,
  Plus,
  Users,
  Lock,
  Globe,
  Sparkles,
  ArrowLeft,
} from "lucide-react-native";
import chatService from "../../services/chatService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { useLocation } from "../../context/LocationContext";

const SPORT_EMOJI = {
  football: "\u26bd",
  cricket: "\ud83c\udfcf",
  badminton: "\ud83c\udff8",
  tennis: "\ud83c\udfbe",
  basketball: "\ud83c\udfc0",
  volleyball: "\ud83c\udfd0",
  "table-tennis": "\ud83c\udfd3",
  swimming: "\ud83c\udfca",
};

// ── Group Row ───────────────────────────────────────────────
const GroupRow = React.memo(function GroupRow({ item, onPress, onJoin }) {
  const avatar = item.avatar_url || item.avatar || "";
  const initials = (item.name || "G")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      style={styles.groupRow}
      activeOpacity={0.6}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image
            source={{ uri: mediaUrl(avatar) }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Users size={20} color={PRIMARY_COLOR} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.groupBody}>
        <View style={styles.groupTopRow}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.groupName}>
              {item.name}
            </Text>
            {item.is_private ? (
              <Lock size={12} color="#9CA3AF" />
            ) : (
              <Globe size={12} color="#9CA3AF" />
            )}
          </View>
          {/* Type badge */}
          {item.group_type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.group_type.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.groupBottomRow}>
          <Text style={styles.groupMeta}>
            {item.member_count || 0} members
          </Text>
          {item.sport && (
            <Text style={styles.groupMeta}>
              {"  "}
              {SPORT_EMOJI[item.sport]} {item.sport}
            </Text>
          )}
        </View>
      </View>

      {/* Action */}
      <View>
        {item.is_member ? (
          <TouchableOpacity
            style={styles.openBtn}
            activeOpacity={0.7}
            onPress={() => onPress(item)}
          >
            <Text style={styles.openBtnText}>Open</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.joinBtn}
            activeOpacity={0.7}
            onPress={() => onJoin(item.id)}
          >
            <Text style={styles.joinBtnText}>
              {item.is_private ? "Request" : "Join"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ── Recommended Group Card ──────────────────────────────────
const RecommendedCard = React.memo(function RecommendedCard({
  item,
  onPress,
  onJoin,
}) {
  const avatar = item.avatar_url || item.avatar || "";

  const reasonLabel =
    item.rec_reason === "friends_are_in"
      ? "Friends here"
      : item.rec_reason === "matches_sport"
        ? "Your sport"
        : "Popular";

  return (
    <TouchableOpacity
      style={styles.recCard}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      {/* Top: avatar + info */}
      <View style={styles.recCardTop}>
        {avatar ? (
          <Image
            source={{ uri: mediaUrl(avatar) }}
            style={styles.recAvatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.recAvatarFallback}>
            <Users size={20} color={PRIMARY_COLOR} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.recName}>
            {item.name}
          </Text>
          <Text style={styles.recMeta}>
            {item.member_count || 0} members
            {item.friends_count > 0 && (
              <Text style={styles.recFriends}>
                {" "}
                · {item.friends_count} friends
              </Text>
            )}
          </Text>
        </View>
      </View>

      {/* Tags */}
      <View style={styles.recTags}>
        {item.sport && (
          <View style={styles.recTagSport}>
            <Text style={styles.recTagSportText}>
              {SPORT_EMOJI[item.sport]} {item.sport}
            </Text>
          </View>
        )}
        <View style={styles.recTagReason}>
          <Text style={styles.recTagReasonText}>{reasonLabel}</Text>
        </View>
      </View>

      {/* Join */}
      <TouchableOpacity
        style={styles.recJoinBtn}
        activeOpacity={0.7}
        onPress={() => onJoin(item.id)}
      >
        <Plus size={14} color="#FFFFFF" />
        <Text style={styles.recJoinBtnText}>Join Group</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ── Main Component ──────────────────────────────────────────
export default function GroupDiscoveryView({ onOpenGroup, onBack, onCreateGroup }) {
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState([]);
  const [recGroups, setRecGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef(search);
  searchRef.current = search;
  const { location } = useLocation();
  const city = location?.city;

  const loadGroups = useCallback(async () => {
    try {
      const params = {};
      const q = searchRef.current.trim();
      if (q) params.search = q;
      const res = await chatService.discoverGroups(params);
      setGroups(Array.isArray(res) ? res : res?.groups || []);
    } catch {
      toast.error("Failed to load groups");
    }
  }, []);

  const loadRecGroups = useCallback(async () => {
    try {
      const res = await chatService.recommendedGroups(city);
      setRecGroups(Array.isArray(res) ? res : res?.groups || []);
    } catch {
      // silently ignore recommendation errors
    }
  }, [city]);

  useEffect(() => {
    Promise.all([loadGroups(), loadRecGroups()]).finally(() =>
      setLoading(false),
    );
  }, [loadGroups, loadRecGroups]);

  // Debounced search
  const mountRef = useRef(true);
  useEffect(() => {
    if (mountRef.current) {
      mountRef.current = false;
      return;
    }
    const timeout = setTimeout(() => loadGroups(), 300);
    return () => clearTimeout(timeout);
  }, [search, loadGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadGroups(), loadRecGroups()]);
    setRefreshing(false);
  };

  const handleJoin = async (groupId) => {
    try {
      await chatService.joinGroup(groupId);
      toast.success("Joined group!");
      loadGroups();
      loadRecGroups();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to join");
    }
  };

  const handlePress = (item) => {
    if (onOpenGroup) {
      onOpenGroup({ id: item.id, type: "group" });
    }
  };

  // ── Render helpers ────────────────────────────────────────
  const renderRecommended = () => {
    if (search || recGroups.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrap}>
            <Sparkles size={12} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.sectionLabel}>{city ? `RECOMMENDED IN ${city.toUpperCase()}` : "RECOMMENDED FOR YOU"}</Text>
        </View>
        {recGroups.map((g) => (
          <RecommendedCard
            key={g.id}
            item={g}
            onPress={handlePress}
            onJoin={handleJoin}
          />
        ))}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Users size={28} color="#D1D5DB" />
        </View>
        <Text style={styles.emptyTitle}>
          {search ? "No groups found" : "No groups yet"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {search
            ? "Try a different search or create your own group"
            : "Discover communities or create your own"}
        </Text>
      </View>
    );
  };

  const renderGroupItem = ({ item }) => (
    <GroupRow item={item} onPress={handlePress} onJoin={handleJoin} />
  );

  const renderListHeader = () => (
    <View>
      {renderRecommended()}
      {search && groups.length > 0 && (
        <View style={styles.resultCountWrap}>
          <Text style={styles.resultCountText}>
            Results ({groups.length})
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle}>Discover Groups</Text>
            <Text style={styles.headerSubtitle}>
              Find communities, connect with players
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            activeOpacity={0.7}
            onPress={() => onCreateGroup && onCreateGroup()}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={search ? groups : groups}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGroupItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  headerSubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  // List
  listContent: { paddingBottom: 24 },

  // Section
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
  },

  // Result count
  resultCountWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  resultCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Group Row
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupBody: { flex: 1, gap: 3 },
  groupTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  nameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    flexShrink: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.12)",
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    letterSpacing: 0.5,
  },
  groupBottomRow: { flexDirection: "row", alignItems: "center" },
  groupMeta: { fontSize: 12, color: "#9CA3AF" },

  // Join / Open buttons
  joinBtn: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtnText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  openBtn: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  openBtnText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },

  // Recommended Card
  recCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  recCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  recAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
  },
  recAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  recName: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  recMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  recFriends: { color: PRIMARY_COLOR, fontWeight: "500" },
  recTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  recTagSport: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(5,150,105,0.06)",
  },
  recTagSportText: {
    fontSize: 10,
    fontWeight: "500",
    color: PRIMARY_COLOR,
    textTransform: "capitalize",
  },
  recTagReason: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  recTagReasonText: { fontSize: 10, fontWeight: "500", color: "#6B7280" },
  recJoinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 34,
    borderRadius: 17,
    backgroundColor: PRIMARY_COLOR,
  },
  recJoinBtnText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 18,
  },
});
