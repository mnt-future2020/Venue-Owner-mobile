import { useContext } from "react";
import NotificationBadgeContext from "../context/NotificationBadgeContext";

// Thin consumer hook — the actual polling + cache live in
// NotificationBadgeProvider so the app makes exactly ONE
// /api/notifications poll regardless of how many tabs are mounted.
export default function useNotificationBell() {
  return useContext(NotificationBadgeContext);
}
