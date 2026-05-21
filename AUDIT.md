# Venue App Audit

Read-only audit of `d:/lobbi_new/venue/src/`. Goal: identify real, actionable improvements without breaking any existing functionality.

The codebase is largely in good shape — proper cache layer, react-native-dotenv wired, useCachedResource pattern across screens, role-gated profile components, FlatList for long lists, cleanup functions in place on intervals/timeouts. Most "issues" flagged by a quick automated audit turned out to be false positives once verified against the actual code.

This document lists only **verified** issues.

---

## 1. Tracked TODOs / unfinished work

### 1.1 Notification tap routing — `src/app/(stack)/notifications.js:321`

**Severity:** UX gap
**Current state:** Tapping a notification only marks it read; no navigation.

```js
const handlePress = useCallback(
  (item) => {
    if (!item.is_read) handleMarkRead(item.id);
    // TODO: route by type (booking → /(stack)/venues with id, etc.)
  },
  [handleMarkRead]
);
```

**Recommended fix:** Dispatch on `item.type` to the matching stack screen:
- `booking` / `booking_confirmed` → `/(stack)/venues` filtered to the venue
- `slot_available` → `/(stack)/venues` with `?tab=slots`
- `game_completed` → venue detail
- Default: no-op

**Effort:** ~30 min. Safe — only adds navigation, doesn't alter existing mark-read flow.

---

## 2. Performance — quick wins

### 2.1 Notification poll dedup — `src/context/NotificationBadgeContext.js:39-44`

**Severity:** Low impact (10s interval, single source).
**Current state:** The 10s polling and any user-initiated `refresh()` can fire back-to-back if a manual refresh lands moments before the interval tick. The underlying `useCachedResource` already de-dupes via `queryCache.inFlight`, so this rarely causes a real duplicate request — but the call still goes through the React/state machinery.

**Recommended fix:** None required immediately. The cache's in-flight dedup is sufficient. If the backend log ever shows actual duplicates again, add a `lastFetchAt` ref and skip the interval tick if the cache was touched within the last 5s.

### 2.2 Inline styles in JSX — 150 occurrences across `src/components/` and `src/app/`

**Severity:** Very low. Most are conditional one-off styles (`style={[a, condition && b]}` patterns) that already use StyleSheet refs as the base. Hoisting them all would be churn without measurable perf benefit on modern RN's bridge.

**Recommended fix:** None. Inline `style={[...]}` arrays are idiomatic and fast.

### 2.3 Audit was the bottleneck — not the code

Codebase already uses:
- `useCachedResource` everywhere with `revalidateOnMount: false` (no-blink pattern)
- Module-level `_cache` for sub-tabs (`_bookingsCache`, `_slotsCache`, etc.) per mobile player parity
- Shared cache keys (`venue:owner-venues`) across dashboard / venues / finance / profile
- Single global notification poll via `NotificationBadgeContext`
- FlatList with `keyExtractor` for long lists
- `expo-image` with `transition` for the avatar (real-time updates)

No quick wins remain at the structural level.

---

## 3. Verified clean (no fix needed)

The following items were flagged in an exploratory pass but were verified to be **already correct** in the source:

| Item | File:line | Status |
|---|---|---|
| `setInterval` cleanup in forgot-password countdown | `(auth)/forgot-password.js:49,56` | ✅ `return () => clearInterval(t)` present |
| `setTimeout` cleanup in LocationAutocomplete debounce | `components/venue/LocationAutocomplete.js:54,57` | ✅ `clearTimeout` both before set and in return |
| `searchTimerRef` cleanup in notifications screen | `(stack)/notifications.js:178` | ✅ `clearTimeout(searchTimerRef.current)` before each new set |
| `refreshTimerRef` cleanup in AuthContext | `context/AuthContext.js:62,145,171` | ✅ Cleared on schedule, logout, and unmount |
| `netAmount` null guard in BookingRow | `components/booking/BookingRow.js:85-89` | ✅ `Number(x) \|\| 0` short-circuits undefined |
| `QrCode` "duplicate" import in venues.js | `(tabs)/venues.js:19,26` | ✅ `QrCode` (used in modal at L257) + `QrCodeIcon` alias (used in tab list at L56) — both legitimately distinct |
| `Header.js setTimeout` in body | `components/Header.js:190,240` | ✅ Inside onPress handlers, not render |
| `useMemo(() => toIsoDate(new Date()), [])` for `today` | various `[id].js` | ✅ Correct usage — computed once on mount, what was intended |

---

## 4. Bundle / imports

Audited `import * as` usages — all 10 occurrences are legitimate Expo SDK namespace imports (recommended pattern):

- `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`
- `expo-splash-screen`, `expo-clipboard`, `expo-location`

These are SDK conventions, not bloat.

`lucide-react-native` imports are all named imports (`import { Award, Building2, ... }`), which tree-shake correctly. Verified — no `import *` of the whole lucide library anywhere.

---

## 5. What I'd watch for going forward

These aren't bugs in the current code, but areas to keep an eye on:

- **Background refetch UX (no-blink rule):** Every `useCachedResource` call must keep `revalidateOnMount: false` to avoid the 2-3 second post-render flash. The rule is documented in earlier sessions' work — any new caller that forgets to pass it will re-introduce the blink.

- **Cache key explosion:** Cache keys like `dashboard:analytics:<venueId>:<start>:<end>` can grow unbounded if users change date filters often. The GC sweep (`gcTime = 10 min`) handles this, but if you ever ship a session that exceeds 100+ keys per screen, consider pruning by key prefix.

- **Stub services:** `socialService` is now real, but `feedService`, `engagementService`, `coachingService`, `WishlistContext` are stubs. If any new screen accidentally relies on real data from one of these, it will silently render empty. Document which screens depend on real vs stub data when adding new ones.

- **PlayerCardScreenContent.js (2660 lines, copied verbatim from mobile):** This file has many code paths that are player-only. They render harmlessly for venue owners because the underlying data is null/empty. If a future change there adds a player-only side effect, it'll fire for venue owners too. Worth a focused refactor pass eventually — gate the player-only sections behind `role === "player"`.

---

## Summary

| Category | Real findings | Action |
|---|---|---|
| Crash risk | 0 | — |
| Memory leaks | 0 | — |
| Network waste | 0 | — |
| Dead code | 0 critical | — |
| TODOs | 1 (notification tap routing) | Apply in this session |
| Hardcoded values | A few intervals (10s poll, 60s TTL) | Acceptable inline — extract only if you need to tune at runtime |
| Bundle bloat | None | — |

**Single applied improvement this session:** notification tap routing for `booking` / `slot_available` / `game_completed` types.

Everything else is already in good shape — the recent work (cache layer, role gating, no-blink pattern, real-time avatar, profile tab grid, settings UI fixes) addressed the main quality issues.
