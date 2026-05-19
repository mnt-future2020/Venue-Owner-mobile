import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Pencil,
  ExternalLink,
  QrCode,
  Plus,
  X,
  Copy,
  CalendarDays,
  Lock,
  Users,
  QrCode as QrCodeIcon,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

import { PRIMARY_COLOR, FONTS } from "../../constants/theme";
import Header from "../../components/Header";
import DropdownSelect from "../../components/ui/DropdownSelect";
import EmptyState from "../../components/ui/EmptyState";
import venueService from "../../services/venueService";
import toast from "../../utils/toast";

import {
  BookingsTab,
  SlotsTab,
  HoldsTab,
  WalkinTab,
  CheckinTab,
} from "../(stack)/venues/[id]";

const TABS = [
  { key: "bookings", label: "Bookings", icon: null },
  { key: "slots", label: "Slots", icon: CalendarDays },
  { key: "holds", label: "Holds", icon: Lock },
  { key: "checkin", label: "Check-in", icon: QrCodeIcon },
  { key: "walkin", label: "Walk-in", icon: Users },
];

// Mirrors frontend buildVenueDetailUrl from lib/sport-slugs.js → /venue-turf/{city}/{slug}
const VENUE_BASE = "/venue-turf";
const PUBLIC_ORIGIN = "https://app.lobbi.in";

