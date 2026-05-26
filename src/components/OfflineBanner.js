// App-wide offline indicator. Mounts once at the root layout and slides in from the top
// whenever the device loses connectivity. Reappears (in green "Back online") for a couple
// of seconds when the connection comes back, then auto-hides.
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff, Wifi } from "lucide-react-native";

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("online"); // "online" | "offline" | "back-online"
  const wasOfflineRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const hideTimerRef = useRef(null);

  useEffect(() => {
    // Read once on mount in case we boot up offline.
    NetInfo.fetch().then((state) => {
      const offline = !(state.isConnected && (state.isInternetReachable !== false));
      if (offline) {
        wasOfflineRef.current = true;
        setStatus("offline");
      }
    });

    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && (state.isInternetReachable !== false));
      if (offline) {
        wasOfflineRef.current = true;
        setStatus("offline");
      } else if (wasOfflineRef.current) {
        // Was offline, now back — flash a brief "Back online" before hiding.
        wasOfflineRef.current = false;
        setStatus("back-online");
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setStatus("online"), 2200);
      } else {
        setStatus("online");
      }
    });

    return () => {
      unsub();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: status === "online" ? -80 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [status, slideAnim]);

  if (status === "online") {
    // Keep the component mounted so the slide-out animation completes, but it's hidden
    // (translateY -80) so it doesn't intercept touches.
  }

  const isOffline = status === "offline";
  const bgColor = isOffline ? "#DC2626" : "#16A34A";
  const Icon = isOffline ? WifiOff : Wifi;
  const message = isOffline ? "No internet connection" : "Back online";

  return (
    <Animated.View
      pointerEvents={status === "online" ? "none" : "auto"}
      style={[
        styles.banner,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + 6,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.inner}>
        <Icon size={14} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: Platform.OS === "android" ? 12 : 0,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
