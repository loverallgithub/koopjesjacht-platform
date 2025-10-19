# Koopjesjacht Website Architecture

**Version:** 1.0.0
**Date:** October 18, 2025
**Stack:** React 18 + Material-UI + Redux Toolkit

---

## Table of Contents
1. [User Personas](#user-personas)
2. [Page Structure](#page-structure)
3. [Component Architecture](#component-architecture)
4. [API Integration](#api-integration)
5. [State Management](#state-management)
6. [User Flows](#user-flows)

---

## User Personas

### 1. Hunter (Player)
**Goal:** Join hunts, scan QR codes, upload photos, compete for prizes

**Key Features:**
- Browse available hunts
- Sign up and complete onboarding tutorial
- Join/create teams
- Scan QR codes at venues
- Upload photos and earn bonus points
- View real-time leaderboard
- Claim rewards
- Invite friends via referral program

### 2. Organizer (Hunt Creator)
**Goal:** Create and manage scavenger hunts

**Key Features:**
- Create new hunts with customizable routes
- Select venues and meal components
- Set entry fees and prize pools
- Generate AI clues for each stop
- Monitor hunt progress in real-time
- View analytics and participant stats
- Manage teams and participants
- Process payments and distribute rewards

### 3. Venue/Shop Owner
**Goal:** Participate in hunts, attract customers, verify visits

**Key Features:**
- Sign up and create venue profile
- Manage business hours and offerings
- Participate in hunts
- Verify QR code scans
- View customer analytics
- Manage employee access
- Upload photos and engage with hunters
- Track revenue from hunt participants

### 4. Admin
**Goal:** Monitor platform health, manage users, review fraud alerts

**Key Features:**
- Platform-wide analytics dashboard
- User management (hunters, organizers, venues)
- Fraud detection monitoring
- Support ticket management
- Email campaign management
- System health monitoring
- Financial reporting

---

## Page Structure

```
/
├── Landing Page (Public)
│   ├── Hero section with CTA
│   ├── How it works
│   ├── Featured hunts
│   ├── Testimonials
│   └── Footer
│
├── /login (Public)
├── /register (Public)
│   ├── Hunter signup
│   ├── Organizer signup
│   └── Venue signup
│
├── /onboarding (Hunter only)
│   ├── Profile creation
│   ├── Tutorial hunt (3 stops)
│   └── First hunt discount
│
├── /hunts (Public browse, Auth to join)
│   ├── Hunt list with filters
│   ├── Search and sort
│   └── Map view
│
├── /hunts/:id (Public details)
│   ├── Hunt information
│   ├── Route preview
│   ├── Participating venues
│   ├── Prize details
│   └── Join/Register button
│
├── /team-dashboard (Hunter - Private)
│   ├── Active hunt status
│   ├── Current clue
│   ├── Team stats and points
│   ├── QR scanner button
│   ├── Photo gallery
│   ├── Team leaderboard
│   └── Next steps
│
├── /qr-scanner (Hunter - Private)
│   ├── Camera view
│   ├── QR code scanner
│   ├── Location verification
│   └── Scan results
│
├── /upload-photo (Hunter - Private)
│   ├── Photo capture/upload
│   ├── Caption and tags
│   ├── Social sharing options
│   └── Bonus points info
│
├── /leaderboard/:huntId (Public)
│   ├── Real-time team rankings
│   ├── Points breakdown
│   ├── Completion status
│   └── Prize distribution
│
├── /organizer-dashboard (Organizer - Private)
│   ├── My hunts list
│   ├── Create new hunt button
│   ├── Hunt analytics
│   └── Revenue tracking
│
├── /organizer/create-hunt (Organizer - Private)
│   ├── Hunt details form
│   ├── Venue selection (map-based)
│   ├── Clue generation (AI-powered)
│   ├── Prize pool setup
│   ├── Schedule and publish
│   └── Preview
│
├── /organizer/hunt/:id (Organizer - Private)
│   ├── Live hunt monitoring
│   ├── Real-time team progress
│   ├── Participant chat/support
│   ├── Analytics dashboard
│   └── Edit/Cancel options
│
├── /venue-dashboard (Venue - Private)
│   ├── Profile management
│   ├── Upcoming hunts
│   ├── Scan verification interface
│   ├── Customer analytics
│   ├── Photo gallery
│   └── Employee management
│
├── /venue/verify (Venue - Private)
│   ├── QR code verification
│   ├── Team check-in
│   ├── Photo approval
│   └── Bonus rewards
│
├── /admin-dashboard (Admin - Private)
│   ├── Platform analytics
│   ├── User management
│   ├── Fraud alerts
│   ├── Support tickets
│   ├── Email campaigns
│   └── System health
│
├── /profile (All users - Private)
│   ├── Account settings
│   ├── Hunt history
│   ├── Referral program
│   ├── Payment methods
│   └── Notifications
│
├── /payment (All users - Private)
│   ├── Payment selection (iDEAL, PayPal, Stripe)
│   ├── Entry fee payment
│   └── Payment confirmation
│
└── /referral/:code (Public)
    ├── Referral landing page
    ├── Referrer information
    └── Signup with bonus
```

---

## Component Architecture

### Shared Components

```
components/
├── Layout/
│   ├── Header.jsx              # Top navigation with user menu
│   ├── Footer.jsx              # Site footer with links
│   ├── Sidebar.jsx             # Role-based sidebar navigation
│   └── MobileNav.jsx           # Mobile hamburger menu
│
├── Auth/
│   ├── LoginForm.jsx           # Login with email/password
│   ├── RegisterForm.jsx        # Multi-role registration
│   ├── PrivateRoute.jsx        # Auth guard component
│   └── RoleGuard.jsx           # Role-based access control
│
├── Hunt/
│   ├── HuntCard.jsx            # Hunt preview card
│   ├── HuntList.jsx            # Grid/list of hunts
│   ├── HuntMap.jsx             # Map with hunt markers
│   ├── ClueDisplay.jsx         # Current clue card
│   ├── HintButton.jsx          # Reveal hint (with penalty)
│   └── RoutePreview.jsx        # Visual route timeline
│
├── Team/
│   ├── TeamCard.jsx            # Team info card
│   ├── TeamMemberList.jsx      # Team roster
│   ├── InviteTeamForm.jsx      # Send team invitations
│   ├── JoinTeamModal.jsx       # Join via invite code
│   └── TeamStats.jsx           # Points, progress, rank
│
├── QR/
│   ├── QRScanner.jsx           # Camera-based QR scanner
│   ├── QRCodeDisplay.jsx       # Display venue QR code
│   ├── ScanResult.jsx          # Scan success/failure UI
│   └── LocationVerifier.jsx    # GPS-based verification
│
├── Photo/
│   ├── PhotoUpload.jsx         # Drag-drop photo upload
│   ├── PhotoGallery.jsx        # Grid of hunt photos
│   ├── PhotoCard.jsx           # Individual photo with actions
│   ├── PhotoModal.jsx          # Full-size photo view
│   └── SocialShareButtons.jsx  # Share to Instagram/Twitter
│
├── Leaderboard/
│   ├── LeaderboardTable.jsx    # Sortable team rankings
│   ├── TeamRankCard.jsx        # Individual team rank
│   ├── ProgressBar.jsx         # Visual progress indicator
│   └── CountdownTimer.jsx      # Hunt countdown
│
├── Payment/
│   ├── PaymentMethodSelector.jsx  # iDEAL/PayPal/Stripe
│   ├── StripeCheckout.jsx         # Stripe integration
│   ├── PayPalCheckout.jsx         # PayPal integration
│   ├── iDEALCheckout.jsx          # iDEAL integration
│   └── PaymentConfirmation.jsx    # Success/failure screens
│
├── Venue/
│   ├── VenueCard.jsx              # Venue info card
│   ├── VenueList.jsx              # List of venues
│   ├── VenueMap.jsx               # Map picker for hunt creation
│   ├── VenueProfile.jsx           # Detailed venue page
│   └── VerificationInterface.jsx  # Verify QR scans
│
├── Analytics/
│   ├── DashboardWidget.jsx        # Reusable metric card
│   ├── RevenueChart.jsx           # Revenue over time
│   ├── UserGrowthChart.jsx        # User acquisition
│   ├── HuntPerformance.jsx        # Hunt completion rates
│   └── RealTimeStats.jsx          # Live platform metrics
│
├── Admin/
│   ├── UserTable.jsx              # Manage users
│   ├── FraudAlertList.jsx         # Fraud detection alerts
│   ├── SupportTickets.jsx         # Customer support
│   ├── EmailCampaignManager.jsx   # Email marketing UI
│   └── SystemHealthMonitor.jsx    # Agent status dashboard
│
├── Common/
│   ├── LoadingScreen.jsx          # Full-page loader
│   ├── LoadingSpinner.jsx         # Inline spinner
│   ├── ErrorBoundary.jsx          # Error handling
│   ├── EmptyState.jsx             # No data placeholder
│   ├── ConfirmDialog.jsx          # Confirmation modal
│   ├── NotificationBell.jsx       # Notification dropdown
│   └── SearchBar.jsx              # Search with autocomplete
│
└── Form/
    ├── FormInput.jsx              # Validated input field
    ├── FormSelect.jsx             # Dropdown select
    ├── FormCheckbox.jsx           # Checkbox with label
    ├── FormDatePicker.jsx         # Date/time selector
    ├── FormFileUpload.jsx         # File upload with preview
    └── FormSubmitButton.jsx       # Submit with loading state
```

---

## API Integration

### API Service Layer

```javascript
services/
├── api.js                  # Axios base config
├── authService.js          # Login, register, logout
├── huntService.js          # Hunt CRUD operations
├── teamService.js          # Team management
├── qrService.js            # QR generation and validation
├── photoService.js         # Photo upload and management
├── paymentService.js       # Payment processing
├── venueService.js         # Venue management
├── analyticsService.js     # Analytics data
├── fraudService.js         # Fraud detection
├── referralService.js      # Referral program
├── emailService.js         # Email campaigns
└── notificationService.js  # Real-time notifications
```

### Agent Endpoints Mapping

| Feature | Agent | Endpoints |
|---------|-------|-----------|
| User Onboarding | Hunter Onboarding (9012) | `/signup/start`, `/signup/:id/profile`, `/signup/:id/tutorial/*` |
| Hunt Clues | Clue Generator (9001) | `/generate-clue` |
| QR Codes | QR Manager (9002) | `/generate-qr`, `/verify-qr` |
| Points & Stats | Stats Aggregator (9003) | `/team/:id/stats`, `/hunt/:id/leaderboard` |
| Rewards | Payment Handler (9004) | `/rewards/generate`, `/rewards/redeem` |
| Notifications | Notification Service (9005) | `/send` |
| Venues | Venue Management (9006) | `/venues/*`, `/venues/:id` |
| Photo Upload | Media Upload (9007) | `/upload`, `/gallery/*` |
| Fraud Detection | Fraud Detection (9015) | `/validate/hunt`, `/stats/overview` |
| Email Campaigns | Email Marketing (9016) | `/campaign/*` |
| Referrals | Referral Program (9017) | `/link/generate`, `/leaderboard` |
| Analytics | Advanced Analytics (9023) | `/dashboard/*` |
| API Gateway | API Gateway (9000) | `/api/*` (routes to all agents) |

---

## State Management

### Redux Store Structure

```javascript
store/
├── slices/
│   ├── authSlice.js         # User auth state
│   ├── huntSlice.js         # Active hunt data
│   ├── teamSlice.js         # Team information
│   ├── leaderboardSlice.js  # Real-time rankings
│   ├── notificationSlice.js # Notifications
│   ├── uiSlice.js           # UI state (modals, loading)
│   └── profileSlice.js      # User profile
│
└── store.js                 # Redux store configuration
```

### Context Providers

```javascript
contexts/
├── AuthContext.jsx          # Authentication state
├── SocketContext.jsx        # WebSocket for real-time updates
└── ThemeContext.jsx         # Light/dark mode toggle
```

---

## User Flows

### 1. Hunter Onboarding Flow

```
Landing Page
  → Click "Join as Hunter"
  → Register Form (name, email, password)
  → POST /signup/start
  ← Receive signup_id + referral_code
  → Profile Creation (team preference, interests)
  → POST /signup/:id/profile
  → Tutorial Hunt Start
  → POST /signup/:id/tutorial/start
  → Scan QR Code #1 (Welcome Stop)
  → POST /signup/:id/tutorial/scan {qr_code: "TUTORIAL_STOP_1"}
  → Scan QR Code #2 (Learning Stop)
  → Scan QR Code #3 (Final Stop)
  ← Receive 20% discount code
  → Complete! Redirect to Hunt List
```

### 2. Join Hunt and Play Flow

```
Hunt List Page
  → Browse available hunts
  → Click hunt card
  → Hunt Detail Page
  → Click "Join Hunt"
  → Payment Page (if entry fee > 0)
  → Pay with iDEAL/PayPal/Stripe
  → POST /payment/process
  ← Payment confirmation
  → Redirect to Team Dashboard
  → View Current Clue
  → Navigate to venue
  → Click "Scan QR"
  → QR Scanner opens camera
  → Scan venue QR code
  → POST /qr/verify
  ← 100 points awarded
  → Upload Photo (optional)
  → POST /photo/upload
  ← +25 bonus points
  → Next clue revealed
  → Repeat until hunt complete
  → Final leaderboard and rewards
```

### 3. Create Hunt Flow (Organizer)

```
Organizer Dashboard
  → Click "Create New Hunt"
  → Hunt Details Form
    - Title, description
    - Start/end date
    - Max teams, team size
    - Entry fee, prize pool
  → Select Venues on Map
    - Click 4-6 venues
    - Assign meal components (appetizer, main, dessert, drink)
  → Generate AI Clues
    - POST /clue/generate for each venue
    - Review and edit clues
  → Add Special Guest (optional)
  → Set Hunt Rules
  → Preview Hunt
  → Publish Hunt
  → POST /hunts/create
  ← Hunt created with hunt_id
  → Share hunt link
  → Monitor progress in real-time
```

### 4. Venue Verification Flow

```
Venue Dashboard
  → View upcoming hunts
  → Team arrives at venue
  → Venue clicks "Verify Visit"
  → Team shows QR code
  → Venue scans team QR
  → POST /qr/verify
  ← Verification successful
  → Team prompted to upload photo
  → Venue approves photo (optional)
  → Bonus points awarded
  → Team receives next clue
```

---

## Responsive Design

### Breakpoints
- **Mobile:** 0-600px (phone)
- **Tablet:** 601-960px
- **Desktop:** 961px+ (laptop/desktop)

### Mobile-First Components
- Bottom navigation for hunters (active hunt)
- Swipe gestures for photo gallery
- Native camera access for QR scanning
- Progressive Web App (PWA) for offline capability

---

## Real-Time Features

### WebSocket Events (Socket.IO)

```javascript
// Hunter events
socket.on('team:points_updated', (data) => { /* Update points */ });
socket.on('hunt:clue_unlocked', (data) => { /* Show new clue */ });
socket.on('leaderboard:updated', (data) => { /* Refresh rankings */ });
socket.on('notification:received', (data) => { /* Show toast */ });

// Organizer events
socket.on('hunt:team_joined', (data) => { /* Update participant list */ });
socket.on('hunt:scan_completed', (data) => { /* Update progress map */ });
socket.on('hunt:photo_uploaded', (data) => { /* Show in gallery */ });

// Venue events
socket.on('venue:team_approaching', (data) => { /* Alert staff */ });
socket.on('venue:verification_requested', (data) => { /* Show QR */ });
```

---

## Security Features

### Frontend Security

1. **Authentication**
   - JWT tokens stored in httpOnly cookies
   - Refresh token rotation
   - Auto logout on token expiration

2. **Authorization**
   - Role-based access control (RBAC)
   - Private routes with guards
   - Component-level permission checks

3. **Input Validation**
   - React Hook Form with Yup schemas
   - Client-side validation before API calls
   - XSS prevention (sanitize user input)

4. **API Security**
   - HTTPS only
   - CORS configuration
   - Rate limiting (handled by API Gateway)
   - Agent-to-agent authentication (X-Agent-Secret)

---

## Performance Optimizations

1. **Code Splitting**
   - React.lazy() for route-based splitting
   - Dynamic imports for heavy components

2. **Caching**
   - API response caching with React Query
   - Service Worker for offline access
   - Image optimization and lazy loading

3. **Bundle Optimization**
   - Tree shaking unused code
   - Minification and compression
   - CDN for static assets

---

## Deployment

### Build Configuration

```bash
# Development
npm start               # Port 3000 with hot reload

# Production Build
npm run build           # Optimized build in /build
docker build -t frontend:latest .
docker-compose up frontend
```

### Environment Variables

```
REACT_APP_API_GATEWAY_URL=http://localhost:9000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
REACT_APP_PAYPAL_CLIENT_ID=...
REACT_APP_MAPBOX_TOKEN=...
REACT_APP_SOCKET_URL=ws://localhost:9000
```

---

## Next Steps

1. **Phase 1:** Build core pages (Landing, Login, Register, Hunt List)
2. **Phase 2:** Build hunter flow (Onboarding, Team Dashboard, QR Scanner)
3. **Phase 3:** Build organizer flow (Create Hunt, Manage Hunt)
4. **Phase 4:** Build venue flow (Verification, Analytics)
5. **Phase 5:** Build admin dashboard
6. **Phase 6:** Real-time features and WebSocket integration
7. **Phase 7:** Testing and optimization
8. **Phase 8:** Production deployment

---

**Last Updated:** October 18, 2025
**Status:** Architecture Complete - Ready for Implementation
