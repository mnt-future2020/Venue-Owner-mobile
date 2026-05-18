import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { PRIMARY_COLOR } from "../../constants/theme";
import { useLocation } from "../../context/LocationContext";
import playerService from "../../services/playerService";
import toast from "../../utils/toast";

function LocationPickerModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { location, setLocation, clearLocation } = useLocation();
  const [detecting, setDetecting] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const [kbVisible, setKbVisible] = useState(false);

  useEffect(() => {
    const s1 = Keyboard.addListener("keyboardDidShow", () => setKbVisible(true));
    const s2 = Keyboard.addListener("keyboardDidHide", () => setKbVisible(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  /* ── GPS detect ── */
  const detectLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const { requestPermission } = require("../../utils/permissions");
      const granted = await requestPermission(
        () => ExpoLocation.requestForegroundPermissionsAsync(),
        "Location"
      );
      if (!granted) {
        setDetecting(false);
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const geo = await playerService.reverseGeocode(latitude, longitude);

      const city = geo?.city || geo?.locality || "";
      const displayName =
        geo?.display_name ||
        (geo?.area ? `${geo.area}, ${city}` : city) ||
        "My Location";

      const locationData = {
        city,
        lat: latitude,
        lng: longitude,
        name: displayName,
      };
      await setLocation(locationData);
      toast.success(`Location: ${displayName}`);
      onClose();
    } catch {
      toast.error("Failed to detect location");
    } finally {
      setDetecting(false);
    }
  }, [setLocation, onClose]);

  /* ── Search autocomplete ── */
  const handleSearch = useCallback((text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await playerService.placesAutocomplete(text);
        setSuggestions(
          Array.isArray(results) ? results : results?.predictions || []
        );
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  /* ── Select a place ── */
  const selectPlace = useCallback(
    async (place) => {
      try {
        const details = await playerService.placeDetails(place.place_id);
        const name =
          place.structured_formatting?.main_text || place.description || "";
        const locationData = {
          city: details?.city || name,
          lat: details?.lat || details?.latitude || 0,
          lng: details?.lng || details?.longitude || 0,
          name: place.description || name,
        };
        await setLocation(locationData);
        toast.success(`Location: ${name}`);
        setQuery("");
        setSuggestions([]);
        onClose();
      } catch {
        toast.error("Failed to get location details");
      }
    },
    [setLocation, onClose]
  );

  const renderSuggestion = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.suggestionItem}
        activeOpacity={0.7}
        onPress={() => selectPlace(item)}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color="#64748B"
          style={styles.suggestionIcon}
        />
        <View style={styles.suggestionTextWrap}>
          <Text style={styles.suggestionMain} numberOfLines={1}>
            {item.structured_formatting?.main_text || item.description}
          </Text>
          {item.structured_formatting?.secondary_text ? (
            <Text style={styles.suggestionSub} numberOfLines={1}>
              {item.structured_formatting.secondary_text}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [selectPlace]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, kbVisible && { justifyContent: "flex-start" }]}>
        <View
          style={[
            styles.sheet,
            {
              paddingTop: insets.top + 12,
              paddingBottom: Math.max(insets.bottom, 8) + 8,
            },
            kbVisible ? { flex: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0 } : { maxHeight: "85%" },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Set Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Current Location — hide when keyboard open to save space */}
          {!kbVisible && location && (
            <View style={styles.currentLocationBar}>
              <Ionicons name="location" size={16} color={PRIMARY_COLOR} />
              <Text style={styles.currentLocationText} numberOfLines={1}>
                {location.name || location.city}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await clearLocation();
                  onClose();
                }}
                style={styles.currentLocationClear}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* GPS Detect — hide when keyboard open */}
          {!kbVisible && (
            <>
              <TouchableOpacity
                style={styles.detectBtn}
                activeOpacity={0.85}
                onPress={detectLocation}
                disabled={detecting}
              >
                {detecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#FFFFFF" />
                    <Text style={styles.detectBtnText}>Use my current location</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or search</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city, area, or place..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : query.length > 0 ? (
              <TouchableOpacity onPress={() => { setQuery(""); setSuggestions([]); }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Suggestions */}
          <FlatList
            data={suggestions}
            keyExtractor={(item, i) => item.place_id || String(i)}
            renderItem={renderSuggestion}
            style={styles.suggestionList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.length >= 2 && !searching ? (
                <Text style={styles.noResults}>No results found</Text>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export default memo(LocationPickerModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  currentLocationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  currentLocationClear: {
    padding: 2,
  },
  detectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    height: 48,
    borderRadius: 14,
    marginBottom: 16,
  },
  detectBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },
  suggestionList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  suggestionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  noResults: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 24,
  },
});
