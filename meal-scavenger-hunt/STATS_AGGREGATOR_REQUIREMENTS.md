# Stats Aggregator Agent - Requirements & Capabilities

**Agent**: Stats Aggregator Agent
**Port**: 9003
**Purpose**: Track, aggregate, and analyze scavenger hunt gameplay statistics

---

## Current Status
❌ **Stub implementation** - only has health check endpoint
❌ Wrong endpoints (has clue generation code instead of stats)

---

## Required Capabilities

### Priority 1: Core Statistics Tracking

#### 1.1 Team Performance Tracking
- Track team scores in real-time
- Record venue visits (QR scans)
- Track hint usage and penalties
- Calculate total points per team
- Track completion time

#### 1.2 Hunt Progress Tracking
- Active hunts and their status
- Teams participating in each hunt
- Venues visited vs. total venues
- Current team rankings
- Hunt completion percentage

#### 1.3 Venue Statistics
- How many teams visited each venue
- Average time to find each venue
- Hint usage per venue (which clues are hardest)
- QR scan counts per venue

### Priority 2: Real-time Leaderboard

#### 2.1 Live Rankings
- Current standings by points
- Time-based rankings (fastest teams)
- Completion status
- Last update timestamp

#### 2.2 Leaderboard Queries
- Get top N teams
- Get specific team rank
- Get teams by hunt_id
- Filter by completion status

### Priority 3: Analytics & Insights

#### 3.1 Hunt Analytics
- Average completion time
- Difficulty distribution effectiveness
- Most/least visited venues
- Peak activity times

#### 3.2 Team Analytics
- Team performance over time
- Hint dependency (teams using most hints)
- Speed vs accuracy (fast completion vs high score)

---

## API Endpoints to Implement

### Core Tracking
1. `POST /track-scan` - Record QR scan (venue visit)
2. `POST /track-hint` - Record hint usage
3. `POST /track-completion` - Record hunt completion

### Statistics Retrieval
4. `GET /team/:team_id/stats` - Get team statistics
5. `GET /hunt/:hunt_id/stats` - Get hunt-wide statistics
6. `GET /venue/:venue_id/stats` - Get venue-specific stats

### Leaderboard
7. `GET /leaderboard/:hunt_id` - Get hunt leaderboard
8. `GET /leaderboard/:hunt_id/team/:team_id` - Get team's rank

### Analytics
9. `GET /analytics/hunt/:hunt_id` - Get hunt analytics
10. `GET /analytics/venue/:venue_id` - Get venue analytics

---

## Data Models

### Team Stats
```javascript
{
  team_id: string,
  hunt_id: string,
  team_name: string,
  total_points: number,
  venues_visited: number,
  total_venues: number,
  hints_used: number,
  hint_penalty: number,
  start_time: timestamp,
  completion_time: timestamp (null if not complete),
  duration_minutes: number (null if not complete),
  status: 'active' | 'completed',
  last_scan_time: timestamp
}
```

### Venue Visit Record
```javascript
{
  visit_id: string,
  team_id: string,
  hunt_id: string,
  venue_id: string,
  venue_name: string,
  scan_time: timestamp,
  time_to_find: number (minutes since clue received),
  hints_used_for_venue: number,
  points_earned: number,
  qr_code: string
}
```

### Hint Usage Record
```javascript
{
  hint_id: string,
  team_id: string,
  hunt_id: string,
  venue_id: string,
  hint_level: number (1, 2, or 3),
  penalty_points: number,
  used_at: timestamp
}
```

---

## Integration Points

### With QR Manager Agent
- Receive scan events when teams scan venue QR codes
- Receive hint usage events
- Verify team_id and hunt_id

### With Clue Generator Agent
- Get venue difficulty levels for points calculation
- Reference clue IDs for tracking

### With Notification Service (Future)
- Send notifications when team reaches milestones
- Alert when new team takes the lead

---

## Storage Strategy

### Redis (for real-time data)
- Current team scores
- Live leaderboard cache
- Active hunt sessions
- Recent scan events

### PostgreSQL (for persistent data)
- All historical scan records
- Complete team statistics
- Hunt history
- Analytics data

---

## Implementation Plan

### Phase 1: Basic Tracking (Immediate)
✅ Implement team statistics tracking
✅ Record venue scans
✅ Record hint usage
✅ Calculate points

### Phase 2: Leaderboard (Next)
✅ Implement leaderboard endpoints
✅ Real-time rank calculation
✅ Redis caching for speed

### Phase 3: Analytics (Future)
⏳ Aggregate hunt-wide statistics
⏳ Venue difficulty analysis
⏳ Team performance insights

---

## Success Metrics

### Performance
- Track scan event in < 50ms
- Leaderboard retrieval in < 100ms
- Support 100+ concurrent teams

### Accuracy
- Point calculations match business rules
- No duplicate scan counting (unless allowed)
- Accurate time tracking

### Scalability
- Handle multiple hunts simultaneously
- Support hunts with 50+ venues
- Store unlimited historical data

---

## Testing Strategy

1. **Unit Tests**: Test each capability independently
2. **Integration Tests**: Test with QR Manager
3. **Load Tests**: Simulate multiple teams scanning
4. **End-to-End**: Complete hunt workflow with stats

---

## Next Steps

1. ✅ Define capabilities (this document)
2. ⏳ Implement Phase 1: Basic tracking
3. ⏳ Test integration with QR Manager
4. ⏳ Implement Phase 2: Leaderboard
5. ⏳ Test complete workflow
6. ⏳ Document results
