import api from './api';

const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/api/hunter-onboarding/signup/start', {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      heard_about_us: userData.heardAboutUs || 'website',
      accept_terms: userData.acceptTerms,
    });
    return response.data;
  },

  // Create user profile
  createProfile: async (signupId, profileData) => {
    const response = await api.post(
      `/api/hunter-onboarding/signup/${signupId}/profile`,
      {
        display_name: profileData.displayName,
        team_preference: profileData.teamPreference,
        experience_level: profileData.experienceLevel,
        interests: profileData.interests,
      }
    );
    return response.data;
  },

  // Start tutorial
  startTutorial: async (signupId) => {
    const response = await api.post(
      `/api/hunter-onboarding/signup/${signupId}/tutorial/start`
    );
    return response.data;
  },

  // Complete tutorial stop
  completeTutorialStop: async (signupId, qrCode) => {
    const response = await api.post(
      `/api/hunter-onboarding/signup/${signupId}/tutorial/scan`,
      { qr_code: qrCode }
    );
    return response.data;
  },

  // Get signup details
  getSignup: async (signupId) => {
    const response = await api.get(
      `/api/hunter-onboarding/signup/${signupId}`
    );
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });

    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
};

export default authService;
