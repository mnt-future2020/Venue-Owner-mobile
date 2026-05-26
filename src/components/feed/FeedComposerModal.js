import { useMemo, useState } from "react";
import { Image as RNImage, Modal, Pressable, ScrollView as RNScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PRIMARY_COLOR } from "../../constants/theme";
import uploadService from "../../services/uploadService";

const POST_TYPES = [
  { key: "text", label: "Text" },
  { key: "photo", label: "Photo" },
  { key: "video", label: "Video" },
  { key: "match_result", label: "Score" },
];

export default function FeedComposerModal({ visible, onClose, onSubmit, submitting }) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("text");
  const [mediaInput, setMediaInput] = useState("");
  const [pickedAssets, setPickedAssets] = useState([]);
  const [uploading, setUploading] = useState(false);

  const canSubmit = useMemo(() => {
    if (uploading) return false;
    if (postType === "text" || postType === "match_result") return content.trim().length > 0 && !submitting;
    return (content.trim().length > 0 || mediaInput.trim().length > 0 || pickedAssets.length > 0) && !submitting;
  }, [content, mediaInput, postType, submitting, pickedAssets, uploading]);

  const handleClose = () => {
    setContent("");
    setMediaInput("");
    setPostType("text");
    setPickedAssets([]);
    onClose?.();
  };

  const pickMedia = async () => {
    try {
      const isVideo = postType === "video";
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: isVideo ? "videos" : "images",
        allowsMultipleSelection: !isVideo,
        selectionLimit: isVideo ? 1 : 4,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        setPickedAssets((prev) => [...prev, ...result.assets].slice(0, isVideo ? 1 : 4));
      }
    } catch {
      // Permission denied or picker error — fall back to URL input
    }
  };

  const removeAsset = (idx) => {
    setPickedAssets((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    let mediaUrls = [];

    // Upload picked assets first
    if (pickedAssets.length > 0) {
      setUploading(true);
      try {
        if (postType === "video" && pickedAssets[0]) {
          const uploaded = await uploadService.uploadVideo(pickedAssets[0]);
          mediaUrls = [uploaded?.url || uploaded?.media_url || ""];
        } else {
          const uploaded = await uploadService.uploadImages(pickedAssets);
          mediaUrls = (uploaded || []).map((u) => u?.url || u?.media_url || "").filter(Boolean);
        }
      } catch {
        // Fall through to URL input fallback
      } finally {
        setUploading(false);
      }
    }

    // Fallback: use manually entered URLs
    if (mediaUrls.length === 0 && mediaInput.trim()) {
      mediaUrls = mediaInput
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);
    }

    const payload = {
      content: content.trim(),
      post_type: postType,
      media_urls: postType === "photo" ? mediaUrls : [],
      media_url: mediaUrls[0] || "",
    };

    const ok = await onSubmit?.(payload);
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
              <Text style={styles.title}>Create Post</Text>
              <Text style={styles.subtitle}>Share what is happening on the turf</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.typeRow}>
              {POST_TYPES.map((type) => {
                const active = type.key === postType;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setPostType(type.key)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="How was your game today?"
              placeholderTextColor="#94A3B8"
              multiline
              style={styles.textArea}
            />

            {postType === "photo" || postType === "video" ? (
              <View style={styles.block}>
                <Text style={styles.blockLabel}>
                  {postType === "photo" ? "Photos" : "Video"}
                </Text>

                {/* Picked media preview */}
                {pickedAssets.length > 0 && (
                  <RNScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {pickedAssets.map((asset, idx) => (
                      <View key={idx} style={{ marginRight: 8, position: "relative" }}>
                        <RNImage source={{ uri: asset.uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                        <TouchableOpacity
                          onPress={() => removeAsset(idx)}
                          style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#EF4444", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" }}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </RNScrollView>
                )}

                {/* Pick from gallery button */}
                <TouchableOpacity style={styles.pickMediaBtn} onPress={pickMedia} activeOpacity={0.85}>
                  <Ionicons name={postType === "video" ? "videocam-outline" : "images-outline"} size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.pickMediaText}>
                    {pickedAssets.length > 0
                      ? postType === "video" ? "Change video" : "Add more photos"
                      : postType === "video" ? "Choose video from gallery" : "Choose photos from gallery"}
                  </Text>
                </TouchableOpacity>

                {/* URL fallback */}
                <TextInput
                  value={mediaInput}
                  onChangeText={setMediaInput}
                  placeholder="Or paste a URL instead"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.submitText}>{submitting ? "Posting..." : "Post Now"}</Text>
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
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typeChipActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  typeChipTextActive: {
    color: PRIMARY_COLOR,
  },
  textArea: {
    minHeight: 140,
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
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: "#0F172A",
    textAlignVertical: "top",
  },
  largeInput: {
    minHeight: 88,
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
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
