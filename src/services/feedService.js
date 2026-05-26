import api from "../lib/axios";

const feedService = {
  getFeed: async (tab = "for_you", before = null) => {
    const res = await api.get("/feed", {
      params: before ? { tab, before } : { tab },
    });
    return res.data || {};
  },

  getPost: async (postId) => {
    const res = await api.get(`/feed/${postId}`);
    return res.data || {};
  },

  getStories: async () => {
    const res = await api.get("/stories");
    return res.data || [];
  },

  createStory: async (payload) => {
    const res = await api.post("/stories", payload);
    return res.data || {};
  },

  viewStory: async (storyId) => {
    const res = await api.post(`/stories/${storyId}/view`);
    return res.data || {};
  },

  reactStory: async (storyId, emoji) => {
    const res = await api.post(`/stories/${storyId}/react`, { emoji });
    return res.data || {};
  },

  reactToStory: async (storyId, reaction) => {
    const res = await api.post(`/stories/${storyId}/react`, { reaction });
    return res.data || {};
  },

  deleteStory: async (storyId) => {
    const res = await api.delete(`/stories/${storyId}`);
    return res.data || {};
  },

  getMyEngagement: async () => {
    const res = await api.get("/engagement/me");
    return res.data || null;
  },

  getSuggestedFollows: async () => {
    const res = await api.get("/engagement/suggested-follows");
    return res.data || [];
  },

  getRecommendedPlayers: async (limit = 10) => {
    const res = await api.get("/recommendations/players", { params: { limit } });
    return res.data?.players || [];
  },

  createPost: async (payload) => {
    const res = await api.post("/feed", payload);
    return res.data || {};
  },

  toggleLike: async (postId) => {
    const res = await api.post(`/feed/${postId}/like`);
    return res.data || {};
  },

  react: async (postId, emoji) => {
    const res = await api.post(`/feed/${postId}/react`, { emoji });
    return res.data || {};
  },

  reactToPost: async (postId, reaction) => {
    const res = await api.post(`/feed/${postId}/react`, { reaction });
    return res.data || {};
  },

  toggleBookmark: async (postId) => {
    const res = await api.post(`/feed/${postId}/bookmark`);
    return res.data || {};
  },

  getBookmarks: async (before = null) => {
    const res = await api.get("/feed/bookmarks", {
      params: before ? { before } : {},
    });
    return res.data || {};
  },

  getComments: async (postId, after = null) => {
    const res = await api.get(`/feed/${postId}/comments`, {
      params: after ? { after } : {},
    });
    return res.data || {};
  },

  addComment: async (postId, payload) => {
    const res = await api.post(`/feed/${postId}/comment`, payload);
    return res.data || {};
  },

  toggleFollow: async (userId) => {
    const res = await api.post(`/follow/${userId}`);
    return res.data || {};
  },

  followStatus: async (userId) => {
    const res = await api.get(`/follow/status/${userId}`);
    return res.data || {};
  },

  getFollowers: async (userId, after = null) => {
    const res = await api.get(`/followers/${userId}`, {
      params: after ? { after } : {},
    });
    return res.data || {};
  },

  getFollowing: async (userId, after = null) => {
    const res = await api.get(`/following/${userId}`, {
      params: after ? { after } : {},
    });
    return res.data || {};
  },

  deletePost: async (postId) => {
    const res = await api.delete(`/feed/${postId}`);
    return res.data || {};
  },

  getUserPosts: async (userId, before = null) => {
    const res = await api.get(`/feed/user/${userId}`, {
      params: before ? { before } : {},
    });
    return res.data || {};
  },

  engagementScore: async () => {
    const res = await api.get("/engagement/score");
    return res.data || {};
  },

  userEngagement: async (userId) => {
    const res = await api.get(`/engagement/score/${userId}`);
    return res.data || {};
  },

  trending: async () => {
    const res = await api.get("/feed/trending");
    return res.data || {};
  },

  getTrending: async (cursor, limit = 10) => {
    const res = await api.get("/feed/trending", { params: { cursor, limit } });
    return res.data || {};
  },

  explore: async (query) => {
    const res = await api.get("/explore", { params: { q: query } });
    return res.data || {};
  },

  // Search posts by text
  searchPosts: async (query, page = 1) => {
    const res = await api.get("/explore", { params: { q: query, page } });
    return {
      posts: res.data?.posts || [],
      users: res.data?.users || [],
      venues: res.data?.venues || [],
    };
  },
};

export default feedService;
