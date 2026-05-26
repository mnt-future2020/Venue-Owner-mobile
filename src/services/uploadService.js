import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { API_BASE } from "../lib/axios";
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

// Primary upload path. expo-file-system's uploadAsync is purpose-built for native
// multipart uploads — it streams the file directly from disk, builds the multipart
// body in native code with the correct boundary header, and handles RN's quirks with
// sandboxed file URIs (cache/ImageManipulator paths, etc.) that often break JS-side
// FormData uploads with "Network request failed".
async function uploadWithFileSystem(endpoint, file) {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
  const url = `${API_BASE}${endpoint}`;

  const result = await FileSystem.uploadAsync(url, file.uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType: file.type,
    // Native layer sets `Content-Type: multipart/form-data; boundary=...` itself; do
    // not override it here. Only attach the auth token.
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    // Some backends require the multipart "filename" parameter; uploadAsync sets it
    // from the URI by default but we pass it explicitly so the server sees the same
    // .jpg / .png / .webp filename the compress step produced.
    parameters: {},
  });

  let payload = {};
  if (result.body) {
    try { payload = JSON.parse(result.body); } catch { payload = { raw: result.body }; }
  }

  if (result.status < 200 || result.status >= 300) {
    const err = new Error(payload?.detail || payload?.message || `Upload failed with status ${result.status}`);
    err.response = { status: result.status, data: payload };
    throw err;
  }

  return payload?.url || "";
}

async function uploadSingle(endpoint, asset, fallbackType) {
  const file = normalizeAsset(asset, fallbackType);
  if (!file) {
    throw new Error("Invalid file selected");
  }

  try {
    return await uploadWithFileSystem(endpoint, file);
  } catch (error) {
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
};

export default uploadService;