function buildVenueDetailPath(venue) {
  if (!venue) return null;
  const citySlug = (venue.city || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const slug =
    venue.slug || (venue.name || "").toLowerCase().trim().replace(/\s+/g, "-");
  if (!slug) return null;
  if (!citySlug) return `${VENUE_BASE}/${slug}`;
  return `${VENUE_BASE}/${citySlug}/${slug}`;
}

function buildPublicUrl(venue) {
  const path = buildVenueDetailPath(venue);
  return path ? `${PUBLIC_ORIGIN}${path}` : null;
}

export default function VenueManagementScreen() {
  const router = useRouter();
  const [venues, setVenues] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings");
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await venueService.getOwnerVenues();
      const arr = Array.isArray(list) ? list : [];
      setVenues(arr);
      if (arr.length > 0) {
        setSelectedId((cur) => {
          if (cur && arr.some((v) => v.id === cur)) return cur;
          return arr[0].id;
        });
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      toast.error(
        "Failed",
        err?.response?.data?.detail || "Could not load venues."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedId) || null,
    [venues, selectedId]
  );

  const publicUrl = useMemo(() => buildPublicUrl(selectedVenue), [selectedVenue]);
  const publicPath = useMemo(() => buildVenueDetailPath(selectedVenue), [selectedVenue]);

  const venueOptions = useMemo(
    () => venues.map((v) => ({ key: v.id, label: v.name })),
    [venues]
  );

  const handleAdd = () => router.push("/(stack)/venues/form");
  const handleEdit = () => {
    if (!selectedVenue) return;
    router.push({
      pathname: "/(stack)/venues/form",
      params: { id: selectedVenue.id },
    });
  };
  const handleOpenPublic = () => {
    if (!publicUrl) {
      toast.error("No public URL", "This venue has no slug set yet.");
      return;
    }
    Linking.openURL(publicUrl).catch(() =>
      toast.error("Failed", "Could not open the link.")
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header title="Venue Management" subtitle="Manage your facilities" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  if (venues.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Header title="Venue Management" subtitle="Manage your facilities" />
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No venues yet"
            subtitle="Tap + to add your first venue."
          />
          <TouchableOpacity
            style={styles.addBigBtn}
            onPress={handleAdd}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBigBtnText}>Add Your First Venue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <Header
        title="Venue Management"
        subtitle={`${venues.length} ${venues.length === 1 ? "venue" : "venues"}`}
      />

      {/* Venue selector card — dropdown on top row, actions row below
          guarantees Edit/Public/QR icons stay visible next to Add Venue */}
      <View style={styles.venueCard}>
        {/* Row 1: venue dropdown full width */}
        <DropdownSelect
          value={selectedId}
          options={venueOptions}
          onSelect={(k) => setSelectedId(k)}
          placeholder="Select venue"
        />

        {/* Row 2: action icons (left) + Add Venue button (right) */}
        <View style={styles.actionRow}>
          {selectedVenue?.slug ? (
            <View style={styles.iconBtnRow}>
              <TouchableOpacity
                onPress={handleEdit}
                style={styles.iconBtn}
                activeOpacity={0.75}
              >
                <Pencil size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenPublic}
                style={styles.iconBtn}
                activeOpacity={0.75}
              >
                <ExternalLink size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setQrOpen(true)}
                style={styles.iconBtn}
                activeOpacity={0.75}
              >
                <QrCode size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <TouchableOpacity
            onPress={handleAdd}
            style={styles.addBtn}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add Venue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal tab bar */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
                style={styles.tabBtn}
              >
                <View style={styles.tabBtnInner}>
                  {Icon ? (
                    <Icon
                      size={12}
                      color={active ? PRIMARY_COLOR : "#9CA3AF"}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.tabLabel,
                      active ? styles.tabLabelActive : styles.tabLabelInactive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tabUnderline,
                    active && styles.tabUnderlineActive,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab content */}
      <View style={styles.contentArea}>
        {!selectedVenue ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={PRIMARY_COLOR} />
          </View>
        ) : (
          <>
            {activeTab === "bookings" && (
              <BookingsTab key={selectedVenue.id} venueId={selectedVenue.id} />
            )}
            {activeTab === "slots" && (
              <SlotsTab key={selectedVenue.id} venueId={selectedVenue.id} />
            )}
            {activeTab === "holds" && (
              <HoldsTab key={selectedVenue.id} venue={selectedVenue} />
            )}
            {activeTab === "walkin" && (
              <WalkinTab
                key={selectedVenue.id}
                venueId={selectedVenue.id}
                venue={selectedVenue}
              />
            )}
            {activeTab === "checkin" && (
              <CheckinTab
                key={selectedVenue.id}
                venueId={selectedVenue.id}
                venueName={selectedVenue?.name}
              />
            )}
          </>
        )}
      </View>

      {/* QR Modal */}
      <Modal
        visible={qrOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQrOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.qrOverlay} onPress={() => setQrOpen(false)}>
          <Pressable style={styles.qrCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Venue QR Code</Text>
              <TouchableOpacity
                onPress={() => setQrOpen(false)}
                hitSlop={8}
                style={styles.qrCloseBtn}
              >
                <X size={18} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>
            {publicUrl ? (
              <>
                <View style={styles.qrBox}>
                  <QRCode
                    value={publicUrl}
                    size={200}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                {selectedVenue?.name ? (
                  <Text style={styles.qrVenueName} numberOfLines={1}>
                    {selectedVenue.name}
                  </Text>
                ) : null}
                <Text style={styles.qrUrl} numberOfLines={2}>
                  {publicPath || publicUrl}
                </Text>
                <Text style={styles.qrSubtitle}>
                  Share this QR code with your customers so they can quickly
                  access your venue's public page.
                </Text>
                <View style={styles.qrBtnRow}>
                  <TouchableOpacity
                    style={[styles.qrBtn, styles.qrBtnOutline]}
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(publicUrl);
                        toast.success("Link copied");
                      } catch {
                        toast.error("Failed to copy link");
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Copy size={14} color="#0F172A" />
                    <Text style={styles.qrBtnOutlineText}>Copy Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.qrBtn, styles.qrBtnPrimary]}
                    onPress={() => setQrOpen(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.qrBtnPrimaryText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.qrEmpty}>
                No public URL — venue has no slug yet.
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  // Venue selector card (matches frontend bg-card/50 rounded-2xl)
  venueCard: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    borderRadius: 16,
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconBtnRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    fontSize: 12,
  },
  addBigBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 9999,
  },
  addBigBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Tab bar (matches frontend sticky tabs)
  tabsWrap: {
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229, 231, 235, 0.7)",
    backgroundColor: "#FFFFFF",
  },
  tabsRow: { paddingHorizontal: 16, gap: 18, alignItems: "flex-end" },
  tabBtn: { paddingTop: 8, alignItems: "center" },
  tabBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabLabelActive: { color: PRIMARY_COLOR },
  tabLabelInactive: { color: "#9CA3AF" },
  tabUnderline: { height: 2, width: "100%", backgroundColor: "transparent" },
  tabUnderlineActive: { backgroundColor: PRIMARY_COLOR },

  contentArea: { flex: 1 },

  // QR Modal
  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  qrCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  qrHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#0F172A",
  },
  qrCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${PRIMARY_COLOR}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  qrBox: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 12,
  },
  qrVenueName: {
    fontSize: 14,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  qrUrl: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    textAlign: "center",
    marginBottom: 12,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  qrSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  qrEmpty: { fontSize: 13, color: "#9CA3AF", paddingVertical: 24 },
  qrBtnRow: { flexDirection: "row", gap: 8, width: "100%" },
  qrBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  qrBtnOutline: {
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.9)",
    backgroundColor: "#FFFFFF",
  },
  qrBtnOutlineText: { color: "#0F172A", fontWeight: "800", fontSize: 13 },
  qrBtnPrimary: { backgroundColor: PRIMARY_COLOR },
  qrBtnPrimaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
});
