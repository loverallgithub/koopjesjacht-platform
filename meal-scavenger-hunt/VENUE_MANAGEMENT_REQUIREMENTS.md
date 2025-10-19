# Venue Management Agent - Requirements

**Agent**: Venue Management Agent (NEW)
**Port**: 9006
**Purpose**: Enable venue owners to manage their participation in scavenger hunts

---

## Vision

Empower venue owners and their staff to:
- **Register** their venue for scavenger hunts
- **Configure rewards** they want to offer hunters
- **Manage employees** who can check in hunters
- **Check in hunters** when they arrive
- **Validate rewards** when hunters redeem them
- **Track analytics** to measure ROI

---

## Core Capabilities

### Capability 1: Venue Owner Registration 🏪

#### Register Venue
**Purpose**: Venue owners can sign up to participate in hunts

**Data Model**:
```javascript
{
  venue_id: "uuid",
  owner_id: "uuid",
  venue_name: "Golden Dragon",
  business_type: "restaurant",
  cuisine_type: "chinese",
  address: {
    street: "Grote Marktstraat 15",
    city: "Den Haag",
    postal_code: "2511 BH",
    country: "Netherlands"
  },
  contact: {
    owner_name: "John Chen",
    email: "john@goldendragon.nl",
    phone: "+31 70 123 4567"
  },
  business_hours: {
    monday: { open: "11:00", close: "22:00" },
    tuesday: { open: "11:00", close: "22:00" },
    // ... other days
  },
  registration_date: "2025-10-18T14:00:00Z",
  status: "active",  // active, pending, suspended
  verification_status: "verified"  // pending, verified
}
```

**Endpoints**:
- `POST /venue/register` - Register new venue
- `GET /venue/:venue_id` - Get venue details
- `PUT /venue/:venue_id` - Update venue info
- `GET /venue/owner/:owner_id` - Get venues by owner

---

### Capability 2: Reward Configuration 🎁

#### Configure Venue Rewards
**Purpose**: Owners define what rewards they want to offer hunters

**Data Model**:
```javascript
{
  reward_config_id: "uuid",
  venue_id: "golden_dragon",
  hunt_id: "hunt_denhaag_001",  // or "all_hunts"
  reward_type: "percentage_discount",
  discount_percentage: 10,
  discount_amount: null,
  item_name: null,
  description: "10% off your entire meal",
  terms: "Valid for dine-in only. Cannot be combined with other offers.",
  valid_days: 30,
  max_redemptions_per_hunt: 100,
  redemptions_used: 0,
  active: true,
  created_at: "2025-10-18T14:00:00Z",
  updated_at: "2025-10-18T14:00:00Z"
}
```

**Endpoints**:
- `POST /venue/:venue_id/rewards/configure` - Configure reward
- `GET /venue/:venue_id/rewards/config` - Get reward configuration
- `PUT /venue/:venue_id/rewards/config/:config_id` - Update reward
- `DELETE /venue/:venue_id/rewards/config/:config_id` - Disable reward

**Reward Templates**:
```javascript
const REWARD_TEMPLATES = {
  percentage_discount: {
    name: "Percentage Discount",
    description: "Offer X% off the bill",
    fields: ["discount_percentage", "description", "terms"]
  },
  fixed_discount: {
    name: "Fixed Amount Discount",
    description: "Offer €X off the bill",
    fields: ["discount_amount", "description", "terms"]
  },
  freebie: {
    name: "Free Item",
    description: "Offer a free item with purchase",
    fields: ["item_name", "description", "terms"]
  },
  bogo: {
    name: "Buy One Get One",
    description: "Buy one item, get one free",
    fields: ["item_name", "description", "terms"]
  }
};
```

---

### Capability 3: Employee Management 👥

#### Manage Staff Access
**Purpose**: Venue owners add employees who can check in hunters

