# 🤖 SmythOS Agent Deployment Guide

## Deploy & Run Agents on https://app.smythos.com/agents

---

## 📋 **Overview**

Your platform has **5 SmythOS agents** ready for deployment on the SmythOS cloud platform. These agents handle core functionality and need to be deployed to https://app.smythos.com/agents to work properly.

### **Agents to Deploy:**
1. **ClueGeneratorAgent** - Creative clue and hint generation
2. **QRManagerAgent** - QR code generation and validation  
3. **PaymentHandlerAgent** - Multi-gateway payment processing
4. **StatsAggregatorAgent** - Real-time analytics and statistics
5. **NotificationServiceAgent** - Email and push notifications

---

## 🚀 **Step-by-Step Deployment Process**

### **Prerequisites:**
- SmythOS account with API key
- Access to https://app.smythos.com/agents
- Agent configuration files from your project

---

### **Step 1: Access SmythOS Agent Management**

1. **Login to SmythOS Platform:**
   ```
   https://app.smythos.com/login
   ```

2. **Navigate to Agent Management:**
   ```
   https://app.smythos.com/agents
   ```

3. **Click "Create New Agent" or "Deploy Agent"**

---

### **Step 2: Deploy Each Agent**

#### **🧠 Agent 1: ClueGeneratorAgent**

**Configuration:**
```json
{
  "name": "ClueGeneratorAgent",
  "version": "1.0.0", 
  "description": "SmythOS agent for generating creative scavenger hunt clues and hints",
  "type": "autonomous",
  "capabilities": [
    "natural_language_generation",
    "context_analysis", 
    "creative_writing",
    "hint_generation"
  ]
}
```

**Deployment Steps:**
1. Click "Create New Agent"
2. Select "Autonomous Agent" type
3. Upload or paste the agent configuration from: `agents/clue-generator/agent-config.json`
4. Configure environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   REDIS_URL=your_redis_connection_string
   ```
5. Set resource allocation:
   - CPU: 0.5 cores
   - Memory: 256Mi
   - Scaling: 1-5 replicas
6. Deploy and note the agent endpoint URL

---

#### **📱 Agent 2: QRManagerAgent**

**Configuration:**
```json
{
  "name": "QRManagerAgent",
  "version": "1.0.0",
  "description": "SmythOS agent for QR code generation, validation, and scan event handling", 
  "type": "reactive",
  "capabilities": [
    "qr_generation",
    "qr_validation",
    "scan_verification",
    "location_validation",
    "fraud_detection"
  ]
}
```

**Deployment Steps:**
1. Create "Reactive Agent" type
2. Upload configuration from: `agents/qr-manager/agent-config.json`
3. Configure webhook endpoints:
   ```
   /qr/generate - POST
   /qr/scan - POST  
   /qr/validate - GET
   ```
4. Set fraud detection rules and location validation
5. Deploy and configure webhook URLs in your platform

---

#### **💳 Agent 3: PaymentHandlerAgent**

**Configuration:**
```json
{
  "name": "PaymentHandlerAgent", 
  "version": "1.0.0",
  "description": "SmythOS agent for handling multi-gateway payment processing",
  "type": "transactional",
  "capabilities": [
    "payment_processing",
    "gateway_routing", 
    "fraud_prevention",
    "refund_handling",
    "subscription_management"
  ]
}
```

**Deployment Steps:**
1. Create "Transactional Agent" type
2. Upload configuration from: `agents/payment-handler/agent-config.json`
3. Configure payment gateway credentials:
   ```
   STRIPE_SECRET_KEY=your_stripe_key
   PAYPAL_CLIENT_ID=your_paypal_id
   PAYPAL_CLIENT_SECRET=your_paypal_secret
   MOLLIE_API_KEY=your_mollie_key
   ```
4. Enable PCI DSS compliance mode
5. Set up webhook endpoints for each gateway
6. Deploy with enhanced security settings

---

#### **📊 Agent 4: StatsAggregatorAgent**

**Configuration:**
```json
{
  "name": "StatsAggregatorAgent",
  "version": "1.0.0", 
  "description": "SmythOS agent for real-time analytics and statistics aggregation",
  "type": "analytical",
  "capabilities": [
    "data_aggregation",
    "real_time_analytics",
    "dashboard_generation", 
    "report_creation",
    "trend_analysis"
  ]
}
```

**Deployment Steps:**
1. Create "Analytical Agent" type
2. Upload configuration (create from template)
3. Configure data sources and metrics
4. Set up real-time data streaming
5. Deploy with dashboard endpoints

---

#### **📧 Agent 5: NotificationServiceAgent**

**Configuration:**
```json
{
  "name": "NotificationServiceAgent",
  "version": "1.0.0",
  "description": "SmythOS agent for email and push notification handling", 
  "type": "messaging",
  "capabilities": [
    "email_delivery",
    "push_notifications",
    "sms_messaging",
    "template_management",
    "delivery_tracking"
  ]
}
```

**Deployment Steps:**
1. Create "Messaging Agent" type
2. Upload configuration (create from template)
3. Configure SMTP and Firebase credentials:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   ```
4. Set up notification templates
5. Deploy with delivery tracking

