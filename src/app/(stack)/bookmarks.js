import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../../components/Header";
import BookmarksScreenContent from "../../components/bookmarks/BookmarksScreenContent";

export default function BookmarksScreen() {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Header title="Saved Posts" showBack />
      <BookmarksScreenContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
});
