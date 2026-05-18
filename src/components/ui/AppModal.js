import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

/**
 * Reusable bottom sheet modal component.
 *
 * Props:
 *  - visible: boolean
 *  - onClose: () => void
 *  - title: string (optional header title)
 *  - subtitle: string (optional subtitle)
 *  - icon: React element (optional icon next to title)
 *  - maxHeight: string (default "75%")
 *  - children: modal body content
 *  - footer: React element (optional fixed footer)
 *  - showHandle: boolean (show drag handle, default true)
 */
export default function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  maxHeight = "75%",
  children,
  footer,
  showHandle = true,
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight, paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          {/* Handle */}
          {showHandle && (
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
          )}

          {/* Header */}
          {(title || icon) && (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {icon || null}
                <View style={icon ? { flex: 1 } : undefined}>
                  {title ? <Text style={styles.title}>{title}</Text> : null}
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Body */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {children}
          </ScrollView>

          {/* Footer */}
          {footer && (
            <View style={styles.footer}>
              {footer}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Alert-style modal — replaces Alert.alert with a styled modal.
 *
 * Props:
 *  - visible: boolean
 *  - title: string
 *  - message: string
 *  - buttons: Array<{ text, style?, onPress? }> (like Alert.alert buttons)
 *  - onClose: () => void
 */
export function AlertModal({ visible, title, message, buttons = [], onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          {title ? <Text style={alertStyles.title}>{title}</Text> : null}
          {message ? <Text style={alertStyles.message}>{message}</Text> : null}
          <View style={alertStyles.btnRow}>
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  alertStyles.btn,
                  btn.style === "destructive" && alertStyles.btnDestructive,
                  btn.style === "cancel" && alertStyles.btnCancel,
                  !btn.style && alertStyles.btnPrimary,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  onClose?.();
                  btn.onPress?.();
                }}
              >
                <Text style={[
                  alertStyles.btnText,
                  btn.style === "destructive" && alertStyles.btnTextDestructive,
                  btn.style === "cancel" && alertStyles.btnTextCancel,
                  !btn.style && alertStyles.btnTextPrimary,
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
});

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: PRIMARY_COLOR,
  },
  btnCancel: {
    backgroundColor: "#F1F5F9",
  },
  btnDestructive: {
    backgroundColor: "#FEF2F2",
  },
  btnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  btnTextPrimary: {
    color: "#FFFFFF",
  },
  btnTextCancel: {
    color: "#64748B",
  },
  btnTextDestructive: {
    color: "#EF4444",
  },
});
