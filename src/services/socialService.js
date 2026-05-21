import api from "../lib/axios";

// Backed by the same backend routes the mobile player app uses. Followers
// and following work across roles — players can follow venue owners and
// vice versa.
const socialService = {
  toggleFollow: async (userId) => {
    const res = await api.post(`/follow/${userId}`);
    return res.data || {};
  },

  getFollowStatus: async (userId) => {
    const res = await api.get(`/follow/status/${userId}`);
    return res.data || {};
  },

  getFollowers: async (userId, after = null, limit = 20) => {
    const params = after ? { after, limit } : { limit };
    const res = await api.get(`/followers/${userId}`, { params });
    return res.data || {};
  },

  getFollowing: async (userId, after = null, limit = 20) => {
    const params = after ? { after, limit } : { limit };
    const res = await api.get(`/following/${userId}`, { params });
    return res.data || {};
  },

  getUserPosts: async (userId, before = null) => {
    const params = before ? { before } : {};
    const res = await api.get(`/feed/user/${userId}`, { params });
    return res.data || {};
  },

  deletePost: async (postId) => {
    const res = await api.delete(`/feed/${postId}`);
    return res.data || {};
  },

  shareProfile: async (userId) => {
    return { url: `https://lobbi.app/player/${userId}` };
  },

  searchUsers: async (query) => {
    const res = await api.get("/users/search", { params: { q: query } });
    return res.data || [];
  },
};

export default socialService;
