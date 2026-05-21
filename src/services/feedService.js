// Stub — venue app has no feed; methods return empty results so the
// profile UI that references posts/comments simply renders nothing.
const noop = async () => ({});
const feedService = {
  getComments: async () => ({ comments: [], next_cursor: null, has_more: false }),
  toggleLike: noop,
  toggleBookmark: noop,
  addComment: async () => ({ comment: null }),
  getPost: async () => null,
};
export default feedService;
