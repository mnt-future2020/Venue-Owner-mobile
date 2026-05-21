import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader,
  Upload,
  Video as VideoIcon,
  X as XIcon,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { FONTS, PRIMARY_COLOR } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";
import uploadService from "../../services/uploadService";
import toast from "../../utils/toast";

// Mirrors frontend/src/components/profile/DocumentsUploadTab.js for venue_owner.
// Same field set, same submit-for-review flow, native pickers.
const DOC_SLOTS = [
  { key: "business_license", label: "Business License", type: "document", multiple: false, required: true },
  { key: "gst_certificate", label: "GST Certificate", type: "document", multiple: false, required: true },
  { key: "id_proof", label: "ID Proof", type: "document", multiple: false, required: true },
  { key: "address_proof", label: "Address Proof", type: "document", multiple: false, required: true },
];

export default function DocumentsUploadTab() {
  const { user, updateUser } = useAuth();
  const [docs, setDocs] = useState(() => {
    const raw = user?.verification_documents || {};
    return {
      ...raw,
      turf_images: Array.isArray(raw.turf_images) ? raw.turf_images : [],
      turf_videos: Array.isArray(raw.turf_videos) ? raw.turf_videos : [],
    };
  });
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const docStatus = user?.doc_verification_status || "not_uploaded";
  const lockedForReview = docStatus === "pending_review" || docStatus === "verified";

  const allRequiredUploaded = DOC_SLOTS.filter((s) => s.required).every(
    (s) => docs[s.key]?.url
  );

  // ── Pickers ─────────────────────────────────────────────────────────────
  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return null;
    return res.assets?.[0] || null;
  };

  const pickImages = async (multiple) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission denied", "Please allow photo library access.");
      return [];
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: !!multiple,
      quality: 0.85,
    });
    if (res.canceled) return [];
    return res.assets || [];
  };

  const pickVideos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission denied", "Please allow media library access.");
      return [];
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (res.canceled) return [];
    return res.assets || [];
  };

  // ── Upload handlers ─────────────────────────────────────────────────────
  const persist = async (slotKey, value) => {
    try {
      const updated = await authService.updateVerificationDocuments({ [slotKey]: value });
      if (updated) await updateUser(updated);
    } catch (err) {
      toast.error("Save failed", err?.response?.data?.detail || "Try again");
    }
  };

  const uploadSingleDoc = async (slot) => {
    const asset = await pickDocument();
    if (!asset) return;
    setUploadingDoc(slot.key);
    try {
      const url = await uploadService.uploadDocument({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      const docData = { url, uploaded_at: new Date().toISOString() };
      setDocs((p) => ({ ...p, [slot.key]: docData }));
      await persist(slot.key, docData);
      toast.success("Uploaded successfully!");
    } catch (err) {
      toast.error("Upload failed", err?.response?.data?.detail || err?.message || "Try again");
    } finally {
      setUploadingDoc(null);
    }
  };

  const uploadTurfImages = async () => {
    const assets = await pickImages(true);
    if (assets.length === 0) return;
    setUploadingDoc("turf_images");
    try {
      const urls = await Promise.all(
        assets.map((a) => uploadService.uploadImage({ uri: a.uri, fileName: a.fileName, type: a.mimeType }))
      );
      const merged = [...(docs.turf_images || []), ...urls];
      setDocs((p) => ({ ...p, turf_images: merged }));
      await persist("turf_images", merged);
      toast.success("Uploaded successfully!");
    } catch (err) {
      toast.error("Upload failed", err?.response?.data?.detail || err?.message || "Try again");
    } finally {
      setUploadingDoc(null);
    }
  };

  const uploadTurfVideos = async () => {
    const assets = await pickVideos();
    if (assets.length === 0) return;
    setUploadingDoc("turf_videos");
    try {
      const urls = await Promise.all(
        assets.map((a) => uploadService.uploadVideo({ uri: a.uri, fileName: a.fileName, type: a.mimeType }))
      );
      const merged = [...(docs.turf_videos || []), ...urls];
      setDocs((p) => ({ ...p, turf_videos: merged }));
      await persist("turf_videos", merged);
      toast.success("Uploaded successfully!");
    } catch (err) {
      toast.error("Upload failed", err?.response?.data?.detail || err?.message || "Try again");
    } finally {
      setUploadingDoc(null);
    }
  };

  // Kept for reference — Replace button now opens the picker directly.
  // If a true "Remove" action is wanted later, uncomment:
  //
  // const removeSingleDoc = async (slot) => {
  //   setDocs((p) => ({ ...p, [slot.key]: null }));
  //   await persist(slot.key, null);
  // };

  const removeMultiItem = async (slotKey, index) => {
    const current = docs[slotKey] || [];
    const next = current.filter((_, i) => i !== index);
    setDocs((p) => ({ ...p, [slotKey]: next }));
    await persist(slotKey, next);
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      const updated = await authService.updateVerificationDocuments({ submit: true });
      if (updated) await updateUser(updated);
      toast.success("Documents submitted for review!");
    } catch (err) {
      toast.error("Failed", err?.response?.data?.detail || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Upload size={18} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Verification Documents</Text>
          <Text style={styles.headerSub}>Upload required documents to verify your business</Text>
        </View>
      </View>

      {/* Required docs — single-column list (per user preference) */}
      {DOC_SLOTS.map((slot) => (
        <DocumentSlotCard
          key={slot.key}
          slot={slot}
          doc={docs[slot.key]}
          isUploading={uploadingDoc === slot.key}
          locked={lockedForReview}
          onPick={() => uploadSingleDoc(slot)}
        />
      ))}

      {/* Turf Images */}
      <MultipleSection
        label="Turf Images"
        Icon={ImageIcon}
        items={docs.turf_images || []}
        renderItem={(url, i) => (
          <TouchableOpacity
            key={`img-${i}`}
            onPress={() => Linking.openURL(extractUrl(url))}
            activeOpacity={0.85}
            style={styles.thumb}
          >
            <Image source={{ uri: extractUrl(url) }} style={styles.thumbImg} />
            <TouchableOpacity
              onPress={() => removeMultiItem("turf_images", i)}
              style={styles.removeBtn}
              hitSlop={8}
            >
              <XIcon size={12} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        addLabel="Add"
        isUploading={uploadingDoc === "turf_images"}
        locked={lockedForReview}
        onPick={uploadTurfImages}
        squareSize={80}
      />

      {/* Turf Videos */}
      <MultipleSection
        label="Turf Videos"
        Icon={VideoIcon}
        items={docs.turf_videos || []}
        renderItem={(url, i) => (
          <TouchableOpacity
            key={`vid-${i}`}
            onPress={() => Linking.openURL(extractUrl(url))}
            activeOpacity={0.85}
            style={styles.videoThumb}
          >
            <View style={styles.videoIconWrap}>
              <VideoIcon size={28} color="#FFFFFF" />
            </View>
            <TouchableOpacity
              onPress={() => removeMultiItem("turf_videos", i)}
              style={styles.removeBtn}
              hitSlop={8}
            >
              <XIcon size={12} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        addLabel="Add Video"
        isUploading={uploadingDoc === "turf_videos"}
        locked={lockedForReview}
        onPick={uploadTurfVideos}
        squareSize={120}
      />

      {/* Submit section */}
      {!lockedForReview ? (
        <View style={styles.submitWrap}>
          <TouchableOpacity
            onPress={() => setAgreed((v) => !v)}
            activeOpacity={0.8}
            style={styles.termsRow}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.termsText}>
              I confirm that all uploaded documents are genuine and I agree to the Terms & Conditions and Privacy Policy.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submitForReview}
            disabled={!allRequiredUploaded || !agreed || submitting || !!uploadingDoc}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              (!allRequiredUploaded || !agreed || submitting || !!uploadingDoc) && styles.submitBtnDisabled,
            ]}
          >
            {submitting ? (
              <View style={styles.submitInner}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitText}>Submitting…</Text>
              </View>
            ) : (
              <View style={styles.submitInner}>
                <Upload size={16} color="#FFFFFF" strokeWidth={2.3} />
                <Text style={styles.submitText}>Submit Documents for Review</Text>
              </View>
            )}
          </TouchableOpacity>

          {!allRequiredUploaded ? (
            <Text style={styles.helperText}>
              Upload all required documents (<Text style={styles.requiredStar}>*</Text>) to submit for review
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function extractUrl(item) {
  if (typeof item === "string") return item;
  return item?.url || "";
}

function DocumentSlotCard({ slot, doc, isUploading, onPick }) {
  // Doc may come in as either an object `{ url, uploaded_at }` (the shape we
  // write on upload) OR a plain string URL (older records / admin uploads).
  // Normalize both so the Replace UI shows whenever a URL exists.
  const url =
    typeof doc === "string"
      ? doc
      : doc?.url || doc?.image_url || doc?.file_url || null;
  const isPdf = typeof url === "string" && url.toLowerCase().endsWith(".pdf");

  return (
    <View style={styles.docCard}>
      <View style={styles.docHeader}>
        <Text style={styles.docLabel}>
          {slot.label.toUpperCase()}
          {slot.required ? <Text style={styles.requiredStar}> *</Text> : null}
        </Text>
        {url ? <CheckCircle2 size={18} color="#10B981" strokeWidth={2.3} /> : null}
      </View>

      {url ? (
        <View style={{ gap: 10 }}>
          {isPdf ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.85}
              style={styles.pdfPreview}
            >
              <FileText size={20} color={PRIMARY_COLOR} strokeWidth={2.3} />
              <Text style={styles.pdfText}>View PDF Document</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: url }} style={styles.imgPreview} resizeMode="contain" />
            </TouchableOpacity>
          )}
          {/* Replace — always available when a document exists. */}
          <TouchableOpacity
            onPress={onPick}
            activeOpacity={0.7}
            style={styles.replaceBtn}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={PRIMARY_COLOR} size="small" />
            ) : (
              <Text style={styles.replaceText}>Replace</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPick}
          disabled={isUploading}
          activeOpacity={0.85}
          style={[styles.uploadDrop, isUploading && styles.uploadDropActive]}
        >
          {isUploading ? (
            <View style={styles.uploadingInner}>
              <Loader size={22} color={PRIMARY_COLOR} />
              <Text style={styles.uploadingText}>Uploading…</Text>
            </View>
          ) : (
            <>
              <Upload size={22} color="#94A3B8" />
              <Text style={styles.uploadHint}>Click to upload</Text>
              <Text style={styles.uploadSub}>Image or PDF, max 10MB</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

function MultipleSection({ label, Icon, items, renderItem, addLabel, isUploading, onPick, squareSize }) {
  return (
    <View style={styles.docCard}>
      <Text style={styles.docLabel}>{label.toUpperCase()}</Text>
      <View style={styles.itemsRow}>
        {items.map((it, i) => renderItem(it, i))}
        {/* Add tile — always available (matches frontend behavior for the
            user-action Replace/Add tiles). */}
        <TouchableOpacity
          onPress={onPick}
          disabled={isUploading}
          activeOpacity={0.85}
          style={[
            styles.addBox,
            { width: squareSize, height: squareSize === 120 ? 80 : squareSize },
          ]}
        >
          {isUploading ? (
            <ActivityIndicator color={PRIMARY_COLOR} size="small" />
          ) : (
            <>
              {Icon ? <Icon size={20} color="#94A3B8" /> : null}
              <Text style={styles.addText}>{addLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: FONTS.displayBold, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 11, color: "#6B7280", fontFamily: FONTS.body, marginTop: 2 },

  requiredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  docCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 10,
    // Two cards per row, accounting for parent padding + gap.
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 0,
  },
  docHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#374151",
    letterSpacing: 1.5,
  },
  requiredStar: { color: "#EF4444" },

  pdfPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pdfText: { fontSize: 13, color: PRIMARY_COLOR, fontFamily: FONTS.bodyBold, fontWeight: "700" },
  imgPreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  replaceBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  replaceText: {
    fontSize: 12,
    color: "#374151",
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  uploadDrop: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
    gap: 4,
  },
  uploadDropActive: { borderColor: PRIMARY_COLOR, backgroundColor: "#ECFDF5" },
  uploadHint: { fontSize: 13, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#111827", marginTop: 4 },
  uploadSub: { fontSize: 11, color: "#9CA3AF", fontFamily: FONTS.body },
  uploadingInner: { alignItems: "center", gap: 6 },
  uploadingText: { fontSize: 12, color: PRIMARY_COLOR, fontFamily: FONTS.bodyBold, fontWeight: "700" },

  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "visible",
  },
  thumbImg: { width: 80, height: 80, borderRadius: 12 },
  videoThumb: {
    position: "relative",
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  videoIconWrap: { alignItems: "center", justifyContent: "center" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  addBox: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
    gap: 4,
  },
  addText: { fontSize: 11, color: "#6B7280", fontFamily: FONTS.bodyBold, fontWeight: "700" },

  submitWrap: { gap: 12, marginTop: 4 },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { borderColor: PRIMARY_COLOR, backgroundColor: PRIMARY_COLOR },
  termsText: { flex: 1, fontSize: 12, color: "#6B7280", fontFamily: FONTS.body, lineHeight: 18 },

  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { fontSize: 14, fontFamily: FONTS.bodyBold, fontWeight: "700", color: "#FFFFFF" },
  helperText: { fontSize: 11, color: "#6B7280", textAlign: "center", fontFamily: FONTS.body },
});
