// Stub — venue owners don't have an engagement score (player-only feature).
// PlayerCardScreenContent calls these when viewing any user profile; all
// return null so the parallel Promise.all in loadData doesn't throw.
const engagementService = {
  getEngagementScore: async () => null,
  getCompatibility: async () => null,
  getMyEngagement: async () => null,
};
export default engagementService;
