# Venue Owner App — Implementation Plan

> **Goal:** Build the Lobbi Venue Owner mobile app (React Native / Expo) with **100% feature parity** with the web frontend (`frontend/`). UI, flow, validations, API calls — exact match.
>
> **Source of truth:** `frontend/src/pages/VenueOwnerDashboard.js`, `frontend/src/pages/VenueFinancePage.js`, `frontend/src/pages/OwnerTransactionsPage.js`, `frontend/src/pages/POSPage.js`, `frontend/src/pages/IoTDashboard.js` and their components + backend routes under `backend/routes/venue/`, `backend/routes/player/bookings.py`, `backend/routes/admin/payouts.py`, `backend/core/cashfree_client.py`.
>
> **How to use this doc:** Each Phase below has discrete tasks (checkboxes). Work through them sequentially. Mark each `[x]` when done. Don't skip ahead — each phase builds on previous.

---

## 0. Foundation status (already done)

- [x] package.json mirrors mobile/ (all deps installed, Cashfree SDK included)
- [x] app.json venue-branded (`Lobbi Venue`, `com.lobbi.venue`, all permissions + plugins)
- [x] eas.json synced with mobile
- [x] babel/metro/tailwind configs identical to mobile
- [x] `src/lib/axios.js` (HTTP client with JWT refresh)
- [x] `src/constants/theme.js` (PRIMARY_COLOR, fonts, status colors)
- [x] `src/context/AuthContext.js` (auth state)
- [x] `src/components/ui/` (19 reusable components: AppCard, AppModal, AppScreen, DropdownSelect, EmptyState, ErrorBoundary, LocationPickerModal, etc.)
- [x] `src/components/auth/` (AuthButton, AuthHeader, AuthInput, AuthLink, OtpInput, PasswordField)
- [x] Player-only services + chat hooks + Cart/Wishlist contexts removed
- [x] `src/services/` has 24 owner-relevant services (auth, payment, payout, venue, booking, upload, slotLock, etc.)
- [x] assets (logo, splash, fonts) copied from mobile

---

## Phase 1 — Auth & App Shell

**Goal:** Owner login → token stored → land on dashboard. Owner role check.

### Tasks

- [x] **1.1** `src/app/(auth)/login.js` — Email/phone + password form ✅
  - Mobile pattern matched (AuthScreen + AuthInput + PasswordField + AuthButton)
  - Role check enforces `venue_owner` (player → error + logout)
  - Account status checks: pending / rejected / suspended → error + logout
  - 429 rate limit error handled
  - Redirects to `/(tabs)/dashboard` on success
  - "Forgot Password?" link → `/(auth)/forgot-password`
  - No Register link (owners onboarded externally)

- [x] **1.2** `src/app/(auth)/forgot-password.js` + `reset-password.js` ✅
  - 100% mobile parity — 2-stage OTP + new password screen
  - Phone normalize (`cleanPhone` strips +91, max 10 digits)
  - 6-digit OTP via `OtpInput`, 60s resend countdown
  - Password regex `(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}`
  - `otp-verification.js` NOT created — owner-only app, no self-registration flow needs it
  - `(auth)/_layout.js` registers: login, forgot-password, reset-password (3 screens)

- [x] **1.3** `src/app/_layout.js` — Wrap with providers + auth-aware index ✅
  - Providers: GestureHandlerRootView → KeyboardProvider → SafeAreaProvider → AuthProvider → TabRefreshProvider → LocationProvider
  - Font loading (Manrope + Chivo families) + SplashScreen.preventAutoHideAsync
  - ToastManager mounted at root
  - `src/app/index.js` — splash GIF 2s + auth gate (no user → login, wrong role → logout+login, owner → `/(tabs)/dashboard`)
  - `src/app/(tabs)/_layout.js` — only `dashboard` screen registered (other tabs in 1.4)
  - `src/app/(tabs)/dashboard.js` — placeholder showing user name/role/business + Logout button

