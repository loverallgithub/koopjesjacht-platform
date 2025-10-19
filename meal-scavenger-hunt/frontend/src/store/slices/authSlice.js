import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

const initialState = {
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,
  signupId: null,
  onboardingStep: 0,
  tutorialProgress: null,
};

// Async thunks
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createProfile = createAsyncThunk(
  'auth/createProfile',
  async ({ signupId, profileData }, { rejectWithValue }) => {
    try {
      const response = await authService.createProfile(signupId, profileData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const startTutorial = createAsyncThunk(
  'auth/startTutorial',
  async (signupId, { rejectWithValue }) => {
    try {
      const response = await authService.startTutorial(signupId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const completeTutorialStop = createAsyncThunk(
  'auth/completeTutorialStop',
  async ({ signupId, qrCode }, { rejectWithValue }) => {
    try {
      const response = await authService.completeTutorialStop(signupId, qrCode);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.user = null;
      state.isAuthenticated = false;
      state.signupId = null;
      state.onboardingStep = 0;
      state.tutorialProgress = null;
    },
    setOnboardingStep: (state, action) => {
      state.onboardingStep = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.signupId = action.payload.signup.signup_id;
        state.onboardingStep = 1;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create Profile
      .addCase(createProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProfile.fulfilled, (state) => {
        state.isLoading = false;
        state.onboardingStep = 2;
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Start Tutorial
      .addCase(startTutorial.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startTutorial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tutorialProgress = action.payload.tutorial;
        state.onboardingStep = 3;
      })
      .addCase(startTutorial.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Complete Tutorial Stop
      .addCase(completeTutorialStop.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeTutorialStop.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tutorialProgress = action.payload.tutorial;
        if (action.payload.tutorial.completed) {
          state.onboardingStep = 4;
        }
      })
      .addCase(completeTutorialStop.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, setOnboardingStep, clearError } = authSlice.actions;
export default authSlice.reducer;
