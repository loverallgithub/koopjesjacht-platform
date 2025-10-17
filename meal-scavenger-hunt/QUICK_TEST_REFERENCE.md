# Quick Test Reference - Koopjesjacht Platform

## 🚀 Quick Start

```bash
# Start all services
cd meal-scavenger-hunt
docker-compose up -d postgres redis backend clue-agent qr-agent stats-agent payment-agent notification-agent

# Check service health
curl http://localhost:9001/health  # Clue Generator
curl http://localhost:9002/health  # QR Manager
curl http://localhost:9003/health  # Stats Aggregator
curl http://localhost:9004/health  # Payment Handler
curl http://localhost:9005/health  # Notification Service
```

## 🔑 Test User Credentials

**Password for ALL users**: `TestPassword123!`

| Role | Email | Username |Purpose |
|------|-------|----------|---------|
| Admin | admin@koopjesjacht.test | admin_test | Platform administration |
| Organizer | organizer@koopjesjacht.test | organizer_test | Create hunts |
| Shop Owner | shopowner@koopjesjacht.test | shopowner_test | Manage shops |
| Shop Employee | employee@koopjesjacht.test | employee_test | Verify QR scans |
| Hunter 1 (Captain) | hunter1@koopjesjacht.test | hunter1_test | Participate in hunts |
| Hunter 2 (Member) | hunter2@koopjesjacht.test | hunter2_test | Participate in hunts |
| Hunter 3 | hunter3@koopjesjacht.test | hunter3_test | Available |
| Hunter 4 | hunter4@koopjesjacht.test | hunter4_test | Available |

## 🌐 Service URLs

### Main Services
- **Backend API**: http://localhost:3527
- **Frontend**: http://localhost:8081 (when built)
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:3493

### Agent Services
- **Clue Generator**: http://localhost:9001
- **QR Manager**: http://localhost:9002
- **Stats Aggregator**: http://localhost:9003
- **Payment Handler**: http://localhost:9004
- **Notification Service**: http://localhost:9005

## 📊 Test Data

### Pre-configured Test Hunt
- **Hunt ID**: `20000000-0000-0000-0000-000000000001`
- **Name**: Amsterdam Food Adventure
- **Status**: Active
- **Shops**: 3 locations
- **Test Team**: Food Explorers (invite code: `FOOD2024`)

### Test Shops
1. **De Lekkerste Pizzeria** - Italian pizza
2. **Gezellig Café** - Coffee and pastries
3. **Griekse Taverna** - Greek cuisine

## 🧪 Quick Test Commands

### Test Agent Health
```bash
# All agents at once
for port in 9001 9002 9003 9004 9005; do
  echo "Testing port $port:"
  curl -s http://localhost:$port/health | jq
done
```

### Generate a Clue
```bash
curl -X POST http://localhost:9001/generate-clue \
  -H "Content-Type: application/json" \
  -d '{
    "shop_info": {
      "name": "Test Restaurant",
      "description": "Amazing food"
    },
    "difficulty_level": 3,
    "language": "en"
  }'
```

### Generate QR Code
```bash
curl -X POST http://localhost:9002/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "hunt_id": "20000000-0000-0000-0000-000000000001",
    "shop_id": "10000000-0000-0000-0000-000000000001",
    "user_id": "00000000-0000-0000-0000-000000000005"
  }'
```

### Get Hunt Statistics
```bash
curl http://localhost:9003/stats/20000000-0000-0000-0000-000000000001
```

### Get Leaderboard
```bash
curl http://localhost:9003/leaderboard/20000000-0000-0000-0000-000000000001
```

## 🔍 Database Queries

```bash
# Connect to database
docker exec -it scavenger_postgres psql -U scavenger -d scavenger_hunt
```

```sql
-- View all users
SELECT email, role, first_name, last_name FROM users;

-- View active hunts
SELECT id, title, status, start_time, end_time FROM hunts WHERE status = 'active';

-- View teams and members
SELECT t.name, u.first_name, u.last_name, tm.role
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id;

-- View leaderboard
SELECT * FROM leaderboard;

-- View recent scans
SELECT s.*, u.first_name, sh.name as shop_name
FROM scans s
JOIN users u ON s.scanned_by = u.id
JOIN shops sh ON s.shop_id = sh.id
ORDER BY s.created_at DESC
LIMIT 10;
```

## 📝 Common Workflows

### 1. Test as Hunter (Participant)
```bash
# 1. View available hunts
curl http://localhost:3527/api/hunts?status=active

# 2. Join team with invite code
curl -X POST http://localhost:3527/api/teams/join \
  -H "Content-Type: application/json" \
  -d '{"invite_code": "FOOD2024"}'

# 3. Get current clue
curl http://localhost:3527/api/teams/40000000-0000-0000-0000-000000000001/current-clue

# 4. Scan QR code
curl -X POST http://localhost:9002/qr/scan \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scan",
    "hunt_id": "20000000-0000-0000-0000-000000000001",
    "shop_id": "10000000-0000-0000-0000-000000000001",
    "user_id": "00000000-0000-0000-0000-000000000005",
    "scan_data": {
      "qr_code": "TEST_QR_CODE",
      "location": {"latitude": 52.3676, "longitude": 4.9041}
    }
  }'

# 5. Check leaderboard
curl http://localhost:9003/leaderboard/20000000-0000-0000-0000-000000000001
```

