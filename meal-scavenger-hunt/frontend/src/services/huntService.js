import api from './api';

const huntService = {
  // Get all hunts
  getAllHunts: async (filters = {}) => {
    const response = await api.get('/api/hunts', { params: filters });
    return response.data;
  },

  // Get hunt by ID
  getHuntById: async (huntId) => {
    const response = await api.get(`/api/hunts/${huntId}`);
    return response.data;
  },

  // Create new hunt (organizer)
  createHunt: async (huntData) => {
    const response = await api.post('/api/hunts/create', huntData);
    return response.data;
  },

  // Join hunt
  joinHunt: async (huntId, teamData) => {
    const response = await api.post(`/api/hunts/${huntId}/join`, teamData);
    return response.data;
  },

  // Get hunt progress
  getHuntProgress: async (huntId, teamId) => {
    const response = await api.get(
      `/api/hunts/${huntId}/teams/${teamId}/progress`
    );
    return response.data;
  },

  // Get leaderboard
  getLeaderboard: async (huntId) => {
    const response = await api.get(`/api/stats/hunt/${huntId}/leaderboard`);
    return response.data;
  },

  // Generate clue for venue
  generateClue: async (shopInfo, difficultyLevel) => {
    const response = await api.post('/api/clue/generate-clue', {
      shop_info: shopInfo,
      difficulty_level: difficultyLevel,
    });
    return response.data;
  },
};

export default huntService;
