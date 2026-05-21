import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { API_BASE } from "../lib/axios";
import { STORAGE_KEYS } from "../constants/storage";

function inferMimeType(name = "", fallbackType = "application/octet-stream") {
  const lowerName = String(name).toLowerCase();
  if (/\.(jpe?g)$/.test(lowerName)) return "image/jpeg";
  if (/\.png$/.test(lowerName)) return "image/png";
  if (/\.webp$/.test(lowerName)) return "image/webp";
  if (/\.gif$/.test(lowerName)) return "image/gif";
  if (/\.mp4$/.test(lowerName)) return "video/mp4";
  if (/\.mov$/.test(lowerName)) return "video/quicktime";
  if (/\.avi$/.test(lowerName)) return "video/x-msvideo";
  if (/\.webm$/.test(lowerName)) return "video/webm";
  return fallbackType;
}

function normalizeAsset(asset, fallbackType) {
  if (!asset?.uri) return null;

  const fileName = asset.fileName || asset.name || asset.uri.split("/").pop() || `upload-${Date.now()}`;
  return {
    uri: asset.fileCopyUri || asset.uri,
    name: fileName,
    type: asset.mimeType || asset.type || inferMimeType(fileName, fallbackType || "application/octet-stream"),
  };
}

async function uploadWithFetch(endpoint, formData) {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const rawText = await response.text();
  let payload = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { raw: rawText };
  }

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || `Upload failed with status ${response.status}`);
    error.response = { status: response.status, data: payload };
    throw error;
  }

  return payload?.url || "";
}

function createFormData(file) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

async function uploadSingle(endpoint, asset, fallbackType) {
  const file = normalizeAsset(asset, fallbackType);
  if (!file) {
    throw new Error("Invalid file selected");
  }

  const formData = createFormData(file);

  try {
    const response = await api.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: (data) => data,
      timeout: 60000,
    });

    return response.data?.url || "";
  } catch (error) {
    if (!error?.response) {
      try {
        return await uploadWithFetch(endpoint, createFormData(file));
      } catch (fetchError) {
        if (__DEV__) {
          console.error("[uploadService] fetch fallback failed:", {
            endpoint,
            uri: file.uri,
            name: file.name,
            type: file.type,
            status: fetchError?.response?.status,
            data: fetchError?.response?.data,
            message: fetchError?.message,
          });
        }
        throw fetchError;
      }
    }
    if (__DEV__) {
      console.error("[uploadService] upload failed:", {
        endpoint,
        uri: file.uri,
        name: file.name,
        type: file.type,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
    }
    throw error;
  }
}

const uploadService = {
  uploadImage: async (asset) => uploadSingle("/upload/image", asset, "image/jpeg"),
  uploadImages: async (assets = []) => Promise.all(assets.map((asset) => uploadSingle("/upload/image", asset, "image/jpeg"))),
  uploadVideo: async (asset) => uploadSingle("/upload/video", asset, "video/mp4"),
  uploadDocument: async (asset) => uploadSingle("/upload/document", asset, "application/pdf"),
};

export default uploadService;
