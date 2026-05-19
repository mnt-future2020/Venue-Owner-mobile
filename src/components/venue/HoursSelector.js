import { View, Text, Switch, StyleSheet } from "react-native";
import { Clock, Moon } from "lucide-react-native";
import DropdownSelect from "../ui/DropdownSelect";
import { PRIMARY_COLOR } from "../../constants/theme";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => ({
  key: String(h),
  label: String(h),
}));

const AMPM = [
  { key: "AM", label: "AM" },
  { key: "PM", label: "PM" },
];

export function to12h(h24) {
  const isNextDay = h24 > 24;
  const effective = isNextDay ? h24 - 24 : h24;
  if (effective === 24 || effective === 0)
    return { hour: 12, ampm: "AM", isNextDay: h24 > 23 };
  const ampm = effective >= 12 ? "PM" : "AM";
  let h = effective % 12;
  if (h === 0) h = 12;
  return { hour: h, ampm, isNextDay };
}

export function to24h(h12, ampm) {
  let h = h12 % 12;
  if (ampm === "PM") h += 12;
  return h;
}

export function closingTo24h(h12, ampm, isOvernight = false) {
  let val = to24h(h12, ampm);
  if (val === 0) val = 24;
  if (isOvernight && val <= 12) val += 24;
  return val;
}

function formatHourLabel(h24) {
  const { hour, ampm } = to12h(h24);
  return `${hour}:00 ${ampm}`;
}

export default function HoursSelector({
  openingHour = 6,
  closingHour = 23,
  onOpeningChange,
  onClosingChange,
  slotDurationMinutes = 60,
  onSlotDurationChange,
}) {
  const opening = to12h(openingHour);
  const closing = to12h(closingHour);
  const isOvernight = closingHour > 24;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Opening hour */}
        <View style={styles.col}>
          <View style={styles.labelRow}>
            <Clock size={12} color={PRIMARY_COLOR} strokeWidth={2.4} />
            <Text style={styles.label}>Opening</Text>
          </View>
          <View style={styles.dropRow}>
            <View style={{ flex: 1, zIndex: 30 }}>
              <DropdownSelect
                value={String(opening.hour)}
                options={HOURS}
                onSelect={(val) =>
                  onOpeningChange(to24h(Number(val), opening.ampm))
                }
              />
            </View>
            <View style={{ width: 86, zIndex: 30 }}>
              <DropdownSelect
                value={opening.ampm}
                options={AMPM}
                onSelect={(val) => onOpeningChange(to24h(opening.hour, val))}
              />
            </View>
          </View>
        </View>

        {/* Closing hour */}
        <View style={styles.col}>
          <View style={styles.labelRow}>
            <Clock size={12} color={PRIMARY_COLOR} strokeWidth={2.4} />
            <Text style={styles.label}>Closing</Text>
          </View>
          <View style={styles.dropRow}>
            <View style={{ flex: 1, zIndex: 20 }}>
              <DropdownSelect
                value={String(closing.hour)}
                options={HOURS}
                onSelect={(val) =>
                  onClosingChange(
                    closingTo24h(Number(val), closing.ampm, isOvernight)
                  )
                }
              />
            </View>
            <View style={{ width: 86, zIndex: 20 }}>
              <DropdownSelect
                value={closing.ampm}
                options={AMPM}
                onSelect={(val) =>
                  onClosingChange(closingTo24h(closing.hour, val, isOvernight))
                }
              />
            </View>
          </View>
        </View>
      </View>

      {/* Overnight toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Moon size={14} color={PRIMARY_COLOR} strokeWidth={2.2} />
          <View>
            <Text style={styles.toggleLabel}>Overnight venue</Text>
            <Text style={styles.toggleSub}>Closes next day</Text>
          </View>
        </View>
        <Switch
          value={isOvernight}
          onValueChange={(checked) => {
            const base = to24h(closing.hour, closing.ampm);
            const val = base === 0 ? 24 : base;
            if (checked) {
              onClosingChange(Math.min(val + 24, 30));
            } else {
              onClosingChange(val);
            }
          }}
          trackColor={{ false: "#E5E7EB", true: `${PRIMARY_COLOR}80` }}
          thumbColor={isOvernight ? PRIMARY_COLOR : "#F9FAFB"}
        />
      </View>

      {/* Slot duration */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Clock size={14} color={PRIMARY_COLOR} strokeWidth={2.2} />
          <View>
            <Text style={styles.toggleLabel}>30-minute slots</Text>
            <Text style={styles.toggleSub}>Allow half-hour bookings</Text>
          </View>
        </View>
        <Switch
          value={slotDurationMinutes === 30}
          onValueChange={(checked) =>
            onSlotDurationChange?.(checked ? 30 : 60)
          }
          trackColor={{ false: "#E5E7EB", true: `${PRIMARY_COLOR}80` }}
          thumbColor={slotDurationMinutes === 30 ? PRIMARY_COLOR : "#F9FAFB"}
        />
      </View>

      {isOvernight ? (
        <View style={styles.banner}>
          <Moon size={14} color={PRIMARY_COLOR} strokeWidth={2.2} />
          <Text style={styles.bannerText}>
            Venue operates from{" "}
            <Text style={styles.bannerBold}>{formatHourLabel(openingHour)}</Text>{" "}
            to{" "}
            <Text style={styles.bannerBold}>
              {formatHourLabel(closingHour)} (Next Day)
            </Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  dropRow: { flexDirection: "row", gap: 6 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toggleLabel: { fontSize: 13, fontWeight: "800", color: "#111827" },
  toggleSub: { fontSize: 10, color: "#9CA3AF", marginTop: 1 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: `${PRIMARY_COLOR}0F`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}33`,
  },
  bannerText: { flex: 1, fontSize: 12, color: "#047857", lineHeight: 16 },
  bannerBold: { fontWeight: "900", color: "#065F46" },
});
