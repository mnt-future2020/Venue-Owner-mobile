// Mirror of frontend SkeletonLoader primitives (SkeletonBox / SkeletonCircle / SkeletonText).
// Frontend uses Tailwind's `animate-pulse` which oscillates opacity 1 -> 0.5 -> 1 over 2s
// via cubic-bezier(0.4, 0, 0.6, 1). We reproduce the exact same easing/duration/range here
// so the skeleton "feel" matches the web.
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const PULSE_DURATION = 2000;
const PULSE_MIN = 0.5;
const PULSE_MAX = 1;

let sharedAnim = null;
function getSharedAnim() {
  if (sharedAnim) return sharedAnim;
  const anim = new Animated.Value(0);
  Animated.loop(
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: PULSE_DURATION / 2,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: PULSE_DURATION / 2,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      }),
    ])
  ).start();
  sharedAnim = anim;
  return anim;
}

function usePulseOpacity() {
  const anim = useRef(getSharedAnim()).current;
  useEffect(() => {
    // shared anim already running; nothing to start/stop per-instance
  }, []);
  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PULSE_MAX, PULSE_MIN],
  });
}

export function SkeletonBox({ width, height, radius = 8, style }) {
  const opacity = usePulseOpacity();
  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size, style }) {
  const opacity = usePulseOpacity();
  return (
    <Animated.View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonText({ width = "100%", height = 14, style }) {
  const opacity = usePulseOpacity();
  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: 4, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // matches frontend `bg-primary/10` / `bg-muted` neutral fill
    backgroundColor: "#E2E8F0",
  },
});
