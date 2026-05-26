import api from "../lib/axios";

let unifiedConversationsCache = null;
let unifiedConversationsCacheAt = 0;
let unifiedConversationsInFlight = null;

function normalizeUnifiedConversationPayload(data) {
  const conversations = data?.conversations || data || [];
  return {
    ...(data && typeof data === "object" ? data : {}),
    conversations: Array.isArray(conversations) ? conversations : [],
  };
}

const chatService = {
  // ── Unified (DMs + Groups merged) ──────────────────────────
  getUnifiedConversations: async (options = {}) => {
    const force = !!options.force;
    const cacheWindowMs = Number.isFinite(options.cacheWindowMs)
      ? Math.max(0, options.cacheWindowMs)
      : 500;
    const now = Date.now();

    // force: true always makes a fresh request
    if (!force) {
      if (unifiedConversationsInFlight) return unifiedConversationsInFlight;
      if (unifiedConversationsCache && now - unifiedConversationsCacheAt < cacheWindowMs) {
        return unifiedConversationsCache;
      }
    }

    // Cancel stale in-flight when forcing
    unifiedConversationsInFlight = api
      .get("/chat/unified-conversations")
      .then((res) => {
        const payload = normalizeUnifiedConversationPayload(res.data || {});
        unifiedConversationsCache = payload;
        unifiedConversationsCacheAt = Date.now();
        return payload;
      })
      .finally(() => {
        unifiedConversationsInFlight = null;
      });

    return unifiedConversationsInFlight;
  },

  // ── DM Conversations ──────────────────────────────────────
  getConversations: async () => {
    const res = await api.get("/chat/conversations");
    return res.data || [];
  },

  startConversation: async (userId) => {
    const res = await api.post("/chat/conversations", { user_id: userId });
    return res.data || {};
  },

  getMessages: async (convoId, before = null) => {
    const params = before ? { before } : {};
    const res = await api.get(`/chat/${convoId}/messages`, { params });
    return res.data || {};
  },

  sendMessage: async (convoId, { content, type = "text", media_url, media_type, file_name, reply_to, metadata, duration, shared_post }) => {
    const body = { content };
    if (media_url) body.media_url = media_url;
    if (media_type) body.media_type = media_type;
    if (file_name) body.file_name = file_name;
    if (typeof duration === "number") body.duration = duration;
    if (reply_to) body.reply_to = reply_to;
    if (shared_post) body.shared_post = shared_post;
    if (metadata) body.metadata = metadata;
    if (type && type !== "text") body.type = type;
    const res = await api.post(`/chat/${convoId}/messages`, body);
    return res.data || {};
  },

  deleteMessage: async (convoId, msgId, mode = "for_everyone") => {
    const res = await api.delete(`/chat/${convoId}/messages/${msgId}`, { params: { mode } });
    return res.data || {};
  },

  // editMessage — NOT supported by backend (no /edit endpoint)

  sendTyping: async (convoId) => {
    const res = await api.post(`/chat/${convoId}/typing`);
    return res.data || {};
  },

  unreadTotal: async () => {
    const res = await api.get("/chat/unread-total");
    return res.data || {};
  },

  markDmRead: async (convoId) => {
    const res = await api.post(`/chat/${convoId}/read`);
    return res.data || {};
  },

  getTyping: async (convoId) => {
    const res = await api.get(`/chat/${convoId}/typing`);
    return res.data || {};
  },

  muteConversation: async (convoId) => {
    const res = await api.post(`/chat/${convoId}/mute`);
    return res.data || {};
  },

  reactToMessage: async (convoId, msgId, emoji) => {
    const res = await api.post(`/chat/${convoId}/messages/${msgId}/react`, { emoji });
    return res.data || {};
  },

  // ── Pin / Search / Media / Clear ─────────────────────────
  pinMessage: async (convoId, msgId) => {
    const res = await api.post(`/chat/${convoId}/messages/${msgId}/pin`);
    return res.data || {};
  },
  unpinMessage: async (convoId, msgId) => {
    const res = await api.delete(`/chat/${convoId}/messages/${msgId}/pin`);
    return res.data || {};
  },
  getPinnedMessages: async (convoId) => {
    const res = await api.get(`/chat/${convoId}/pinned`);
    return res.data || [];
  },
  searchMessages: async (convoId, query, page = 1) => {
    const res = await api.get(`/chat/${convoId}/search`, { params: { q: query, page } });
    return res.data || {};
  },
  getMedia: async (convoId, page = 1) => {
    const res = await api.get(`/chat/${convoId}/media`, { params: { page } });
    return res.data || [];
  },
  clearChat: async (convoId) => {
    const res = await api.post(`/chat/${convoId}/clear`);
    return res.data || {};
  },
  onlineStatus: async (usrId) => {
    const res = await api.get(`/chat/online/${usrId}`);
    return res.data || {};
  },
  heartbeat: async () => {
    const res = await api.post("/chat/online");
    return res.data || {};
  },

  // ── File Upload ─────────────────────────────────────────────
  uploadFile: async (formData) => {
    try {
      const res = await api.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        transformRequest: (data) => data,
        timeout: 120000,
      });

      if (!res.data) throw new Error("Empty response from server");
      if (!res.data.url) throw new Error("Upload response missing URL");
      return res.data;
    } catch (error) {
      // Fallback to fetch if axios fails (network errors, content:// URI issues)
      if (!error?.response) {
        try {
          const AsyncStorage = require("@react-native-async-storage/async-storage").default;
          const { STORAGE_KEYS } = require("../constants/storage");
          const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
          const response = await fetch(`${api.defaults.baseURL}/chat/upload`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload?.detail || `Upload failed (${response.status})`);
          if (!payload?.url) throw new Error("Upload response missing URL");
          return payload;
        } catch (fetchError) {
          console.warn("[chatService] upload fetch fallback failed:", fetchError?.message);
          throw fetchError;
        }
      }

      console.warn("[chatService] uploadFile error:", error?.message, error?.response?.status);
      if (error.response?.data?.detail) {
        const err = new Error(error.response.data.detail);
        err.response = error.response;
        throw err;
      }
      throw error;
    }
  },

  // ── Media Gallery (alias) ───────────────────────────────────
  getMediaGallery: async (convoId) => {
    const res = await api.get(`/chat/${convoId}/media`);
    return res.data;
  },

  // ── DM Polls ────────────────────────────────────────────────
  createPoll: async (convoId, question, options) => {
    const res = await api.post(`/chat/${convoId}/polls`, { question, options });
    return res.data;
  },
  votePoll: async (convoId, messageId, optionIndex) => {
    const res = await api.post(`/chat/${convoId}/polls/${messageId}/vote`, {
      option_index: optionIndex,
    });
    return res.data;
  },

  // ── Group Seen-by ───────────────────────────────────────────
  getSeenBy: async (groupId, messageId) => {
    const res = await api.get(`/groups/${groupId}/seen-by/${messageId}`);
    return res.data;
  },

  // ── Message Requests ──────────────────────────────────────
  getRequests: async () => {
    const res = await api.get("/chat/requests");
    return res.data || [];
  },

  acceptRequest: async (convoId) => {
    const res = await api.post(`/chat/${convoId}/accept`);
    return res.data || {};
  },

  declineRequest: async (convoId) => {
    const res = await api.post(`/chat/${convoId}/decline`);
    return res.data || {};
  },

  // ── Groups ────────────────────────────────────────────────
  getGroups: async () => {
    const res = await api.get("/groups");
    return res.data || [];
  },

  leaveGroup: async (id) => {
    const res = await api.post(`/groups/${id}/leave`);
    return res.data || {};
  },

  getGroupMessages: async (id, before = null) => {
    const params = before ? { before } : {};
    const res = await api.get(`/groups/${id}/messages`, { params });
    return res.data || {};
  },

  sendGroupMessage: async (id, { content, type = "text", reply_to, media_url, media_type, file_name, metadata, duration, shared_post }) => {
    const body = { content };
    if (reply_to) body.reply_to = reply_to;
    if (media_url) body.media_url = media_url;
    if (media_type) body.media_type = media_type;
    if (file_name) body.file_name = file_name;
    if (typeof duration === "number") body.duration = duration;
    if (shared_post) body.shared_post = shared_post;
    if (metadata) body.metadata = metadata;
    if (type && type !== "text") body.type = type;
    const res = await api.post(`/groups/${id}/messages`, body);
    return res.data || {};
  },

  deleteGroupMessage: async (id, msgId, mode = "for_everyone") => {
    const res = await api.delete(`/groups/${id}/messages/${msgId}`, { params: { mode } });
    return res.data || {};
  },

  sendGroupTyping: async (id) => {
    const res = await api.post(`/groups/${id}/typing`);
    return res.data || {};
  },

  markGroupRead: async (id) => {
    const res = await api.post(`/groups/${id}/read`);
    return res.data || {};
  },

  // ── Group Management ─────────────────────────────────────
  discoverGroups: async (params = {}) => {
    // GET /groups returns all public groups
    const res = await api.get("/groups", { params });
    return res.data || [];
  },
  recommendedGroups: async (city) => {
    // GET /recommendations/groups returns AI-powered group recommendations
    const params = city ? { city } : {};
    const res = await api.get("/recommendations/groups", { params });
    return res.data?.groups || res.data || [];
  },
  createGroup: async ({ name, members, sport, group_type, description, is_private, max_members, avatar_url, cover_url }) => {
    const res = await api.post("/groups", {
      name,
      members,
      sport,
      group_type,
      description,
      is_private,
      max_members,
      avatar_url,
      cover_url,
    });
    return res.data || {};
  },
  getGroup: async (id) => {
    const res = await api.get(`/groups/${id}`);
    return res.data || {};
  },
  updateGroup: async (id, data) => {
    const res = await api.put(`/groups/${id}`, data);
    return res.data || {};
  },
  deleteGroup: async (id) => {
    const res = await api.delete(`/groups/${id}`);
    return res.data || {};
  },
  joinGroup: async (id) => {
    const res = await api.post(`/groups/${id}/join`);
    return res.data || {};
  },
  requestJoinGroup: async (id) => {
    const res = await api.post(`/groups/${id}/request-join`);
    return res.data || {};
  },
  requestJoin: async (id) => {
    const res = await api.post(`/groups/${id}/join-request`);
    return res.data || {};
  },
  getJoinRequests: async (id) => {
    const res = await api.get(`/groups/${id}/join-requests`);
    return res.data || [];
  },
  approveJoinRequest: async (id, reqId) => {
    const res = await api.post(`/groups/${id}/join-requests/${reqId}/approve`);
    return res.data || {};
  },
  rejectJoinRequest: async (id, reqId) => {
    const res = await api.post(`/groups/${id}/join-requests/${reqId}/reject`);
    return res.data || {};
  },
  promoteMember: async (id, memberId) => {
    const res = await api.post(`/groups/${id}/members/${memberId}/promote`);
    return res.data || {};
  },
  demoteMember: async (id, memberId) => {
    const res = await api.post(`/groups/${id}/members/${memberId}/demote`);
    return res.data || {};
  },
  promote: async (id, user_id) => {
    const res = await api.post(`/groups/${id}/promote`, { user_id });
    return res.data || {};
  },
  demote: async (id, user_id) => {
    const res = await api.post(`/groups/${id}/demote`, { user_id });
    return res.data || {};
  },
  removeMember: async (id, user_id) => {
    const res = await api.post(`/groups/${id}/remove-member`, { user_id });
    return res.data || {};
  },
  setMemberRole: async (id, userId, role) => {
    const res = await api.put(`/groups/${id}/members/${userId}/role`, { role });
    return res.data || {};
  },
  getInviteLink: async (id) => {
    const res = await api.post(`/groups/${id}/invite-link`);
    return res.data || {};
  },
  joinViaInvite: async (code) => {
    const res = await api.post(`/groups/join/${code}`);
    return res.data || {};
  },
  getOnlineMembers: async (id) => {
    const res = await api.get(`/groups/${id}/online`);
    return res.data || [];
  },
  getOnline: async (id) => {
    const res = await api.get(`/groups/${id}/online`);
    return res.data || {};
  },
  pinGroupMessage: async (id, msgId) => {
    const res = await api.post(`/groups/${id}/messages/${msgId}/pin`);
    return res.data || {};
  },
  unpinGroupMessage: async (id, msgId) => {
    const res = await api.delete(`/groups/${id}/messages/${msgId}/pin`);
    return res.data || {};
  },
  getPinnedGroupMessages: async (id) => {
    const res = await api.get(`/groups/${id}/pinned`);
    return res.data || [];
  },
  createGroupPoll: async (id, data) => {
    const res = await api.post(`/groups/${id}/polls`, data);
    return res.data || {};
  },
  voteGroupPoll: async (id, msgId, optionIndex) => {
    const res = await api.post(`/groups/${id}/polls/${msgId}/vote`, { option_index: optionIndex });
    return res.data || {};
  },
  getGroupMedia: async (id, page = 1) => {
    const res = await api.get(`/groups/${id}/media`, { params: { page } });
    return res.data || [];
  },
  toggleGroupMute: async (id) => {
    const res = await api.post(`/groups/${id}/mute`);
    return res.data || {};
  },
  clearGroupChat: async (id) => {
    const res = await api.post(`/groups/${id}/clear`);
    return res.data || {};
  },
  reactGroupMessage: async (id, msgId, emoji) => {
    const res = await api.post(`/groups/${id}/messages/${msgId}/react`, { emoji });
    return res.data || {};
  },
  searchGroupMessages: async (id, query) => {
    const res = await api.get(`/groups/${id}/messages/search`, { params: { q: query } });
    return res.data || {};
  },
  forwardMessage: async ({ source_type, source_id, message_id, target_type, target_id }) => {
    const res = await api.post("/messages/forward", { source_type, source_id, message_id, target_type, target_id });
    return res.data || {};
  },

  // ── User search (for new chat) ────────────────────────────
  searchUsers: async (query) => {
    const res = await api.get("/users/search", { params: { q: query } });
    return res.data || [];
  },
};

export default chatService;

