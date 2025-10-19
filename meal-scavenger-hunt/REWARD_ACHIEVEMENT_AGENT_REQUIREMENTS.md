# Reward & Achievement Agent - Requirements

**Agent**: Reward & Achievement Agent (formerly Payment Handler)
**Port**: 9004
**Purpose**: Make the scavenger hunt MORE EXCITING with real rewards, achievements, and bonus challenges

---

## Vision

Transform the scavenger hunt from a simple game into an **engaging, rewarding experience** where:
- Teams earn **real-world discounts** at venues
- Players unlock **achievements** and **badges**
- Hunters get **bonus points** for special actions
- Venues benefit from **new customers** and **foot traffic**

---

## Core Capabilities

### Capability 1: Venue Reward System 🎁

#### Generate Team Rewards
**Purpose**: Create unique discount codes for teams at each venue

**Features**:
- Generate unique reward codes per team per venue
- Support multiple reward types:
  - Percentage discount (10% off)
  - Fixed amount (€5 off)
  - BOGO (Buy one get one)
  - Freebie (Free coffee)
- Expiration dates
- Redemption limits (use once, use multiple times)
- Active/inactive status

**Data Model**:
```javascript
{
  reward_id: "uuid",
  team_id: "team_alpha",
  venue_id: "golden_dragon",
  reward_code: "HUNT-GD-ALPHA-2025",
  reward_type: "percentage_discount",
  discount_percentage: 10,
  discount_amount: null,
  item_name: null,
  description: "10% off your entire meal at Golden Dragon",
  issued_at: "2025-10-18T14:00:00Z",
  valid_until: "2025-12-31T23:59:59Z",
  redemption_limit: 1,
  times_redeemed: 0,
  redeemed_at: null,
  status: "active"
}
```

#### Redeem Rewards
**Purpose**: Venue staff validates and marks reward as redeemed

**Flow**:
1. Hunter shows reward code to venue staff
2. Staff scans QR or enters code
3. System verifies: valid, not expired, not fully redeemed
4. System marks as redeemed
5. Confirmation sent to both hunter and venue

---

### Capability 2: Achievement System 🏆

#### Define Achievements
**Purpose**: Track special accomplishments

**Achievement Categories**:

**1. Completion Achievements**
- 🏁 "Finisher" - Complete the hunt
- ⚡ "Speed Runner" - Finish in under 2 hours
- 🎯 "Perfect Hunter" - No hints used
- 🦅 "Eagle Eye" - No duplicate scans

**2. Venue Achievements**
- 🍕 "Pizza Lover" - Visit all Italian venues
- 🥘 "World Traveler" - Visit 5 different cuisines
- 🌟 "VIP" - Visit premium venues

**3. Social Achievements**
- 📸 "Photographer" - Upload 5 photos
- 🎉 "Social Butterfly" - Share on social media
- 👥 "Team Player" - Help another team

**4. Competitive Achievements**
- 👑 "Champion" - 1st place finish
- 🥈 "Runner-Up" - 2nd place
- 💪 "Comeback Kid" - Last to top 3

**Achievement Model**:
```javascript
{
  achievement_id: "speed_runner",
  name: "Speed Runner",
  description: "Complete the hunt in under 2 hours",
  icon: "⚡",
  tier: "gold",  // bronze, silver, gold, platinum
  criteria: {
    type: "duration",
    max_duration_minutes: 120
  },
  bonus_points: 100,
  rarity: "rare"  // common, uncommon, rare, epic, legendary
}
```

**Team Achievement Record**:
```javascript
{
  team_id: "team_alpha",
  hunt_id: "hunt_denhaag_001",
  achievement_id: "speed_runner",
  unlocked_at: "2025-10-18T14:30:00Z",
  bonus_points_awarded: 100
}
```

#### Detect Achievement Unlocks
**Purpose**: Automatically award achievements based on criteria

