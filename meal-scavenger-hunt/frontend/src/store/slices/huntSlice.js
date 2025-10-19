import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import huntService from '../../services/huntService';

const initialState = {
  hunts: [],
  currentHunt: null,
  activeHunt: null,
  leaderboard: [],
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    difficulty: 'all',
    priceRange: 'all',
  },
};

// Async thunks
export const fetchHunts = createAsyncThunk(
  'hunt/fetchHunts',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await huntService.getAllHunts(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchHuntById = createAsyncThunk(
  'hunt/fetchHuntById',
  async (huntId, { rejectWithValue }) => {
    try {
      const response = await huntService.getHuntById(huntId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createHunt = createAsyncThunk(
  'hunt/createHunt',
  async (huntData, { rejectWithValue }) => {
    try {
      const response = await huntService.createHunt(huntData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const joinHunt = createAsyncThunk(
  'hunt/joinHunt',
  async ({ huntId, teamData }, { rejectWithValue }) => {
    try {
      const response = await huntService.joinHunt(huntId, teamData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLeaderboard = createAsyncThunk(
  'hunt/fetchLeaderboard',
  async (huntId, { rejectWithValue }) => {
    try {
      const response = await huntService.getLeaderboard(huntId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const huntSlice = createSlice({
  name: 'hunt',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setActiveHunt: (state, action) => {
      state.activeHunt = action.payload;
    },
    clearCurrentHunt: (state) => {
      state.currentHunt = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLeaderboard: (state, action) => {
      state.leaderboard = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Hunts
      .addCase(fetchHunts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHunts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hunts = action.payload;
      })
      .addCase(fetchHunts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Hunt By ID
      .addCase(fetchHuntById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHuntById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentHunt = action.payload;
      })
      .addCase(fetchHuntById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create Hunt
      .addCase(createHunt.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createHunt.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hunts.unshift(action.payload);
      })
      .addCase(createHunt.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Join Hunt
      .addCase(joinHunt.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(joinHunt.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeHunt = action.payload;
      })
      .addCase(joinHunt.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch Leaderboard
      .addCase(fetchLeaderboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leaderboard = action.payload;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  setActiveHunt,
  clearCurrentHunt,
  clearError,
  updateLeaderboard,
} = huntSlice.actions;

export default huntSlice.reducer;
