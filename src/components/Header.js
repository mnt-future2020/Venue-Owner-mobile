import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { User, Settings as SettingsIcon, LogOut, Bookmark } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "./Logo";
import SideDrawer from "./SideDrawer";
import LogoutModal from "./ui/LogoutModal";
import LocationPickerModal from "./ui/LocationPickerModal";
import { PRIMARY_COLOR, FONTS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "../context/LocationContext";
import { safePush } from "../services/navigationGuard";
import { mediaUrl } from "../utils/media";

// Shared drawer controller — SwipeableTabView assigns `openExternal` /
// `closeExternal` on mount so its gesture-driven panel can be opened from
// outside (Header hamburger tap). Mirrors mobile/src/components/Header.
export const _drawerCtrl = { openExternal: null, closeExternal: null };

// Owner tab routes — back button auto-hides on these, hamburger shows instead
const TAB_ROUTES = new Set([
  "/feed",
  "/dashboard",
  "/venues",
  "/finance",
  "/chat",
  "/profile",
]);

export default function Header({
  title,
  subtitle,
  showBack,
  showMenu,
  centerTitle = false,
  actions = [],
  logo = false,
  showLocation,
  skipSafeArea = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { location } = useLocation();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Hamburger tap: if the parent SwipeableTabView has registered an external
  // drawer opener (animated panel + gesture-driven), prefer it. Otherwise
  // fall back to the local SideDrawer Modal — used on stack screens that
  // sit outside the pager.
  const openDrawerFromHeader = () => {
    if (_drawerCtrl && _drawerCtrl.openExternal) {
      _drawerCtrl.openExternal();
    } else {
      setDrawerVisible(true);
    }
  };
  const [showLogout, setShowLogout] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const isTabRoute = TAB_ROUTES.has(pathname);
  const shouldShowBack = showBack ?? !isTabRoute;
  const shouldShowMenu = showMenu ?? isTabRoute;

  const initials = (user?.name || user?.business_name || "O")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <View style={[styles.container, { paddingTop: skipSafeArea ? 10 : insets.top + 10 }]}>
        <View style={[styles.leftSection, centerTitle && styles.leftSectionCentered]}>
          {shouldShowBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#334155" />
            </TouchableOpacity>
          ) : shouldShowMenu ? (
            <TouchableOpacity
              onPress={openDrawerFromHeader}
              style={styles.iconButton}
              activeOpacity={0.8}
            >
              <Ionicons name="menu" size={24} color="#334155" />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconSpacer} />
          )}

          {logo && <Logo size={28} variant="website" />}

          {!logo ? (
            <View
              style={[
                styles.titleWrap,
                centerTitle && styles.titleWrapCentered,
              ]}
            >
              {title ? (
                <Text
                  numberOfLines={1}
                  style={[styles.title, centerTitle && styles.titleCentered]}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.subtitle,
                    centerTitle && styles.subtitleCentered,
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.actionsWrap}>
          {Array.isArray(actions)
            ? actions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  onPress={action.onPress}
                  style={[
                    styles.iconAction,
                    action.active && styles.iconActionActive,
                  ]}
                  activeOpacity={0.85}
                >
                  {action.icon ? (
                    action.icon
                  ) : (
                    <Ionicons
                      name={action.iconName || "ellipsis-horizontal"}
                      size={18}
                      color={action.active ? "#FFFFFF" : "#64748B"}
                    />
                  )}
                  {action.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {action.badge > 9 ? "9+" : action.badge}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))
            : actions}

          {/* {showLocation && (
            <TouchableOpacity
              style={styles.locationIconBtn}
              activeOpacity={0.8}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons
                name="location"
                size={20}
                color={location ? PRIMARY_COLOR : "#94A3B8"}
              />
              {location && <View style={styles.locationDot} />}
            </TouchableOpacity>
          )} */}

          <TouchableOpacity
            onPress={() => setShowProfileMenu(true)}
            style={styles.profileShortcut}
            activeOpacity={0.85}
          >
            {/* Real-time avatar: AuthContext.updateUser({ avatar }) after
                upload propagates here instantly via useAuth(). Falls back
                to the initials chip when no avatar is set. */}
            {user?.avatar ? (
              <Image
                source={{ uri: mediaUrl(user.avatar) }}
                style={styles.profileAvatar}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <View style={[styles.profileAvatar, styles.profileAvatarFallback]}>
                <Text style={styles.profileAvatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={() => {
          setDrawerVisible(false);
          setTimeout(() => setShowLogout(true), 400);
        }}
      />
      <LogoutModal visible={showLogout} onClose={() => setShowLogout(false)} />
      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
      />

      {/* Profile Dropdown */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={[styles.dropdownCard, { top: insets.top + 70 }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowProfileMenu(false);
                safePush(router, "/(tabs)/profile");
              }}
            >
              <User size={18} color="#475569" strokeWidth={2} />
              <Text style={styles.dropdownLabel}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowProfileMenu(false);
                safePush(router, "/(stack)/bookmarks");
              }}
            >
              <Bookmark size={18} color="#475569" strokeWidth={2} />
              <Text style={styles.dropdownLabel}>Saved Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowProfileMenu(false);
                safePush(router, "/(stack)/settings");
              }}
            >
              <SettingsIcon size={18} color="#475569" strokeWidth={2} />
              <Text style={styles.dropdownLabel}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              activeOpacity={0.7}
              onPress={() => {
                setShowProfileMenu(false);
                setTimeout(() => setShowLogout(true), 200);
              }}
            >
              <LogOut size={18} color="#EF4444" strokeWidth={2} />
              <Text style={[styles.dropdownLabel, { color: "#EF4444" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  leftSectionCentered: { flex: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: { width: 40, height: 40 },
  titleWrap: { flex: 1, justifyContent: "center" },
  titleWrapCentered: { alignItems: "center", marginRight: 40 },
  title: { fontSize: 19, fontFamily: FONTS.displayBold, fontWeight: "700", color: "#0F172A" },
  titleCentered: { textAlign: "center" },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
    fontWeight: "500",
  },
  subtitleCentered: { textAlign: "center" },

  actionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 12,
  },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconActionActive: { backgroundColor: "transparent" },
  badge: {
    position: "absolute",
    top: 1,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },

  profileShortcut: { marginLeft: 0 },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  profileAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  profileAvatarText: {
    fontSize: 14,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  locationIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  locationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  dropdownOverlay: { flex: 1, backgroundColor: "transparent" },
  dropdownCard: {
    position: "absolute",
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownLabel: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: "#1E293B" },
  dropdownDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 12 },
});
