import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import { store } from './store';
import i18n from './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';

// Public Pages
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const HuntList = React.lazy(() => import('./pages/HuntList'));
const HuntDetail = React.lazy(() => import('./pages/HuntDetail'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Protected Hunter Pages
const TeamDashboard = React.lazy(() => import('./pages/TeamDashboard'));
const QRScanner = React.lazy(() => import('./pages/QRScanner'));
const Payment = React.lazy(() => import('./pages/Payment'));
const Profile = React.lazy(() => import('./pages/Profile'));

// Protected Venue Pages (role-based)
const ShopDashboard = React.lazy(() => import('./pages/ShopDashboard'));

// Protected Organizer Pages (role-based)
const OrganizerDashboard = React.lazy(() => import('./pages/OrganizerDashboard'));

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B35',
      light: '#FF8C5A',
      dark: '#E55A26',
    },
    secondary: {
      main: '#004E89',
      light: '#1A6FAF',
      dark: '#003664',
    },
    success: {
      main: '#4CAF50',
    },
    warning: {
      main: '#FFC107',
    },
    error: {
      main: '#F44336',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

const paypalOptions = {
  'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: 'EUR',
  intent: 'capture',
};

function App() {
  return (
    <HelmetProvider>
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <PayPalScriptProvider options={paypalOptions}>
              <Elements stripe={stripePromise}>
                <AuthProvider>
                  <SocketProvider>
                    <Router>
                      <Suspense fallback={<LoadingScreen />}>
                        <Routes>
                          <Route path="/" element={<Layout />}>
                            {/* Public Routes */}
                            <Route index element={<Home />} />
                            <Route path="login" element={<Login />} />
                            <Route path="register" element={<Register />} />
                            <Route path="onboarding" element={<Onboarding />} />
                            <Route path="hunts" element={<HuntList />} />
                            <Route path="hunts/:huntId" element={<HuntDetail />} />
                            <Route path="hunts/:huntId/leaderboard" element={<Leaderboard />} />

                            {/* Protected Hunter Routes */}
                            <Route element={<PrivateRoute />}>
                              <Route path="team/:teamId" element={<TeamDashboard />} />
                              <Route path="team/:teamId/scan" element={<QRScanner />} />
                              <Route path="team/:teamId/payment" element={<Payment />} />
                              <Route path="profile" element={<Profile />} />
                            </Route>

                            {/* Protected Venue Routes */}
                            <Route element={<PrivateRoute requiredRole="shop_owner" />}>
                              <Route path="venue/dashboard" element={<ShopDashboard />} />
                            </Route>

                            {/* Protected Organizer Routes */}
                            <Route element={<PrivateRoute requiredRole="organizer" />}>
                              <Route path="organizer/dashboard" element={<OrganizerDashboard />} />
                            </Route>

                            {/* 404 */}
                            <Route path="404" element={<NotFound />} />
                            <Route path="*" element={<Navigate to="/404" replace />} />
                          </Route>
                        </Routes>
                      </Suspense>
                    </Router>
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#363636',
                          color: '#fff',
                        },
                        success: {
                          style: {
                            background: '#4CAF50',
                          },
                        },
                        error: {
                          style: {
                            background: '#F44336',
                          },
                        },
                      }}
                    />
                  </SocketProvider>
                </AuthProvider>
              </Elements>
            </PayPalScriptProvider>
          </ThemeProvider>
        </Provider>
      </I18nextProvider>
    </HelmetProvider>
  );
}

export default App;