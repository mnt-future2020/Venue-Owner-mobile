import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PRIMARY_COLOR } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import { safePush } from "../../services/navigationGuard";

const FollowCard = React.memo(function FollowCard({ item, onToggleFollow, onOpenProfile }) {
  const avatarSrc = item.avatar || item.user_avatar;
  const fullName = item.name || item.user_name || "";
  // Match frontend: show only first name in suggested-follow card
  const firstName = fullName.split(" ")[0] || fullName;
  const initial = (fullName || "P").trim().charAt(0).toUpperCase();
  const userId = item.id || item.user_id;

  return (
    <View style={styles.profileCard}>
      {/* Tap avatar OR name → navigate to player profile (matches frontend goToProfile(s.id)) */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenProfile?.(userId)}>
        {avatarSrc ? (
          <Image source={{ uri: mediaUrl(avatarSrc) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onOpenProfile?.(userId)}>
        <Text numberOfLines={1} style={styles.name}>
          {firstName}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.followBtn, item.is_following && styles.followBtnActive]}
        onPress={() => onToggleFollow?.(userId)}
      >
        <Text style={[styles.followText, item.is_following && styles.followTextActive]}>
          {item.is_following ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

function SuggestedFollows({ users = [], onToggleFollow, isAlgoRanked }) {
  const router = useRouter();
  const handleOpenProfile = (userId) => {
    if (!userId) return;
    safePush(router, `/(stack)/player/${userId}`);
  };
  const data = useMemo(() => users.slice(0, 8), [users]);

  if (!data.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Suggested for you</Text>
        {/* {isAlgoRanked ? (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI Ranked</Text>
          </View>
        ) : null} */}
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => String(item.id || item.user_id)}
        renderItem={({ item }) => (
          <FollowCard item={item} onToggleFollow={onToggleFollow} onOpenProfile={handleOpenProfile} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews
      />
    </View>
  );
}

export default React.memo(SuggestedFollows);

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  aiBadge: {
    backgroundColor: "rgba(5,150,105,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 14,
    paddingRight: 10,
  },
  profileCard: {
    width: 88,
    alignItems: "center",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#94A3B8",
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  followBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    minWidth: 66,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
  },
  followBtnActive: {
    backgroundColor: "#F1F5F9",
  },
  followText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  followTextActive: {
    color: "#64748B",
  },
});