**Detection Logic**:
- Query Stats Aggregator for team performance
- Check if criteria met
- Award achievement if unlocked
- Send notification
- Award bonus points

---

### Capability 3: Bonus Point System ⭐

#### Award Bonus Points
**Purpose**: Give extra points for special actions

**Bonus Types**:
- Photo upload at venue: +25 points
- Social media share: +25 points
- Speed bonus (first 3 teams): +50 points
- Challenge completion: +variable points
- Achievement unlock: +variable points

**Bonus Record**:
```javascript
{
  bonus_id: "uuid",
  team_id: "team_alpha",
  hunt_id: "hunt_denhaag_001",
  bonus_type: "photo_upload",
  bonus_points: 25,
  description: "Photo uploaded at Golden Dragon",
  awarded_at: "2025-10-18T14:15:00Z",
  venue_id: "golden_dragon"
}
```

---

### Capability 4: Reward Catalog 📋

#### List Available Rewards
**Purpose**: Show teams what rewards they can earn

**Endpoint**: `GET /rewards/catalog/:hunt_id`

**Response**:
```javascript
{
  hunt_id: "hunt_denhaag_001",
  venues: [
    {
      venue_id: "golden_dragon",
      venue_name: "Golden Dragon",
      reward: {
        type: "percentage_discount",
        value: 10,
        description: "10% off your meal",
        requirements: "Check in at venue"
      }
    },
    {
      venue_id: "bella_napoli",
      venue_name: "Bella Napoli",
      reward: {
        type: "freebie",
        item: "Espresso",
        description: "Free espresso with pizza purchase",
        requirements: "Check in at venue"
      }
    }
  ]
}
```

#### Get Team Rewards
**Purpose**: Show what rewards a team has earned

**Endpoint**: `GET /rewards/team/:team_id`

**Response**:
```javascript
{
  team_id: "team_alpha",
  hunt_id: "hunt_denhaag_001",
  rewards: [
    {
      reward_id: "...",
      venue_name: "Golden Dragon",
      reward_code: "HUNT-GD-ALPHA-2025",
      description: "10% off your meal",
      status: "active",
      redeemed: false,
      valid_until: "2025-12-31"
    }
  ],
  total_earned: 3,
  total_redeemed: 1
}
```

---

### Capability 5: Achievement Dashboard 🎖️

#### Get Team Achievements
**Purpose**: Show what achievements a team has unlocked

**Endpoint**: `GET /achievements/team/:team_id`

**Response**:
```javascript
{
  team_id: "team_alpha",
  hunt_id: "hunt_denhaag_001",
  achievements: [
    {
      achievement_id: "speed_runner",
      name: "Speed Runner",
      icon: "⚡",
      tier: "gold",
      unlocked_at: "2025-10-18T14:30:00Z",
      bonus_points: 100
    },
    {
      achievement_id: "finisher",
      name: "Finisher",
      icon: "🏁",
      tier: "bronze",
      unlocked_at: "2025-10-18T14:45:00Z",
      bonus_points: 50
    }
  ],
  total_unlocked: 2,
  total_possible: 15,
  completion_percentage: 13
}
```

#### Get Available Achievements
**Purpose**: Show what achievements can be earned

**Endpoint**: `GET /achievements/available/:hunt_id`

---

### Capability 6: Check Achievement Eligibility ✅

#### Auto-Check After Events
**Purpose**: Automatically check if team unlocked achievements

**Triggers**:
- After venue scan
- After hunt completion
- After bonus point award
- Periodic check (every 5 minutes)

**Logic**:
```javascript
async function checkAchievements(team_id, hunt_id) {
  // Get team stats from Stats Aggregator
  const stats = await getTeamStats(team_id, hunt_id);

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    if (!alreadyUnlocked(team_id, achievement.id)) {
      if (meetsC riteria(stats, achievement.criteria)) {
        await unlockAchievement(team_id, achievement);
        await awardBonusPoints(team_id, achievement.bonus_points);
        await sendNotification(team_id, 'achievement_unlocked', achievement);
      }
    }
  }
}
```