**Data Model**:
```javascript
{
  employee_id: "uuid",
  venue_id: "golden_dragon",
  employee_name: "Maria Santos",
  email: "maria@goldendragon.nl",
  phone: "+31 70 123 4568",
  role: "staff",  // owner, manager, staff
  pin_code: "1234",  // For quick check-in
  permissions: {
    check_in_hunters: true,
    validate_rewards: true,
    view_analytics: false,
    manage_rewards: false
  },
  status: "active",  // active, suspended
  created_at: "2025-10-18T14:00:00Z",
  last_login: null
}
```

**Endpoints**:
- `POST /venue/:venue_id/employees` - Add employee
- `GET /venue/:venue_id/employees` - List employees
- `PUT /venue/:venue_id/employees/:employee_id` - Update employee
- `DELETE /venue/:venue_id/employees/:employee_id` - Remove employee
- `POST /venue/:venue_id/employees/login` - Employee login (PIN or email)

---

### Capability 4: Hunter Check-In System ✅

#### Check In Hunters
**Purpose**: Employees check in hunters when they arrive at venue

**Flow**:
1. Hunter arrives at venue
2. Hunter shows QR code (from app/phone)
3. Employee scans QR code OR enters team code
4. System verifies hunter is on active hunt
5. System marks hunter as "checked in"
6. System shows available rewards
7. Employee welcomes hunter

**Data Model**:
```javascript
{
  checkin_id: "uuid",
  venue_id: "golden_dragon",
  team_id: "team_alpha",
  hunt_id: "hunt_denhaag_001",
  checked_in_by: "employee_id",
  checkin_time: "2025-10-18T15:30:00Z",
  party_size: 4,
  notes: "Table 12",
  status: "dining"  // checked_in, dining, completed
}
```

**Endpoints**:
- `POST /venue/:venue_id/checkin` - Check in hunter
- `GET /venue/:venue_id/checkins` - Get today's check-ins
- `GET /venue/:venue_id/checkins/:checkin_id` - Get check-in details
- `PUT /venue/:venue_id/checkins/:checkin_id/status` - Update status

---

### Capability 5: Reward Redemption (Venue Side) 💰

#### Validate & Redeem Rewards
**Purpose**: Employees validate and mark rewards as redeemed

**Flow**:
1. Hunter finishes dining
2. Hunter requests to use reward
3. Hunter shows reward code
4. Employee scans/enters reward code
5. System verifies reward validity
6. Employee applies discount
7. System marks reward as redeemed
8. Confirmation sent to both parties

**Endpoints**:
- `POST /venue/:venue_id/rewards/validate` - Validate reward code
- `POST /venue/:venue_id/rewards/redeem` - Redeem reward
- `GET /venue/:venue_id/rewards/redeemed` - Get redemption history

---

### Capability 6: Item Management 🍽️

#### Add Items for Hunters
**Purpose**: Venues can add special items/experiences for hunters

**Data Model**:
```javascript
{
  item_id: "uuid",
  venue_id: "golden_dragon",
  item_type: "menu_item",  // menu_item, experience, voucher
  item_name: "Lucky Dragon Roll",
  description: "Special sushi roll created for scavenger hunters",
  category: "food",
  price: 12.50,
  hunter_only: true,  // Only available to hunters
  requires_checkin: true,
  image_url: "https://...",
  available: true,
  created_at: "2025-10-18T14:00:00Z"
}
```

**Endpoints**:
- `POST /venue/:venue_id/items` - Add new item
- `GET /venue/:venue_id/items` - List venue items
- `PUT /venue/:venue_id/items/:item_id` - Update item
- `DELETE /venue/:venue_id/items/:item_id` - Remove item

---

### Capability 7: Analytics Dashboard 📊

#### Track Venue Performance
**Purpose**: Owners see ROI and engagement metrics

