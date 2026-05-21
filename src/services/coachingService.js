// Stub — venue mobile is not a coach app. Methods used by profile screens
// return null/empty so Promise.all in loadData doesn't throw on undefined.
const coachingService = {
  updateProfile: async () => ({}),
  getCoach: async () => null,
};
export default coachingService;
