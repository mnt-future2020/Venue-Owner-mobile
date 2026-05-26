import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { ImageIcon, X } from "lucide-react-native";
import chatService from "../../services/chatService";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const GAP = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

const MediaGridItem = React.memo(function MediaGridItem({ item, onPress }) {
  const uri = mediaUrl(item.url || item.content || item.media_url || "");
  const handlePress = useCallback(() => onPress(uri), [onPress, uri]);

  return (
    <Pressable style={styles.gridItem} onPress={handlePress}>
      <Image
        source={{ uri }}
        style={styles.thumbnail}
        contentFit="cover"
      />
    </Pressable>
  );
});

export default function MediaGalleryModal({
  conversationId,
  isGroup,
  visible,
  onClose,
}) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullScreenUri, setFullScreenUri] = useState(null);

  useEffect(() => {
    if (visible && conversationId) {
      loadMedia();
    }
  }, [visible, conversationId]);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (isGroup) {
        data = await chatService.getGroupMedia(conversationId);
      } else {
        data = await chatService.getMediaGallery(conversationId);
      }
      const items = Array.isArray(data) ? data : data?.media || data?.items || [];
      setMedia(items);
    } catch (err) {
      console.error("Failed to load media:", err);
      setError("Failed to load media");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFullScreen = useCallback((uri) => {
    setFullScreenUri(uri);
  }, []);

  const renderItem = useCallback(({ item }) => (
    <MediaGridItem item={item} onPress={handleOpenFullScreen} />
  ), [handleOpenFullScreen]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <ImageIcon size={32} color="#D1D5DB" />
        <Text style={styles.emptyText}>No shared media</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Shared Media</Text>
          <Pressable onPress={onClose}>
            <X size={24} color="#111827" />
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={loadMedia}
              style={styles.retryBtn}
             
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={media}
            keyExtractor={(item) =>
              item._id || item.id || item.url || Math.random().toString()
            }
            renderItem={renderItem}
            estimatedItemSize={120}
            numColumns={NUM_COLUMNS}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              media.length === 0 ? styles.emptyList : styles.grid
            }
          />
        )}
      </SafeAreaView>

      {/* Full screen image viewer */}
      <Modal
        visible={!!fullScreenUri}
        animationType="fade"
        transparent
        onRequestClose={() => setFullScreenUri(null)}
      >
        <View style={styles.fullScreenOverlay}>
          <Pressable
            style={styles.fullScreenClose}
            onPress={() => setFullScreenUri(null)}
           
          >
            <X size={28} color="#FFFFFF" />
          </Pressable>
          {fullScreenUri && (
            <Image
              source={{ uri: fullScreenUri }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    padding: GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GAP / 2,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: "#E5E7EB",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  emptyList: {
    flexGrow: 1,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: PRIMARY_COLOR,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
