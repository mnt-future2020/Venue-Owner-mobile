import api from "../lib/axios";

const payoutService = {
  // Aggregated dashboard summary (totals + 4 settlement buckets)
  getSummary: async () => {
    const res = await api.get("/payouts/my-summary");
    return res.data || {};
  },

  // Backwards-compat
  getMySummary: async () => {
    const res = await api.get("/payouts/my-summary");
    return res.data || {};
  },

  // Linked bank account info
  getLinkedAccount: async () => {
    const res = await api.get("/payouts/linked-account");
    return res.data || null;
  },

  // Create linked account (Cashfree vendor)
  linkAccount: async (data) => {
    const res = await api.post("/payouts/linked-account", data);
    return res.data || {};
  },

  // Update bank fields
  updateLinkedAccount: async (data) => {
    const res = await api.put("/payouts/linked-account", data);
    return res.data || {};
  },

  // Delete linked account (password-gated)
  deleteLinkedAccount: async (password) => {
    const res = await api.delete("/payouts/linked-account", { data: { password } });
    return res.data || {};
  },

  // Sync vendor status from Cashfree (when webhook missed)
  syncVendorStatus: async () => {
    const res = await api.post("/payouts/linked-account/sync-vendor");
    return res.data || {};
  },

  // Sync settlement status for all recent settlements
  syncSettlements: async () => {
    const res = await api.post("/payouts/sync-settlements");
    return res.data || {};
  },

  // Detailed settlement history
  getHistory: async (params = {}) => {
    const res = await api.get("/payouts/history", { params });
    return res.data || [];
  },

  // Owner transactions (per-booking ledger with CF fees + UTR)
  getTransactions: async (params = {}) => {
    const res = await api.get("/payouts/transactions", { params });
    return res.data || {};
  },

  // Per-owner payout history list (paginated)
  getMyPayouts: async (params = {}) => {
    const res = await api.get("/payouts/my-payouts", { params });
    return res.data || { settlements: [], page: 1, pages: 1, total: 0 };
  },
};

export default payoutService;
