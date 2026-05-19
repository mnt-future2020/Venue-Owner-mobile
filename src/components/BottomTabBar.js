import React, { memo, useCallback, useEffect, useMemo } from "react";
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { LayoutDashboard, ClipboardList, Wallet, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PRIMARY_COLOR, FONTS } from "../constants/theme";

// === Sizing
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_COUNT = 4;
const BAR_WIDTH = SCREEN_WIDTH;
const TAB_WIDTH = BAR_WIDTH / TAB_COUNT;
const BAR_TOTAL_HEIGHT = 75;
const ACTIVE_CIRCLE_SIZE = 42;
const ACTIVE_ICON_SIZE = 15;
const NOTCH_WIDTH = 78;
const NOTCH_HALF_WIDTH = NOTCH_WIDTH / 2;
const NOTCH_HEIGHT = 14;
const NOTCH_PEAK_Y = 2;

const WHITE = "#FFFFFF";
const STROKE = "#D5DAE0";
const TEXT_IDLE = "#9DA7B3";
const ICON_IDLE = "#A6AFBA";
const ACCENT = PRIMARY_COLOR;

const SPRING_CONFIG = { damping: 18, stiffness: 210, mass: 0.78 };

// === SVG path helpers (cut into top edge of bar)
function createNotchPath(width) {
  const baselineY = NOTCH_HEIGHT;
  const centerX = width / 2;
  const leftA = width * 0.18;
  const leftB = width * 0.34;
  const rightA = width * 0.66;
  const rightB = width * 0.82;
  return [
    `M 0 ${baselineY}`,
    `C ${leftA} ${baselineY} ${leftB} ${NOTCH_PEAK_Y} ${centerX} ${NOTCH_PEAK_Y}`,
    `C ${rightA} ${NOTCH_PEAK_Y} ${rightB} ${baselineY} ${width} ${baselineY}`,
    `L ${width} ${baselineY + 1}`,
    `L 0 ${baselineY + 1}`,
    "Z",
  ].join(" ");
}

function createNotchStroke(width) {
  const baselineY = NOTCH_HEIGHT;
  const centerX = width / 2;
  const leftA = width * 0.18;
  const leftB = width * 0.34;
  const rightA = width * 0.66;
  const rightB = width * 0.82;
  return [
    `M 0 ${baselineY}`,
    `C ${leftA} ${baselineY} ${leftB} ${NOTCH_PEAK_Y} ${centerX} ${NOTCH_PEAK_Y}`,
    `C ${rightA} ${NOTCH_PEAK_Y} ${rightB} ${baselineY} ${width} ${baselineY}`,
  ].join(" ");
}

// === Owner tabs (icons match web sidebar exactly)
const TABS = [
  { name: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { name: "venues", label: "Venue Mgmt", Icon: ClipboardList },
  { name: "finance", label: "Finance", Icon: Wallet },
  { name: "profile", label: "Profile", Icon: User },
];

// === Sub-components
const TabItem = memo(function TabItem({ tab, index, onPress, progress, activeIndex }) {
  const iconAnimStyle = useAnimatedStyle(() => {
    if (activeIndex < 0) return { opacity: 1 };
    const dist = Math.abs(progress.value - index);
    // Fade out base icon when the floating circle is on this tab
    const opacity = interpolate(dist, [0, 0.5], [0.18, 1], "clamp");
    return { opacity };
  });

  const labelAnimStyle = useAnimatedStyle(() => {
    if (activeIndex < 0) return { color: TEXT_IDLE };
    const dist = Math.abs(progress.value - index);
    return { color: dist < 0.5 ? ACCENT : TEXT_IDLE };
  });

  const Icon = tab.Icon;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => onPress(index)}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
    >
      <View style={styles.tabButtonInner}>
        <View style={styles.iconWrap}>
          <Animated.View style={iconAnimStyle}>
            <Icon size={23} color={ICON_IDLE} strokeWidth={2.15} />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.tabLabel, labelAnimStyle]} numberOfLines={1}>
          {tab.label}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
});

const FloatingIconLayer = memo(function FloatingIconLayer({ tab, index, progress }) {
  const style = useAnimatedStyle(() => {
    const dist = Math.abs(progress.value - index);
    return { opacity: interpolate(dist, [0, 0.5], [1, 0], "clamp"), position: "absolute" };
  });
  const Icon = tab.Icon;
  return (
    <Animated.View style={style}>
      <Icon size={ACTIVE_ICON_SIZE} color={WHITE} strokeWidth={2.5} />
    </Animated.View>
  );
});

const FloatingActive = memo(function FloatingActive({ progress, activeIndex }) {
  const socketStyle = useAnimatedStyle(() => {
    const centerX = TAB_WIDTH * (progress.value + 0.5);
    return {
      transform: [{ translateX: centerX - ACTIVE_CIRCLE_SIZE / 2 }],
      opacity: activeIndex >= 0 ? 1 : 0,
    };
  });

  if (activeIndex < 0) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.floatingSocket, socketStyle]}>
      <View style={styles.floatingCircle}>
        {TABS.map((tab, i) => (
          <FloatingIconLayer key={tab.name} tab={tab} index={i} progress={progress} />
        ))}
      </View>
    </Animated.View>
  );
});

