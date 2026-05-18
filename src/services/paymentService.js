import api from "../lib/axios";

const paymentService = {
  // Check if payment gateway is configured for venue
  gatewayInfo: async () => {
    const res = await api.get("/payment/gateway-info");
    return res.data || {};
  },

  // Create Cashfree order
  createOrder: async (data) => {
    const res = await api.post("/payments/create-order", data);
    return res.data || {};
  },

  // Set settlement hold after payment (replaces old createTransfers)
  setSettlementHold: async (data) => {
    const res = await api.post("/payments/set-settlement-hold", data);
    return res.data || {};
  },
};

export default paymentService;
