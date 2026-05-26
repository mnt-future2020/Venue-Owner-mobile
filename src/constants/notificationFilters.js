// Frontend (web) NotificationsPage shows EVERY notification type — no role-based
// filtering. Venue mobile now matches that behaviour: with Feed + Chat ported,
// every notification the backend returns is relevant to the owner.
//
// Set kept empty (and exports preserved) so the call-sites in
// (stack)/notifications.js and the bell badge don't need to change. Add types
// here ONLY if a specific category turns out to be noise; otherwise leave it
// empty for frontend parity.
export const VENUE_OWNER_HIDDEN_TYPES = new Set();

// Helper — true if the venue app should display this notification.
// Currently always true (matches frontend NotificationsPage exactly).
export function isVisibleForVenueOwner(_notif) {
  return true;
}
