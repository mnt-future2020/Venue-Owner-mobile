import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Pencil, ExternalLink, Trash2, MapPin, Star } from "lucide-react-native";
import { PRIMARY_COLOR, FONTS } from "../../constants/theme";

// Web parity: hero image + name + sport chips + base price + rating + status + actions
export default function VenueCard({ venue, onPress, onEdit, onView, onDelete }) {
  const heroImage = venue?.images?.[0] || null;
  const sports = venue?.sports || [];
  const turfCount = venue?.turfs || venue?.turf_config?.reduce((acc, t) => acc + (t.turfs?.length || 0), 0) || 0;
  const isActive = venue?.account_status === "active" || venue?.account_status === undefined;

  const TapWrap = onPress ? TouchableOpacity : View;
  const tapProps = onPress ? { onPress, activeOpacity: 0.85 } : {};

  return (
    <TapWrap style={styles.card} {...tapProps}>
      {/* Hero image */}
      {heroImage ? (
        <Image source={{ uri: heroImage }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <MapPin size={28} color="#9CA3AF" />
        </View>
      )}

      {/* Status badge */}
      <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
        <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
          {isActive ? "Active" : (venue?.account_status || "Inactive")}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{venue?.name || "Untitled venue"}</Text>
        <View style={styles.locRow}>
          <MapPin size={12} color="#6B7280" />
          <Text style={styles.locText} numberOfLines={1}>
            {[venue?.area, venue?.city].filter(Boolean).join(", ") || "—"}
          </Text>
        </View>

        {/* Sport chips */}
        {sports.length > 0 && (
          <View style={styles.chipsRow}>
            {sports.slice(0, 4).map((s, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{String(s).charAt(0).toUpperCase() + String(s).slice(1)}</Text>
              </View>
            ))}
            {sports.length > 4 ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>+{sports.length - 4}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Base Price</Text>
            <Text style={styles.metaValue}>₹{venue?.base_price || 0}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Turfs</Text>
            <Text style={styles.metaValue}>{turfCount}</Text>
          </View>
          {venue?.rating ? (
            <>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Rating</Text>
                <View style={styles.ratingRow}>
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.metaValue}>{Number(venue.rating).toFixed(1)}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <ActionBtn icon={<Pencil size={14} color={PRIMARY_COLOR} />} label="Edit" onPress={onEdit} />
          <ActionBtn icon={<ExternalLink size={14} color="#6B7280" />} label="View" onPress={onView} />
          <ActionBtn
            icon={<Trash2 size={14} color="#EF4444" />}
            label="Delete"
            onPress={onDelete}
            tone="danger"
          />
        </View>
      </View>
    </TapWrap>
  );
}

function ActionBtn({ icon, label, onPress, tone }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, tone === "danger" ? styles.actionBtnDanger : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          tone === "danger" ? styles.actionLabelDanger : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    marginBottom: 16,
  },
  hero: {
    width: "100%",
    height: 140,
    backgroundColor: "#F3F4F6",
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: `${PRIMARY_COLOR}E6`,
    borderColor: PRIMARY_COLOR,
  },
  badgeInactive: {
    backgroundColor: "rgba(107, 114, 128, 0.9)",
    borderColor: "#6B7280",
  },
  badgeText: {
    fontSize: 9,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  badgeTextActive: { color: "#FFFFFF" },
  badgeTextInactive: { color: "#FFFFFF" },

  body: {
    padding: 16,
  },
  name: {
    fontSize: 16,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locText: {
    marginLeft: 4,
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: "#6B7280",
    fontWeight: "600",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: `${PRIMARY_COLOR}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  chipText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: "center",
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#F3F4F6",
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: FONTS.displayBlack,
    fontWeight: "900",
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.7)",
    paddingVertical: 9,
    borderRadius: 9999,
  },
  actionBtnDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  actionLabel: {
    marginLeft: 5,
    fontSize: 10,
    fontFamily: FONTS.bodyExtraBold,
    fontWeight: "900",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionLabelDanger: {
    color: "#EF4444",
  },
});
