import React, { useEffect, useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  Camera,
  Check,
  Trash2,
  Users,
  X,
} from "lucide-react-native";

import chatService from "../../services/chatService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import SportPicker from "../shared/SportPicker";
import SportDropdownButton from "../shared/SportDropdownButton";

export default function EditGroupModal({ visible, onClose, group, onUpdate }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    sport: "",
    is_private: false,
    max_members: 50,
    avatar_url: "",
    cover_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync form when group changes or modal opens
  useEffect(() => {
    if (group && visible) {
      setForm({
        name: group.name || "",
        description: group.description || "",
        sport: group.sport || "",
        is_private: !!group.is_private,
        max_members: group.max_members || (group.group_type === "club" ? 20 : 50),
        avatar_url: group.avatar_url || "",
        cover_url: group.cover_url || "",
      });
      setShowDeleteConfirm(false);
      setFormError("");
    }
  }, [group, visible]);

  // ── Image Picking (same pattern as Create Group form) ──────
  const pickImage = async (type) => {
    const isAvatar = type === "avatar";
    const field = isAvatar ? "avatar_url" : "cover_url";
    try {
      const ImagePicker = require("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setForm((prev) => ({ ...prev, [field]: uri }));
        if (isAvatar) setUploadingAvatar(true);
        else setUploadingCover(true);
        const formData = new FormData();
        formData.append("file", { uri, name: isAvatar ? "avatar.jpg" : "cover.jpg", type: "image/jpeg" });
        const res = await chatService.uploadFile(formData);
        const newUrl = res.url || res.media_url || "";
        if (newUrl) {
          setForm((prev) => ({ ...prev, [field]: newUrl }));
          await chatService.updateGroup(group._id || group.id, { [field]: newUrl });
          if (onUpdate) onUpdate({ [field]: newUrl });
        }
      }
    } catch {
      toast.error(`Failed to upload ${isAvatar ? "avatar" : "cover"}`);
    } finally {
      if (isAvatar) setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Group name is required");
      return;
    }
    setFormError("");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        sport: form.sport,
        is_private: form.is_private,
        max_members: form.max_members,
      };
      await chatService.updateGroup(group._id || group.id, payload);
      if (onUpdate) onUpdate(payload);
      onClose();
    } catch {
      setFormError("Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      "Delete Group",
      "This will permanently delete the group and all messages. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await chatService.deleteGroup(group._id || group.id);
              toast.success("Group deleted");
              onClose();
              if (onUpdate) onUpdate(null);
            } catch {
              toast.error("Failed to delete group");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Group</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={60}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Avatar</Text>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={() => pickImage("avatar")}
                activeOpacity={0.7}
              >
                {form.avatar_url ? (
                  <Image
                    source={{ uri: mediaUrl(form.avatar_url) }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Users size={28} color={PRIMARY_COLOR} />
                  </View>
                )}
                {uploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
              <Text style={styles.uploadHint}>Tap to change</Text>
            </View>

            {/* Cover Image */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Cover Image</Text>
              <TouchableOpacity
                style={styles.coverWrap}
                onPress={() => pickImage("cover")}
                activeOpacity={0.7}
              >
                {form.cover_url ? (
                  <Image
                    source={{ uri: mediaUrl(form.cover_url) }}
                    style={styles.coverImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.coverFallback}>
                    <Camera size={22} color="#9CA3AF" />
                    <Text style={styles.coverFallbackText}>Tap to upload cover</Text>
                  </View>
                )}
                {uploadingCover ? (
                  <View style={styles.coverOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                value={form.name}
                onChangeText={(t) => { setForm((p) => ({ ...p, name: t })); if (formError) setFormError(""); }}
                placeholder="Group name"
                placeholderTextColor="#9CA3AF"
                style={[styles.textInput, formError ? styles.fieldError : null]}
              />
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={form.description}
                onChangeText={(t) => setForm((p) => ({ ...p, description: t }))}
                placeholder="Group description..."
                placeholderTextColor="#9CA3AF"
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Sport Picker */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Sport</Text>
              <SportDropdownButton
                selectedSport={form.sport}
                onPress={() => setShowSportPicker(true)}
              />
            </View>

            {/* Group Type (Private toggle) */}
            <View style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Private Group</Text>
                <Switch
                  value={form.is_private}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, is_private: v }))
                  }
                  trackColor={{ false: "#E2E8F0", true: PRIMARY_COLOR + "80" }}
                  thumbColor={form.is_private ? PRIMARY_COLOR : "#FFFFFF"}
                />
              </View>
              <Text style={styles.switchHint}>
                {form.is_private
                  ? "Only invited members can join"
                  : "Anyone can find and join this group"}
              </Text>
            </View>

            {/* Max Members */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.label}>Max Members</Text>
                <Text style={{ fontSize: 11, color: "#94A3B8" }}>(max {group?.group_type === "club" ? "20" : "50"})</Text>
              </View>
              <TextInput
                value={String(form.max_members)}
                onChangeText={(t) => {
                  const limit = group?.group_type === "club" ? 20 : 50;
                  if (t === "") { setForm((p) => ({ ...p, max_members: "" })); return; }
                  const val = parseInt(t) || 0;
                  if (!isNaN(val)) {
                    setForm((p) => ({
                      ...p,
                      max_members: Math.min(Math.max(val, 2), limit),
                    }));
                  }
                }}
                placeholder={group?.group_type === "club" ? "20" : "50"}
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                style={styles.textInput}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={18} color="#FFFFFF" />
              )}
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>

            {/* Delete Group */}
            <View style={styles.dangerZone}>
              {!showDeleteConfirm ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => setShowDeleteConfirm(true)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Delete Group</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.deleteConfirm}>
                  <Text style={styles.deleteConfirmText}>
                    This will permanently delete the group and all messages.
                  </Text>
                  <View style={styles.deleteConfirmActions}>
                    <TouchableOpacity
                      style={styles.deleteConfirmCancel}
                      onPress={() => setShowDeleteConfirm(false)}
                    >
                      <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteConfirmBtn}
                      onPress={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Trash2 size={14} color="#FFFFFF" />
                          <Text style={styles.deleteConfirmBtnText}>
                            Confirm Delete
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>

    {/* Sport Picker Modal - Using Shared Component */}
    <SportPicker
      visible={showSportPicker}
      onClose={() => setShowSportPicker(false)}
      selectedSport={form.sport}
      onSelectSport={(sportKey) => setForm((p) => ({ ...p, sport: sportKey }))}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    flex: 1,
    marginTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },

  // Field group
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Avatar
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  uploadHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },

  // Cover
  coverWrap: {
    height: 120,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  coverFallbackText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },

  // Text input
  textInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
  },
  fieldError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 2,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Switch (private toggle)
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  switchHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -2,
  },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Danger zone
  dangerZone: {
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  deleteConfirm: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    backgroundColor: "rgba(239,68,68,0.04)",
    padding: 16,
    gap: 12,
  },
  deleteConfirmText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 8,
  },
  deleteConfirmCancel: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmCancelText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
