# Notification Service Agent - Requirements & Capabilities

**Agent**: Notification Service Agent
**Port**: 9005
**Purpose**: Send real-time notifications to teams during scavenger hunt gameplay

---

## Current Status
❌ **Stub implementation** - only has health check endpoint
❌ Wrong endpoints (has clue generation code instead of notifications)

---

## Priority Analysis

### Why Notification Service is Critical:
1. **Real-time engagement** - Keep teams informed during hunt
2. **Hunt flow** - Send clues, hints, updates
3. **Competition** - Alert teams when others are ahead
4. **Completion** - Notify teams of results
5. **Experience** - Enhance overall gameplay

---

## Required Capabilities

### Priority 1: Core Notification Delivery

#### Capability 1: Send Team Notification
**Purpose**: Send notification to specific team
**Triggers**: Manual, API call from other agents
**Channels**: Email, SMS, Push, WebSocket
**Data**:
- Team ID
- Notification type
- Title & message
- Priority level
- Delivery method

#### Capability 2: Broadcast to Hunt
**Purpose**: Send notification to all teams in a hunt
**Use Cases**: Hunt start, hunt end, general announcements
**Data**:
- Hunt ID
- Message
- Delivery method

#### Capability 3: Notification Templates
**Purpose**: Pre-defined notification formats
**Templates**:
- Hunt start
- Clue received
- Hint used
- Venue checked in
- Rank change
- Hunt completed
- Leaderboard update

### Priority 2: Event-Driven Notifications

#### Capability 4: Webhook Integration
**Purpose**: Receive events from other agents
**Events**:
- Team scanned venue → Send confirmation
- Hint used → Send hint text
- Rank changed → Alert team of position change
- Hunt completed → Send final results

#### Capability 5: Real-time Updates (WebSocket)
**Purpose**: Live updates to connected clients
**Use Cases**:
- Live leaderboard updates
- Real-time rank changes
- Team activity feed

### Priority 3: Notification Management

#### Capability 6: Notification History
**Purpose**: Track all sent notifications
**Data**:
- Notification ID
- Timestamp
- Recipient(s)
- Status (sent, failed, pending)
- Delivery method

#### Capability 7: Notification Preferences
**Purpose**: Team-specific notification settings
**Settings**:
- Enable/disable notification types
- Preferred delivery method
- Quiet hours
- Language preference

#### Capability 8: Retry Logic
**Purpose**: Handle failed deliveries
**Logic**:
- Retry failed notifications
- Fallback to alternative method
- Track delivery attempts

---

## Notification Types

### 1. Hunt Lifecycle Notifications

| Type | Trigger | Recipient | Priority | Content |
|------|---------|-----------|----------|---------|
| `hunt_start` | Hunt begins | All teams | HIGH | "Your hunt has started! Scan QR to get first clue." |
| `hunt_complete` | Team finishes | Team | HIGH | "Congratulations! You finished in [time] with [points] points!" |
| `hunt_ended` | Hunt time expired | All teams | HIGH | "Hunt has ended. Final results..." |

### 2. Gameplay Notifications

| Type | Trigger | Recipient | Priority | Content |
|------|---------|-----------|----------|---------|
| `clue_received` | QR scan | Team | HIGH | "Clue: [clue text]" |
| `hint_available` | Stuck for X mins | Team | MEDIUM | "Need help? Use a hint for [penalty] points" |
| `hint_sent` | Hint requested | Team | HIGH | "Hint [level]: [hint text] (-[penalty] pts)" |
| `venue_checkin` | Venue scan | Team | HIGH | "+100 points! [venue name] checked in" |
| `duplicate_scan` | Re-scan attempt | Team | LOW | "Already visited this venue" |

### 3. Competition Notifications

| Type | Trigger | Recipient | Priority | Content |
|------|---------|-----------|----------|---------|
| `rank_up` | Rank improves | Team | MEDIUM | "You moved up to rank [rank]! 🎉" |
| `rank_down` | Rank drops | Team | LOW | "Another team passed you. Current rank: [rank]" |
| `leader_change` | New leader | All teams | MEDIUM | "[Team name] is now in 1st place!" |
| `close_race` | Within 20 pts | Teams | MEDIUM | "You're only [points] behind [team]!" |

