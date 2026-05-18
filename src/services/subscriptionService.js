import api from "../lib/axios";

const subscriptionService = {
  // Get current subscription plan
  myPlan: async () => {
    const res = await api.get("/subscription/my-plan");
    return res.data || {};
  },

  // Upgrade subscription plan
  upgrade: async (data) => {
    const res = await api.put("/subscription/upgrade", data);
    return res.data || {};
  },

  // Report a payment failure
  reportPaymentFailure: async (data) => {
    const res = await api.post("/subscription/payment-failed", data);
    return res.data || {};
  },

  // Resolve a payment issue
  resolvePayment: async (data) => {
    const res = await api.post("/subscription/resolve-payment", data);
    return res.data || {};
  },

  // Get dunning status (payment retry info)
  dunningStatus: async () => {
    const res = await api.get("/subscription/dunning-status");
    return res.data || {};
  },
};

export default subscriptionService;
