# 🚀 START HERE - Koopjesjacht Platform Testing

## Quick Start (30 seconds)

```bash
cd meal-scavenger-hunt
docker-compose up -d
```

## ✅ Verify Services Running

```bash
# Check all agents (should all return "healthy")
curl http://localhost:9001/health  # Clue Generator
curl http://localhost:9002/health  # QR Manager
curl http://localhost:9003/health  # Stats Aggregator
curl http://localhost:9004/health  # Payment Handler
curl http://localhost:9005/health  # Notification Service
```

## 👥 Test Users (Password: `TestPassword123!`)

| Email | Role | What to Test |
|-------|------|--------------|
| admin@koopjesjacht.test | Admin | Platform management |
| organizer@koopjesjacht.test | Organizer | Create hunts, generate clues |
| shopowner@koopjesjacht.test | Shop Owner | Manage shops, QR codes |
| employee@koopjesjacht.test | Employee | Verify scans |
| hunter1@koopjesjacht.test | Hunter | Play hunt, scan QR codes |
| hunter2@koopjesjacht.test | Hunter | Join team, participate |

## 🎯 Test Each Agent (5 minutes each)

### 1. Clue Generator (Port 9001)
```bash
curl -X POST http://localhost:9001/generate-clue \
  -H "Content-Type: application/json" \
  -d '{
    "shop_info": {"name": "Pizza Place", "description": "Italian restaurant"},
    "difficulty_level": 3,
    "language": "en"
  }'
```

### 2. QR Manager (Port 9002)
```bash
# Generate QR code
curl -X POST http://localhost:9002/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "hunt_id": "20000000-0000-0000-0000-000000000001",
    "shop_id": "10000000-0000-0000-0000-000000000001",
    "user_id": "00000000-0000-0000-0000-000000000003"
  }'
```

### 3. Stats Aggregator (Port 9003)
```bash
# Get leaderboard
curl http://localhost:9003/leaderboard/20000000-0000-0000-0000-000000000001
```

### 4. Payment Handler (Port 9004)
```bash
# Process test payment
curl -X POST http://localhost:9004/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "action": "charge",
    "payment_data": {
      "amount": 25.00,
      "currency": "EUR",
      "method": "ideal",
      "user_id": "00000000-0000-0000-0000-000000000005",
      "entity_type": "hunt",
      "entity_id": "20000000-0000-0000-0000-000000000001"
    }
  }'
```

### 5. Notification Service (Port 9005)
```bash
# Send test notification
curl -X POST http://localhost:9005/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "notification_data": {
      "recipient_email": "test@example.com",
      "channel": "email",
      "template": "hunt_start"
    },
    "notification_type": "hunt_start"
  }'
```

## 📊 Pre-loaded Test Data

- **Hunt**: "Amsterdam Food Adventure" (ID: 20000000-0000-0000-0000-000000000001)
- **Team**: "Food Explorers" with invite code: `FOOD2024`
- **Shops**: 3 Amsterdam restaurants ready
- **Users**: 8 test users across all roles

## 🎮 Complete User Flow Test (15 minutes)

1. **As Organizer** - Generate clues for shops (Port 9001)
2. **As Shop Owner** - Generate QR codes (Port 9002)
3. **As Hunter** - Process payment (Port 9004)
4. **As Hunter** - Scan QR code (Port 9002)
5. **As Employee** - Verify scan (Port 9002)
6. **As Hunter** - Check leaderboard (Port 9003)
7. **As Admin** - View statistics (Port 9003)

## 📚 Full Documentation

- **TESTING_GUIDE.md** - Complete testing instructions
- **DEPLOYMENT_SUMMARY.md** - Platform status and URLs
- **QUICK_TEST_REFERENCE.md** - Quick reference
- **README.md** - Project overview

## 🔍 Troubleshooting

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f clue-agent

# Restart everything
docker-compose restart

# Full reset
docker-compose down -v && docker-compose up -d
```

## 🌐 Important URLs

- **GitHub**: https://github.com/loverallgithub/Koopjesjacht
- **SmythOS Docs**: https://smythos.com/docs
- **Local Backend**: http://localhost:3527 (when fixed)
- **Local Frontend**: http://localhost:8081 (when built)

## ✨ Next Steps

1. Test all 5 agents ✅
2. Complete backend utilities ⏳
3. Finish frontend build ⏳
4. Deploy to SmythOS Cloud
5. Deploy to production

---

**Status**: 🟢 All agents operational and ready for testing
**Password**: TestPassword123! (all users)
**Team Invite**: FOOD2024
