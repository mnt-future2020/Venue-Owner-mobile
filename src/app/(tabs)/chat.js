import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../../components/Header";
import ChatScreenContent from "../../components/chat/ChatScreenContent";
import useNotificationBell from "../../hooks/useNotificationBell";

export default function ChatTab() {
  const { bellAction } = useNotificationBell();

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
