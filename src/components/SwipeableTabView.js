import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  Rss,
  LogOut,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import SwipeTabContext from "../context/SwipeTabContext";
import BottomTabBar from "./BottomTabBar";
import { _drawerCtrl } from "./Header";
import Logo from "./Logo";
import LogoutModal from "./ui/LogoutModal";
import { PRIMARY_COLOR, FONTS } from "../constants/theme";
import { safePush } from "../services/navigationGuard";

/* Tab route content imports — each file owns its own Header + SafeAreaView */
import FeedScreen from "../app/(tabs)/feed";
import VenuesScreen from "../app/(tabs)/venues";
import DashboardScreen from "../app/(tabs)/dashboard";
import FinanceScreen from "../app/(tabs)/finance";
import ChatScreen from "../app/(tabs)/chat";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);
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

// Tab order matches BottomTabBar TABS exactly:
// Feed | Venue Mgmt | Dashboard | Finance | Chat
const TAB_ROUTES = [
  { name: "feed", route: "/(tabs)/feed", cleanRoute: "/feed" },
  { name: "venues", route: "/(tabs)/venues", cleanRoute: "/venues" },
  { name: "dashboard", route: "/(tabs)/dashboard", cleanRoute: "/dashboard" },
  { name: "finance", route: "/(tabs)/finance", cleanRoute: "/finance" },
  { name: "chat", route: "/(tabs)/chat", cleanRoute: "/chat" },
];

const PAGES = [FeedScreen, VenuesScreen, DashboardScreen, FinanceScreen, ChatScreen];
const TAB_COUNT = TAB_ROUTES.length;

// Drawer menu items — mirrors SideDrawer's MENU_ITEMS (kept in sync).
const MENU_ITEMS = [
  { label: "Feed", route: "/(tabs)/feed", Icon: Rss },
  { label: "Venue Mgmt", route: "/(tabs)/venues", Icon: ClipboardList },
  { label: "Dashboard", route: "/(tabs)/dashboard", Icon: LayoutDashboard },
  { label: "Finance", route: "/(tabs)/finance", Icon: Wallet },
  { label: "Chat", route: "/(tabs)/chat", ionicon: "chatbubble-ellipses-outline" },
];

// Routes that should NOT render the pager overlay (Stack screen shows directly).
const NON_PAGER_ROUTES = ["/profile"];

