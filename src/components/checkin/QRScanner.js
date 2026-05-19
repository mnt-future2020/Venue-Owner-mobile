import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera as CameraIcon } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

/**
 * QR code scanner.
 *
 * Props:
 *  - enabled: boolean (when false, camera is unmounted)
 *  - onScan: (value: string) => void
 *
 * Parses backend QR format `HORIZON_CHECKIN:<booking_id>:<token>` and passes
 * the raw barcode value to the parent. The parent decides how to interpret it
 * (raw booking_id, full QR string, or base64).
 */
export default function QRScanner({ enabled = true, onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  // Throttle scans — BarCodeScanner can fire repeatedly while a code is in frame
  const lastScanAtRef = useRef(0);
  const lastValueRef = useRef("");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!enabled) return null;

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY_COLOR} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.permIcon}>
          <CameraIcon size={28} color={PRIMARY_COLOR} />
        </View>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSubtitle}>
          Grant camera permission to scan booking QR codes.
        </Text>
        <TouchableOpacity
          style={styles.permBtn}
          activeOpacity={0.85}
          onPress={requestPermission}
        >
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = ({ data }) => {
    if (!data) return;
    const now = Date.now();
    // Same value scanned within 1.5s → ignore (prevents spam)
    if (data === lastValueRef.current && now - lastScanAtRef.current < 1500) return;
    lastScanAtRef.current = now;
    lastValueRef.current = data;
    onScan?.(data);
  };

  return (
    <View style={styles.wrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={handleScan}
      />

      {/* Overlay with green frame */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.hint}>Align QR code within the frame</Text>
      </View>
    </View>
  );
}

const FRAME = 240;
const CORNER = 28;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#000000",
    overflow: "hidden",
    borderRadius: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 24,
  },
  permIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: `${PRIMARY_COLOR}26`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  permTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  permSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  permBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  permBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: FRAME,
    height: FRAME,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: PRIMARY_COLOR,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  hint: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    textAlign: "center",
  },
});