**Metrics**:
```javascript
{
  venue_id: "golden_dragon",
  hunt_id: "hunt_denhaag_001",
  period: "hunt",  // day, week, month, hunt
  metrics: {
    total_checkins: 45,
    unique_teams: 42,
    total_hunters: 168,  // Based on party sizes
    rewards_issued: 42,
    rewards_redeemed: 28,
    redemption_rate: 66.7,
    estimated_revenue: 840.00,
    discount_value: 84.00,
    net_revenue: 756.00,
    average_party_size: 4,
    peak_hours: ["18:00-19:00", "19:00-20:00"],
    feedback_rating: 4.5
  }
}
```

**Endpoints**:
- `GET /venue/:venue_id/analytics` - Get analytics dashboard
- `GET /venue/:venue_id/analytics/hunt/:hunt_id` - Hunt-specific analytics
- `GET /venue/:venue_id/analytics/export` - Export CSV report

---

### Capability 8: Hunt Participation 🎯

#### Enroll in Hunts
**Purpose**: Venues opt-in to specific scavenger hunts

**Data Model**:
```javascript
{
  participation_id: "uuid",
  venue_id: "golden_dragon",
  hunt_id: "hunt_denhaag_001",
  enrolled_at: "2025-10-15T10:00:00Z",
  status: "active",  // pending, active, completed
  reward_config_id: "uuid",  // Link to reward configuration
  expected_traffic: 50,
  actual_traffic: 42,
  participation_fee: 50.00,  // Optional sponsorship fee
  payment_status: "paid"
}
```

**Endpoints**:
- `POST /venue/:venue_id/hunts/enroll` - Enroll in hunt
- `GET /venue/:venue_id/hunts` - List hunt participation
- `PUT /venue/:venue_id/hunts/:hunt_id/status` - Update participation status
- `DELETE /venue/:venue_id/hunts/:hunt_id` - Withdraw from hunt

---

## Integration Points

### With Reward Agent (Port 9004):
- Query reward catalog to show venue's rewards
- Validate reward codes
- Mark rewards as redeemed
- Award bonus points (if venue offers extra challenges)

### With Stats Aggregator (Port 9003):
- Record hunter check-ins
- Track venue visit counts
- Get team/hunt statistics

### With Notification Service (Port 9005):
- Notify venue when hunter checks in
- Notify venue when reward is redeemed
- Send analytics reports

### With QR Manager (Port 9002):
- Generate venue-specific QR codes for check-in
- Validate hunter QR codes

---

## User Flows

### Flow 1: Venue Owner Registration
```
1. Owner visits venue portal
   ↓
2. Owner fills registration form
   - Venue name, address, contact
   - Business hours, cuisine type
   ↓
3. System creates venue account
   ↓
4. Owner receives confirmation email
   ↓
5. Owner sets up first reward
   ↓
6. Owner adds employees
   ↓
7. Venue ready to participate!
```

### Flow 2: Configure Rewards
```
1. Owner logs into venue portal
   ↓
2. Owner clicks "Configure Rewards"
   ↓
3. Owner selects reward type
   - Percentage discount
   - Fixed amount
   - Freebie
   - BOGO
   ↓
4. Owner fills in details
   - Amount/item
   - Terms & conditions
   - Validity period
   ↓
5. Owner sets max redemptions
   ↓
6. System saves configuration
   ↓
7. Reward available for next hunt!
```

### Flow 3: Employee Checks In Hunter
```
1. Hunter arrives at Golden Dragon
   ↓
2. Hunter shows QR code to staff
   ↓
3. Employee scans QR code with tablet
   ↓
4. System shows:
   - Team name: "Team Alpha"
   - Hunt: "Den Haag Food Hunt"
   - Party size: 4
   - Available reward: "10% off"
   ↓
5. Employee clicks "Check In"
   ↓
6. System records check-in
   ↓
7. Employee seats party at table
   ↓
8. Notification sent to Stats Aggregator
```

