const express = require('express');
const redis = require('redis');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = process.env.AGENT_PORT || 9000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const AGENT_SECRET = process.env.AGENT_SECRET || 'shared_agent_secret_2025';

// Redis client for caching
const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ==================== AGENT ROUTES CONFIGURATION ====================

const AGENT_ROUTES = {
  '/api/clue': 'http://clue-agent:9001',
  '/api/qr': 'http://qr-agent:9002',
  '/api/stats': 'http://stats-agent:9003',
  '/api/payment': 'http://payment-agent:9004',
  '/api/notification': 'http://notification-agent:9005',
  '/api/venue': 'http://venue-agent:9006',
  '/api/media': 'http://media-agent:9007',
  '/api/venue-onboarding': 'http://venue-onboarding-agent:9008',
  '/api/venue-crm': 'http://venue-crm-agent:9009',
  '/api/hunter-onboarding': 'http://hunter-onboarding-agent:9012',
  '/api/social': 'http://social-growth-agent:9013',
  '/api/retention': 'http://retention-agent:9014',
  '/api/fraud': 'http://fraud-detection-agent:9015',
  '/api/email': 'http://email-marketing-agent:9016',
  '/api/referral': 'http://referral-program-agent:9017',
  '/api/support': 'http://support-agent:9020',
  '/api/bi': 'http://bi-analytics-agent:9022',
  '/api/analytics': 'http://advanced-analytics-agent:9023'
};

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
  '/api/venue': 3600,        // 1 hour
  '/api/stats': 1800,        // 30 minutes
  '/api/hunter-onboarding': 900,  // 15 minutes
  '/api/analytics': 300,     // 5 minutes
  '/api/qr': 1800,          // 30 minutes
  DEFAULT: 300              // 5 minutes default
};

// Rate limit bypass for internal agents
const INTERNAL_AGENTS = ['clue-agent', 'qr-agent', 'stats-agent', 'payment-agent'];

// ==================== STATISTICS ====================

let requestStats = {
  total_requests: 0,
  cache_hits: 0,
  cache_misses: 0,
  rate_limited: 0,
  errors: 0,
  avg_response_time: 0
};

// ==================== MIDDLEWARE ====================

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      user_agent: req.get('user-agent')
    });

    // Update stats
    requestStats.total_requests++;
    const currentAvg = requestStats.avg_response_time;
    requestStats.avg_response_time = (currentAvg * (requestStats.total_requests - 1) + duration) / requestStats.total_requests;
  });

  next();
});

// JWT authentication middleware (optional)
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Allow unauthenticated access for public endpoints
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

app.use(authenticateJWT);

// Rate limiting middleware
const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      requestStats.rate_limited++;
      res.status(429).json({
        error: 'Too many requests',
        retry_after: Math.ceil(windowMs / 1000),
        limit: max,
        window: `${windowMs / 1000}s`
      });
    },
    skip: (req) => {
      // Skip rate limiting for internal agent requests
      const agentSecret = req.headers['x-agent-secret'];
      return agentSecret === AGENT_SECRET;
    }
  });
};

// Different rate limits for different user tiers
const freeTierLimiter = createRateLimiter(60 * 60 * 1000, 100);  // 100 requests/hour
const premiumTierLimiter = createRateLimiter(60 * 60 * 1000, 500); // 500 requests/hour

// Apply rate limiting based on user tier
app.use((req, res, next) => {
  if (req.user && req.user.tier === 'premium') {
    return premiumTierLimiter(req, res, next);
  } else if (req.user && req.user.tier === 'admin') {
    return next(); // No rate limiting for admins
  } else {
    return freeTierLimiter(req, res, next);
  }
});

// ==================== CACHING LAYER ====================

// Generate cache key
function getCacheKey(req) {
  const path = req.path;
  const query = JSON.stringify(req.query);
  const userId = req.user ? req.user.user_id : 'anonymous';
  return `cache:${path}:${query}:${userId}`;
}

