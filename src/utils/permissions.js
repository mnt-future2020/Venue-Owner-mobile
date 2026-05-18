import { Alert, Linking, Platform } from "react-native";

/**
 * Common permission handler for the entire mobile app.
 * Requests permission and handles denied / permanently-blocked states
 * with a modal that deep-links the user to OS Settings.
 *
 * @param {() => Promise<{status:string, granted:boolean, canAskAgain?:boolean}>} requestFn
 *   The expo permission request function (e.g. ImagePicker.requestMediaLibraryPermissionsAsync)
 * @param {string} permissionName  Human-readable name shown in the alert (e.g. "Photo Library")
 * @returns {Promise<boolean>}  true if granted, false otherwise
 */
export async function requestPermission(requestFn, permissionName) {
  try {
    const result = await requestFn();

    if (result.granted || result.status === "granted") {
      return true;
    }

    // Permission denied and user can still be asked again — just return false silently
    // (the picker itself may still work on Android 13+ via system photo picker)
    if (result.canAskAgain !== false) {
      return false;
    }

    // Permanently denied — show alert with Settings link
    Alert.alert(
      `${permissionName} Access Required`,
      `Lobbi needs ${permissionName.toLowerCase()} access. Please enable it in your device Settings.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.error(`Permission request failed for ${permissionName}:`, err);
    return false;
  }
}
