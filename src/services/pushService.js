import messaging from "@react-native-firebase/messaging";
import { Platform, PermissionsAndroid } from "react-native";
import api from "../lib/axios";

/**
 * Register for Firebase push notifications and send token to backend.
 * Call this after user login.
 */
export async function registerForPushNotifications() {
  try {
    // Android 13+ (API 33) requires explicit POST_NOTIFICATIONS permission
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Android notification permission denied");
        return null;
      }
    }

    // iOS permission prompt
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log("Push notification permission denied");
      return null;
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      console.log("Failed to get FCM token");
      return null;
    }

    await api.post("/auth/push-token", {
      push_token: fcmToken,
      platform: Platform.OS,
    });

    console.log("FCM token registered:", fcmToken);
    return fcmToken;
  } catch (error) {
    console.error("Failed to register push token:", error);
    return null;
  }
}

/**
 * Listen for token refresh and update backend.
 */
export function onTokenRefresh() {
  return messaging().onTokenRefresh(async (newToken) => {
    try {
      await api.post("/auth/push-token", {
        push_token: newToken,
        platform: Platform.OS,
      });
      console.log("FCM token refreshed:", newToken);
    } catch (error) {
      console.error("Failed to update refreshed token:", error);
    }
  });
}
