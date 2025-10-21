const express = require('express');
const router = express.Router();
const agentClient = require('../services/agentClient');

// ===== QR Manager Routes =====

router.post('/qr/generate', async (req, res) => {
  try {
    const result = await agentClient.generateQR(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/qr/validate', async (req, res) => {
  try {
    const result = await agentClient.validateScan(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/qr/:qr_id', async (req, res) => {
  try {
    const result = await agentClient.getQRCode(req.params.qr_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/qr/:qr_id/analytics', async (req, res) => {
  try {
    const result = await agentClient.getQRAnalytics(req.params.qr_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/qr/regenerate/:venue_id', async (req, res) => {
  try {
    const result = await agentClient.regenerateQR(req.params.venue_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Stats Aggregator Routes =====

router.get('/stats/venue/:venue_id', async (req, res) => {
  try {
    const result = await agentClient.getVenueStats(req.params.venue_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/hunt/:hunt_id', async (req, res) => {
  try {
    const result = await agentClient.getHuntStats(req.params.hunt_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/team/:team_id', async (req, res) => {
  try {
    const result = await agentClient.getTeamProgress(req.params.team_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stats/engagement', async (req, res) => {
  try {
    const result = await agentClient.calculateEngagement(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/dashboard', async (req, res) => {
  try {
    const result = await agentClient.getDashboardStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Payment Handler Routes =====

router.post('/payment/process', async (req, res) => {
  try {
    const result = await agentClient.processPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/:payment_id', async (req, res) => {
  try {
    const result = await agentClient.getPayment(req.params.payment_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment/refund', async (req, res) => {
  try {
    const result = await agentClient.processRefund(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payment/invoice/:payment_id', async (req, res) => {
  try {
    const result = await agentClient.generateInvoice(req.params.payment_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/invoice/:invoice_id', async (req, res) => {
  try {
    const result = await agentClient.getInvoice(req.params.invoice_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payment/stats', async (req, res) => {
  try {
    const result = await agentClient.getPaymentStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Notification Service Routes =====

router.post('/notification/email', async (req, res) => {
  try {
    const result = await agentClient.sendEmail(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notification/sms', async (req, res) => {
  try {
    const result = await agentClient.sendSMS(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notification/push', async (req, res) => {
  try {
    const result = await agentClient.sendPushNotification(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notification/bulk', async (req, res) => {
  try {
    const result = await agentClient.sendBulkNotifications(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notification/templates', async (req, res) => {
  try {
    const result = await agentClient.getNotificationTemplates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Clue Generator Routes =====

router.post('/clue/generate', async (req, res) => {
  try {
    const result = await agentClient.generateClue(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clue/generate-batch', async (req, res) => {
  try {
    const result = await agentClient.generateBatchClues(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/clue/:clue_id', async (req, res) => {
  try {
    const result = await agentClient.getClue(req.params.clue_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/clue/hunt/:hunt_id', async (req, res) => {
  try {
    const result = await agentClient.getHuntClues(req.params.hunt_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/clue/:clue_id', async (req, res) => {
  try {
    const result = await agentClient.updateClue(req.params.clue_id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Media Management Routes =====

router.post('/media/upload', async (req, res) => {
  try {
    const result = await agentClient.uploadMedia(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/media/:media_id', async (req, res) => {
  try {
    const result = await agentClient.getMedia(req.params.media_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/media/:media_id', async (req, res) => {
  try {
    const result = await agentClient.deleteMedia(req.params.media_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/media/optimize', async (req, res) => {
  try {
    const result = await agentClient.optimizeImage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/media/gallery/:entity_type/:entity_id', async (req, res) => {
  try {
    const result = await agentClient.getGallery(req.params.entity_type, req.params.entity_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Leaderboard Routes =====

router.get('/leaderboard/hunt/:hunt_id', async (req, res) => {
  try {
    const result = await agentClient.getHuntLeaderboard(req.params.hunt_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard/global', async (req, res) => {
  try {
    const result = await agentClient.getGlobalLeaderboard();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leaderboard/update-score', async (req, res) => {
  try {
    const result = await agentClient.updateTeamScore(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard/team/:team_id/rank', async (req, res) => {
  try {
    const result = await agentClient.getTeamRank(req.params.team_id, req.query.hunt_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard/achievements/:team_id', async (req, res) => {
  try {
    const result = await agentClient.getTeamAchievements(req.params.team_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Geolocation Routes =====

router.post('/geolocation/geocode', async (req, res) => {
  try {
    const result = await agentClient.geocodeAddress(req.body.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/geolocation/reverse-geocode', async (req, res) => {
  try {
    const result = await agentClient.reverseGeocode(req.body.latitude, req.body.longitude);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/geolocation/distance', async (req, res) => {
  try {
    const result = await agentClient.calculateDistance(req.body.origin, req.body.destination);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/geolocation/verify-proximity', async (req, res) => {
  try {
    const result = await agentClient.verifyProximity(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/geolocation/optimize-route', async (req, res) => {
  try {
    const result = await agentClient.optimizeRoute(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/geolocation/nearby/:location', async (req, res) => {
  try {
    const result = await agentClient.findNearby(req.params.location, req.query.radius_km, req.query.type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Health Check Route =====

router.get('/health', async (req, res) => {
  try {
    const result = await agentClient.checkAllAgentsHealth();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
