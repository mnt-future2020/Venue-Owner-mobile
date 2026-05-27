import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import FeedScreen from "../../components/feed/FeedScreen";
import SwipeTabContext from "../../context/SwipeTabContext";

export default function FeedTab() {
  const { inPager } = useContext(SwipeTabContext);

  // Stack-underneath render (no SwipeTabContext provider) → blank, so the
  // SwipeableTabView pager above is the only mount of this content.
  if (!inPager) {
    return <View style={styles.container} />;
  }

  // Header is rendered ONCE by SwipeableTabView above the pager — don't
  // wrap with another Header / SafeAreaView here or it'd swipe with the tab.
  return <FeedScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
});
