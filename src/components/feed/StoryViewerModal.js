import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";

const STORY_DURATION = 5000;

export default function StoryViewerModal({
  visible,
  storyGroups = [],
  initialGroup,
  onClose,
  onViewStory,
  onReactStory: _onReactStory,
  onDeleteStory,
}) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const goNextRef = useRef(null);

  useEffect(() => {
    if (!visible || !initialGroup) return;
    const index = storyGroups.findIndex((item) => item.user_id === initialGroup.user_id);
    setGroupIndex(index >= 0 ? index : 0);
    setStoryIndex(0);
    setProgress(0);
  }, [initialGroup, storyGroups, visible]);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories?.[storyIndex];
  const isOwnStory = currentGroup?.user_id === user?.id;

  const progressSegments = useMemo(() => currentGroup?.stories || [], [currentGroup]);

  useEffect(() => {
    const nearbyStories = [
      currentGroup?.stories?.[storyIndex],
      currentGroup?.stories?.[storyIndex + 1],
      storyGroups[groupIndex + 1]?.stories?.[0],
    ].filter(Boolean);

    nearbyStories.forEach((story) => {
      if (story?.media_url) {
        Image.prefetch?.(mediaUrl(story.media_url), "memory-disk").catch(() => {});
      }
    });
  }, [currentGroup, groupIndex, storyGroups, storyIndex]);

  const goNext = () => {
    if (!currentGroup) return onClose?.();
    if (storyIndex + 1 < (currentGroup.stories?.length || 0)) {
      setStoryIndex((prev) => prev + 1);
      return;
    }
    if (groupIndex + 1 < storyGroups.length) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      return;
    }
    onClose?.();
  };
  goNextRef.current = goNext;

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(Math.max((prevGroup?.stories?.length || 1) - 1, 0));
    }
  };

  useEffect(() => {
    if (!visible || !currentStory?.id) return;

    onViewStory?.(currentStory.id);
    setProgress(0);

    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);

    const started = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - started;
      setProgress(Math.min(elapsed / STORY_DURATION, 1));
    }, 50);

    timerRef.current = setTimeout(() => {
      goNextRef.current?.();
    }, STORY_DURATION);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [currentStory?.id, onViewStory, visible]);

  if (!currentStory) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topRow}>
          <View style={styles.progressRow}>
            {progressSegments.map((story, index) => (
              <View key={story.id} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        index < storyIndex
                          ? "100%"
                          : index === storyIndex
                            ? `${progress * 100}%`
                            : "0%",
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.85}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.userBlock}>
            {currentGroup?.user_avatar ? (
              <Image source={{ uri: mediaUrl(currentGroup.user_avatar) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person-outline" size={16} color="#FFFFFF" />
              </View>
            )}
            <View>
              <Text style={styles.userName}>{currentGroup?.user_name || "Story"}</Text>
              <Text style={styles.userMeta}>
                {isOwnStory ? "Your story" : "24h story"} • {currentStory.view_count || 0} views
              </Text>
            </View>
          </View>
          {isOwnStory ? (
            <TouchableOpacity
              onPress={() => onDeleteStory?.(currentStory.id)}
              style={styles.deleteButton}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.storyCard, { backgroundColor: currentStory.bg_color || "#059669" }]}>
          {currentStory.media_url ? (
            <Image
              source={{ uri: mediaUrl(currentStory.media_url) }}
              style={styles.storyImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : null}
          {currentStory.content ? <Text style={styles.storyContent}>{currentStory.content}</Text> : null}
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navZone} onPress={goPrev} />
          <Pressable style={styles.navZone} onPress={goNext} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#03120D",
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  progressRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  header: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  storyCard: {
    flex: 1,
    marginTop: 18,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  storyImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyContent: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    zIndex: 1,
  },
  navRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    top: 100,
    bottom: 90,
    left: 0,
    right: 0,
  },
  navZone: {
    flex: 1,
  },
});