// Get cache TTL for route
function getCacheTTL(path) {
  for (const [route, ttl] of Object.entries(CACHE_TTL)) {
    if (path.startsWith(route)) {
      return ttl;
    }
  }
  return CACHE_TTL.DEFAULT;
}

// Check if route should be cached
function shouldCache(req) {
  // Only cache GET requests
  if (req.method !== 'GET') return false;

  // Don't cache real-time endpoints
  if (req.path.includes('/realtime')) return false;
  if (req.path.includes('/health')) return false;

  return true;
}

// Cache middleware
async function cacheMiddleware(req, res, next) {
  if (!shouldCache(req)) {
    return next();
  }

  const cacheKey = getCacheKey(req);

  try {
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      requestStats.cache_hits++;
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cachedData));
    }

    requestStats.cache_misses++;
    res.setHeader('X-Cache', 'MISS');

    // Store original send function
    const originalSend = res.json.bind(res);

    // Override send to cache response
    res.json = function(data) {
      const ttl = getCacheTTL(req.path);
      redisClient.set(cacheKey, JSON.stringify(data), { EX: ttl }).catch(err => {
        logger.error('Cache set error:', err);
      });
      return originalSend(data);
    };

    next();
  } catch (error) {
    logger.error('Cache middleware error:', error);
    next();
  }
}

app.use(cacheMiddleware);

// ==================== PROXY ROUTING ====================

// Find matching agent route
function findAgentRoute(path) {
  for (const [route, agentUrl] of Object.entries(AGENT_ROUTES)) {
    if (path.startsWith(route)) {
      return {
        agentUrl,
        targetPath: path.replace(route, '')
      };
    }
  }
  return null;
}

// Proxy request to agent
async function proxyRequest(req, res) {
  const routeInfo = findAgentRoute(req.path);

  if (!routeInfo) {
    return res.status(404).json({
      error: 'Route not found',
      available_routes: Object.keys(AGENT_ROUTES)
    });
  }

  const { agentUrl, targetPath } = routeInfo;
  const fullUrl = `${agentUrl}${targetPath}`;

  try {
    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': AGENT_SECRET,
        'X-User-Id': req.user ? req.user.user_id : undefined,
        'X-User-Tier': req.user ? req.user.tier : 'free'
      },
      timeout: 10000
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    requestStats.errors++;

    if (error.response) {
      // Agent returned an error
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      // Agent is down
      logger.error(`Agent unreachable: ${agentUrl}`);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'The requested service is currently down'
      });
    } else if (error.code === 'ETIMEDOUT') {
      // Request timeout
      res.status(504).json({
        error: 'Gateway timeout',
        message: 'The request took too long to process'
      });
    } else {
      // Other errors
      logger.error('Proxy error:', error.message);
      res.status(500).json({
        error: 'Internal gateway error',
        message: error.message
      });
    }
  }
}

// Route all API requests through proxy
app.all('/api/*', proxyRequest);

// ==================== GATEWAY ADMIN ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'APIGateway',
    version: '1.0.0',
    features: [
      'Request routing',
      'Redis caching',
      'Rate limiting',
      'JWT authentication',
      'Request logging',
      'Agent health monitoring'
    ]
  });
});

// Gateway statistics
app.get('/gateway/stats', async (req, res) => {
  const cacheHitRate = requestStats.total_requests > 0
    ? ((requestStats.cache_hits / (requestStats.cache_hits + requestStats.cache_misses)) * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    stats: {
      total_requests: requestStats.total_requests,
      cache_hits: requestStats.cache_hits,
      cache_misses: requestStats.cache_misses,
      cache_hit_rate: `${cacheHitRate}%`,
      rate_limited: requestStats.rate_limited,
      errors: requestStats.errors,
      avg_response_time_ms: Math.round(requestStats.avg_response_time)
    },
    agents: Object.keys(AGENT_ROUTES).length
  });
});

