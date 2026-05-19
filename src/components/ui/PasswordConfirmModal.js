import { useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { ShieldAlert, X } from "lucide-react-native";
import PasswordField from "../auth/PasswordField";
import AuthButton from "../auth/AuthButton";
import { PRIMARY_COLOR } from "../../constants/theme";

// Password-gated confirmation modal — used before destructive admin actions.
export default function PasswordConfirmModal({
  visible,
  title = "Confirm with Password",
  description = "Re-enter your password to continue.",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  loading,
}) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleConfirm = async () => {
    if (!password) return;
    const ok = await onConfirm?.(password);
    if (ok !== false) setPassword("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.modal}>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <ShieldAlert size={26} color="#EF4444" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            showPassword={showPass}
            onToggle={() => setShowPass((v) => !v)}
            editable={!loading}
            autoFocus
          />

          <AuthButton
            title={loading ? "Verifying..." : confirmLabel}
            onPress={handleConfirm}
            loading={loading}
            disabled={!password}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  closeBtn: { position: "absolute", top: 14, right: 14, padding: 6 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
});
