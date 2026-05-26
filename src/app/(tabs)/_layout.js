import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import SwipeableTabView from "../../components/SwipeableTabView";

// Swipeable pager — mirrors mobile player app exactly.
// The Stack underneath registers every tab route so expo-router knows about
// them (for deep-link / state restoration), while SwipeableTabView renders
// the actual horizontal swipe pager on top with its own BottomTabBar.
export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="feed" />
        <Stack.Screen name="venues" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="finance" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="profile" />
      </Stack>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <SwipeableTabView />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
