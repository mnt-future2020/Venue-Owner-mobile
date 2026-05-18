import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function VenuesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <MapPin size={48} color={PRIMARY_COLOR} />
        <Text style={styles.title}>Venues</Text>
        <Text style={styles.subtitle}>Manage your venues — coming in Phase 3</Text>
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
