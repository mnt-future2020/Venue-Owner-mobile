import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BORDER_COLOR, ERROR_COLOR, NEUTRAL_COLOR, PRIMARY_COLOR, WARNING_COLOR } from "../constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CustomToast({ visible, type, message, description, onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-18)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.78)).current;
  const scaleX = useRef(new Animated.Value(0.14)).current;
  const contentOpacity = useRef(new Animated.Value(0.18)).current;
  const contentTranslateY = useRef(new Animated.Value(-4)).current;
  const hideTimerRef = useRef(null);

  const dismissToast = (direction) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    if (direction === "left" || direction === "right") {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: direction === "right" ? 420 : -420,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: -3,
          duration: 90,
          useNativeDriver: true,
        }),
      ]).start(() => onHide?.());
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -14,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.86,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleX, {
        toValue: 0.24,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: -2,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => onHide?.());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 84) {
          dismissToast(g.dx > 0 ? "right" : "left");
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 240,
            mass: 0.8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!visible) return undefined;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    translateY.setValue(-18);
    translateX.setValue(0);
    opacity.setValue(0);
    scale.setValue(0.78);
    scaleX.setValue(0.14);
    contentOpacity.setValue(0.18);
    contentTranslateY.setValue(-4);

    Animated.parallel([
      Animated.spring(scaleX, {
        toValue: 1,
        useNativeDriver: true,
        damping: 17,
        stiffness: 240,
        mass: 0.8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 17,
        stiffness: 240,
        mass: 0.82,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 19,
        stiffness: 240,
        mass: 0.82,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();

    hideTimerRef.current = setTimeout(() => {
      dismissToast("up");
    }, type === "error" ? 4200 : 3000);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [contentOpacity, contentTranslateY, description, message, opacity, scale, scaleX, translateX, translateY, type, visible]);

  const config = useMemo(() => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          tint: PRIMARY_COLOR,
          chipBg: "rgba(5,150,105,0.12)",
        };
      case "error":
        return {
          icon: "close-circle",
          tint: ERROR_COLOR,
          chipBg: "rgba(239,68,68,0.12)",
        };
      case "warning":
        return {
          icon: "warning",
          tint: WARNING_COLOR,
          chipBg: "rgba(245,158,11,0.12)",
        };
      case "info":
      default:
        return {
          icon: "information-circle",
          tint: PRIMARY_COLOR,
          chipBg: "rgba(5,150,105,0.12)",
        };
    }
  }, [type]);

  if (!visible) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          top: insets.top + 8,
          transform: [{ translateY }, { translateX }, { scaleX }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.96} onPress={() => dismissToast("up")} style={styles.touchWrap}>
        <View style={styles.toastCard}>
          <Animated.View
            style={[
              styles.innerContent,
              { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
            ]}
          >
            <View style={[styles.iconChip, { backgroundColor: config.chipBg }]}>
              <Ionicons name={config.icon} size={18} color={config.tint} />
            </View>
            <View style={styles.copyWrap}>
              <Text style={styles.message} numberOfLines={description ? 1 : 2}>
                {message}
              </Text>
              {description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {description}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
  },
  touchWrap: {
    width: Math.min(SCREEN_WIDTH - 28, 360),
  },
  toastCard: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    overflow: "hidden",
  },
  innerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  description: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    color: NEUTRAL_COLOR,
  },
});
