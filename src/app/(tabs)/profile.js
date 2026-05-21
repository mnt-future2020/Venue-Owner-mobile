import AppScreen from "../../components/ui/AppScreen";
import ProfileScreenContent from "../../components/profile/ProfileScreenContent";
import { useAuth } from "../../context/AuthContext";

// Mirrors mobile/src/app/(tabs)/profile.js exactly. Heavy lifting lives in
// ProfileScreenContent (header, tabs, edit profile sheet, stats card, etc.).
export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <AppScreen
      title={user?.name || user?.username || "Profile"}
      showBack={false}
      showMenu
      withTabs
    >
      <ProfileScreenContent />
    </AppScreen>
  );
}
