import api from "../lib/axios";

const tournamentService = {
  // ── Tournament Discovery ────────────────────────────────
  getTournaments: async (params = {}) => {
    const res = await api.get("/tournaments", { params });
    return res.data || [];
  },
  getTournamentById: async (id) => {
    const res = await api.get(`/tournaments/${id}`);
    return res.data || null;
  },

  // ── Tournament Management ───────────────────────────────
  create: async (data) => {
    const res = await api.post("/tournaments", data);
    return res.data || {};
  },
  update: async (id, data) => {
    const res = await api.put(`/tournaments/${id}`, data);
    return res.data || {};
  },
  cancel: async (id) => {
    const res = await api.delete(`/tournaments/${id}`);
    return res.data || {};
  },
  start: async (id) => {
    const res = await api.post(`/tournaments/${id}/start`);
    return res.data || {};
  },

  // ── Registration ────────────────────────────────────────
  register: async (id, data = {}) => {
    const res = await api.post(`/tournaments/${id}/register`, data);
    return res.data || {};
  },
  registerTeam: async (id, teamId) => {
    const res = await api.post(`/tournaments/${id}/register-team`, { teamId });
    return res.data || {};
  },
  withdraw: async (id) => {
    const res = await api.post(`/tournaments/${id}/withdraw`);
    return res.data || {};
  },
  verifyEntryPayment: async (data) => {
    const res = await api.post("/tournaments/verify-entry-payment", data);
    return res.data || {};
  },
  testConfirmEntry: async (id) => {
    const res = await api.post(`/tournaments/${id}/test-confirm-entry`);
    return res.data || {};
  },

  // ── Match Results & Standings ───────────────────────────
  submitMatchResult: async (tournamentId, matchId, data) => {
    const res = await api.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, data);
    return res.data || {};
  },
  getStandings: async (id) => {
    const res = await api.get(`/tournaments/${id}/standings`);
    return res.data || [];
  },
  standings: async (id) => {
    const res = await api.get(`/tournaments/${id}/standings`);
    return res.data || {};
  },
  getMatches: async (id) => {
    const res = await api.get(`/tournaments/${id}/matches`);
    return res.data || [];
  },
};

export default tournamentService;
