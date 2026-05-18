// Per-sport icon mapping using Ionicons names
// Matches frontend's getSportIcon() from lib/venue-constants.js

const SPORT_ICONS = {
  football: "football-outline",
  cricket: "baseball-outline",
  badminton: "tennisball-outline",
  basketball: "basketball-outline",
  tennis: "tennisball-outline",
  table_tennis: "tennisball-outline",
  "table tennis": "tennisball-outline",
  volleyball: "basketball-outline",
  hockey: "hockey-puck-outline",
  kabaddi: "people-outline",
  swimming: "water-outline",
  pickleball: "tennisball-outline",
};

const FALLBACK_ICON = "trophy-outline";

export function getSportIconName(key) {
  if (!key) return FALLBACK_ICON;
  return SPORT_ICONS[key] || SPORT_ICONS[key.replace(/ /g, "_")] || FALLBACK_ICON;
}
