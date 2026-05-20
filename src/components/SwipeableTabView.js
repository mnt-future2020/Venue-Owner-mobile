import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { usePathname, useRouter } from "expo-router";
import SwipeTabContext from "../context/SwipeTabContext";
import BottomTabBar from "./BottomTabBar";

/* Tab route content imports — each file owns its own Header + SafeAreaView */
import DashboardScreen from "../app/(tabs)/dashboard";
import VenuesScreen from "../app/(tabs)/venues";
import FinanceScreen from "../app/(tabs)/finance";
import ProfileScreen from "../app/(tabs)/profile";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_COUNT = 4;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const VELOCITY_THRESHOLD = 500;

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 250,
  mass: 0.8,
  overshootClamping: false,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
};

const TAB_ROUTES = [
  { name: "dashboard", route: "/(tabs)/dashboard", cleanRoute: "/dashboard" },
  { name: "venues", route: "/(tabs)/venues", cleanRoute: "/venues" },
  { name: "finance", route: "/(tabs)/finance", cleanRoute: "/finance" },
  { name: "profile", route: "/(tabs)/profile", cleanRoute: "/profile" },
];

const PAGES = [DashboardScreen, VenuesScreen, FinanceScreen, ProfileScreen];

export default function SwipeableTabView() {
  const router = useRouter();
  const pathname = usePathname();

  const initialIndex = useMemo(() => {
    const idx = TAB_ROUTES.findIndex(
      (t) =>
        pathname === t.cleanRoute || pathname.startsWith(t.cleanRoute + "/"),
    );
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [pagerSwipeEnabled, setPagerSwipeEnabled] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState(
    () => new Set([initialIndex]),
  );

  const translateX = useSharedValue(-initialIndex * SCREEN_WIDTH);
  const contextX = useSharedValue(-initialIndex * SCREEN_WIDTH);

  // Sync pathname → pager (e.g. router.replace from stack screens)
  const activeIdxRef = useRef(activeIndex);
  activeIdxRef.current = activeIndex;
  const routeSyncTimerRef = useRef(null);

  useEffect(() => {
    if (routeSyncTimerRef.current) return;
    const idx = TAB_ROUTES.findIndex(
      (t) =>
        pathname === t.cleanRoute || pathname.startsWith(t.cleanRoute + "/"),
    );
    if (idx >= 0 && idx !== activeIdxRef.current) {
      setActiveIndex(idx);
      setVisitedTabs((prev) => {
        if (prev.has(idx)) return prev;
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
      translateX.value = withSpring(-idx * SCREEN_WIDTH, SPRING_CONFIG);
    }
  }, [pathname, translateX]);

  useEffect(
    () => () => {
      if (routeSyncTimerRef.current) clearTimeout(routeSyncTimerRef.current);
    },
    [],
  );

  const syncTabState = useCallback(
    (index) => {
      setActiveIndex(index);
      setVisitedTabs((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      if (routeSyncTimerRef.current) clearTimeout(routeSyncTimerRef.current);
      routeSyncTimerRef.current = setTimeout(() => {
        router.replace(TAB_ROUTES[index].route);
        routeSyncTimerRef.current = null;
      }, 400);
    },
    [router],
  );

  const goToTab = useCallback(
    (index) => {
      if (index < 0 || index >= TAB_COUNT) return;
      if (index === activeIdxRef.current) return;
      translateX.value = withSpring(-index * SCREEN_WIDTH, SPRING_CONFIG);
      requestAnimationFrame(() => syncTabState(index));
    },
    [translateX, syncTabState],
  );

  const onGestureEnd = useCallback(
    (newIndex) => {
      requestAnimationFrame(() => syncTabState(newIndex));
    },
    [syncTabState],
  );

  const panGesture = Gesture.Pan()
    .enabled(pagerSwipeEnabled)
    .activeOffsetX([-30, 30])
    .failOffsetY([-8, 8])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      const currentIdx = Math.round(-contextX.value / SCREEN_WIDTH);
      let newX = contextX.value + e.translationX;
      const maxX = 0;
      const minX = -(TAB_COUNT - 1) * SCREEN_WIDTH;

      if (newX > maxX) {
        newX = maxX + (newX - maxX) * 0.3;
      } else if (newX < minX) {
        newX = minX - (minX - newX) * 0.3;
      }

      translateX.value = newX;
    })
    .onEnd((e) => {
      const currentIdx = Math.round(-contextX.value / SCREEN_WIDTH);

      let targetIdx = currentIdx;
      if (
        e.translationX < -SWIPE_THRESHOLD ||
        e.velocityX < -VELOCITY_THRESHOLD
      ) {
        targetIdx = Math.min(currentIdx + 1, TAB_COUNT - 1);
      } else if (
        e.translationX > SWIPE_THRESHOLD ||
        e.velocityX > VELOCITY_THRESHOLD
      ) {
        targetIdx = Math.max(currentIdx - 1, 0);
      }

      translateX.value = withSpring(-targetIdx * SCREEN_WIDTH, SPRING_CONFIG);

      if (targetIdx !== currentIdx) {
        runOnJS(onGestureEnd)(targetIdx);
      }
    });

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const shouldRender = useCallback(
    (index) =>
      visitedTabs.has(index) ||
      index === activeIndex ||
      Math.abs(index - activeIndex) === 1,
    [activeIndex, visitedTabs],
  );

  const contextValue = useMemo(
    () => ({
      inPager: true,
      activeIndex,
      activeTabName: TAB_ROUTES[activeIndex]?.name || "dashboard",
      pagerSwipeEnabled,
      goToTab,
      setPagerSwipeEnabled,
      openDrawer: () => {},
      drawerOpen: false,
      setDrawerOpen: () => {},
      onContentScroll: () => {},
      headerHeight: 0,
    }),
    [activeIndex, goToTab, pagerSwipeEnabled],
  );

  return (
    <SwipeTabContext.Provider value={contextValue}>
      <View style={styles.container}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.pager, pagerStyle]}>
            {PAGES.map((Page, i) => (
              <View key={TAB_ROUTES[i].name} style={styles.page}>
                {shouldRender(i) ? <Page /> : null}
              </View>
            ))}
          </Animated.View>
        </GestureDetector>
        <BottomTabBar
          activeIndex={activeIndex}
          onTabPress={goToTab}
          pagerTranslateX={translateX}
        />
      </View>
    </SwipeTabContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", backgroundColor: "#FFFFFF" },
  pager: {
    flex: 1,
    flexDirection: "row",
    width: SCREEN_WIDTH * TAB_COUNT,
  },
  page: { width: SCREEN_WIDTH, flex: 1 },
});
