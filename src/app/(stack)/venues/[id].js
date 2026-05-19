import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  CheckCheck,
  Clock,
  XCircle,
  BarChart3,
  BarChart2,
  ArrowUpDown,
  Search,
  X,
  Camera,
  Upload,
  ImagePlus,
  ClipboardList,
  Users,
  IndianRupee,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getSportIconName } from "../../../constants/venueConstants";

import { PRIMARY_COLOR, FONTS } from "../../../constants/theme";
import venueService from "../../../services/venueService";
import bookingService from "../../../services/bookingService";
import toast from "../../../utils/toast";

import StatCard from "../../../components/dashboard/StatCard";
import EmptyState from "../../../components/ui/EmptyState";
import DropdownSelect from "../../../components/ui/DropdownSelect";
import DateRangeFilter from "../../../components/dashboard/DateRangeFilter";
import BookingRow from "../../../components/booking/BookingRow";
import BookingDetailSheet from "../../../components/booking/BookingDetailSheet";
import WalkInBookingModal from "../../../components/walkin/WalkInBookingModal";
import HoldRulesPanel from "../../../components/venue/HoldRulesPanel";
import QRScanner from "../../../components/checkin/QRScanner";
import CheckinConfirmCard from "../../../components/checkin/CheckinConfirmCard";

const PAGE_LIMIT = 15;

