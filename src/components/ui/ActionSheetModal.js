// Reusable action sheet styled like ConfirmModal — replaces both `Alert.alert` (Android)
// and `ActionSheetIOS.showActionSheetWithOptions` (iOS) with one cross-platform sheet
// that matches the rest of the app's modal aesthetic.
//
// Props:
//   visible      – boolean
//   onClose      – fn called on backdrop tap / Cancel button
//   title        – heading text (e.g. "Change Profile Photo")
//   message      – optional body text under the title
//   actions      – array of action objects:
//                    { label: string, onPress: fn, destructive?: boolean, icon?: LucideIcon }
//   cancelText   – defaults to "Cancel"
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function ActionSheetModal({
  visible,
  onClose,
  title,
  message,
  actions = [],
  cancelText = "Cancel",
}) {
  const handlePress = (action) => {
    onClose?.();
    setTimeout(() => action.onPress?.(), 80); // tiny delay so the close animation runs first
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.subtitle}>{message}</Text> : null}

          <View style={styles.actionList}>
            {actions.map((action, idx) => {
              const Icon = action.icon;
              const color = action.destructive ? "#EF4444" : "#374151";
              return (
                <TouchableOpacity
                  key={action.label || idx}
                  style={[styles.actionBtn, idx > 0 && styles.actionBtnDivider]}
                  activeOpacity={0.7}
                  onPress={() => handlePress(action)}
                >
                  {Icon ? <Icon size={18} color={color} /> : null}
                  <Text style={[styles.actionText, { color }]}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7} onPress={onClose}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>
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
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  title: { fontSize: 17, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 4, lineHeight: 18 },
  actionList: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionBtnDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(229,231,235,0.7)",
  },
  actionText: { fontSize: 15, fontWeight: "600" },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
