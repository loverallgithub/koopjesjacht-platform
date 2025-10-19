import api from './api';

const analyticsService = {
  // Get real-time dashboard
  getRealtimeDashboard: async () => {
    const response = await api.get('/api/analytics/dashboard/realtime');
    return response.data;
  },

  // Get revenue dashboard
  getRevenueDashboard: async () => {
    const response = await api.get('/api/analytics/dashboard/revenue');
    return response.data;
  },

  // Get user dashboard
  getUserDashboard: async () => {
    const response = await api.get('/api/analytics/dashboard/users');
    return response.data;
  },

  // Get hunt analytics
  getHuntAnalytics: async () => {
    const response = await api.get('/api/analytics/dashboard/hunts');
    return response.data;
  },

  // Get cohort retention
  getCohortRetention: async (cohortDate) => {
    const response = await api.get('/api/analytics/cohort/retention', {
      params: { cohort_date: cohortDate },
    });
    return response.data;
  },

  // Get predictive churn
  getPredictiveChurn: async () => {
    const response = await api.get('/api/analytics/predictive/churn');
    return response.data;
  },

  // Get campaign performance
  getCampaignPerformance: async () => {
    const response = await api.get('/api/analytics/campaign/performance');
    return response.data;
  },
};

export default analyticsService;
