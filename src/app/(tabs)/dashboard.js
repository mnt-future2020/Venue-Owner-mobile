import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Home } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.center}>
        <Home size={48} color={PRIMARY_COLOR} />
        <Text style={styles.title}>Welcome, {user?.name || "Owner"}</Text>
        <Text style={styles.subtitle}>Dashboard — coming in Phase 2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: PRIMARY_COLOR, marginTop: 12 },
  subtitle: { fontSize: 14, color: "#666", marginTop: 6 },
});
