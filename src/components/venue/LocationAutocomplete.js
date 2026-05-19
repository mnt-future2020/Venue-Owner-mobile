import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import {
  MapPin,
  Search,
  Navigation,
  X,
  MapPinned,
} from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import venueService from "../../services/venueService";
import toast from "../../utils/toast";

export default function LocationAutocomplete({
  city,
  area,
  error,
  onSelect,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const debounceRef = useRef(null);

  const displayValue = [area, city].filter(Boolean).join(", ");

  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const list = await venueService.placesAutocomplete(text);
      setSuggestions(Array.isArray(list) ? list : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions, open]);

  const handleSelectPlace = async (place) => {
    try {
      const details = await venueService.placeDetails(place.place_id);
      if (details?.lat && details?.lng) {
        const geo = await venueService.reverseGeocode(details.lat, details.lng);
        onSelect({
          city: geo?.city || details.city || "",
          area: place.main_text || geo?.area || "",
          lat: details.lat,
          lng: details.lng,
        });
      }
    } catch (err) {
      toast.error(
        "Place lookup failed",
        err?.response?.data?.detail || "Try again."
      );
    } finally {
      setOpen(false);
      setQuery("");
      setSuggestions([]);
    }
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        toast.error(
          "Location denied",
          "Enable location access in device settings."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = pos.coords;
      try {
        const geo = await venueService.reverseGeocode(latitude, longitude);
        onSelect({
          city: geo?.city || "",
          area: geo?.area || "",
          lat: latitude,
          lng: longitude,
        });
      } catch (err) {
        toast.error("Lookup failed", "Couldn't resolve your location.");
      }
    } catch (err) {
      toast.error("Location error", err?.message || "Try again.");
    } finally {
      setDetecting(false);
      setOpen(false);
    }
  };

  // Selected display
  if (displayValue && !open) {
    return (
      <TouchableOpacity
        style={[
          styles.selectedDisplay,
          error && styles.borderError,
        ]}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
      >
        <View style={styles.selectedLeft}>
          <MapPinned size={14} color={PRIMARY_COLOR} strokeWidth={2.2} />
          <Text style={styles.selectedText} numberOfLines={1}>
            {displayValue}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            onSelect({ city: "", area: "", lat: null, lng: null })
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={14} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View
        style={[
          styles.searchWrap,
          open && styles.searchWrapOpen,
          error && styles.borderError,
        ]}
      >
        <View style={styles.searchInputRow}>
          <Search size={14} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={(val) => {
              setQuery(val);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search city, area or place…"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setSuggestions([]);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <X size={14} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {open ? (
          <View style={styles.suggestionList}>
            <TouchableOpacity
              onPress={handleDetectLocation}
              disabled={detecting}
              style={styles.detectBtn}
              activeOpacity={0.7}
            >
              <View style={styles.detectIcon}>
                {detecting ? (
                  <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                ) : (
                  <Navigation size={14} color={PRIMARY_COLOR} strokeWidth={2.2} />
                )}
              </View>
              <Text style={styles.detectText}>
                {detecting ? "Detecting…" : "Use Current Location"}
              </Text>
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#9CA3AF" />
              </View>
            ) : null}

            {!loading && query.length >= 2 && suggestions.length === 0 ? (
              <Text style={styles.emptyText}>No places found</Text>
            ) : null}

            {!loading && !query ? (
              <Text style={styles.emptyText}>
                Type a city or area name to search
              </Text>
            ) : null}

            {!loading && suggestions.length > 0
              ? suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.place_id}
                    style={styles.suggestionRow}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPlace(s)}
                  >
                    <View style={styles.suggestionIcon}>
                      <MapPin size={13} color="#9CA3AF" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {s.main_text}
                      </Text>
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {s.secondary_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedDisplay: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  selectedText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  borderError: { borderColor: "#EF4444" },

  searchWrap: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  searchWrapOpen: { borderColor: PRIMARY_COLOR, borderRadius: 18 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  suggestionList: {
    maxHeight: 260,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  detectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  detectIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  detectText: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },

  loadingRow: { paddingVertical: 14, alignItems: "center" },
  emptyText: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionMain: { fontSize: 13, fontWeight: "700", color: "#111827" },
  suggestionSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
});