- [x] **1.4** `src/app/(tabs)/_layout.js` — Bottom tab bar (5 tabs) ✅
  - expo-router `<Tabs>` (mobile's SwipeableTabView replaced with standard tabs for owner)
  - 5 tabs: Dashboard / Venues / Bookings / Finance / Profile with lucide icons
  - Active tint `PRIMARY_COLOR`, inactive `#9CA3AF`, 64px height
  - Placeholder screens for venues/bookings/finance (filled in later phases)

- [x] **1.5** `src/app/(tabs)/profile.js` — Profile + Logout ✅
  - Avatar with initials, name, "Venue Owner" badge
  - Account section: Email, Phone (+91 prefix), Business, GST (if present)
  - Settings section: Notifications, Privacy & Security (link placeholders)
  - Logout with native confirmation Alert → clear session via `useAuth().logout()` → `safeReplace` to login
  - Version footer

---

## Phase 2 — Dashboard (Owner Overview)

**Source:** `frontend/src/pages/VenueOwnerDashboard.js`

**Goal:** Stats cards + venue list + 8-section tabbed interface.

### 2.A Stats Cards (top of dashboard)

API: `GET /api/venues/owner/metrics` (or composite from analytics/finance summary)

Cards (responsive grid, 2 cols mobile):
- **Total Bookings** — count, all-time
- **Revenue Today** — ₹X (online + walk-in)
- **Revenue This Month** — ₹X
- **Avg Rating** — ⭐ X.X (count)
- **Pending Settlements** — ₹X
- **Active Venues** — count

### 2.B Venue list (below stats)

API: `GET /api/venues/owner` → array of venue objects

Each card shows:
- Name, sport(s), base price, total turfs, rating + review count, total bookings, status badge (active/draft/inactive)
- Actions: **Edit** (pencil), **View Analytics** (chart), **Public Page** (external), **Delete** (trash with confirm modal)
- **"+ Add Venue"** button (top-right floating) → opens VenueForm screen

### 2.C 8 Section Tabs (selected venue)

Horizontal scrollable tabs at top of selected venue:
1. **Bookings** → Phase 4
2. **Slots** → Phase 3.5 (calendar grid view)
3. **Reviews** → list of customer reviews + ratings
4. **Pricing Rules** → Phase 3.6 (surge/discount rules CRUD)
5. **Holds** → Phase 3.4 (HoldRulesPanel)
6. **Plan** → subscription tier + venue limits
7. **Check-in** → Phase 6 (QR + token entry)
8. **Walk-in** → Phase 5 (POS booking)

### Tasks

- [ ] **2.1** Create `src/app/(tabs)/dashboard.js`
- [ ] **2.2** Create `src/services/analyticsService.js` wrapper for `/venue-finance/analytics/finance-summary` and `/venues/owner/metrics`
- [ ] **2.3** Stats card component — 2-col responsive grid with icon + label + value + animated entrance
- [ ] **2.4** Venue list card — show all fields + 4 action buttons; tap card → drill into venue detail (Phase 3)
- [ ] **2.5** Empty state — when no venues: "Add your first venue" CTA
- [ ] **2.6** Delete venue confirmation — `AppModal` with venue name typed for confirm
- [ ] **2.7** Pull-to-refresh on FlatList

---

## Phase 3 — Venue Management

**Sources:** `frontend/src/components/venue/VenueForm.js`, `HoldRulesPanel.js`, `TurfConfigPanel.js`, `HoursSelector.js`, `AmenityChipSelector.js`, `SportChipSelector.js`, `VenueImageUpload.js`, `LocationAutocomplete.js`

**Goal:** Full venue CRUD + slots + holds + pricing rules + amenities + images.

### 3.1 Venue Form (Create / Edit)

Screen: `src/app/(stack)/venues/form.js` (?id=... for edit)

API:
- Create: `POST /api/venues` (body = full venue object below)
- Update: `PUT /api/venues/{venue_id}` (partial body — changed fields only)
- Get one: `GET /api/venues/{venue_id}`

#### Form sections (sequential — exact order from web)

**Section 1 — Basic Information**
- `name` — TextInput, required; **read-only in edit mode**
- `description` — Rich text via WebView or `react-native-pell-rich-editor`; read-only in edit mode (show as HTML block)

**Section 2 — Location** (required)
- `city`, `area` — autocomplete via `LocationAutocomplete` (debounced 300ms calls to `GET /api/venues/places/autocomplete?q=...` → list of `{place_id, main_text, secondary_text}`)
- On select: `GET /api/venues/places/details/{place_id}` → `{lat, lng, city}`, then `GET /api/venues/reverse-geocode?lat=&lng=` → `{city, area}`
- "Use Current Location" button → `expo-location.getCurrentPositionAsync()` → reverse geocode
- `address` — optional TextInput
- Show lat/lng at 4 decimals after pick
- City/area: **read-only in edit mode**

**Section 3 — Sports & Turfs** (required)
- `sports` — `SportChipSelector`: predefined chips (Cricket, Football, Badminton, Tennis, Basketball, Volleyball, Pickleball, etc.) + custom input
  - Validation: ≥1 sport required
  - Stored lowercase, displayed title-case
- `turf_config` — `TurfConfigPanel` (per sport):
  - For each selected sport: list of turfs
  - Each turf row: name (TextInput, default "{Sport} Turf {#}"), price (numeric, ₹ prefix, step 100, default 2000), lobbians (numeric, min 1, default 1), "Base price" radio (one per sport), delete button (if >1)
  - "Add Turf" button per sport
  - Auto-computes: `turfs` = total count, `base_price` = price of base-marked turf

**Section 4 — Amenities**
- `amenities` — `AmenityChipSelector`: predefined (WiFi, Parking, Floodlight, Changing Room, Shower, Locker, AC, Drinking Water, Restroom, First Aid, Café) + custom chip input
- Multi-select; custom chips shown with X-remove

**Section 5 — Schedule & Settings** (`HoursSelector`)
- `opening_hour` — dropdown pair (hour 1-12 + AM/PM), default 6 AM. Internal: 0-23
- `closing_hour` — same, default 11 PM. Internal: 0-23 normally, **0-30 if overnight**
- `is_overnight` toggle — when on, closing_hour > 24 (e.g. 26 = 2 AM next day)
- Banner: "Venue operates from 6:00 AM to 2:00 AM (Next Day)"
- `slot_duration_minutes` — Switch (60 / 30), default 60

**Section 6 — Map & Media**
- `google_maps_url` — TextInput accepting iframe HTML or src URL; extract via regex `src="([^"]+)"`
- `images[]` — `VenueImageUpload`:
  - Press: open `expo-image-picker.launchImageLibraryAsync` (multi-select, image/* only)
  - For each: `uploadService.image(file, progressCallback)` → returns `{url}`
  - Display thumbnails in 3-col grid; X to remove (filters out URL)
  - Max 10MB warning per file
  - Show progress bar during upload

**Section 7 — SEO** (hidden unless admin)
- `meta_title` (max 70 chars + counter), `meta_description` (max 160 chars + counter)

#### Form behavior

- Plain `useState`, not `react-hook-form`
- `updateField(field, value)` clears that field's error
- Validation on submit only:
  - `name` not empty → "Venue name is required"
  - `city` not empty → "City is required"
  - `sports.length > 0` → "Select at least one sport"
  - `closing_hour > opening_hour` (accounting for overnight)
- Errors stored in `errors` object, rendered as `<FieldError>` under each field
- API errors → `toast.error(apiErrorMsg(err))`
- Submit button: "Create Venue" / "Save & Go Live" — disabled + spinner during submit
- Initialize from `initialValues` via `useRef(seededRef)` to prevent overwrites on re-render

### Tasks

- [ ] **3.1.1** Create `src/components/venue/SportChipSelector.js` (multi-select chips + custom input)
- [ ] **3.1.2** Create `src/components/venue/AmenityChipSelector.js` (same pattern as SportChipSelector)
- [ ] **3.1.3** Create `src/components/venue/TurfConfigPanel.js` (per-sport turf list + add/remove/edit)
- [ ] **3.1.4** Create `src/components/venue/HoursSelector.js` (12hr dropdowns + overnight toggle + 30min switch)
- [ ] **3.1.5** Create `src/components/venue/VenueImageUpload.js` (expo-image-picker + S3 upload + progress)
- [ ] **3.1.6** Create `src/components/venue/LocationAutocomplete.js` (debounced search + place details + reverse geocode + current location)
- [ ] **3.1.7** Create `src/components/venue/VenueRichEditor.js` (rich text editor for description)
- [ ] **3.1.8** Create `src/app/(stack)/venues/form.js` — wires up all above + submit
- [ ] **3.1.9** Wire `src/services/venueService.js` methods: `create`, `update`, `getOne`, `delete`, `placesAutocomplete`, `placeDetails`, `reverseGeocode`
- [ ] **3.1.10** Confirm `src/services/uploadService.js` has `image(file, progressCallback)` matching backend `POST /api/upload/image`

### 3.2 Slots tab (read-only calendar view)

API: `GET /api/slots?venue_id=&date=&sport=` → array `[{start_time, end_time, turf_number, available, price, held}]`

UI:
- Horizontal scrollable date strip (7 days)
- For each slot: tile with time range + turf number + status color
  - Green = all turfs free
  - Yellow = some booked
  - Red = all booked
  - Gray-striped = held
- Tap slot → bottom sheet with booking details or hold info

### Tasks

- [ ] **3.2.1** Create `src/components/venue/SlotCalendarView.js`
- [ ] **3.2.2** Wire to `slotLockService.getSlots(venue_id, date, sport)` (verify against `backend/routes/venue/venues.py`)

### 3.3 Hold Rules (`HoldRulesPanel`)

API:
- List: `GET /api/venues/{venue_id}/hold-rules`
- Create: `POST /api/venues/{venue_id}/hold-rules`
- Update: `PUT /api/hold-rules/{rule_id}`
- Toggle active: `PUT /api/hold-rules/{rule_id}/toggle`
- Delete: `DELETE /api/hold-rules/{rule_id}`

Form fields:
- `name` (required, TextInput)
- `label` (optional, short tag shown on slot)
- `turf_numbers` (multi-chip, empty = all turfs)
- `schedule_type` (radio: Weekly | One-time)
- If weekly: `days_of_week` (7 toggle buttons Sun-Sat, multi-select, ≥1 required)
- If one-time: `date_from`, `date_to` (HTML-style date inputs → use `@react-native-community/datetimepicker`)
- `time_from`, `time_to` (time pickers, default 18:00 / 20:00)
- `is_active` Switch (default true)

List display per card:
- Name + label badge + schedule type uppercase badge
- Schedule summary: "Mon, Tue · 6:00 PM – 8:00 PM" or "Date: Jan 5 – Jan 10 · 6:00 PM – 8:00 PM"
- Turfs: "Cricket Turf 1, Cricket Turf 2" or "All turfs"
- Active toggle, Edit (pencil), Delete (trash with confirm)

### Tasks

- [ ] **3.3.1** Create `src/components/venue/HoldRulesPanel.js`
- [ ] **3.3.2** Create `src/components/venue/HoldRuleForm.js` (modal/bottom sheet)
- [ ] **3.3.3** Wire `venueService.holdRules.*` methods

### 3.4 Pricing Rules

API: same pattern as hold rules (`/venues/{id}/pricing-rules`, etc.)

Fields:
- `name` (required)
- `rule_type` (Discount | Surge)
- `value` (numeric %)
- `value_type` (Percent | Flat amount)
- `schedule_type` (Recurring | One-time) — same conditional fields as Hold Rules
- `turf_numbers` (optional, empty = all)
- `is_active` Switch

### Tasks

- [ ] **3.4.1** Create `src/components/venue/PricingRulesPanel.js`
- [ ] **3.4.2** Create `src/components/venue/PricingRuleForm.js`
- [ ] **3.4.3** Wire `venueService.pricingRules.*` methods

---

## Phase 4 — Bookings Management (Owner View)

**Sources:** `frontend/src/pages/VenueOwnerDashboard.js` (Bookings tab), `backend/routes/player/bookings.py`

**Goal:** List bookings + filters + detail view + cancel/collect actions.

### 4.A Bookings List Screen

Screen: `src/app/(tabs)/bookings.js`

API: `GET /api/player/bookings` (yes, "player" route but owner can list their venue's bookings via role check)

Query params (all optional):
- `venue_id`, `status` (all/confirmed/pending/completed/cancelled), `time_filter` (all/today/upcoming/past), `date`, `start_date`, `end_date`, `turf_number`, `q` (search name/phone/id), `booking_type` (walk_in/online/all), `sort_order` (asc/desc), `page`, `limit` (default 15, max 100), `cursor_date`

Response shape:
```json
{
  "bookings": [{...}],
  "total": 45, "page": 1, "pages": 3,
  "stats": {"total":45, "confirmed":35, "pending":5, "cancelled":5, "upcoming":10},
  "walkin_stats": {"total_walkins":12, "today_walkins":3, "walkin_revenue":3600}
}
```

UI:
- Top: 4 stat cards (Today, Confirmed, Walk-in revenue, Pending refunds)
- Filter bar: Date filter (Today/Tomorrow/Week/All) + Status + Turf + Time-of-day + Sort
- Search input (debounced 300ms)
- FlatList of booking rows:
  - Time slot (e.g., "10:00 AM – 11:00 AM") + Turf + Sport
  - Host name + player count
  - Status badge (color-coded)
  - ₹ amount
  - Tap → opens detail bottom sheet

### 4.B Booking Detail (bottom sheet)

API: `GET /api/player/bookings/{booking_id}`

Show:
- Header: Venue + Turf + Sport
- Date/time (overnight indicator if applicable)
- Players list: host + others
- Total amount; Payment status (Full / Advance ₹X / Remaining ₹Y); Paid at timestamp (if online); Collection method (if walk-in)
- Walk-in / Online badge
- QR code (if confirmed; tap to share/download)
- Action buttons (context-dependent):
  - **Walk-in & advance**: "Collect Remaining" → POST `/api/player/bookings/{id}/collect-remaining` with `{method: cash|upi|bank_transfer}`
  - **Walk-in & confirmed**: "Cancel Booking" → POST `/api/player/bookings/{id}/cancel` (shows refund preview based on hours-until-slot tier)
  - **Contact Player** → WhatsApp deep link `whatsapp://send?phone=...&text=...` or `Linking.openURL('tel:...')`

### Refund tiers (display before cancel confirm)
- ≥24h before slot → 100% refund
- 4–24h → 50%
- <4h → 0% (no refund)
- Rate limit: max 3 full refunds per user per 7 days

### Tasks

- [ ] **4.1** Create `src/app/(tabs)/bookings.js` (list + filters + stats)
- [ ] **4.2** Create `src/components/booking/BookingFilterBar.js`
- [ ] **4.3** Create `src/components/booking/BookingRow.js`
- [ ] **4.4** Create `src/components/booking/BookingDetailSheet.js`
- [ ] **4.5** Create `src/components/booking/RefundPreview.js` (computes tier from booking time)
- [ ] **4.6** Wire `bookingService` methods: `list`, `get`, `cancel`, `collectRemaining`
- [ ] **4.7** Add pull-to-refresh + pagination (`usePagination` hook already copied)

---

## Phase 5 — Walk-in / POS

**Source:** `frontend/src/pages/POSPage.js`

**Goal:** Owner creates instant booking + collects cash/UPI + prints receipt.

### 5.A Walk-in Booking Flow

Screen: `src/app/(stack)/walkin.js` (also reachable from Dashboard → Walk-in tab)

Steps (3 screens or wizard):

**Step 1 — Slot Selection**
- Venue chip (auto-selected if only 1)
- Date picker (default today)
- Sport selector
- Time picker (start time; duration = slot_duration_minutes from venue, default 60)
- Calls `GET /api/slots?venue_id=&date=&sport=&start_time=` to show available turfs
- Pick turf chip

**Step 2 — Customer Info**
- `customer_name` (required TextInput)
- `customer_phone` (required, 10-digit validation, auto-format `+91`)
- `custom_price` (optional; default = turf price; numeric ₹)
- `payment_type` (radio: Full | Advance)
  - If Advance → show `advance_amount` input
- `payment_mode` (radio: Cash | UPI | Bank transfer)

**Step 3 — Confirm + Receipt**
- API: `POST /api/player/bookings` body:
```json
{
  "venue_id": "v123",
  "date": "2026-05-20",
  "start_time": "10:00",
  "end_time": "11:00",
  "turf_number": 1,
  "sport": "football",
  "booking_type": "walk_in",
  "customer_name": "Arjun Singh",
  "customer_phone": "9876543210",
  "custom_price": 1200,
  "payment_type": "full",
  "advance_amount": null,
  "payment_mode": "offline"
}
```
- Response: booking with `checkin_token` (8-char) + `qr_data` (base64)
- Receipt screen shows booking summary + check-in token + QR + share buttons (WhatsApp, Print, Email)
- WhatsApp share auto-includes booking details + check-in token

### 5.B POS Product Sales (separate from walk-in booking)

API:
- List products: `GET /api/venue/pos/products?venue_id=`
- Create product: `POST /api/venue/pos/products`
- Update product: `PUT /api/venue/pos/products/{id}`
- Record sale: `POST /api/venue/pos/sales`
- Daily summary: `GET /api/venue/pos/summary?venue_id=`

UI (POS Terminal screen):
- Venue chip selector
- Category tabs (All, Beverages, Snacks, Equipment, …)
- Product grid (name, price, emoji icon, stock indicator)
- Search bar
- Shopping cart panel (right on tablet, bottom sheet on phone):
  - Items with qty +/-
  - Discount input (% or ₹ flat)
  - Customer name + phone (optional for POS)
  - Total
  - Payment method (Cash | UPI)
  - "Charge ₹X" button

### Tasks

- [ ] **5.1** Create `src/app/(stack)/walkin/index.js` (multi-step wizard)
- [ ] **5.2** Create `src/components/walkin/SlotPicker.js`
- [ ] **5.3** Create `src/components/walkin/CustomerInfoForm.js`
- [ ] **5.4** Create `src/components/walkin/ReceiptView.js` (with QR via `react-native-qrcode-svg`)
- [ ] **5.5** Wire WhatsApp share (Linking.openURL) and print (react-native-print)
- [ ] **5.6** Create `src/app/(stack)/pos/index.js` (POS terminal)
- [ ] **5.7** Create `src/services/posService.js` (products + sales endpoints)
- [ ] **5.8** Create `src/components/pos/ProductGrid.js`, `CartPanel.js`, `PaymentSheet.js`

---

## Phase 6 — Check-in (QR + Token + IoT)

**Sources:** `frontend/src/pages/IoTDashboard.js`, `backend/routes/venue/iot.py`

**Goal:** Staff scans QR or enters token → booking marked as checked in. IoT lights auto-controlled.

### 6.A QR Scanner / Token Entry

Screen: `src/app/(stack)/checkin.js`

UI:
- Tab: **Scan QR** | **Enter Token**
- **Scan tab**: `expo-camera` BarCodeScanner; on detect → parse base64 booking_id → confirm screen
- **Enter Token tab**: 8-char input (auto-uppercase, hyphen optional) → submit
- Confirm screen: show booking detail (turf, time, customer) → "Confirm Check-in" button
- POST `/api/iot/checkin` (verify endpoint name in `iot.py`) with `{booking_id}` or `{checkin_token}`
- Success: "✓ Checked in" + auto-dismiss 3s

### 6.B IoT Dashboard

Screen: `src/app/(stack)/iot.js`

API endpoints (all under `/api/iot/`):
- List devices: `GET /devices?venue_id=`
- Register device: `POST /devices` with `{venue_id, name, zone_id, device_type, protocol, mqtt_topic, ip_address, power_watts, turf_number}`
- Control device: `POST /devices/{device_id}/control` with `{action: on|off|brightness, brightness?: 0-100}`
- List zones: `GET /zones?venue_id=`
- Today's schedules: `GET /schedules?venue_id=&date=`
- WebSocket live updates: `wss://.../api/iot/ws?ticket=...` (ticket via `GET /api/auth/ws-ticket`)

UI tabs:
1. **Devices** — list with status pill (on/off), brightness slider, online/offline
2. **Zones** — group devices by turf
3. **Schedule** — today's auto-lit slots from confirmed bookings (lights_on 5min before, lights_off 5min after)
4. **Energy** — kWh + cost estimate

### Tasks

- [ ] **6.1** Create `src/app/(stack)/checkin.js` with tab switcher
- [ ] **6.2** Create `src/components/checkin/QRScanner.js` (expo-camera permission flow)
- [ ] **6.3** Create `src/components/checkin/TokenInput.js`
- [ ] **6.4** Create `src/components/checkin/CheckinConfirmCard.js`
- [ ] **6.5** Create `src/services/iotService.js` wrapper
- [ ] **6.6** Create `src/app/(stack)/iot/index.js`, `devices.js`, `zones.js`, `schedule.js`, `energy.js`
- [ ] **6.7** Create `src/components/iot/DeviceCard.js` (with on/off + brightness slider)
- [ ] **6.8** WebSocket connection: `socket.io-client` — listen for `device_status`, `device_control`, `telemetry` messages

---

## Phase 7 — Finance Overview

**Source:** `frontend/src/pages/VenueFinancePage.js`

**Goal:** P&L summary + revenue by sport + monthly trend + commission breakdown.

### 7.A Finance Tab

Screen: `src/app/(tabs)/finance.js`

API: `GET /api/venue-finance/analytics/finance-summary?venue_id=&start_date=&end_date=`

Response shape: see Phase 9 reference.

### UI sections

**Top 4 stat cards:**
- Total Bookings (count)
- Net Profit (₹) = `total_income - commission_total - gst_on_commission - total_expenses`
- Expenses (₹)
- This Month (₹) — net profit current month

**Filters bar:**
- Date range chips: All-time / Last 30d / Last 90d / Custom (calendar picker)
- Venue selector dropdown (or "All Venues")

**Commission disclosure banner** (static):
> Platform commission: 10% + 18% GST on commission

**Commission breakdown card:**
- Total Revenue: ₹X
- Commission (10%): -₹Y
- GST on Commission (18%): -₹Z
- Venue Net Share: ₹W
- LOBBI Platform Net: ₹V (= commission + GST - cf_total_fees)

**Income by Sport** — horizontal bar chart (`react-native-chart-kit` BarChart) + table:
- Sport | Amount (₹)
- Total row

**Income by Venue** — same pattern if multi-venue

**Monthly trend** — LineChart with 6-month rolling: income, expenses, net profit, booking count

### 7.B Sub-tabs

- **Overview** (default — above)
- **Ledger** → Phase 9 (transactions list)
- **Expenses** → CRUD form + list (categories: maintenance, staffing, electricity, water, rent, equipment, marketing, insurance, cleaning, other)
- **Invoices** → `/venue-invoices` endpoints — list by month + create/view PDF
- **Payouts** → Phase 8

### Tasks

- [ ] **7.1** Create `src/app/(tabs)/finance.js` shell with sub-tabs
- [ ] **7.2** Create `src/components/finance/StatsCards.js`
- [ ] **7.3** Create `src/components/finance/CommissionBreakdown.js`
- [ ] **7.4** Create `src/components/finance/IncomeBySport.js` + `MonthlyTrendChart.js`
- [ ] **7.5** Create `src/components/finance/DateRangeFilter.js`
- [ ] **7.6** Wire `analyticsService.financeSummary(params)`
- [ ] **7.7** Cache summary in AsyncStorage (5min TTL) via `useCachedResource` hook

### Expenses sub-screen

- [ ] **7.8** Create `src/app/(stack)/finance/expenses.js` — add/edit/delete expense
- [ ] **7.9** Form: amount (₹), category dropdown, date, description (optional), venue (if multi)
- [ ] **7.10** API: `POST /api/venue-finance/expenses`, `GET /api/venue-finance/expenses?venue_id=&from=&to=`, `DELETE /api/venue-finance/expenses/{id}`

### Invoices sub-screen

- [ ] **7.11** Create `src/app/(stack)/finance/invoices.js`
- [ ] **7.12** List by month + filter + create invoice modal
- [ ] **7.13** View PDF via `expo-file-system` + `expo-sharing` (download invoice PDF from `GET /api/venue-invoices/{id}/pdf`)

---

## Phase 8 — Payouts (Settlement & Bank Linking)

**Source:** `frontend/src/pages/VenueFinancePage.js` (Payouts section) + `OwnerTransactionsPage.js`

**Goal:** Show settlement status + link bank + sync vendor + view UTRs.

### 8.A Payouts Cards (4-card dashboard)

API: `GET /api/payouts/my-summary`

Response includes: `linked_account_status, bank_account, cashfree_vendor_status, total_earned, total_commission, total_settled, pending_settlement, pending_items_count, last_payout_date, last_payout_amount, recent_settlements[]`

Cards:
1. **On Hold** (`floating_balance`) — money captured, eligibility date pending
2. **Released** (`released_pending`) — approved, awaiting bank transfer (T+2)
3. **Settled to Bank** (`settled_total`) — completed transfers (with UTR)
4. **Linked Account** card — shows bank name + last 4 + status badge

### 8.B Link Bank Account

Screen: `src/app/(stack)/finance/link-bank.js`

API: `POST /api/payouts/linked-account`

Form fields:
- `account_number` (required, numeric, hidden chars after creation)
- `ifsc_code` (required, regex `^[A-Z]{4}0[A-Z0-9]{6}$`)
- `beneficiary_name` (required, max 100)
- `pan_number` (required, regex `^[A-Z]{5}[0-9]{4}[A-Z]$`)
- `business_type` (dropdown: Gaming, Retail, Professional Services, SaaS, etc.)
- `bank_name` (optional, auto-derived from IFSC)

Validation:
- IFSC regex, PAN regex enforced before submit
- Rate limit: max 3 attempts per 5 min (server-side)

Response: `cashfree_vendor_id`, `cashfree_vendor_status: "IN_BENE_CREATION"` initially → updates to ACTIVE via webhook.

### 8.C Update Bank / Sync Vendor

- **Update**: `PUT /api/payouts/linked-account` (only if new account_number provided)
- **Sync vendor status**: `POST /api/payouts/linked-account/sync-vendor` (manual fallback if webhook missed)
- **Delete linked account**: requires `PasswordConfirmModal` — pass admin password → `DELETE /api/payouts/linked-account` with `{password}`

### Tasks

- [ ] **8.1** Create `src/app/(stack)/finance/payouts.js` — 4-card dashboard
- [ ] **8.2** Create `src/components/payout/PayoutCard.js`
- [ ] **8.3** Create `src/components/payout/LinkedAccountCard.js`
- [ ] **8.4** Create `src/app/(stack)/finance/link-bank.js` — form
- [ ] **8.5** Create `src/components/payout/BankAccountForm.js` (IFSC + PAN validators)
- [ ] **8.6** Create `src/components/ui/PasswordConfirmModal.js` (mirror frontend version)
- [ ] **8.7** Wire `payoutService.summary()`, `linkAccount()`, `updateAccount()`, `syncVendor()`, `deleteAccount(password)`
- [ ] **8.8** Settlement history list — `recent_settlements[]` cards (date, amount, UTR)

---

## Phase 9 — Owner Transactions (Detailed Ledger)

**Source:** `frontend/src/pages/OwnerTransactionsPage.js`

**Goal:** Full transaction ledger with settlement status, CF fees, UTR tracking, refund visibility.

### 9.A Transactions List

Screen: `src/app/(stack)/finance/transactions.js`

API: `GET /api/venue-finance/transactions?page=&limit=&date_from=&date_to=&type=&venue_id=&q=`

Columns per row:
- **Date**
- **Description** — "Venue ABC — Badminton (2025-01-15)"
- **Gross** — ₹X
- **Commission** — -₹Y (10%)
- **GST on Commission** — -₹Z (18% of commission)
- **Venue Net Share** — ₹W
- **CF Fees** — -₹V (`cf_total_fees`)
- **LOBBI Net** — Commission + GST - CF fees
- **Settlement Status** — pending / on_hold / released / settled / failed (color badge)
- **UTR** — shown only if settled

### 9.B Filters

- Date range (From / To)
- Status (all/pending_settlement/settled/failed)
- Transaction type (income/expense/all)
- Search by client name, booking ID, sport

### 9.C Refund visibility

When booking cancelled and refund issued, show entry with:
- Refund % (e.g., 80%)
- Refund amount
- Commission lost (LOBBI loses commission)
- **CF fee loss** (per recent commit `4041bfd` — track and display CF fee losses on refunds)
- Total LOBBI loss

### 9.D Cashfree fee calculation (display)

Stored in booking doc: `cf_fees: {cf_pg_fee, cf_split_fee, cf_subtotal, cf_gst, cf_total_fees}`

Formula:
- `pg_fee = amount × 1.95%`
- `split_fee = amount × 0.20%`
- `subtotal = pg_fee + split_fee`
- `gst = subtotal × 18%`
- `cf_total_fees = subtotal + gst`

Example ₹1000 booking → CF fees ₹25.37.

Rates configurable via admin Settings page (`cf_pg_rate`, `cf_split_rate`, `cf_fee_gst`) — gated by `PasswordConfirmModal`.

### Tasks

- [ ] **9.1** Create `src/app/(stack)/finance/transactions.js`
- [ ] **9.2** Create `src/components/finance/TransactionRow.js`
- [ ] **9.3** Create `src/components/finance/TransactionFilters.js`
- [ ] **9.4** Create `src/components/finance/SettlementStatusBadge.js` (with color mapping)
- [ ] **9.5** Create `src/components/finance/RefundLossCard.js` (for refund rows)
- [ ] **9.6** Wire `analyticsService.transactions(params)` with pagination
- [ ] **9.7** Tap row → detail bottom sheet showing full breakdown + UTR copy button

---

## Phase 10 — Polish & QA

- [ ] **10.1** Notification setup (`expo-notifications`) — register device token via `POST /api/notifications/register-token`; handle background notifications for new bookings
- [ ] **10.2** WebSocket reconnection logic (auto-reconnect on disconnect, exponential backoff)
- [ ] **10.3** Offline queue — walk-in booking creates queued in AsyncStorage when offline, retried on reconnect
- [ ] **10.4** Error boundary at root + per-tab (`ErrorBoundary.js` already copied)
- [ ] **10.5** Loading skeletons (already have `SkeletonLoader.js` equivalents in components/ui)
- [ ] **10.6** Pull-to-refresh on all list screens
- [ ] **10.7** Empty states everywhere (no bookings, no transactions, etc.) — use `EmptyState.js`
- [ ] **10.8** Toast feedback on all mutations
- [ ] **10.9** Logout flow tested end-to-end
- [ ] **10.10** Test on small phone (5") and large phone (6.7") + tablet
- [ ] **10.11** Cashfree SDK integration test (sandbox mode first)
- [ ] **10.12** Build dev-client (`eas build --profile development`) and test on physical device

---

## Reference: Key API endpoint summary

| Feature | Endpoint | Method |
|---|---|---|
| Login | `/api/auth/login` | POST |
| Refresh token | `/api/auth/refresh` | POST |
| My venues | `/api/venues/owner` | GET |
| Venue CRUD | `/api/venues`, `/api/venues/{id}` | POST/PUT/GET/DELETE |
| Slots | `/api/slots?venue_id=&date=&sport=` | GET |
| Hold rules | `/api/venues/{id}/hold-rules`, `/api/hold-rules/{id}` | POST/PUT/DELETE |
| Pricing rules | `/api/venues/{id}/pricing-rules`, `/api/pricing-rules/{id}` | POST/PUT/DELETE |
| Bookings list | `/api/player/bookings` | GET |
| Booking detail | `/api/player/bookings/{id}` | GET |
| Create walk-in | `/api/player/bookings` (booking_type=walk_in) | POST |
| Cancel booking | `/api/player/bookings/{id}/cancel` | POST |
| Collect remaining | `/api/player/bookings/{id}/collect-remaining` | POST |
| POS products | `/api/venue/pos/products` | GET/POST/PUT |
| POS sales | `/api/venue/pos/sales` | POST |
| POS summary | `/api/venue/pos/summary` | GET |
| IoT devices | `/api/iot/devices`, `/api/iot/devices/{id}/control` | GET/POST |
| IoT schedules | `/api/iot/schedules` | GET |
| IoT WebSocket | `/api/iot/ws?ticket=` | WS |
| Finance summary | `/api/venue-finance/analytics/finance-summary` | GET |
| Transactions | `/api/venue-finance/transactions` | GET |
| Expenses | `/api/venue-finance/expenses` | GET/POST/DELETE |
| Invoices | `/api/venue-invoices` | GET/POST |
| Payout summary | `/api/payouts/my-summary` | GET |
| Link bank | `/api/payouts/linked-account` | POST/PUT/DELETE |
| Sync vendor | `/api/payouts/linked-account/sync-vendor` | POST |
| Upload image | `/api/upload/image` | POST |
| Places autocomplete | `/api/venues/places/autocomplete` | GET |
| Place details | `/api/venues/places/details/{place_id}` | GET |
| Reverse geocode | `/api/venues/reverse-geocode` | GET |
| WS ticket | `/api/auth/ws-ticket` | GET |

---

## Reference: Status enums

**Booking status**: `pending` → `payment_pending` → `confirmed` → `completed` | `cancelled` | `no-show`

**Settlement status**: `pending_settlement` → `on_hold` → `released` → `settled` | `failed`

**Cashfree vendor status**: `IN_BENE_CREATION` → `ACTIVE` | `BLOCKED` | `REJECTED`

**Payment status (walk-in)**: `advance` (with `remaining_amount` > 0) → `full`

---

## Reference: Refund rule (must match backend exactly)

```javascript
function calculateRefund(slotStartIST, cancelTimeIST, totalAmount) {
  const hoursUntil = (slotStartIST - cancelTimeIST) / (1000 * 60 * 60);
  let pct = 0;
  if (hoursUntil >= 24) pct = 100;
  else if (hoursUntil >= 4) pct = 50;
  else pct = 0;
  return { refundAmount: Math.floor(totalAmount * pct / 100), refundPct: pct };
}
```

Backend enforces: max 3 full refunds per user per 7 days.

---

## How to work this plan

1. Pick the **next unchecked task** in current phase.
2. Open the source web file referenced for that task.
3. Read it in full — note every field, validation, API call, error message.
4. Build the RN equivalent matching 100% (no shortcuts).
5. Manually test the screen on a dev-client build.
6. Tick the box `[x]` and commit.
7. Move to next task.

Don't jump phases — auth must work before dashboard, dashboard before venue mgmt, etc.
