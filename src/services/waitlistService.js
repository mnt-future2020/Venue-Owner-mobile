import api from "../lib/axios";

const waitlistService = {
  // Join waitlist for a specific slot
  joinWaitlist: async (data) => {
    const res = await api.post("/waitlist", data);
    return res.data || {};
  },

  // Get user's waitlist entries
  getMyWaitlist: async () => {
    const res = await api.get("/waitlist");
    return res.data || [];
  },

  // Leave/cancel a waitlist entry
  leaveWaitlist: async (entryId) => {
    const res = await api.delete(`/waitlist/${entryId}`);
    return res.data || {};
  },

  // Get slot waitlist info
  slotInfo: async (params) => {
    const res = await api.get("/waitlist/slot", { params });
    return res.data || {};
  },
};

export default waitlistService;
