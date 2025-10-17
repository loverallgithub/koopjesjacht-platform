# 📦 GitHub Repository Deployment Guide

## Deploy to https://github.com/loverallgithub/Koopjesjacht

---

## 🎯 **Overview**

This guide will help you:
1. Upload your entire codebase to GitHub
2. Automate future code commits and pushes
3. Set up CI/CD workflows
4. Prepare for Docker deployment from GitHub

---

## 📋 **Prerequisites**

1. **GitHub Account:** Ensure you have access to https://github.com/loverallgithub
2. **Git Installed:** Verify with `git --version`
3. **GitHub Personal Access Token (PAT):** For authentication

### **Generate GitHub Personal Access Token:**

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Select scopes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Actions workflows)
   - ✅ `write:packages` (upload packages to GitHub Package Registry)
4. Generate token and **copy it immediately** (shown only once!)
5. Save token securely

---

## 🚀 **Step-by-Step GitHub Deployment**

### **Step 1: Initialize Git Repository**

```bash
# Navigate to your project root
cd /Users/lynnoverall/Code/envs/Koopjesjacht

# Initialize Git repository (if not already initialized)
git init

# Check current status
git status
```

### **Step 2: Create .gitignore File**

```bash
# Create .gitignore to exclude sensitive and unnecessary files
cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local
*.env
smythos-agents.env

# API Keys and Secrets
**/keys/
**/secrets/
**/*.pem
**/*.key
*.log

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Build outputs
dist/
build/
*.js.map
.cache/

# Docker
docker-compose.override.yml

# Logs
logs/
*.log
agent_alerts.log

# Database
*.sqlite
*.db
postgres_data/
redis_data/

# Uploads
uploads/
temp/
tmp/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Misc
*.bak
*.swp
*~
EOF
```

### **Step 3: Configure Git**

```bash
# Set your Git identity
git config user.name "Lynn Overall"
git config user.email "your-email@example.com"

# Set default branch to main
git config init.defaultBranch main
```

### **Step 4: Initial Commit**

```bash
# Add all files (respecting .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Meal Scavenger Hunt Platform (Koopjesjacht)

- Complete platform architecture with Docker Compose
- React frontend and Express backend
- SmythOS agent configurations
- PostgreSQL and Redis data stores
- Payment integration (Stripe, PayPal, Mollie)
- Deployment and monitoring scripts
- Comprehensive documentation"

# Verify commit
git log --oneline
```

### **Step 5: Connect to GitHub Repository**

```bash
# Add GitHub remote
git remote add origin https://github.com/loverallgithub/Koopjesjacht.git

# Verify remote
git remote -v

# Create and switch to main branch (if needed)
git branch -M main
```

### **Step 6: Push to GitHub**

**Option A: Using HTTPS with Personal Access Token**

```bash
# Push with authentication prompt
git push -u origin main

# When prompted for username: loverallgithub
# When prompted for password: paste your Personal Access Token
```

**Option B: Using GitHub CLI (Recommended)**

```bash
# Install GitHub CLI (if not installed)
# macOS:
brew install gh

# Ubuntu:
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Authenticate with GitHub
gh auth login

# Push to GitHub
git push -u origin main
```

---

## 🤖 **Automated Git Workflow**

The `git_workflow.sh` script automates all git operations. Usage:

```bash
# Make script executable
chmod +x git_workflow.sh

# Stage, commit, and push changes
./git_workflow.sh "Your commit message here"

# Quick commit with auto-generated message
./git_workflow.sh --auto

# Check status without committing
./git_workflow.sh --status
```

---

## 📁 **Repository Structure on GitHub**

Your repository will have this structure:

```
Koopjesjacht/
├── .github/
│   └── workflows/
│       ├── docker-build.yml
│       ├── deploy-hostinger.yml
│       └── tests.yml
├── meal-scavenger-hunt/
│   ├── agents/
│   ├── backend/
│   ├── frontend/
│   ├── database/
│   ├── docker/
│   ├── docker-compose.yml
│   └── .env.example
├── AGENTS/
├── docs/
├── scripts/
│   ├── deploy.sh
│   ├── test_platform.sh
│   └── git_workflow.sh
├── .gitignore
├── README.md
├── API_KEYS_GUIDE.md
├── ENHANCEMENT_ROADMAP.md
└── SMYTHOS_DEPLOYMENT_UPDATED.md
```

---

## 🔄 **Setting Up GitHub Actions CI/CD**

### **Workflow 1: Docker Build & Test**

Located at `.github/workflows/docker-build.yml`

