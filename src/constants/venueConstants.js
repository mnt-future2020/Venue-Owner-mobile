// ── Sport Suggestions ───────────────────────────────────────────────
export const SPORT_SUGGESTIONS = [
  "Football",
  "Cricket",
  "Badminton",
  "Basketball",
  "Tennis",
  "Volleyball",
  "Table Tennis",
  "Hockey",
  "Pickleball",
  "Swimming",
];

// ── Amenity Suggestions ─────────────────────────────────────────────
export const AMENITY_SUGGESTIONS = [
  "Parking",
  "Washroom",
  "Changing Room",
  "Drinking Water",
  "Floodlights",
  "Cafeteria",
  "First Aid",
  "WiFi",
  "Seating Area",
  "Scoreboard",
];

// ── Sport Labels (lowercase key → display label) ────────────────────
export const SPORT_LABELS = {
  football: "Football",
  cricket: "Cricket",
  badminton: "Badminton",
  basketball: "Basketball",
  tennis: "Tennis",
  table_tennis: "Table Tennis",
  "table tennis": "Table Tennis",
  volleyball: "Volleyball",
  hockey: "Hockey",
  kabaddi: "Kabaddi",
  swimming: "Swimming",
  pickleball: "Pickleball",
};

export function getSportLabel(key) {
  if (!key) return key;
  return SPORT_LABELS[key] || SPORT_LABELS[key.replace(/ /g, "_")] || key;
}

// ── Sport Colors (React Native style values) ────────────────────────
export const SPORT_COLORS = {
  football: { background: "#dcfce7", text: "#15803d" },
  cricket: { background: "#e0f2fe", text: "#0369a1" },
  badminton: { background: "#f3e8ff", text: "#7e22ce" },
  basketball: { background: "#ffedd5", text: "#c2410c" },
  tennis: { background: "#fef9c3", text: "#a16207" },
  table_tennis: { background: "#fce7f3", text: "#be185d" },
  "table tennis": { background: "#fce7f3", text: "#be185d" },
  volleyball: { background: "#dbeafe", text: "#1d4ed8" },
  hockey: { background: "#fee2e2", text: "#b91c1c" },
  kabaddi: { background: "#fef3c7", text: "#b45309" },
  swimming: { background: "#cffafe", text: "#0e7490" },
  pickleball: { background: "#ecfccb", text: "#4d7c0f" },
};

export function getSportColor(key) {
  if (!key) return { background: "#f3f4f6", text: "#6b7280" };
  return (
    SPORT_COLORS[key] ||
    SPORT_COLORS[key.replace(/ /g, "_")] ||
    { background: "#f3f4f6", text: "#6b7280" }
  );
}

// ── Sport Icon Names (MaterialCommunityIcons / Ionicons names) ──────
export const SPORT_ICON_NAMES = {
  football: "soccer",
  cricket: "cricket",
  badminton: "badminton",
  basketball: "basketball",
  tennis: "tennis",
  table_tennis: "table-tennis",
  "table tennis": "table-tennis",
  volleyball: "volleyball",
  hockey: "hockey-sticks",
  kabaddi: "karate",
  swimming: "swim",
  pickleball: "tennis",
};

export const SPORT_ICON_FALLBACK = "trophy-outline";

export function getSportIconName(key) {
  if (!key) return SPORT_ICON_FALLBACK;
  return (
    SPORT_ICON_NAMES[key] ||
    SPORT_ICON_NAMES[key.replace(/ /g, "_")] ||
    SPORT_ICON_FALLBACK
  );
}

// ── Amenity Icon Names (MaterialCommunityIcons names) ───────────────
export const AMENITY_ICON_MAP = {
  Parking: "car",
  Floodlights: "flash",
  "Changing Room": "shield-check",
  "Changing Rooms": "shield-check",
  Washroom: "shield-check",
  AC: "air-conditioner",
  Shower: "water",
  "Drinking Water": "water",
  "Water Cooler": "water",
  Cafe: "coffee",
  Cafeteria: "coffee",
  "Pro Shop": "shopping",
  Coaching: "trophy",
  WiFi: "wifi",
  "Video Analysis": "video",
  "First Aid": "alert-circle",
  Nets: "check-circle",
  "Bowling Machine": "check-circle",
  "Seating Area": "account-group",
  Scoreboard: "trophy",
};

export function getAmenityIconName(name) {
  return AMENITY_ICON_MAP[name] || "check-circle";
}
