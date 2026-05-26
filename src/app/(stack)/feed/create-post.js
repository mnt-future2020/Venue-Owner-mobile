import { useContext, useMemo, useState } from "react";
import {
  Image as RNImage,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImageManipulator from "expo-image-manipulator";
import { BORDER_COLOR, FONTS, PRIMARY_COLOR, SURFACE_COLOR } from "../../../constants/theme";
import feedService from "../../../services/feedService";
import uploadService from "../../../services/uploadService";
import toast from "../../../utils/toast";
import TabRefreshContext from "../../../context/TabRefreshContext";

const MAX_IMAGES = 4;
const MAX_VIDEO_DURATION_MS = 25000;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Read actual pixel width from disk (frontend reads img.width after canvas load — this is the
// mobile equivalent, since expo-document-picker does not expose width/height on its result).
function readImageWidth(uri) {
  return new Promise((resolve) => {
    RNImage.getSize(uri, (w) => resolve(Number(w) || 0), () => resolve(0));
  });
}

// Mirror of frontend SocialFeedPage compressImage(file, maxWidth=1200, quality=0.75):
//   - skip resize when source width <= maxWidth (no upscale)
//   - encode as JPEG (frontend tries WebP first, but the mobile upload endpoint rejects
//     image/webp — confirmed by upstream "Network request failed" on .webp uploads — so
//     we always emit JPEG on mobile for reliability)
//   - rename extension to .jpg and set type/mimeType to image/jpeg so the multipart
//     Content-Type matches the actual bytes (backend magic-byte check)
//   - on any failure, return the original asset untouched
async function compressImage(asset, maxWidth = 1200, quality = 0.75) {
  const originalName = asset?.fileName || asset?.name || asset?.uri?.split("/").pop() || `image-${Date.now()}`;
  const baseName = originalName.replace(/\.[^/.]+$/, "");

  // Match frontend: only resize when actual image width > maxWidth (frontend reads img.width
  // after the image element loads; we read it via RNImage.getSize for the same fidelity).
  const pickerWidth = Number(asset?.width) || 0;
  const srcWidth = pickerWidth > 0 ? pickerWidth : await readImageWidth(asset.uri);
  const actions = srcWidth > maxWidth ? [{ resize: { width: maxWidth } }] : [];

  try {
    const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const outName = `${baseName}.jpg`;
    return {
      uri: result.uri,
      name: outName,
      fileName: outName,
      type: "image/jpeg",
      mimeType: "image/jpeg",
      width: result.width,
      height: result.height,
    };
  } catch {
    // Fallback to original asset, untouched (preserves real mimeType so backend won't reject)
    return asset;
  }
}

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { triggerRefresh } = useContext(TabRefreshContext);

  const [content, setContent] = useState("");
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [videoAsset, setVideoAsset] = useState(null);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dailyPrompt = params?.prompt || "";

  const hasMedia = selectedAssets.length > 0 || !!videoAsset;

  const canSubmit = useMemo(() => {
    return (content.trim().length > 0 || hasMedia) && !submitting && !picking;
  }, [content, picking, hasMedia, submitting]);

  const handlePickImages = async () => {
    if (picking || submitting) return;
    if (videoAsset) { toast.error("Remove video first to add images"); return; }

    setPicking(true);
    try {
      const DocumentPicker = require("expo-document-picker");
      const remaining = MAX_IMAGES - selectedAssets.length;
      if (remaining <= 0) { toast.error(`Maximum ${MAX_IMAGES} images allowed`); return; }

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const newAssets = result.assets.slice(0, remaining);
      setSelectedAssets((prev) => [...prev, ...newAssets].slice(0, MAX_IMAGES));
    } catch (error) {
      toast.error(error?.message || "Unable to open file picker");
    } finally {
      setPicking(false);
    }
  };

  const handlePickVideo = async () => {
    if (picking || submitting) return;
    if (selectedAssets.length > 0) { toast.error("Remove images first to add video"); return; }

    setPicking(true);
    try {
      const DocumentPicker = require("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (Number(asset.duration || 0) > MAX_VIDEO_DURATION_MS) {
        toast.error("Video must be 25 seconds or less");
        return;
      }
      if (Number(asset.size || 0) > MAX_VIDEO_SIZE_BYTES) {
        toast.error("Video must be 50MB or less");
        return;
      }
      setVideoAsset(asset);
    } catch (error) {
      toast.error(error?.message || "Unable to open file picker");
    } finally {
      setPicking(false);
    }
  };

  const removeImage = (index) => setSelectedAssets((prev) => prev.filter((_, i) => i !== index));
  const removeVideo = () => setVideoAsset(null);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      let mediaUrl = "";
      let mediaUrls = [];
      let postType = "text";

      if (selectedAssets.length > 0) {
        // Mirror frontend: const compressed = await Promise.all(selected.map(f => compressImage(f)));
        const toUpload = await Promise.all(selectedAssets.map((a) => compressImage(a)));
        const urls = await uploadService.uploadImages(toUpload);
        mediaUrls = urls.filter(Boolean);
        mediaUrl = mediaUrls[0] || "";
        postType = "photo";
      } else if (videoAsset) {
        mediaUrl = await uploadService.uploadVideo(videoAsset);
        mediaUrls = mediaUrl ? [mediaUrl] : [];
        postType = "video";
      }

      await feedService.createPost({
        content: content.trim(),
        post_type: postType,
        media_urls: mediaUrls,
        media_url: mediaUrl,
      });

      triggerRefresh("feed");
      toast.success("Posted!");
      router.back();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {/* Safe area top spacer */}
      <View style={{ height: insets.top, backgroundColor: SURFACE_COLOR }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85} disabled={submitting}>
          <Ionicons name="close" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.postBtnText}>{submitting ? "Posting..." : "Post"}</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={dailyPrompt || "Share a training tip or update…"}
            placeholderTextColor="#94A3B8"
            multiline
            style={styles.textArea}
          />

          {/* Media toolbar — right below text field */}
          <View style={styles.inlineToolbar}>
            <TouchableOpacity
              style={[styles.inlineIconBtn, !!videoAsset && styles.iconBtnDisabled]}
              activeOpacity={0.85}
              onPress={handlePickImages}
              disabled={picking || submitting || !!videoAsset}
            >
              <Ionicons name="images-outline" size={20} color={videoAsset ? "#CBD5E1" : PRIMARY_COLOR} />
              <Text style={[styles.inlineIconLabel, !!videoAsset && { color: "#CBD5E1" }]}>Photo</Text>
              {selectedAssets.length > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{selectedAssets.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inlineIconBtn, selectedAssets.length > 0 && styles.iconBtnDisabled]}
              activeOpacity={0.85}
              onPress={handlePickVideo}
              disabled={picking || submitting || selectedAssets.length > 0}
            >
              <Ionicons name="videocam-outline" size={20} color={selectedAssets.length > 0 ? "#CBD5E1" : PRIMARY_COLOR} />
              <Text style={[styles.inlineIconLabel, selectedAssets.length > 0 && { color: "#CBD5E1" }]}>Video</Text>
              {videoAsset ? <View style={styles.badgeDot} /> : null}
            </TouchableOpacity>
          </View>

          {/* Image previews */}
          {selectedAssets.length > 0 ? (
            <View style={styles.previewRow}>
              {selectedAssets.map((asset, index) => (
                <View key={`img-${index}`} style={styles.previewCard}>
                  <Image source={{ uri: asset.uri }} style={styles.previewImage} contentFit="cover" />
                  <TouchableOpacity style={styles.removeBtn} activeOpacity={0.9} onPress={() => removeImage(index)} disabled={submitting}>
                    <Ionicons name="close" size={14} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {/* Video preview */}
          {videoAsset ? (
            <View style={styles.videoCard}>
              <View style={styles.videoIcon}>
                <Ionicons name="videocam" size={24} color={PRIMARY_COLOR} />
              </View>
              <View style={styles.videoMeta}>
                <Text style={styles.videoLabel}>Video</Text>
                {videoAsset.duration ? (
                  <Text style={styles.videoDuration}>{formatDuration(videoAsset.duration / 1000)}</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.removeBtn} activeOpacity={0.9} onPress={removeVideo} disabled={submitting}>
                <Ionicons name="close" size={14} color="#0F172A" />
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  postBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  postBtnDisabled: {
    opacity: 0.4,
  },
  postBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  textArea: {
    minHeight: 160,
    fontSize: 16,
    lineHeight: 24,
    color: "#0F172A",
    textAlignVertical: "top",
    fontFamily: FONTS.body,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  previewCard: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  previewImage: {
    width: 80,
    height: 80,
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
  },
  videoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  videoMeta: {
    flex: 1,
    gap: 2,
  },
  videoLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: PRIMARY_COLOR,
  },
  videoDuration: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#64748B",
  },
  inlineToolbar: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  inlineIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
  },
  inlineIconLabel: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: PRIMARY_COLOR,
  },
  iconBtnDisabled: {
    backgroundColor: "#F8FAFC",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  badgeDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 2,
    borderColor: SURFACE_COLOR,
  },
});
