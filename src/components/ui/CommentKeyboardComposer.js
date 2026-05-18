import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated as NativeAnimated,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmojiPicker from "rn-emoji-keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import { PRIMARY_COLOR } from "../../constants/theme";
import {
  KeyboardController,
  KeyboardStickyView,
  keyboardControllerAvailable,
  useReanimatedKeyboardAnimation,
} from "../../lib/keyboardController";

export default function CommentKeyboardComposer({
  ...props
}) {
  if (keyboardControllerAvailable) {
    return <KeyboardControllerComposer {...props} />;
  }

  return <LegacyCommentKeyboardComposer {...props} />;
}

function KeyboardControllerComposer({
  value,
  onChangeText,
  onSubmit,
  submitting,
  onFocus,
  onHeightChange,
  visible = true,
  placeholder = "Add a comment...",
}) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const [inputHeight, setInputHeight] = useState(44);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { progress } = useReanimatedKeyboardAnimation();
  const textValue = value ?? "";

  const canSend = useMemo(() => textValue.trim().length > 0 && !submitting, [submitting, textValue]);
  const closedBottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);
  const openedBottomInset = Platform.OS === "ios" ? 10 : 8;

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      progress.value,
      [0, 1],
      [closedBottomInset, openedBottomInset],
      Extrapolation.CLAMP
    ),
    borderTopColor: interpolateColor(progress.value, [0, 1], ["#E2E8F0", "#D7E0EA"]),
    shadowOpacity: interpolate(progress.value, [0, 1], [0.08, 0.14], Extrapolation.CLAMP),
    elevation: interpolate(progress.value, [0, 1], [4, 10], Extrapolation.CLAMP),
  }));

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [0, -2], Extrapolation.CLAMP),
      },
    ],
  }));

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [1, 1.03], Extrapolation.CLAMP),
      },
    ],
  }));

  const handleContentSizeChange = (event) => {
    const nextHeight = event.nativeEvent.contentSize.height || 44;
    setInputHeight(Math.min(Math.max(44, nextHeight), 104));
  };

  const handleSend = () => {
    if (!canSend) return;
    onSubmit?.(textValue.trim());
  };

  const handleLayout = (event) => {
    onHeightChange?.(Math.ceil(event.nativeEvent.layout.height));
  };

  useEffect(() => {
    if (visible) return;
    setEmojiOpen(false);
  }, [visible]);

  const handleToggleEmoji = async () => {
    if (!emojiOpen) {
      try {
        await KeyboardController.dismiss({ keepFocus: false, animated: true });
      } catch {
        Keyboard.dismiss();
      }
    }

    setEmojiOpen((prev) => !prev);
  };

  const handleEmojiSelected = (emoji) => {
    const nextValue = `${textValue}${emoji?.emoji || ""}`;
    onChangeText?.(nextValue);
    setEmojiOpen(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });
  };

  return (
    <>
      <KeyboardStickyView enabled offset={{ closed: 0, opened: 0 }} style={styles.sticky} pointerEvents="box-none">
        <Animated.View onLayout={handleLayout} style={[styles.outer, containerAnimatedStyle]}>
          <Animated.View style={[styles.row, rowAnimatedStyle]}>
            {/* <TouchableOpacity
              activeOpacity={0.82}
              onPress={handleToggleEmoji}
              style={[styles.iconButton, emojiOpen && styles.iconButtonActive]}
            >
              <Ionicons name={emojiOpen ? "close-outline" : "happy-outline"} size={20} color={emojiOpen ? "#FFFFFF" : "#475569"} />
            </TouchableOpacity> */}

            <View style={styles.inputShell}>
              <TextInput
                ref={inputRef}
                value={textValue}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                style={[styles.input, { height: inputHeight }]}
                multiline
                returnKeyType="default"
                textAlignVertical="center"
                blurOnSubmit={false}
                onFocus={onFocus}
                onContentSizeChange={handleContentSizeChange}
              />
            </View>

            <Animated.View style={sendAnimatedStyle}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleSend}
                disabled={!canSend}
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </KeyboardStickyView>

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onRequestClose={() => setEmojiOpen(false)}
        onEmojiSelected={handleEmojiSelected}
        enableSearchBar
        enableRecentlyUsed
        expandable
        defaultHeight={Platform.OS === "ios" ? "46%" : "54%"}
        expandedHeight={Platform.OS === "ios" ? "80%" : "86%"}
        theme={{
          backdrop: "rgba(15, 23, 42, 0.42)",
          container: "#FFFFFF",
          knob: "#CBD5E1",
          header: "#0F172A",
          category: {
            icon: "#94A3B8",
            iconActive: PRIMARY_COLOR,
            container: "#F8FAFC",
            containerActive: "#ECFDF5",
          },
          search: {
            background: "#F8FAFC",
            text: "#0F172A",
            placeholder: "#94A3B8",
            icon: "#94A3B8",
          },
          emoji: {
            selected: "#DCFCE7",
          },
        }}
      />
    </>
  );
}

