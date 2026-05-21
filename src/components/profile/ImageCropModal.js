import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Check, RotateCw, X } from "lucide-react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { PRIMARY_COLOR } from "../../constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const CROP_SIZE = SCREEN_W - 64;
const MAX_ZOOM = 5;

export default function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  onDone,
  onClose,
}) {
  const [processing, setProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);

  const imgW = imageWidth || 1;
  const imgH = imageHeight || 1;
  const imgWRef = useRef(imgW);
  const imgHRef = useRef(imgH);
  imgWRef.current = imgW;
  imgHRef.current = imgH;

  const rotRef = useRef(0);

  const getMinScale = (rot) => {
    const isR = rot % 180 !== 0;
    const w = isR ? imgHRef.current : imgWRef.current;
    const h = isR ? imgWRef.current : imgHRef.current;
    return CROP_SIZE / Math.min(w, h);
  };

  // ── Refs only — no Animated for pan (direct setValue = fastest, no bridge overhead) ──
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const txStart = useRef(0);
  const tyStart = useRef(0);
  const scaleRef = useRef(1);
  const scaleStart = useRef(1);
  const lastDist = useRef(0);
  const isPinching = useRef(false);
  const minScaleRef = useRef(1);

  // Single Animated.Value for triggering re-render of image position
  const animTx = useRef(new Animated.Value(0)).current;
  const animTy = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;

  const clampPan = (ox, oy, s) => {
    const rot = rotRef.current;
    const isR = rot % 180 !== 0;
    const w = isR ? imgHRef.current : imgWRef.current;
    const h = isR ? imgWRef.current : imgHRef.current;
    const ms = minScaleRef.current;
    const dw = w * ms * s;
    const dh = h * ms * s;
    const maxX = Math.max(0, (dw - CROP_SIZE) / 2);
    const maxY = Math.max(0, (dh - CROP_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, ox)),
      y: Math.min(maxY, Math.max(-maxY, oy)),
    };
  };

  const getDist = (t) => {
    const dx = t[0].pageX - t[1].pageX;
    const dy = t[0].pageY - t[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const syncAnim = (tx, ty, s) => {
    animTx.setValue(tx);
    animTy.setValue(ty);
    animScale.setValue(s);
  };

  useEffect(() => {
    if (visible) {
      const ms = getMinScale(0);
      minScaleRef.current = ms;
      rotRef.current = 0;
      setRotation(0);
      txRef.current = 0;
      tyRef.current = 0;
      scaleRef.current = 1;
      isPinching.current = false;
      lastDist.current = 0;
      syncAnim(0, 0, 1);
    }
  }, [visible, imageUri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        txStart.current = txRef.current;
        tyStart.current = tyRef.current;
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          isPinching.current = true;
          lastDist.current = getDist(touches);
          scaleStart.current = scaleRef.current;
        } else {
          isPinching.current = false;
          lastDist.current = 0;
        }
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;

        if (touches && touches.length >= 2) {
          // ── Pinch ──
          isPinching.current = true;
          const d = getDist(touches);
          if (lastDist.current === 0) {
            lastDist.current = d;
            scaleStart.current = scaleRef.current;
            return;
          }
          const ns = Math.max(1, Math.min(MAX_ZOOM, scaleStart.current * (d / lastDist.current)));
          scaleRef.current = ns;
          const c = clampPan(txRef.current, tyRef.current, ns);
          txRef.current = c.x;
          tyRef.current = c.y;
          syncAnim(c.x, c.y, ns);
        } else if (!isPinching.current) {
          // ── Pan ──
          const rx = txStart.current + gs.dx;
          const ry = tyStart.current + gs.dy;
          const c = clampPan(rx, ry, scaleRef.current);
          txRef.current = c.x;
          tyRef.current = c.y;
          syncAnim(c.x, c.y, scaleRef.current);
        }
      },

      onPanResponderRelease: () => {
        isPinching.current = false;
        lastDist.current = 0;
        scaleStart.current = scaleRef.current;
        txStart.current = txRef.current;
        tyStart.current = tyRef.current;
      },
    }),
  ).current;

  const handleRotate = () => {
    const nr = (rotRef.current + 90) % 360;
    rotRef.current = nr;
    setRotation(nr);
    minScaleRef.current = getMinScale(nr);
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    syncAnim(0, 0, 1);
  };

  const handleCrop = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const totalScale = minScaleRef.current * scaleRef.current;
      const rot = rotRef.current;
      const isR = rot % 180 !== 0;
      const effW = isR ? imgH : imgW;
      const effH = isR ? imgW : imgH;

      const cropDim = CROP_SIZE / totalScale;
      const cx = effW / 2 - txRef.current / totalScale;
      const cy = effH / 2 - tyRef.current / totalScale;
      const cropX = Math.max(0, cx - cropDim / 2);
      const cropY = Math.max(0, cy - cropDim / 2);

      const actions = [];
      if (rot > 0) actions.push({ rotate: rot });
      actions.push({
        crop: {
          originX: Math.round(cropX),
          originY: Math.round(cropY),
          width: Math.max(1, Math.round(Math.min(cropDim, effW - cropX))),
          height: Math.max(1, Math.round(Math.min(cropDim, effH - cropY))),
        },
      });
      actions.push({ resize: { width: 600 } });

      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      onDone({ uri: result.uri, width: result.width, height: result.height });
    } catch (err) {
      console.error("Crop error:", err);
      onDone({ uri: imageUri, width: imgW, height: imgH });
    } finally {
      setProcessing(false);
    }
  };

  const ms = getMinScale(rotation);
  const dw = imgW * ms;
  const dh = imgH * ms;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={onClose} style={styles.toolBtn} activeOpacity={0.7}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Crop Photo</Text>
            <TouchableOpacity onPress={handleRotate} style={styles.toolBtn} activeOpacity={0.7}>
              <RotateCw size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Crop circle — only touch target, no overlay */}
          <View style={styles.centerWrap}>
            <View style={styles.cropCircle} {...panResponder.panHandlers}>
              <Animated.View
                style={{
                  width: dw,
                  height: dh,
                  transform: [
                    { translateX: animTx },
                    { translateY: animTy },
                    { scale: animScale },
                    { rotate: `${rotation}deg` },
                  ],
                }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: dw, height: dh }}
                  contentFit="fill"
                />
              </Animated.View>
            </View>

            {/* Border + grid (no touch, just visual) */}
            <View style={styles.guideCircle} pointerEvents="none">
              <View style={[styles.gridH, { top: "33.33%" }]} />
              <View style={[styles.gridH, { top: "66.66%" }]} />
              <View style={[styles.gridV, { left: "33.33%" }]} />
              <View style={[styles.gridV, { left: "66.66%" }]} />
            </View>
          </View>

          <Text style={styles.hint}>Drag to reposition, pinch to zoom</Text>

          {/* Bottom */}
          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={onClose} style={styles.bottomBtn} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCrop}
              style={[styles.doneBtn, processing && { opacity: 0.6 }]}
              activeOpacity={0.85}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.doneText}>Done</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  safeArea: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cropCircle: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  guideCircle: {
    position: "absolute",
    width: CROP_SIZE + 2,
    height: CROP_SIZE + 2,
    borderRadius: (CROP_SIZE + 2) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 12,
    marginBottom: 8,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  doneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
