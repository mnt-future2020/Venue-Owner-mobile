import { Redirect } from "expo-router";
import { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useAuthLoading } from "../context/AuthContext";
import { PRIMARY_COLOR } from "../constants/theme";

const SPLASH_DURATION_MS = 2000;

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [gifLoaded, setGifLoaded] = useState(false);
  const { user, logout } = useAuth();
  const loading = useAuthLoading();

  useEffect(() => {
    const preloadGif = async () => {
      try {
        await Image.prefetch(require("../../assets/splashscreen.gif"));
      } catch {}
      setGifLoaded(true);
    };
    preloadGif();
  }, []);

  // Preload feed data while splash plays — matches mobile/src/app/index.js exactly.
  useEffect(() => {
    if (!gifLoaded || !user) return;
    const preloadFeedData = async () => {
      try {
        const { default: feedService } = await import("../services/feedService");
        const { default: cacheService } = await import("../services/cacheService");

        const [feedData, storiesData, engagementData, suggestedData] = await Promise.all([
          feedService.getFeed("for_you").catch(() => ({ posts: [], cursor: null, has_more: false })),
          feedService.getStories().catch(() => []),
          feedService.getMyEngagement().catch(() => null),
          Promise.all([
            feedService.getSuggestedFollows().catch(() => []),
            feedService.getRecommendedPlayers(10).catch(() => []),
          ]).then(([suggestedFollows, recommendedPlayers]) =>
            recommendedPlayers?.length ? recommendedPlayers : suggestedFollows
          ).catch(() => []),
        ]);

        cacheService.setFeedData("for_you", feedData);
        cacheService.setStories(storiesData);
        cacheService.setEngagement(engagementData);
        cacheService.setSuggested(suggestedData);
        cacheService.setReady(true);
        if (typeof cacheService.setPreloaded === "function") {
          cacheService.setPreloaded(true);
        }
      } catch {}
    };
    preloadFeedData();
  }, [gifLoaded, user]);

  useEffect(() => {
    if (gifLoaded) {
      const t = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [gifLoaded]);

  if (showSplash) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {gifLoaded ? (
          <Image
            source={require("../../assets/splashscreen.gif")}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey="splash-gif"
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loading} edges={["top", "bottom"]}>
        <View style={styles.loadingInner}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  // Wrong role lands here only if a non-owner token survived in storage
  if (user && user.role && user.role !== "venue_owner") {
    logout();
    return <Redirect href="/(auth)/login" />;
  }

  return user ? <Redirect href="/(tabs)/feed" /> : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
