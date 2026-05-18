import api from "../lib/axios";

const slotLockService = {
  // Lock a slot before payment (prevents double-booking)
  lock: async (data) => {
    const res = await api.post("/slots/lock", data);
    return res.data || {};
  },

  // Unlock/release a slot lock
  unlock: async (data) => {
    const res = await api.post("/slots/unlock", data);
    return res.data || {};
  },

  // Extend an existing slot lock TTL
  extendLock: async (data) => {
    const res = await api.post("/slots/extend-lock", data);
    return res.data || {};
  },

  // Get user's active slot locks
  myLocks: async () => {
    const res = await api.get("/slots/my-locks");
    return res.data || [];
  },

  // Check if a specific slot is locked
  status: async (params) => {
    const res = await api.get("/slots/lock-status", { params });
    return res.data || {};
  },
};

export default slotLockService;