### Flow 4: Redeem Reward at Checkout
```
1. Hunter finishes meal
   ↓
2. Hunter requests reward
   ↓
3. Hunter shows reward code: HUNT-GO-TEAM-5NLL
   ↓
4. Employee enters code in POS/tablet
   ↓
5. System verifies:
   - Valid code ✅
   - Not expired ✅
   - Not redeemed ✅
   - Correct venue ✅
   ↓
6. System shows discount: €8.40 off €84 bill
   ↓
7. Employee applies discount
   ↓
8. Employee marks as redeemed
   ↓
9. Hunter pays €75.60
   ↓
10. Confirmation sent to both parties
```

---

## Venue Portal Features

### Dashboard
- Today's check-ins
- Active rewards
- Redemption count
- Quick stats

### Rewards Management
- Create/edit rewards
- View redemption history
- Pause/resume rewards

### Employee Management
- Add/remove staff
- Set permissions
- Generate PIN codes

### Analytics
- Check-in trends
- Revenue impact
- Peak hours
- Hunter demographics

### Settings
- Business hours
- Contact info
- Notification preferences

---

## Additional Agent Required?

**Option 1: Extend Reward Agent** (Recommended for MVP)
- Add venue owner endpoints to existing Reward Agent (Port 9004)
- Pros: Fewer agents, simpler architecture
- Cons: Agent becomes larger

**Option 2: New Venue Management Agent** (Recommended for Scale)
- Create dedicated Venue Management Agent (Port 9006)
- Pros: Separation of concerns, clearer responsibilities
- Cons: One more agent to manage

**Recommendation**: Start with **Option 2** - Create Venue Management Agent
- Clearer separation between hunter-facing and venue-facing features
- Easier to scale and maintain
- Better for future features (analytics, reporting, integrations)

---

## Implementation Plan

### Phase 1: Core Venue Management
✅ Capability 1: Venue registration
✅ Capability 2: Reward configuration
✅ Capability 3: Employee management

### Phase 2: Hunter Interaction
✅ Capability 4: Hunter check-in
✅ Capability 5: Reward redemption (venue side)
✅ Integration with Stats Aggregator

### Phase 3: Enhanced Features
✅ Capability 6: Item management
✅ Capability 7: Analytics dashboard
✅ Capability 8: Hunt enrollment

### Phase 4: Testing & Integration
✅ Test venue owner workflow
✅ Test employee workflow
✅ Test hunter check-in → reward redemption flow
✅ Document results

---

## Security Considerations

### Authentication
- Venue owner accounts with email/password
- Employee PIN codes for quick access
- Session management
- Role-based permissions

### Authorization
- Owners can only manage their own venues
- Employees can only access assigned venue
- Validate reward codes belong to venue
- Prevent unauthorized redemptions

### Data Privacy
- Encrypt sensitive data (PINs, emails)
- GDPR compliance for hunter data
- Secure API endpoints
- Audit logs for all actions

---

## Success Metrics

### Venue Adoption
- Number of venues registered: Target 10+
- Venues active in hunts: Target 80%+
- Employee accounts created: Target 2+ per venue

### Engagement
- Check-ins per venue: Target 40+
- Reward redemption rate: Target 60%+
- Venue satisfaction: Target 4.5/5

### Business Value
- Revenue generated per venue: Target €500+
- Net revenue after discounts: Target €450+
- Repeat participation: Target 70%+

---

## Next Steps

1. ✅ Define all capabilities (this document)
2. ⏳ Create Venue Management Agent structure
3. ⏳ Implement Capability 1: Venue registration
4. ⏳ Test venue registration
5. ⏳ Implement Capability 2: Reward configuration
6. ⏳ Test reward configuration
7. ⏳ Implement Capability 3: Employee management
8. ⏳ Test employee management
9. ⏳ Implement Capability 4: Hunter check-in
10. ⏳ Test complete workflow
11. ⏳ Document results

---

**Status**: Ready to build venue management capabilities! 🏪