---

## 🔗 **Step 3: Configure Agent Endpoints**

After deploying all agents, you'll receive endpoint URLs like:

```
https://agents.smythos.com/your-workspace/ClueGeneratorAgent
https://agents.smythos.com/your-workspace/QRManagerAgent  
https://agents.smythos.com/your-workspace/PaymentHandlerAgent
https://agents.smythos.com/your-workspace/StatsAggregatorAgent
https://agents.smythos.com/your-workspace/NotificationServiceAgent
```

**Update your platform configuration:**

1. **Edit your `.env` file:**
   ```bash
   # SmythOS Agent Endpoints
   CLUE_AGENT_URL=https://agents.smythos.com/your-workspace/ClueGeneratorAgent
   QR_AGENT_URL=https://agents.smythos.com/your-workspace/QRManagerAgent
   PAYMENT_AGENT_URL=https://agents.smythos.com/your-workspace/PaymentHandlerAgent
   STATS_AGENT_URL=https://agents.smythos.com/your-workspace/StatsAggregatorAgent
   NOTIFICATION_AGENT_URL=https://agents.smythos.com/your-workspace/NotificationServiceAgent
   ```

2. **Update Docker Compose:**
   Remove local agent containers and use cloud endpoints instead.

---

## 🔧 **Step 4: Configure Agent Communication**

### **Update Backend API to use SmythOS Endpoints:**

**Example API integration:**
```javascript
// backend/src/services/smythos-client.js
import axios from 'axios';

class SmythOSClient {
  constructor() {
    this.apiKey = process.env.SMYTHOS_API_KEY;
    this.baseHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async generateClue(shopInfo, difficulty = 3, theme = '', language = 'en') {
    try {
      const response = await axios.post(
        process.env.CLUE_AGENT_URL + '/generate-clue',
        {
          shop_info: shopInfo,
          difficulty_level: difficulty,
          theme: theme,
          language: language
        },
        { headers: this.baseHeaders }
      );
      return response.data;
    } catch (error) {
      console.error('Clue generation failed:', error);
      throw error;
    }
  }

  async generateQR(huntId, shopId, teamId, userId) {
    try {
      const response = await axios.post(
        process.env.QR_AGENT_URL + '/qr/generate',
        {
          action: 'generate',
          hunt_id: huntId,
          shop_id: shopId,
          team_id: teamId,
          user_id: userId
        },
        { headers: this.baseHeaders }
      );
      return response.data;
    } catch (error) {
      console.error('QR generation failed:', error);
      throw error;
    }
  }

  async processPayment(paymentData, gateway = 'auto') {
    try {
      const response = await axios.post(
        process.env.PAYMENT_AGENT_URL + '/payments/process',
        {
          action: 'charge',
          payment_data: paymentData,
          gateway_preference: gateway
        },
        { headers: this.baseHeaders }
      );
      return response.data;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }

  async sendNotification(type, recipient, template, data) {
    try {
      const response = await axios.post(
        process.env.NOTIFICATION_AGENT_URL + '/send',
        {
          type: type,
          recipient: recipient,
          template: template,
          data: data
        },
        { headers: this.baseHeaders }
      );
      return response.data;
    } catch (error) {
      console.error('Notification sending failed:', error);
      throw error;
    }
  }

  async getStats(huntId, filters = {}) {
    try {
      const response = await axios.get(
        process.env.STATS_AGENT_URL + `/stats/${huntId}`,
        { 
          headers: this.baseHeaders,
          params: filters
        }
      );
      return response.data;
    } catch (error) {
      console.error('Stats aggregation failed:', error);
      throw error;
    }
  }
}

export default new SmythOSClient();
```

