import api from './api';

// Base path for all agent endpoints
const AGENT_BASE = '/agents';

// ===== QR Manager Agent =====

export const qrManagerService = {
  async generateQR(venueData) {
    const response = await api.post(`${AGENT_BASE}/qr/generate`, venueData);
    return response.data;
  },

  async validateScan(scanData) {
    const response = await api.post(`${AGENT_BASE}/qr/validate`, scanData);
    return response.data;
  },

  async getQRCode(qrId) {
    const response = await api.get(`${AGENT_BASE}/qr/${qrId}`);
    return response.data;
  },

  async getQRAnalytics(qrId) {
    const response = await api.get(`${AGENT_BASE}/qr/${qrId}/analytics`);
    return response.data;
  },

  async regenerateQR(venueId) {
    const response = await api.post(`${AGENT_BASE}/qr/regenerate/${venueId}`);
    return response.data;
  }
};

// ===== Stats Aggregator Agent =====

export const statsService = {
  async getVenueStats(venueId) {
    const response = await api.get(`${AGENT_BASE}/stats/venue/${venueId}`);
    return response.data;
  },

  async getHuntStats(huntId) {
    const response = await api.get(`${AGENT_BASE}/stats/hunt/${huntId}`);
    return response.data;
  },

  async getTeamProgress(teamId) {
    const response = await api.get(`${AGENT_BASE}/stats/team/${teamId}`);
    return response.data;
  },

  async calculateEngagement(metricsData) {
    const response = await api.post(`${AGENT_BASE}/stats/engagement`, metricsData);
    return response.data;
  },

  async getDashboardStats() {
    const response = await api.get(`${AGENT_BASE}/stats/dashboard`);
    return response.data;
  }
};

// ===== Payment Handler Agent =====

export const paymentService = {
  async processPayment(paymentData) {
    const response = await api.post(`${AGENT_BASE}/payment/process`, paymentData);
    return response.data;
  },

  async getPayment(paymentId) {
    const response = await api.get(`${AGENT_BASE}/payment/${paymentId}`);
    return response.data;
  },

  async processRefund(refundData) {
    const response = await api.post(`${AGENT_BASE}/payment/refund`, refundData);
    return response.data;
  },

  async generateInvoice(paymentId) {
    const response = await api.post(`${AGENT_BASE}/payment/invoice/${paymentId}`);
    return response.data;
  },

  async getInvoice(invoiceId) {
    const response = await api.get(`${AGENT_BASE}/payment/invoice/${invoiceId}`);
    return response.data;
  },

  async getPaymentStats() {
    const response = await api.get(`${AGENT_BASE}/payment/stats`);
    return response.data;
  }
};

// ===== Notification Service Agent =====

export const notificationService = {
  async sendEmail(emailData) {
    const response = await api.post(`${AGENT_BASE}/notification/email`, emailData);
    return response.data;
  },

  async sendSMS(smsData) {
    const response = await api.post(`${AGENT_BASE}/notification/sms`, smsData);
    return response.data;
  },

  async sendPushNotification(pushData) {
    const response = await api.post(`${AGENT_BASE}/notification/push`, pushData);
    return response.data;
  },

  async sendBulkNotifications(bulkData) {
    const response = await api.post(`${AGENT_BASE}/notification/bulk`, bulkData);
    return response.data;
  },

  async getTemplates() {
    const response = await api.get(`${AGENT_BASE}/notification/templates`);
    return response.data;
  }
};

// ===== Clue Generator Agent =====

export const clueService = {
  async generateClue(clueData) {
    const response = await api.post(`${AGENT_BASE}/clue/generate`, clueData);
    return response.data;
  },

  async generateBatchClues(batchData) {
    const response = await api.post(`${AGENT_BASE}/clue/generate-batch`, batchData);
    return response.data;
  },

  async getClue(clueId) {
    const response = await api.get(`${AGENT_BASE}/clue/${clueId}`);
    return response.data;
  },

  async getHuntClues(huntId) {
    const response = await api.get(`${AGENT_BASE}/clue/hunt/${huntId}`);
    return response.data;
  },

  async updateClue(clueId, updates) {
    const response = await api.put(`${AGENT_BASE}/clue/${clueId}`, updates);
    return response.data;
  }
};

// ===== Health Check =====

export const agentHealthService = {
  async checkAllAgents() {
    const response = await api.get(`${AGENT_BASE}/health`);
    return response.data;
  }
};

// Combined export
const agentService = {
  qr: qrManagerService,
  stats: statsService,
  payment: paymentService,
  notification: notificationService,
  clue: clueService,
  health: agentHealthService
};

export default agentService;
