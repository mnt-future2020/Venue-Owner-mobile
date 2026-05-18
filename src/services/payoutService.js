import api from "../lib/axios";

const payoutService = {
  // GET /payouts/summary
  getSummary: async () => {
    const res = await api.get("/payouts/summary");
    return res.data || {};
  },

  // GET /payouts/linked-account
  getLinkedAccount: async () => {
    const res = await api.get("/payouts/linked-account");
    return res.data || null;
  },

  // POST /payouts/linked-account — single-step Cashfree vendor creation
  linkAccount: async (data) => {
    const res = await api.post("/payouts/linked-account", data);
    return res.data || {};
  },

  // POST /payouts/linked-account/sync-vendor — sync status from Cashfree
  syncVendorStatus: async () => {
    const res = await api.post("/payouts/linked-account/sync-vendor");
    return res.data || {};
  },

  // GET /payouts/history
  getHistory: async (params = {}) => {
    const res = await api.get("/payouts/history", { params });
    return res.data || [];
  },
};

export default payoutService;