---

## API Endpoints

### Rewards
1. `GET /rewards/catalog/:hunt_id` - List all venue rewards
2. `GET /rewards/team/:team_id` - Get team's earned rewards
3. `POST /rewards/generate` - Generate reward for team/venue
4. `POST /rewards/redeem` - Redeem reward (venue staff)
5. `GET /rewards/verify/:reward_code` - Verify reward validity

### Achievements
6. `GET /achievements/available/:hunt_id` - List all achievements
7. `GET /achievements/team/:team_id` - Get team's achievements
8. `POST /achievements/check/:team_id` - Check for new achievements
9. `POST /achievements/unlock` - Manually unlock achievement

### Bonus Points
10. `POST /bonus/award` - Award bonus points to team
11. `GET /bonus/team/:team_id` - Get team's bonus point history

### Vouchers (Future)
12. `POST /voucher/generate` - Generate post-hunt voucher
13. `GET /voucher/:voucher_code` - Get voucher details

---

## Pre-Defined Achievements

### Tier: Bronze (Common)
| ID | Name | Icon | Criteria | Points |
|----|------|------|----------|--------|
| `finisher` | Finisher | 🏁 | Complete hunt | 50 |
| `first_venue` | First Steps | 👣 | Visit first venue | 10 |
| `social_sharer` | Social Butterfly | 📱 | Share on social media | 25 |

### Tier: Silver (Uncommon)
| ID | Name | Icon | Criteria | Points |
|----|------|------|----------|--------|
| `half_way` | Half Way There | 🎯 | Visit 50% of venues | 50 |
| `photo_fan` | Photographer | 📸 | Upload 3 photos | 50 |
| `fast_start` | Fast Starter | 🚀 | First venue in 10 min | 75 |

### Tier: Gold (Rare)
| ID | Name | Icon | Criteria | Points |
|----|------|------|----------|--------|
| `speed_runner` | Speed Runner | ⚡ | Finish in 2 hours | 100 |
| `perfect_hunter` | Perfect Hunter | 🎯 | No hints used | 150 |
| `world_traveler` | World Traveler | 🌍 | Visit 5 cuisines | 100 |

### Tier: Platinum (Epic)
| ID | Name | Icon | Criteria | Points |
|----|------|------|----------|--------|
| `champion` | Champion | 👑 | 1st place | 200 |
| `flawless` | Flawless Victory | 💎 | 1st place, no hints | 300 |
| `comeback_kid` | Comeback Kid | 💪 | Last to top 3 | 150 |

---

## Reward Types Configuration

### Venue Reward Catalog (Example)
```javascript
const VENUE_REWARDS = {
  golden_dragon: {
    venue_name: "Golden Dragon",
    reward_type: "percentage_discount",
    discount_percentage: 10,
    description: "10% off your entire meal",
    terms: "Valid for dine-in only. Cannot be combined with other offers.",
    valid_days: 30
  },
  bella_napoli: {
    venue_name: "Bella Napoli",
    reward_type: "freebie",
    item_name: "Espresso",
    description: "Free espresso with any pizza purchase",
    terms: "One per table. Valid dine-in only.",
    valid_days: 30
  },
  de_haagse_kroeg: {
    venue_name: "De Haagse Kroeg",
    reward_type: "bogo",
    item_name: "Bitterballen",
    description: "Buy one order, get one free",
    terms: "Valid for equal or lesser value.",
    valid_days: 30
  }
};
```

---

## Integration Points

### With Stats Aggregator:
- Query team performance for achievement checks
- Award bonus points (call Stats Aggregator to update points)
- Get duration, hints used, venues visited

### With Notification Service:
- Send achievement unlock notifications
- Send reward earned notifications
- Send redemption confirmations

### With QR Manager:
- Generate reward QR codes for redemption
- Venue staff scans to validate

