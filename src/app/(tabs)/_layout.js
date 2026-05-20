import { Tabs } from "expo-router";
import BottomTabBar from "../../components/BottomTabBar";

// ──────────────────────────────────────────────────────────────────────────
// Swipeable pager pattern (currently disabled — kept for reference).
//
// import { Stack } from "expo-router";
// import { StyleSheet, View } from "react-native";
// import SwipeableTabView from "../../components/SwipeableTabView";
//
// export default function TabsLayout() {
//   return (
//     <View style={styles.root}>
//       <Stack screenOptions={{ headerShown: false, animation: "none" }}>
//         <Stack.Screen name="dashboard" />
//         <Stack.Screen name="venues" />
//         <Stack.Screen name="finance" />
//         <Stack.Screen name="profile" />
//       </Stack>
//       <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
//         <SwipeableTabView />
//       </View>
//     </View>
//   );
// }
//
// const styles = StyleSheet.create({ root: { flex: 1 } });
// ──────────────────────────────────────────────────────────────────────────

// Plain expo-router Tabs — no swipe, no pager. BottomTabBar handles tab UI.
// Each route file (dashboard.js, venues.js, finance.js, profile.js) is
// rendered standalone by the Tabs navigator. The SwipeTabContext-based
// inPager guard inside each route file is commented out for this mode.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="venues" options={{ title: "Venue Mgmt" }} />
      <Tabs.Screen name="finance" options={{ title: "Finance" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
