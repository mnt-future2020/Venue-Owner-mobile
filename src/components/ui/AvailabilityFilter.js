import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar, ChevronLeft, ChevronRight, Clock, Search, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = i;
  const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  return { value: `${String(h).padStart(2, "0")}:00`, label };
});

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function AvailabilityFilter({ visible, onClose, onSubmit, initialDate, initialStartTime, initialEndTime }) {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(initialDate || null);
  const [startTime, setStartTime] = useState(initialStartTime || null);
  const [endTime, setEndTime] = useState(initialEndTime || null);

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const days = [];
    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth]);

  const handleTimeSlotClick = useCallback((value) => {
    if (!startTime || (startTime && endTime)) {
      // First click or reset
      setStartTime(value);
      setEndTime(null);
    } else if (value === startTime) {
      // Same slot — clear
      setStartTime(null);
      setEndTime(null);
    } else if (value > startTime) {
      // Valid end time
      setEndTime(value);
    } else {
      // Clicked before start — reset to new start
      setStartTime(value);
      setEndTime(null);
    }
  }, [startTime, endTime]);

  const isDatePast = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr < todayStr;
  };

  const isDateBeyondMax = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > maxDate;
  };

  const formatDateStr = (day) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isToday = (day) => formatDateStr(day) === todayStr;

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const hintText = !startTime ? "Tap start time" : !endTime ? "Now tap end time" : `${startTime} – ${endTime}`;

  const summaryText = useMemo(() => {
    if (!selectedDate) return "Select a date to check availability";
    const d = new Date(selectedDate + "T00:00:00");
    const dateLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (startTime && endTime) {
      const fmt = (t) => { const h = parseInt(t); return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`; };
      return `${dateLabel} · ${fmt(startTime)} – ${fmt(endTime)}`;
    }
    return dateLabel;
  }, [selectedDate, startTime, endTime]);

  const hasSelection = !!selectedDate;
  const hasChanges = selectedDate !== initialDate || startTime !== initialStartTime || endTime !== initialEndTime;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Drag handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X size={16} color="#64748B" />
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
            <Text style={s.title}>Check Availability</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Calendar Section */}
            <View style={s.sectionHeader}>
              <Calendar size={14} color="#64748B" />
              <Text style={s.sectionLabel}>SELECT DATE</Text>
            </View>

            <View style={s.calendarCard}>
              {/* Month nav */}
              <View style={s.monthNav}>
                <TouchableOpacity onPress={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }} disabled={!canGoPrev} style={[s.monthNavBtn, !canGoPrev && { opacity: 0.3 }]}>
                  <ChevronLeft size={18} color="#334155" />
                </TouchableOpacity>
                <Text style={s.monthLabel}>{monthLabel}</Text>
                <TouchableOpacity onPress={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }} disabled={!canGoNext} style={[s.monthNavBtn, !canGoNext && { opacity: 0.3 }]}>
                  <ChevronRight size={18} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={s.weekRow}>
                {WEEKDAYS.map((d) => (
                  <Text key={d} style={s.weekDay}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={s.dayGrid}>
                {calendarDays.map((day, idx) => {
                  if (day === null) return <View key={`e-${idx}`} style={s.dayCell} />;
                  const dateStr = formatDateStr(day);
                  const past = isDatePast(day);
                  const beyond = isDateBeyondMax(day);
                  const disabled = past || beyond;
                  const selected = selectedDate === dateStr;
                  const todayMark = isToday(day);
                  return (
                    <TouchableOpacity
                      key={dateStr}
                      style={[s.dayCell, selected && s.dayCellSelected]}
                      disabled={disabled}
                      onPress={() => setSelectedDate(selected ? null : dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.dayText, disabled && s.dayTextDisabled, selected && s.dayTextSelected]}>{day}</Text>
                      {todayMark && !selected && <View style={s.todayDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Section */}
            <View style={s.sectionHeader}>
              <Clock size={14} color="#64748B" />
              <Text style={s.sectionLabel}>SELECT TIME RANGE</Text>
              <View style={{ flex: 1 }} />
              <Text style={s.hintText}>{hintText}</Text>
            </View>

            <View style={s.timeGrid}>
              {TIME_SLOTS.map((slot) => {
                const isStart = startTime === slot.value;
                const isEnd = endTime === slot.value;
                const isInRange = startTime && endTime && slot.value > startTime && slot.value < endTime;
                return (
                  <TouchableOpacity
                    key={slot.value}
                    style={[s.timeSlot, (isStart || isEnd) && s.timeSlotActive, isInRange && s.timeSlotRange]}
                    onPress={() => handleTimeSlotClick(slot.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.timeSlotText, (isStart || isEnd) && s.timeSlotTextActive, isInRange && { color: PRIMARY_COLOR, fontWeight: "600" }]}>{slot.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.summaryText} numberOfLines={1}>{summaryText}</Text>
            <TouchableOpacity
              style={[s.submitBtn, (!hasSelection || !hasChanges) && { opacity: 0.4 }]}
              disabled={!hasSelection || !hasChanges}
              onPress={() => onSubmit(selectedDate, startTime, endTime)}
            >
              <Search size={14} color="#FFF" />
              <Text style={s.submitBtnText}>Check Availability</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginTop: 10, marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  closeBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  closeBtnText: { fontSize: 13, fontWeight: "500", color: "#64748B" },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A" },

  // Section
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 },
  hintText: { fontSize: 11, fontWeight: "600", color: PRIMARY_COLOR },

  // Calendar
  calendarCard: { marginHorizontal: 16, backgroundColor: "#FAFBFC", borderRadius: 14, borderWidth: 1, borderColor: "#F1F5F9", padding: 12 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthNavBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#94A3B8" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  dayCellSelected: { backgroundColor: PRIMARY_COLOR, borderRadius: 20 },
  dayText: { fontSize: 14, fontWeight: "500", color: "#0F172A" },
  dayTextDisabled: { color: "#CBD5E1" },
  dayTextSelected: { color: "#FFF", fontWeight: "700" },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#3B82F6", marginTop: 2 },

  // Time grid
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16 },
  timeSlot: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FAFBFC", width: "15.5%", alignItems: "center" },
  timeSlotActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  timeSlotRange: { backgroundColor: `${PRIMARY_COLOR}15`, borderColor: `${PRIMARY_COLOR}60` },
  timeSlotText: { fontSize: 11, fontWeight: "500", color: "#334155" },
  timeSlotTextActive: { color: "#FFF", fontWeight: "700" },

  // Footer
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  summaryText: { fontSize: 11, color: "#94A3B8", flex: 1, marginRight: 12 },
  submitBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: PRIMARY_COLOR, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  submitBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
});
