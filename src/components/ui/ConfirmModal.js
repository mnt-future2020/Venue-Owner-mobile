// Reusable confirm dialog styled like LogoutModal — replaces the system Alert.alert
// for in-app destructive confirmations (delete post, delete account, etc.).
//
// Props:
//   visible       – boolean
//   onClose       – fn called when user dismisses or taps Cancel
//   onConfirm     – fn called when user taps the primary destructive button
//   icon          – lucide icon component (e.g. Trash2)
//   iconColor     – tint for the icon (defaults to red)
//   title         – heading text (e.g. "Delete Post?")
//   message       – body text
//   confirmText   – label for the destructive button (defaults to "Delete")
//   cancelText    – label for the cancel button (defaults to "Cancel")
//   loading       – boolean: when true, disables buttons and dims confirm
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";

export default function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  icon: Icon,
  iconColor = "#EF4444",
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  loading = false,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={loading ? undefined : onClose}>
        <View style={styles.card}>
          {Icon ? (
            <View style={[styles.iconWrap, { backgroundColor: iconColor + "14" }]}>
              <Icon size={28} color={iconColor} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.subtitle}>{message}</Text> : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: iconColor }, loading && styles.confirmBtnLoading]}
              activeOpacity={0.8}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  confirmBtnLoading: { opacity: 0.85 },
  confirmText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
