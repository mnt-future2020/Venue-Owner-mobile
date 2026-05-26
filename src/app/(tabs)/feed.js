import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import Header from "../../components/Header";
import FeedScreen from "../../components/feed/FeedScreen";
import useNotificationBell from "../../hooks/useNotificationBell";
import { safePush } from "../../services/navigationGuard";
import SwipeTabContext from "../../context/SwipeTabContext";

export default function FeedTab() {
  const router = useRouter();
  const { bellAction } = useNotificationBell();
  const { inPager } = useContext(SwipeTabContext);

  // When rendered by the Stack underneath the SwipeableTabView overlay, this
  // component sits OUTSIDE the SwipeTabContext provider (so inPager is the
  // default `false`). Returning a blank View prevents double-render of the
  // FeedScreen + FlashList — that double-mount was eating horizontal pan
  // gestures and blocking the swipe-to-open-drawer behaviour.
  if (!inPager) {
    return <View style={styles.container} />;
  }

  const searchAction = {
    key: "search-users",
    icon: <Search size={18} color="#374151" strokeWidth={2.3} />,
    onPress: () => safePush(router, "/(stack)/search"),
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header logo showLocation actions={[searchAction, bellAction]} />
      <FeedScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
});
