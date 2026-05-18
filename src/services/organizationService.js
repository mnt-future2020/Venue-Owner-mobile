import api from "../lib/axios";

const organizationService = {
  // Create an organization
  create: async (data) => {
    const res = await api.post("/organizations", data);
    return res.data || {};
  },

  // List all organizations
  list: async (params = {}) => {
    const res = await api.get("/organizations", { params });
    return res.data || [];
  },

  // Get current user's organizations
  my: async () => {
    const res = await api.get("/organizations/my");
    return res.data || [];
  },

  // Get organization details
  get: async (id) => {
    const res = await api.get(`/organizations/${id}`);
    return res.data || {};
  },

  // Update an organization
  update: async (id, data) => {
    const res = await api.put(`/organizations/${id}`, data);
    return res.data || {};
  },

  // Add staff to organization
  addStaff: async (orgId, data) => {
    const res = await api.post(`/organizations/${orgId}/staff`, data);
    return res.data || {};
  },

  // Remove staff
  removeStaff: async (orgId, staffUserId) => {
    const res = await api.delete(`/organizations/${orgId}/staff/${staffUserId}`);
    return res.data || {};
  },

  // Add players
  addPlayer: async (orgId, data) => {
    const res = await api.post(`/organizations/${orgId}/players`, data);
    return res.data || {};
  },

  // Remove player
  removePlayer: async (orgId, playerUserId) => {
    const res = await api.delete(`/organizations/${orgId}/players/${playerUserId}`);
    return res.data || {};
  },

  // Get organization dashboard
  dashboard: async (orgId) => {
    const res = await api.get(`/organizations/${orgId}/dashboard`);
    return res.data || {};
  },
};

export default organizationService;
