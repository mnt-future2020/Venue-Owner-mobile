import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import ChatScreenContent from "../../components/chat/ChatScreenContent";
import SwipeTabContext from "../../context/SwipeTabContext";

export default function ChatTab() {
  const { inPager } = useContext(SwipeTabContext);

  if (!inPager) {
    return <View style={styles.container} />;
  }

  // Header rendered by SwipeableTabView (shared, fixed above the pager).
  return <ChatScreenContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
});