// === Main bar (expo-router Tabs compatible)
export default function BottomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  // Map expo-router state.routes to our TABS order
  const tabOrder = useMemo(() => state?.routes?.map((r) => r.name) || [], [state]);
  const activeIndex = useMemo(() => {
    if (!state) return 0;
    const focusedName = state.routes[state.index]?.name;
    return TABS.findIndex((t) => t.name === focusedName);
  }, [state]);

  useEffect(() => {
    if (activeIndex >= 0) {
      progress.value = withSpring(activeIndex, SPRING_CONFIG);
    }
  }, [activeIndex, progress]);

  const notchWrapStyle = useAnimatedStyle(() => {
    const centerX = TAB_WIDTH * (progress.value + 0.5);
    return {
      transform: [{ translateX: centerX - NOTCH_HALF_WIDTH }],
      opacity: activeIndex >= 0 ? 1 : 0,
    };
  });

  const topLineLeftStyle = useAnimatedStyle(() => {
    if (activeIndex < 0) return { width: BAR_WIDTH };
    const centerX = TAB_WIDTH * (progress.value + 0.5);
    return { width: Math.max(0, centerX - NOTCH_HALF_WIDTH) };
  });

  const topLineRightStyle = useAnimatedStyle(() => {
    if (activeIndex < 0) return { left: BAR_WIDTH, width: 0 };
    const centerX = TAB_WIDTH * (progress.value + 0.5);
    const left = centerX + NOTCH_HALF_WIDTH;
    return { left, width: Math.max(0, BAR_WIDTH - left) };
  });

  const handlePress = useCallback(
    (tabIndex) => {
      const tabName = TABS[tabIndex]?.name;
      if (!tabName) return;

      // Find the matching route in expo-router state and emit press
      const routeIndex = tabOrder.indexOf(tabName);
      if (routeIndex < 0) return;

      const route = state.routes[routeIndex];
      const isFocused = routeIndex === state.index;

      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [navigation, state, tabOrder]
  );

  const bottomPad = Platform.select({
    ios: insets.bottom > 0 ? Math.max(8, insets.bottom - 2) : 10,
    android: insets.bottom > 0 ? Math.max(8, insets.bottom) : 10,
    default: 10,
  });

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]}>
      <View style={styles.shell}>
        <View style={styles.barBody} />
        <Animated.View pointerEvents="none" style={[styles.topBorderLine, styles.topBorderLeft, topLineLeftStyle]} />
        <Animated.View pointerEvents="none" style={[styles.topBorderLine, styles.topBorderRight, topLineRightStyle]} />
        <Animated.View pointerEvents="none" style={[styles.notchWrap, notchWrapStyle]}>
          <Svg width={NOTCH_WIDTH} height={NOTCH_HEIGHT + 2} style={styles.notchSvg}>
            <Path d={createNotchPath(NOTCH_WIDTH)} fill={WHITE} />
            <Path d={createNotchStroke(NOTCH_WIDTH)} fill="none" stroke={STROKE} strokeWidth={1.2} />
          </Svg>
        </Animated.View>

        <FloatingActive progress={progress} activeIndex={activeIndex} />

        <View style={styles.tabRow}>
          {TABS.map((tab, index) => (
            <TabItem
              key={tab.name}
              tab={tab}
              index={index}
              onPress={handlePress}
              progress={progress}
              activeIndex={activeIndex}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    zIndex: 9,
    elevation: 9,
  },
  shell: {
    alignSelf: "center",
    width: BAR_WIDTH,
    height: BAR_TOTAL_HEIGHT,
    overflow: "visible",
  },
  barBody: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: STROKE,
    backgroundColor: "#FFFFFF",
  },
  topBorderLine: {
    position: "absolute",
    top: 0,
    height: 1,
    backgroundColor: STROKE,
    zIndex: 2,
  },
  topBorderLeft: { left: 0 },
  topBorderRight: { right: 0 },
  notchWrap: {
    position: "absolute",
    top: -NOTCH_HEIGHT + 1,
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT + 2,
    backgroundColor: "transparent",
    zIndex: 2,
  },
  notchSvg: { overflow: "visible" },
  floatingSocket: {
    position: "absolute",
    top: -5,
    width: ACTIVE_CIRCLE_SIZE,
    height: ACTIVE_CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    elevation: 30,
  },
  floatingCircle: {
    width: ACTIVE_CIRCLE_SIZE,
    height: ACTIVE_CIRCLE_SIZE,
    borderRadius: ACTIVE_CIRCLE_SIZE / 2,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  tabRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 5,
    height: 74,
    flexDirection: "row",
    zIndex: 2,
  },
  tabButton: {
    width: TAB_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tabButtonInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONTS.bodyMedium,
    color: TEXT_IDLE,
  },
});
