# Koopjesjacht Platform - Complete Deployment Guide

**Last Updated:** October 19, 2025
**Current Status:** Infrastructure deployed, application deployment pending

---

## 📍 Current Deployment Status

### ✅ What's Already Deployed

**Infrastructure Services (Running on Hostinger VPS)**

| Service | Container | Status | Access |
|---------|-----------|--------|--------|
| PostgreSQL 15 | scavenger_postgres | ✅ Running (healthy) | 72.60.169.105:5432 |
| Redis 7 | scavenger_redis | ✅ Running (healthy) | 72.60.169.105:6379 |
| Nginx | scavenger_nginx | ✅ Running | 72.60.169.105:8080 |

**VPS Details:**
- **IP:** 72.60.169.105
- **Hostname:** pimlicoservices.cloud
- **Resources:** 4 CPUs, 16 GB RAM, 200 GB SSD
- **OS:** Ubuntu 24.04 with Docker
- **Project:** koopjesjacht-platform

**Database Credentials:**
```
Username: scavenger
Password: KoopjesjachtSecure2025!
Database: scavenger_hunt
```

### ⏳ What's Pending

**Application Services (Not Yet Deployed)**

These 20 services are defined in docker-compose.yml but not yet running:

1. API Gateway (port 9000)
2. Clue Generator Agent (port 9001)
3. QR Manager Agent (port 9002)
4. Stats Aggregator (port 9003)
5. Payment Handler (port 9004)
6. Notification Service (port 9005)
7. Venue Management (port 9006)
8. Media Upload Agent (port 9007)
9. Venue Onboarding (port 9008)
10. Venue CRM (port 9009)
11. Hunter Onboarding (port 9012)
12. Social Growth Agent (port 9013)
13. Retention Agent (port 9014)
14. Fraud Detection (port 9015)
15. Email Marketing (port 9016)
16. Referral Program (port 9017)
17. Support Agent (port 9020)
18. BI Analytics (port 9022)
19. Advanced Analytics (port 9023)
20. React Frontend (port 8081)

---

## 🚀 Complete Application Deployment Options

### Option 1: SSH Manual Deployment (Recommended)

**Pros:**
- Most control and flexibility
- Can troubleshoot issues directly
- Keeps repository private
- Works immediately

**Steps:**

1. **SSH into VPS**
   ```bash
   ssh root@72.60.169.105
   ```

2. **Navigate to Docker directory**
   ```bash
   cd /docker/koopjesjacht-platform
   ```

3. **Clone your repository**
   ```bash
   git clone https://github.com/loverallgithub/Koopjesjacht.git app
   cd app
   ```

   When prompted, enter your GitHub credentials.

4. **Copy environment file**
   ```bash
   cp .env.production .env
   ```

5. **Build and start all services**
   ```bash
   docker-compose up -d --build
   ```

6. **Monitor deployment**
   ```bash
   docker-compose logs -f
   ```

7. **Verify all services**
   ```bash
   docker-compose ps
   ```

---

### Option 2: Docker Hub Pre-built Images

**Pros:**
- No repository access needed
- Faster deployments
- Professional CI/CD approach
- Repository stays private

**Steps:**

1. **Build images locally**
   ```bash
   cd /Users/lynnoverall/Code/envs/Koopjesjacht/meal-scavenger-hunt

   # Login to Docker Hub
   docker login

   # Build and push each service
   docker build -t yourusername/koopjesjacht-api-gateway:latest agents/api-gateway
   docker push yourusername/koopjesjacht-api-gateway:latest

   docker build -t yourusername/koopjesjacht-clue-agent:latest agents/clue-generator
   docker push yourusername/koopjesjacht-clue-agent:latest

   # Repeat for all 20+ services...
   ```

2. **Update docker-compose.yml**

   Replace all `build:` sections with `image:` references:

   ```yaml
   # Before:
   clue-agent:
     build:
       context: ./agents/clue-generator
       dockerfile: Dockerfile

   # After:
   clue-agent:
     image: yourusername/koopjesjacht-clue-agent:latest
   ```