function LegacyCommentKeyboardComposer({
  value,
  onChangeText,
  onSubmit,
  submitting,
  onFocus,
  onHeightChange,
  visible = true,
  placeholder = "Add a comment...",
}) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const [inputHeight, setInputHeight] = useState(44);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const keyboardOffset = useRef(new NativeAnimated.Value(0)).current;
  const textValue = value ?? "";

  const canSend = useMemo(() => textValue.trim().length > 0 && !submitting, [submitting, textValue]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onKeyboardShow = (event) => {
      const height = event.endCoordinates?.height || 0;
      setKeyboardVisible(true);
      NativeAnimated.timing(keyboardOffset, {
        toValue: height,
        duration: event.duration || 220,
        useNativeDriver: false,
      }).start();
    };

    const onKeyboardHide = (event) => {
      setKeyboardVisible(false);
      NativeAnimated.timing(keyboardOffset, {
        toValue: 0,
        duration: event?.duration || 220,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    if (visible) return;
    setEmojiOpen(false);
  }, [visible]);

  const handleContentSizeChange = (event) => {
    const nextHeight = event.nativeEvent.contentSize.height || 44;
    setInputHeight(Math.min(Math.max(44, nextHeight), 104));
  };

  const handleSend = () => {
    if (!canSend) return;
    onSubmit?.(textValue.trim());
  };

  const handleLayout = (event) => {
    onHeightChange?.(Math.ceil(event.nativeEvent.layout.height));
  };

  const handleToggleEmoji = async () => {
    if (!emojiOpen) {
      try {
        await KeyboardController.dismiss({ keepFocus: false, animated: true });
      } catch {
        Keyboard.dismiss();
      }
    }

    setEmojiOpen((prev) => !prev);
  };

  const handleEmojiSelected = (emoji) => {
    const nextValue = `${textValue}${emoji?.emoji || ""}`;
    onChangeText?.(nextValue);
    setEmojiOpen(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });
  };

  return (
    <>
      <NativeAnimated.View
        onLayout={handleLayout}
        style={[
          styles.legacyOuter,
          {
            transform: [{ translateY: NativeAnimated.multiply(keyboardOffset, -1) }],
            paddingBottom: keyboardVisible
              ? Math.max(insets.bottom + 10, Platform.OS === "ios" ? 12 : 10)
              : Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6),
          },
        ]}
      >
        <View style={styles.row}>
          {/* <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleToggleEmoji}
            style={[styles.iconButton, emojiOpen && styles.iconButtonActive]}
          >
            <Ionicons name={emojiOpen ? "close-outline" : "happy-outline"} size={20} color={emojiOpen ? "#FFFFFF" : "#475569"} />
          </TouchableOpacity> */}

          <View style={styles.inputShell}>
            <TextInput
              ref={inputRef}
              value={textValue}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              style={[styles.input, { height: inputHeight }]}
              multiline
              returnKeyType="default"
              textAlignVertical="center"
              blurOnSubmit={false}
              onFocus={onFocus}
              onContentSizeChange={handleContentSizeChange}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </NativeAnimated.View>

      {/* <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onRequestClose={() => setEmojiOpen(false)}
        onEmojiSelected={handleEmojiSelected}
        enableSearchBar
        enableRecentlyUsed
        expandable
        defaultHeight={Platform.OS === "ios" ? "46%" : "54%"}
        expandedHeight={Platform.OS === "ios" ? "80%" : "86%"}
        theme={{
          backdrop: "rgba(15, 23, 42, 0.42)",
          container: "#FFFFFF",
          knob: "#CBD5E1",
          header: "#0F172A",
          category: {
            icon: "#94A3B8",
            iconActive: PRIMARY_COLOR,
            container: "#F8FAFC",
            containerActive: "#ECFDF5",
          },
          search: {
            background: "#F8FAFC",
            text: "#0F172A",
            placeholder: "#94A3B8",
            icon: "#94A3B8",
          },
          emoji: {
            selected: "#DCFCE7",
          },
        }}
      /> */}
    </>
  );
}

const styles = StyleSheet.create({
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  legacyOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  outer: {
    borderTopWidth: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  inputShell: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 104,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    lineHeight: 20,
    color: "#0F172A",
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#A7F3D0",
    shadowOpacity: 0,
    elevation: 0,
  },
});
