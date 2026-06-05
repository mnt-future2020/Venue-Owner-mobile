import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {/* venue management — [id] redirects to (tabs)/venues for backwards compat */}
      <Stack.Screen name="venues/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="venues/form" options={{ headerShown: false }} />

      {/* walk-in */}
      <Stack.Screen name="walkin/index" options={{ headerShown: false }} />

      {/* check-in */}
      <Stack.Screen name="checkin" options={{ headerShown: false }} />

      {/* finance sub-screens (Payouts moved inline into the Finance tab) */}
      <Stack.Screen name="finance/link-bank" options={{ headerShown: false }} />

      {/* feed sub-screens — ported 1:1 from mobile player app */}
      <Stack.Screen name="feed/[postId]" options={{ headerShown: false }} />
      <Stack.Screen name="feed/create-post" options={{ headerShown: false }} />
      <Stack.Screen name="feed/create-story" options={{ headerShown: false }} />
      {/* No statusBar* options — native-stack on Android applies the value
          inconsistently and the change can persist after unmount, causing
          the bar to flip to white icons after the user returns to Feed.
          Instead we rely on:
            1. app.json's androidStatusBar baseline (dark icons / #FFFFFF bg)
            2. The root-level StatusBarEnforcer (app/_layout.js) that calls
               RNStatusBar.setBarStyle("dark-content") on every pathname
               change, so any rogue change is corrected on the next nav.
          The story viewer screen shows a thin white status bar strip on
          top of its dark content — visually consistent with the rest of
          the app, and there's no transition flash because the bar config
          never actually changes. */}
      <Stack.Screen name="feed/story-viewer" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />

      {/* chat — ported 1:1 from mobile player app */}
      <Stack.Screen name="chat/[conversationId]" options={{ headerShown: false }} />
      <Stack.Screen name="group-info/[groupId]" options={{ headerShown: false }} />

      {/* saved posts (bookmarks) */}
      <Stack.Screen name="bookmarks" options={{ headerShown: false }} />

      {/* legal — privacy / terms / refund */}
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="refund-policy" options={{ headerShown: false }} />
    </Stack>
  );
}
