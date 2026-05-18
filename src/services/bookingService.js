import api from "../lib/axios";

const bookingService = {
  createBooking: async (data) => {
    const res = await api.post("/bookings", data);
    return res.data || {};
  },

  verifyPayment: async (data) => {
    const res = await api.post("/bookings/verify-payment", data);
    return res.data || {};
  },

  joinWaitlist: async (data) => {
    const res = await api.post("/waitlist", data);
    return res.data || {};
  },

  getMyBookings: async (params = {}) => {
    const res = await api.get("/bookings", { params });
    return res.data || {};
  },

  // Batch booking (multi-date)
  createBatchBooking: async (data) => {
    const res = await api.post("/bookings/batch", data);
    return res.data || {};
  },
};

export default bookingService;
