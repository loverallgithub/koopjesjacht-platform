const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9014;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const QR_MANAGER_URL = process.env.QR_MANAGER_URL || 'http:// qr-agent:9002';
const SOCIAL_GROWTH_URL = process.env.SOCIAL_GROWTH_URL || 'http://social-growth-agent:9013';

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
// CONSTANTS
// ============================================

const USER_STATUS = {
  ACTIVE: 'active',           // Activity within 7 days
  AT_RISK: 'at_risk',         // No activity 7-14 days
  DORMANT: 'dormant',         // No activity 14-30 days
  CHURNED: 'churned'          // No activity 30+ days
};

const CAMPAIGN_TYPES = {
  REENGAGEMENT: 'reengagement',
  WINBACK: 'winback',
  SEASONAL: 'seasonal',
  BIRTHDAY: 'birthday',
  LOYALTY: 'loyalty',
  PERSONALIZED: 'personalized'
};

const LOYALTY_TIERS = {
  BRONZE: { name: 'Bronze', min_points: 0, discount: 0 },
  SILVER: { name: 'Silver', min_points: 100, discount: 5 },
  GOLD: { name: 'Gold', min_points: 500, discount: 10 },
  PLATINUM: { name: 'Platinum', min_points: 1000, discount: 15 }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store user activity
 */
async function storeUserActivity(userId, activityType, metadata = {}) {
  const activity = {
    user_id: userId,
    activity_type: activityType,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  const key = `user_activity:${userId}`;
  await redisClient.lPush(key, JSON.stringify(activity));
  await redisClient.lTrim(key, 0, 99); // Keep last 100 activities

  // Update last activity timestamp
  await redisClient.set(`user_last_activity:${userId}`, new Date().toISOString());
}

/**
 * Get user activity
 */
async function getUserActivity(userId, limit = 10) {
  const key = `user_activity:${userId}`;
  const activities = await redisClient.lRange(key, 0, limit - 1);
  return activities.map(a => JSON.parse(a));
}

/**
 * Get user status based on last activity
 */
async function getUserStatus(userId) {
  const lastActivity = await redisClient.get(`user_last_activity:${userId}`);

  if (!lastActivity) {
    return USER_STATUS.CHURNED;
  }

  const daysSinceActivity = Math.floor(
    (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActivity <= 7) return USER_STATUS.ACTIVE;
  if (daysSinceActivity <= 14) return USER_STATUS.AT_RISK;
  if (daysSinceActivity <= 30) return USER_STATUS.DORMANT;
  return USER_STATUS.CHURNED;
}

/**
 * Store user preferences
 */
async function storeUserPreferences(userId, preferences) {
  const key = `user_preferences:${userId}`;
  await redisClient.set(key, JSON.stringify(preferences));
}

/**
 * Get user preferences
 */
async function getUserPreferences(userId) {
  const key = `user_preferences:${userId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store campaign
 */
async function storeCampaign(campaign) {
  const key = `campaign:${campaign.campaign_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(campaign)); // 30 day TTL

  await redisClient.sAdd('campaigns:all', campaign.campaign_id);
  await redisClient.sAdd(`campaigns:type:${campaign.type}`, campaign.campaign_id);
}

/**
 * Get campaign
 */
async function getCampaign(campaignId) {
  const key = `campaign:${campaignId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store loyalty points
 */
async function updateLoyaltyPoints(userId, points, reason) {
  const key = `loyalty_points:${userId}`;

  // Get current points
  const currentPoints = parseInt(await redisClient.get(key) || '0');
  const newPoints = currentPoints + points;

  await redisClient.set(key, newPoints.toString());

  // Store transaction
  const transaction = {
    user_id: userId,
    points_change: points,
    new_balance: newPoints,
    reason,
    timestamp: new Date().toISOString()
  };

  const transKey = `loyalty_transactions:${userId}`;
  await redisClient.lPush(transKey, JSON.stringify(transaction));
  await redisClient.lTrim(transKey, 0, 49); // Keep last 50 transactions

  return newPoints;
}

/**
 * Get loyalty tier
 */
function getLoyaltyTier(points) {
  if (points >= LOYALTY_TIERS.PLATINUM.min_points) return LOYALTY_TIERS.PLATINUM;
  if (points >= LOYALTY_TIERS.GOLD.min_points) return LOYALTY_TIERS.GOLD;
  if (points >= LOYALTY_TIERS.SILVER.min_points) return LOYALTY_TIERS.SILVER;
  return LOYALTY_TIERS.BRONZE;
}

/**
 * Send notification
 */
async function sendNotification(userId, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: userId,
      hunt_id: 'retention_system',
      type,
      data
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'RetentionAgent',
    version: '1.0.0',
    features: [
      'User activity tracking',
      'Inactivity detection (at-risk, dormant, churned)',
      'Re-engagement campaigns',
      'Personalized hunt recommendations',
      'Loyalty points system (4 tiers)',
      'Win-back campaigns',
      'Birthday and special occasion tracking',
      'User preference management',
      'Seasonal promotions'
    ]
  });
});

// ============================================
// CAPABILITY 1: ACTIVITY TRACKING
// ============================================

/**
 * Track user activity
 */
app.post('/activity/track', async (req, res) => {
  try {
    const { user_id, activity_type, metadata } = req.body;

    if (!user_id || !activity_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'activity_type']
      });
    }

    await storeUserActivity(user_id, activity_type, metadata);

    const status = await getUserStatus(user_id);

    res.json({
      success: true,
      message: 'Activity tracked successfully',
      user_status: status
    });

  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user activity history
 */
app.get('/activity/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit } = req.query;

    const activities = await getUserActivity(user_id, parseInt(limit) || 10);
    const status = await getUserStatus(user_id);

    res.json({
      success: true,
      user_id,
      status,
      activities,
      total_shown: activities.length
    });

  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get users by status
 */
app.get('/activity/status/:status', async (req, res) => {
  try {
    const { status } = req.params;

    if (!Object.values(USER_STATUS).includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: Object.values(USER_STATUS)
      });
    }

    // Get all users with last activity timestamps
    const keys = await redisClient.keys('user_last_activity:*');

    const users = [];
    for (const key of keys) {
      const userId = key.replace('user_last_activity:', '');
      const userStatus = await getUserStatus(userId);

      if (userStatus === status) {
        const lastActivity = await redisClient.get(key);
        users.push({
          user_id: userId,
          status: userStatus,
          last_activity: lastActivity
        });
      }
    }

    res.json({
      success: true,
      status,
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Error getting users by status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: RE-ENGAGEMENT CAMPAIGNS
// ============================================

/**
 * Create campaign
 */
app.post('/campaign/create', async (req, res) => {
  try {
    const {
      name,
      type,
      target_status,
      message,
      offer,
      expiry_date
    } = req.body;

    if (!name || !type || !target_status) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'type', 'target_status']
      });
    }

    const campaign = {
      campaign_id: uuidv4(),
      name,
      type,
      target_status,
      message: message || '',
      offer: offer || null,
      expiry_date: expiry_date || null,
      sent_count: 0,
      opened_count: 0,
      converted_count: 0,
      created_at: new Date().toISOString(),
      status: 'active'
    };

    await storeCampaign(campaign);

    res.json({
      success: true,
      message: 'Campaign created successfully',
      campaign: {
        campaign_id: campaign.campaign_id,
        name: campaign.name,
        type: campaign.type,
        target_status: campaign.target_status
      }
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send campaign to user
 */
app.post('/campaign/:campaign_id/send', async (req, res) => {
  try {
    const { campaign_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const campaign = await getCampaign(campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const userStatus = await getUserStatus(user_id);

    // Check if user matches target status
    if (campaign.target_status !== 'all' && userStatus !== campaign.target_status) {
      return res.status(400).json({
        error: 'User does not match campaign target status',
        user_status: userStatus,
        required_status: campaign.target_status
      });
    }

    // Send notification based on campaign type
    let notificationType;
    switch (campaign.type) {
      case CAMPAIGN_TYPES.REENGAGEMENT:
        notificationType = 'reengagement_7day';
        break;
      case CAMPAIGN_TYPES.WINBACK:
        notificationType = 'winback_30day';
        break;
      case CAMPAIGN_TYPES.SEASONAL:
        notificationType = 'seasonal_promotion';
        break;
      case CAMPAIGN_TYPES.BIRTHDAY:
        notificationType = 'birthday_offer';
        break;
      default:
        notificationType = 'reengagement_7day';
    }

    await sendNotification(user_id, notificationType, {
      campaign_name: campaign.name,
      message: campaign.message,
      offer: campaign.offer,
      expiry_date: campaign.expiry_date
    });

    // Update campaign stats
    campaign.sent_count += 1;
    await storeCampaign(campaign);

    res.json({
      success: true,
      message: 'Campaign sent successfully',
      campaign: {
        campaign_id,
        name: campaign.name,
        sent_to: user_id
      }
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get campaign details
 */
app.get('/campaign/:campaign_id', async (req, res) => {
  try {
    const { campaign_id } = req.params;

    const campaign = await getCampaign(campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all campaigns
 */
app.get('/campaign/list', async (req, res) => {
  try {
    const { type } = req.query;

    let campaignIds;

    if (type) {
      campaignIds = await redisClient.sMembers(`campaigns:type:${type}`);
    } else {
      campaignIds = await redisClient.sMembers('campaigns:all');
    }

    const campaigns = [];
    for (const campaign_id of campaignIds) {
      const campaign = await getCampaign(campaign_id);
      if (campaign) {
        campaigns.push({
          campaign_id: campaign.campaign_id,
          name: campaign.name,
          type: campaign.type,
          target_status: campaign.target_status,
          sent_count: campaign.sent_count,
          opened_count: campaign.opened_count,
          converted_count: campaign.converted_count,
          status: campaign.status
        });
      }
    }

    res.json({
      success: true,
      campaigns,
      total: campaigns.length
    });

  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: PERSONALIZED RECOMMENDATIONS
// ============================================

/**
 * Set user preferences
 */
app.post('/preferences/set', async (req, res) => {
  try {
    const {
      user_id,
      favorite_categories,
      preferred_difficulty,
      preferred_duration,
      preferred_days,
      email_frequency
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const preferences = {
      user_id,
      favorite_categories: favorite_categories || [],
      preferred_difficulty: preferred_difficulty || 'medium',
      preferred_duration: preferred_duration || '2-3 hours',
      preferred_days: preferred_days || [],
      email_frequency: email_frequency || 'weekly',
      updated_at: new Date().toISOString()
    };

    await storeUserPreferences(user_id, preferences);

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences
    });

  } catch (error) {
    console.error('Error setting preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user preferences
 */
app.get('/preferences/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const preferences = await getUserPreferences(user_id);

    if (!preferences) {
      return res.status(404).json({ error: 'No preferences found for this user' });
    }

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get personalized recommendations
 */
app.get('/recommendations/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const preferences = await getUserPreferences(user_id);
    const activities = await getUserActivity(user_id, 20);

    // Simple recommendation logic
    const recommendations = [
      {
        hunt_id: 'recommended_1',
        title: 'Amsterdam Food Tour',
        category: preferences?.favorite_categories?.[0] || 'food',
        difficulty: preferences?.preferred_difficulty || 'medium',
        duration: '2-3 hours',
        match_score: 0.9,
        reason: 'Based on your favorite categories'
      },
      {
        hunt_id: 'recommended_2',
        title: 'Historical Rotterdam Walk',
        category: 'culture',
        difficulty: 'easy',
        duration: '2 hours',
        match_score: 0.75,
        reason: 'Popular in your area'
      },
      {
        hunt_id: 'recommended_3',
        title: 'Weekend Adventure Challenge',
        category: 'adventure',
        difficulty: 'hard',
        duration: '3-4 hours',
        match_score: 0.6,
        reason: 'Trending this week'
      }
    ];

    res.json({
      success: true,
      user_id,
      recommendations,
      total: recommendations.length
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: LOYALTY PROGRAM
// ============================================

/**
 * Award loyalty points
 */
app.post('/loyalty/award', async (req, res) => {
  try {
    const { user_id, points, reason } = req.body;

    if (!user_id || !points) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'points']
      });
    }

    const newBalance = await updateLoyaltyPoints(user_id, points, reason || 'Points awarded');

    const tier = getLoyaltyTier(newBalance);

    // Send notification
    await sendNotification(user_id, 'loyalty_points_earned', {
      points_earned: points,
      new_balance: newBalance,
      tier: tier.name,
      discount: tier.discount,
      reason: reason || 'Points awarded'
    });

    res.json({
      success: true,
      message: 'Loyalty points awarded',
      loyalty: {
        points_awarded: points,
        new_balance: newBalance,
        tier: tier.name,
        discount_percentage: tier.discount
      }
    });

  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get loyalty balance
 */
app.get('/loyalty/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const key = `loyalty_points:${user_id}`;
    const points = parseInt(await redisClient.get(key) || '0');

    const tier = getLoyaltyTier(points);

    // Get transaction history
    const transKey = `loyalty_transactions:${user_id}`;
    const transactions = await redisClient.lRange(transKey, 0, 9);
    const transactionHistory = transactions.map(t => JSON.parse(t));

    res.json({
      success: true,
      user_id,
      loyalty: {
        total_points: points,
        tier: tier.name,
        discount_percentage: tier.discount,
        next_tier: getNextTier(points),
        recent_transactions: transactionHistory
      }
    });

  } catch (error) {
    console.error('Error getting loyalty balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get next loyalty tier info
 */
function getNextTier(currentPoints) {
  const tiers = Object.values(LOYALTY_TIERS).sort((a, b) => a.min_points - b.min_points);

  for (const tier of tiers) {
    if (currentPoints < tier.min_points) {
      return {
        name: tier.name,
        min_points: tier.min_points,
        points_needed: tier.min_points - currentPoints,
        discount: tier.discount
      };
    }
  }

  return null; // Already at max tier
}

// ============================================
// CAPABILITY 5: SPECIAL OCCASIONS
// ============================================

/**
 * Set user birthday
 */
app.post('/occasion/birthday/set', async (req, res) => {
  try {
    const { user_id, birthday } = req.body;

    if (!user_id || !birthday) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'birthday']
      });
    }

    const key = `user_birthday:${user_id}`;
    await redisClient.set(key, birthday);

    res.json({
      success: true,
      message: 'Birthday saved successfully',
      user_id,
      birthday
    });

  } catch (error) {
    console.error('Error setting birthday:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check for upcoming birthdays
 */
app.get('/occasion/birthday/upcoming', async (req, res) => {
  try {
    const { days } = req.query;
    const daysAhead = parseInt(days) || 7;

    const keys = await redisClient.keys('user_birthday:*');

    const upcomingBirthdays = [];
    const today = new Date();

    for (const key of keys) {
      const userId = key.replace('user_birthday:', '');
      const birthday = await redisClient.get(key);

      if (birthday) {
        const birthdayDate = new Date(birthday);
        const thisYearBirthday = new Date(today.getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());

        const daysUntil = Math.floor((thisYearBirthday - today) / (1000 * 60 * 60 * 24));

        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          upcomingBirthdays.push({
            user_id: userId,
            birthday: birthday,
            days_until: daysUntil
          });
        }
      }
    }

    res.json({
      success: true,
      upcoming_birthdays: upcomingBirthdays,
      total: upcomingBirthdays.length,
      days_ahead: daysAhead
    });

  } catch (error) {
    console.error('Error getting upcoming birthdays:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Retention Agent v1.0 listening on port ${port}`);
  console.log(`🎯 Features:`);
  console.log(`   - User activity tracking`);
  console.log(`   - Inactivity detection (active, at-risk, dormant, churned)`);
  console.log(`   - Re-engagement campaigns`);
  console.log(`   - Personalized hunt recommendations`);
  console.log(`   - Loyalty points system (4 tiers: Bronze, Silver, Gold, Platinum)`);
  console.log(`   - Win-back campaigns`);
  console.log(`   - Birthday and special occasion tracking`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /activity/track - Track user activity`);
  console.log(`   GET  /activity/user/:user_id - Get user activity`);
  console.log(`   GET  /activity/status/:status - Get users by status`);
  console.log(`   POST /campaign/create - Create campaign`);
  console.log(`   POST /campaign/:id/send - Send campaign to user`);
  console.log(`   GET  /campaign/:id - Get campaign details`);
  console.log(`   GET  /campaign/list - Get all campaigns`);
  console.log(`   POST /preferences/set - Set user preferences`);
  console.log(`   GET  /preferences/user/:user_id - Get preferences`);
  console.log(`   GET  /recommendations/user/:user_id - Get recommendations`);
  console.log(`   POST /loyalty/award - Award loyalty points`);
  console.log(`   GET  /loyalty/user/:user_id - Get loyalty balance`);
  console.log(`   POST /occasion/birthday/set - Set user birthday`);
  console.log(`   GET  /occasion/birthday/upcoming - Get upcoming birthdays`);
});

module.exports = app;
