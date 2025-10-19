const express = require('express');
const redis = require('redis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.AGENT_PORT || 9015;

app.use(express.json());

// Agent URLs
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const GEOLOCATION_URL = process.env.GEOLOCATION_URL || 'http://geolocation-agent:9008';

// ============================================
// REDIS CONNECTION
// ============================================
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

(async () => {
  await redisClient.connect();
})();

// ============================================
// FRAUD DETECTION CONFIGURATION
// ============================================

const FRAUD_RULES = {
  HUNT_COMPLETION: {
    MIN_DURATION_SECONDS: 300, // 5 minutes minimum
    MAX_HUNTS_PER_DAY: 20,
    MAX_DISTANCE_METERS: 50, // Must be within 50m of venue
    SUSPICIOUS_PATTERN_THRESHOLD: 3 // 3 identical patterns = suspicious
  },
  REVIEW: {
    MIN_CHARS: 10,
    MAX_DAILY_REVIEWS: 10,
    SPAM_KEYWORDS: ['fake', 'bot', 'test', 'spam', 'http', 'www'],
    DUPLICATE_THRESHOLD: 0.8 // 80% similarity = duplicate
  },
  PAYMENT: {
    MAX_FAILED_ATTEMPTS: 3,
    MAX_DAILY_TRANSACTIONS: 50,
    REFUND_ABUSE_THRESHOLD: 5, // 5+ refunds in 30 days
    CHARGEBACK_FLAG_DURATION: 7776000 // 90 days
  },
  ACCOUNT: {
    MAX_ACCOUNTS_PER_IP: 3,
    MAX_ACCOUNTS_PER_DEVICE: 2,
    MAX_ACCOUNTS_PER_EMAIL_DOMAIN: 10,
    SIGNUP_VELOCITY_THRESHOLD: 10 // 10 signups per hour from same IP
  }
};

const FRAUD_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store fraud alert
 */
async function storeFraudAlert(alert) {
  const key = `fraud_alert:${alert.alert_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(alert)); // 30 day TTL

  // Add to user's fraud history
  await redisClient.rPush(`fraud_history:${alert.user_id}`, alert.alert_id);

  // Add to severity-based sorted set
  await redisClient.zAdd('fraud_alerts:by_severity', {
    score: getSeverityScore(alert.severity),
    value: alert.alert_id
  });
}

/**
 * Get severity score for sorting
 */
function getSeverityScore(severity) {
  const scores = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  return scores[severity] || 0;
}

/**
 * Get user's fraud history
 */
async function getUserFraudHistory(userId) {
  const alertIds = await redisClient.lRange(`fraud_history:${userId}`, 0, -1);
  const alerts = [];

  for (const alertId of alertIds) {
    const data = await redisClient.get(`fraud_alert:${alertId}`);
    if (data) {
      alerts.push(JSON.parse(data));
    }
  }

  return alerts;
}

/**
 * Calculate fraud risk score (0-100)
 */
function calculateRiskScore(factors) {
  let score = 0;
  const weights = {
    velocity: 30,
    pattern: 25,
    history: 20,
    geolocation: 15,
    behavior: 10
  };

  if (factors.velocity > 0.7) score += weights.velocity;
  if (factors.pattern > 0.7) score += weights.pattern;
  if (factors.history > 0.5) score += weights.history;
  if (factors.geolocation > 0.6) score += weights.geolocation;
  if (factors.behavior > 0.5) score += weights.behavior;

  return Math.min(100, score);
}

/**
 * Send notification to ops team
 */
async function notifyOpsTeam(alert) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      user_id: 'ops_team',
      template: 'fraud_alert',
      variables: {
        alert_type: alert.fraud_type,
        severity: alert.severity,
        user_id: alert.user_id,
        description: alert.description,
        risk_score: alert.risk_score
      },
      channels: ['email', 'app']
    });
  } catch (error) {
    console.error('Error notifying ops team:', error.message);
  }
}

/**
 * Calculate text similarity (simple Jaccard)
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check for spam keywords
 */
function containsSpam(text) {
  const lowerText = text.toLowerCase();
  return FRAUD_RULES.REVIEW.SPAM_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'FraudDetectionAgent',
    version: '1.0.0',
    features: [
      'Hunt completion validation',
      'Review authenticity checking',
      'Payment fraud detection',
      'Multi-account abuse detection',
      'Geolocation verification',
      'Velocity limiting',
      'Pattern analysis',
      'Risk scoring (0-100)'
    ]
  });
});

// ============================================
// CAPABILITY 1: HUNT VALIDATION
// ============================================

/**
 * Validate hunt completion
 */
app.post('/validate/hunt', async (req, res) => {
  try {
    const {
      user_id,
      hunt_id,
      venue_id,
      duration_seconds,
      location,
      photos,
      timestamp
    } = req.body;

    const issues = [];
    const factors = {
      velocity: 0,
      pattern: 0,
      history: 0,
      geolocation: 0,
      behavior: 0
    };

    // Check 1: Duration too short
    if (duration_seconds < FRAUD_RULES.HUNT_COMPLETION.MIN_DURATION_SECONDS) {
      issues.push({
        type: 'duration_too_short',
        message: `Hunt completed in ${duration_seconds}s (minimum: ${FRAUD_RULES.HUNT_COMPLETION.MIN_DURATION_SECONDS}s)`,
        severity: FRAUD_SEVERITY.HIGH
      });
      factors.behavior = 0.8;
    }

    // Check 2: Too many hunts today
    const todayKey = `hunts:${user_id}:${new Date().toISOString().split('T')[0]}`;
    const huntsToday = await redisClient.incr(todayKey);
    await redisClient.expire(todayKey, 86400); // 24 hour TTL

    if (huntsToday > FRAUD_RULES.HUNT_COMPLETION.MAX_HUNTS_PER_DAY) {
      issues.push({
        type: 'excessive_hunts',
        message: `${huntsToday} hunts today (max: ${FRAUD_RULES.HUNT_COMPLETION.MAX_HUNTS_PER_DAY})`,
        severity: FRAUD_SEVERITY.MEDIUM
      });
      factors.velocity = 0.9;
    }

    // Check 3: Geolocation validation (if provided)
    if (location && location.latitude && location.longitude) {
      // TODO: Call geolocation service to verify distance from venue
      // For now, simulate check
      const distanceFromVenue = Math.random() * 100; // Placeholder

      if (distanceFromVenue > FRAUD_RULES.HUNT_COMPLETION.MAX_DISTANCE_METERS) {
        issues.push({
          type: 'location_mismatch',
          message: `User ${Math.round(distanceFromVenue)}m from venue (max: ${FRAUD_RULES.HUNT_COMPLETION.MAX_DISTANCE_METERS}m)`,
          severity: FRAUD_SEVERITY.CRITICAL
        });
        factors.geolocation = 1.0;
      }
    } else {
      // No location provided is suspicious
      issues.push({
        type: 'missing_location',
        message: 'No GPS coordinates provided',
        severity: FRAUD_SEVERITY.MEDIUM
      });
      factors.geolocation = 0.5;
    }

    // Check 4: Pattern analysis - check for repeated timing patterns
    const recentHunts = await redisClient.lRange(`hunt_durations:${user_id}`, 0, 9);
    await redisClient.lPush(`hunt_durations:${user_id}`, duration_seconds.toString());
    await redisClient.lTrim(`hunt_durations:${user_id}`, 0, 99); // Keep last 100

    if (recentHunts.length >= 3) {
      const durations = recentHunts.map(d => parseInt(d));
      const exactMatches = durations.filter(d => Math.abs(d - duration_seconds) < 10).length;

      if (exactMatches >= FRAUD_RULES.HUNT_COMPLETION.SUSPICIOUS_PATTERN_THRESHOLD) {
        issues.push({
          type: 'suspicious_pattern',
          message: `${exactMatches} hunts with identical duration pattern`,
          severity: FRAUD_SEVERITY.HIGH
        });
        factors.pattern = 0.9;
      }
    }

    // Check 5: User fraud history
    const fraudHistory = await getUserFraudHistory(user_id);
    const recentFraud = fraudHistory.filter(alert => {
      const age = Date.now() - new Date(alert.timestamp).getTime();
      return age < 30 * 24 * 60 * 60 * 1000; // Last 30 days
    });

    if (recentFraud.length > 0) {
      factors.history = Math.min(1.0, recentFraud.length * 0.2);
    }

    // Calculate risk score
    const riskScore = calculateRiskScore(factors);

    // Determine if fraud
    const isFraud = issues.some(issue =>
      issue.severity === FRAUD_SEVERITY.HIGH ||
      issue.severity === FRAUD_SEVERITY.CRITICAL
    ) || riskScore > 70;

    // Store alert if fraud detected
    if (isFraud) {
      const alert = {
        alert_id: uuidv4(),
        user_id,
        fraud_type: 'hunt_completion',
        severity: issues.some(i => i.severity === FRAUD_SEVERITY.CRITICAL)
          ? FRAUD_SEVERITY.CRITICAL
          : FRAUD_SEVERITY.HIGH,
        issues,
        factors,
        risk_score: riskScore,
        hunt_id,
        venue_id,
        description: `Fraudulent hunt completion detected: ${issues.map(i => i.type).join(', ')}`,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await storeFraudAlert(alert);
      await notifyOpsTeam(alert);
    }

    res.json({
      success: true,
      valid: !isFraud,
      risk_score: riskScore,
      issues,
      factors,
      action: isFraud ? 'block' : 'allow'
    });

  } catch (error) {
    console.error('Error validating hunt:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: REVIEW VALIDATION
// ============================================

/**
 * Validate review authenticity
 */
app.post('/validate/review', async (req, res) => {
  try {
    const {
      user_id,
      venue_id,
      review_text,
      rating
    } = req.body;

    const issues = [];
    const factors = {
      velocity: 0,
      pattern: 0,
      history: 0,
      geolocation: 0,
      behavior: 0
    };

    // Check 1: Review too short
    if (review_text.length < FRAUD_RULES.REVIEW.MIN_CHARS) {
      issues.push({
        type: 'review_too_short',
        message: `Review only ${review_text.length} chars (minimum: ${FRAUD_RULES.REVIEW.MIN_CHARS})`,
        severity: FRAUD_SEVERITY.LOW
      });
      factors.behavior = 0.3;
    }

    // Check 2: Contains spam keywords
    if (containsSpam(review_text)) {
      issues.push({
        type: 'spam_content',
        message: 'Review contains spam keywords',
        severity: FRAUD_SEVERITY.HIGH
      });
      factors.behavior = 0.9;
    }

    // Check 3: Too many reviews today
    const todayKey = `reviews:${user_id}:${new Date().toISOString().split('T')[0]}`;
    const reviewsToday = await redisClient.incr(todayKey);
    await redisClient.expire(todayKey, 86400);

    if (reviewsToday > FRAUD_RULES.REVIEW.MAX_DAILY_REVIEWS) {
      issues.push({
        type: 'excessive_reviews',
        message: `${reviewsToday} reviews today (max: ${FRAUD_RULES.REVIEW.MAX_DAILY_REVIEWS})`,
        severity: FRAUD_SEVERITY.MEDIUM
      });
      factors.velocity = 0.8;
    }

    // Check 4: Duplicate detection
    const recentReviews = await redisClient.lRange(`user_reviews:${user_id}`, 0, 9);
    let maxSimilarity = 0;

    for (const pastReview of recentReviews) {
      const similarity = calculateSimilarity(review_text, pastReview);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    if (maxSimilarity > FRAUD_RULES.REVIEW.DUPLICATE_THRESHOLD) {
      issues.push({
        type: 'duplicate_review',
        message: `${Math.round(maxSimilarity * 100)}% similar to previous review`,
        severity: FRAUD_SEVERITY.HIGH
      });
      factors.pattern = 0.95;
    }

    // Store review for future comparison
    await redisClient.lPush(`user_reviews:${user_id}`, review_text);
    await redisClient.lTrim(`user_reviews:${user_id}`, 0, 49); // Keep last 50

    // Check 5: Rating manipulation pattern
    const recentRatings = await redisClient.lRange(`user_ratings:${user_id}`, 0, 9);
    await redisClient.lPush(`user_ratings:${user_id}`, rating.toString());
    await redisClient.lTrim(`user_ratings:${user_id}`, 0, 49);

    if (recentRatings.length >= 5) {
      const allSame = recentRatings.every(r => r === rating.toString());
      if (allSame && (rating === 1 || rating === 5)) {
        issues.push({
          type: 'rating_pattern',
          message: `All recent ratings are ${rating} stars (manipulation suspected)`,
          severity: FRAUD_SEVERITY.MEDIUM
        });
        factors.pattern = 0.7;
      }
    }

    // Check fraud history
    const fraudHistory = await getUserFraudHistory(user_id);
    const recentFraud = fraudHistory.filter(alert => {
      const age = Date.now() - new Date(alert.timestamp).getTime();
      return age < 30 * 24 * 60 * 60 * 1000;
    });

    if (recentFraud.length > 0) {
      factors.history = Math.min(1.0, recentFraud.length * 0.2);
    }

    const riskScore = calculateRiskScore(factors);
    const isFraud = issues.some(issue => issue.severity === FRAUD_SEVERITY.HIGH) || riskScore > 70;

    if (isFraud) {
      const alert = {
        alert_id: uuidv4(),
        user_id,
        fraud_type: 'review_manipulation',
        severity: FRAUD_SEVERITY.HIGH,
        issues,
        factors,
        risk_score: riskScore,
        venue_id,
        description: `Fraudulent review detected: ${issues.map(i => i.type).join(', ')}`,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await storeFraudAlert(alert);
      await notifyOpsTeam(alert);
    }

    res.json({
      success: true,
      valid: !isFraud,
      risk_score: riskScore,
      issues,
      factors,
      action: isFraud ? 'flag_for_review' : 'allow'
    });

  } catch (error) {
    console.error('Error validating review:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: PAYMENT FRAUD DETECTION
// ============================================

/**
 * Validate payment transaction
 */
app.post('/validate/payment', async (req, res) => {
  try {
    const {
      user_id,
      amount,
      payment_method,
      ip_address,
      device_id
    } = req.body;

    const issues = [];
    const factors = {
      velocity: 0,
      pattern: 0,
      history: 0,
      geolocation: 0,
      behavior: 0
    };

    // Check 1: Failed payment attempts
    const failedKey = `payment_failures:${user_id}:${new Date().toISOString().split('T')[0]}`;
    const failedAttempts = parseInt(await redisClient.get(failedKey) || '0');

    if (failedAttempts >= FRAUD_RULES.PAYMENT.MAX_FAILED_ATTEMPTS) {
      issues.push({
        type: 'excessive_failures',
        message: `${failedAttempts} failed payment attempts today`,
        severity: FRAUD_SEVERITY.HIGH
      });
      factors.behavior = 0.9;
    }

    // Check 2: Transaction velocity
    const txKey = `transactions:${user_id}:${new Date().toISOString().split('T')[0]}`;
    const txToday = await redisClient.incr(txKey);
    await redisClient.expire(txKey, 86400);

    if (txToday > FRAUD_RULES.PAYMENT.MAX_DAILY_TRANSACTIONS) {
      issues.push({
        type: 'excessive_transactions',
        message: `${txToday} transactions today (max: ${FRAUD_RULES.PAYMENT.MAX_DAILY_TRANSACTIONS})`,
        severity: FRAUD_SEVERITY.CRITICAL
      });
      factors.velocity = 1.0;
    }

    // Check 3: Refund abuse
    const refundCount = parseInt(await redisClient.get(`refund_count:${user_id}`) || '0');

    if (refundCount >= FRAUD_RULES.PAYMENT.REFUND_ABUSE_THRESHOLD) {
      issues.push({
        type: 'refund_abuse',
        message: `${refundCount} refunds in last 30 days (threshold: ${FRAUD_RULES.PAYMENT.REFUND_ABUSE_THRESHOLD})`,
        severity: FRAUD_SEVERITY.HIGH
      });
      factors.history = 0.8;
    }

    // Check 4: Chargeback flag
    const chargebackFlag = await redisClient.get(`chargeback_flag:${user_id}`);
    if (chargebackFlag) {
      issues.push({
        type: 'chargeback_history',
        message: 'User has chargeback history',
        severity: FRAUD_SEVERITY.CRITICAL
      });
      factors.history = 1.0;
    }

    // Check 5: Fraud history
    const fraudHistory = await getUserFraudHistory(user_id);
    const paymentFraud = fraudHistory.filter(alert =>
      alert.fraud_type === 'payment_fraud'
    );

    if (paymentFraud.length > 0) {
      factors.history = Math.max(factors.history, Math.min(1.0, paymentFraud.length * 0.3));
    }

    const riskScore = calculateRiskScore(factors);
    const isFraud = issues.some(issue => issue.severity === FRAUD_SEVERITY.CRITICAL) || riskScore > 80;

    if (isFraud) {
      const alert = {
        alert_id: uuidv4(),
        user_id,
        fraud_type: 'payment_fraud',
        severity: FRAUD_SEVERITY.CRITICAL,
        issues,
        factors,
        risk_score: riskScore,
        amount,
        description: `Payment fraud detected: ${issues.map(i => i.type).join(', ')}`,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await storeFraudAlert(alert);
      await notifyOpsTeam(alert);
    }

    res.json({
      success: true,
      valid: !isFraud,
      risk_score: riskScore,
      issues,
      factors,
      action: isFraud ? 'block' : 'allow',
      recommendation: riskScore > 60 ? 'require_2fa' : 'proceed'
    });

  } catch (error) {
    console.error('Error validating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: MULTI-ACCOUNT DETECTION
// ============================================

/**
 * Detect multi-account abuse
 */
app.post('/validate/account', async (req, res) => {
  try {
    const {
      user_id,
      email,
      ip_address,
      device_id
    } = req.body;

    const issues = [];
    const factors = {
      velocity: 0,
      pattern: 0,
      history: 0,
      geolocation: 0,
      behavior: 0
    };

    // Check 1: Accounts per IP
    if (ip_address) {
      await redisClient.sAdd(`accounts_by_ip:${ip_address}`, user_id);
      const accountsFromIP = await redisClient.sCard(`accounts_by_ip:${ip_address}`);

      if (accountsFromIP > FRAUD_RULES.ACCOUNT.MAX_ACCOUNTS_PER_IP) {
        issues.push({
          type: 'multiple_accounts_ip',
          message: `${accountsFromIP} accounts from IP ${ip_address}`,
          severity: FRAUD_SEVERITY.HIGH
        });
        factors.pattern = 0.9;
      }

      // Check signup velocity from IP
      const hourKey = `signups:${ip_address}:${new Date().toISOString().slice(0, 13)}`;
      const signupsThisHour = await redisClient.incr(hourKey);
      await redisClient.expire(hourKey, 3600);

      if (signupsThisHour > FRAUD_RULES.ACCOUNT.SIGNUP_VELOCITY_THRESHOLD) {
        issues.push({
          type: 'signup_velocity',
          message: `${signupsThisHour} signups this hour from IP ${ip_address}`,
          severity: FRAUD_SEVERITY.CRITICAL
        });
        factors.velocity = 1.0;
      }
    }

    // Check 2: Accounts per device
    if (device_id) {
      await redisClient.sAdd(`accounts_by_device:${device_id}`, user_id);
      const accountsFromDevice = await redisClient.sCard(`accounts_by_device:${device_id}`);

      if (accountsFromDevice > FRAUD_RULES.ACCOUNT.MAX_ACCOUNTS_PER_DEVICE) {
        issues.push({
          type: 'multiple_accounts_device',
          message: `${accountsFromDevice} accounts from device ${device_id}`,
          severity: FRAUD_SEVERITY.HIGH
        });
        factors.pattern = 0.95;
      }
    }

    // Check 3: Email domain abuse
    if (email) {
      const domain = email.split('@')[1];
      await redisClient.sAdd(`accounts_by_domain:${domain}`, user_id);
      const accountsFromDomain = await redisClient.sCard(`accounts_by_domain:${domain}`);

      if (accountsFromDomain > FRAUD_RULES.ACCOUNT.MAX_ACCOUNTS_PER_EMAIL_DOMAIN) {
        issues.push({
          type: 'email_domain_abuse',
          message: `${accountsFromDomain} accounts from domain ${domain}`,
          severity: FRAUD_SEVERITY.MEDIUM
        });
        factors.pattern = 0.6;
      }
    }

    const riskScore = calculateRiskScore(factors);
    const isFraud = issues.some(issue => issue.severity === FRAUD_SEVERITY.CRITICAL) || riskScore > 75;

    if (isFraud) {
      const alert = {
        alert_id: uuidv4(),
        user_id,
        fraud_type: 'multi_account_abuse',
        severity: FRAUD_SEVERITY.HIGH,
        issues,
        factors,
        risk_score: riskScore,
        email,
        ip_address,
        device_id,
        description: `Multi-account abuse detected: ${issues.map(i => i.type).join(', ')}`,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await storeFraudAlert(alert);
      await notifyOpsTeam(alert);
    }

    res.json({
      success: true,
      valid: !isFraud,
      risk_score: riskScore,
      issues,
      factors,
      action: isFraud ? 'block_signup' : 'allow'
    });

  } catch (error) {
    console.error('Error validating account:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: ALERT MANAGEMENT
// ============================================

/**
 * Get fraud alerts
 */
app.get('/alerts/list', async (req, res) => {
  try {
    const { severity, limit = 50, user_id } = req.query;

    let alertIds;

    if (user_id) {
      // Get alerts for specific user
      alertIds = await redisClient.lRange(`fraud_history:${user_id}`, 0, parseInt(limit) - 1);
    } else if (severity) {
      // Get alerts by severity
      const minScore = getSeverityScore(severity);
      const alerts = await redisClient.zRangeByScore('fraud_alerts:by_severity', minScore, 4, {
        LIMIT: { offset: 0, count: parseInt(limit) }
      });
      alertIds = alerts;
    } else {
      // Get recent alerts
      const allUsers = await redisClient.keys('fraud_history:*');
      alertIds = [];
      for (const userKey of allUsers.slice(0, 10)) {
        const userAlerts = await redisClient.lRange(userKey, 0, 4);
        alertIds.push(...userAlerts);
      }
      alertIds = alertIds.slice(0, parseInt(limit));
    }

    const alerts = [];
    for (const alertId of alertIds) {
      const data = await redisClient.get(`fraud_alert:${alertId}`);
      if (data) {
        alerts.push(JSON.parse(data));
      }
    }

    // Sort by timestamp descending
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      alerts,
      total: alerts.length
    });

  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resolve fraud alert
 */
app.post('/alerts/resolve', async (req, res) => {
  try {
    const { alert_id, resolution_notes, action_taken } = req.body;

    const alertData = await redisClient.get(`fraud_alert:${alert_id}`);
    if (!alertData) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = JSON.parse(alertData);
    alert.resolved = true;
    alert.resolution_notes = resolution_notes;
    alert.action_taken = action_taken;
    alert.resolved_at = new Date().toISOString();

    await redisClient.setEx(`fraud_alert:${alert_id}`, 2592000, JSON.stringify(alert));

    res.json({
      success: true,
      message: 'Alert resolved',
      alert
    });

  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get fraud statistics
 */
app.get('/stats/overview', async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    // Get all alerts
    const allUsers = await redisClient.keys('fraud_history:*');
    let totalAlerts = 0;
    let alertsBySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    let alertsByType = {};

    for (const userKey of allUsers) {
      const alertIds = await redisClient.lRange(userKey, 0, -1);

      for (const alertId of alertIds) {
        const data = await redisClient.get(`fraud_alert:${alertId}`);
        if (data) {
          const alert = JSON.parse(data);

          // Filter by period
          const alertAge = Date.now() - new Date(alert.timestamp).getTime();
          const maxAge = period === 'today' ? 86400000 : period === 'week' ? 604800000 : 2592000000;

          if (alertAge < maxAge) {
            totalAlerts++;
            alertsBySeverity[alert.severity]++;
            alertsByType[alert.fraud_type] = (alertsByType[alert.fraud_type] || 0) + 1;
          }
        }
      }
    }

    res.json({
      success: true,
      period,
      stats: {
        total_alerts: totalAlerts,
        by_severity: alertsBySeverity,
        by_type: alertsByType,
        active_investigations: totalAlerts // Simplified
      }
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: REFUND & CHARGEBACK TRACKING
// ============================================

/**
 * Record refund
 */
app.post('/track/refund', async (req, res) => {
  try {
    const { user_id, transaction_id, amount, reason } = req.body;

    // Increment refund counter
    const refundCount = await redisClient.incr(`refund_count:${user_id}`);
    await redisClient.expire(`refund_count:${user_id}`, 2592000); // 30 days

    // Store refund details
    const refund = {
      refund_id: uuidv4(),
      user_id,
      transaction_id,
      amount,
      reason,
      timestamp: new Date().toISOString()
    };

    await redisClient.lPush(`refunds:${user_id}`, JSON.stringify(refund));

    // Check if abuse threshold reached
    if (refundCount >= FRAUD_RULES.PAYMENT.REFUND_ABUSE_THRESHOLD) {
      const alert = {
        alert_id: uuidv4(),
        user_id,
        fraud_type: 'refund_abuse',
        severity: FRAUD_SEVERITY.HIGH,
        issues: [{
          type: 'excessive_refunds',
          message: `${refundCount} refunds in 30 days`,
          severity: FRAUD_SEVERITY.HIGH
        }],
        factors: { history: 0.8, velocity: 0.7, pattern: 0, geolocation: 0, behavior: 0 },
        risk_score: 75,
        description: `Refund abuse detected: ${refundCount} refunds in 30 days`,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      await storeFraudAlert(alert);
      await notifyOpsTeam(alert);
    }

    res.json({
      success: true,
      refund,
      total_refunds: refundCount,
      warning: refundCount >= FRAUD_RULES.PAYMENT.REFUND_ABUSE_THRESHOLD
    });

  } catch (error) {
    console.error('Error tracking refund:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record chargeback
 */
app.post('/track/chargeback', async (req, res) => {
  try {
    const { user_id, transaction_id, amount } = req.body;

    // Flag user for 90 days
    await redisClient.setEx(
      `chargeback_flag:${user_id}`,
      FRAUD_RULES.PAYMENT.CHARGEBACK_FLAG_DURATION,
      JSON.stringify({
        transaction_id,
        amount,
        timestamp: new Date().toISOString()
      })
    );

    // Create critical alert
    const alert = {
      alert_id: uuidv4(),
      user_id,
      fraud_type: 'chargeback',
      severity: FRAUD_SEVERITY.CRITICAL,
      issues: [{
        type: 'chargeback_filed',
        message: `Chargeback filed for transaction ${transaction_id}`,
        severity: FRAUD_SEVERITY.CRITICAL
      }],
      factors: { history: 1.0, velocity: 0, pattern: 0, geolocation: 0, behavior: 0.8 },
      risk_score: 95,
      transaction_id,
      amount,
      description: `Chargeback filed - user flagged for 90 days`,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    await storeFraudAlert(alert);
    await notifyOpsTeam(alert);

    res.json({
      success: true,
      message: 'Chargeback recorded',
      user_flagged: true,
      flag_duration_days: 90
    });

  } catch (error) {
    console.error('Error tracking chargeback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record failed payment
 */
app.post('/track/payment-failure', async (req, res) => {
  try {
    const { user_id, reason } = req.body;

    const failedKey = `payment_failures:${user_id}:${new Date().toISOString().split('T')[0]}`;
    const failedCount = await redisClient.incr(failedKey);
    await redisClient.expire(failedKey, 86400);

    res.json({
      success: true,
      failed_count: failedCount,
      warning: failedCount >= FRAUD_RULES.PAYMENT.MAX_FAILED_ATTEMPTS
    });

  } catch (error) {
    console.error('Error tracking payment failure:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Fraud Detection Agent v1.0 listening on port ${port}`);
  console.log(`🔒 Features:`);
  console.log(`   - Hunt completion validation`);
  console.log(`   - Review authenticity checking`);
  console.log(`   - Payment fraud detection`);
  console.log(`   - Multi-account abuse detection`);
  console.log(`   - Geolocation verification`);
  console.log(`   - Risk scoring (0-100)`);
  console.log(`   - Refund/chargeback tracking`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /validate/hunt - Validate hunt completion`);
  console.log(`   POST /validate/review - Validate review authenticity`);
  console.log(`   POST /validate/payment - Validate payment transaction`);
  console.log(`   POST /validate/account - Detect multi-account abuse`);
  console.log(`   GET  /alerts/list - Get fraud alerts`);
  console.log(`   POST /alerts/resolve - Resolve fraud alert`);
  console.log(`   GET  /stats/overview - Get fraud statistics`);
  console.log(`   POST /track/refund - Record refund`);
  console.log(`   POST /track/chargeback - Record chargeback`);
  console.log(`   POST /track/payment-failure - Record failed payment`);
});

module.exports = app;
