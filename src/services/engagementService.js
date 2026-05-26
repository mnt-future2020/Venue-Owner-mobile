import api from "../lib/axios";

// Real implementation (matches mobile player app) — venue owners now have
// Feed + Chat, so engagement score IS relevant for them. The earlier stub
// (returning null) hid the Engagement card on the venue Stats tab even
// though the backend was returning a valid score.
const engagementService = {
  getMyEngagement: async () => {
    const res = await api.get("/engagement/me");
    return res.data || null;
  },

  getEngagementScore: async (userId) => {
    const res = await api.get(`/engagement/score/${userId}`);
    return res.data || null;
  },

  getSuggestedFollows: async () => {
    const res = await api.get("/engagement/suggested-follows");
    return res.data || [];
  },

  getCompatibility: async (userId) => {
    const res = await api.get(`/compatibility/${userId}`);
    return res.data || null;
  },
};

export default engagementService;