### 4. Admin Notifications

| Type | Trigger | Recipient | Priority | Content |
|------|---------|-----------|----------|---------|
| `team_stuck` | No scan for 30 min | Organizer | LOW | "Team [name] hasn't scanned in 30 minutes" |
| `hunt_progress` | Every 25% | Organizer | LOW | "[X]% of teams have completed the hunt" |
| `error_alert` | System error | Organizer | HIGH | "Error in [agent]: [message]" |

---

## Delivery Methods

### 1. WebSocket (Real-time)
- **Priority**: Highest
- **Use**: Connected clients (mobile app, web)
- **Pros**: Instant delivery, bi-directional
- **Cons**: Requires active connection

### 2. Email
- **Priority**: Medium
- **Use**: Hunt start, final results, summaries
- **Pros**: Reliable, persistent
- **Cons**: Slower delivery

### 3. SMS (Future)
- **Priority**: High
- **Use**: Critical alerts, urgent notifications
- **Pros**: High open rate
- **Cons**: Cost per message

### 4. Push Notifications (Future)
- **Priority**: High
- **Use**: Mobile app notifications
- **Pros**: Good engagement
- **Cons**: Requires app installation

---

## API Endpoints to Implement

### Core Notifications
1. `POST /send` - Send notification to team
2. `POST /broadcast` - Broadcast to all teams in hunt
3. `POST /webhook` - Receive events from other agents

### WebSocket
4. `WS /connect/:team_id` - Connect team to real-time updates
5. `WS /disconnect/:team_id` - Disconnect team

### Management
6. `GET /history/:team_id` - Get notification history
7. `GET /history/hunt/:hunt_id` - Get hunt notification history
8. `POST /preferences/:team_id` - Update notification preferences
9. `GET /preferences/:team_id` - Get notification preferences

### Admin
10. `GET /stats/:hunt_id` - Notification statistics for hunt
11. `POST /test` - Send test notification

---

## Data Models

### Notification Record
```javascript
{
  notification_id: string (UUID),
  hunt_id: string,
  team_id: string (or null for broadcast),
  type: string (enum: hunt_start, clue_received, etc.),
  title: string,
  message: string,
  priority: string (HIGH, MEDIUM, LOW),
  delivery_method: string[] (websocket, email, sms),
  status: string (pending, sent, failed),
  sent_at: timestamp,
  delivered_at: timestamp (nullable),
  error_message: string (nullable),
  metadata: object (additional data)
}
```

### Notification Preferences
```javascript
{
  team_id: string,
  hunt_id: string,
  enabled_types: string[] (list of notification types),
  preferred_method: string (websocket, email, sms),
  email: string (optional),
  phone: string (optional),
  quiet_hours: {
    enabled: boolean,
    start: string (HH:mm),
    end: string (HH:mm)
  },
  language: string (default: 'en')
}
```

### WebSocket Connection
```javascript
{
  connection_id: string,
  team_id: string,
  hunt_id: string,
  connected_at: timestamp,
  last_ping: timestamp
}
```

---

## Integration Points

### Stats Aggregator Integration
**Events to Listen For**:
- Venue scan → Send confirmation notification
- Hint used → Send hint text notification
- Rank changed → Send rank update notification
- Hunt completed → Send completion notification

**Implementation**:
```javascript
// Stats Aggregator calls Notification Service after scan
await axios.post('http://notification-agent:9005/webhook', {
  event: 'venue_checkin',
  team_id: team.id,
  hunt_id: hunt.id,
  data: {
    venue_name: venue.name,
    points_earned: 100,
    new_rank: 2,
    total_points: 200
  }
});
```

### QR Manager Integration
**Events**:
- QR scanned → Send clue or venue confirmation
- Invalid QR → Send error notification

### Clue Generator Integration
**Events**:
- Clue generated → Format and send to team
- Hint requested → Send hint with penalty notice

---

## Notification Templates

### Template: Hunt Start
```javascript
{
  type: 'hunt_start',
  title: '🎯 Hunt Started!',
  message: 'Your scavenger hunt "{hunt_name}" has started! Scan your first QR code to receive your clue. Good luck!',
  priority: 'HIGH',
  variables: ['hunt_name']
}
```

