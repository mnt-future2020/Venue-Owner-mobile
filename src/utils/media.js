import { API_BASE } from "../lib/axios";

const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export function mediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `${API_ORIGIN}${url}`;
}
