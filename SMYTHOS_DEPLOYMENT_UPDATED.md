# 🤖 SmythOS Agent Deployment Guide (Updated)

## Based on Official SmythOS Runtime Environment (SRE) Documentation

---

## 📋 **Understanding SmythOS Runtime Environment (SRE)**

The **SmythOS Runtime Environment (SRE)** is the execution platform for agents that abstracts away infrastructure, allowing you to focus on logic, workflows, and secure scaling.

### **Key Features:**
- Works consistently across local, cloud, and hybrid environments
- Modular connectors with unified API surface
- Built-in security controls with zero-trust access
- Agent identity scoping for secure operations

---

## 🚀 **Three Deployment Methods**

### **Method 1: Agent Cloud (Recommended for Production)**

**Best For:** Production deployments with auto-scaling and zero maintenance

**Features:**
- Auto-scaling infrastructure with HTTPS
- Production-grade hosting
- No setup or maintenance required
- Centralized logs and traces in Studio
- Continuous deployment workflows

**Deployment Steps:**
1. Open your agent in SmythOS Studio
2. Click **Deploy** button
3. Select **Agent Cloud** deployment option
4. Set version details (e.g., v1.0.0)
5. Confirm deployment
6. Access logs and traces in Studio

---

### **Method 2: Local Runtime (Development & Testing)**

**Best For:** Local debugging and testing

**Features:**
- Runs on your local machine
- SDK or Docker deployment
- RAM caching and local storage
- Immediate log visibility
- Fast iteration cycles

**Deployment Steps:**

**Option A: Using SDK**
```javascript
const SRE = require('@smythos/runtime');

// Initialize SRE
const sre = SRE.init({
  Storage: {
    Connector: 'Local',
    Settings: { path: './data' }
  },
  Cache: {
    Connector: 'RAM'
  },
  LLM: {
    Connector: 'OpenAI',
    Settings: { apiKey: process.env.OPENAI_API_KEY }
  }
});

await sre.ready();

// Your agent logic here
```

**Option B: Using Docker**
```bash
docker run -p 8080:8080 \
  -e SMYTHOS_API_KEY=your_key \
  -v $(pwd)/agents:/agents \
  smythos/runtime:latest
```

---

### **Method 3: Self-Hosted (Enterprise)**

**Best For:** Organizations with regulatory requirements or complete infrastructure control

**Features:**
- Deploy on your own servers or cloud
- Custom security configurations
- Integration with enterprise systems
- Production connectors for storage, secrets, logging

**Deployment Steps:**

1. **Configure SRE with Production Connectors:**

```javascript
const sre = SRE.init({
  Storage: {
    Connector: 'S3',
    Settings: {
      bucket: 'my-production-bucket',
      region: 'us-east-1'
    }
  },
  Cache: {
    Connector: 'Redis',
    Settings: {
      url: 'redis://prod-cluster:6379'
    }
  },
  Vault: {
    Connector: 'HashiCorp',
    Settings: {
      address: 'https://vault.company.com',
      token: process.env.VAULT_TOKEN
    }
  },
  LLM: {
    Connector: 'OpenAI',
    Settings: {
      apiKey: process.env.OPENAI_API_KEY
    }
  }
});

await sre.ready();
```

2. **Deploy to Your Infrastructure:**
   - Use Kubernetes, Docker Swarm, or VMs
   - Configure load balancing and auto-scaling
   - Set up monitoring and logging
   - Implement security policies

---

## 🔑 **Authentication & API Configuration**

### **Getting Your API Key:**

1. Log into SmythOS platform
2. Navigate to **Test → LLM → Keys**
3. Generate or regenerate your AgentLLM key
4. Copy the key (shown only once!)

### **Finding Configuration Details:**

1. Go to **Test → LLM → Code**
2. Copy the correct `baseURL` and `model` string
3. This avoids typos or environment mismatches

### **API Authentication:**

All API requests require the Authorization header:

```bash
Authorization: Bearer YOUR_AGENT_LLM_KEY
```

**Common Authentication Issues:**
- **401 Errors:** Invalid or expired key
- **Wrong Agent Versions:** Incorrect model tags
- **Missing Output:** Verify agent configuration and check logs

---

