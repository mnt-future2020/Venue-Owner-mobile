import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, Copy, Link2, Share2, X } from "lucide-react-native";
import chatService from "../../services/chatService";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";

export default function InviteLinkModal({ visible, onClose, groupId }) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatService.getInviteLink(groupId);
      // Backend returns { invite_code, group_id } — construct full URL
      const code = data?.invite_code || data?.invite_link || data?.link || data?.url || "";
      const link = code.startsWith("http") ? code : `https://lobbi.in/invite/${code}`;
      setInviteUrl(link);
    } catch {
      toast.error("Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      const Clipboard = require("expo-clipboard");
      await Clipboard.setStringAsync(inviteUrl);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    try {
      await Share.share({
        message: `Join our group on Lobbi! ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch {
      // user cancelled or error
    }
  };

  const handleClose = () => {
    setInviteUrl("");
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite Link</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {!inviteUrl ? (
              // Generate button
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerate}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Link2 size={18} color="#FFFFFF" />
                    <Text style={styles.generateBtnText}>
                      Generate Invite Link
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              // Show link with actions
              <>
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={2} selectable>
                    {inviteUrl}
                  </Text>
                </View>

                <View style={styles.linkActions}>
                  <TouchableOpacity
                    style={styles.linkActionBtn}
                    onPress={handleCopy}
                  >
                    {copied ? (
                      <Check size={18} color={PRIMARY_COLOR} />
                    ) : (
                      <Copy size={18} color="#374151" />
                    )}
                    <Text style={styles.linkActionText}>
                      {copied ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.linkActionBtn, styles.shareBtn]}
                    onPress={handleShare}
                  >
                    <Share2 size={18} color="#FFFFFF" />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  body: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    height: 48,
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  linkBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  linkText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  linkActions: {
    flexDirection: "row",
    gap: 12,
  },
  linkActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  linkActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  shareBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
