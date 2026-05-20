// Notification types that are PLAYER-side concerns (social feed, chat,
// groups, mercenary, rating, etc.). The backend `/notifications` endpoint
// stores all notifications keyed by `user_id` regardless of role — a venue
// owner whose user_id has also ever played sessions will accumulate these
// player-only types. We hide them in the venue app so the notification
// list (and the Bell badge count) reflect ONLY venue-owner-relevant
// events: bookings, game completions, payouts, refunds, bank/account
// verification, venue admin, enquiries, etc.
//
// Frontend (web) shows everything via the shared NotificationsPage; this
// filter is a mobile-only enhancement to make the venue owner experience
// less noisy. If a venue-owner type accidentally lands here, remove it.
export const VENUE_OWNER_HIDDEN_TYPES = new Set([
  // Social feed
  "new_follower",
  "new_like",
  "new_comment",
  "mention",
  // Rating / matchmaking
  "rating_update",
  "match_result",
  // Chat / messaging
  "new_message",
  "group_message",
  "group_message_deleted",
  "message_deleted",
  "message_reaction",
  "messages_read",
  // Group features
  "group_deleted",
  "group_member_removed",
  "group_reaction",
  "group_poll_update",
  "group_typing",
  "join_request",
  "join_request_approved",
  "join_request_rejected",
  "join_accepted",
  "join_rejected",
  "request_accepted",
  "request_declined",
  "poll_update",
  // Mercenary (player feature)
  "mercenary_application",
  "mercenary_accepted",
  "mercenary_paid",
  // Real-time WebSocket transients (shouldn't be persisted but defensive)
  "online_status",
  "typing",
  "pong",
]);

// Helper — true if the venue app should display this notification
export function isVisibleForVenueOwner(notif) {
  if (!notif?.type) return true;
  return !VENUE_OWNER_HIDDEN_TYPES.has(notif.type);
}