---

## 📊 **Step 5: Monitoring & Management**

### **Agent Dashboard Access:**
- **Main Dashboard:** https://app.smythos.com/dashboard
- **Agent Metrics:** https://app.smythos.com/agents/metrics
- **Logs & Debugging:** https://app.smythos.com/agents/logs

### **Key Metrics to Monitor:**
- **Response Times:** <2 seconds per request
- **Success Rates:** >99% uptime 
- **Error Rates:** <1% failure rate
- **Scaling Events:** Auto-scaling triggers
- **Cost Usage:** API call consumption

### **Alerts Configuration:**
Set up alerts for:
- High error rates (>5%)
- Slow response times (>5 seconds)
- Agent failures or downtime
- High API usage approaching limits

---

## 🔐 **Step 6: Security & Best Practices**

### **Security Configuration:**
1. **API Key Management:**
   - Use separate keys for development/production
   - Rotate keys monthly
   - Store in secure environment variables

2. **Network Security:**
   - Configure IP whitelisting if needed
   - Use HTTPS for all communications
   - Implement proper authentication

3. **Data Privacy:**
   - Enable data encryption for sensitive operations
   - Configure GDPR compliance settings
   - Set up audit logging

### **Best Practices:**
- **Error Handling:** Implement retries and fallbacks
- **Rate Limiting:** Respect API limits and implement backoff
- **Caching:** Cache responses where appropriate
- **Monitoring:** Set up comprehensive logging and alerts

---

## 🧪 **Step 7: Testing Agent Deployment**

### **Test Each Agent:**

```bash
# Test Clue Generator
curl -X POST "https://agents.smythos.com/your-workspace/ClueGeneratorAgent/generate-clue" \
  -H "Authorization: Bearer YOUR_SMYTHOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_info": {
      "name": "Test Coffee Shop",
      "description": "Cozy local coffee shop",
      "fun_facts": ["Famous for latte art"],
      "special_features": ["Outdoor seating"]
    },
    "difficulty_level": 3
  }'

# Test QR Manager  
curl -X POST "https://agents.smythos.com/your-workspace/QRManagerAgent/qr/generate" \
  -H "Authorization: Bearer YOUR_SMYTHOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "hunt_id": "test-hunt-123",
    "shop_id": "test-shop-456", 
    "user_id": "test-user-789"
  }'

# Test other agents similarly...
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Agent Not Responding:**
   - Check agent status in SmythOS dashboard
   - Verify API key is valid
   - Check network connectivity

2. **Authentication Errors:**
   - Verify API key configuration
   - Check key permissions and scopes
   - Ensure proper header format

3. **High Latency:**
   - Check agent resource allocation
   - Consider increasing CPU/memory
   - Enable auto-scaling

4. **Configuration Errors:**
   - Validate JSON configuration syntax
   - Check required environment variables
   - Verify webhook endpoints

### **Support Resources:**
- **SmythOS Documentation:** https://docs.smythos.com
- **Agent API Reference:** https://docs.smythos.com/agents/api
- **Support Portal:** https://support.smythos.com
- **Community Forum:** https://community.smythos.com

---

## 📈 **Cost Optimization**

### **Usage Monitoring:**
- Track API call consumption
- Monitor resource usage patterns
- Set up billing alerts

### **Optimization Tips:**
- Cache frequently requested data
- Implement request batching where possible
- Use appropriate scaling settings
- Monitor and adjust resource allocation

---

## ✅ **Deployment Checklist**

- [ ] SmythOS account created and verified
- [ ] API key generated with proper permissions
- [ ] All 5 agents deployed successfully
- [ ] Environment variables configured
- [ ] Backend updated to use cloud endpoints
- [ ] Local agent containers removed/disabled
- [ ] Testing completed for all agents
- [ ] Monitoring and alerts configured
- [ ] Security settings properly configured
- [ ] Documentation updated with new endpoints

**🎉 Your SmythOS agents are now running in the cloud!**

The platform will now use SmythOS's managed infrastructure for all AI agent functionality, providing better reliability, scaling, and performance than local containers.