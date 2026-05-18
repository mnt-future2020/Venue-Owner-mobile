import api from "../lib/axios";

const complianceService = {
  getConsent: async () => {
    const res = await api.get("/compliance/consent");
    return res.data;
  },
  updateConsent: async (category, granted) => {
    const res = await api.put("/compliance/consent", { category, granted });
    return res.data;
  },
  getNotificationPreferences: async () => {
    const res = await api.get("/compliance/notification-preferences");
    return res.data;
  },
  updateNotificationPreferences: async (prefs) => {
    const res = await api.put("/compliance/notification-preferences", prefs);
    return res.data;
  },
  getAuditLog: async (page, limit) => {
    const res = await api.get("/compliance/audit-log", {
      params: { page, limit },
    });
    return res.data;
  },
  exportData: async () => {
    const res = await api.get("/compliance/data-export");
    return res.data;
  },
  requestErasure: async (reason) => {
    const res = await api.post("/compliance/erasure-request", { reason });
    return res.data;
  },
};
export default complianceService;
