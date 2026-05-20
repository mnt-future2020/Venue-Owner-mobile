import { useEffect, useMemo, useRef, useState } from "react";
import queryCache from "../../../services/queryCache";
import FullScreenLoader from "../../../components/ui/FullScreenLoader";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Dumbbell,
  Sparkles,
  Settings,
  Image as ImageIcon,
  Globe,
  MapPinned,
} from "lucide-react-native";

import { PRIMARY_COLOR } from "../../../constants/theme";
import { getSportLabel } from "../../../constants/venueConstants";
import venueService from "../../../services/venueService";
import toast from "../../../utils/toast";

import SportChipSelector from "../../../components/venue/SportChipSelector";
import AmenityChipSelector from "../../../components/venue/AmenityChipSelector";
import TurfConfigPanel from "../../../components/venue/TurfConfigPanel";
import HoursSelector from "../../../components/venue/HoursSelector";
import VenueImageUpload from "../../../components/venue/VenueImageUpload";
import LocationAutocomplete from "../../../components/venue/LocationAutocomplete";
import VenueRichEditor from "../../../components/venue/VenueRichEditor";

const DEFAULT_FORM = {
  name: "",
  description: "",
  sports: [],
  address: "",
  area: "",
  city: "",
  lat: null,
  lng: null,
  slot_duration_minutes: 60,
  opening_hour: 6,
  closing_hour: 23,
  amenities: [],
  images: [],
  turf_config: [],
  google_maps_url: "",
  meta_title: "",
  meta_description: "",
};

function SectionHeading({ icon: Icon, title }) {
  return (
    <View style={styles.sectionHeading}>
      <Icon size={14} color={PRIMARY_COLOR} strokeWidth={2.2} />
      <Text style={styles.sectionHeadingText}>{title}</Text>
    </View>
  );
}

