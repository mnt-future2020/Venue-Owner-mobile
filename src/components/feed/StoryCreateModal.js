import { useMemo, useState } from "react";
import { Image as RNImage, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PRIMARY_COLOR, STORY_COLORS } from "../../constants/theme";
import uploadService from "../../services/uploadService";

export default function StoryCreateModal({ visible, onClose, onSubmit, submitting }) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [color, setColor] = useState(STORY_COLORS[0]);
  const [pickedAsset, setPickedAsset] = useState(null);
  const [uploading, setUploading] = useState(false);

  const canSubmit = useMemo(
    () => (content.trim().length > 0 || mediaUrl.trim().length > 0 || pickedAsset) && !submitting && !uploading,
    [content, mediaUrl, submitting, pickedAsset, uploading]
  );

  const handleClose = () => {
    setContent("");
    setMediaUrl("");
    setColor(STORY_COLORS[0]);
    setPickedAsset(null);
    onClose?.();
  };

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPickedAsset(result.assets[0]);
        setMediaUrl("");
      }
    } catch {}
  };

  const handleSubmit = async () => {
    let finalUrl = mediaUrl.trim();

    if (pickedAsset && !finalUrl) {
      setUploading(true);
      try {
        const uploaded = await uploadService.uploadImage(pickedAsset);
        finalUrl = uploaded?.url || uploaded?.media_url || "";
      } catch {}
      setUploading(false);
    }

    const ok = await onSubmit?.({
      content: content.trim(),
      media_url: finalUrl,
      bg_color: color,
    });

    if (ok !== false) {
      handleClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create Story</Text>
              <Text style={styles.subtitle}>Share a quick highlight for 24 hours</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={[styles.previewCard, { backgroundColor: color }]}>
              <Text numberOfLines={5} style={styles.previewText}>
                {content || "Your story preview"}
              </Text>
            </View>

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Post your match score or quick update..."
              placeholderTextColor="#94A3B8"
              multiline
              style={styles.textArea}
            />

            <View style={styles.block}>
              <Text style={styles.blockLabel}>Background</Text>
              <View style={styles.colorsRow}>
                {STORY_COLORS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.9}
                    onPress={() => setColor(item)}
                    style={[styles.colorChip, { backgroundColor: item }, color === item && styles.colorChipActive]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockLabel}>Media (optional)</Text>

              {pickedAsset && (
                <View style={{ alignItems: "center", marginBottom: 8 }}>
                  <RNImage source={{ uri: pickedAsset.uri }} style={{ width: 120, height: 120, borderRadius: 14 }} />
                  <TouchableOpacity onPress={() => setPickedAsset(null)} style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.pickMediaBtn} onPress={pickMedia} activeOpacity={0.85}>
                <Ionicons name="images-outline" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.pickMediaText}>
                  {pickedAsset ? "Change media" : "Choose from gallery"}
                </Text>
              </TouchableOpacity>

              <TextInput
                value={mediaUrl}
                onChangeText={(v) => { setMediaUrl(v); if (v.trim()) setPickedAsset(null); }}
                placeholder="Or paste a URL instead"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.submitText}>{submitting ? "Posting..." : "Post Story"}</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingTop: 18,
    gap: 16,
  },
  previewCard: {
    height: 180,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  previewText: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  textArea: {
    minHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 15,
    lineHeight: 22,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  block: {
    gap: 8,
  },
  blockLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  colorsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorChipActive: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    outlineColor: PRIMARY_COLOR,
    outlineWidth: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
  },
  submitButton: {
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#A7F3D0",
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pickMediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    borderStyle: "dashed",
    backgroundColor: "#ECFDF5",
  },
  pickMediaText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
});
