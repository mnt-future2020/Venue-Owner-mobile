import React from "react";
import { Keyboard, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

let keyboardControllerModule = null;

try {
  // Native module can throw during evaluation in Expo Go / non-rebuilt clients.
  keyboardControllerModule = require("react-native-keyboard-controller");
} catch {
  keyboardControllerModule = null;
}

export const keyboardControllerAvailable = !!keyboardControllerModule;

const fallbackKeyboardState = {
  isVisible: false,
  height: 0,
  duration: 0,
  timestamp: 0,
  target: 0,
  type: "default",
  appearance: "light",
};

export const KeyboardProvider =
  keyboardControllerModule?.KeyboardProvider ||
  function FallbackKeyboardProvider({ children }) {
    return <>{children}</>;
  };

export const KeyboardStickyView =
  keyboardControllerModule?.KeyboardStickyView ||
  function FallbackKeyboardStickyView({
    children,
    style,
    offset: _offset,
    enabled: _enabled,
    ...props
  }) {
    return (
      <View style={style} {...props}>
        {children}
      </View>
    );
  };

export const KCKeyboardAvoidingView =
  keyboardControllerModule?.KeyboardAvoidingView ||
  require("react-native").KeyboardAvoidingView;

export function useReanimatedKeyboardAnimation() {
  const fallbackProgress = useSharedValue(0);
  const fallbackHeight = useSharedValue(0);

  if (keyboardControllerModule?.useReanimatedKeyboardAnimation) {
    return keyboardControllerModule.useReanimatedKeyboardAnimation();
  }

  return { progress: fallbackProgress, height: fallbackHeight };
}

export function useKeyboardState(selector) {
  if (keyboardControllerModule?.useKeyboardState) {
    return keyboardControllerModule.useKeyboardState(selector);
  }

  return selector ? selector(fallbackKeyboardState) : fallbackKeyboardState;
}

export function useResizeMode() {
  if (keyboardControllerModule?.useResizeMode) {
    return keyboardControllerModule.useResizeMode();
  }
}

export const KeyboardController =
  keyboardControllerModule?.KeyboardController || {
    dismiss: async () => {
      Keyboard.dismiss();
    },
  };
