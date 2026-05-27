import { useMemo } from "react";
import { Search } from "lucide-react-native";
import { useRouter } from "expo-router";
import { safePush } from "../services/navigationGuard";

// Shared Header search action — opens the global /(stack)/search screen.
// Used by every tab Header so the search icon is consistent across the app.
export default function useSearchAction() {
  const router = useRouter();
  return useMemo(
    () => ({
      key: "search-users",
      icon: <Search size={18} color="#374151" strokeWidth={2.3} />,
      onPress: () => safePush(router, "/(stack)/search"),
    }),
    [router],
  );
}
