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

  // Verify a check-in QR — POST /coaching/checkin/verify with raw QR
  // string (format: "HORIZON_CHECKIN:<booking_id>:<token>"). Works for
  // both walk-in AND online bookings. Backend validates the token.
  verifyCheckin: async (qrData) => {
    const res = await api.post("/coaching/checkin/verify", { qr_data: qrData });
    return res.data || {};
  },

  // Manually mark a walk-in booking as present (venue owner only).
  // POST /coaching/checkin/manual/{booking_id} — no body. Backend rejects
  // online bookings (400) since they require QR verification.
  manualCheckin: async (bookingId) => {
    const res = await api.post(`/coaching/checkin/manual/${bookingId}`);
    return res.data || {};
  },

  // DEPRECATED — kept as backwards-compat alias for old screens. The real
  // endpoint `/bookings/checkin` does not exist on backend; this previously
  // returned 404 silently. New code should use verifyCheckin / manualCheckin.
  checkin: async (data) => {
    if (data?.booking_id) {
      const res = await api.post(
        `/coaching/checkin/manual/${data.booking_id}`
      );
      return res.data || {};
    }
    if (data?.qr_data || data?.checkin_token) {
      const qr = data.qr_data || data.checkin_token;
      const res = await api.post("/coaching/checkin/verify", { qr_data: qr });
      return res.data || {};
    }
    throw new Error("checkin: provide booking_id or qr_data");
  },

  // Backwards-compat alias
  getMyBookings: async (params = {}) => {
    const res = await api.get("/bookings", { params });
    return res.data || {};
  },
};

export default bookingService;
