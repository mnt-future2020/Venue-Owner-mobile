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
import ToastManager from "../components/ToastManager";
import { KeyboardProvider } from "../lib/keyboardController";

SplashScreen.preventAutoHideAsync();

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
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider statusBarTranslucent={false} navigationBarTranslucent={false}>
        <SafeAreaProvider>
          <AuthProvider>
            <TabRefreshProvider>
              <LocationProvider>
                <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
                <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(stack)" options={{ headerShown: false }} />
                </Stack>
                <ToastManager />
              </LocationProvider>
            </TabRefreshProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
