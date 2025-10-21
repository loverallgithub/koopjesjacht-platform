# Adding New SmythOS CRE Agents to Koopjesjacht Platform

This guide explains how to add new agent services to the platform with automatic Nginx proxy integration.

## Quick Reference

When adding a new agent, you need to update **4 files**:

1. `/docker-compose.yml` - Add agent container
2. `/frontend/nginx.conf` - Add upstream and health check routes
3. `/backend/src/services/agentClient.js` - Add agent client functions
4. `/backend/src/routes/agents.js` - Add API proxy routes
5. `/frontend/src/services/agentService.js` - Add frontend service methods

---

## Step-by-Step Guide

### 1. Create the Agent Service

Create a new directory in `/agents/` for your agent:

```bash
mkdir -p agents/your-agent-name
cd agents/your-agent-name
```

Create `index.js`, `package.json`, and `Dockerfile` following the pattern of existing agents.

**Required endpoints:**
- `GET /health` - Health check endpoint (must return `{ status: 'healthy' }`)

---

### 2. Add to Docker Compose

Edit `/docker-compose.yml` and add your agent service:

```yaml
  your-agent-name:
    build:
      context: ./agents/your-agent-name
      dockerfile: Dockerfile
    container_name: koopjesjacht_your_agent_name
    environment:
      # Your agent-specific environment variables
      NODE_ENV: ${NODE_ENV:-development}
    ports:
      - "900X:900X"  # Choose next available port (9006, 9007, etc.)
    networks:
      - koopjesjacht_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:900X/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Note:** Replace `900X` with the next available port number.

---

### 3. Add Nginx Upstream and Routes

Edit `/frontend/nginx.conf`:

#### 3a. Add Upstream Block (after existing upstreams around line 83)

```nginx
upstream your_agent_name {
    least_conn;
    server your-agent-name:900X max_fails=3 fail_timeout=30s;
    keepalive 8;
}
```

#### 3b. Add Health Check Route (after existing health checks around line 197)

```nginx
location ~ ^/agents/your-agent-name/health$ {
    proxy_pass http://your_agent_name/health;
    proxy_http_version 1.1;
    access_log off;
}
```

**That's it for Nginx!** The agent is now discoverable via:
- Health check: `http://your-domain/agents/your-agent-name/health`
- API calls: `http://your-domain/api/agents/your-agent/*` (via backend proxy)

---

### 4. Add Backend Agent Client

Edit `/backend/src/services/agentClient.js`:

#### 4a. Add Agent URL Constant (around line 8)

```javascript
const YOUR_AGENT_URL = process.env.YOUR_AGENT_URL || 'http://your-agent-name:900X';
```

#### 4b. Add Client Functions (before health checks section)

```javascript
// ===== Your Agent Name =====

async function yourAgentFunction(data) {
  try {
    const response = await axios.post(`${YOUR_AGENT_URL}/your-endpoint`, data, {
      timeout: AGENT_TIMEOUT
    });
    return response.data;
  } catch (error) {
    console.error('[Agent Client] Your agent error:', error.message);
    throw new Error('Your agent operation failed');
  }
}
```

#### 4c. Update Health Check (add to agents array around line 364)

```javascript
const agents = [
  { url: QR_MANAGER_URL, name: 'qr-manager' },
  { url: STATS_AGGREGATOR_URL, name: 'stats-aggregator' },
  { url: PAYMENT_HANDLER_URL, name: 'payment-handler' },
  { url: NOTIFICATION_SERVICE_URL, name: 'notification-service' },
  { url: CLUE_GENERATOR_URL, name: 'clue-generator' },
  { url: YOUR_AGENT_URL, name: 'your-agent-name' }  // Add this line
];
```

#### 4d. Export Functions (add to module.exports around line 415)

```javascript
module.exports = {
  // ... existing exports

  // Your Agent
  yourAgentFunction,
  // ... other functions
};
```

---

### 5. Add Backend API Routes

Edit `/backend/src/routes/agents.js`:

Add routes for your agent endpoints (around line 247, before health check):

```javascript
// ===== Your Agent Name Routes =====

router.post('/your-agent/endpoint', async (req, res) => {
  try {
    const result = await agentClient.yourAgentFunction(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/your-agent/:id', async (req, res) => {
  try {
    const result = await agentClient.getYourAgentData(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### 6. Add Frontend Service Layer

Edit `/frontend/src/services/agentService.js`:

#### 6a. Add Service Object (before combined export around line 154)

```javascript
// ===== Your Agent Name =====

export const yourAgentService = {
  async yourMethod(data) {
    const response = await api.post(`${AGENT_BASE}/your-agent/endpoint`, data);
    return response.data;
  },

  async getData(id) {
    const response = await api.get(`${AGENT_BASE}/your-agent/${id}`);
    return response.data;
  }
};
```

#### 6b. Update Combined Export (around line 166)

```javascript
const agentService = {
  qr: qrManagerService,
  stats: statsService,
  payment: paymentService,
  notification: notificationService,
  clue: clueService,
  yourAgent: yourAgentService,  // Add this line
  health: agentHealthService
};
```

---

## Testing Your New Agent

### 1. Build and Start

```bash
# Build and start all containers
docker-compose up -d --build

