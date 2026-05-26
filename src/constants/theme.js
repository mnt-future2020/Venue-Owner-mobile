export const PRIMARY_COLOR = '#059669';

// Font families — matching frontend (Manrope = body, Chivo = headings)
export const FONTS = {
  body: "Manrope-Regular",
  bodyMedium: "Manrope-Medium",
  bodySemiBold: "Manrope-SemiBold",
  bodyBold: "Manrope-Bold",
  bodyExtraBold: "Manrope-ExtraBold",
  display: "Chivo-Regular",
  displayBold: "Chivo-Bold",
  displayBlack: "Chivo-Black",
};

export const WARNING_COLOR = "#F59E0B";
export const ERROR_COLOR = "#EF4444";
export const SECONDARY_COLOR = PRIMARY_COLOR;
export const NEUTRAL_COLOR = "#64748B";
export const SUCCESS_COLOR = "#22C55E";
export const SURFACE_COLOR = "#F8FAFC";
export const BORDER_COLOR = "#E2E8F0";

export const STATUS_COLORS = {
  win: { color: "#059669", bg: "#ECFDF5" },
  loss: { color: "#EF4444", bg: "#FEF2F2" },
  draw: { color: "#D97706", bg: "#FEF3C7" },
  open: { color: "#059669", bg: "#ECFDF5" },
  live: { color: "#EF4444", bg: "#FEF2F2" },
  completed: { color: "#64748B", bg: "#F1F5F9" },
  pending: { color: "#F59E0B", bg: "#FEF3C7" },
  cancelled: { color: "#6B7280", bg: "#F3F4F6" },
};

export const SPORT_GRADIENTS = {
  cricket: ["#059669", "#047857"],
  football: ["#2563EB", "#1D4ED8"],
  basketball: ["#EA580C", "#C2410C"],
  tennis: ["#D97706", "#B45309"],
  badminton: ["#7C3AED", "#6D28D9"],
  volleyball: ["#DC2626", "#B91C1C"],
  swimming: ["#0891B2", "#0E7490"],
  default: ["#059669", "#047857"],
};

// Story background palette — exact mirror of frontend SocialFeedPage STORY_COLORS
// (Tailwind classes `from-X to-Y` rendered as native LinearGradient pairs). Each
// entry's `key` matches the frontend string so a story posted from web AND mobile
// renders with the same gradient on both platforms (the backend stores `bg_color`
// as the Tailwind class string verbatim).
export const STORY_GRADIENTS = [
  { key: "from-green-500 to-brand-600",  colors: ["#22C55E", "#059669"] },
  { key: "from-blue-500 to-indigo-600",  colors: ["#3B82F6", "#4F46E5"] },
  { key: "from-purple-500 to-pink-600",  colors: ["#A855F7", "#DB2777"] },
  { key: "from-orange-500 to-red-600",   colors: ["#F97316", "#DC2626"] },
  { key: "from-cyan-500 to-blue-600",    colors: ["#06B6D4", "#2563EB"] },
  { key: "from-rose-500 to-pink-600",    colors: ["#F43F5E", "#DB2777"] },
];

export function getStoryGradientColors(key) {
  return STORY_GRADIENTS.find((g) => g.key === key)?.colors || ["#22C55E", "#059669"];
}

export const STORY_COLORS = STORY_GRADIENTS.map((g) => g.colors[0]);

export const COLORS = {
  primary: PRIMARY_COLOR,
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};
