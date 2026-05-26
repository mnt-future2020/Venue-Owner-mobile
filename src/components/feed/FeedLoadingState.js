// Replaces the previous ActivityIndicator spinner with a skeleton placeholder
// that mirrors the structure of the rendered feed (frontend SkeletonLoader.FeedSkeleton).
import FeedSkeleton from "../skeletons/FeedSkeleton";

export default function FeedLoadingState({ topOffset = 0 }) {
  return <FeedSkeleton topOffset={topOffset} />;
}
