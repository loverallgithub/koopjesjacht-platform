# Meal Scavenger Hunt Platform - Testing Guide

## Overview
This guide provides complete testing instructions for the Koopjesjacht Meal Scavenger Hunt platform, including user roles, workflows, API endpoints, and test credentials.

## Platform URLs

### Local Development
- **Backend API**: http://localhost:3527
- **Frontend**: http://localhost:8081
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:3493

### Agent Services
- **Clue Generator Agent**: http://localhost:9001
- **QR Manager Agent**: http://localhost:9002
- **Stats Aggregator Agent**: http://localhost:9003
- **Payment Handler Agent**: http://localhost:9004
- **Notification Service Agent**: http://localhost:9005

## Test User Credentials

All test users have the password: **TestPassword123!**

### 1. Admin User
- **Email**: admin@koopjesjacht.test
- **Username**: admin_test
- **Role**: admin
- **Purpose**: Platform administration, monitoring, and management

### 2. Organizer User
- **Email**: organizer@koopjesjacht.test
- **Username**: organizer_test
- **Role**: organizer
- **Purpose**: Create and manage scavenger hunts

### 3. Shop Owner User
- **Email**: shopowner@koopjesjacht.test
- **Username**: shopowner_test
- **Role**: shop_owner
- **Purpose**: Manage shop/venue information and participation in hunts
- **Owns Shops**:
  - De Lekkerste Pizzeria
  - Gezellig Café
  - Griekse Taverna

### 4. Shop Employee User
- **Email**: employee@koopjesjacht.test
- **Username**: employee_test
- **Role**: shop_employee
- **Purpose**: Verify QR code scans at shop locations
- **Works At**: De Lekkerste Pizzeria

### 5. Hunter Users (Participants)
- **Hunter 1 (Team Captain)**
  - Email: hunter1@koopjesjacht.test
  - Username: hunter1_test
  - Team: Food Explorers (Captain)

- **Hunter 2 (Team Member)**
  - Email: hunter2@koopjesjacht.test
  - Username: hunter2_test
  - Team: Food Explorers (Member)

- **Hunter 3-4 (Available)**
  - hunter3@koopjesjacht.test / hunter3_test
  - hunter4@koopjesjacht.test / hunter4_test
  - Can join teams or create new ones

## User Roles and Capabilities

### Admin
**Capabilities:**
- View platform-wide statistics
- Manage all users and roles
- Monitor system health
- Access all hunts and data
- Configure platform settings

**Key Workflows:**
1. View dashboard with platform metrics
2. Manage user accounts
3. Monitor payment transactions
4. Review and resolve reported issues
5. Access system logs and analytics

### Organizer
**Capabilities:**
- Create new scavenger hunts
- Define hunt routes and participating shops
- Generate clues for each location
- Manage hunt scheduling
- Monitor hunt progress
- View participant statistics

**Key Workflows:**
1. **Create a New Hunt**
   ```
   POST /api/hunts
   Body: {
     "title": "Amsterdam Food Adventure",
     "description": "Discover amazing food spots",
     "start_time": "2025-10-18T10:00:00Z",
     "end_time": "2025-10-18T16:00:00Z",
     "max_teams": 10,
     "max_team_size": 4,
     "entry_fee": 25.00,
     "difficulty_level": 3
   }
   ```

2. **Add Shops to Hunt**
   ```
   POST /api/hunts/{hunt_id}/shops
   Body: {
     "shop_id": "uuid",
     "sequence_order": 1,
     "meal_component": "Starter",
     "points_value": 100
   }
   ```

3. **Generate Clues**
   ```
   POST http://localhost:9001/generate-clue
   Body: {
     "shop_info": {
       "name": "De Lekkerste Pizzeria",
       "description": "Italian pizza restaurant"
     },
     "difficulty_level": 3,
     "language": "en"
   }
   ```

4. **Activate Hunt**
   ```
   PUT /api/hunts/{hunt_id}/status
   Body: { "status": "active" }
   ```

5. **View Hunt Analytics**
   ```
   GET http://localhost:9003/stats/{hunt_id}
   ```

### Shop Owner
**Capabilities:**
- Register and manage shops/venues
- Update shop information and menu items
- Add/remove employees
- Opt-in to participate in hunts
- View shop statistics and revenue
- Generate QR codes for their locations

**Key Workflows:**
1. **Register Shop**
   ```
   POST /api/shops
   Body: {
     "name": "My Restaurant",
     "description": "Best food in town",
     "address": "Street 123",
     "city": "Amsterdam",
     "latitude": 52.3676,
     "longitude": 4.9041
   }
   ```

2. **Add Employee**
   ```
   POST /api/shops/{shop_id}/employees
   Body: {
     "user_id": "employee_uuid",
     "role": "staff"
   }
   ```

3. **Generate QR Code for Hunt**
   ```
   POST http://localhost:9002/qr/generate
   Body: {
     "hunt_id": "hunt_uuid",
     "shop_id": "shop_uuid",
     "team_id": "team_uuid"
   }
   ```

