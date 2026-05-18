import api from "../lib/axios";

const performanceService = {
  // Create a performance record
  create: async (data) => {
    const res = await api.post("/performance/records", data);
    return res.data || {};
  },

  // Bulk create performance records
  createBulk: async (data) => {
    const res = await api.post("/performance/records/bulk", data);
    return res.data || {};
  },

  // Get performance records for a player
  getPlayerRecords: async (playerId, params = {}) => {
    const res = await api.get(`/performance/records/${playerId}`, { params });
    return res.data || [];
  },

  // Get performance summary for a player
  getPlayerSummary: async (playerId) => {
    const res = await api.get(`/performance/records/${playerId}/summary`);
    return res.data || {};
  },

  // Get own performance records
  myRecords: async (params = {}) => {
    const res = await api.get("/performance/my-records", { params });
    return res.data || [];
  },

  // Delete a performance record
  delete: async (recordId) => {
    const res = await api.delete(`/performance/records/${recordId}`);
    return res.data || {};
  },
};

export default performanceService;
