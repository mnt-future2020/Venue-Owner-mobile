import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CELL_SIZE = Math.floor((Dimensions.get("window").width - 48 - 24) / 7);

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

function toDateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function formatDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarPicker({
  label,
  value,
  onChange,
  minDate,
  required = false,
}) {
  const [visible, setVisible] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const min = minDate != null ? minDate : todayStr;

  const initialMonth = value
    ? { year: parseInt(value.split("-")[0]), month: parseInt(value.split("-")[1]) - 1 }
    : { year: today.getFullYear(), month: today.getMonth() };

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    return result;
  }, [viewYear, viewMonth]);

  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    const list = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) list.push(y);
    return list;
  }, []);

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleSelect = (day) => {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    if (dateStr < min) return;
    onChange?.(dateStr);
    setVisible(false);
    setYearPickerOpen(false);
  };

  const handleYearSelect = (year) => {
    setViewYear(year);
    setYearPickerOpen(false);
  };

  const handleMonthSelect = (monthIdx) => {
    setViewMonth(monthIdx);
    setYearPickerOpen(false);
  };

  return (
    <>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      <TouchableOpacity
        style={styles.trigger}
        activeOpacity={0.8}
        onPress={() => {
          if (value) {
            setViewYear(parseInt(value.split("-")[0]));
            setViewMonth(parseInt(value.split("-")[1]) - 1);
          }
          setYearPickerOpen(false);
          setVisible(true);
        }}
      >
        <Calendar size={16} color="#64748B" />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value ? formatDisplay(value) : "Select date"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => { setVisible(false); setYearPickerOpen(false); }}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { setVisible(false); setYearPickerOpen(false); }}
        >
          <View style={styles.card} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setYearPickerOpen(false); }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Month/Year nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
                <ChevronLeft size={20} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setYearPickerOpen(!yearPickerOpen)}
                style={styles.monthYearBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.monthLabel}>
                  {MONTH_NAMES_FULL[viewMonth]} {viewYear}
                </Text>
                <Text style={styles.dropdownArrow}>{yearPickerOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goNext} style={styles.navBtn}>
                <ChevronRight size={20} color="#334155" />
              </TouchableOpacity>
            </View>

            {yearPickerOpen ? (
              /* Year + Month picker */
              <View style={styles.yearMonthPicker}>
                {/* Year list */}
                <FlatList
                  data={years}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yearList}
                  initialScrollIndex={years.indexOf(viewYear)}
                  getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
                  keyExtractor={(item) => String(item)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.yearChip, item === viewYear && styles.yearChipActive]}
                      onPress={() => handleYearSelect(item)}
                    >
                      <Text style={[styles.yearChipText, item === viewYear && styles.yearChipTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                {/* Month grid */}
                <View style={styles.monthGrid}>
                  {MONTH_NAMES.map((m, idx) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthChip, idx === viewMonth && styles.monthChipActive]}
                      onPress={() => handleMonthSelect(idx)}
                    >
                      <Text style={[styles.monthChipText, idx === viewMonth && styles.monthChipTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <>
                {/* Day names */}
                <View style={styles.dayNamesRow}>
                  {DAY_NAMES.map((d) => (
                    <View key={d} style={styles.dayNameCell}>
                      <Text style={styles.dayName}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar grid */}
                <View style={styles.grid}>
                  {days.map((day, idx) => {
                    if (day === null) {
                      return <View key={`e-${idx}`} style={styles.cell} />;
                    }
                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const isPast = dateStr < min;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === value;

                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={styles.cell}
                        disabled={isPast}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(day)}
                      >
                        <View
                          style={[
                            styles.cellInner,
                            isToday && !isSelected && styles.cellToday,
                            isSelected && styles.cellSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cellText,
                              isPast && styles.cellTextPast,
                              isToday && !isSelected && styles.cellTextToday,
                              isSelected && styles.cellTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Today shortcut */}
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.todayBtn}
                    onPress={() => handleSelect(today.getDate())}
                    disabled={todayStr < min}
                  >
                    <Text style={styles.todayBtnText}>Today</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  triggerPlaceholder: {
    color: "#94A3B8",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  monthYearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  dropdownArrow: {
    fontSize: 10,
    color: "#64748B",
  },
  dayNamesRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  dayNameCell: {
    width: CELL_SIZE,
    alignItems: "center",
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  cellInner: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    borderRadius: (CELL_SIZE - 6) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellToday: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  cellSelected: {
    backgroundColor: PRIMARY_COLOR,
  },
  cellText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  cellTextPast: {
    color: "#D1D5DB",
  },
  cellTextToday: {
    color: PRIMARY_COLOR,
    fontWeight: "800",
  },
  cellTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  todayBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  // Year/Month picker
  yearMonthPicker: {
    paddingVertical: 12,
    gap: 16,
  },
  yearList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  yearChip: {
    width: 56,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  yearChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  yearChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  monthChip: {
    width: "30%",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  monthChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  monthChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
