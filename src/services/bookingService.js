import api from "../lib/axios";

const bookingService = {
  // List bookings (owner sees their venue bookings, player sees own)
  list: async (params = {}) => {
    const res = await api.get("/bookings", { params });
    return res.data || {};
  },

  // Get a single booking detail
  get: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}`);
    return res.data || null;
  },

  // Create booking (online or walk_in via booking_type field)
  createBooking: async (data) => {
    const res = await api.post("/bookings", data);
    return res.data || {};
  },

  // Verify Cashfree payment after gateway return
  verifyPayment: async (data) => {
    const res = await api.post("/bookings/verify-payment", data);
    return res.data || {};
  },

  // Cancel a booking (owner can cancel walk-ins; host can cancel theirs)
  cancel: async (bookingId) => {
    const res = await api.post(`/bookings/${bookingId}/cancel`);
    return res.data || {};
  },

  // Collect remaining payment on walk-in advance bookings
  collectRemaining: async (bookingId, method) => {
    const res = await api.post(`/bookings/${bookingId}/collect-remaining`, { method });
    return res.data || {};
  },

  // Waitlist
  joinWaitlist: async (data) => {
    const res = await api.post("/waitlist", data);
    return res.data || {};
  },

  // Batch booking (multi-date)
  createBatchBooking: async (data) => {
    const res = await api.post("/bookings/batch", data);
    return res.data || {};
  },

  // Check-in by booking_id or 8-char checkin_token (backend endpoint may not exist yet)
  checkin: async (data) => {
    const res = await api.post("/bookings/checkin", data);
    return res.data || {};
  },

  // Backwards-compat alias
  getMyBookings: async (params = {}) => {
    const res = await api.get("/bookings", { params });
    return res.data || {};
  },
};

export default bookingService;