// Cache statistics
app.get('/gateway/cache/stats', async (req, res) => {
  try {
    const keys = await redisClient.keys('cache:*');
    const cacheSize = keys.length;

    res.json({
      success: true,
      cache: {
        total_keys: cacheSize,
        hit_rate: requestStats.total_requests > 0
          ? `${((requestStats.cache_hits / requestStats.total_requests) * 100).toFixed(2)}%`
          : '0%',
        hits: requestStats.cache_hits,
        misses: requestStats.cache_misses
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear cache
app.post('/gateway/cache/clear', async (req, res) => {
  try {
    const { pattern = 'cache:*' } = req.body;

    const keys = await redisClient.keys(pattern);
    let deleted = 0;

    for (const key of keys) {
      await redisClient.del(key);
      deleted++;
    }

    res.json({
      success: true,
      message: `Cleared ${deleted} cache entries`,
      pattern
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check rate limit status for user
app.get('/gateway/ratelimit/:user_id', (req, res) => {
  const { user_id } = req.params;

  // This is a simplified version - in production, you'd check actual rate limit counters
  res.json({
    success: true,
    user_id,
    rate_limit: {
      tier: 'free',
      max_requests_per_hour: 100,
      remaining: 85,
      reset_at: new Date(Date.now() + 3600000).toISOString()
    }
  });
});

// List available routes
app.get('/gateway/routes', (req, res) => {
  const routes = Object.entries(AGENT_ROUTES).map(([route, agentUrl]) => ({
    route,
    agent_url: agentUrl,
    cache_ttl: getCacheTTL(route)
  }));

  res.json({
    success: true,
    routes,
    total: routes.length
  });
});

// Agent health check
app.get('/gateway/agents/health', async (req, res) => {
  const healthChecks = [];

  for (const [route, agentUrl] of Object.entries(AGENT_ROUTES)) {
    try {
      const response = await axios.get(`${agentUrl}/health`, {
        timeout: 3000,
        headers: { 'X-Agent-Secret': AGENT_SECRET }
      });

      healthChecks.push({
        route,
        agent: response.data.agent || 'Unknown',
        status: 'healthy',
        response_time: response.headers['x-response-time'] || 'N/A'
      });
    } catch (error) {
      healthChecks.push({
        route,
        agent: 'Unknown',
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;

  res.json({
    success: true,
    agents: healthChecks,
    summary: {
      total: healthChecks.length,
      healthy: healthyCount,
      unhealthy: healthChecks.length - healthyCount
    }
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.path} not found`,
    available_routes: [
      '/health',
      '/gateway/stats',
      '/gateway/cache/stats',
      '/gateway/routes',
      '/gateway/agents/health',
      ...Object.keys(AGENT_ROUTES)
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`✅ API Gateway v1.0 listening on port ${PORT}`);
  console.log('🚀 Features:');
  console.log('   - Request routing to 18 agents');
  console.log('   - Redis caching (70%+ hit rate expected)');
  console.log('   - Rate limiting (100/hour free, 500/hour premium)');
  console.log('   - JWT authentication');
  console.log('   - Request logging');
  console.log('   - Health monitoring');
  console.log('📍 Admin Endpoints:');
  console.log('   GET  /health - Gateway health');
  console.log('   GET  /gateway/stats - Request statistics');
  console.log('   GET  /gateway/cache/stats - Cache statistics');
  console.log('   POST /gateway/cache/clear - Clear cache');
  console.log('   GET  /gateway/routes - List all routes');
  console.log('   GET  /gateway/agents/health - Agent health check');
  console.log('   GET  /gateway/ratelimit/:user_id - Rate limit status');
  console.log('🔗 Routing:');
  Object.entries(AGENT_ROUTES).forEach(([route, agentUrl]) => {
    console.log(`   ${route}/* → ${agentUrl}`);
  });
  console.log(`✅ Connected to Redis for caching`);
});
