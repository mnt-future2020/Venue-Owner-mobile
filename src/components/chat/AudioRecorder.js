import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { Mic, Square, Trash2, Send } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorder({ onSend, onCancel }) {
  const [recording, setRecording] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing red dot animation
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const { Audio } = require("expo-av");
      const { requestPermission } = require("../../utils/permissions");
      const granted = await requestPermission(
        () => Audio.requestPermissionsAsync(),
        "Microphone"
      );
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopAndSend = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        onSend?.({ uri, duration });
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
    }
  };

  const discard = async () => {
    if (recording) {
      try {
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
      } catch (err) {
        // ignore
      }
      setRecording(null);
    }
    setDuration(0);
    onCancel?.();
  };

  // Auto-start on mount
  useEffect(() => {
    startRecording();
    return () => {
      // cleanup on unmount
      if (recording) {
        try {
          recording.stopAndUnloadAsync();
        } catch (_) {}
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Pulsing red dot + timer */}
      <View style={styles.leftSection}>
        <Animated.View style={[styles.redDot, { opacity: pulseAnim }]} />
        <Text style={styles.timer}>{formatDuration(duration)}</Text>
      </View>

      {/* Recording label */}
      <Text style={styles.recordingLabel}>Recording...</Text>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Discard */}
        <Pressable
          onPress={discard}
          style={styles.discardBtn}
         
        >
          <Trash2 size={20} color="#EF4444" />
        </Pressable>

        {/* Send */}
        <Pressable
          onPress={stopAndSend}
          style={styles.sendBtn}
         
        >
          <Send size={16} color="#FFFFFF" style={{ marginLeft: 1 }} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderCurve: "continuous",
    backgroundColor: "#EF4444",
  },
  timer: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  recordingLabel: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discardBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
});
