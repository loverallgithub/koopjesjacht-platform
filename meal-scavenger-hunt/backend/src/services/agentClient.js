const axios = require('axios');

// Agent service URLs (use Docker network names in production)
const QR_MANAGER_URL = process.env.QR_MANAGER_URL || 'http://qr-manager:9001';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-aggregator:9002';
const PAYMENT_HANDLER_URL = process.env.PAYMENT_HANDLER_URL || 'http://payment-handler:9003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:9004';
const CLUE_GENERATOR_URL = process.env.CLUE_GENERATOR_URL || 'http://clue-generator:9005';

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
    { url: CLUE_GENERATOR_URL, name: 'clue-generator' }
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

  // Health
  checkAllAgentsHealth
};
