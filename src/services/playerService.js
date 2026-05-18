import api from "../lib/axios";

const playerService = {
  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data || null;
  },
  getNotifications: async (before = null) => {
    const params = {};
    if (before) params.before = before;
    const res = await api.get("/notifications", { params });
    return res.data || {};
  },
  getNotificationUnreadCount: async () => {
    const res = await api.get("/notifications/unread-count");
    return res.data?.count ?? res.data?.unread_count ?? 0;
  },
  markNotificationRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data || {};
  },
  markAllNotificationsRead: async () => {
    const res = await api.put("/notifications/read-all");
    return res.data || {};
  },
  getBookings: async (params = {}) => {
    const res = await api.get("/bookings", { params });
    return res.data || {};
  },
  getPlayerStats: async (params = {}) => {
    const res = await api.get("/analytics/player", { params });
    return res.data || null;
  },
  getRecommendedVenues: async (limit = 6) => {
    const res = await api.get("/recommendations/venues", { params: { limit } });
    return res.data?.venues || [];
  },
  getVenues: async (params = {}) => {
    const res = await api.get("/venues", { params });
    return res.data || {};
  },
  getMyPlayerCard: async () => {
    const res = await api.get("/player-card/me");
    return res.data || null;
  },
  getPlayerCard: async (userId) => {
    const res = await api.get(`/player-card/${userId}`);
    return res.data || null;
  },
  getBookmarks: async (before = null) => {
    const res = await api.get("/feed/bookmarks", { params: before ? { before } : {} });
    return res.data || {};
  },
  getTeams: async (params = {}) => {
    const res = await api.get("/teams", { params });
    return res.data || {};
  },
  getMyTeams: async () => {
    const res = await api.get("/teams/my");
    return res.data || [];
  },
  getTournaments: async (params = {}) => {
    const res = await api.get("/tournaments", { params });
    return res.data || [];
  },
  getCoachById: async (id) => {
    const res = await api.get(`/coaching/coaches/${id}`);
    return res.data || null;
  },

  // Location search
  placesAutocomplete: async (input, lat, lng) => {
    const params = { input };
    if (lat != null) params.lat = lat;
    if (lng != null) params.lng = lng;
    const res = await api.get("/venues/places-autocomplete", { params });
    return res.data || [];
  },
  placeDetails: async (placeId) => {
    const res = await api.get("/venues/place-details", { params: { place_id: placeId } });
    return res.data || {};
  },
  reverseGeocode: async (lat, lng) => {
    const res = await api.get("/venues/reverse-geocode", { params: { lat, lng } });
    return res.data || {};
  },

  getSuggestedPlayers: async () => {
    const res = await api.get("/social/suggested-follows");
    return res.data || [];
  },
};

export default playerService;
