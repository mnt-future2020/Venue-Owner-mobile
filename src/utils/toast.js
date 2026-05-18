import { showToast, hideToast } from "../components/ToastManager";

/** Ensure message is always a string (backend may return objects/arrays). */
function safeStr(val) {
  if (typeof val === "string") return val;
  if (val == null) return "";
  // Pydantic validation error array: [{msg, loc, ...}, ...]
  if (Array.isArray(val)) {
    const first = val[0];
    return first?.msg || first?.message || JSON.stringify(val);
  }
  // Single Pydantic error object: {msg, type, loc, ...}
  if (val.msg) return val.msg;
  if (val.message) return val.message;
  if (val.detail) return safeStr(val.detail);
  return JSON.stringify(val);
}

const toast = {
  success: (message, description = "") => {
    showToast({ type: "success", message: safeStr(message), description: safeStr(description) });
  },
  error: (message, description = "") => {
    showToast({ type: "error", message: safeStr(message), description: safeStr(description) });
  },
  info: (message, description = "") => {
    showToast({ type: "info", message: safeStr(message), description: safeStr(description) });
  },
  warning: (message, description = "") => {
    showToast({ type: "warning", message: safeStr(message), description: safeStr(description) });
  },
  hide: () => {
    hideToast();
  },
};

export default toast;