### 2. Test as Organizer
```bash
# 1. Create new hunt
curl -X POST http://localhost:3527/api/hunts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Adventure",
    "description": "Fun scavenger hunt",
    "start_time": "2025-10-19T10:00:00Z",
    "end_time": "2025-10-19T18:00:00Z",
    "max_teams": 10,
    "max_team_size": 4,
    "entry_fee": 20.00
  }'

# 2. Generate clues for shops
curl -X POST http://localhost:9001/generate-clue \
  -H "Content-Type: application/json" \
  -d '{
    "shop_info": {"name": "Amazing Restaurant"},
    "difficulty_level": 3
  }'

# 3. View hunt stats
curl http://localhost:9003/stats/{hunt_id}
```

### 3. Test as Shop Owner
```bash
# 1. Register new shop
curl -X POST http://localhost:3527/api/shops \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Restaurant",
    "address": "Street 123",
    "city": "Amsterdam",
    "latitude": 52.3676,
    "longitude": 4.9041
  }'

# 2. Generate QR codes
curl -X POST http://localhost:9002/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "hunt_id": "{hunt_id}",
    "shop_id": "{shop_id}",
    "user_id": "{owner_id}"
  }'

# 3. View shop analytics
curl http://localhost:3527/api/shops/{shop_id}/analytics
```

## 🐛 Troubleshooting

### Services not responding?
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f clue-agent

# Restart service
docker-compose restart clue-agent
```

### Database issues?
```bash
# Check database is ready
docker exec scavenger_postgres pg_isready -U scavenger

# Load test data
docker exec -i scavenger_postgres psql -U scavenger -d scavenger_hunt < database/test_users.sql
```

### Port conflicts?
```bash
# Check what's using the port
lsof -i :9001

# Kill process if needed
kill -9 $(lsof -t -i:9001)
```

## 📚 Full Documentation

For complete documentation, see:
- **TESTING_GUIDE.md** - Complete testing guide with all workflows
- **API_KEYS_GUIDE.md** - How to obtain all API keys
- **COMPLETE_DEPLOYMENT_GUIDE.md** - Full deployment instructions
- **README.md** - Project overview

## 🔐 Security Notes

- Test users have simple passwords for development only
- Never use these credentials in production
- Change all default passwords before deploying
- Ensure JWT_SECRET is set to a secure value
- Use environment variables for all sensitive data

## ✅ Pre-flight Checklist

Before testing:
- [ ] Docker and Docker Compose installed
- [ ] Ports 3527, 5432, 3493, 9001-9005 available
- [ ] `.env` file configured (or using defaults)
- [ ] Database initialized with schema
- [ ] Test users loaded (optional)
- [ ] All services running and healthy

## 🎯 Human-in-the-Loop Testing

### For Manual Testing by User Type:

**As Admin**:
1. Access platform metrics
2. Monitor all active hunts
3. View payment transactions
4. Check system health across all agents

**As Organizer**:
1. Create a new hunt from scratch
2. Select 3-5 shops to participate
3. Generate clues using the Clue Generator Agent
4. Activate the hunt
5. Monitor participant progress in real-time

**As Shop Owner**:
1. Register your shop
2. Update shop details and menu
3. Add employees
4. Join active hunts
5. Generate QR codes for your location

**As Shop Employee**:
1. Login to scan verification interface
2. Wait for teams to arrive
3. Verify QR code scans
4. Confirm points awarded

**As Hunter (Team Captain)**:
1. Browse available hunts
2. Create a new team
3. Share invite code with teammates
4. Pay entry fee
5. Start the hunt and view first clue
6. Navigate to location
7. Scan QR code
8. View updated leaderboard

**As Hunter (Team Member)**:
1. Join team using invite code
2. View team progress
3. Help solve clues
4. Scan QR codes at locations

## 📊 Success Metrics

After testing, verify:
- ✅ All 5 agents responding to health checks
- ✅ Database contains test users and hunt data
- ✅ QR codes can be generated successfully
- ✅ Clues are generated with appropriate difficulty
- ✅ Statistics and leaderboards update correctly
- ✅ Payments can be processed (test mode)
- ✅ Notifications would be sent (if configured)

## 🚀 Next Steps

1. **Complete Backend**: Fix missing utilities and fully run backend API
2. **Build Frontend**: Complete React frontend build
3. **Integration Tests**: Run full end-to-end automated tests
4. **Deploy to SmythOS**: Deploy agents to cloud
5. **Production Deployment**: Deploy to Hostinger with SSL

---

**Repository**: https://github.com/loverallgithub/Koopjesjacht
**Documentation**: See TESTING_GUIDE.md for comprehensive testing instructions
