import api from './api';

const qrService = {
  // Generate QR code
  generateQR: async (huntId, shopId, teamId, userId) => {
    const response = await api.post('/api/qr/generate-qr', {
      hunt_id: huntId,
      shop_id: shopId,
      team_id: teamId,
      user_id: userId,
    });
    return response.data;
  },

  // Verify QR code scan
  verifyQR: async (qrCode, teamId, location) => {
    const response = await api.post('/api/qr/verify-qr', {
      qr_code: qrCode,
      team_id: teamId,
      scan_location: location,
    });
    return response.data;
  },

  // Get QR code details
  getQRCode: async (code) => {
    const response = await api.get(`/api/qr/qr/${code}`);
    return response.data;
  },

  // Get team scans
  getTeamScans: async (teamId) => {
    const response = await api.get(`/api/qr/scans/team/${teamId}`);
    return response.data;
  },
};

export default qrService;
