# Koopjesjacht - Quick Reference Card

## 🔗 Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Nginx Web** | http://72.60.169.105:8080 | ✅ Running |
| **Nginx HTTPS** | http://72.60.169.105:8443 | ✅ Running |
| **PostgreSQL** | 72.60.169.105:5432 | ✅ Healthy |
| **Redis** | 72.60.169.105:6379 | ✅ Healthy |
| **Domain** | http://pimlicoservices.cloud | Configure DNS |

## 🔐 Credentials

### Database
```
Host: 72.60.169.105
Port: 5432
User: scavenger
Pass: KoopjesjachtSecure2025!
DB:   scavenger_hunt
```

### VPS SSH
```bash
ssh root@72.60.169.105
```

## 🚀 Quick Deploy Commands

### Option 1: SSH Manual Deploy (Fastest)
```bash
ssh root@72.60.169.105
cd /docker/koopjesjacht-platform
git clone https://github.com/loverallgithub/Koopjesjacht.git app
cd app
cp .env.production .env
docker-compose up -d --build
```

### Check Status
```bash
# Container status
docker ps

# View logs
docker-compose logs -f

# Restart all
docker-compose restart
```

## 📊 Hostinger API

### Authentication
```bash
TOKEN="2CcZ3nVYGscNSs4lry1z1ODVeZfPiwLExx4I1RP000bcfff9"
VPS_ID="1048933"
```

### Useful Commands
```bash
# List containers
curl -H "Authorization: Bearer $TOKEN" \
  https://developers.hostinger.com/api/vps/v1/virtual-machines/$VPS_ID/docker/koopjesjacht-platform/containers

# View logs
curl -H "Authorization: Bearer $TOKEN" \
  https://developers.hostinger.com/api/vps/v1/virtual-machines/$VPS_ID/docker/koopjesjacht-platform/logs

# Restart project
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://developers.hostinger.com/api/vps/v1/virtual-machines/$VPS_ID/docker/koopjesjacht-platform/restart
```

## 🎯 Expected Services (After Full Deploy)

| Port | Service | Purpose |
|------|---------|---------|
| 5432 | PostgreSQL | Database |
| 6379 | Redis | Cache |
| 8080 | Nginx | Web Server |
| 8081 | Frontend | React App |
| 9000 | API Gateway | Main API |
| 9001 | Clue Agent | Generate clues |
| 9002 | QR Agent | QR codes |
| 9003 | Stats Agent | Analytics |
| 9004 | Payment Agent | Payments |
| 9005 | Notification Agent | Notifications |
| 9006-9023 | 15+ More Agents | Various services |

## 🔍 Troubleshooting

### Check if service is responding
```bash
curl http://72.60.169.105:8080
curl http://72.60.169.105:9000/health
```

### View container logs
```bash
ssh root@72.60.169.105
docker logs scavenger_postgres
docker logs scavenger_redis
docker logs scavenger_nginx
```

### Restart a specific container
```bash
docker restart scavenger_postgres
```

### Check disk space
```bash
ssh root@72.60.169.105
df -h
```

### Check memory usage
```bash
docker stats --no-stream
```

## 📁 Important Files

| File | Location |
|------|----------|
| This Guide | `DEPLOYMENT_GUIDE.md` |
| Quick Reference | `QUICK_REFERENCE.md` |
| Success Report | `deployment-success-report.md` |
| Troubleshooting | `hostinger-deployment-report.md` |
| Compose File | `docker-compose.yml` |
| Env Template | `.env.production` |

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify containers: `docker ps -a`
3. Test connectivity: `curl http://72.60.169.105:8080`
4. Review documentation: `DEPLOYMENT_GUIDE.md`

---

**Quick Test:** `curl http://72.60.169.105:8080` should return nginx welcome page ✅
