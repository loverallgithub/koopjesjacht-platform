import api from './api';

const photoService = {
  // Upload photo
  uploadPhoto: async (formData) => {
    const response = await api.post('/api/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get photo gallery for hunt
  getHuntGallery: async (huntId) => {
    const response = await api.get(`/api/media/gallery/hunt/${huntId}`);
    return response.data;
  },

  // Get team photos
  getTeamPhotos: async (huntId, teamId) => {
    const response = await api.get(
      `/api/media/gallery/team/${huntId}/${teamId}`
    );
    return response.data;
  },

  // Share photo on social media
  sharePhoto: async (photoId, platform, url, hashtags) => {
    const response = await api.post(`/api/media/photo/${photoId}/share`, {
      platform,
      url,
      hashtags,
    });
    return response.data;
  },

  // Verify photo
  verifyPhoto: async (photoId, location) => {
    const response = await api.post(`/api/media/photo/${photoId}/verify`, {
      location,
    });
    return response.data;
  },

  // Feature photo
  featurePhoto: async (photoId) => {
    const response = await api.post(`/api/media/photo/${photoId}/feature`);
    return response.data;
  },
};

export default photoService;
