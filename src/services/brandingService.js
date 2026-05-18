import api from "../lib/axios";

const brandingService = {
  getBranding: () => api.get("/branding").then((r) => r.data),
};

export default brandingService;
