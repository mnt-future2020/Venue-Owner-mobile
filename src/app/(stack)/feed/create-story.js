import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StatusBar as RNStatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar, setStatusBarBackgroundColor, setStatusBarStyle, setStatusBarTranslucent } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { PRIMARY_COLOR, STORY_GRADIENTS } from "../../../constants/theme";
import feedService from "../../../services/feedService";
import toast from "../../../utils/toast";
import TabRefreshContext from "../../../context/TabRefreshContext";

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { triggerRefresh } = useContext(TabRefreshContext);
  const [content, setContent] = useState("");
  // Store the gradient KEY (matches frontend's Tailwind class string) — backend
  // gets the same value the web app sends, so a story posted from mobile renders
  // identically on web and vice versa.
  const [colorKey, setColorKey] = useState(STORY_GRADIENTS[0].key);
  const activeGradient = useMemo(
    () => STORY_GRADIENTS.find((g) => g.key === colorKey) || STORY_GRADIENTS[0],
    [colorKey]
  );
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const canSubmit = useMemo(() => content.trim().length > 0 && !submitting, [content, submitting]);

  // Force-apply a dark status bar (light icons) every time this screen gains
  // focus. The root StatusBarEnforcer fires on pathname change and re-sets
  // dark-content / white-bg, which races with our <StatusBar> JSX and wins
  // (parent effects fire after children's). useFocusEffect runs AFTER the
  // navigation transition, so it lands last and wins the race.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light", true);
      if (Platform.OS === "android") {
        setStatusBarBackgroundColor("#03120D", true);
        setStatusBarTranslucent(false);
        // Belt-and-suspenders: RN's imperative API also bypasses the
        // expo-status-bar stack in case the enforcer fires again later.
        RNStatusBar.setBarStyle("light-content", true);
        RNStatusBar.setBackgroundColor("#03120D", true);
        RNStatusBar.setTranslucent(false);
      }
    }, [])
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await feedService.createStory({
        content: content.trim(),
        bg_color: colorKey, // store the gradient key (matches frontend's Tailwind string)
      });
      triggerRefresh("feed");
      toast.success("Story posted!");
      router.back();
    } catch {
      toast.error("Failed to post story");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Dark screen → paint the Android status-bar background to match.
          The app's global status bar is white/non-translucent (root _layout +
          app.json androidStatusBar). Setting only style="light" here flipped the
          ICONS to white but left the BACKGROUND white, leaving a white strip with
          invisible icons at the top of this dark composer. Match the screen bg;
          expo-status-bar pops back to the white default on back-navigation. */}
      <StatusBar style="light" backgroundColor="#03120D" translucent={false} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topIconBtn} activeOpacity={0.85}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.shareBtn, !canSubmit && styles.shareBtnDisabled]}
          activeOpacity={0.9}
          disabled={!canSubmit}
        >
          <Text style={styles.shareBtnText}>{submitting ? "Posting..." : "Share Story"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Preview card — gradient background mirrors frontend SocialFeedPage.js:2165
            (`bg-gradient-to-br ${storyColor}`). Diagonal top-left → bottom-right. */}
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.previewWrap}>
          <LinearGradient
            colors={activeGradient.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <TextInput
              ref={inputRef}
              value={content}
              onChangeText={setContent}
              placeholder="Type your story..."
              placeholderTextColor="rgba(255,255,255,0.58)"
              multiline
              maxLength={280}
              autoFocus
              style={styles.storyInput}
              textAlignVertical="center"
              selectionColor="#FFFFFF"
              cursorColor="#FFFFFF"
            />
            <Text style={styles.helper}>{content.trim().length}/280</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.colorsDock}>
          <View style={styles.colorsRow}>
            {STORY_GRADIENTS.map((g) => {
              const selected = colorKey === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  activeOpacity={0.9}
                  onPress={() => setColorKey(g.key)}
                  style={[styles.colorChipWrap, selected && styles.colorChipWrapActive]}
                >
                  <LinearGradient
                    colors={g.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.colorChip}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#03120D",
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  shareBtn: {
    minWidth: 88,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
  },
  shareBtnDisabled: {
    opacity: 0.45,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  previewWrap: {
    flex: 1,
    marginBottom: 18,
  },
  previewCard: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  storyInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  helper: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "right",
    marginTop: 12,
  },
  colorsDock: {
    paddingBottom: 6,
  },
  colorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
  },
  // Frontend uses `ring-2 ring-white ring-offset-2` for the active chip — a white
  // outer ring with a small transparent gap to the chip. We emulate with a fixed-
  // size wrapper that conditionally shows a white border + inner padding when
  // active. Wrapper size stays constant (44×44) so layout doesn't jump.
  colorChipWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorChipWrapActive: {
    borderColor: "#FFFFFF",
  },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
