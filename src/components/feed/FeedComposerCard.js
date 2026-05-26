import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppCard from "../ui/AppCard";
import { PRIMARY_COLOR } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function FeedComposerCard({ onPress }) {
  const { user } = useAuth();

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || "P").trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.placeholder}>Share a training tip or update...</Text>
          <View style={styles.postButton}>
            <Text style={styles.postButtonText}>Post</Text>
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: "800",
  },
  placeholder: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 14,
  },
  postButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  postButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
