import api from "../lib/axios";

const venueService = {
  getVenues: async (params = {}) => {
    const res = await api.get("/venues", { params });
    return res.data || {};
  },

  getVenueById: async (id) => {
    const res = await api.get(`/venues/${id}`);
    return res.data || null;
  },

  getAvailable: async (params = {}) => {
    const res = await api.get("/venues/available", { params });
    return res.data || {};
  },

  getVenueSlots: async (id, date) => {
    const res = await api.get(`/venues/${id}/slots`, { params: { date } });
    return res.data || {};
  },

  getVenueReviews: async (id, params = {}) => {
    const res = await api.get(`/venues/${id}/reviews`, { params });
    return res.data || {};
  },

  addReview: async (id, data) => {
    const res = await api.post(`/venues/${id}/reviews`, data);
    return res.data || {};
  },

  getReviewSentiment: async (id) => {
    const res = await api.get(`/venues/${id}/reviews/sentiment`);
    return res.data || {};
  },

  getReviewSummary: async (id) => {
    const res = await api.get(`/venues/${id}/reviews/summary`);
    return res.data || {};
  },

  canReview: async (id) => {
    const res = await api.get(`/venues/${id}/reviews/can-review`);
    return res.data || {};
  },

  // ── Filter metadata ─────────────────────────────────────
  getCities: async () => {
    const res = await api.get("/venues/cities");
    return res.data || [];
  },
  getSports: async () => {
    const res = await api.get("/venues/sports");
    return res.data || [];
  },
  getAmenities: async () => {
    const res = await api.get("/venues/amenities");
    return res.data || [];
  },

  // ── Location-based ──────────────────────────────────────
  getNearby: async (lat, lng, radius = 50, extraParams = {}) => {
    const res = await api.get("/venues/nearby", { params: { lat, lng, radius, ...extraParams } });
    return res.data || {};
  },
  getNearbyByDriveTime: async (lat, lng, radius = 50, extraParams = {}) => {
    const res = await api.get("/venues/nearby/drive-time", { params: { lat, lng, radius, ...extraParams } });
    return res.data || {};
  },

  // ── Booking ─────────────────────────────────────────────
  createBooking: async (venueId, data) => {
    const res = await api.post(`/venues/${venueId}/book`, data);
    return res.data || {};
  },
  getMyBookings: async (params = {}) => {
    const res = await api.get("/bookings", { params });
    return res.data || {};
  },
  cancelBooking: async (bookingId) => {
    const res = await api.post(`/bookings/${bookingId}/cancel`);
    return res.data || {};
  },
  getBookingReceipt: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}`);
    return res.data || {};
  },

  // ── Slots availability ─────────────────────────────────
  // Backend endpoint is /venues/{id}/slots (see backend/routes/venue/venues.py:1198).
  // The previous /slots-availability path 404'd — Frontend uses /slots too.
  getSlots: async (venueId, date) => {
    const res = await api.get(`/venues/${venueId}/slots`, { params: { date } });
    return res.data || {};
  },

  // ── Pricing rules ─────────────────────────────────────
  getPricingRules: async (venueId) => {
    const res = await api.get(`/venues/${venueId}/pricing-rules`);
    return res.data || [];
  },
  createPricingRule: async (venueId, data) => {
    // data includes: turf_numbers[] (new), rule_type, value, etc.
    const res = await api.post(`/venues/${venueId}/pricing-rules`, data);
    return res.data || {};
  },
  updatePricingRule: async (ruleId, data) => {
    const res = await api.put(`/pricing-rules/${ruleId}`, data);
    return res.data || {};
  },
  deletePricingRule: async (ruleId) => {
    const res = await api.delete(`/pricing-rules/${ruleId}`);
    return res.data || {};
  },

  // ── Hold rules (venue owner only) ─────────────────────
  getHoldRules: async (venueId) => {
    const res = await api.get(`/venues/${venueId}/hold-rules`);
    return res.data || [];
  },
  createHoldRule: async (venueId, data) => {
    const res = await api.post(`/venues/${venueId}/hold-rules`, data);
    return res.data || {};
  },
  updateHoldRule: async (ruleId, data) => {
    const res = await api.put(`/hold-rules/${ruleId}`, data);
    return res.data || {};
  },
  toggleHoldRule: async (ruleId) => {
    const res = await api.put(`/hold-rules/${ruleId}/toggle`);
    return res.data || {};
  },
  deleteHoldRule: async (ruleId) => {
    const res = await api.delete(`/hold-rules/${ruleId}`);
    return res.data || {};
  },
  excludeSlot: async (ruleId, data) => {
    const res = await api.post(`/hold-rules/${ruleId}/exclude-slot`, data);
    return res.data || {};
  },
  includeSlot: async (ruleId, data) => {
    const res = await api.post(`/hold-rules/${ruleId}/include-slot`, data);
    return res.data || {};
  },

  // ── Review helpers ────────────────────────────────────
  submitReview: async (venueId, data) => {
    const res = await api.post(`/venues/${venueId}/reviews`, data);
    return res.data || {};
  },

  // ── Enquiry ───────────────────────────────────────────
  submitEnquiry: async (venueId, data) => {
    const res = await api.post(`/venues/${venueId}/enquiry`, data);
    return res.data || {};
  },

  // ── Slot notification subscribe ──────────────────────────
  subscribeSlotNotification: async (venueId, data) => {
    const res = await api.post(`/notifications/subscribe`, { venue_id: venueId, ...data });
    return res.data || {};
  },

  // ── Places (Google) ─────────────────────────────────────
  placesAutocomplete: async (q) => {
    const res = await api.get("/venues/places/autocomplete", { params: { q } });
    return res.data || [];
  },
  placeDetails: async (placeId) => {
    const res = await api.get(`/venues/places/details/${placeId}`);
    return res.data || {};
  },
  reverseGeocode: async (lat, lng) => {
    const res = await api.get("/venues/reverse-geocode", { params: { lat, lng } });
    return res.data || {};
  },

  // ── Owner venues ────────────────────────────────────────
  // Backend route: GET /owner/venues (in backend/routes/venue/venues.py:1067)
  getOwnerVenues: async () => {
    const res = await api.get("/owner/venues");
    return res.data || [];
  },
  create: async (data) => {
    const res = await api.post("/venues", data);
    return res.data || {};
  },
  update: async (id, data) => {
    const res = await api.put(`/venues/${id}`, data);
    return res.data || {};
  },
  delete: async (id) => {
    const res = await api.delete(`/venues/${id}`);
    return res.data || {};
  },
};

export default venueService;
