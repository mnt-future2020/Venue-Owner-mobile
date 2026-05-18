import api from "../lib/axios";

const liveScoreService = {
  // Start live scoring for a match
  start: async (data) => {
    const res = await api.post("/live/start", data);
    return res.data || {};
  },

  // Get all active live matches
  getActive: async () => {
    const res = await api.get("/live/active");
    return res.data || [];
  },

  // Get live match state
  get: async (id) => {
    const res = await api.get(`/live/${id}`);
    return res.data || {};
  },

  // Update score
  updateScore: async (id, data) => {
    const res = await api.post(`/live/${id}/score`, data);
    return res.data || {};
  },

  // Log match event (goal, card, substitution, etc.)
  addEvent: async (id, data) => {
    const res = await api.post(`/live/${id}/event`, data);
    return res.data || {};
  },

  // Change period (half-time, quarters, etc.)
  changePeriod: async (id, data) => {
    const res = await api.post(`/live/${id}/period`, data);
    return res.data || {};
  },

  // Pause match
  pause: async (id) => {
    const res = await api.post(`/live/${id}/pause`);
    return res.data || {};
  },

  // End match
  end: async (id) => {
    const res = await api.post(`/live/${id}/end`);
    return res.data || {};
  },
};

export default liveScoreService;
