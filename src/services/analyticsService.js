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

  // ── Owner / venue analytics ─────────────────────────────
  getVenueAnalytics: async (venueId, params = {}) => {
    const res = await api.get(`/analytics/venue/${venueId}`, { params });
    return res.data || {};
  },

  getFinanceSummary: async (params = {}) => {
    const res = await api.get(`/venue-finance/analytics/finance-summary`, { params });
    return res.data || {};
  },
};

export default analyticsService;
