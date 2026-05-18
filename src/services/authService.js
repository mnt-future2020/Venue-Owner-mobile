import api from "../lib/axios";

const authService = {
  login: (identifier, password) =>
    api.post("/auth/login", { identifier, password }).then((r) => r.data),
  getMe: () => api.get("/auth/me").then((r) => r.data),
  registerSendOtp: (payload) =>
    api.post("/auth/register/send-otp", payload).then((r) => r.data),
  registerVerifyOtp: (phone, otp) =>
    api.post("/auth/register/verify-otp", { phone, otp }).then((r) => r.data),
  registerResendOtp: (phone) =>
    api.post("/auth/register/resend-otp", { phone }).then((r) => r.data),
  forgotPassword: (phone) =>
    api.post("/auth/forgot-password", { phone }).then((r) => r.data),
  verifyOtp: (phone, otp) =>
    api.post("/auth/verify-otp", { phone, otp }).then((r) => r.data),
  resendOtp: (phone) =>
    api.post("/auth/resend-otp", { phone }).then((r) => r.data),
  resetPassword: (reset_token, new_password) =>
    api.post("/auth/reset-password", { reset_token, new_password }).then((r) => r.data),
  updateProfile: async (data) => {
    const res = await api.put("/auth/profile", data);
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.put("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
    return res.data;
  },
};

export default authService;
