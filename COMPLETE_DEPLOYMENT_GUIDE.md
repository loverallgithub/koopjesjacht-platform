# 🚀 Complete Deployment Guide

## Meal Scavenger Hunt Platform (Koopjesjacht)
## From Development to Production - Complete Walkthrough (Updated)

---

## 📋 **Important: Prerequisites First!**

### **BEFORE Running Any Scripts:**

1. **Create GitHub Repository:**
   - Go to https://github.com/new
   - Repository name: `Koopjesjacht`
   - Owner: `loverallgithub`
   - Visibility: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license
   - Click **Create repository**

2. **Fix Docker Compose:**
   - The `docker-compose.yml` has been updated to remove `container_name` from services with `replicas`
   - This fixes the "container name must be unique" error

3. **Get Required API Keys:**
   - SmythOS API Key (from https://studio.smythos.com)
   - GitHub Personal Access Token (from https://github.com/settings/tokens)

---

## ⚡ **Quick Start** (Corrected - 10 Minutes)

### **Step 1: Create GitHub Repository**

**Manual Creation:**
1. Visit https://github.com/new
2. Repository name: `Koopjesjacht`
3. Owner: `loverallgithub`
4. **DO NOT** check "Initialize this repository with a README"
5. Click **Create repository**

**Or Use GitHub CLI:**
```bash
# Install GitHub CLI first (if not installed)
brew install gh  # macOS
# or
# sudo apt install gh  # Ubuntu

# Authenticate
gh auth login

# Create repository
gh repo create loverallgithub/Koopjesjacht --public --source=. --remote=origin

# This creates the repo AND sets up the remote
```

### **Step 2: Initialize Git Repository**

```bash
cd /Users/lynnoverall/Code/envs/Koopjesjacht

# Initialize (creates .gitignore and sets up git)
./git_workflow.sh --init
```

### **Step 3: Verify Docker Compose is Fixed**

The docker-compose.yml file has been updated. Verify it works:

```bash
cd meal-scavenger-hunt
docker compose config
# Should show no errors

# If you see errors about container_name and replicas,
# the file wasn't updated correctly
```

### **Step 4: First Commit and Push**

```bash
# From the Koopjesjacht directory
./git_workflow.sh "Initial commit: Complete platform setup"

# Verify at: https://github.com/loverallgithub/Koopjesjacht
```

### **Step 5: Test Local Deployment**

```bash
# Deploy locally
./deploy.sh

# If successful, run tests
./test_platform.sh

# Access:
# - Frontend: http://localhost:8081
# - Backend: http://localhost:3527
```

---

## 🐙 **GitHub Deployment** (Detailed - Corrected)

### **Issue Encountered:**
```
remote: Repository not found.
fatal: repository 'https://github.com/loverallgithub/Koopjesjacht.git/' not found
```

### **Solution: Create Repository First**

#### **Method 1: GitHub Web Interface (Recommended for Beginners)**

1. **Go to GitHub:**
   - Visit: https://github.com/new
   - Or click the "+" icon in GitHub → "New repository"

2. **Repository Settings:**
   ```
   Owner: loverallgithub
   Repository name: Koopjesjacht
   Description: Meal Scavenger Hunt Platform (Koopjesjacht)
   Visibility: Public (recommended) or Private

   ⚠️ IMPORTANT: DO NOT check these boxes:
   ❌ Add a README file
   ❌ Add .gitignore
   ❌ Choose a license
   ```

3. **Create Repository:**
   - Click **Create repository**
   - You'll see a page with setup instructions

4. **Note the Repository URL:**
   ```
   https://github.com/loverallgithub/Koopjesjacht.git
   ```

#### **Method 2: GitHub CLI (Fastest)**

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from: https://cli.github.com/

# Authenticate with GitHub
gh auth login
# Follow the prompts to authenticate

# Create repository (from your project directory)
cd /Users/lynnoverall/Code/envs/Koopjesjacht

gh repo create loverallgithub/Koopjesjacht \
  --public \
  --source=. \
  --remote=origin \
  --description="Meal Scavenger Hunt Platform with SmythOS AI Agents"

# This command:
# ✅ Creates the repository on GitHub
# ✅ Sets up the remote 'origin'
# ✅ Ready to push
```

### **After Repository Creation:**

```bash
# Initialize local repository
./git_workflow.sh --init

# First commit and push
./git_workflow.sh "Initial commit: Complete Koopjesjacht platform

Features:
- Docker containerized architecture
- React frontend and Express backend
- SmythOS AI agent integration
- Multi-payment gateway support
- Comprehensive deployment automation
- GitHub Actions CI/CD workflows"

# Verify deployment
# Visit: https://github.com/loverallgithub/Koopjesjacht
```

### **If Push Still Fails - Authentication:**

**Option 1: Use Personal Access Token (PAT)**

```bash
# Generate PAT at: https://github.com/settings/tokens
# Scopes needed:
# ✅ repo (full control)
# ✅ workflow
# ✅ write:packages

# Configure Git to use token
git remote set-url origin https://YOUR_PAT@github.com/loverallgithub/Koopjesjacht.git

# Or store credentials
git config --global credential.helper store

# Then push
git push -u origin main
# Enter username and PAT when prompted
```

**Option 2: Use SSH (Recommended for Long-term)**

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
# Copy the output

# Add to GitHub:
# 1. Go to: https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Paste the public key
# 4. Click "Add SSH key"

# Change remote to SSH
git remote set-url origin git@github.com:loverallgithub/Koopjesjacht.git

# Push
git push -u origin main
```

---

## 🐳 **Docker Compose Fixes** (Important!)

### **Issue Encountered:**
```
services.deploy.replicas: can't set container_name and backend as container name must be unique
```

### **Explanation:**
Docker Compose doesn't allow fixed `container_name` when using `replicas` for scaling. You must choose one or the other.

### **Solution Applied:**

The docker-compose.yml has been updated to **remove `container_name`** from `backend` and `frontend` services, allowing them to scale if needed.

**Before (Error):**
```yaml
backend:
  container_name: scavenger_backend  # ❌ Conflicts with replicas
  deploy:
    replicas: 2                       # ❌ Can't use both
```

**After (Fixed):**
```yaml
backend:
  # container_name removed for scaling compatibility
  deploy:
    resources:                        # ✅ Works correctly
      limits:
        cpus: '1'
        memory: 512M
```

### **Impact:**
- Container names will be auto-generated: `scavenger_backend_1`, `scavenger_backend_2`, etc.
- Services with unique names (postgres, redis, nginx) keep their `container_name`
- For production scaling, you can use `docker compose up --scale backend=3`

### **Testing the Fix:**

```bash
cd meal-scavenger-hunt

# Validate configuration
docker compose config
# Should show no errors

# Start services
docker compose up -d

# Check running containers
docker compose ps
# Should show all services running
```

---

## 🤖 **SmythOS Agent Deployment**

### **Getting Your SmythOS API Key:**

1. **Visit SmythOS Studio:**
   ```
   https://studio.smythos.com
   ```

2. **Navigate to API Keys:**
   ```
   Test → LLM → Keys
   ```

3. **Generate New Key:**
   - Click "Generate New Key" or "Regenerate"
   - Copy the key immediately (shown only once!)
   - Save it securely

4. **Get Configuration Details:**
   ```
   Test → LLM → Code
   ```
   - Copy the `baseURL` and `model` strings
   - This ensures no typos

### **Deploy Agents (Two Methods):**

#### **Method 1: SmythOS Studio (Recommended)**

1. **Open Studio:**
   - Go to https://studio.smythos.com
   - Sign in with your account

2. **Create Each Agent:**

   For each of the 5 agents:
   - Click **Create New Agent**
   - Choose agent type:
     - ClueGeneratorAgent → **Autonomous**
     - QRManagerAgent → **Reactive**
     - PaymentHandlerAgent → **Transactional**
     - StatsAggregatorAgent → **Analytical**
     - NotificationServiceAgent → **Messaging**

3. **Upload Configuration:**
   - Upload the JSON config from:
     - `meal-scavenger-hunt/agents/clue-generator/agent-config.json`
     - `meal-scavenger-hunt/agents/qr-manager/agent-config.json`
     - `meal-scavenger-hunt/agents/payment-handler/agent-config.json`
     - (Create configs for stats and notification agents)

4. **Deploy to Agent Cloud:**
   - Click **Deploy** button
   - Select **Agent Cloud**
   - Set version: `v1.0.0`
   - Confirm deployment
   - **Note the endpoint URL**

5. **Update Configuration:**

   Edit `meal-scavenger-hunt/.env`:
   ```bash
   SMYTHOS_API_KEY=your_actual_api_key_here
   SMYTHOS_BASE_URL=https://api.smythos.com

   # Update with actual URLs from Studio
   CLUE_AGENT_URL=https://agents.smythos.com/your-workspace/ClueGeneratorAgent
   QR_AGENT_URL=https://agents.smythos.com/your-workspace/QRManagerAgent
   PAYMENT_AGENT_URL=https://agents.smythos.com/your-workspace/PaymentHandlerAgent
   STATS_AGENT_URL=https://agents.smythos.com/your-workspace/StatsAggregatorAgent
   NOTIFICATION_AGENT_URL=https://agents.smythos.com/your-workspace/NotificationServiceAgent
   ```

#### **Method 2: Automated Script**

```bash
# Set API key
export SMYTHOS_API_KEY=your_api_key_here

# Deploy all agents
./deploy_smythos_agents.sh

# Monitor deployment
./monitor_smythos_agents.sh
```

**Note:** The automated script may require additional SmythOS API endpoints for programmatic agent deployment. Check SmythOS documentation for API availability.

---

## 🌐 **Hostinger Production Deployment**

### **Prerequisites:**

1. **Hostinger VPS:**
   - Minimum: 2GB RAM, 2 CPU cores, 20GB SSD
   - OS: Ubuntu 20.04 or 22.04 LTS
   - SSH access enabled

2. **Domain (Optional but Recommended):**
   - Domain pointed to server IP
   - DNS records configured

### **Deployment Options:**

#### **Option 1: Automated Script**

```bash
# Set connection details
export HOSTINGER_HOST=your-server-ip
export HOSTINGER_USERNAME=root
export HOSTINGER_SSH_PORT=22

# Deploy
./deploy_hostinger.sh

# This handles everything automatically:
# ✅ Connects to server
# ✅ Clones/updates code
# ✅ Creates environment
# ✅ Builds containers
# ✅ Runs migrations
# ✅ Health checks
```

#### **Option 2: GitHub Actions (Fully Automated)**

1. **Set up SSH Key:**
   ```bash
   # Generate deployment key
   ssh-keygen -t rsa -b 4096 -C "github-deploy@koopjesjacht.com" \
     -f ~/.ssh/hostinger_deploy

   # Copy public key to server
   ssh-copy-id -i ~/.ssh/hostinger_deploy.pub root@your-server-ip

   # Test connection
   ssh -i ~/.ssh/hostinger_deploy root@your-server-ip "echo 'Connected!'"
   ```

2. **Add GitHub Secrets:**

   Go to: https://github.com/loverallgithub/Koopjesjacht/settings/secrets/actions

   Add these secrets:
   ```
   HOSTINGER_HOST           = your-server-ip
   HOSTINGER_USERNAME       = root
   HOSTINGER_SSH_KEY        = (paste content of ~/.ssh/hostinger_deploy)
   HOSTINGER_SSH_PORT       = 22

   DB_PASSWORD              = secure-db-password
   JWT_SECRET               = secure-jwt-secret
   SMYTHOS_API_KEY         = your-smythos-key

   # Optional (for payment features):
   STRIPE_SECRET_KEY       = your-stripe-key
   PAYPAL_CLIENT_SECRET    = your-paypal-secret
   MOLLIE_API_KEY          = your-mollie-key
   SMTP_PASS               = your-smtp-password
   ```

3. **Deploy with Git Tag:**
   ```bash
   # Create version tag
   git tag -a v1.0.0 -m "Production release v1.0.0"

   # Push tag (triggers deployment)
   git push origin v1.0.0

   # Watch deployment:
   # https://github.com/loverallgithub/Koopjesjacht/actions
   ```

#### **Option 3: Manual Deployment**

On your Hostinger server:

```bash
# Connect via SSH
ssh root@your-server-ip

# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Create deployment directory
mkdir -p /var/www/koopjesjacht
cd /var/www/koopjesjacht

# Clone repository
git clone https://github.com/loverallgithub/Koopjesjacht.git .

# Navigate to app directory
cd meal-scavenger-hunt

# Create environment file
cp .env.example .env
nano .env  # Edit with your configuration

# Start services
docker compose up -d

# Run migrations (if migration script exists)
docker compose exec backend npm run migrate || echo "Migration script not found"

# Check status
docker compose ps
docker compose logs -f
```

---

## 🔄 **Complete Workflow Example**

### **Daily Development:**

```bash
# 1. Make changes
cd meal-scavenger-hunt/backend/src
nano routes/hunts.js

# 2. Test locally
cd ../../..
./deploy.sh --quick
./test_platform.sh

# 3. Commit and push
./git_workflow.sh "Added hunt validation feature"

# 4. Changes are now on GitHub
# 5. Create tag for production deployment (when ready)
git tag -a v1.0.1 -m "Release: Hunt validation"
git push origin v1.0.1
```

### **New Feature Development:**

```bash
# 1. Create feature branch
git checkout -b feature/advanced-scoring

# 2. Make changes
# ... edit files ...

# 3. Test
./deploy.sh --quick
./test_platform.sh

# 4. Commit
./git_workflow.sh "Implemented advanced scoring system"

# 5. Push feature branch
git push origin feature/advanced-scoring

# 6. Create Pull Request on GitHub

# 7. After review and merge, deploy
git checkout main
git pull
git tag -a v1.1.0 -m "Release: Advanced scoring"
git push origin v1.1.0
```

---

## 🚨 **Troubleshooting Guide**

### **GitHub Repository Not Found**

**Error:**
```
remote: Repository not found.
fatal: repository 'https://github.com/loverallgithub/Koopjesjacht.git/' not found
```

**Solutions:**

1. **Repository doesn't exist:**
   ```bash
   # Create it first at: https://github.com/new
   # Or use: gh repo create loverallgithub/Koopjesjacht --public
   ```

2. **Authentication issue:**
   ```bash
   # Use GitHub CLI
   gh auth login

   # Or create Personal Access Token
   # https://github.com/settings/tokens
   # Then: git remote set-url origin https://TOKEN@github.com/loverallgithub/Koopjesjacht.git
   ```

3. **Wrong repository name:**
   ```bash
   # Check remote URL
   git remote -v

   # Fix if needed
   git remote set-url origin https://github.com/loverallgithub/Koopjesjacht.git
   ```

### **Docker Compose Container Name Error**

**Error:**
```
services.deploy.replicas: can't set container_name and backend as container name must be unique
```

**Solution:**
```bash
# The docker-compose.yml has been fixed
# Verify:
cd meal-scavenger-hunt
docker compose config

# If still seeing error, remove container_name from services with replicas:
# Edit docker-compose.yml and remove container_name from backend and frontend
```

### **Docker Compose Version Warning**

**Warning:**
```
the attribute `version` is obsolete, it will be ignored
```

**Solution:**
```bash
# Already fixed - version line is commented out
# This is just a warning and doesn't affect functionality
```

### **Services Won't Start**

**Check logs:**
```bash
cd meal-scavenger-hunt

# View all logs
docker compose logs

# View specific service
docker compose logs backend

# Follow logs
docker compose logs -f
```

**Common issues:**
```bash
# Port already in use
lsof -i :3527
kill -9 PID

# Database not ready
docker compose restart postgres
docker compose exec postgres pg_isready

# Out of disk space
docker system prune -af
```

---

## ✅ **Updated Deployment Checklist**

### **Phase 1: Prerequisites**
- [ ] GitHub repository created at https://github.com/loverallgithub/Koopjesjacht
- [ ] Personal Access Token or SSH key configured
- [ ] SmythOS account created
- [ ] SmythOS API key obtained
- [ ] Docker and Docker Compose installed locally

### **Phase 2: Local Setup**
- [ ] Git repository initialized (`./git_workflow.sh --init`)
- [ ] Docker Compose validated (`docker compose config`)
- [ ] Environment file created (`cp .env.example .env`)
- [ ] Required API keys added to `.env`
- [ ] Local deployment successful (`./deploy.sh`)
- [ ] Tests passing (`./test_platform.sh`)

### **Phase 3: GitHub Integration**
- [ ] Code committed and pushed to GitHub
- [ ] Repository visible at https://github.com/loverallgithub/Koopjesjacht
- [ ] GitHub Secrets configured
- [ ] GitHub Actions workflows verified

### **Phase 4: SmythOS Deployment**
- [ ] All 5 agents deployed to SmythOS Agent Cloud
- [ ] Agent endpoint URLs obtained
- [ ] Platform `.env` updated with agent URLs
- [ ] Agent endpoints tested successfully

### **Phase 5: Production (Hostinger)**
- [ ] Hostinger VPS provisioned
- [ ] SSH access configured
- [ ] Docker installed on server
- [ ] Firewall configured
- [ ] Domain DNS configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Application deployed via tag push
- [ ] Database initialized
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### **Phase 6: Verification**
- [ ] All services running
- [ ] Frontend accessible
- [ ] Backend API responding
- [ ] Database connected
- [ ] SmythOS agents operational
- [ ] Payments configured (if enabled)
- [ ] Notifications working (if enabled)

**🎉 Platform is fully operational!**

---

## 📞 **Support & Resources**

- **GitHub Repository:** https://github.com/loverallgithub/Koopjesjacht
- **GitHub Issues:** https://github.com/loverallgithub/Koopjesjacht/issues
- **SmythOS Documentation:** https://docs.smythos.com
- **SmythOS Studio:** https://studio.smythos.com
- **Hostinger Support:** https://www.hostinger.com/support

**Need help? Check the detailed guides:**
- [API Keys Guide](./API_KEYS_GUIDE.md)
- [GitHub Deployment](./GITHUB_DEPLOYMENT_GUIDE.md)
- [SmythOS Deployment](./SMYTHOS_DEPLOYMENT_UPDATED.md)
- [Hostinger Deployment](./HOSTINGER_DEPLOYMENT_GUIDE.md)

---

**🚀 You're ready to deploy! Start with Step 1: Create the GitHub repository.**