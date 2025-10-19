import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import huntReducer from './slices/huntSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    hunt: huntReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;