**Triggers:**
- Push to `main` branch
- Pull requests
- Manual dispatch

**Actions:**
- Builds all Docker images
- Runs automated tests
- Pushes images to GitHub Container Registry

### **Workflow 2: Deploy to Hostinger**

Located at `.github/workflows/deploy-hostinger.yml`

**Triggers:**
- Tag creation (e.g., `v1.0.0`)
- Manual dispatch

**Actions:**
- Pulls latest code
- Builds Docker images
- Deploys to Hostinger via SSH
- Runs health checks

### **Workflow 3: Automated Tests**

Located at `.github/workflows/tests.yml`

**Triggers:**
- Every push
- Every pull request

**Actions:**
- Runs platform test suite
- Validates configurations
- Checks for security issues

---

## 🔐 **Configure GitHub Secrets**

Add these secrets to your repository:

1. Go to https://github.com/loverallgithub/Koopjesjacht/settings/secrets/actions
2. Click **New repository secret**
3. Add each secret:

**Required Secrets:**

```
DOCKERHUB_USERNAME       # Your Docker Hub username
DOCKERHUB_TOKEN          # Docker Hub access token
HOSTINGER_HOST           # Hostinger server IP
HOSTINGER_USERNAME       # SSH username
HOSTINGER_SSH_KEY        # Private SSH key for authentication
HOSTINGER_SSH_PORT       # SSH port (usually 22)
SMYTHOS_API_KEY         # SmythOS API key
DB_PASSWORD             # PostgreSQL password
JWT_SECRET              # JWT secret for authentication
STRIPE_SECRET_KEY       # Stripe API key (optional)
PAYPAL_CLIENT_SECRET    # PayPal secret (optional)
MOLLIE_API_KEY          # Mollie API key (optional)
```

---

## 🏷️ **Version Tagging Strategy**

Use semantic versioning for releases:

```bash
# Create a new version tag
git tag -a v1.0.0 -m "Release version 1.0.0: Initial production release"

# Push tag to GitHub
git push origin v1.0.0

# This triggers the deployment workflow
```

**Version Format:**
- `v1.0.0` - Major release
- `v1.1.0` - Minor feature addition
- `v1.1.1` - Bug fix or patch

---

## 📊 **Monitoring GitHub Actions**

1. **View Workflows:**
   - Go to https://github.com/loverallgithub/Koopjesjacht/actions
   - See all workflow runs and their status

2. **Check Build Logs:**
   - Click on any workflow run
   - View detailed logs for each step

3. **Deployment Status:**
   - GitHub Actions badge in README
   - Email notifications on failure

---

## 🔧 **Manual Repository Management**

### **Update Repository:**

```bash
# Pull latest changes from GitHub
git pull origin main

# Make your changes...

# Stage changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

### **Create Feature Branch:**

```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push branch to GitHub
git push -u origin feature/new-feature

# Create Pull Request on GitHub
```

### **Sync Fork (if forked):**

```bash
# Add upstream remote
git remote add upstream https://github.com/original/repo.git

# Fetch upstream changes
git fetch upstream

# Merge upstream changes
git merge upstream/main

# Push to your fork
git push origin main
```

---

## 🚀 **Quick Start Commands**

```bash
# Clone repository (for team members)
git clone https://github.com/loverallgithub/Koopjesjacht.git
cd Koopjesjacht

# Install dependencies and setup
cd meal-scavenger-hunt
cp .env.example .env
# Edit .env with your configuration

# Run with Docker
docker-compose up -d

# Run automated commit (for updates)
cd ..
./git_workflow.sh "Updated configuration for production"
```

---

## 📚 **Additional Resources**

- **GitHub Documentation:** https://docs.github.com
- **GitHub Actions:** https://docs.github.com/en/actions
- **Git Basics:** https://git-scm.com/doc
- **GitHub CLI:** https://cli.github.com/manual/

---

## ✅ **GitHub Deployment Checklist**

- [ ] Git initialized in project directory
- [ ] .gitignore configured to exclude sensitive files
- [ ] Initial commit created with all files
- [ ] Remote origin added pointing to GitHub repository
- [ ] Personal Access Token generated
- [ ] Code pushed to GitHub successfully
- [ ] Repository visible at https://github.com/loverallgithub/Koopjesjacht
- [ ] GitHub Secrets configured for CI/CD
- [ ] GitHub Actions workflows set up
- [ ] README.md updated with project information
- [ ] Team members granted access (if applicable)

**🎉 Your code is now on GitHub and ready for automated deployment!**