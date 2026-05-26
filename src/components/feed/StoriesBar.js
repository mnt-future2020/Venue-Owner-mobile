import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import { mediaUrl } from "../../utils/media";
import { useAuth } from "../../context/AuthContext";

const CREATE_ITEM = { id: "you", label: "Add Story", type: "create" };

const StoryItem = React.memo(function StoryItem({ story, onCreateStory, onOpenStory, currentUserId }) {
  const { user: authUser } = useAuth();
  const isOwn = story.user_id === currentUserId;
  const avatar = isOwn ? (authUser?.avatar ?? story.user_avatar) : story.user_avatar;
  if (story.type === "create") {
    return (
      <TouchableOpacity activeOpacity={0.85} style={styles.storyItem} onPress={onCreateStory}>
        <View style={styles.createRing}>
          <Ionicons name="add" size={24} color={PRIMARY_COLOR} />
        </View>
        <Text style={styles.storyLabel}>{story.label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.storyItem} onPress={() => onOpenStory?.(story)}>
      <View style={[styles.storyRing, story.has_unviewed ? styles.storyRingActive : styles.storyRingInactive]}>
        {avatar ? (
          <Image source={{ uri: mediaUrl(avatar) }} style={styles.storyAvatar} />
        ) : (
          <View style={[styles.storyAvatar, styles.storyAvatarFallback]}>
            <Ionicons name="person-outline" size={20} color="#64748B" />
          </View>
        )}
      </View>
      <Text style={styles.storyLabel}>
        {story.user_id === currentUserId ? "You" : story.user_name?.split(" ")?.[0] || "Story"}
      </Text>
    </TouchableOpacity>
  );
});

function StoriesBar({ stories = [], onCreateStory, onOpenStory, currentUserId }) {
  const data = useMemo(() => [CREATE_ITEM, ...stories], [stories]);
  const keyExtractor = (item, index) => String(item.id || item.user_id || `story-${index}`);
  const renderItem = ({ item }) => (
    <StoryItem story={item} onCreateStory={onCreateStory} onOpenStory={onOpenStory} currentUserId={currentUserId} />
  );

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      removeClippedSubviews
    />
  );
}

export default React.memo(StoriesBar);

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingRight: 10,
    paddingBottom: 10,
  },
  storyItem: {
    alignItems: "center",
    width: 72,
  },
  createRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#6EE7B7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  storyRingActive: {
    borderColor: PRIMARY_COLOR,
  },
  storyRingInactive: {
    borderColor: "#CBD5E1",
  },
  storyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  storyAvatarFallback: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  storyLabel: {
    marginTop: 7,
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
    textAlign: "center",
  },
});