### Template: Venue Check-in
```javascript
{
  type: 'venue_checkin',
  title: '✅ Venue Checked In!',
  message: 'Congratulations! You found {venue_name}! +{points} points. Current total: {total_points} points.',
  priority: 'HIGH',
  variables: ['venue_name', 'points', 'total_points']
}
```

### Template: Rank Change
```javascript
{
  type: 'rank_up',
  title: '📈 Rank Improved!',
  message: 'Great job! You moved up to rank {rank} out of {total_teams} teams!',
  priority: 'MEDIUM',
  variables: ['rank', 'total_teams']
}
```

### Template: Hunt Complete
```javascript
{
  type: 'hunt_complete',
  title: '🏆 Hunt Complete!',
  message: 'Congratulations {team_name}! You finished in {duration} minutes with {points} points. Final rank: {rank}/{total_teams}',
  priority: 'HIGH',
  variables: ['team_name', 'duration', 'points', 'rank', 'total_teams']
}
```

---

## Implementation Plan

### Phase 1: Basic Notifications (Immediate)
✅ Capability 1: Send team notification
✅ Capability 2: Broadcast to hunt
✅ Capability 3: Notification templates
✅ Capability 4: Webhook for events

### Phase 2: Real-time (Next)
⏳ Capability 5: WebSocket connections
⏳ Live updates to clients

### Phase 3: Management (Future)
⏳ Capability 6: Notification history
⏳ Capability 7: User preferences
⏳ Capability 8: Retry logic
⏳ Email delivery integration

---

## Storage Strategy

### Redis (for real-time)
- Active WebSocket connections
- Recent notifications (last 1 hour)
- Delivery queue

### PostgreSQL (for persistence)
- Notification history
- User preferences
- Delivery statistics

---

## Technology Stack

### WebSocket: `ws` library
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9006 });
```

### Email (Future): Nodemailer
```javascript
const nodemailer = require('nodemailer');
```

### SMS (Future): Twilio
```javascript
const twilio = require('twilio');
```

---

## Success Metrics

### Performance
- Send notification in < 100ms
- WebSocket message delivery < 50ms
- Support 100+ concurrent WebSocket connections

### Reliability
- 99% delivery success rate
- Automatic retry for failed deliveries
- No duplicate notifications

### Engagement
- 90%+ notification open rate (for critical notifications)
- Real-time delivery for connected clients

---

## Testing Strategy

### Capability Testing (Incremental)
1. **Test Capability 1**: Send notification to single team
2. **Test Capability 2**: Broadcast to multiple teams
3. **Test Capability 3**: Template rendering with variables
4. **Test Capability 4**: Webhook integration with Stats Aggregator
5. **Test Capability 5**: WebSocket connection and message delivery

### Integration Testing
1. Complete hunt workflow with notifications
2. Multi-team scenario with rank changes
3. Error handling (failed delivery, disconnected clients)

---

## Example Workflows

### Workflow 1: Team Scans Venue
```
1. Team scans QR code at venue
2. QR Manager verifies code
3. Stats Aggregator records scan and updates rank
4. Stats Aggregator calls Notification Service webhook
5. Notification Service sends:
   - "Venue checked in! +100 points" to team
   - "Rank update: Now #2" to team
   - "[Team] checked in at [Venue]" to organizer
6. WebSocket pushes live update to all connected clients
```

### Workflow 2: Team Requests Hint
```
1. Team requests hint via frontend
2. Frontend calls Stats Aggregator /track-hint
3. Stats Aggregator applies penalty
4. Stats Aggregator calls Notification Service webhook
5. Notification Service sends:
   - "Hint 1: [hint text] (-15 points)" to team
6. Frontend displays hint
```

---

## Next Steps

1. ✅ Define all capabilities (this document)
2. ⏳ Implement Capability 1: Send team notification
3. ⏳ Test Capability 1 with real team data
4. ⏳ Implement Capability 2: Broadcast to hunt
5. ⏳ Test Capability 2 with multiple teams
6. ⏳ Implement Capability 3: Notification templates
7. ⏳ Test templates with variable substitution
8. ⏳ Implement Capability 4: Webhook integration
9. ⏳ Test complete workflow with Stats Aggregator
10. ⏳ Document all results