4. **View Shop Analytics**
   ```
   GET /api/shops/{shop_id}/analytics
   ```

### Shop Employee
**Capabilities:**
- Scan and verify QR codes
- Confirm team arrivals
- Award points to teams
- View scan history for their shop

**Key Workflows:**
1. **Verify QR Code Scan**
   ```
   POST http://localhost:9002/qr/scan
   Body: {
     "action": "scan",
     "hunt_id": "hunt_uuid",
     "shop_id": "shop_uuid",
     "user_id": "employee_uuid",
     "scan_data": {
       "qr_code": "QR_CODE_STRING",
       "location": {
         "latitude": 52.3676,
         "longitude": 4.9041
       },
       "timestamp": "2025-10-18T12:00:00Z"
     }
   }
   ```

2. **View Today's Scans**
   ```
   GET /api/shops/{shop_id}/scans?date=today
   ```

### Hunter (Participant)
**Capabilities:**
- Join or create teams
- View active hunts
- Access clues and hints
- Scan QR codes at locations
- Track progress and points
- View leaderboard
- Process payments

**Key Workflows:**
1. **View Available Hunts**
   ```
   GET /api/hunts?status=active
   ```

2. **Create Team**
   ```
   POST /api/teams
   Body: {
     "hunt_id": "hunt_uuid",
     "name": "Food Explorers",
     "max_members": 4
   }
   ```

3. **Join Team with Invite Code**
   ```
   POST /api/teams/join
   Body: {
     "invite_code": "FOOD2024"
   }
   ```

4. **View Current Clue**
   ```
   GET /api/teams/{team_id}/current-clue
   ```

5. **Request Hint** (costs points)
   ```
   POST /api/teams/{team_id}/hints
   Body: {
     "hunt_shop_id": "hunt_shop_uuid"
   }
   ```

6. **Scan QR Code at Location**
   ```
   POST http://localhost:9002/qr/scan
   Body: {
     "action": "scan",
     "hunt_id": "hunt_uuid",
     "shop_id": "shop_uuid",
     "user_id": "hunter_uuid",
     "scan_data": {
       "qr_code": "SCANNED_QR_CODE",
       "location": {
         "latitude": 52.3676,
         "longitude": 4.9041
       }
     }
   }
   ```

7. **View Leaderboard**
   ```
   GET http://localhost:9003/leaderboard/{hunt_id}
   ```

8. **Process Entry Fee Payment**
   ```
   POST http://localhost:9004/payments/process
   Body: {
     "action": "charge",
     "payment_data": {
       "amount": 25.00,
       "currency": "EUR",
       "method": "ideal",
       "user_id": "hunter_uuid",
       "entity_type": "hunt",
       "entity_id": "hunt_uuid"
     },
     "gateway_preference": "auto"
   }
   ```

## Complete End-to-End Test Scenarios

### Scenario 1: Creating and Running a Hunt

**As Organizer:**
1. Login as organizer_test
2. Create a new hunt with 3 shops
3. Generate clues for each shop using Clue Generator Agent
4. Set hunt schedule and activate

**As Hunter (Team Captain):**
5. Login as hunter1_test
6. Browse available hunts
7. Create a team "Food Explorers"
8. Invite hunter2_test using invite code
9. Process payment for entry fee
10. View first clue

**As Hunter (Team Member):**
11. Login as hunter2_test
12. Join team using invite code
13. View team progress

**As Team (At Location 1):**
14. Navigate to "De Lekkerste Pizzeria"
15. Scan QR code at location
16. Receive points and next clue

**As Shop Employee:**
17. Login as employee_test
18. Verify the scan
19. Confirm team arrival

**Continue for remaining locations...**

20. Complete all locations
21. View final leaderboard
22. Check statistics

### Scenario 2: Shop Management

**As Shop Owner:**
1. Login as shopowner_test
2. Update shop information
3. Add menu items and fun facts
4. Add employee_test as staff member
5. Opt-in to participate in upcoming hunts
6. Generate QR codes for active hunt
7. View shop analytics and revenue

### Scenario 3: Admin Monitoring

**As Admin:**
1. Login as admin_test
2. View platform dashboard
3. Monitor active hunts
4. Review payment transactions
5. Check system health
6. View user activity logs

## API Endpoints Reference

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Hunts
```
GET    /api/hunts
POST   /api/hunts
GET    /api/hunts/{id}
PUT    /api/hunts/{id}
DELETE /api/hunts/{id}
GET    /api/hunts/{id}/teams
GET    /api/hunts/{id}/leaderboard
```

### Teams
```
GET    /api/teams
POST   /api/teams
GET    /api/teams/{id}
PUT    /api/teams/{id}
POST   /api/teams/join
POST   /api/teams/{id}/leave
GET    /api/teams/{id}/progress
```

### Shops
```
GET    /api/shops
POST   /api/shops
GET    /api/shops/{id}
PUT    /api/shops/{id}
DELETE /api/shops/{id}
POST   /api/shops/{id}/employees
GET    /api/shops/{id}/analytics
```

