// Global cache service for sharing data between splash screen and feed screen
class CacheService {
  constructor() {
    this.cache = {
      feed: {
        for_you: { posts: [], cursor: null, hasMore: false },
        following: { posts: [], cursor: null, hasMore: false },
      },
      stories: [],
      engagement: null,
      suggested: [],
      ready: false,
      preloaded: false,
    };
  }

  // Set feed data
  setFeedData(tab, data) {
    if (this.cache.feed[tab]) {
      this.cache.feed[tab] = {
        posts: data.posts || [],
        cursor: data.next_cursor || null,
        hasMore: !!data.has_more,
      };
    }
  }

  // Get feed data
  getFeedData(tab) {
    return this.cache.feed[tab] || { posts: [], cursor: null, hasMore: false };
  }

  // Set other data
  setStories(stories) {
    this.cache.stories = stories || [];
  }

  setEngagement(engagement) {
    this.cache.engagement = engagement;
  }

  setSuggested(suggested) {
    this.cache.suggested = suggested || [];
  }

  // Get other data
  getStories() {
    return this.cache.stories;
  }

  getEngagement() {
    return this.cache.engagement;
  }

  getSuggested() {
    return this.cache.suggested;
  }

  // Cache status
  setReady(ready = true) {
    this.cache.ready = ready;
  }

  setPreloaded(preloaded = true) {
    this.cache.preloaded = preloaded;
  }

  isReady() {
    return this.cache.ready;
  }

  isPreloaded() {
    return this.cache.preloaded;
  }

  // Clear cache
  clear() {
    this.cache = {
      feed: {
        for_you: { posts: [], cursor: null, hasMore: false },
        following: { posts: [], cursor: null, hasMore: false },
      },
      stories: [],
      engagement: null,
      suggested: [],
      ready: false,
      preloaded: false,
    };
  }

  // Get all cached data
  getAllData() {
    return {
      feedData: this.cache.feed,
      stories: this.cache.stories,
      engagement: this.cache.engagement,
      suggested: this.cache.suggested,
      ready: this.cache.ready,
      preloaded: this.cache.preloaded,
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;