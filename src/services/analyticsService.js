import api from "../lib/axios";

const analyticsService = {
  getPlayerAnalytics: async (params = {}) => {
    const res = await api.get("/analytics/player", { params });
    return res.data || {};
  },

  getPlayerCareer: async (playerId) => {
    const res = await api.get(`/analytics/player/${playerId}/career`);
    return res.data || {};
  },

  getPlayerOverallScore: async (playerId) => {
    const res = await api.get(`/analytics/player/${playerId}/overall-score`);
    return res.data || {};
  },
};

export default analyticsService;
