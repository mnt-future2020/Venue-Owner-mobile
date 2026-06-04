import { useEffect } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { BackHandler, StyleSheet, View } from "react-native";
import SwipeableTabView from "../../components/SwipeableTabView";

const FEED_PATH = "/feed";
// The 6 top-level tab routes. Only when the user is sitting on EXACTLY one
// of these (not a child like /venues/abc-123) do we intercept the Android
// back button — anything deeper falls through to expo-router's Stack so the
// natural pop-to-parent behaviour still works.
const TAB_PATHS = new Set([
  "/feed",
  "/venues",
  "/dashboard",
  "/finance",
  "/chat",
  "/profile",
]);

// Swipeable pager — mirrors mobile player app exactly.
// The Stack underneath registers every tab route so expo-router knows about
// them (for deep-link / state restoration), while SwipeableTabView renders
// the actual horizontal swipe pager on top with its own BottomTabBar.
export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Android hardware back / gesture handling. Goal: respect navigation
  // history (Venues -> Profile -> back goes to Venues, not Feed), but never
  // exit the app from a non-Feed top-level tab without first showing Feed.
  //
  // Flow:
  // - On a sub-screen (/venues/[id], /bookings/[bookingId], etc.) -> always
  //   let expo-router pop the stack to its parent.
  // - On Feed -> let the system handle it (exit / minimize app).
  // - On a non-Feed top-level tab WITH history -> let the stack pop to the
  //   previously-visited tab.
  // - On a non-Feed top-level tab with NO history (e.g. deep-linked here,
  //   or first-launch app-into-Chat) -> redirect to Feed, swallow event.
  // iOS has no hardware back so this is Android-only.
  useEffect(() => {
    const onBackPress = () => {
      if (!TAB_PATHS.has(pathname)) {
        return false;
      }
      if (pathname === FEED_PATH) {
        return false;
      }
      if (router.canGoBack && router.canGoBack()) {
        return false;
      }
      router.replace("/(tabs)/feed");
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [pathname, router]);

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