---

## User Flows

### Flow 1: Earn Reward at Venue
```
1. Team scans venue QR code
   ↓
2. Stats Aggregator records scan
   ↓
3. Stats Aggregator calls Reward Agent webhook
   ↓
4. Reward Agent generates discount code
   ↓
5. Notification sent: "🎁 Reward unlocked! 10% off at Golden Dragon"
   ↓
6. Team shows code to venue staff
   ↓
7. Staff scans/enters code in tablet
   ↓
8. Reward Agent verifies and marks as redeemed
   ↓
9. Confirmation: "Discount applied!"
```

### Flow 2: Unlock Achievement
```
1. Team completes hunt (scans last venue)
   ↓
2. Stats Aggregator updates status
   ↓
3. Reward Agent checks achievements
   ↓
4. Criteria met: Duration < 2 hours
   ↓
5. Achievement "Speed Runner" unlocked
   ↓
6. Bonus points awarded (+100)
   ↓
7. Notification sent: "⚡ Achievement Unlocked! Speed Runner (+100 pts)"
   ↓
8. Stats Aggregator updates total points
```

### Flow 3: Redeem Reward
```
1. Team finishes meal at Golden Dragon
   ↓
2. Team shows reward code to staff
   ↓
3. Staff opens venue tablet/app
   ↓
4. Staff enters code: HUNT-GD-ALPHA-2025
   ↓
5. Reward Agent verifies:
   - Valid code ✅
   - Not expired ✅
   - Not redeemed ✅
   ↓
6. Reward Agent marks as redeemed
   ↓
7. Notification to team: "✅ Discount applied!"
   ↓
8. Staff applies 10% discount to bill
```

---

## Storage Strategy

### Redis (for active hunts)
- Active rewards (24 hour TTL)
- Recent achievements
- Bonus point awards

### PostgreSQL (for persistence)
- All reward records
- Achievement unlock history
- Redemption history
- Venue reward configurations

---

## Testing Strategy

### Unit Tests:
1. Generate reward code
2. Verify reward code
3. Redeem reward
4. Check achievement criteria
5. Unlock achievement
6. Award bonus points

### Integration Tests:
1. Complete venue scan → reward generated
2. Complete hunt → achievements checked
3. Redeem reward → Stats Aggregator updated
4. Achievement unlock → Notification sent

### End-to-End Test:
Complete hunt workflow with rewards and achievements

---

## Success Metrics

### Engagement:
- % teams earning rewards: Target 90%+
- % teams unlocking achievements: Target 80%+
- Average achievements per team: Target 3+

### Redemption:
- % rewards redeemed: Target 60%+
- Average time to redemption: Target < 7 days

### Business Value:
- Venue satisfaction: Target 4.5/5
- Hunter satisfaction: Target 4.5/5
- Repeat hunt participation: Target 40%+

---

## Implementation Plan

### Phase 1: Core Rewards (This Session)
✅ Capability 1: Generate venue rewards
✅ Capability 2: Verify and redeem rewards
✅ Capability 3: Reward catalog

### Phase 2: Achievements
✅ Capability 4: Achievement definitions
✅ Capability 5: Achievement detection
✅ Capability 6: Achievement dashboard

### Phase 3: Bonus Points
✅ Capability 7: Award bonus points
✅ Capability 8: Bonus point history

### Phase 4: Integration
✅ Stats Aggregator webhook
✅ Notification Service integration
✅ Complete workflow testing

---

## Next Steps

1. ✅ Define all capabilities (this document)
2. ⏳ Implement Capability 1: Reward generation
3. ⏳ Test reward generation
4. ⏳ Implement Capability 2: Achievement tracking
5. ⏳ Test achievement unlock
6. ⏳ Implement Capability 3: Bonus points
7. ⏳ Test complete workflow
8. ⏳ Document results

---

**Status**: Ready to build the most exciting scavenger hunt experience! 🎁🏆🎉
