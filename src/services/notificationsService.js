import api from "../lib/axios";

// Notifications API client — backed by backend/routes/player/notifications.py.
// Endpoints (all under base /api):
//   GET    /notifications                  → { notifications, next_cursor, has_more }
//   GET    /notifications/unread-count     → { count }
//   PUT    /notifications/{id}/read        → { message }
//   PUT    /notifications/read-all         → { message }
//
// Notification object shape:
//   { id, user_id, type, title, message, is_read, created_at,
//     venue_id?, date?, start_time?, turf_number?, data? }
const notificationsService = {
  // Paginated list (cursor on `created_at` ISO string)
  list: async (before = null, limit = 30) => {
    const params = { limit };
    if (before) params.before = before;
    const res = await api.get("/notifications", { params });
    return res.data || { notifications: [], next_cursor: null, has_more: false };
  },

  // Unread count for the Bell badge
  unreadCount: async () => {
    const res = await api.get("/notifications/unread-count");
    return Number(res.data?.count) || 0;
  },

  // Mark a single notification as read
  markRead: async (notifId) => {
    const res = await api.put(`/notifications/${notifId}/read`);
    return res.data || {};
  },

  // Mark all unread as read
  markAllRead: async () => {
    const res = await api.put("/notifications/read-all");
    return res.data || {};
  },
};

export default notificationsService;
