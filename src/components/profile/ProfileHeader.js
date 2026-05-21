import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BadgeCheck, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import uploadService from "../../services/uploadService";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";
import toast from "../../utils/toast";

// Mirrors frontend/src/components/profile/ProfileHeader.js
// Avatar (tap to change) + name + verified badge + email + role badge.
export default function ProfileHeader() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const initials = (user?.name || "?").trim()[0]?.toUpperCase() || "?";
  const verified =
    user?.is_verified ||
    (user?.role === "coach" && user?.doc_verification_status === "verified");

  const roleLabel =
    user?.role === "player" ? "LOBBIAN" : (user?.role || "").replace("_", " ").toUpperCase();

  const pickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error("Permission denied", "Please allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setUploading(true);
      const uploaded = await uploadService.uploadImage(asset);
      const url = uploaded?.url || uploaded?.image_url || uploaded;
      if (typeof url !== "string") throw new Error("Upload returned no URL");

      await authService.updateProfile({ avatar: url });
      await updateUser({ avatar: url });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error("Upload failed", err?.response?.data?.detail || err?.message || "Try again");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={pickAndUpload}
        disabled={uploading}
        activeOpacity={0.85}
        style={styles.avatarBtn}
        accessibilityLabel="Change profile photo"
      >
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}
        <View style={styles.avatarOverlay}>
          {uploading ? (
            <View style={styles.overlayInner}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.overlayText}>Uploading…</Text>
            </View>
          ) : (
            <View style={styles.overlayInner}>
              <Camera size={20} color="#FFFFFF" />
              <Text style={styles.overlayText}>Change Photo</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name || "Venue Owner"}
        </Text>
        {verified ? <BadgeCheck size={20} color={PRIMARY_COLOR} /> : null}
      </View>
      {user?.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}

      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{roleLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  avatarBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 4,
    borderColor: `${PRIMARY_COLOR}33`,
    backgroundColor: "#DCFCE7",
    position: "relative",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
  },
  avatarInitial: { fontSize: 36, fontWeight: "900", color: "#FFFFFF" },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    bottom: 0,
    height: 30,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayInner: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  overlayText: { color: "#FFFFFF", fontSize: 10, fontFamily: FONTS.bodyBold, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  name: { fontSize: 22, fontFamily: FONTS.displayBold, fontWeight: "900", color: "#111827" },
  email: { fontSize: 13, color: "#6B7280", fontFamily: FONTS.body, marginBottom: 12 },
  roleBadge: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}33`,
  },
  roleText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    letterSpacing: 1.5,
  },
});