3. **Deploy via Hostinger API**
   ```bash
   # Create new deployment with updated compose file
   curl -X POST \
     -H "Authorization: Bearer 2CcZ3nVYGscNSs4lry1z1ODVeZfPiwLExx4I1RP000bcfff9" \
     -H "Content-Type: application/json" \
     -d @deployment-payload.json \
     https://developers.hostinger.com/api/vps/v1/virtual-machines/1048933/docker
   ```

---

### Option 3: Make Repository Public Temporarily

**Pros:**
- Quickest deployment via API
- Automated build process
- No manual steps

**Cons:**
- Repository temporarily visible
- May not be suitable for proprietary code

**Steps:**

1. **Make repo public**
   - Go to: https://github.com/loverallgithub/Koopjesjacht/settings
   - Scroll to "Danger Zone"
   - Click "Change visibility" → "Make public"

2. **Deploy via API**
   ```bash
   curl -X DELETE \
     -H "Authorization: Bearer 2CcZ3nVYGscNSs4lry1z1ODVeZfPiwLExx4I1RP000bcfff9" \
     https://developers.hostinger.com/api/vps/v1/virtual-machines/1048933/docker/koopjesjacht-platform/down

   sleep 5

   curl -X POST \
     -H "Authorization: Bearer 2CcZ3nVYGscNSs4lry1z1ODVeZfPiwLExx4I1RP000bcfff9" \
     -H "Content-Type: application/json" \
     -d '{
       "project_name": "koopjesjacht-platform",
       "content": "https://github.com/loverallgithub/Koopjesjacht",
       "environment": "DB_USER=scavenger\nDB_PASSWORD=KoopjesjachtSecure2025!\nDB_NAME=scavenger_hunt\nNODE_ENV=production\nJWT_SECRET=koopjesjacht_jwt_secret_2025_production\nAGENT_SECRET=shared_agent_secret_koopjesjacht_2025\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=587"
     }' \
     https://developers.hostinger.com/api/vps/v1/virtual-machines/1048933/docker
   ```

3. **Wait for deployment** (~5-10 minutes for build)
   ```bash
   curl -H "Authorization: Bearer 2CcZ3nVYGscNSs4lry1z1ODVeZfPiwLExx4I1RP000bcfff9" \
     https://developers.hostinger.com/api/vps/v1/virtual-machines/1048933/docker/koopjesjacht-platform/containers
   ```

4. **Make repo private again**
   - Go back to repository settings
   - Change visibility back to private

---

### Option 4: GitHub Deploy Keys (Secure Automation)

**Pros:**
- Repository stays private
- Automated deployments possible
- Industry best practice
- Secure SSH authentication

**Steps:**

1. **SSH into VPS**
   ```bash
   ssh root@72.60.169.105
   ```

2. **Generate SSH key**
   ```bash
   ssh-keygen -t ed25519 -C "koopjesjacht-deploy" -f ~/.ssh/koopjesjacht_deploy
   cat ~/.ssh/koopjesjacht_deploy.pub
   ```
   Copy the public key output.

3. **Add deploy key to GitHub**
   - Go to: https://github.com/loverallgithub/Koopjesjacht/settings/keys
   - Click "Add deploy key"
   - Paste the public key
   - Give it a title: "Hostinger VPS Deploy Key"
   - Check "Allow write access" if needed
   - Click "Add key"

4. **Configure SSH**
   ```bash
   cat >> ~/.ssh/config <<EOF
   Host github.com
     HostName github.com
     User git
     IdentityFile ~/.ssh/koopjesjacht_deploy
     StrictHostKeyChecking no
   EOF
   ```

5. **Test SSH access**
   ```bash
   ssh -T git@github.com
   ```
   Should see: "Hi loverallgithub/Koopjesjacht! You've successfully authenticated"

6. **Clone and deploy**
   ```bash
   cd /docker/koopjesjacht-platform
   git clone git@github.com:loverallgithub/Koopjesjacht.git app
   cd app
   docker-compose up -d --build
   ```

---

## 🔧 Post-Deployment Verification

Once you've deployed using any option above, verify all services:

### 1. Check Container Status
```bash
ssh root@72.60.169.105
docker ps
```

Expected: 23 containers running

### 2. Test Health Endpoints

