import { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../../components/Header";
import ChatScreenContent from "../../components/chat/ChatScreenContent";
import useNotificationBell from "../../hooks/useNotificationBell";
import SwipeTabContext from "../../context/SwipeTabContext";

export default function ChatTab() {
  const { bellAction } = useNotificationBell();
  const { inPager } = useContext(SwipeTabContext);

  // Stack-underneath render → blank (see (tabs)/feed.js for full rationale).
  if (!inPager) {
    return <View style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header logo showLocation actions={[bellAction]} />
      <ChatScreenContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
});
