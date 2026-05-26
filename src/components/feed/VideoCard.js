import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 32;
const DEFAULT_ASPECT_RATIO = 4 / 5;

function VideoCard({
  source,
  width = CARD_WIDTH,
  muted,
  isVisible,
  onToggleMute,
}) {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [showVolumeBurst, setShowVolumeBurst] = useState(false);
  const volumeScale = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef(null);
  const readyRef = useRef(false);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (!showVolumeBurst) return undefined;

    volumeScale.setValue(0.45);
    Animated.sequence([
      Animated.spring(volumeScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 9,
        stiffness: 180,
      }),
      Animated.timing(volumeScale, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowVolumeBurst(false);
    });

    return undefined;
  }, [showVolumeBurst, volumeScale]);

  const cardHeight = useMemo(() => {
    const rawHeight = width / (aspectRatio || DEFAULT_ASPECT_RATIO);
    return Math.min(Math.max(rawHeight, 240), 560);
  }, [aspectRatio, width]);

  const handleToggle = () => {
    setShowVolumeBurst(true);
    onToggleMute?.();
  };

  useEffect(() => {
    readyRef.current = false;
    prevVisibleRef.current = false;
  }, [source]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data || "{}");
      if (data.type === "metadata" && data.width && data.height) {
        setAspectRatio(data.width / data.height);
      }
    } catch {
      /* silent – malformed WebView messages are expected during teardown */
    }
  };

  const syncPlaybackState = useMemo(
    () => () => {
      if (!webViewRef.current || !readyRef.current) return;

      if (prevVisibleRef.current !== isVisible) {
        const visibilityScript = isVisible
          ? `
          (function() {
            var video = document.getElementById('feedVideo');
            if (!video) return true;
            video.muted = ${muted ? "true" : "false"};
            video.play().catch(function(){});
            return true;
          })();
        `
        : `
          (function() {
            var video = document.getElementById('feedVideo');
            if (!video) return true;
            video.pause();
            return true;
          })();
        `;

        webViewRef.current.injectJavaScript(visibilityScript);
        prevVisibleRef.current = isVisible;
        return;
      }

      webViewRef.current.injectJavaScript(`
        (function() {
          var video = document.getElementById('feedVideo');
          if (!video) return true;
          video.muted = ${muted ? "true" : "false"};
          if (${isVisible ? "true" : "false"}) {
            video.play().catch(function(){});
          }
          return true;
        })();
      `);
    },
    [isVisible, muted]
  );

  useEffect(() => {
    syncPlaybackState();
  }, [syncPlaybackState]);

  const htmlSource = useMemo(
    () => ({
      html: `
        <!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            <style>
              html, body {
                margin: 0;
                padding: 0;
                background: #000;
                overflow: hidden;
                width: 100%;
                height: 100%;
              }
              video {
                width: 100%;
                height: 100%;
                object-fit: cover;
                background: #000;
              }
            </style>
          </head>
          <body>
            <video
              id="feedVideo"
              src="${source}"
              loop
              playsinline
              webkit-playsinline
              muted
            ></video>
            <script>
              const video = document.getElementById('feedVideo');
              const postMeta = () => {
                if (video.videoWidth && video.videoHeight) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'metadata',
                    width: video.videoWidth,
                    height: video.videoHeight
                  }));
                }
              };
              video.addEventListener('loadedmetadata', postMeta);
              video.addEventListener('canplay', postMeta);
            </script>
          </body>
        </html>
      `,
    }),
    [source]
  );

  return (
    <View style={[styles.container, { width, height: cardHeight }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["https://*", "http://*"]}
        style={styles.video}
        scrollEnabled={false}
        allowsFullscreenVideo
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        overScrollMode="never"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pointerEvents="none"
        onMessage={handleMessage}
        onLoadEnd={() => {
          readyRef.current = true;
          syncPlaybackState();
        }}
        source={htmlSource}
      />

      <TouchableOpacity activeOpacity={0.9} style={styles.muteButton} onPress={handleToggle}>
        <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#FFFFFF" />
      </TouchableOpacity>

      {showVolumeBurst ? (
        <Animated.View style={[styles.volumeBurst, { transform: [{ scale: volumeScale }] }]}>
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={64} color="#FFFFFF" />
        </Animated.View>
      ) : null}
    </View>
  );
}

export default React.memo(VideoCard);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    backgroundColor: "#000000",
  },
  video: {
    flex: 1,
    backgroundColor: "#000000",
  },
  muteButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  volumeBurst: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -32,
    marginTop: -32,
    zIndex: 5,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
