import "../../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { AuthProvider } from "../context/AuthContext";
import { TabRefreshProvider } from "../context/TabRefreshContext";
import { LocationProvider } from "../context/LocationContext";
import { NotificationBadgeProvider } from "../context/NotificationBadgeContext";
import ToastManager from "../components/ToastManager";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { KeyboardProvider } from "../lib/keyboardController";

// Guard against keep-awake / native-module failures during dev (e.g. Expo Go)
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Manrope-Regular": require("../../assets/fonts/Manrope_400Regular.ttf"),
    "Manrope-Medium": require("../../assets/fonts/Manrope_500Medium.ttf"),
    "Manrope-SemiBold": require("../../assets/fonts/Manrope_600SemiBold.ttf"),
    "Manrope-Bold": require("../../assets/fonts/Manrope_700Bold.ttf"),
    "Manrope-ExtraBold": require("../../assets/fonts/Manrope_800ExtraBold.ttf"),
    "Chivo-Regular": require("../../assets/fonts/Chivo_400Regular.ttf"),
    "Chivo-Bold": require("../../assets/fonts/Chivo_700Bold.ttf"),
    "Chivo-Black": require("../../assets/fonts/Chivo_900Black.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Root layout mirrors mobile/src/app/_layout.js (player app) exactly —
  // player has no blink issue so we copy its native config verbatim:
  //   • StatusBar translucent={false} with solid bg (avoids transparent
  //     status bar repaints that look like a flash)
  //   • KeyboardProvider translucent flags = false
  //   • Stack animation "fade" (proven on mobile)
  //   • No detachInactiveScreens / freezeOnBlur overrides — defaults work
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider statusBarTranslucent={false} navigationBarTranslucent={false}>
          <SafeAreaProvider>
            <AuthProvider>
              <TabRefreshProvider>
                <LocationProvider>
                  <NotificationBadgeProvider>
                  <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
                  <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(stack)" options={{ headerShown: false }} />
                  </Stack>
                  <ToastManager />
                  </NotificationBadgeProvider>
                </LocationProvider>
              </TabRefreshProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
