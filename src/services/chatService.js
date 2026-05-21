import api from "../lib/axios";

// Minimal chatService for venue mobile. `startConversation` is the only
// method PlayerCardScreenContent calls (when tapping the "Message" button
// on a profile). The backend route is shared with the player app.
const chatService = {
  startConversation: async (userId) => {
    const res = await api.post(`/chat/start/${userId}`);
    return res.data || {};
  },
};

export default chatService;
