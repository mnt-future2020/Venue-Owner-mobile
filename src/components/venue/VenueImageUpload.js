import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import uploadService from "../../services/uploadService";
import toast from "../../utils/toast";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function VenueImageUpload({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalToUpload, setTotalToUpload] = useState(0);

  const pickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error("Permission denied", "Allow photo access in settings");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      if (!assets.length) return;

      // Validate size
      const validAssets = [];
      for (const a of assets) {
        if (a.fileSize && a.fileSize > MAX_BYTES) {
          toast.warning(
            "Image too large",
            `${a.fileName || "image"} exceeds 10 MB and was skipped.`
          );
          continue;
        }
        validAssets.push(a);
      }

      if (!validAssets.length) return;

      setUploading(true);
      setTotalToUpload(validAssets.length);
      const uploaded = [...images];

      for (let i = 0; i < validAssets.length; i++) {
        setCurrentIndex(i + 1);
        try {
          const url = await uploadService.uploadImage(validAssets[i]);
          if (url) uploaded.push(url);
        } catch (err) {
          toast.error(
            "Upload failed",
            err?.response?.data?.detail || err?.message || "Try again"
          );
          break;
        }
      }

      onChange(uploaded);
    } finally {
      setUploading(false);
      setCurrentIndex(0);
      setTotalToUpload(0);
    }
  };

  const removeImage = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const thumbSize = Math.floor((SCREEN_WIDTH - 40 - 16) / 3);

  return (
    <View style={styles.wrapper}>
      {images.length > 0 ? (
        <Text style={styles.countText}>
          {images.length} image{images.length !== 1 ? "s" : ""} uploaded
        </Text>
      ) : null}

      {images.length > 0 ? (
        <View style={styles.grid}>
          {images.map((url, i) => (
            <View
              key={`${url}-${i}`}
              style={[
                styles.thumbWrap,
                { width: thumbSize, height: thumbSize },
              ]}
            >
              <Image source={{ uri: url }} style={styles.thumb} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeImage(i)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={12} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.uploadBtn, uploading && styles.uploadBtnBusy]}
        onPress={pickImages}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.uploadBtnTextBusy}>
              Uploading {currentIndex}/{totalToUpload}…
            </Text>
          </>
        ) : (
          <>
            <ImagePlus size={18} color={PRIMARY_COLOR} strokeWidth={2.2} />
            <Text style={styles.uploadBtnText}>
              {images.length > 0 ? "Add more images" : "Upload venue images"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.helper}>
        JPG, PNG, WebP · max 10 MB each. Images appear on your public venue page.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  countText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  thumbWrap: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  thumb: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${PRIMARY_COLOR}55`,
    borderStyle: "dashed",
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  uploadBtnBusy: { opacity: 0.7 },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  uploadBtnTextBusy: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  helper: { fontSize: 11, color: "#9CA3AF", lineHeight: 15 },
});
