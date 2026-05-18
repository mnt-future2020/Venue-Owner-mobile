import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { FileText, ImageIcon, Volume2, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";

export default function ReplyBubble({ message, onCancel }) {
  const senderName =
    message?.sender_name ||
    message?.sender?.name ||
    message?.user?.name ||
    "Reply";
  const content = message?.content || message?.text || "";
  const mUrl = message?.media_url || "";
  const mType = message?.media_type || "";
  const isImage = mUrl && (!mType || mType === "image");
  const isDoc = mUrl && mType === "document";
  const isVoice = mUrl && (mType === "voice" || mType === "audio");

  const previewText = content
    ? content
    : isVoice
      ? "Voice message"
      : isDoc
        ? message?.file_name || "Document"
        : isImage
          ? "Photo"
          : "";

  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {senderName}
        </Text>
        <View style={styles.previewRow}>
          {isVoice && <Volume2 size={12} color="#6B7280" />}
          {isDoc && <FileText size={12} color="#6B7280" />}
          {isImage && !content && <ImageIcon size={12} color="#6B7280" />}
          <Text style={styles.text} numberOfLines={1}>
            {previewText}
          </Text>
        </View>
      </View>
      {/* Image thumbnail */}
      {isImage && (
        <Image
          source={{ uri: mediaUrl(mUrl) }}
          style={styles.thumb}
          contentFit="cover"
        />
      )}
      <TouchableOpacity
        onPress={onCancel}
        style={styles.closeBtn}
        activeOpacity={0.7}
      >
        <X size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accent: {
    width: 3,
    height: "100%",
    minHeight: 32,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginRight: 10,
  },
  body: { flex: 1 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 2,
  },
  text: { fontSize: 13, color: "#6B7280", flex: 1 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: "#E5E7EB",
  },
  closeBtn: { padding: 6 },
});
