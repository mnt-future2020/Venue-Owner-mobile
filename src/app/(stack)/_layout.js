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
    </Stack>
  );
}
