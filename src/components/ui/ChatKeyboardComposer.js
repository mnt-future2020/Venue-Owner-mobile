import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paperclip, Send, X } from "lucide-react-native";
import ReplyBubble from "./ReplyBubble";
import ReanimatedAnimated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";
import { PRIMARY_COLOR } from "../../constants/theme";
import {
  KeyboardStickyView,
  useReanimatedKeyboardAnimation,
} from "../../lib/keyboardController";

export default function ChatKeyboardComposer({
  onSend,
  onAttachment,
  disabled,
  editingMessage,
  onCancelEdit,
  pendingFile,
  onCancelFile,
  mentionSuggestions = [],
  focusTrigger,
  onTyping,
  replyTo,
  onCancelReply,
  style,
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const textRef = useRef("");
  const [inputHeight, setInputHeight] = useState(40);
  const inputRef = useRef(null);

  // Focus input when focusTrigger changes (e.g. reply action)
  useEffect(() => {
    if (focusTrigger > 0) {
      setTimeout(() => inputRef.current?.focus?.(), 100);
    }
  }, [focusTrigger]);

  // Emit typing signal (debounced 2s)
  const typingTimeoutRef = useRef(null);
  const emitTypingDebounced = () => {
    if (!onTyping) return;
    if (!typingTimeoutRef.current) {
      onTyping();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
  };
  const sendScale = useRef(new Animated.Value(0)).current;
  const prevHasText = useRef(false);
  const { progress } = useReanimatedKeyboardAnimation();

  // Animated styles — exactly like CommentKeyboardComposer
  const closedBottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);
  const openedBottomInset = Platform.OS === "ios" ? 10 : 8;

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.value, [0, 1], [closedBottomInset, openedBottomInset], Extrapolation.CLAMP),
    borderTopColor: interpolateColor(progress.value, [0, 1], ["#E5E7EB", "#D7E0EA"]),
  }));

  useEffect(() => {
    if (editingMessage) setText(editingMessage.content || editingMessage.text || "");
  }, [editingMessage]);

  const hasText = text.trim().length > 0;
  const hasContent = hasText || !!pendingFile;

  const mentionMatch = text.match(/(?:^|\s)@([^\s@]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : "";
  const mentionTriggerIndex = mentionMatch ? text.lastIndexOf("@") : -1;
  const filteredMentions = useMemo(() => {
    if (!mentionQuery && mentionTriggerIndex === -1) return [];
    const q = mentionQuery.trim();
    return (mentionSuggestions || [])
      .filter((item) => {
        const name = String(item?.name || item?.label || "").toLowerCase();
        return name && (!q || name.includes(q));
      })
      .slice(0, 6);
  }, [mentionQuery, mentionSuggestions, mentionTriggerIndex]);

  const insertMention = (item) => {
    if (!item) return;
    const mentionName = item.name || item.label || "User";
    const mentionId = item.id || item.user_id || item._id;
    if (!mentionId) return;
    const nextText = text.replace(/(^|\s)@([^\s@]*)$/, `$1@[${mentionName}](${mentionId}) `);
    setText(nextText);
    textRef.current = nextText;
    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  if (hasText !== prevHasText.current) {
    prevHasText.current = hasText;
    Animated.spring(sendScale, { toValue: hasText ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
  }

  const handleSend = () => {
    const raw = textRef.current ?? text;
    if (!raw.trim() && !pendingFile) return;
    onSend?.(raw);
    setText("");
    textRef.current = "";
    setInputHeight(40);
    if (editingMessage && onCancelEdit) onCancelEdit();
  };

  const handleContentSizeChange = (e) => {
    const next = e.nativeEvent.contentSize.height || 40;
    setInputHeight(Math.min(Math.max(40, next), 100));
  };

  const actionButton = useMemo(() => (
    <Animated.View style={{ transform: [{ scale: hasContent ? sendScale : 1 }] }}>
      <TouchableOpacity
        onPress={handleSend}
        style={[styles.sendBtn, !hasContent && styles.sendBtnDisabled]}
        activeOpacity={0.7}
        disabled={disabled || !hasContent}
      >
        <Send size={16} color="#FFFFFF" style={{ marginLeft: 1 }} />
      </TouchableOpacity>
    </Animated.View>
  ), [disabled, hasContent, sendScale]);

  // Exact same render pattern as CommentKeyboardComposer:
  // KeyboardStickyView (absolute bottom) → Animated.View (container) → row
  return (
      <ReanimatedAnimated.View style={[styles.outer, containerAnimatedStyle, style]}>
        {replyTo ? (
          <ReplyBubble message={replyTo} onCancel={onCancelReply} />
        ) : null}
        {editingMessage && (
          <View style={styles.editBanner}>
            <Text style={styles.editBannerText} numberOfLines={1}>
              Editing: {editingMessage.content || editingMessage.text || ""}
            </Text>
            <TouchableOpacity onPress={() => { onCancelEdit?.(); setText(""); }} activeOpacity={0.7}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {pendingFile ? (
          <View style={styles.fileBanner}>
            <View style={styles.fileIconWrap}><Paperclip size={14} color={PRIMARY_COLOR} /></View>
            <Text style={styles.fileNameText} numberOfLines={1}>{pendingFile.name || "File"}</Text>
            <TouchableOpacity onPress={onCancelFile} style={styles.fileCancelBtn} activeOpacity={0.7}>
              <X size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : null}

          <View style={styles.row}>
            {filteredMentions.length > 0 && (
              <View style={styles.mentionWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.mentionScroll}>
                  {filteredMentions.map((item) => (
                    <TouchableOpacity key={String(item.id || item.user_id || item._id)} activeOpacity={0.85} style={styles.mentionChip} onPress={() => insertMention(item)}>
                      <Text style={styles.mentionChipText} numberOfLines={1}>{item.name || item.label || "User"}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={(v) => { textRef.current = v; setText(v); emitTypingDebounced(); }}
                placeholder="Message"
                placeholderTextColor="#8696A0"
                multiline
                returnKeyType="default"
                onContentSizeChange={handleContentSizeChange}
                style={[styles.input, { height: inputHeight }]}
                editable={!disabled}
                textAlignVertical="center"
                showSoftInputOnFocus
              />
              <TouchableOpacity onPress={onAttachment} style={styles.inlineBtn} activeOpacity={0.7} disabled={disabled}>
                <Paperclip size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View>{actionButton}</View>
          </View>
      </ReanimatedAnimated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingTop: 6,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  editBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "#F0FDF4", borderLeftWidth: 3, borderLeftColor: PRIMARY_COLOR, marginHorizontal: 8, marginTop: 4, borderRadius: 6, gap: 8 },
  editBannerText: { flex: 1, fontSize: 13, color: "#374151" },
  row: { flexDirection: "row", alignItems: "flex-end", paddingTop: 2, gap: 8, position: "relative" },
  mentionWrap: { position: "absolute", left: 2, right: 2, bottom: 54, zIndex: 20 },
  mentionScroll: { gap: 8, paddingVertical: 2 },
  mentionChip: { backgroundColor: "#0F172A", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 180 },
  mentionChipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  inputWrapper: { flex: 1, flexDirection: "row", alignItems: "flex-end", backgroundColor: "#F8FAFC", borderRadius: 24, minHeight: 44, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  inlineBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input: { flex: 1, fontSize: 14, lineHeight: 20, color: "#111827", maxHeight: 100, paddingVertical: Platform.OS === "ios" ? 10 : 8, paddingLeft: 14, paddingRight: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY_COLOR, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  fileBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 8, marginTop: 4, backgroundColor: "#F3F4F6", borderRadius: 12, gap: 8 },
  fileIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(34,197,94,0.1)", alignItems: "center", justifyContent: "center" },
  fileNameText: { flex: 1, fontSize: 12, fontWeight: "500", color: "#374151" },
  fileCancelBtn: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