export default function SwipeableTabView() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isNonPagerRoute = NON_PAGER_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  const initialIndex = useMemo(() => {
    const idx = TAB_ROUTES.findIndex(
      (t) => pathname === t.cleanRoute || pathname.startsWith(t.cleanRoute + "/"),
    );
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [pagerSwipeEnabled, setPagerSwipeEnabled] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([initialIndex]));

  const translateX = useSharedValue(-initialIndex * SCREEN_WIDTH);
  const contextX = useSharedValue(-initialIndex * SCREEN_WIDTH);

  /* ── Gesture-driven drawer ── */
  const drawerX = useSharedValue(-DRAWER_WIDTH);
  const isDrawerOpen = useSharedValue(false);

  const animateDrawerOpen = useCallback(() => {
    drawerX.value = withSpring(0, SPRING_CONFIG);
    isDrawerOpen.value = true;
  }, [drawerX, isDrawerOpen]);

  const animateDrawerClose = useCallback(() => {
    drawerX.value = withSpring(-DRAWER_WIDTH, SPRING_CONFIG);
    isDrawerOpen.value = false;
  }, [drawerX, isDrawerOpen]);

  // Register external openers so Header hamburger button can drive the
  // gesture-style drawer panel (instead of opening its own SideDrawer Modal).
  useEffect(() => {
    _drawerCtrl.openExternal = animateDrawerOpen;
    _drawerCtrl.closeExternal = animateDrawerClose;
    return () => {
      _drawerCtrl.openExternal = null;
      _drawerCtrl.closeExternal = null;
    };
  }, [animateDrawerOpen, animateDrawerClose]);

  // pathname → pager sync (e.g. router.replace from stack screens)
  const activeIdxRef = useRef(activeIndex);
  activeIdxRef.current = activeIndex;
  const routeSyncTimerRef = useRef(null);

  useEffect(() => {
    if (routeSyncTimerRef.current) return;
    const idx = TAB_ROUTES.findIndex(
      (t) => pathname === t.cleanRoute || pathname.startsWith(t.cleanRoute + "/"),
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

  const openDrawer = useCallback(() => {
    animateDrawerOpen();
  }, [animateDrawerOpen]);

  const onGestureEnd = useCallback(
    (newIndex) => {
      requestAnimationFrame(() => syncTabState(newIndex));
    },
    [syncTabState],
  );

  // Pan gesture — combines pager swipe + drawer drag (mobile parity).
  const panGesture = Gesture.Pan()
    .enabled(pagerSwipeEnabled)
    .activeOffsetX([-30, 30])
    .failOffsetY([-8, 8])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      // If drawer is open, finger movement closes it (drag back to left).
      if (isDrawerOpen.value) {
        drawerX.value = Math.min(0, e.translationX);
        return;
      }

      const currentIdx = Math.round(-contextX.value / SCREEN_WIDTH);
      let newX = contextX.value + e.translationX;
      const maxX = 0;
      const minX = -(TAB_COUNT - 1) * SCREEN_WIDTH;

      if (newX > maxX) {
        if (currentIdx === 0) {
          // Page 0 right swipe → drive drawer open with finger.
          drawerX.value = Math.min(0, -DRAWER_WIDTH + e.translationX);
          newX = 0; // pager stays still
        } else {
          newX = maxX + (newX - maxX) * 0.3;
        }
      } else if (newX < minX) {
        newX = minX - (minX - newX) * 0.3;
      }

      translateX.value = newX;
    })
    .onEnd((e) => {
      // If drawer is open, snap open or closed based on translation/velocity.
      if (isDrawerOpen.value) {
        if (
          e.translationX < -DRAWER_WIDTH * 0.3 ||
          e.velocityX < -VELOCITY_THRESHOLD
        ) {
          drawerX.value = withSpring(-DRAWER_WIDTH, SPRING_CONFIG);
          isDrawerOpen.value = false;
        } else {
          drawerX.value = withSpring(0, SPRING_CONFIG);
        }
        return;
      }

      const currentIdx = Math.round(-contextX.value / SCREEN_WIDTH);

      // Page 0 right swipe → snap drawer open or back closed.
      if (currentIdx === 0 && e.translationX > 0) {
        if (
          e.translationX > DRAWER_WIDTH * 0.3 ||
          e.velocityX > VELOCITY_THRESHOLD
        ) {
          drawerX.value = withSpring(0, SPRING_CONFIG);
          isDrawerOpen.value = true;
        } else {
          drawerX.value = withSpring(-DRAWER_WIDTH, SPRING_CONFIG);
        }
        return;
      }

      // Normal pager snap.
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

  const drawerPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drawerX.value, [-DRAWER_WIDTH, 0], [0, 1]),
    display: drawerX.value <= -DRAWER_WIDTH + 2 ? "none" : "flex",
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
      activeTabName: TAB_ROUTES[activeIndex]?.name || "feed",
      pagerSwipeEnabled,
      goToTab,
      setPagerSwipeEnabled,
      openDrawer,
      drawerOpen: false,
      setDrawerOpen: () => {},
      onContentScroll: () => {},
      headerHeight: 0,
    }),
    [activeIndex, goToTab, openDrawer, pagerSwipeEnabled],
  );

  const getDrawerActive = useCallback(
    (route) => {
      const pagerIdx = TAB_ROUTES.findIndex((tab) => tab.route === route);
      if (pagerIdx >= 0) return activeIndex === pagerIdx;
      const cleanRoute = route.replace("/(tabs)", "").replace("/(stack)", "");
      return pathname === cleanRoute || pathname.startsWith(cleanRoute + "/");
    },
    [activeIndex, pathname],
  );

  const handleDrawerNav = useCallback(
    (route) => {
      animateDrawerClose();
      const pagerIdx = TAB_ROUTES.findIndex((tab) => tab.route === route);
      if (pagerIdx >= 0) {
        goToTab(pagerIdx);
        return;
      }
      safePush(router, route);
    },
    [animateDrawerClose, goToTab, router],
  );

  // /profile etc. — Stack screen renders standalone; pager overlay stays hidden.
  if (isNonPagerRoute) {
    return null;
  }

  return (
    <>
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

          {/* ── Gesture-driven side drawer (mobile parity) ── */}
          <Animated.View
            style={[styles.backdrop, backdropStyle]}
            pointerEvents="box-none"
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={animateDrawerClose}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawerPanel,
              drawerPanelStyle,
              {
                paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 44 : 24),
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* Logo + Close */}
            <View style={styles.drawerHeader}>
              <Logo size={26} variant="website" />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={animateDrawerClose}
                style={styles.drawerCloseBtn}
              >
                <Text style={styles.drawerCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Menu */}
            <View style={styles.drawerMenuList}>
              {MENU_ITEMS.map(({ label, route, Icon, ionicon }) => {
                const active = getDrawerActive(route);
                const color = active ? PRIMARY_COLOR : "#475569";
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.drawerMenuItem,
                      active && styles.drawerMenuItemActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleDrawerNav(route)}
                  >
                    {active ? <View style={styles.drawerActiveBar} /> : null}
                    {Icon ? (
                      <Icon size={20} color={color} strokeWidth={2} />
                    ) : (
                      <Ionicons name={ionicon} size={20} color={color} />
                    )}
                    <Text
                      style={[
                        styles.drawerMenuLabel,
                        active && styles.drawerMenuLabelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Logout at bottom */}
            <View style={styles.drawerBottom}>
              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                activeOpacity={0.7}
                onPress={() => {
                  animateDrawerClose();
                  setTimeout(() => setShowLogoutModal(true), 350);
                }}
              >
                <LogOut size={20} color="#EF4444" strokeWidth={2} />
                <Text style={styles.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </SwipeTabContext.Provider>
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    zIndex: 10,
  },
  drawerPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 11,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  drawerCloseBtnText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  drawerMenuList: {
    paddingTop: 8,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 15,
    position: "relative",
    overflow: "hidden",
  },
  drawerMenuItemActive: {
    backgroundColor: "#F0FDF4",
  },
  drawerActiveBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: PRIMARY_COLOR,
  },
  drawerMenuLabel: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  drawerMenuLabelActive: {
    fontFamily: FONTS.bodyBold,
    color: PRIMARY_COLOR,
  },
  drawerBottom: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 4,
  },
  drawerLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },
  drawerLogoutText: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: "#EF4444",
  },
});