function FieldLabel({ children, required }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={{ color: "#EF4444" }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

function ReadOnlyDisplay({ children }) {
  return (
    <View style={styles.readOnly}>
      <Text style={styles.readOnlyText}>{children || "—"}</Text>
    </View>
  );
}

export default function VenueFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = !!id;
  const insets = useSafeAreaInsets();

  // Seed from owner-venues cache when possible so reopening edit avoids the
  // spinner entirely. Falls back to the network fetch below if missing.
  const cachedVenue = useMemo(() => {
    if (!isEdit) return null;
    const list = queryCache.getData("venue:owner-venues");
    if (!Array.isArray(list)) return null;
    return list.find((v) => v.id === id) || null;
  }, [id, isEdit]);

  const [form, setForm] = useState(() =>
    cachedVenue ? { ...DEFAULT_FORM, ...cachedVenue } : DEFAULT_FORM
  );
  const [errors, setErrors] = useState({});
  const [baseTurf, setBaseTurf] = useState(() => {
    if (!cachedVenue) return { sport: null, idx: 0 };
    const cfg = cachedVenue.turf_config || [];
    for (const tc of cfg) {
      for (let i = 0; i < (tc.turfs || []).length; i++) {
        if (tc.turfs[i].price === cachedVenue.base_price) {
          return { sport: tc.sport, idx: i };
        }
      }
    }
    return { sport: cfg[0]?.sport, idx: 0 };
  });
  // Skip the initial spinner when we already have cached data for this venue.
  const [loading, setLoading] = useState(isEdit && !cachedVenue);
  const [submitting, setSubmitting] = useState(false);
  const seededRef = useRef(!!cachedVenue);

  // Extract iframe src
  const extractMapUrl = (raw) => {
    if (!raw) return "";
    const match = String(raw).match(/src="([^"]+)"/);
    return match ? match[1] : raw;
  };

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await venueService.getVenueById(id);
        if (cancelled || !data) return;
        seededRef.current = true;
        setForm((p) => ({ ...p, ...DEFAULT_FORM, ...data }));
        // Seed baseTurf — find turf whose price matches base_price, else first
        const cfg = data.turf_config || [];
        let found = null;
        outer: for (const tc of cfg) {
          for (let i = 0; i < (tc.turfs || []).length; i++) {
            if (tc.turfs[i].price === data.base_price) {
              found = { sport: tc.sport, idx: i };
              break outer;
            }
          }
        }
        setBaseTurf(found || { sport: cfg[0]?.sport, idx: 0 });
      } catch (err) {
        toast.error(
          "Load failed",
          err?.response?.data?.detail || "Could not load venue"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const updateField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const handleSportsChange = (newSports) => {
    setForm((prev) => {
      const oldSports = prev.sports || [];
      const added = newSports.filter((s) => !oldSports.includes(s));
      const removed = oldSports.filter((s) => !newSports.includes(s));
      let turfConfig = [...(prev.turf_config || [])];
      turfConfig = turfConfig.filter((tc) => !removed.includes(tc.sport));
      for (const sport of added) {
        turfConfig.push({
          sport,
          turfs: [
            {
              name: `${getSportLabel(sport)} Turf 1`,
              price: 2000,
              lobbians: 1,
            },
          ],
        });
      }
      return { ...prev, sports: newSports, turf_config: turfConfig };
    });
    if (errors.sports) setErrors((p) => ({ ...p, sports: null }));
  };

  const validate = () => {
    const errs = {};
    if (!isEdit && !form.name?.trim()) errs.name = "Venue name is required";
    if (!isEdit && !form.city?.trim()) errs.city = "City is required";
    if (!form.sports?.length) errs.sports = "Select at least one sport";
    if (
      form.closing_hour != null &&
      form.opening_hour != null &&
      form.closing_hour <= form.opening_hour
    ) {
      errs.hours = "Closing hour must be after opening hour";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Form incomplete", Object.values(errs)[0]);
    }
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = { ...form };
    payload.google_maps_url = extractMapUrl(payload.google_maps_url);

    // Compute total turfs
    if (payload.turf_config?.length) {
      payload.turfs = payload.turf_config.reduce(
        (sum, tc) => sum + (tc.turfs?.length || 0),
        0
      );
    } else {
      payload.turfs = 1;
    }
    // Compute base_price
    const bt = baseTurf || { sport: payload.turf_config?.[0]?.sport, idx: 0 };
    const baseTc = payload.turf_config?.find((tc) => tc.sport === bt?.sport);
    payload.base_price = baseTc?.turfs?.[bt?.idx]?.price || 2000;

    setSubmitting(true);
    try {
      if (isEdit) {
        await venueService.update(id, payload);
        toast.success("Saved", "Changes published.");
      } else {
        await venueService.create(payload);
        toast.success("Created", "Venue is live.");
      }
      router.back();
    } catch (err) {
      toast.error(
        "Save failed",
        err?.response?.data?.detail || err?.message || "Try again"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FullScreenLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header — matches frontend modal title + description */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color="#111827" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              {isEdit ? "Edit Venue Details" : "Create New Venue"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEdit ? (
                <>
                  Changes will be pushed{" "}
                  <Text style={styles.headerSubtitleAccent}>live</Text> to all
                  viewers of the public page instantly.
                </>
              ) : (
                "Fill in the details below to list your venue on Lobbi."
              )}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Basic Info */}
          <View style={styles.section}>
            <SectionHeading icon={Building2} title="Basic Information" />

            <View style={styles.field}>
              <FieldLabel required>Venue Name</FieldLabel>
              {isEdit ? (
                <ReadOnlyDisplay>{form.name}</ReadOnlyDisplay>
              ) : (
                <>
                  <TextInput
                    value={form.name}
                    onChangeText={(v) => updateField("name", v)}
                    placeholder="Enter your venue name"
                    placeholderTextColor="#9CA3AF"
                    style={[
                      styles.textInput,
                      errors.name && styles.inputError,
                    ]}
                  />
                  <FieldError message={errors.name} />
                </>
              )}
            </View>

            <View style={styles.field}>
              <FieldLabel>Description</FieldLabel>
              <VenueRichEditor
                value={form.description}
                onChange={(val) => updateField("description", val)}
                readOnly={isEdit}
              />
            </View>
          </View>

          <View style={styles.separator} />

          {/* Section 2: Location */}
          <View style={styles.section}>
            <SectionHeading icon={MapPin} title="Location" />

            <View style={styles.field}>
              <FieldLabel required>City & Area</FieldLabel>
              {isEdit ? (
                <ReadOnlyDisplay>
                  {[form.area, form.city].filter(Boolean).join(", ")}
                </ReadOnlyDisplay>
              ) : (
                <>
                  <LocationAutocomplete
                    city={form.city}
                    area={form.area}
                    error={errors.city}
                    onSelect={({ city, area, lat, lng }) => {
                      setForm((p) => ({
                        ...p,
                        city: city || "",
                        area: area || "",
                        ...(lat != null ? { lat, lng } : {}),
                      }));
                      if (errors.city)
                        setErrors((p) => ({ ...p, city: null }));
                    }}
                  />
                  <FieldError message={errors.city} />
                </>
              )}
              {form.lat && form.lng ? (
                <View style={styles.coordRow}>
                  <MapPinned size={11} color={PRIMARY_COLOR} />
                  <Text style={styles.coordText}>
                    Coordinates: {Number(form.lat).toFixed(4)},{" "}
                    {Number(form.lng).toFixed(4)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <FieldLabel>Street Address</FieldLabel>
              <TextInput
                value={form.address}
                onChangeText={(v) => updateField("address", v)}
                placeholder="e.g. 123, Main Road"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
              />
            </View>
          </View>

          <View style={styles.separator} />

          {/* Section 3: Sports & Turfs */}
          <View style={styles.section}>
            <SectionHeading icon={Dumbbell} title="Sports & Turfs" />

            <View style={styles.field}>
              <FieldLabel required>Select Sports</FieldLabel>
              <SportChipSelector
                selected={form.sports}
                onChange={handleSportsChange}
              />
              <FieldError message={errors.sports} />
            </View>

            {form.turf_config?.length > 0 ? (
              <View style={styles.field}>
                <FieldLabel>Turf Configuration</FieldLabel>
                <Text style={styles.fieldHelp}>
                  Set name, price, and base-price turf per sport.
                </Text>
                <TurfConfigPanel
                  turfConfig={form.turf_config}
                  baseTurf={baseTurf}
                  onConfigChange={(config) =>
                    updateField("turf_config", config)
                  }
                  onBaseTurfChange={setBaseTurf}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.separator} />

          {/* Section 4: Amenities */}
          <View style={styles.section}>
            <SectionHeading icon={Sparkles} title="Amenities" />
            <View style={styles.field}>
              <FieldLabel>Select Amenities</FieldLabel>
              <AmenityChipSelector
                selected={form.amenities}
                onChange={(val) => updateField("amenities", val)}
              />
            </View>
          </View>

          <View style={styles.separator} />

          {/* Section 5: Schedule */}
          <View style={styles.section}>
            <SectionHeading icon={Settings} title="Schedule & Settings" />
            <HoursSelector
              openingHour={form.opening_hour}
              closingHour={form.closing_hour}
              onOpeningChange={(v) => updateField("opening_hour", v)}
              onClosingChange={(v) => updateField("closing_hour", v)}
              slotDurationMinutes={form.slot_duration_minutes}
              onSlotDurationChange={(v) =>
                updateField("slot_duration_minutes", v)
              }
            />
            <FieldError message={errors.hours} />
          </View>

          <View style={styles.separator} />

          {/* Section 6: Location & Media (matches frontend label) */}
          <View style={styles.section}>
            <SectionHeading icon={ImageIcon} title="Location & Media" />

            <View style={styles.field}>
              <FieldLabel>
                <View style={styles.inlineLabel}>
                  <Globe size={11} color={PRIMARY_COLOR} />
                  <Text style={styles.fieldLabel}>
                    {"  "}Google Maps Embed Link
                  </Text>
                </View>
              </FieldLabel>
              <TextInput
                value={form.google_maps_url || ""}
                onChangeText={(v) => updateField("google_maps_url", v)}
                placeholder="Paste Google Maps <iframe> or URL"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                autoCapitalize="none"
              />
              <Text style={styles.proTip}>
                <Text style={{ color: PRIMARY_COLOR, fontWeight: "900" }}>
                  Pro Tip:{" "}
                </Text>
                Google Maps → Share → Embed a map → Copy HTML.
              </Text>
            </View>

            <View style={styles.field}>
              <VenueImageUpload
                images={form.images || []}
                onChange={(imgs) => updateField("images", imgs)}
              />
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Sticky footer — Cancel + primary CTA (matches frontend modal footer)
            paddingBottom accounts for Android gesture nav / iOS home indicator */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            disabled={submitting}
            activeOpacity={0.75}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnBusy]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <View style={styles.row}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitText}>Saving…</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                {isEdit ? "Save & Go Live" : "Create Venue"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
    fontWeight: "500",
  },
  headerSubtitleAccent: {
    color: PRIMARY_COLOR,
    fontWeight: "900",
  },

  scroll: { padding: 20, paddingBottom: 24 },

  section: { gap: 14 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeadingText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  field: { gap: 6 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  fieldHelp: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  fieldError: {
    marginTop: 6,
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inlineLabel: { flexDirection: "row", alignItems: "center" },

  textInput: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  inputError: { borderColor: "#EF4444" },

  readOnly: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
  },
  readOnlyText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },

  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  coordText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },

  proTip: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 16,
    padding: 10,
    backgroundColor: `${PRIMARY_COLOR}0A`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}22`,
  },

  separator: {
    height: 1,
    backgroundColor: "rgba(229, 231, 235, 0.7)",
    marginVertical: 22,
  },

  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "rgba(229, 231, 235, 0.7)",
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 13,
  },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnBusy: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
