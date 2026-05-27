import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  LogOut,
  Rss,
  MessageCircleMore,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "./Logo";
import { FONTS, PRIMARY_COLOR } from "../constants/theme";
import { safePush } from "../services/navigationGuard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

// Owner navigation — icons match web sidebar exactly (Navbar.js venue_owner items)
const MENU_ITEMS = [
  { label: "Feed", route: "/(tabs)/feed", Icon: Rss },
  { label: "Venue Mgmt", route: "/(tabs)/venues", Icon: ClipboardList },
  { label: "Dashboard", route: "/(tabs)/dashboard", Icon: LayoutDashboard },
  { label: "Finance", route: "/(tabs)/finance", Icon: Wallet },
  { label: "Chat", route: "/(tabs)/chat", Icon: MessageCircleMore },
  { label: "Settings", route: "/(stack)/settings", Icon: SettingsIcon },
];

export default function SideDrawer({ visible, onClose, onLogout }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  const handleNavigate = (route) => {
    onClose();
    setTimeout(() => safePush(router, route), 150);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 44 : 24) + 12,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Logo + Close */}
        <View style={styles.drawerHeader}>
          <Logo size={26} variant="website" />
          <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map(({ label, route, Icon, ionicon }) => {
            const cleanRoute = route.replace("/(tabs)", "").replace("/(stack)", "");
            const normalizedPath = String(pathname || "")
              .replace("/(tabs)", "")
              .replace("/(stack)", "")
              .replace(/\/index$/, "")
              .replace(/\/+$/, "");
            const active = normalizedPath === cleanRoute || normalizedPath.startsWith(cleanRoute + "/");
            const color = active ? PRIMARY_COLOR : "#475569";
            return (
              <TouchableOpacity
                key={label}
                style={[styles.menuItem, active && styles.menuItemActive]}
                activeOpacity={0.7}
                onPress={() => handleNavigate(route)}
              >
                {active ? <View style={styles.activeBar} /> : null}
                {Icon ? <Icon size={20} color={color} strokeWidth={2} /> : null}
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={() => { onClose(); if (onLogout) setTimeout(onLogout, 350); }}
          >
            <LogOut size={20} color="#EF4444" strokeWidth={2} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  menuList: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 15,
    position: "relative",
    overflow: "hidden",
  },
  menuItemActive: {
    backgroundColor: "#F0FDF4",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "#059669",
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  menuLabelActive: {
    fontFamily: FONTS.bodyBold,
    color: "#059669",
  },
  bottomSection: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 4,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: "#EF4444",
  },
});
