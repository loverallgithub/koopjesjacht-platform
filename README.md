# 🎯 Meal Scavenger Hunt Platform (Koopjesjacht)

A scalable, gamified scavenger hunt platform for meal collection, powered by SmythOS AI agents and deployable to Hostinger with Docker.

[![Deploy to Hostinger](https://img.shields.io/badge/Deploy-Hostinger-blue)](./HOSTINGER_DEPLOYMENT_GUIDE.md)
[![SmythOS Agents](https://img.shields.io/badge/Agents-SmythOS-green)](./SMYTHOS_DEPLOYMENT_UPDATED.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 **Quick Start**

### **1. Get API Keys**
```bash
# SmythOS: https://studio.smythos.com → Test → LLM → Keys
export SMYTHOS_API_KEY=your_key

# GitHub: https://github.com/settings/tokens
export GITHUB_TOKEN=your_token
```

### **2. Deploy Locally**
```bash
./deploy.sh
./test_platform.sh
```

### **3. Deploy to GitHub**
```bash
./git_workflow.sh "Initial commit"
# Visit: https://github.com/loverallgithub/Koopjesjacht
```

### **4. Deploy to Production**
```bash
# Tag for deployment
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
# Automatic deployment via GitHub Actions
```

---

## 📋 **Features**

### **For Hunters**
- 🎮 Gamified meal collection experience
- 👥 Team collaboration and competition
- 🏆 Real-time leaderboards
- 📱 QR code scanning at venues
- 🌍 Multi-language support (EN/NL)

### **For Shop Owners**
- 📈 Analytics dashboard
- 👥 Increased foot traffic
- 💰 Revenue generation
- 🎯 Marketing tools
- 📊 Visitor statistics

### **For Organizers**
- 🎨 Custom hunt creation
- 👥 Team management
- 🎉 Special guest celebrations
- 📊 Real-time monitoring
- 💵 Flexible pricing

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)               │
└─────────────┬──────────────────────────┬────────────────┘
              │                          │
    ┌─────────▼──────────┐     ┌────────▼─────────┐
    │   React Frontend   │     │   Backend API    │
    │    (Port 8081)     │     │   (Port 3527)    │
    └────────────────────┘     └──────┬───────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
        ┌───────────▼──┐   ┌─────────▼──┐   ┌─────────▼──────┐
        │  PostgreSQL  │   │   Redis    │   │ SmythOS Agents │
        │  (Port 5432) │   │ (Port 3493)│   │  Cloud Hosted  │
        └──────────────┘   └────────────┘   └────────────────┘
```

### **5 SmythOS AI Agents:**
1. **ClueGeneratorAgent** - Creative clue generation
2. **QRManagerAgent** - QR code management & validation
3. **PaymentHandlerAgent** - Multi-gateway payment processing
4. **StatsAggregatorAgent** - Real-time analytics
5. **NotificationServiceAgent** - Email/push notifications

---

## 📦 **Technology Stack**

**Frontend:**
- React 18
- Material-UI
- Socket.io client
- i18next (internationalization)

**Backend:**
- Node.js 18+
- Express.js
- PostgreSQL 15
- Redis 7
- Socket.io

**AI & Agents:**
- SmythOS Runtime Environment (SRE)
- OpenAI integration
- Context-aware processing

**Payment Gateways:**
- Stripe (cards)
- PayPal (international)
- Mollie (iDEAL, EU methods)

**Infrastructure:**
- Docker & Docker Compose
- Nginx reverse proxy
- GitHub Actions CI/CD
- Hostinger VPS hosting

---

## 📚 **Documentation**

### **Getting Started:**
- [Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md) - Full walkthrough
- [API Keys Guide](./API_KEYS_GUIDE.md) - How to obtain all required keys
- [Quick Start Guide](./SMYTHOS_QUICK_START.md) - 5-minute setup

### **Platform Deployment:**
- [GitHub Deployment](./GITHUB_DEPLOYMENT_GUIDE.md) - Version control setup
- [SmythOS Agents](./SMYTHOS_DEPLOYMENT_UPDATED.md) - AI agent deployment
- [Hostinger Production](./HOSTINGER_DEPLOYMENT_GUIDE.md) - VPS deployment

### **Development:**
- [Enhancement Roadmap](./ENHANCEMENT_ROADMAP.md) - Future features
- [Claude Code Prompts](./CLAUDE_CODE_PROMPTS.md) - AI-assisted development
- [Platform Analysis](./ANALYSIS_SUMMARY.md) - Technical overview

---

## 🛠️ **Scripts**

### **Deployment Scripts:**
```bash
./deploy.sh                    # Deploy locally with Docker
./deploy.sh --clean            # Clean deployment
./deploy.sh --quick            # Skip migrations

./deploy_hostinger.sh          # Deploy to Hostinger VPS
./deploy_hostinger.sh --rollback  # Rollback deployment
```

### **Git Workflow:**
```bash
./git_workflow.sh "message"    # Commit and push with message
./git_workflow.sh --auto       # Auto-generate commit message
./git_workflow.sh --status     # Show repository status
./git_workflow.sh --pull       # Pull latest changes
```

### **Testing:**
```bash
./test_platform.sh             # Full platform test suite
./test_platform.sh --quick     # Essential tests only
```

### **SmythOS Agent Management:**
```bash
./deploy_smythos_agents.sh     # Deploy all agents to SmythOS
./monitor_smythos_agents.sh    # Monitor agent health
./monitor_smythos_agents.sh --continuous  # Continuous monitoring
```

---

## 🔑 **Environment Configuration**

Create `.env` file in `meal-scavenger-hunt/` directory:

```bash
# Database
DB_USER=scavenger
DB_PASSWORD=your_secure_password
DB_NAME=scavenger_hunt

# Application
NODE_ENV=production
REACT_APP_API_URL=https://api.yourdomain.com
JWT_SECRET=your_jwt_secret

# SmythOS
SMYTHOS_API_KEY=your_smythos_key

# Payment Providers (Optional)
STRIPE_SECRET_KEY=sk_test_your_key
PAYPAL_CLIENT_ID=your_paypal_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
MOLLIE_API_KEY=test_your_mollie_key

# SMTP (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Firebase (Optional)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com

# Redis
REDIS_URL=redis://redis:3493
```

See [.env.example](./meal-scavenger-hunt/.env.example) for complete configuration.

---

## 🚦 **Development Workflow**

### **Local Development:**
```bash
# Start services
cd meal-scavenger-hunt
docker-compose up -d

# View logs
docker-compose logs -f

# Run backend development
docker-compose exec backend npm run dev

# Run frontend development
cd frontend && npm start

# Run tests
npm test
```

### **Making Changes:**
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Test locally
./deploy.sh --quick
./test_platform.sh

# 4. Commit and push
./git_workflow.sh "Add new feature"

# 5. Create Pull Request on GitHub
```

### **Production Deployment:**
```bash
# 1. Merge to main
git checkout main
git pull origin main

# 2. Create version tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# 3. Push tag
git push origin v1.0.0

# 4. GitHub Actions automatically deploys to Hostinger
```

---

## 🧪 **Testing**

### **Run All Tests:**
```bash
./test_platform.sh
```

### **Test Categories:**
- Docker Services (11 tests)
- Database Connectivity (4 tests)
- API Endpoints (8 tests)
- SmythOS Agents (10 tests)
- Frontend Accessibility (6 tests)
- Payment Integration (3 tests)
- Security & Configuration (8 tests)
- Performance (3 tests)
- Logs & Monitoring (4 tests)

**Total: 57 comprehensive tests**

---

## 📊 **Monitoring**

### **SmythOS Agent Dashboard:**
- **Studio:** https://studio.smythos.com
- **Metrics:** Real-time performance monitoring
- **Logs:** Centralized logging and debugging

### **Platform Monitoring:**
```bash
# View all container logs
docker-compose logs -f

# Monitor resources
docker stats

# System resources
htop
```

### **Health Checks:**
- Frontend: http://yourdomain.com
- Backend API: http://api.yourdomain.com/health
- Database: `docker-compose exec postgres pg_isready`
- Redis: `docker-compose exec redis redis-cli ping`

---

## 🔒 **Security**

- JWT authentication with refresh tokens
- Rate limiting and DDoS protection
- Data encryption at rest and in transit
- GDPR compliance ready
- PCI DSS payment security
- SSL/TLS encryption
- Security headers (helmet.js)
- Input validation and sanitization

---

## 💰 **Business Model**

### **Revenue Streams:**
1. Hunt entry fees
2. Shop participation fees
3. Premium subscriptions
4. Corporate team building packages
5. Creator marketplace (revenue sharing)
6. White-label licensing

### **Target Markets:**
- **B2C:** Families, friends, tourists, locals
- **B2B:** Corporate events, team building
- **B2B2C:** Restaurants, cafes, local businesses

---

## 🗺️ **Roadmap**

See [ENHANCEMENT_ROADMAP.md](./ENHANCEMENT_ROADMAP.md) for detailed feature planning.

### **Phase 1: Foundation (Weeks 1-8)**
- ✅ Core platform development
- ✅ Docker containerization
- ✅ SmythOS agent integration
- 🔄 Advanced caching strategy
- 🔄 Security framework enhancement

### **Phase 2: Growth (Weeks 9-16)**
- 📋 Advanced gamification system
- 📋 Subscription & premium tiers
- 📋 GDPR compliance
- 📋 Real-time communication upgrade

### **Phase 3: Innovation (Weeks 17-28)**
- 📋 AI-powered dynamic clues
- 📋 Microservices migration
- 📋 Creator marketplace
- 📋 A/B testing framework

### **Phase 4: Advanced (Weeks 29+)**
- 📋 Augmented Reality mode
- 📋 Machine learning pipeline
- 📋 Franchise & white-label solutions

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Support**

- **Documentation:** [Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md)
- **GitHub Issues:** https://github.com/loverallgithub/Koopjesjacht/issues
- **SmythOS Support:** support@smythos.com
- **Email:** support@koopjesjacht.com

---

## 🙏 **Acknowledgments**

- **SmythOS** for AI agent orchestration
- **Hostinger** for reliable VPS hosting
- **Open Source Community** for amazing tools
- All contributors and testers

---

## 📈 **Project Status**

- **Development:** ✅ Complete
- **Documentation:** ✅ Complete
- **Local Deployment:** ✅ Tested
- **GitHub Integration:** ✅ Ready
- **SmythOS Agents:** ✅ Configured
- **Hostinger Deployment:** ✅ Ready
- **Production:** 🚀 Ready to Deploy

---

**Made with ❤️ for bringing communities together through food and fun!**

**🎯 Ready to deploy? Start with the [Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md)**