## 🏗️ **For Your Meal Scavenger Hunt Platform**

### **Recommended Deployment Strategy:**

**Phase 1: Development (Local Runtime)**
- Test agents locally using Docker
- Iterate quickly on agent logic
- Validate integrations

**Phase 2: Staging (Agent Cloud)**
- Deploy to SmythOS Agent Cloud
- Test with real data
- Monitor performance

**Phase 3: Production (Agent Cloud or Self-Hosted)**
- **Option A:** Use Agent Cloud for simplicity (recommended)
- **Option B:** Self-host for enterprise requirements

---

## 📦 **Deploying Your 5 Agents**

### **Agent 1: ClueGeneratorAgent**

**Using SmythOS Studio:**
1. Open SmythOS Studio at https://studio.smythos.com
2. Create new agent or import existing configuration
3. Configure agent with:
   ```json
   {
     "name": "ClueGeneratorAgent",
     "type": "autonomous",
     "capabilities": ["natural_language_generation", "context_analysis"],
     "endpoints": ["/generate-clue", "/regenerate-hint"]
   }
   ```
4. Test in Studio playground
5. Click **Deploy → Agent Cloud**
6. Set version: `v1.0.0`
7. Note the generated endpoint URL

**Using SDK (Self-Hosted):**
```javascript
const clueAgent = sre.createAgent({
  name: 'ClueGeneratorAgent',
  type: 'autonomous',
  handler: async (input) => {
    const { shop_info, difficulty_level } = input;
    // Your clue generation logic here
    return {
      clue: generatedClue,
      hints: generatedHints
    };
  }
});

await clueAgent.deploy();
```

### **Agent 2: QRManagerAgent**

**Using SmythOS Studio:**
1. Create reactive agent in Studio
2. Configure endpoints: `/qr/generate`, `/qr/scan`, `/qr/validate`
3. Set up fraud detection rules
4. Deploy to Agent Cloud
5. Configure webhooks for scan events

**Using SDK:**
```javascript
const qrAgent = sre.createAgent({
  name: 'QRManagerAgent',
  type: 'reactive',
  endpoints: {
    generate: '/qr/generate',
    scan: '/qr/scan',
    validate: '/qr/validate'
  },
  handler: async (action, data) => {
    switch(action) {
      case 'generate':
        return await generateQR(data);
      case 'scan':
        return await validateScan(data);
      default:
        throw new Error('Unknown action');
    }
  }
});
```

### **Agent 3: PaymentHandlerAgent**

**Using SmythOS Studio:**
1. Create transactional agent
2. Configure payment gateway integrations
3. Enable PCI DSS compliance mode
4. Set up webhook endpoints
5. Deploy with enhanced security settings

**Using SDK:**
```javascript
const paymentAgent = sre.createAgent({
  name: 'PaymentHandlerAgent',
  type: 'transactional',
  connectors: {
    stripe: { apiKey: process.env.STRIPE_SECRET_KEY },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET
    },
    mollie: { apiKey: process.env.MOLLIE_API_KEY }
  },
  handler: async (action, paymentData) => {
    // Payment processing logic
  }
});
```

### **Agent 4: StatsAggregatorAgent**

**Using SmythOS Studio:**
1. Create analytical agent
2. Configure data sources
3. Set up real-time metrics
4. Deploy with dashboard endpoints

### **Agent 5: NotificationServiceAgent**

**Using SmythOS Studio:**
1. Create messaging agent
2. Configure SMTP and Firebase
3. Set up notification templates
4. Deploy with delivery tracking

---

## 🔧 **Integration with Your Platform**

### **Update Backend to Use SmythOS Agents:**