// ───────────── helpers ─────────────
function pad2(n) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmt12h(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return hhmm || "";
  const [hStr, mStr = "00"] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr.padStart(2, "0")} ${period}`;
}

// Same QR booking-id extractor used by the standalone check-in screen.
function extractBookingId(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("HORIZON_CHECKIN:")) {
    const parts = trimmed.split(":");
    if (parts.length >= 2 && parts[1]) return parts[1];
  }
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidLike.test(trimmed)) return trimmed;
  try {
    const decoded =
      typeof atob === "function"
        ? atob(trimmed)
        : Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.startsWith("HORIZON_CHECKIN:")) {
      const parts = decoded.split(":");
      if (parts.length >= 2 && parts[1]) return parts[1];
    }
    if (uuidLike.test(decoded)) return decoded;
  } catch {
    /* ignore */
  }
  return trimmed;
}

// ───────────── Venue Management screen ─────────────
// Frontend has no per-venue detail page — the single Venue Management screen
// at (tabs)/venues.js drives everything via a venue dropdown. If anyone lands
// here from a stale link, redirect them back to the manage screen.
export default function VenueDetailRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/venues");
  }, [router]);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.loading}>
        <ActivityIndicator color={PRIMARY_COLOR} />
      </View>
    </SafeAreaView>
  );
}


// ───────────── ModePill (segmented control) ─────────────
function ModePill({ options, value, onChange, inline = false }) {
  return (
    <View style={[tabStyles.modePillRow, inline && tabStyles.modePillRowInline]}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            style={[
              tabStyles.modePill,
              inline && tabStyles.modePillInline,
              active && tabStyles.modePillActive,
            ]}
          >
            {opt.icon ? (
              <View style={{ marginRight: 4 }}>
                {opt.icon(active)}
              </View>
            ) : null}
            <Text
              style={[
                tabStyles.modePillText,
                active ? tabStyles.modePillTextActive : tabStyles.modePillTextInactive,
              ]}
            >
              {opt.label}
            </Text>
            {opt.badge ? (
              <View style={tabStyles.modePillBadge}>
                <Text style={tabStyles.modePillBadgeText}>{opt.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ───────────── BOOKINGS sub-tab ─────────────
export function BookingsTab({ venueId }) {
  const [view, setView] = useState("list");
  const [status, setStatus] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [localQuery, setLocalQuery] = useState("");

  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchInFlight = useRef(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (localQuery !== searchQuery) setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  const buildParams = useCallback(
    (pg) => {
      const p = {
        page: pg,
        limit: PAGE_LIMIT,
        sort_order: sortOrder,
      };
      if (status && status !== "all") p.status = status;
      if (timeFilter && timeFilter !== "all") p.time_filter = timeFilter;
      if (searchQuery?.trim()) p.q = searchQuery.trim();
      if (venueId) p.venue_id = venueId;
      return p;
    },
    [status, timeFilter, sortOrder, searchQuery, venueId]
  );

  const fetchPage = useCallback(
    async (pg, { append = false, isRefresh = false } = {}) => {
      if (fetchInFlight.current) return;
      fetchInFlight.current = true;
      if (!append && !isRefresh) setLoading(true);
      if (append) setLoadingMore(true);
      try {
        const params = buildParams(pg);
        const data = await bookingService.list(params);
        const list = Array.isArray(data?.bookings) ? data.bookings : [];
        setBookings((prev) => (append ? [...prev, ...list] : list));
        setStats(data?.stats || {});
        setTotalPages(data?.pages || 1);
        setPage(pg);
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || "Failed to load bookings";
        toast.error(typeof msg === "string" ? msg : "Failed to load bookings");
      } finally {
        fetchInFlight.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, timeFilter, sortOrder, searchQuery, venueId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, { isRefresh: true });
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (loading || loadingMore || refreshing) return;
    if (page >= totalPages) return;
    fetchPage(page + 1, { append: true });
  }, [loading, loadingMore, refreshing, page, totalPages, fetchPage]);

  const onSheetChanged = useCallback(() => {
    fetchPage(1, { isRefresh: true });
  }, [fetchPage]);

  // Timeline view: group by date
  const grouped = useMemo(() => {
    if (view !== "timeline") return [];
    const map = new Map();
    bookings.forEach((b) => {
      const key = b.date || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    });
    const sorted = Array.from(map.entries());
    sorted.sort(([a], [b]) =>
      sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
    );
    return sorted;
  }, [bookings, view, sortOrder]);

  const renderStats = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <View style={{ minWidth: 140 }}>
        <StatCard
          icon={<BarChart3 size={18} color={PRIMARY_COLOR} />}
          label="Total"
          value={String(stats?.total ?? 0)}
          bgColor={`${PRIMARY_COLOR}1A`}
        />
      </View>
      <View style={{ width: 8 }} />
      <View style={{ minWidth: 140 }}>
        <StatCard
          icon={<CheckCircle size={18} color={PRIMARY_COLOR} />}
          label="Confirmed"
          value={String(stats?.confirmed ?? 0)}
          bgColor={`${PRIMARY_COLOR}1A`}
        />
      </View>
      <View style={{ width: 8 }} />
      <View style={{ minWidth: 140 }}>
        <StatCard
          icon={<Clock size={18} color="#F59E0B" />}
          label="Pending"
          value={String(stats?.pending ?? 0)}
          bgColor="rgba(245, 158, 11, 0.10)"
        />
      </View>
      <View style={{ width: 8 }} />
      <View style={{ minWidth: 140 }}>
        <StatCard
          icon={<XCircle size={18} color="#EF4444" />}
          label="Cancelled"
          value={String(stats?.cancelled ?? 0)}
          bgColor="rgba(239, 68, 68, 0.10)"
        />
      </View>
      <View style={{ width: 8 }} />
      <View style={{ minWidth: 140 }}>
        <StatCard
          icon={<Calendar size={18} color={PRIMARY_COLOR} />}
          label="Upcoming"
          value={String(stats?.upcoming ?? 0)}
          bgColor={`${PRIMARY_COLOR}1A`}
        />
      </View>
    </ScrollView>
  );

  const STATUS_OPTS = [
    { key: "all", label: "All Status" },
    { key: "confirmed", label: "Confirmed" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "Pending" },
    { key: "cancelled", label: "Cancelled" },
  ];
  const TIME_OPTS = [
    { key: "all", label: "All Time" },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
  ];

  const renderHeader = useCallback(
    () => (
      <View>
        <View style={{ height: 12 }} />
        {renderStats()}
        <View style={{ height: 12 }} />

        {/* View Toggle + Filters row (inline, flex-wrap) — matches frontend */}
        <View style={tabStyles.filterRowWrap}>
          <ModePill
            inline
            options={[
              { key: "list", label: "List" },
              { key: "timeline", label: "Timeline" },
            ]}
            value={view}
            onChange={setView}
          />

          <View style={tabStyles.dropdownSlotStatus}>
            <DropdownSelect
              value={status}
              options={STATUS_OPTS}
              onSelect={(k) => setStatus(k)}
              placeholder="All Status"
            />
          </View>

          <View style={tabStyles.dropdownSlotTime}>
            <DropdownSelect
              value={timeFilter}
              options={TIME_OPTS}
              onSelect={(k) => setTimeFilter(k)}
              placeholder="All Time"
            />
          </View>

          <TouchableOpacity
            style={[
              tabStyles.sortBtn,
              sortOrder === "asc" && tabStyles.sortBtnActive,
            ]}
            onPress={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
            activeOpacity={0.75}
          >
            <ArrowUpDown
              size={16}
              color={sortOrder === "asc" ? "#FFFFFF" : "#0F172A"}
            />
          </TouchableOpacity>

          <View style={tabStyles.searchInputWrap}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={localQuery}
              onChangeText={setLocalQuery}
              placeholder="Search bookings…"
              placeholderTextColor="#94A3B8"
              style={tabStyles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {localQuery ? (
              <TouchableOpacity onPress={() => setLocalQuery("")} hitSlop={8}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={{ height: 8 }} />

        {/* Count line */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: FONTS.bodyMedium,
            color: "#9CA3AF",
            marginBottom: 8,
            paddingHorizontal: 16,
          }}
        >
          {loading
            ? `of ${stats?.total ?? 0} bookings`
            : `${bookings.length} of ${stats?.total ?? bookings.length} bookings`}
        </Text>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, view, status, timeFilter, sortOrder, localQuery, bookings.length, loading]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return <View style={{ height: 24 }} />;
    return (
      <View style={tabStyles.footerLoad}>
        <ActivityIndicator color={PRIMARY_COLOR} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      // Render the spinner here (instead of swapping the whole tree to a
      // separate <View>) so the search TextInput inside renderHeader stays
      // mounted while the API call is in flight — otherwise the tree swap
      // unmounts the input and the keyboard closes after one keystroke.
      return (
        <View style={tabStyles.initialLoad}>
          <ActivityIndicator color={PRIMARY_COLOR} />
        </View>
      );
    }
    return (
      <View style={{ paddingTop: 20 }}>
        <EmptyState
          icon={Calendar}
          title="No bookings yet"
          subtitle="When customers book this venue, they'll show up here."
        />
      </View>
    );
  }, [loading]);

  // NOTE: do NOT early-return a different JSX tree based on `loading` here.
  // Doing so swaps the outer component and unmounts the search TextInput
  // inside renderHeader, which kills focus and closes the keyboard the
  // moment the user types a character and the debounced fetch starts.
  // The loading spinner is shown via `renderEmpty()` / list footer instead.

  // ── Timeline view ──
  if (view === "timeline") {
    return (
      <>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY_COLOR}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderHeader()}
          {grouped.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              {grouped.map(([date, list]) => (
                <View key={date} style={{ marginBottom: 14 }}>
                  <View style={tabStyles.timelineDateRow}>
                    <View style={tabStyles.timelineDateLeft}>
                      <View style={tabStyles.timelineDot} />
                      <Text style={tabStyles.timelineDate}>
                        {(() => {
                          const d = new Date(date + "T00:00:00");
                          if (Number.isNaN(d.getTime())) return date;
                          return d.toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });
                        })()}
                      </Text>
                    </View>
                    <View style={tabStyles.timelineCountPill}>
                      <Text style={tabStyles.timelineCountPillText}>
                        {list.length} BOOKING{list.length > 1 ? "S" : ""}
                      </Text>
                    </View>
                  </View>
                  {list.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      onPress={setSelectedBooking}
                    />
                  ))}
                </View>
              ))}
              {page >= totalPages && bookings.length > 0 ? (
                <Text style={tabStyles.timelineAllLoaded}>
                  All bookings loaded
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
        <BookingDetailSheet
          visible={!!selectedBooking}
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onChanged={onSheetChanged}
        />
      </>
    );
  }

  // ── List view ──
  return (
    <>
      <FlatList
        data={bookings}
        keyExtractor={(item, idx) =>
          String(item.id || item._id || `${item.date}-${item.start_time}-${idx}`)
        }
        renderItem={({ item }) => (
          <BookingRow booking={item} onPress={setSelectedBooking} />
        )}
        // Pass the EVALUATED element, not the function reference.
        // If we pass `renderHeader` (a function), FlatList does
        // `<ListHeaderComponent />` — and since useCallback re-creates
        // the function on every `localQuery` change, React sees a new
        // component type each keystroke and remounts the header,
        // which kills focus on the search TextInput → keyboard closes.
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <BookingDetailSheet
        visible={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onChanged={onSheetChanged}
      />
    </>
  );
}

// ───────────── SLOTS sub-tab ─────────────
export function SlotsTab({ venueId }) {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(null);
  // Unreserve held-slot dialog state (mirrors frontend unreserveSlot)
  const [unreserveSlot, setUnreserveSlot] = useState(null);
  const [unreserving, setUnreserving] = useState(false);
  // Stat-card drill-down modal state (mirrors frontend statFilter / statModalOpen)
  const [statFilter, setStatFilter] = useState(null);
  const [statBookings, setStatBookings] = useState([]);
  const [statLoading, setStatLoading] = useState(false);
  // Inline Walk-in Booking modal state (mirrors frontend walkInOpen / walkInSlot)
  const [walkInSlot, setWalkInSlot] = useState(null);

  const loadSlots = useCallback(async () => {
    if (!venueId || !selectedDate) return;
    setLoading(true);
    try {
      const res = await venueService.getSlots(venueId, selectedDate);
      setSlots(Array.isArray(res?.slots) ? res.slots : []);
    } catch (err) {
      setSlots([]);
      toast.error(
        "Could not load slots",
        err?.response?.data?.detail || "Try again."
      );
    } finally {
      setLoading(false);
    }
  }, [venueId, selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Turfs and time slots
  const turfs = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      if (!map.has(s.turf_number)) {
        map.set(s.turf_number, {
          turf_number: s.turf_number,
          turf_name: s.turf_name || `Turf ${s.turf_number}`,
          sport: s.sport,
        });
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => a.turf_number - b.turf_number
    );
  }, [slots]);

  const timeSlots = useMemo(() => {
    const seen = new Set();
    return slots
      .filter((s) => {
        if (seen.has(s.start_time)) return false;
        seen.add(s.start_time);
        return true;
      })
      .sort((a, b) => {
        if ((a.is_next_day || false) !== (b.is_next_day || false))
          return a.is_next_day ? 1 : -1;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [slots]);

  const slotMap = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      map[`${s.start_time}-${s.turf_number}`] = s;
    });
    return map;
  }, [slots]);

  const stats = useMemo(() => {
    const total = slots.length;
    const available = slots.filter((s) => s.status === "available").length;
    const booked = slots.filter((s) => s.status === "booked").length;
    const completed = slots.filter(
      (s) =>
        s.status === "completed" ||
        s.booking_status === "completed"
    ).length;
    const freePct = total ? Math.round((available / total) * 100) : 0;
    return { total, available, booked, completed, freePct };
  }, [slots]);

  const shiftDate = (days) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(toIsoDate(d));
  };

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(selectedDate + "T00:00:00");
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Past-date detection — mirrors frontend isPastDate flag.
  const isPastDate = useMemo(() => selectedDate < today, [selectedDate, today]);

  // Current HH:MM in IST — used to grey out slots that are in the past today.
  const nowHHMM = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  }, [selectedDate]); // refresh when user navigates dates

  const handleSlotPress = useCallback(
    async (slot) => {
      const status = slot?.status || "available";

      // Per-slot past detection — mirrors frontend isPastSlot guard.
      // Frontend silently ignores taps on past available/held cells; only
      // "booked" cells stay clickable for view-only access (see spec §8).
      const slotIsPast =
        isPastDate ||
        (selectedDate === today &&
          !slot?.is_next_day &&
          (slot?.start_time || "") < nowHHMM);

      if (status === "booked") {
        const bookingId = slot?.booking_id || slot?.booking?.id;
        if (!bookingId) {
          toast.info("Booking details not available");
          return;
        }
        try {
          const b = await bookingService.get(bookingId);
          if (b) setBookingDetail(b);
        } catch {
          toast.error("Could not load booking");
        }
        return;
      }
      // Past + non-booked → silent return (matches frontend behaviour).
      if (slotIsPast) return;
      if (status === "held" || status === "on_hold") {
        // Mirror frontend's unreserve flow — tapping a held slot opens
        // the unreserve confirmation dialog. Past-date holds are blocked
        // above; only future held cells reach this branch.
        if (!slot?.hold_rule_id) {
          toast.info("Hold details not available");
          return;
        }
        setUnreserveSlot({
          ...slot,
          date: selectedDate,
        });
        return;
      }
      if (status === "available") {
        // Mirror frontend's onWalkInBook flow (VenueOwnerDashboard.js:4915-4946):
        // derive maxConsecutive / slotPrices from same-turf available slots,
        // then open the Walk-in Booking modal INLINE (no route push).
        const courtSlots = slots
          .filter((x) => x.turf_number === slot?.turf_number)
          .sort((a, b) => {
            if ((a.is_next_day || false) !== (b.is_next_day || false))
              return a.is_next_day ? 1 : -1;
            return a.start_time.localeCompare(b.start_time);
          });
        const startIdx = courtSlots.findIndex(
          (x) =>
            x.start_time === slot?.start_time &&
            (x.is_next_day || false) === (slot?.is_next_day || false)
        );
        let maxSlots = 0;
        const prices = [];
        for (
          let i = startIdx;
          i < courtSlots.length && courtSlots[i].status === "available";
          i++
        ) {
          maxSlots++;
          prices.push(courtSlots[i].price || 0);
        }
        setWalkInSlot({
          date: selectedDate,
          turf_number: slot?.turf_number,
          turf_name: slot?.turf_name,
          sport: slot?.sport,
          start_time: slot?.start_time,
          end_time: slot?.end_time,
          price: slot?.price,
          maxConsecutive: maxSlots || 1,
          slotPrices: prices.length ? prices : [slot?.price || 0],
          maxLobbians: slot?.max_lobbians || 1,
        });
      }
    },
    [venueId, selectedDate, slots, isPastDate, today, nowHHMM]
  );

  // Stat-card drill-down — mirrors frontend handleStatCardClick.
  // Only "booked" and "completed" stats are drillable.
  const handleStatCardClick = useCallback(
    async (filterType) => {
      setStatFilter(filterType);
      setStatLoading(true);
      setStatBookings([]);
      try {
        const data = await bookingService.list({
          venue_id: venueId,
          date: selectedDate,
          status: "all",
          page: 1,
          limit: 50,
        });
        let list = Array.isArray(data?.bookings) ? data.bookings : [];
        if (filterType === "completed") {
          list = list.filter((b) => b.status === "completed");
        } else if (filterType === "booked") {
          list = list.filter((b) => b.status === "confirmed");
        }
        setStatBookings(list);
      } catch {
        setStatBookings([]);
      } finally {
        setStatLoading(false);
      }
    },
    [venueId, selectedDate]
  );

  const closeStatModal = useCallback(() => {
    setStatFilter(null);
    setStatBookings([]);
  }, []);

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadSlots}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* Section header */}
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: FONTS.displayBold,
              fontWeight: "900",
              color: "#111827",
            }}
          >
            Slot Availability
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontFamily: FONTS.bodyMedium,
              color: "#6B7280",
              marginTop: 2,
            }}
          >
            Real-time turf availability for any date
          </Text>
        </View>

        {/* Stats row — 5 cards, horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={{ minWidth: 140 }}>
            <StatCard
              icon={<CalendarDays size={18} color={PRIMARY_COLOR} />}
              label="Total"
              value={String(stats.total)}
              bgColor={`${PRIMARY_COLOR}1A`}
            />
          </View>
          <View style={{ width: 8 }} />
          <View style={{ minWidth: 140 }}>
            <StatCard
              icon={<CheckCircle size={18} color="#10B981" />}
              label="Available"
              value={String(stats.available)}
              bgColor="rgba(16, 185, 129, 0.10)"
            />
          </View>
          <View style={{ width: 8 }} />
          <TouchableOpacity
            style={{ minWidth: 140 }}
            onPress={() => handleStatCardClick("booked")}
            activeOpacity={0.75}
          >
            <StatCard
              icon={<Clock size={18} color="#EF4444" />}
              label="Booked"
              value={String(stats.booked)}
              bgColor="rgba(239, 68, 68, 0.10)"
            />
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity
            style={{ minWidth: 140 }}
            onPress={() => handleStatCardClick("completed")}
            activeOpacity={0.75}
          >
            <StatCard
              icon={<CheckCheck size={18} color="#3B82F6" />}
              label="Completed"
              value={String(stats.completed)}
              bgColor="rgba(59, 130, 246, 0.1)"
            />
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <View style={{ minWidth: 140 }}>
            <StatCard
              icon={<BarChart2 size={18} color={PRIMARY_COLOR} />}
              label="Free %"
              value={`${stats.freePct}%`}
              bgColor={`${PRIMARY_COLOR}1A`}
            />
          </View>
        </ScrollView>

        {/* Date nav */}
        <View style={{ height: 14 }} />
        <View style={tabStyles.dateNavRow}>
          {selectedDate !== today ? (
            <TouchableOpacity
              style={tabStyles.todayBtn}
              onPress={() => setSelectedDate(today)}
              activeOpacity={0.75}
            >
              <Text style={tabStyles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 64 }} />
          )}
          <View style={tabStyles.dateNavCenter}>
            <TouchableOpacity
              onPress={() => shiftDate(-1)}
              style={tabStyles.dateNavBtn}
              activeOpacity={0.75}
            >
              <ChevronLeft size={18} color="#0F172A" />
            </TouchableOpacity>
            <View style={tabStyles.dateLabelGroup}>
              <Text style={tabStyles.dateNavText}>{dateLabel}</Text>
              {isPastDate ? (
                <View style={tabStyles.pastViewOnlyPill}>
                  <Text style={tabStyles.pastViewOnlyText}>
                    Past — View Only
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => shiftDate(1)}
              style={tabStyles.dateNavBtn}
              activeOpacity={0.75}
            >
              <ChevronRight size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <View style={{ width: 64 }} />
        </View>

        {loading ? (
          <View style={tabStyles.initialLoad}>
            <ActivityIndicator color={PRIMARY_COLOR} />
          </View>
        ) : slots.length === 0 ? (
          <View style={{ paddingTop: 24 }}>
            <EmptyState
              icon={CalendarDays}
              title="No slots"
              subtitle="No slots configured for this date."
            />
          </View>
        ) : (
          <View style={tabStyles.gridWrap}>
            {/* Color legend — 4 dots above grid (frontend lines 5300-5328) */}
            <View style={tabStyles.legendRow}>
              <View style={tabStyles.legendItem}>
                <View
                  style={[tabStyles.legendDot, { backgroundColor: "#10B981" }]}
                />
                <Text style={tabStyles.legendLabel}>Open</Text>
              </View>
              <View style={tabStyles.legendItem}>
                <View
                  style={[tabStyles.legendDot, { backgroundColor: "#EF4444" }]}
                />
                <Text style={tabStyles.legendLabel}>Booked</Text>
              </View>
              <View style={tabStyles.legendItem}>
                <View
                  style={[tabStyles.legendDot, { backgroundColor: "#D97706" }]}
                />
                <Text style={tabStyles.legendLabel}>Advance</Text>
              </View>
              <View style={tabStyles.legendItem}>
                <View
                  style={[tabStyles.legendDot, { backgroundColor: "#EAB308" }]}
                />
                <Text style={tabStyles.legendLabel}>Held</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Header row */}
                <View style={tabStyles.gridHeaderRow}>
                  <View
                    style={[
                      tabStyles.timeColCell,
                      tabStyles.gridHeaderCell,
                    ]}
                  >
                    <Text style={tabStyles.gridHeaderLabel}>Time</Text>
                  </View>
                  {turfs.map((t) => {
                    const iconName = t.sport
                      ? getSportIconName(String(t.sport).toLowerCase())
                      : null;
                    return (
                      <View
                        key={t.turf_number}
                        style={[
                          tabStyles.turfColCell,
                          tabStyles.gridHeaderCell,
                        ]}
                      >
                        <Text
                          style={tabStyles.turfColTitle}
                          numberOfLines={1}
                        >
                          {t.turf_name}
                        </Text>
                        <View style={tabStyles.turfColSportRow}>
                          {iconName ? (
                            <MaterialCommunityIcons
                              name={iconName}
                              size={11}
                              color="#9CA3AF"
                            />
                          ) : null}
                          <Text
                            style={tabStyles.turfColSport}
                            numberOfLines={1}
                          >
                            {t.sport}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Data rows */}
                {timeSlots.map((time, rowIdx) => {
                  // Row-level past-slot flag (time column muting). A row is
                  // "past" if the selected date is in the past OR the slot
                  // time has already elapsed today.
                  const rowIsPast =
                    isPastDate ||
                    (selectedDate === today &&
                      !time.is_next_day &&
                      time.start_time < nowHHMM);

                  return (
                    <View
                      key={`${time.start_time}-${rowIdx}`}
                      style={tabStyles.gridRow}
                    >
                      <View
                        style={[
                          tabStyles.timeColCell,
                          tabStyles.gridDataCell,
                        ]}
                      >
                        <Text
                          style={[
                            tabStyles.timeLabel,
                            rowIsPast && tabStyles.timeLabelPast,
                          ]}
                        >
                          {fmt12h(time.start_time)}
                        </Text>
                        {time.is_next_day ? (
                          <View style={tabStyles.nextDayBadge}>
                            <Text style={tabStyles.nextDayBadgeText}>
                              +1 Day
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {turfs.map((t) => {
                        const slot =
                          slotMap[`${time.start_time}-${t.turf_number}`];
                        const s = slot?.status || "available";

                        const isAdvance =
                          s === "booked" &&
                          slot?.payment_status === "advance";
                        const isPastSlot = rowIsPast;

                        // Decision tree mirrors frontend statusBadgeStyles
                        // (VenueOwnerDashboard.js:5388-5420). Past wins over
                        // everything, then advance differentiates booked.
                        let bg, bd, txt, label;
                        if (isPastSlot) {
                          bg = "#F1F5F9"; // muted-foreground/15
                          bd = "#E2E8F0";
                          txt = "#94A3B8";
                          label =
                            s === "available"
                              ? "Open"
                              : isAdvance
                                ? "Advance"
                                : s === "booked"
                                  ? "Booked"
                                  : s === "held"
                                    ? "Reserved"
                                    : "Held";
                        } else if (s === "available") {
                          bg = "#ECFDF5";
                          bd = "#A7F3D0";
                          txt = "#059669";
                          label = "Open";
                        } else if (s === "booked" && isAdvance) {
                          bg = "#FFFBEB"; // amber-500/5
                          bd = "#FDE68A";
                          txt = "#D97706";
                          label = "Advance";
                        } else if (s === "booked") {
                          bg = "#FEF2F2";
                          bd = "#FECACA";
                          txt = "#DC2626";
                          label = "Booked";
                        } else if (s === "held") {
                          bg = "#FAF5FF"; // purple-500/5
                          bd = "#E9D5FF";
                          txt = "#9333EA";
                          label = "Reserved";
                        } else {
                          // on_hold / locked_by_you
                          bg = "#FFFBEB";
                          bd = "#FDE68A";
                          txt = "#D97706";
                          label = "Held";
                        }

                        const hasOffer =
                          s === "available" &&
                          slot?.has_offer &&
                          slot?.original_price != null;
                        const showPrice =
                          slot?.price != null && !isPastSlot && s !== "held";

                        return (
                          <View
                            key={`${time.start_time}-${t.turf_number}`}
                            style={tabStyles.turfColCell}
                          >
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() =>
                                handleSlotPress(
                                  slot || { ...time, status: s }
                                )
                              }
                              style={[
                                tabStyles.cellTile,
                                { backgroundColor: bg, borderColor: bd },
                              ]}
                            >
                              <Text
                                style={[
                                  tabStyles.cellStatus,
                                  { color: txt },
                                ]}
                              >
                                {label}
                              </Text>

                              {/* Held hold-rule label */}
                              {s === "held" && slot?.hold_label ? (
                                <Text
                                  style={tabStyles.cellHoldLabel}
                                  numberOfLines={1}
                                >
                                  {slot.hold_label}
                                </Text>
                              ) : null}

                              {/* Past indicator */}
                              {isPastSlot ? (
                                <Text style={tabStyles.cellPastLabel}>
                                  Past
                                </Text>
                              ) : null}

                              {/* Price block */}
                              {showPrice ? (
                                hasOffer ? (
                                  <>
                                    <Text
                                      style={tabStyles.cellPriceStrike}
                                    >
                                      ₹{slot.original_price}
                                    </Text>
                                    <Text style={tabStyles.cellPriceOffer}>
                                      ₹{slot.price}
                                    </Text>
                                  </>
                                ) : (
                                  <Text
                                    style={[
                                      tabStyles.cellPrice,
                                      { color: txt },
                                    ]}
                                  >
                                    ₹{slot.price}
                                  </Text>
                                )
                              ) : null}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <BookingDetailSheet
        visible={!!bookingDetail}
        booking={bookingDetail}
        onClose={() => setBookingDetail(null)}
        onChanged={loadSlots}
      />

      {/* Walk-in Booking modal — mirrors frontend Walk-in Booking dialog
          (VenueOwnerDashboard.js:2545-2863). Opens inline over the slots
          grid; closes via X / overlay tap / after successful booking. */}
      <WalkInBookingModal
        visible={!!walkInSlot}
        slot={walkInSlot}
        venueId={venueId}
        onClose={() => setWalkInSlot(null)}
        onBooked={loadSlots}
      />

      {/* Unreserve held slot dialog — mirrors frontend Unreserve Slot? dialog */}
      <Modal
        visible={!!unreserveSlot}
        transparent
        animationType="fade"
        onRequestClose={() => !unreserving && setUnreserveSlot(null)}
        statusBarTranslucent
      >
        <Pressable
          style={tabStyles.dialogOverlay}
          onPress={() => !unreserving && setUnreserveSlot(null)}
        >
          <Pressable
            style={tabStyles.dialogCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={tabStyles.dialogTitle}>Unreserve Slot?</Text>
            {unreserveSlot ? (
              <>
                <View style={tabStyles.unreservePill}>
                  <Text style={tabStyles.unreservePillTitle}>
                    {unreserveSlot.hold_label || "Reserved"}
                  </Text>
                  <Text style={tabStyles.unreservePillSub}>
                    {unreserveSlot.turf_name ||
                      `Court #${unreserveSlot.turf_number}`}{" "}
                    at {fmt12h(unreserveSlot.start_time)}
                  </Text>
                </View>
                <Text style={tabStyles.dialogBody}>
                  Only this specific slot will be unreserved. The hold rule
                  stays active for all other slots.
                </Text>
                <View style={tabStyles.dialogBtnRow}>
                  <TouchableOpacity
                    style={[tabStyles.dialogBtn, tabStyles.dialogBtnOutline]}
                    onPress={() => setUnreserveSlot(null)}
                    disabled={unreserving}
                    activeOpacity={0.75}
                  >
                    <Text style={tabStyles.dialogBtnOutlineText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      tabStyles.dialogBtn,
                      tabStyles.dialogBtnDanger,
                      unreserving && { opacity: 0.6 },
                    ]}
                    onPress={async () => {
                      setUnreserving(true);
                      try {
                        await venueService.excludeSlot(
                          unreserveSlot.hold_rule_id,
                          {
                            date: unreserveSlot.date,
                            start_time: unreserveSlot.start_time,
                            turf_number: unreserveSlot.turf_number,
                          }
                        );
                        toast.success("This slot has been unreserved");
                        setUnreserveSlot(null);
                        loadSlots();
                      } catch (err) {
                        toast.error(
                          err?.response?.data?.detail || "Failed to unreserve"
                        );
                      } finally {
                        setUnreserving(false);
                      }
                    }}
                    disabled={unreserving}
                    activeOpacity={0.85}
                  >
                    <Text style={tabStyles.dialogBtnDangerText}>
                      {unreserving ? "Unreserving…" : "Unreserve"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Stat-card drill-down modal — mirrors frontend statModalOpen dialog */}
      <Modal
        visible={!!statFilter}
        transparent
        animationType="fade"
        onRequestClose={closeStatModal}
        statusBarTranslucent
      >
        <Pressable style={tabStyles.dialogOverlay} onPress={closeStatModal}>
          <Pressable
            style={tabStyles.statDialogCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={tabStyles.dialogTitle}>
              {statFilter === "completed" ? "Completed" : "Booked"} Bookings
            </Text>
            <Text style={tabStyles.statDialogSubtitle}>
              {(() => {
                try {
                  return new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" }
                  );
                } catch {
                  return selectedDate;
                }
              })()}{" "}
              — {statBookings.length} booking
              {statBookings.length !== 1 ? "s" : ""}
            </Text>

            {statLoading ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={PRIMARY_COLOR} />
              </View>
            ) : statBookings.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <CalendarDays size={28} color="#D1D5DB" />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#9CA3AF",
                  }}
                >
                  No {statFilter} bookings for this date
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {statBookings.map((b) => {
                  const isCompleted = statFilter === "completed";
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={tabStyles.statRow}
                      onPress={() => {
                        const booking = b;
                        setStatFilter(null);
                        setStatBookings([]);
                        setTimeout(() => setBookingDetail(booking), 200);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          tabStyles.statRowIcon,
                          {
                            backgroundColor: isCompleted
                              ? "rgba(59, 130, 246, 0.10)"
                              : "rgba(239, 68, 68, 0.10)",
                          },
                        ]}
                      >
                        {isCompleted ? (
                          <CheckCheck size={16} color="#3B82F6" />
                        ) : (
                          <Clock size={16} color="#EF4444" />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={tabStyles.statRowName}
                          numberOfLines={1}
                        >
                          {b.booking_type === "walk_in"
                            ? b.customer_name
                            : b.host_name || b.customer_name || "Lobbian"}
                        </Text>
                        <Text
                          style={tabStyles.statRowMeta}
                          numberOfLines={1}
                        >
                          {b.turf_name || `Turf ${b.turf_number}`}
                          {b.sport ? ` · ${b.sport}` : ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={tabStyles.statRowTime}>
                          {fmt12h(b.start_time)} – {fmt12h(b.end_time)}
                        </Text>
                        <Text style={tabStyles.statRowAmount}>
                          ₹{(b.total_amount || 0).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                tabStyles.dialogBtn,
                tabStyles.dialogBtnOutline,
                { marginTop: 12 },
              ]}
              onPress={closeStatModal}
              activeOpacity={0.75}
            >
              <Text style={tabStyles.dialogBtnOutlineText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ───────────── HOLDS sub-tab ─────────────
export function HoldsTab({ venue }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <HoldRulesPanel venue={venue} />
    </ScrollView>
  );
}

// ───────────── WALK-IN sub-tab ─────────────
export function WalkinTab({ venueId, venue }) {
  const [dateFilter, setDateFilter] = useState({ preset: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const [localQuery, setLocalQuery] = useState("");

  const RANGE_LABEL_MAP = {
    all: "Total",
    today: "Today's",
    yesterday: "Yesterday's",
    last7: "Last 7 Days'",
    thisWeek: "This Week's",
    thisMonth: "This Month's",
    lastMonth: "Last Month's",
    last30: "Last 30 Days'",
    custom: "Selected Range",
  };
  const rangeLabel =
    RANGE_LABEL_MAP[dateFilter?.preset || "all"] || "Total";

  const [bookings, setBookings] = useState([]);
  const [walkinStats, setWalkinStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchInFlight = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localQuery !== searchQuery) setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  const buildParams = useCallback(
    (pg) => {
      const p = {
        page: pg,
        limit: PAGE_LIMIT,
        sort_order: "desc",
        booking_type: "walk_in",
      };
      if (searchQuery?.trim()) p.q = searchQuery.trim();
      if (venueId) p.venue_id = venueId;
      if (dateFilter?.start_date) p.start_date = dateFilter.start_date;
      if (dateFilter?.end_date) p.end_date = dateFilter.end_date;
      return p;
    },
    [searchQuery, venueId, dateFilter]
  );

  // Numbered pagination — matches frontend (no infinite scroll). Each page
  // click replaces the visible list with that page's slice.
  const fetchPage = useCallback(
    async (pg, { isRefresh = false } = {}) => {
      if (fetchInFlight.current) return;
      fetchInFlight.current = true;
      if (!isRefresh) setLoading(true);
      try {
        const params = buildParams(pg);
        const data = await bookingService.list(params);
        const list = Array.isArray(data?.bookings) ? data.bookings : [];
        setBookings(list);
        setWalkinStats(data?.walkin_stats || {});
        setTotalPages(data?.pages || 1);
        setTotal(Number(data?.total) || list.length);
        setPage(pg);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load walk-ins";
        toast.error(typeof msg === "string" ? msg : "Failed to load walk-ins");
      } finally {
        fetchInFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, venueId, dateFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, { isRefresh: true });
  }, [fetchPage]);

  // Smart page list — mirrors frontend's truncation: show 1, last, current±1,
  // collapse the rest into "…" ellipsis markers.
  const visiblePages = useMemo(() => {
    if (totalPages <= 1) return [];
    const filtered = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) =>
        p === 1 ||
        p === totalPages ||
        Math.abs(p - page) <= 1
    );
    const out = [];
    filtered.forEach((p, idx) => {
      if (idx > 0 && p - filtered[idx - 1] > 1) out.push("...");
      out.push(p);
    });
    return out;
  }, [totalPages, page]);

  const rangeStart = (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGE_LIMIT, total);

  const renderHeader = useCallback(
    () => (
      <View>
        <View style={{ height: 12 }} />
        {/* 3 Stat cards */}
        <View style={tabStyles.statsRow3}>
          <StatCard
            icon={<Users size={18} color={PRIMARY_COLOR} />}
            label={`${rangeLabel} Walk-ins`}
            value={String(walkinStats?.total_walkins ?? 0)}
            bgColor={`${PRIMARY_COLOR}1A`}
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon={<CalendarDays size={18} color={PRIMARY_COLOR} />}
            label="Today's Walk-ins"
            value={String(walkinStats?.today_walkins ?? 0)}
            bgColor={`${PRIMARY_COLOR}1A`}
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon={<IndianRupee size={18} color={PRIMARY_COLOR} />}
            label={`${rangeLabel} Revenue`}
            value={`₹${(walkinStats?.walkin_revenue || 0).toLocaleString(
              "en-IN"
            )}`}
            bgColor={`${PRIMARY_COLOR}1A`}
          />
        </View>

        <View style={{ height: 14 }} />

        {/* Date filter + Create button row */}
        <View style={{ paddingHorizontal: 16 }}>
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        </View>

        <View style={{ height: 6 }} />

        {/* Search row — matches frontend: no inline "New" button.
            Walk-in creation is triggered by tapping an available slot
            in the Slots tab (frontend onWalkInBook flow). */}
        <View style={tabStyles.searchRow}>
          <View style={tabStyles.searchInputWrap}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={localQuery}
              onChangeText={setLocalQuery}
              placeholder="Search by name or phone…"
              placeholderTextColor="#94A3B8"
              style={tabStyles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {localQuery ? (
              <TouchableOpacity onPress={() => setLocalQuery("")} hitSlop={8}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={{ height: 10 }} />
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walkinStats, dateFilter, localQuery, rangeLabel]
  );

  // Numbered pagination footer — matches frontend pattern:
  // "N–M of Total"  ‹  1 … 4 5 6 … 12  ›
  const renderFooter = useCallback(() => {
    if (totalPages <= 1) return <View style={{ height: 24 }} />;
    return (
      <View style={tabStyles.paginationWrap}>
        <Text style={tabStyles.paginationLabel}>
          {rangeStart}–{rangeEnd} of {total}
        </Text>
        <View style={tabStyles.paginationBtnRow}>
          <TouchableOpacity
            style={[
              tabStyles.pageNavBtn,
              page <= 1 && tabStyles.pageBtnDisabled,
            ]}
            disabled={page <= 1}
            onPress={() => fetchPage(page - 1)}
            activeOpacity={0.7}
          >
            <ChevronLeft size={16} color="#6B7280" />
          </TouchableOpacity>
          {visiblePages.map((p, i) =>
            p === "..." ? (
              <Text key={`dots-${i}`} style={tabStyles.pageEllipsis}>
                …
              </Text>
            ) : (
              <TouchableOpacity
                key={p}
                onPress={() => fetchPage(p)}
                activeOpacity={0.7}
                style={[
                  tabStyles.pageBtn,
                  p === page && tabStyles.pageBtnActive,
                ]}
              >
                <Text
                  style={[
                    tabStyles.pageBtnText,
                    p === page && tabStyles.pageBtnTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity
            style={[
              tabStyles.pageNavBtn,
              page >= totalPages && tabStyles.pageBtnDisabled,
            ]}
            disabled={page >= totalPages}
            onPress={() => fetchPage(page + 1)}
            activeOpacity={0.7}
          >
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [totalPages, page, total, rangeStart, rangeEnd, visiblePages, fetchPage]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      // Spinner here (not in an early-return tree swap) — keeps the search
      // TextInput inside renderHeader mounted across keystrokes.
      return (
        <View style={tabStyles.initialLoad}>
          <ActivityIndicator color={PRIMARY_COLOR} />
        </View>
      );
    }
    return (
      <View style={{ paddingTop: 20 }}>
        <EmptyState
          icon={Users}
          title="No walk-in bookings"
          subtitle="Create your first walk-in to see it here."
        />
      </View>
    );
  }, [loading]);

  // NOTE: no early-return on `loading && !bookings.length` — that would swap
  // the outer tree and unmount the search input. Spinner is shown via
  // ListEmptyComponent above instead.

  return (
    <>
      <FlatList
        data={bookings}
        keyExtractor={(item, idx) =>
          String(item.id || item._id || `${item.date}-${item.start_time}-${idx}`)
        }
        renderItem={({ item }) => (
          <BookingRow booking={item} onPress={setSelectedBooking} />
        )}
        // Pass the EVALUATED element, not the function reference.
        // See feedback_venue_parity_pitfalls.md (pitfall 2): useCallback recreates
        // renderHeader on every keystroke → component type changes → keyboard
        // closes if passed as fn ref.
        ListHeaderComponent={renderHeader()}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_COLOR}
            colors={[PRIMARY_COLOR]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <BookingDetailSheet
        visible={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onChanged={() => fetchPage(1, { isRefresh: true })}
      />
    </>
  );
}

// ───────────── CHECK-IN sub-tab ─────────────
export function CheckinTab({ venueId, venueName }) {
  const [mode, setMode] = useState("camera"); // camera | upload | attendance
  const [scanned, setScanned] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false); // Web parity: user must tap to start

  // Attendance state
  const [todayBookings, setTodayBookings] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  const today = useMemo(() => toIsoDate(new Date()), []);

  const reset = useCallback(() => {
    setScanned(null);
    setResolving(false);
    setConfirming(false);
    setCameraActive(false); // stop camera when leaving the mode
  }, []);

  const loadTodayBookings = useCallback(async () => {
    if (!venueId) return;
    setAttendanceLoading(true);
    try {
      const data = await bookingService.list({
        venue_id: venueId,
        status: "confirmed",
        date: today,
        limit: 100,
        page: 1,
      });
      const list = Array.isArray(data?.bookings) ? data.bookings : [];
      setTodayBookings(list);
    } catch {
      setTodayBookings([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, [venueId, today]);

  useEffect(() => {
    if (mode === "attendance") loadTodayBookings();
  }, [mode, loadTodayBookings]);

  const checkedIn = useMemo(
    () => todayBookings.filter((b) => b.checked_in),
    [todayBookings]
  );
  const notCheckedIn = useMemo(
    () => todayBookings.filter((b) => !b.checked_in),
    [todayBookings]
  );
  const progressPct = todayBookings.length
    ? Math.round((checkedIn.length / todayBookings.length) * 100)
    : 0;

  const handleScan = useCallback(
    async (value) => {
      if (resolving || scanned) return;
      const bookingId = extractBookingId(value);
      if (!bookingId) {
        toast.error("Invalid QR", "Could not read the booking code.");
        return;
      }
      setResolving(true);
      try {
        const booking = await bookingService.get(bookingId);
        if (!booking) {
          toast.error("Not Found", "No booking matches that QR code.");
          reset();
          return;
        }
        setScanned(booking);
      } catch (err) {
        toast.error(
          "Lookup Failed",
          err?.response?.data?.detail || "Try again."
        );
        reset();
      } finally {
        setResolving(false);
      }
    },
    [resolving, scanned, reset]
  );

  const handleConfirm = useCallback(async () => {
    if (!scanned || confirming) return;
    const bookingId = scanned.id || scanned.booking_id;
    if (!bookingId) {
      toast.error("Missing ID", "Booking id not available.");
      return;
    }
    setConfirming(true);
    try {
      await bookingService.checkin({ booking_id: bookingId });
      toast.success(
        "Checked in",
        scanned.customer_name || scanned.host_name || "Welcome!"
      );
      setTimeout(reset, 800);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        toast.success(
          "Check-in noted",
          `${scanned.customer_name || scanned.host_name || "Guest"} — server log not available.`
        );
        setTimeout(reset, 1200);
      } else {
        toast.error(
          "Check-in Failed",
          err?.response?.data?.detail || "Try again."
        );
        reset();
      }
    } finally {
      setConfirming(false);
    }
  }, [scanned, confirming, reset]);

  const handleMarkPresent = useCallback(async (bookingId) => {
    if (!bookingId) return;
    setMarkingId(bookingId);
    try {
      await bookingService.checkin({ booking_id: bookingId });
      toast.success("Marked as present");
      // Refresh
      await loadTodayBookings();
    } catch (err) {
      toast.error(
        "Failed",
        err?.response?.data?.detail || "Could not mark present."
      );
    } finally {
      setMarkingId(null);
    }
  }, [loadTodayBookings]);

  const handlePickQrImage = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions
          ? ImagePicker.MediaTypeOptions.Images
          : "Images",
        quality: 1,
      });
      if (res?.canceled) return;
      toast.info(
        "QR upload coming soon",
        "Use Camera Scan to verify check-ins for now."
      );
    } catch (err) {
      toast.error("Failed", err?.message || "Could not pick image.");
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode selector */}
        <ModePill
          options={[
            {
              key: "camera",
              label: "Camera Scan",
              icon: (active) => (
                <Camera size={13} color={active ? PRIMARY_COLOR : "#6B7280"} />
              ),
            },
            {
              key: "upload",
              label: "Upload QR",
              icon: (active) => (
                <Upload size={13} color={active ? PRIMARY_COLOR : "#6B7280"} />
              ),
            },
            {
              key: "attendance",
              label: "Attendance",
              icon: (active) => (
                <ClipboardList
                  size={13}
                  color={active ? PRIMARY_COLOR : "#6B7280"}
                />
              ),
              badge: todayBookings.length
                ? `${checkedIn.length}/${todayBookings.length}`
                : null,
            },
          ]}
          value={mode}
          onChange={(k) => {
            reset();
            setMode(k);
          }}
        />

        {/* Camera mode */}
        {mode === "camera" && (
          <View style={tabStyles.modePanel}>
            <View style={tabStyles.panelHeaderRow}>
              <View style={tabStyles.panelIconBox}>
                <Camera size={18} color={PRIMARY_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={tabStyles.panelTitle}>
                  Scan Lobbian's QR Code
                </Text>
                <Text style={tabStyles.panelSubtitle}>
                  Point your camera at the Lobbian's phone to verify check-in at{" "}
                  {venueName || "this venue"}.
                </Text>
              </View>
            </View>

            {!scanned ? (
              <>
                {/* Camera preview area — placeholder or live camera */}
                <View style={tabStyles.scanWrap}>
                  {cameraActive ? (
                    <>
                      <QRScanner enabled={!scanned && !resolving} onScan={handleScan} />
                      {resolving ? (
                        <View style={tabStyles.resolvingPill}>
                          <Text style={tabStyles.resolvingText}>
                            Looking up booking…
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={tabStyles.cameraPlaceholder}>
                      <Camera size={36} color="#9CA3AF" strokeWidth={1.5} />
                      <Text style={tabStyles.cameraPlaceholderText}>
                        Camera preview will appear here
                      </Text>
                    </View>
                  )}
                </View>

                {/* Start / Stop button */}
                <TouchableOpacity
                  style={tabStyles.startScannerBtn}
                  onPress={() => setCameraActive((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Camera size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={tabStyles.startScannerBtnText}>
                    {cameraActive ? "Stop Camera" : "Start Camera Scanner"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ marginTop: 12 }}>
                <CheckinConfirmCard
                  booking={scanned}
                  onConfirm={handleConfirm}
                  onCancel={reset}
                  loading={confirming}
                />
              </View>
            )}
          </View>
        )}

        {/* Upload mode */}
        {mode === "upload" && (
          <View style={tabStyles.modePanel}>
            <View style={tabStyles.panelHeaderRow}>
              <View style={tabStyles.panelIconBox}>
                <Upload size={18} color={PRIMARY_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={tabStyles.panelTitle}>Upload QR Image</Text>
                <Text style={tabStyles.panelSubtitle}>
                  Upload a screenshot or photo of the QR code.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickQrImage}
              style={tabStyles.uploadDrop}
            >
              <ImagePlus size={32} color={PRIMARY_COLOR} />
              <Text style={tabStyles.uploadDropText}>
                Tap to select QR image
              </Text>
              <Text style={tabStyles.uploadDropHint}>
                JPG, PNG, or screenshot
              </Text>
            </TouchableOpacity>

            <Text style={tabStyles.uploadNote}>
              Coming soon — use Camera Scan for now.
            </Text>
          </View>
        )}

        {/* Attendance mode */}
        {mode === "attendance" && (
          <View style={tabStyles.modePanel}>
            <View style={tabStyles.panelHeaderRow}>
              <View style={tabStyles.panelIconBox}>
                <ClipboardList size={18} color={PRIMARY_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={tabStyles.panelTitle}>
                  Today's Attendance — {venueName || "Venue"}
                </Text>
                <Text style={tabStyles.panelSubtitle}>{today}</Text>
              </View>
              {todayBookings.length > 0 ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={tabStyles.attendanceCount}>
                    {checkedIn.length}/{todayBookings.length}
                  </Text>
                  <Text style={tabStyles.attendanceCountLabel}>
                    Checked In
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Progress bar */}
            {todayBookings.length > 0 ? (
              <View style={tabStyles.progressBar}>
                <View
                  style={[
                    tabStyles.progressFill,
                    { width: `${progressPct}%` },
                  ]}
                />
              </View>
            ) : null}

            {attendanceLoading ? (
              <View style={tabStyles.initialLoad}>
                <ActivityIndicator color={PRIMARY_COLOR} />
              </View>
            ) : todayBookings.length === 0 ? (
              <View style={{ paddingVertical: 14 }}>
                <EmptyState
                  icon={Calendar}
                  title="No confirmed bookings for today"
                  subtitle="Bookings will appear here on their day."
                />
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {notCheckedIn.map((b) => {
                  const isWalkin = b.booking_type === "walk_in";
                  const name = isWalkin
                    ? b.customer_name
                    : b.host_name || b.booked_by_name || "Lobbian";
                  return (
                    <View key={b.id} style={tabStyles.attRow}>
                      <View style={tabStyles.attAvatar}>
                        <UserX size={14} color="#F59E0B" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={tabStyles.attNameRow}>
                          <Text
                            style={tabStyles.attName}
                            numberOfLines={1}
                          >
                            {name}
                          </Text>
                          {isWalkin ? (
                            <View style={tabStyles.walkinPill}>
                              <Text style={tabStyles.walkinPillText}>
                                Walk-in
                              </Text>
                            </View>
                          ) : null}
                          {b.sport ? (
                            <View style={tabStyles.sportPill}>
                              <Text style={tabStyles.sportPillText}>
                                {b.sport}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={tabStyles.attMeta} numberOfLines={1}>
                          {fmt12h(b.start_time)} – {fmt12h(b.end_time)} · Turf #
                          {b.turf_number || 1}
                        </Text>
                      </View>
                      {isWalkin ? (
                        <TouchableOpacity
                          style={tabStyles.markBtn}
                          onPress={() => handleMarkPresent(b.id)}
                          disabled={markingId === b.id}
                          activeOpacity={0.85}
                        >
                          {markingId === b.id ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <CheckCircle size={12} color="#FFFFFF" />
                              <Text style={tabStyles.markBtnText}>
                                Mark Present
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={tabStyles.awaitingPill}>
                          <Text style={tabStyles.awaitingPillText}>
                            Awaiting QR
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                {checkedIn.map((b) => {
                  const isWalkin = b.booking_type === "walk_in";
                  const name = isWalkin
                    ? b.customer_name
                    : b.host_name || b.booked_by_name || "Lobbian";
                  return (
                    <View
                      key={b.id}
                      style={[tabStyles.attRow, tabStyles.attRowChecked]}
                    >
                      <View
                        style={[
                          tabStyles.attAvatar,
                          { backgroundColor: `${PRIMARY_COLOR}26` },
                        ]}
                      >
                        <UserCheck size={14} color={PRIMARY_COLOR} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={tabStyles.attNameRow}>
                          <Text
                            style={tabStyles.attName}
                            numberOfLines={1}
                          >
                            {name}
                          </Text>
                          {isWalkin ? (
                            <View style={tabStyles.walkinPill}>
                              <Text style={tabStyles.walkinPillText}>
                                Walk-in
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={tabStyles.attMeta} numberOfLines={1}>
                          {fmt12h(b.start_time)} – {fmt12h(b.end_time)} · Turf #
                          {b.turf_number || 1}
                        </Text>
                      </View>
                      <View style={tabStyles.presentPill}>
                        <CheckCircle size={11} color="#FFFFFF" />
                        <Text style={tabStyles.presentPillText}>Present</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ───────────── styles (redirect-only) ─────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});

const tabStyles = StyleSheet.create({
  initialLoad: { paddingVertical: 60, alignItems: "center" },
  footerLoad: { paddingVertical: 18, alignItems: "center" },

  // Stats grids
  statsGrid: {},
  statsRow3: { flexDirection: "row", paddingHorizontal: 16 },
  statsRow2: { flexDirection: "row", paddingHorizontal: 16 },

  // Booking toolbar
  toolbarOuter: { paddingHorizontal: 16 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16 },
  // Inline flex-wrap filter row — matches frontend `flex flex-wrap items-center gap-2`
  filterRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  dropdownSlotStatus: { minWidth: 130, flexShrink: 1 },
  dropdownSlotTime: { minWidth: 120, flexShrink: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 200,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 24,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 0,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sortBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
  },
  newBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Mode pill
  modePillRow: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 9999,
    alignSelf: "stretch",
    marginBottom: 12,
  },
  // Inline variant: shrink to content, sit in the wrap-row alongside dropdowns/search
  modePillRowInline: {
    alignSelf: "flex-start",
    marginBottom: 0,
    height: 44,
    alignItems: "center",
  },
  modePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9999,
  },
  modePillInline: {
    flex: 0,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  modePillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  modePillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  modePillTextActive: { color: PRIMARY_COLOR },
  modePillTextInactive: { color: "#6B7280" },
  // Optional count badge (e.g. attendance progress "N/M") — mirrors frontend
  modePillBadge: {
    marginLeft: 6,
    minWidth: 18,
    paddingHorizontal: 5,
    height: 16,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  modePillBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  // Timeline date header
  timelineDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  timelineDateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_COLOR,
  },
  timelineDate: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#6B7280",
  },
  timelineCountPill: {
    backgroundColor: `${PRIMARY_COLOR}14`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}33`,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timelineCountPillText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    letterSpacing: 0.8,
  },
  timelineAllLoaded: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 16,
  },

  // SLOTS
  slotStatsRow: { flexDirection: "row" },
  dateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}66`,
    backgroundColor: `${PRIMARY_COLOR}0F`,
  },
  todayBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dateNavCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dateNavText: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#0F172A",
    minWidth: 130,
    textAlign: "center",
  },
  dateLabelGroup: { alignItems: "center", gap: 4 },
  pastViewOnlyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(107, 114, 128, 0.15)",
  },
  pastViewOnlyText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "rgba(107, 114, 128, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Legend bar — 4 dots above the grid
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(248, 250, 252, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
  },

  gridWrap: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    overflow: "hidden",
  },
  gridHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
  },
  gridHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gridHeaderLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  gridRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.5)",
  },
  gridDataCell: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  timeColCell: {
    width: 88,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "rgba(229, 231, 235, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  turfColCell: {
    width: 120,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "rgba(229, 231, 235, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  turfColTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  turfColSport: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    textTransform: "capitalize",
  },
  // Sport icon + label row inside turf header
  turfColSportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#0F172A",
  },
  // Past-row time label — reduced opacity
  timeLabelPast: { color: "rgba(148, 163, 184, 0.7)" },
  // "+1 Day" overnight badge (matches frontend brand-500 text-[9px])
  nextDayBadge: {
    marginTop: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: `${PRIMARY_COLOR}1A`,
  },
  nextDayBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // Legacy nextDayPill (kept for backwards compat — same colour family)
  nextDayPill: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    marginTop: 2,
  },
  cellTile: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cellStatus: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cellPrice: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  // Offer pricing — strikethrough original above bold brand-coloured price
  cellPriceStrike: {
    fontSize: 8,
    fontFamily: FONTS.bodyMedium,
    color: "rgba(107, 114, 128, 0.55)",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  cellPriceOffer: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: PRIMARY_COLOR,
  },
  // Hold rule label below status badge for held cells
  cellHoldLabel: {
    fontSize: 8,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#9333EA",
    marginTop: 3,
    maxWidth: "100%",
    paddingHorizontal: 2,
    textAlign: "center",
  },
  // Past indicator below status badge for elapsed slots
  cellPastLabel: {
    fontSize: 8,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "rgba(148, 163, 184, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },

  // Check-in modes
  modePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    padding: 16,
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  panelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: "900",
    color: "#0F172A",
  },
  panelSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15,
  },

  scanWrap: {
    aspectRatio: 1,
    maxHeight: 380,
    minHeight: 260,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    position: "relative",
    marginTop: 14,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  cameraPlaceholderText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  startScannerBtn: {
    marginTop: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startScannerBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resolvingPill: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  resolvingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  uploadDrop: {
    aspectRatio: 4 / 3,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: `${PRIMARY_COLOR}40`,
    borderStyle: "dashed",
    backgroundColor: `${PRIMARY_COLOR}08`,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 6,
  },
  uploadDropText: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 8,
  },
  uploadDropHint: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#9CA3AF",
  },
  uploadNote: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },

  // Attendance
  attendanceCount: {
    fontSize: 18,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    letterSpacing: -0.3,
  },
  attendanceCountLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 9999,
  },
  attRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
  },
  attRowChecked: {
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderColor: `${PRIMARY_COLOR}33`,
  },
  attAvatar: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  attNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  attName: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#0F172A",
    maxWidth: 140,
  },
  attMeta: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#6B7280",
    marginTop: 2,
  },
  walkinPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  walkinPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#C2410C",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sportPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    backgroundColor: "#F1F5F9",
  },
  sportPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    fontWeight: "800",
    color: "#475569",
    textTransform: "capitalize",
  },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
  },
  markBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  awaitingPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
  },
  awaitingPillText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  presentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: PRIMARY_COLOR,
  },
  presentPillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // ── Dialog (shared by Unreserve + StatModal) ────────────────────────
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  dialogTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#0F172A",
  },
  dialogBody: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  dialogBtnRow: { flexDirection: "row", gap: 10 },
  dialogBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogBtnOutline: {
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
  },
  dialogBtnOutlineText: { color: "#0F172A", fontWeight: "800", fontSize: 13 },
  dialogBtnDanger: { backgroundColor: "#DC2626" },
  dialogBtnDangerText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },

  // Unreserve highlight pill (matches frontend purple-500/10)
  unreservePill: {
    backgroundColor: "rgba(168, 85, 247, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.30)",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  unreservePillTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9333EA",
  },
  unreservePillSub: { fontSize: 11, color: "#6B7280" },

  // Stat-card drill-down modal
  statDialogCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  statDialogSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 6,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(243, 244, 246, 0.6)",
    marginBottom: 6,
  },
  statRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statRowName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  statRowMeta: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  statRowTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  statRowAmount: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // ── Numbered pagination (Walk-in tab) ───────────────────────────────
  paginationWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paginationLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  paginationBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pageNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pageBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pageBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  pageBtnTextActive: { color: "#FFFFFF" },
  pageEllipsis: {
    paddingHorizontal: 4,
    fontSize: 12,
    color: "rgba(107, 114, 128, 0.5)",
  },
});
