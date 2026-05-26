import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppCard from "../ui/AppCard";
import { FONTS } from "../../constants/theme";

function StatBox({ value, label, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.statBox} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FeedStatsCard({ engagement, onStatPress, onFollowersPress, onFollowingPress, onPromptReply }) {
  if (!engagement) return null;

  return (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.streakWrap}>
          <Ionicons name="flame-outline" size={14} color="#F59E0B" />
          <Text style={styles.streakText}>
            {engagement.current_streak || 0} day{engagement.current_streak === 1 ? "" : "s"} streak
          </Text>
        </View>
        <View style={styles.levelPill}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.levelText}>{engagement.level || "Bench"}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatBox value={engagement.followers_count || 0} label="Followers" onPress={onFollowersPress || onStatPress} />
        <StatBox value={engagement.following_count || 0} label="Following" onPress={onFollowingPress || onStatPress} />
        <StatBox value={engagement.total_posts || 0} label="Posts" onPress={onStatPress} />
      </View>

      <TouchableOpacity activeOpacity={0.9} style={styles.promptRow} onPress={onPromptReply}>
        <Ionicons name="trophy-outline" size={16} color="#D1FAE5" />
        <Text style={styles.promptText}>{engagement.daily_prompt || "Post your match score!"}</Text>
        <View style={styles.replyButton}>
          <Text style={styles.replyLabel}>Reply</Text>
        </View>
      </TouchableOpacity>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#059669",
    borderColor: "#059669",
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  streakWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    color: "#ECFDF5",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: FONTS.bodyExtraBold,
  },
  statLabel: {
    color: "#D1FAE5",
    marginTop: 4,
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  promptRow: {
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promptText: {
    flex: 1,
    color: "#ECFDF5",
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
  },
  replyButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyLabel: {
    color: "#059669",
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
  },
});