```javascript
// backend/src/services/smythos-client.js
import axios from 'axios';

class SmythOSAgentClient {
  constructor() {
    this.apiKey = process.env.SMYTHOS_API_KEY;
    this.baseURL = process.env.SMYTHOS_BASE_URL || 'https://api.smythos.com';

    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async callAgent(agentName, endpoint, data) {
    try {
      const response = await axios.post(
        `${this.baseURL}/agents/${agentName}${endpoint}`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error(`Agent call failed: ${agentName}${endpoint}`, error);
      throw error;
    }
  }

  // Clue Generation
  async generateClue(shopInfo, difficulty = 3, theme = '', language = 'en') {
    return this.callAgent('ClueGeneratorAgent', '/generate-clue', {
      shop_info: shopInfo,
      difficulty_level: difficulty,
      theme,
      language
    });
  }

  // QR Management
  async generateQR(huntId, shopId, teamId, userId) {
    return this.callAgent('QRManagerAgent', '/qr/generate', {
      action: 'generate',
      hunt_id: huntId,
      shop_id: shopId,
      team_id: teamId,
      user_id: userId
    });
  }

  async scanQR(qrCode, location, userId) {
    return this.callAgent('QRManagerAgent', '/qr/scan', {
      action: 'scan',
      qr_code: qrCode,
      location,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
  }

  // Payment Processing
  async processPayment(paymentData, gateway = 'auto') {
    return this.callAgent('PaymentHandlerAgent', '/payments/process', {
      action: 'charge',
      payment_data: paymentData,
      gateway_preference: gateway
    });
  }

  // Analytics
  async getStats(huntId, filters = {}) {
    return this.callAgent('StatsAggregatorAgent', `/stats/${huntId}`, filters);
  }

  // Notifications
  async sendNotification(type, recipient, template, data) {
    return this.callAgent('NotificationServiceAgent', '/send', {
      type,
      recipient,
      template,
      data
    });
  }
}

export default new SmythOSAgentClient();
```

---

## 📊 **Environment Configuration**

### **Update Your `.env` File:**

```bash
# SmythOS Configuration
SMYTHOS_API_KEY=your_agent_llm_key_here
SMYTHOS_BASE_URL=https://api.smythos.com
SMYTHOS_WORKSPACE=meal-scavenger-hunt

# Agent Endpoints (after deployment)
CLUE_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/ClueGeneratorAgent
QR_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/QRManagerAgent
PAYMENT_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/PaymentHandlerAgent
STATS_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/StatsAggregatorAgent
NOTIFICATION_AGENT_URL=https://agents.smythos.com/meal-scavenger-hunt/NotificationServiceAgent

# Agent Configuration
AGENT_TIMEOUT=30000
AGENT_RETRY_COUNT=3
AGENT_HEALTH_CHECK_INTERVAL=60000
```

---

## 🧪 **Testing Your Deployment**

### **Test Individual Agents:**

```bash
# Test Clue Generator
curl -X POST "https://api.smythos.com/agents/ClueGeneratorAgent/generate-clue" \
  -H "Authorization: Bearer YOUR_AGENT_LLM_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_info": {
      "name": "Test Coffee Shop",
      "description": "Cozy local cafe"
    },
    "difficulty_level": 3
  }'

# Test QR Manager
curl -X POST "https://api.smythos.com/agents/QRManagerAgent/qr/generate" \
  -H "Authorization: Bearer YOUR_AGENT_LLM_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "hunt_id": "test-hunt-123",
    "shop_id": "test-shop-456",
    "user_id": "test-user-789"
  }'
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

**401 Unauthorized:**
- Verify your API key is valid
- Check key in Test → LLM → Keys
- Ensure proper Authorization header format

**Wrong Agent Version:**
- Verify model tags in Test → LLM → Code
- Check agent version in deployment

**Missing Output:**
- Verify agent configuration is correct
- Check deployment logs in Studio
- Validate input data format

**Connection Timeouts:**
- Check network connectivity
- Verify baseURL is correct
- Increase timeout settings

---

## 📞 **Support Resources**

- **Documentation:** https://smythos.com/docs/
- **Studio:** https://studio.smythos.com
- **Agent Cloud:** Deploy directly from Studio
- **Enterprise Support:** Contact SmythOS team for advanced configuration

---

## ✅ **Deployment Checklist**

- [ ] SmythOS account created
- [ ] Agent LLM key generated (Test → LLM → Keys)
- [ ] baseURL and model copied (Test → LLM → Code)
- [ ] Agents created in Studio or SDK
- [ ] Agents deployed to Agent Cloud
- [ ] Environment variables configured
- [ ] Backend updated with SmythOS client
- [ ] Integration tests completed
- [ ] Monitoring configured
- [ ] Production deployment verified

**🎉 Your SmythOS agents are now properly deployed!**