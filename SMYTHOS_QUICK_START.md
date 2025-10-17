# 🚀 SmythOS Quick Start Guide

## Deploy Your Agents to https://app.smythos.com/agents in 5 Minutes

---

## 📋 **Prerequisites**

1. **Get Your SmythOS API Key:**
   - Go to https://app.smythos.com/api-keys
   - Create account if needed
   - Generate new API key with "Agent Management" permissions
   - Copy the key (shown only once!)

2. **Set Environment Variable:**
   ```bash
   export SMYTHOS_API_KEY=your_api_key_here
   ```

---

## 🚀 **Quick Deployment**

### **Option 1: Automated Script (Recommended)**

```bash
# Make script executable
chmod +x deploy_smythos_agents.sh

# Deploy all agents at once
./deploy_smythos_agents.sh
```

### **Option 2: Manual Deployment**

Visit https://app.smythos.com/agents and create each agent manually using the configurations from `meal-scavenger-hunt/agents/*/agent-config.json`

---

## 🔧 **Update Your Platform**

After deployment, update your `.env` file:

```bash
# SmythOS Agent Endpoints
CLUE_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/ClueGeneratorAgent
QR_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/QRManagerAgent
PAYMENT_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/PaymentHandlerAgent
STATS_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/StatsAggregatorAgent
NOTIFICATION_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/NotificationServiceAgent
```

---

## 📊 **Monitor Your Agents**

```bash
# Single health check
./monitor_smythos_agents.sh

# Continuous monitoring
./monitor_smythos_agents.sh --continuous

# Test agent functionality
./monitor_smythos_agents.sh --test
```

---

## 🎯 **Your 5 Agents**

| Agent | Purpose | Endpoint |
|-------|---------|----------|
| **ClueGeneratorAgent** | AI-powered clue creation | `/generate-clue` |
| **QRManagerAgent** | QR code generation/validation | `/qr/generate`, `/qr/scan` |
| **PaymentHandlerAgent** | Multi-gateway payments | `/payments/process` |
| **StatsAggregatorAgent** | Real-time analytics | `/stats/{huntId}` |
| **NotificationServiceAgent** | Email/push notifications | `/send` |

---

## 🔗 **Management Links**

- **Dashboard:** https://app.smythos.com/dashboard
- **Agent Management:** https://app.smythos.com/agents  
- **Metrics:** https://app.smythos.com/agents/metrics
- **Logs:** https://app.smythos.com/agents/logs
- **API Keys:** https://app.smythos.com/api-keys

---

## 🧪 **Test Your Setup**

```bash
# Test clue generation
curl -X POST "https://agents.smythos.com/meal-scavenger-hunt/ClueGeneratorAgent/generate-clue" \
  -H "Authorization: Bearer YOUR_SMYTHOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_info": {
      "name": "Test Coffee Shop",
      "description": "Cozy local coffee shop"
    },
    "difficulty_level": 3
  }'
```

---

## 🆘 **Need Help?**

- **Documentation:** `SMYTHOS_DEPLOYMENT_GUIDE.md` (detailed guide)
- **Support:** https://support.smythos.com
- **Community:** https://community.smythos.com

**🎉 Your agents are now running in the SmythOS cloud!**