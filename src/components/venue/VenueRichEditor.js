import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import {
  RichEditor,
  RichToolbar,
  actions,
} from "react-native-pell-rich-editor";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

// Mirrors frontend VenueRichEditor.js — Tiptap on web, Pell (HTML in a WebView)
// on native. Toolbar buttons match exactly: Bold / Italic | H2 / H3 |
// BulletList / OrderedList | Undo / Redo. Output is HTML, same as frontend.

function plainTextToHtml(text) {
  if (!text) return "";
  return text
    .split("\n\n")
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function isHtmlContent(s) {
  return typeof s === "string" && /<[a-z][\s\S]*>/i.test(s);
}

function stripHtml(s) {
  if (!s) return "";
  return String(s).replace(/<[^>]+>/g, "").trim();
}

export default function VenueRichEditor({
  value = "",
  onChange,
  readOnly = false,
  placeholder = "Describe your venue, rules, and facilities…",
}) {
  const editorRef = useRef(null);
  const [focused, setFocused] = useState(false);

  // Initialise editor content once and sync clears
  useEffect(() => {
    if (!editorRef.current) return;
    const html = isHtmlContent(value) ? value : plainTextToHtml(value);
    editorRef.current.setContentHTML(html || "");
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  if (readOnly) {
    return (
      <View style={styles.readOnly}>
        {value ? (
          <Text style={styles.readOnlyText}>{stripHtml(value)}</Text>
        ) : (
          <Text style={styles.readOnlyEmpty}>No description</Text>
        )}
      </View>
    );
  }

  // Toolbar icon renderer — uses lucide-react-native icons matching frontend
  const iconMap = {
    [actions.setBold]: ({ tintColor }) => (
      <Bold size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.setItalic]: ({ tintColor }) => (
      <Italic size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.heading2]: ({ tintColor }) => (
      <Heading2 size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.heading3]: ({ tintColor }) => (
      <Heading3 size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.insertBulletsList]: ({ tintColor }) => (
      <ListIcon size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.insertOrderedList]: ({ tintColor }) => (
      <ListOrdered size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.undo]: ({ tintColor }) => (
      <UndoIcon size={16} color={tintColor} strokeWidth={2.5} />
    ),
    [actions.redo]: ({ tintColor }) => (
      <RedoIcon size={16} color={tintColor} strokeWidth={2.5} />
    ),
  };

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      {/* Toolbar — same 8 buttons + order as frontend */}
      <RichToolbar
        editor={editorRef}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.heading2,
          actions.heading3,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.undo,
          actions.redo,
        ]}
        iconMap={iconMap}
        style={styles.toolbar}
        flatContainerStyle={styles.toolbarFlat}
        iconTint="#6B7280"
        selectedIconTint={PRIMARY_COLOR}
        selectedButtonStyle={styles.toolbarBtnActive}
        // each toolbar button — square 36×36 like frontend
        iconSize={16}
      />

      {/* Editor body */}
      <RichEditor
        ref={editorRef}
        initialContentHTML={
          isHtmlContent(value) ? value : plainTextToHtml(value)
        }
        placeholder={placeholder}
        onChange={(html) => onChange?.(html)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editorStyle={{
          backgroundColor: "#FFFFFF",
          color: "#111827",
          placeholderColor: "#9CA3AF",
          contentCSSText: `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 20px;
            min-height: 140px;
            padding: 0;
          `,
        }}
        useContainer
        initialHeight={160}
        style={styles.editor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  containerFocused: {
    borderColor: `${PRIMARY_COLOR}80`,
  },
  toolbar: {
    backgroundColor: "rgba(243, 244, 246, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.9)",
    minHeight: 40,
    paddingHorizontal: 6,
  },
  toolbarFlat: { paddingHorizontal: 0 },
  toolbarBtnActive: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    borderRadius: 8,
  },
  editor: {
    minHeight: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Read-only display
  readOnly: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  readOnlyEmpty: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#9CA3AF",
  },
});
