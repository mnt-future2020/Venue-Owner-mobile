import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Calendar, Clock, MapPin } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import venueService from "../../services/venueService";
import CalendarPicker from "../ui/CalendarPicker";
import toast from "../../utils/toast";

/**
 * SlotPicker — Phase 5 walk-in step 1
 *
 * Props:
 *  - venues: array of owner venues
 *  - selected: { venue, date, sport, slot } (slot = { start_time, end_time, turf_number, turf_name, sport, price })
 *  - onChange: (next) => void   // partial merge of selected
 */
const todayStr = () => {
  const d = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmt12h = (hhmm) => {
  if (!hhmm) return "";
  const [hh, mm] = hhmm.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
};

export default function SlotPicker({ venues = [], selected = {}, onChange }) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const venue = selected.venue || (venues.length === 1 ? venues[0] : null);
  const date = selected.date || todayStr();
  const sport = selected.sport || "";
  const slot = selected.slot || null;

  // Pull list of distinct sports available at this venue (from returned slots
  // or from venue.turf_config). The slot list also encodes sport per turf.
  const sportOptions = useMemo(() => {
    const list = new Set();
    (slots || []).forEach((s) => {
      if (s.sport) list.add(s.sport);
    });
    // Fallback to venue.turf_config sports if list is empty
    if (list.size === 0 && venue?.turf_config?.length) {
      venue.turf_config.forEach((tc) => tc.sport && list.add(tc.sport));
    }
    return Array.from(list);
  }, [slots, venue]);

  const setVenue = useCallback(
    (v) => {
      onChange?.({ venue: v, slot: null });
    },
    [onChange],
  );

  const setDate = useCallback(
    (d) => {
      onChange?.({ date: d, slot: null });
    },
    [onChange],
  );

  const setSport = useCallback(
    (sp) => {
      onChange?.({ sport: sp, slot: null });
    },
    [onChange],
  );

  const pickSlot = useCallback(
    (s) => {
      onChange?.({ slot: s, sport: s.sport || sport });
    },
    [onChange, sport],
  );

  // Load slot list whenever venue or date changes
  useEffect(() => {
    if (!venue?.id || !date) return;
    let active = true;
    setLoading(true);
    venueService
      .getSlots(venue.id, date)
      .then((res) => {
        if (!active) return;
        setSlots(Array.isArray(res?.slots) ? res.slots : []);
      })
      .catch((err) => {
        if (!active) return;
        setSlots([]);
        toast.error(
          "Could not load slots",
          err?.response?.data?.detail || "Try again.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [venue?.id, date]);

  // Filtered slot list — only available + matching sport
  const visibleSlots = useMemo(() => {
    return (slots || []).filter((s) => {
      if (s.status !== "available") return false;
      if (sport && s.sport && s.sport !== sport) return false;
      return true;
    });
  }, [slots, sport]);

  // Group visible slots by start_time → turfs available
  const slotsByTime = useMemo(() => {
    const map = new Map();
    visibleSlots.forEach((s) => {
      const key = s.start_time;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleSlots]);

  return (
    <View style={styles.wrapper}>
      {/* Venue chip selector */}
      {venues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Venue</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {venues.map((v) => {
              const active = v.id === venue?.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setVenue(v)}
                  activeOpacity={0.8}
                >
                  <MapPin
                    size={12}
                    color={active ? "#FFFFFF" : "#6B7280"}
                    strokeWidth={2.4}
                  />
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                    numberOfLines={1}
                  >
                    {v.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Date */}
      <View style={styles.section}>
        <CalendarPicker label="Date" value={date} onChange={setDate} />
      </View>

      {/* Sport selector (chips) */}
      {sportOptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sport</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            <TouchableOpacity
              style={[styles.chip, !sport && styles.chipActive]}
              onPress={() => setSport("")}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, !sport && styles.chipTextActive]}
              >
                All
              </Text>
            </TouchableOpacity>
            {sportOptions.map((sp) => {
              const active = sport === sp;
              return (
                <TouchableOpacity
                  key={sp}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSport(sp)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {sp}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Time + turf selector */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Clock size={14} color="#6B7280" strokeWidth={2.4} />
          <Text style={styles.sectionLabel}>Available Slots</Text>
        </View>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading slots…</Text>
          </View>
        ) : slotsByTime.length === 0 ? (
          <View style={styles.emptyBox}>
            <Calendar size={26} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {venue
                ? "No available slots for this date / sport."
                : "Select a venue first."}
            </Text>
          </View>
        ) : (
          slotsByTime.map(([start, list]) => (
            <View key={start} style={styles.timeBlock}>
              <Text style={styles.timeLabel}>
                {fmt12h(start)} – {fmt12h(list[0].end_time)}
              </Text>
              <View style={styles.turfRow}>
                {list.map((s) => {
                  const active =
                    slot?.start_time === s.start_time &&
                    slot?.turf_number === s.turf_number;
                  return (
                    <TouchableOpacity
                      key={`${s.start_time}-${s.turf_number}`}
                      style={[styles.turfChip, active && styles.turfChipActive]}
                      onPress={() => pickSlot(s)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.turfChipText,
                          active && styles.turfChipTextActive,
                        ]}
                      >
                        {s.turf_name || `Turf ${s.turf_number}`}
                      </Text>
                      <Text
                        style={[
                          styles.turfChipPrice,
                          active && styles.turfChipPriceActive,
                        ]}
                      >
                        ₹{s.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  section: { marginBottom: 16 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  chipsRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    maxWidth: 200,
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipTextActive: { color: "#FFFFFF" },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 24,
  },
  loadingText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  emptyBox: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  timeBlock: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 18,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  turfRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  turfChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  turfChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  turfChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  turfChipTextActive: { color: "#FFFFFF" },
  turfChipPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: PRIMARY_COLOR,
  },
  turfChipPriceActive: { color: "#FFFFFF" },
});
