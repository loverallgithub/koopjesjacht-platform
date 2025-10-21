const axios = require('axios');

// Agent service URLs (use Docker network names in production)
const QR_MANAGER_URL = process.env.QR_MANAGER_URL || 'http://qr-manager:9001';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-aggregator:9002';
const PAYMENT_HANDLER_URL = process.env.PAYMENT_HANDLER_URL || 'http://payment-handler:9003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:9004';
const CLUE_GENERATOR_URL = process.env.CLUE_GENERATOR_URL || 'http://clue-generator:9005';
const MEDIA_MANAGEMENT_URL = process.env.MEDIA_MANAGEMENT_URL || 'http://media-management:9006';
const LEADERBOARD_URL = process.env.LEADERBOARD_URL || 'http://leaderboard:9007';
const GEOLOCATION_URL = process.env.GEOLOCATION_URL || 'http://geolocation:9009';

// Timeout configuration
const AGENT_TIMEOUT = 10000; // 10 seconds

// ===== QR Manager Agent =====

async function generateQR(venueData) {
  try {
    const response = await axios.post(`${QR_MANAGER_URL}/generate-qr`, venueData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] QR generation error:', error.message);
    throw new Error('QR generation failed');
  }
}

async function validateScan(scanData) {
  try {
    const response = await axios.post(`${QR_MANAGER_URL}/validate-scan`, scanData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Scan validation error:', error.message);
    throw new Error('Scan validation failed');
  }
}

async function getQRCode(qrId) {
  try {
    const response = await axios.get(`${QR_MANAGER_URL}/qr-code/${qrId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get QR code error:', error.message);
    throw new Error('Failed to retrieve QR code');
  }
}

async function getQRAnalytics(qrId) {
  try {
    const response = await axios.get(`${QR_MANAGER_URL}/analytics/${qrId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get QR analytics error:', error.message);
    throw new Error('Failed to retrieve QR analytics');
  }
}

async function regenerateQR(venueId) {
  try {
    const response = await axios.post(`${QR_MANAGER_URL}/regenerate/${venueId}`, {}, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] QR regeneration error:', error.message);
    throw new Error('QR regeneration failed');
  }
}

// ===== Stats Aggregator Agent =====

async function getVenueStats(venueId) {
  try {
    const response = await axios.get(`${STATS_AGGREGATOR_URL}/venue/${venueId}/stats`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get venue stats error:', error.message);
    throw new Error('Failed to retrieve venue statistics');
  }
}

async function getHuntStats(huntId) {
  try {
    const response = await axios.get(`${STATS_AGGREGATOR_URL}/hunt/${huntId}/stats`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get hunt stats error:', error.message);
    throw new Error('Failed to retrieve hunt statistics');
  }
}

async function getTeamProgress(teamId) {
  try {
    const response = await axios.get(`${STATS_AGGREGATOR_URL}/team/${teamId}/progress`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get team progress error:', error.message);
    throw new Error('Failed to retrieve team progress');
  }
}

async function calculateEngagement(metricsData) {
  try {
    const response = await axios.post(`${STATS_AGGREGATOR_URL}/calculate/engagement`, metricsData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Calculate engagement error:', error.message);
    throw new Error('Failed to calculate engagement score');
  }
}

async function getDashboardStats() {
  try {
    const response = await axios.get(`${STATS_AGGREGATOR_URL}/dashboard/stats`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get dashboard stats error:', error.message);
    throw new Error('Failed to retrieve dashboard statistics');
  }
}

// ===== Payment Handler Agent =====

async function processPayment(paymentData) {
  try {
    const response = await axios.post(`${PAYMENT_HANDLER_URL}/process-payment`, paymentData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Process payment error:', error.message);
    throw new Error('Payment processing failed');
  }
}

async function getPayment(paymentId) {
  try {
    const response = await axios.get(`${PAYMENT_HANDLER_URL}/payment/${paymentId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get payment error:', error.message);
    throw new Error('Failed to retrieve payment');
  }
}

async function processRefund(refundData) {
  try {
    const response = await axios.post(`${PAYMENT_HANDLER_URL}/refund`, refundData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Process refund error:', error.message);
    throw new Error('Refund processing failed');
  }
}

async function generateInvoice(paymentId) {
  try {
    const response = await axios.post(`${PAYMENT_HANDLER_URL}/generate-invoice`, {
      payment_id: paymentId
    }, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Generate invoice error:', error.message);
    throw new Error('Invoice generation failed');
  }
}

async function getInvoice(invoiceId) {
  try {
    const response = await axios.get(`${PAYMENT_HANDLER_URL}/invoice/${invoiceId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get invoice error:', error.message);
    throw new Error('Failed to retrieve invoice');
  }
}

async function getPaymentStats() {
  try {
    const response = await axios.get(`${PAYMENT_HANDLER_URL}/stats`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get payment stats error:', error.message);
    throw new Error('Failed to retrieve payment statistics');
  }
}

// ===== Notification Service Agent =====

async function sendEmail(emailData) {
  try {
    const response = await axios.post(`${NOTIFICATION_SERVICE_URL}/send-email`, emailData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Send email error:', error.message);
    throw new Error('Email sending failed');
  }
}

async function sendSMS(smsData) {
  try {
    const response = await axios.post(`${NOTIFICATION_SERVICE_URL}/send-sms`, smsData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Send SMS error:', error.message);
    throw new Error('SMS sending failed');
  }
}

async function sendPushNotification(pushData) {
  try {
    const response = await axios.post(`${NOTIFICATION_SERVICE_URL}/send-push`, pushData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Send push notification error:', error.message);
    throw new Error('Push notification failed');
  }
}

async function sendBulkNotifications(bulkData) {
  try {
    const response = await axios.post(`${NOTIFICATION_SERVICE_URL}/send-bulk`, bulkData, {
      timeout: AGENT_TIMEOUT * 3 // Longer timeout for bulk operations
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Send bulk notifications error:', error.message);
    throw new Error('Bulk notification sending failed');
  }
}

async function getNotificationTemplates() {
  try {
    const response = await axios.get(`${NOTIFICATION_SERVICE_URL}/templates`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get templates error:', error.message);
    throw new Error('Failed to retrieve notification templates');
  }
}

// ===== Clue Generator Agent =====

async function generateClue(clueData) {
  try {
    const response = await axios.post(`${CLUE_GENERATOR_URL}/generate-clue`, clueData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Generate clue error:', error.message);
    throw new Error('Clue generation failed');
  }
}

async function generateBatchClues(batchData) {
  try {
    const response = await axios.post(`${CLUE_GENERATOR_URL}/generate-batch`, batchData, {
      timeout: AGENT_TIMEOUT * 2 // Longer timeout for batch operations
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Generate batch clues error:', error.message);
    throw new Error('Batch clue generation failed');
  }
}

async function getClue(clueId) {
  try {
    const response = await axios.get(`${CLUE_GENERATOR_URL}/clue/${clueId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get clue error:', error.message);
    throw new Error('Failed to retrieve clue');
  }
}

async function getHuntClues(huntId) {
  try {
    const response = await axios.get(`${CLUE_GENERATOR_URL}/clues/${huntId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get hunt clues error:', error.message);
    throw new Error('Failed to retrieve hunt clues');
  }
}

async function updateClue(clueId, updates) {
  try {
    const response = await axios.put(`${CLUE_GENERATOR_URL}/clue/${clueId}`, updates, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Update clue error:', error.message);
    throw new Error('Clue update failed');
  }
}

// ===== Media Management Agent =====

async function uploadMedia(formData) {
  try {
    const response = await axios.post(`${MEDIA_MANAGEMENT_URL}/upload`, formData, {
      timeout: AGENT_TIMEOUT * 3, // Longer timeout for file uploads
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Upload media error:', error.message);
    throw new Error('Media upload failed');
  }
}

async function getMedia(mediaId) {
  try {
    const response = await axios.get(`${MEDIA_MANAGEMENT_URL}/media/${mediaId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get media error:', error.message);
    throw new Error('Failed to retrieve media');
  }
}

async function deleteMedia(mediaId) {
  try {
    const response = await axios.delete(`${MEDIA_MANAGEMENT_URL}/media/${mediaId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Delete media error:', error.message);
    throw new Error('Media deletion failed');
  }
}

async function optimizeImage(optimizeData) {
  try {
    const response = await axios.post(`${MEDIA_MANAGEMENT_URL}/optimize`, optimizeData, {
      timeout: AGENT_TIMEOUT * 2
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Optimize image error:', error.message);
    throw new Error('Image optimization failed');
  }
}

async function getGallery(entityType, entityId) {
  try {
    const response = await axios.get(`${MEDIA_MANAGEMENT_URL}/gallery/${entityType}/${entityId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get gallery error:', error.message);
    throw new Error('Failed to retrieve gallery');
  }
}

// ===== Leaderboard Agent =====

async function getHuntLeaderboard(huntId) {
  try {
    const response = await axios.get(`${LEADERBOARD_URL}/leaderboard/${huntId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get hunt leaderboard error:', error.message);
    throw new Error('Failed to retrieve hunt leaderboard');
  }
}

async function getGlobalLeaderboard() {
  try {
    const response = await axios.get(`${LEADERBOARD_URL}/leaderboard/global`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get global leaderboard error:', error.message);
    throw new Error('Failed to retrieve global leaderboard');
  }
}

async function updateTeamScore(scoreData) {
  try {
    const response = await axios.post(`${LEADERBOARD_URL}/update-score`, scoreData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Update team score error:', error.message);
    throw new Error('Team score update failed');
  }
}

async function getTeamRank(teamId, huntId) {
  try {
    const response = await axios.get(`${LEADERBOARD_URL}/team/${teamId}/rank`, {
      params: { hunt_id: huntId },
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get team rank error:', error.message);
    throw new Error('Failed to retrieve team rank');
  }
}

async function getTeamAchievements(teamId) {
  try {
    const response = await axios.get(`${LEADERBOARD_URL}/achievements/${teamId}`, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Get team achievements error:', error.message);
    throw new Error('Failed to retrieve team achievements');
  }
}

// ===== Geolocation Agent =====

async function geocodeAddress(address) {
  try {
    const response = await axios.post(`${GEOLOCATION_URL}/geocode`, { address }, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Geocode address error:', error.message);
    throw new Error('Geocoding failed');
  }
}

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await axios.post(`${GEOLOCATION_URL}/reverse-geocode`, {
      latitude,
      longitude
    }, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Reverse geocode error:', error.message);
    throw new Error('Reverse geocoding failed');
  }
}

async function calculateDistance(origin, destination) {
  try {
    const response = await axios.post(`${GEOLOCATION_URL}/distance`, {
      origin,
      destination
    }, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Calculate distance error:', error.message);
    throw new Error('Distance calculation failed');
  }
}

async function verifyProximity(proximityData) {
  try {
    const response = await axios.post(`${GEOLOCATION_URL}/verify-proximity`, proximityData, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Verify proximity error:', error.message);
    throw new Error('Proximity verification failed');
  }
}

async function optimizeRoute(routeData) {
  try {
    const response = await axios.post(`${GEOLOCATION_URL}/optimize-route`, routeData, {
      timeout: AGENT_TIMEOUT * 2 // Longer timeout for route optimization
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Optimize route error:', error.message);
    throw new Error('Route optimization failed');
  }
}

async function findNearby(location, radiusKm, type) {
  try {
    const response = await axios.get(`${GEOLOCATION_URL}/nearby/${location}`, {
      params: { radius_km: radiusKm, type },
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Find nearby error:', error.message);
    throw new Error('Nearby location search failed');
  }
}

// ===== Health Checks =====

async function checkAgentHealth(agentUrl, agentName) {
  try {
    const response = await axios.get(`${agentUrl}/health`, {
      timeout: 5000
    });
    return {
      agent: agentName,
      healthy: response.data.status === 'healthy',
      ...response.data
    };
  } catch (error) {
    return {
      agent: agentName,
      healthy: false,
      error: error.message
    };
  }
}

async function checkAllAgentsHealth() {
  const agents = [
    { url: QR_MANAGER_URL, name: 'qr-manager' },
    { url: STATS_AGGREGATOR_URL, name: 'stats-aggregator' },
    { url: PAYMENT_HANDLER_URL, name: 'payment-handler' },
    { url: NOTIFICATION_SERVICE_URL, name: 'notification-service' },
    { url: CLUE_GENERATOR_URL, name: 'clue-generator' },
    { url: MEDIA_MANAGEMENT_URL, name: 'media-management' },
    { url: LEADERBOARD_URL, name: 'leaderboard' },
    { url: GEOLOCATION_URL, name: 'geolocation' }
  ];

  const healthChecks = await Promise.all(
    agents.map(agent => checkAgentHealth(agent.url, agent.name))
  );

  return {
    allHealthy: healthChecks.every(check => check.healthy),
    agents: healthChecks
  };
}

module.exports = {
  // QR Manager
  generateQR,
  validateScan,
  getQRCode,
  getQRAnalytics,
  regenerateQR,

  // Stats Aggregator
  getVenueStats,
  getHuntStats,
  getTeamProgress,
  calculateEngagement,
  getDashboardStats,

  // Payment Handler
  processPayment,
  getPayment,
  processRefund,
  generateInvoice,
  getInvoice,
  getPaymentStats,

  // Notification Service
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendBulkNotifications,
  getNotificationTemplates,

  // Clue Generator
  generateClue,
  generateBatchClues,
  getClue,
  getHuntClues,
  updateClue,

  // Media Management
  uploadMedia,
  getMedia,
  deleteMedia,
  optimizeImage,
  getGallery,

  // Leaderboard
  getHuntLeaderboard,
  getGlobalLeaderboard,
  updateTeamScore,
  getTeamRank,
  getTeamAchievements,

  // Geolocation
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  verifyProximity,
  optimizeRoute,
  findNearby,

  // Health
  checkAllAgentsHealth
};