```bash
# API Gateway
curl http://72.60.169.105:9000/health

# Clue Generator
curl http://72.60.169.105:9001/health

# QR Manager
curl http://72.60.169.105:9002/health

# Stats Aggregator
curl http://72.60.169.105:9003/health

# ... test all agents
```

### 3. Test Frontend
```bash
curl http://72.60.169.105:8081
```

Or visit in browser: http://72.60.169.105:8081

### 4. Verify Database Connection
```bash
ssh root@72.60.169.105
docker exec -it scavenger_postgres psql -U scavenger -d scavenger_hunt
```

### 5. Check Logs for Errors
```bash
docker-compose logs -f --tail=100
```

---

## 📊 Expected Architecture After Full Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    Internet (Users)                      │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Nginx (8080, 8443)           │
        │  Reverse Proxy & SSL          │
        └───────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌──────────────────┐
│ React Frontend│      │  API Gateway     │
│  Port 8081    │      │  Port 9000       │
└───────────────┘      └────────┬─────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Clue     │    │ QR       │    │ Stats    │
        │ Agent    │    │ Agent    │    │ Agent    │
        │ :9001    │    │ :9002    │    │ :9003    │
        └──────────┘    └──────────┘    └──────────┘
                │               │                │
                └───────────────┼────────────────┘
                                │
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
        ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
        │  PostgreSQL  │ │   Redis     │ │  + 15 more  │
        │  :5432       │ │   :6379     │ │  agents     │
        └──────────────┘ └─────────────┘ └─────────────┘
```

---

## 🎯 Quick Start Commands

### Current Infrastructure Test
```bash
# Test Nginx
curl http://72.60.169.105:8080

# Test Redis
echo "PING" | nc 72.60.169.105 6379

# Test PostgreSQL
psql -h 72.60.169.105 -U scavenger -d scavenger_hunt
```

### Deploy Full Application (SSH Method)
```bash
ssh root@72.60.169.105 << 'ENDSSH'
cd /docker/koopjesjacht-platform
git clone https://github.com/loverallgithub/Koopjesjacht.git app
cd app
cp .env.production .env
docker-compose up -d --build
docker-compose ps
ENDSSH
```

### Monitor Deployment
```bash
ssh root@72.60.169.105
docker-compose -f /docker/koopjesjacht-platform/app/docker-compose.yml logs -f
```

---

## 🔐 Security Recommendations

### Immediate Actions

1. **Configure Firewall**
   ```bash
   ssh root@72.60.169.105
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 8080/tcp
   ufw allow 8443/tcp
   ufw enable
   ```

2. **Setup SSL Certificate**
   ```bash
   # Install certbot
   apt update && apt install certbot python3-certbot-nginx -y

   # Get certificate
   certbot --nginx -d pimlicoservices.cloud
   ```

3. **Restrict Database Access**
   Update docker-compose.yml to remove public database ports:
   ```yaml
   postgres:
     ports:
       # Remove this - only internal access needed
       # - "5432:5432"
   ```

4. **Use Environment Variables for Secrets**
   Never commit passwords to git. Use environment variables:
   ```bash
   export DB_PASSWORD=$(openssl rand -base64 32)
   export JWT_SECRET=$(openssl rand -base64 64)
   ```

---

## 📞 Support & Resources

### Hostinger API Documentation
- https://developers.hostinger.com/

### Docker Manager Endpoints
- List projects: GET `/api/vps/v1/virtual-machines/{id}/docker`
- Create project: POST `/api/vps/v1/virtual-machines/{id}/docker`
- Start project: POST `/api/vps/v1/virtual-machines/{id}/docker/{project}/start`
- Stop project: POST `/api/vps/v1/virtual-machines/{id}/docker/{project}/stop`
- Logs: GET `/api/vps/v1/virtual-machines/{id}/docker/{project}/logs`

### Your Deployment Files
- Full deployment report: `deployment-success-report.md`
- Initial troubleshooting: `hostinger-deployment-report.md`
- This guide: `DEPLOYMENT_GUIDE.md`

---

**Ready to deploy?** Choose one of the options above and follow the steps. The infrastructure is already running and waiting for your application!
