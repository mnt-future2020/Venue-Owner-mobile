export const SPORTS = [
  { key: "football", label: "Football" },
  { key: "cricket", label: "Cricket" },
  { key: "badminton", label: "Badminton" },
  { key: "tennis", label: "Tennis" },
  { key: "basketball", label: "Basketball" },
  { key: "volleyball", label: "Volleyball" },
  { key: "table_tennis", label: "Table Tennis" },
  { key: "swimming", label: "Swimming" },
];

export const SPORT_LABELS = SPORTS.map((s) => s.label);
export const SPORT_FILTER_OPTIONS = ["All", ...SPORT_LABELS];
export const SPORT_KEYS = SPORTS.map((s) => s.key);