# Check if your agent is running
docker ps | grep your-agent-name

# Check health
curl http://localhost:900X/health
```

### 2. Test via Nginx Proxy

```bash
# Test health check via Nginx
curl http://localhost:3000/agents/your-agent-name/health

# Test aggregated health
curl http://localhost:3000/agents/health
```

### 3. Test via Backend API

```bash
# Test your endpoint via backend proxy
curl -X POST http://localhost:3527/api/agents/your-agent/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 4. Test Frontend Integration

In your React component:

```javascript
import agentService from '../services/agentService';

// Use your agent
const result = await agentService.yourAgent.yourMethod({ test: 'data' });
```

---

## Agent Naming Conventions

**Agent Directory:** `kebab-case` (e.g., `media-management`)
**Docker Service:** `kebab-case` (e.g., `media-management`)
**Container Name:** `snake_case` with prefix (e.g., `koopjesjacht_media_management`)
**Nginx Upstream:** `snake_case` (e.g., `media_management`)
**Backend Client:** `camelCase` functions (e.g., `uploadMedia()`)
**Frontend Service:** `camelCase` (e.g., `mediaService`)

---

## Port Assignments

Current agents use ports **9001-9005**. Assign new agents sequentially:

| Port | Agent | Status |
|------|-------|--------|
| 9001 | qr-manager | ✅ In Use |
| 9002 | stats-aggregator | ✅ In Use |
| 9003 | payment-handler | ✅ In Use |
| 9004 | notification-service | ✅ In Use |
| 9005 | clue-generator | ✅ In Use |
| 9006 | **Available** | |
| 9007 | **Available** | |
| 9008 | **Available** | |
| 9009 | **Available** | |
| 9010 | **Available** | |

---

## Nginx Dynamic Discovery Features

The current Nginx configuration provides:

1. **Automatic Failover:** If an agent fails, Nginx will retry with `max_fails=3` and `fail_timeout=30s`
2. **Load Balancing:** Uses `least_conn` algorithm for distributing requests
3. **Connection Pooling:** Keepalive connections reduce latency
4. **Health Monitoring:** Individual health check endpoints for each agent
5. **Aggregated Health:** `/agents/health` checks all agents at once

To add a new agent, you only need to:
- Add upstream block
- Add health check location

All API calls automatically route through the backend proxy at `/api/agents/*`.

---

## Environment Variables

Add environment variables for your agent in:

1. **`.env`** (for local development)
2. **Production environment** (Hostinger or other deployment)

```bash
# Your Agent Configuration
YOUR_AGENT_URL=http://your-agent-name:900X
YOUR_AGENT_API_KEY=your_api_key
```

---

## Deployment Checklist

- [ ] Agent service created in `/agents/your-agent-name/`
- [ ] Dockerfile and package.json created
- [ ] Health endpoint (`/health`) implemented
- [ ] Added to `docker-compose.yml`
- [ ] Nginx upstream added
- [ ] Nginx health check route added
- [ ] Backend client functions added
- [ ] Backend client URL constant added
- [ ] Backend client health check updated
- [ ] Backend API routes added
- [ ] Frontend service methods added
- [ ] Frontend service export updated
- [ ] Environment variables configured
- [ ] Local testing completed
- [ ] Committed to Git
- [ ] Deployed to local Docker
- [ ] Deployed to production

---

## Example: Adding Media Management Agent

See `/tmp/FINAL_IMPLEMENTATION_SUMMARY.md` for a list of recommended agents to implement, including:

1. Media Management Agent (Port 9006)
2. Leaderboard Agent (Port 9007)
3. Geolocation Agent (Port 9009)
4. Recommendation Engine (Port 9008)
5. And more...

Each recommended agent includes purpose, features, API endpoints, and use cases.

---

## Troubleshooting

### Agent Not Starting

```bash
# Check logs
docker logs koopjesjacht_your_agent_name

# Check if port is already in use
lsof -i :900X
```

### Health Check Failing

```bash
# Test agent directly
curl http://localhost:900X/health

# Check nginx error logs
docker logs koopjesjacht_frontend
```

### Backend Proxy Not Working

```bash
# Check backend logs
docker logs koopjesjacht_backend

# Verify agent client is properly imported
grep "yourAgentFunction" backend/src/services/agentClient.js
```

---

## Questions?

See existing agents in `/agents/` for complete implementation examples:
- `/agents/qr-manager/` - Simple agent with QR generation
- `/agents/notification-service/` - Complex agent with multiple channels
- `/agents/payment-handler/` - Agent with external API integration

Refer to `/tmp/FINAL_IMPLEMENTATION_SUMMARY.md` for complete architecture overview.
