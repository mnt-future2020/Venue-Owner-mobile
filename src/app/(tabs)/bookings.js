import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function BookingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Calendar size={48} color={PRIMARY_COLOR} />
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>View and manage bookings — coming in Phase 4</Text>
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