### Scans
```
POST   /api/scans
GET    /api/scans/{id}
GET    /api/scans/team/{team_id}
```

### Payments
```
POST   /api/payments/process
GET    /api/payments/{id}
GET    /api/payments/user/{user_id}
POST   /api/payments/refund
```

## Agent Service Endpoints

### Clue Generator Agent (Port 9001)
```
POST   /generate-clue
POST   /regenerate-hint
GET    /health
```

### QR Manager Agent (Port 9002)
```
POST   /qr/generate
POST   /qr/scan
GET    /qr/validate
GET    /health
```

### Stats Aggregator Agent (Port 9003)
```
GET    /stats/{huntId}
GET    /stats/platform
GET    /leaderboard/{huntId}
GET    /insights/{huntId}
GET    /health
```

### Payment Handler Agent (Port 9004)
```
POST   /payments/process
POST   /payments/refund
GET    /payments/status/{id}
POST   /webhooks/{gateway}
GET    /health
```

### Notification Service Agent (Port 9005)
```
POST   /notifications/send
POST   /notifications/schedule
DELETE /notifications/cancel/{id}
GET    /notifications/preferences/{userId}
PUT    /notifications/preferences/{userId}
GET    /notifications/history/{userId}
GET    /health
```

## Testing Health Checks

Test all services are running:

```bash
# Database
docker exec scavenger_postgres pg_isready -U scavenger

# Redis
docker exec scavenger_redis redis-cli ping

# Backend (if running)
curl http://localhost:3527/health

# Agents
curl http://localhost:9001/health  # Clue Generator
curl http://localhost:9002/health  # QR Manager
curl http://localhost:9003/health  # Stats Aggregator
curl http://localhost:9004/health  # Payment Handler
curl http://localhost:9005/health  # Notification Service
```

## Database Direct Access

For testing and debugging:

```bash
# Connect to PostgreSQL
docker exec -it scavenger_postgres psql -U scavenger -d scavenger_hunt

# Common queries
SELECT * FROM users WHERE role = 'hunter';
SELECT * FROM hunts WHERE status = 'active';
SELECT * FROM teams WHERE hunt_id = 'your_hunt_id';
SELECT * FROM scans ORDER BY created_at DESC LIMIT 10;
SELECT * FROM leaderboard WHERE hunt_id = 'your_hunt_id';
```

## Test Data Setup

1. **Initialize Database Schema**
   ```bash
   # Schema is automatically created by init.sql on container startup
   docker-compose up -d postgres
   ```

2. **Load Test Users**
   ```bash
   docker exec -i scavenger_postgres psql -U scavenger -d scavenger_hunt < database/test_users.sql
   ```

3. **Verify Data**
   ```bash
   docker exec -it scavenger_postgres psql -U scavenger -d scavenger_hunt -c "SELECT email, role FROM users;"
   ```

## Troubleshooting

### Services Not Starting
```bash
# Check logs
docker-compose logs backend
docker-compose logs clue-agent

# Restart services
docker-compose restart

# Full reset
docker-compose down -v
docker-compose up -d
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker volume rm meal-scavenger-hunt_postgres_data
docker-compose up -d postgres
```

### Agent Not Responding
```bash
# Check agent health
curl -v http://localhost:9001/health

# Check agent logs
docker logs scavenger_clue_agent

# Restart agent
docker-compose restart clue-agent
```

## Performance Testing

### Load Testing with Apache Bench
```bash
# Test backend health endpoint
ab -n 1000 -c 10 http://localhost:3527/health

# Test agent endpoints
ab -n 100 -c 5 http://localhost:9001/health
```

### Database Performance
```bash
# Check slow queries
docker exec scavenger_postgres psql -U scavenger -d scavenger_hunt -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Security Testing

### Test Authentication
```bash
# Attempt to access protected endpoint without token
curl -X GET http://localhost:3527/api/hunts

# Login and get token
curl -X POST http://localhost:3527/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hunter1@koopjesjacht.test","password":"TestPassword123!"}'

# Use token to access protected endpoint
curl -X GET http://localhost:3527/api/hunts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Role-Based Access
```bash
# Attempt admin action as hunter (should fail)
curl -X GET http://localhost:3527/api/admin/users \
  -H "Authorization: Bearer HUNTER_JWT_TOKEN"

# Same action as admin (should succeed)
curl -X GET http://localhost:3527/api/admin/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Next Steps

1. **Backend Implementation**: Complete the backend utilities (logger, error handlers) to fully run the backend service
2. **Frontend Build**: Complete the frontend build and deployment
3. **Integration Testing**: Run full end-to-end integration tests
4. **SmythOS Deployment**: Deploy agents to SmythOS Cloud for production
5. **Production Deployment**: Deploy to Hostinger VPS with SSL certificates

## Support

For issues or questions:
- GitHub: https://github.com/loverallgithub/Koopjesjacht
- Platform Documentation: /docs
- API Documentation: http://localhost:3527/api-docs (when backend is running)
