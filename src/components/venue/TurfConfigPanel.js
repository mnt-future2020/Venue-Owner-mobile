import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";
import { getSportLabel } from "../../constants/venueConstants";

// Mirrors frontend TurfConfigPanel.js — each turf renders as a single horizontal
// row: [radio + BASE pill] [Turf name input flex-1] [₹ price] [Lobbies count]
// [delete trash]. Sport block has heading + Add Turf button on top right.
export default function TurfConfigPanel({
  turfConfig = [],
  baseTurf,
  onConfigChange,
  onBaseTurfChange,
}) {
  if (!turfConfig?.length) return null;

  const addTurf = (sport) => {
    onConfigChange(
      turfConfig.map((tc) =>
        tc.sport === sport
          ? {
              ...tc,
              turfs: [
                ...tc.turfs,
                {
                  name: `${getSportLabel(sport)} Turf ${tc.turfs.length + 1}`,
                  price: 2000,
                  lobbians: 1,
                },
              ],
            }
          : tc
      )
    );
  };

  const removeTurf = (sport, idx) => {
    onConfigChange(
      turfConfig.map((tc) =>
        tc.sport === sport
          ? { ...tc, turfs: tc.turfs.filter((_, i) => i !== idx) }
          : tc
      )
    );
  };

  const renameTurf = (sport, idx, name) => {
    onConfigChange(
      turfConfig.map((tc) =>
        tc.sport === sport
          ? {
              ...tc,
              turfs: tc.turfs.map((t, i) => (i === idx ? { ...t, name } : t)),
            }
          : tc
      )
    );
  };

  const updatePrice = (sport, idx, price) => {
    onConfigChange(
      turfConfig.map((tc) =>
        tc.sport === sport
          ? {
              ...tc,
              turfs: tc.turfs.map((t, i) =>
                i === idx ? { ...t, price: Number(price) || 0 } : t
              ),
            }
          : tc
      )
    );
  };

  const updateLobbians = (sport, idx, lobbians) => {
    onConfigChange(
      turfConfig.map((tc) =>
        tc.sport === sport
          ? {
              ...tc,
              turfs: tc.turfs.map((t, i) =>
                i === idx
                  ? { ...t, lobbians: Math.max(1, Number(lobbians) || 1) }
                  : t
              ),
            }
          : tc
      )
    );
  };

  return (
    <View style={styles.wrapper}>
      {turfConfig.map((tc) => (
        <View key={tc.sport} style={styles.sportBlock}>
          <View style={styles.sportHeader}>
            <Text style={styles.sportLabel}>{getSportLabel(tc.sport)}</Text>
            <TouchableOpacity
              onPress={() => addTurf(tc.sport)}
              style={styles.addTurfBtn}
              activeOpacity={0.8}
            >
              <Plus size={13} color={PRIMARY_COLOR} strokeWidth={2.5} />
              <Text style={styles.addTurfText}>Add Turf</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.turfList}>
            {tc.turfs.map((t, idx) => {
              const isBase = baseTurf
                ? baseTurf.sport === tc.sport && baseTurf.idx === idx
                : turfConfig[0]?.sport === tc.sport && idx === 0;
              const showDelete = tc.turfs.length > 1;

              return (
                <View key={idx} style={styles.turfRow}>
                  {/* Base radio + BASE pill */}
                  <TouchableOpacity
                    style={styles.baseGroup}
                    onPress={() =>
                      onBaseTurfChange?.({ sport: tc.sport, idx })
                    }
                    activeOpacity={0.7}
                    hitSlop={6}
                  >
                    <View
                      style={[
                        styles.radio,
                        isBase ? styles.radioActive : styles.radioInactive,
                      ]}
                    >
                      {isBase ? <View style={styles.radioInner} /> : null}
                    </View>
                    <View
                      style={[
                        styles.baseBadge,
                        isBase
                          ? styles.baseBadgeActive
                          : styles.baseBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.baseBadgeText,
                          isBase
                            ? styles.baseBadgeTextActive
                            : styles.baseBadgeTextInactive,
                        ]}
                      >
                        BASE
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Turf name (flex-1) */}
                  <TextInput
                    value={t.name || ""}
                    onChangeText={(val) => renameTurf(tc.sport, idx, val)}
                    placeholder={`Turf ${idx + 1} name`}
                    placeholderTextColor="#9CA3AF"
                    style={styles.nameInput}
                  />

                  {/* Price: ₹ + numeric input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>₹</Text>
                    <TextInput
                      value={String(t.price ?? 2000)}
                      onChangeText={(val) =>
                        updatePrice(tc.sport, idx, val)
                      }
                      keyboardType="number-pad"
                      style={[styles.numInput, styles.priceInput]}
                    />
                  </View>

                  {/* Lobbians: Lobbies + numeric input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Lobbies</Text>
                    <TextInput
                      value={String(t.lobbians ?? 1)}
                      onChangeText={(val) =>
                        updateLobbians(tc.sport, idx, val)
                      }
                      keyboardType="number-pad"
                      style={[styles.numInput, styles.lobbiesInput]}
                    />
                  </View>

                  {/* Delete (only if more than 1 turf) */}
                  {showDelete ? (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => removeTurf(tc.sport, idx)}
                      activeOpacity={0.7}
                      hitSlop={6}
                    >
                      <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  sportBlock: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "rgba(249, 250, 251, 0.6)",
    padding: 14,
    gap: 12,
  },
  sportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sportLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY_COLOR,
    textTransform: "capitalize",
  },
  // Add Turf button: outline pill matching frontend size="sm" variant="outline"
  addTurfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}55`,
    backgroundColor: "#FFFFFF",
  },
  addTurfText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: "700",
  },

  turfList: { gap: 8 },
  // Single horizontal row per turf (matches frontend sm:flex-row sm:items-center gap-2)
  turfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  baseGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: PRIMARY_COLOR },
  radioInactive: { borderColor: "#D1D5DB" },
  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
  },
  baseBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  baseBadgeActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  baseBadgeInactive: {
    backgroundColor: "transparent",
    borderColor: "rgba(229, 231, 235, 0.6)",
  },
  baseBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  baseBadgeTextActive: { color: "#FFFFFF" },
  baseBadgeTextInactive: { color: "rgba(107, 114, 128, 0.5)" },

  // Turf name input — flex-1
  nameInput: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  fieldGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  numInput: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
  },
  priceInput: { width: 60 },
  lobbiesInput: { width: 44 },

  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    flexShrink: 0,
  },
});
