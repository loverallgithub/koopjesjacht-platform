const express = require('express');
const redis = require('redis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const port = process.env.AGENT_PORT || 9017;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const PAYMENT_HANDLER_URL = process.env.PAYMENT_HANDLER_URL || 'http://payment-agent:9004';
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
// REFERRAL PROGRAM CONFIGURATION
// ============================================

const REFERRAL_REWARDS = {
  REFERRER: {
    SIGNUP_BONUS: 5.00, // €5 when referee signs up
    FIRST_HUNT_BONUS: 10.00, // €10 when referee completes first hunt
    POINTS_BONUS: 50 // Loyalty points
  },
  REFEREE: {
    SIGNUP_DISCOUNT: 5.00, // €5 off first hunt
    WELCOME_POINTS: 25 // Loyalty points
  },
  MILESTONES: [
    { count: 5, reward: 25.00, badge: 'REFERRAL_NOVICE' },
    { count: 10, reward: 50.00, badge: 'REFERRAL_PRO' },
    { count: 25, reward: 125.00, badge: 'REFERRAL_EXPERT' },
    { count: 50, reward: 300.00, badge: 'REFERRAL_LEGEND' },
    { count: 100, reward: 750.00, badge: 'REFERRAL_MASTER' }
  ]
};

const REFERRAL_LINK_BASE = process.env.REFERRAL_LINK_BASE || 'https://koopjesjacht.nl/join';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique referral code
 */
function generateReferralCode(userId) {
  const hash = crypto.createHash('sha256').update(userId + Date.now()).digest('hex');
  return hash.slice(0, 8).toUpperCase();
}

/**
 * Store referral data
 */
async function storeReferral(referral) {
  const key = `referral:${referral.referral_id}`;
  await redisClient.setEx(key, 31536000, JSON.stringify(referral)); // 1 year TTL

  // Add to referrer's referral list
  await redisClient.rPush(`referrals:by_referrer:${referral.referrer_id}`, referral.referral_id);

  // Add to referee's profile
  await redisClient.set(`referee:${referral.referee_id}`, referral.referrer_id);

  // Track referral by code
  await redisClient.set(`referral_by_code:${referral.code}`, referral.referral_id);
}

/**
 * Get referral by code
 */
async function getReferralByCode(code) {
  const referralId = await redisClient.get(`referral_by_code:${code}`);
  if (!referralId) return null;

  const data = await redisClient.get(`referral:${referralId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Get user's referrals
 */
async function getUserReferrals(userId) {
  const referralIds = await redisClient.lRange(`referrals:by_referrer:${userId}`, 0, -1);
  const referrals = [];

  for (const referralId of referralIds) {
    const data = await redisClient.get(`referral:${referralId}`);
    if (data) {
      referrals.push(JSON.parse(data));
    }
  }

  return referrals;
}

/**
 * Send notification
 */
async function sendNotification(userId, template, variables) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      user_id: userId,
      template,
      variables,
      channels: ['email', 'app']
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

/**
 * Issue reward payment
 */
async function issueReward(userId, amount, description) {
  try {
    await axios.post(`${PAYMENT_HANDLER_URL}/credit`, {
      user_id: userId,
      amount,
      description,
      type: 'referral_reward'
    });
  } catch (error) {
    console.error('Error issuing reward:', error.message);
  }
}

/**
 * Award badge
 */
async function awardBadge(userId, badgeId, reason) {
  try {
    await axios.post(`${SOCIAL_GROWTH_URL}/badge/award`, {
      user_id: userId,
      badge_id: badgeId,
      reason
    });
  } catch (error) {
    console.error('Error awarding badge:', error.message);
  }
}

/**
 * Check and process milestones
 */
async function checkMilestones(userId, totalReferrals) {
  for (const milestone of REFERRAL_REWARDS.MILESTONES) {
    if (totalReferrals === milestone.count) {
      // Check if already awarded
      const awarded = await redisClient.get(`milestone:${userId}:${milestone.count}`);
      if (awarded) continue;

      // Award milestone reward
      await issueReward(userId, milestone.reward, `Referral Milestone: ${milestone.count} referrals`);

      // Award badge
      await awardBadge(userId, milestone.badge, `Referred ${milestone.count} hunters`);

      // Mark as awarded
      await redisClient.set(`milestone:${userId}:${milestone.count}`, 'true');

      // Notify user
      await sendNotification(userId, 'referral_milestone', {
        count: milestone.count,
        reward: milestone.reward,
        badge: milestone.badge
      });

      return milestone;
    }
  }

  return null;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'ReferralProgramAgent',
    version: '1.0.0',
    features: [
      'Referral link generation',
      'Automated reward issuance',
      'Milestone tracking (5/10/25/50/100)',
      'Referrer leaderboard',
      'Conversion tracking',
      'Viral coefficient calculation',
      'Multi-tier rewards (referrer + referee)',
      'Badge integration'
    ]
  });
});

// ============================================
// CAPABILITY 1: REFERRAL LINK MANAGEMENT
// ============================================

/**
 * Generate referral link for user
 */
app.post('/link/generate', async (req, res) => {
  try {
    const { user_id, user_name } = req.body;

    // Check if user already has a code
    let code = await redisClient.get(`referral_code:${user_id}`);

    if (!code) {
      // Generate new code
      code = generateReferralCode(user_id);

      // Store code
      await redisClient.set(`referral_code:${user_id}`, code);
      await redisClient.set(`referral_code_owner:${code}`, user_id);
    }

    const referralLink = `${REFERRAL_LINK_BASE}?ref=${code}`;

    res.json({
      success: true,
      code,
      link: referralLink,
      user_id
    });

  } catch (error) {
    console.error('Error generating referral link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's referral stats
 */
app.get('/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const referrals = await getUserReferrals(user_id);

    const stats = {
      total_referrals: referrals.length,
      successful_signups: referrals.filter(r => r.status === 'signed_up' || r.status === 'completed_hunt').length,
      completed_hunts: referrals.filter(r => r.status === 'completed_hunt').length,
      pending: referrals.filter(r => r.status === 'pending').length,
      total_earned: referrals.reduce((sum, r) => sum + (r.rewards_earned || 0), 0),
      conversion_rate: referrals.length > 0
        ? (referrals.filter(r => r.status === 'signed_up' || r.status === 'completed_hunt').length / referrals.length)
        : 0
    };

    const code = await redisClient.get(`referral_code:${user_id}`);
    const link = code ? `${REFERRAL_LINK_BASE}?ref=${code}` : null;

    res.json({
      success: true,
      user_id,
      code,
      link,
      stats,
      referrals: referrals.slice(0, 20) // Return last 20
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: REFERRAL TRACKING
// ============================================

/**
 * Track referral signup
 */
app.post('/track/signup', async (req, res) => {
  try {
    const { referee_id, referee_email, referral_code } = req.body;

    // Get referrer by code
    const referrerId = await redisClient.get(`referral_code_owner:${referral_code}`);

    if (!referrerId) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    // Create referral record
    const referral = {
      referral_id: uuidv4(),
      referrer_id: referrerId,
      referee_id,
      referee_email,
      code: referral_code,
      status: 'signed_up',
      rewards_earned: 0,
      signup_date: new Date().toISOString(),
      first_hunt_date: null,
      created_at: new Date().toISOString()
    };

    await storeReferral(referral);

    // Award referrer signup bonus
    await issueReward(referrerId, REFERRAL_REWARDS.REFERRER.SIGNUP_BONUS, 'Referral signup bonus');

    // Update referral with earned amount
    referral.rewards_earned = REFERRAL_REWARDS.REFERRER.SIGNUP_BONUS;
    await storeReferral(referral);

    // Notify referrer
    await sendNotification(referrerId, 'referral_signup', {
      referee_email,
      reward: REFERRAL_REWARDS.REFERRER.SIGNUP_BONUS
    });

    // Give referee welcome bonus
    await issueReward(referee_id, REFERRAL_REWARDS.REFEREE.SIGNUP_DISCOUNT, 'Welcome referral discount');

    // Notify referee
    await sendNotification(referee_id, 'referral_welcome', {
      referrer_name: 'Your friend',
      discount: REFERRAL_REWARDS.REFEREE.SIGNUP_DISCOUNT
    });

    // Check milestones
    const totalReferrals = (await getUserReferrals(referrerId)).length;
    const milestone = await checkMilestones(referrerId, totalReferrals);

    res.json({
      success: true,
      referral,
      referrer_bonus: REFERRAL_REWARDS.REFERRER.SIGNUP_BONUS,
      referee_bonus: REFERRAL_REWARDS.REFEREE.SIGNUP_DISCOUNT,
      milestone_reached: milestone
    });

  } catch (error) {
    console.error('Error tracking signup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Track referral first hunt completion
 */
app.post('/track/first-hunt', async (req, res) => {
  try {
    const { referee_id } = req.body;

    // Get referrer
    const referrerId = await redisClient.get(`referee:${referee_id}`);

    if (!referrerId) {
      return res.json({
        success: true,
        message: 'User not referred',
        bonus_awarded: false
      });
    }

    // Get referral record
    const referrals = await getUserReferrals(referrerId);
    const referral = referrals.find(r => r.referee_id === referee_id);

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Check if already completed
    if (referral.status === 'completed_hunt') {
      return res.json({
        success: true,
        message: 'Hunt bonus already awarded',
        bonus_awarded: false
      });
    }

    // Update status
    referral.status = 'completed_hunt';
    referral.first_hunt_date = new Date().toISOString();
    referral.rewards_earned += REFERRAL_REWARDS.REFERRER.FIRST_HUNT_BONUS;

    await storeReferral(referral);

    // Award referrer hunt completion bonus
    await issueReward(referrerId, REFERRAL_REWARDS.REFERRER.FIRST_HUNT_BONUS, 'Referral first hunt bonus');

    // Notify referrer
    await sendNotification(referrerId, 'referral_first_hunt', {
      referee_email: referral.referee_email,
      reward: REFERRAL_REWARDS.REFERRER.FIRST_HUNT_BONUS
    });

    // Check milestones
    const completedReferrals = referrals.filter(r => r.status === 'completed_hunt').length;
    const milestone = await checkMilestones(referrerId, completedReferrals);

    res.json({
      success: true,
      referral,
      bonus_awarded: true,
      bonus_amount: REFERRAL_REWARDS.REFERRER.FIRST_HUNT_BONUS,
      milestone_reached: milestone
    });

  } catch (error) {
    console.error('Error tracking first hunt:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: LEADERBOARD
// ============================================

/**
 * Get referral leaderboard
 */
app.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get all users with referrals
    const keys = await redisClient.keys('referrals:by_referrer:*');
    const leaderboard = [];

    for (const key of keys) {
      const userId = key.split(':')[2];
      const referrals = await getUserReferrals(userId);

      const stats = {
        user_id: userId,
        total_referrals: referrals.length,
        successful_referrals: referrals.filter(r => r.status === 'completed_hunt').length,
        total_earned: referrals.reduce((sum, r) => sum + (r.rewards_earned || 0), 0)
      };

      if (stats.total_referrals > 0) {
        leaderboard.push(stats);
      }
    }

    // Sort by successful referrals
    leaderboard.sort((a, b) => b.successful_referrals - a.successful_referrals);

    // Add ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({
      success: true,
      leaderboard: leaderboard.slice(0, parseInt(limit)),
      total_entries: leaderboard.length
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's leaderboard position
 */
app.get('/leaderboard/position/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Get all users with referrals
    const keys = await redisClient.keys('referrals:by_referrer:*');
    const leaderboard = [];

    for (const key of keys) {
      const userId = key.split(':')[2];
      const referrals = await getUserReferrals(userId);

      const stats = {
        user_id: userId,
        successful_referrals: referrals.filter(r => r.status === 'completed_hunt').length
      };

      leaderboard.push(stats);
    }

    // Sort by successful referrals
    leaderboard.sort((a, b) => b.successful_referrals - a.successful_referrals);

    // Find user's position
    const position = leaderboard.findIndex(entry => entry.user_id === user_id);

    if (position === -1) {
      return res.json({
        success: true,
        ranked: false,
        message: 'User not on leaderboard yet'
      });
    }

    const userStats = leaderboard[position];
    userStats.rank = position + 1;
    userStats.total_users = leaderboard.length;
    userStats.percentile = Math.round((1 - position / leaderboard.length) * 100);

    res.json({
      success: true,
      ranked: true,
      ...userStats
    });

  } catch (error) {
    console.error('Error getting position:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: VIRAL METRICS
// ============================================

/**
 * Calculate viral coefficient
 */
app.get('/metrics/viral-coefficient', async (req, res) => {
  try {
    const { period = 30 } = req.query; // Days

    // Get all referrals in period
    const keys = await redisClient.keys('referrals:by_referrer:*');
    let totalReferrers = 0;
    let totalSuccessfulReferrals = 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(period));

    for (const key of keys) {
      const userId = key.split(':')[2];
      const referrals = await getUserReferrals(userId);

      const recentReferrals = referrals.filter(r => {
        const signupDate = new Date(r.signup_date);
        return signupDate > cutoffDate;
      });

      if (recentReferrals.length > 0) {
        totalReferrers++;
        totalSuccessfulReferrals += recentReferrals.filter(r =>
          r.status === 'signed_up' || r.status === 'completed_hunt'
        ).length;
      }
    }

    const viralCoefficient = totalReferrers > 0
      ? totalSuccessfulReferrals / totalReferrers
      : 0;

    res.json({
      success: true,
      period_days: parseInt(period),
      viral_coefficient: viralCoefficient,
      total_referrers: totalReferrers,
      total_successful_referrals: totalSuccessfulReferrals,
      interpretation: viralCoefficient > 1
        ? 'Viral growth (sustainable)'
        : viralCoefficient > 0.5
          ? 'Good growth potential'
          : 'Need optimization'
    });

  } catch (error) {
    console.error('Error calculating viral coefficient:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get referral funnel metrics
 */
app.get('/metrics/funnel', async (req, res) => {
  try {
    const keys = await redisClient.keys('referrals:by_referrer:*');
    let totalClicks = 0; // TODO: Track link clicks
    let totalSignups = 0;
    let totalFirstHunts = 0;

    for (const key of keys) {
      const userId = key.split(':')[2];
      const referrals = await getUserReferrals(userId);

      totalSignups += referrals.filter(r =>
        r.status === 'signed_up' || r.status === 'completed_hunt'
      ).length;

      totalFirstHunts += referrals.filter(r => r.status === 'completed_hunt').length;
    }

    // Simulate clicks for now (in production, track actual clicks)
    totalClicks = Math.round(totalSignups * 1.5);

    const funnel = {
      link_clicks: totalClicks,
      signups: totalSignups,
      first_hunts: totalFirstHunts,
      conversion_rates: {
        click_to_signup: totalClicks > 0 ? (totalSignups / totalClicks) : 0,
        signup_to_hunt: totalSignups > 0 ? (totalFirstHunts / totalSignups) : 0,
        click_to_hunt: totalClicks > 0 ? (totalFirstHunts / totalClicks) : 0
      }
    };

    res.json({
      success: true,
      funnel
    });

  } catch (error) {
    console.error('Error getting funnel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get top referral channels
 */
app.get('/metrics/channels', async (req, res) => {
  try {
    // TODO: Track actual referral channels (email, social, etc.)
    // For now, return simulated data

    const channels = {
      email: { referrals: 45, conversion_rate: 0.62 },
      whatsapp: { referrals: 38, conversion_rate: 0.71 },
      facebook: { referrals: 23, conversion_rate: 0.48 },
      twitter: { referrals: 12, conversion_rate: 0.55 },
      direct_link: { referrals: 67, conversion_rate: 0.59 }
    };

    res.json({
      success: true,
      channels,
      note: 'Channel tracking coming soon'
    });

  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: CAMPAIGN MANAGEMENT
// ============================================

/**
 * Create referral campaign
 */
app.post('/campaign/create', async (req, res) => {
  try {
    const {
      name,
      description,
      bonus_multiplier = 1.0,
      start_date,
      end_date,
      target_referrals
    } = req.body;

    const campaign = {
      campaign_id: uuidv4(),
      name,
      description,
      bonus_multiplier,
      start_date,
      end_date,
      target_referrals,
      current_referrals: 0,
      status: 'active',
      created_at: new Date().toISOString()
    };

    await redisClient.setEx(
      `campaign:${campaign.campaign_id}`,
      2592000,
      JSON.stringify(campaign)
    );

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active campaigns
 */
app.get('/campaign/active', async (req, res) => {
  try {
    const keys = await redisClient.keys('campaign:*');
    const campaigns = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const campaign = JSON.parse(data);
        if (campaign.status === 'active') {
          campaigns.push(campaign);
        }
      }
    }

    res.json({
      success: true,
      campaigns
    });

  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Referral Program Agent v1.0 listening on port ${port}`);
  console.log(`🎁 Features:`);
  console.log(`   - Referral link generation`);
  console.log(`   - Automated reward issuance`);
  console.log(`   - Milestone tracking (5/10/25/50/100)`);
  console.log(`   - Referrer leaderboard`);
  console.log(`   - Viral coefficient tracking`);
  console.log(`   - Conversion funnel analysis`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /link/generate - Generate referral link`);
  console.log(`   GET  /stats/:user_id - Get user referral stats`);
  console.log(`   POST /track/signup - Track referral signup`);
  console.log(`   POST /track/first-hunt - Track first hunt completion`);
  console.log(`   GET  /leaderboard - Get referral leaderboard`);
  console.log(`   GET  /leaderboard/position/:user_id - Get user position`);
  console.log(`   GET  /metrics/viral-coefficient - Calculate viral coefficient`);
  console.log(`   GET  /metrics/funnel - Get referral funnel`);
  console.log(`   GET  /metrics/channels - Get top referral channels`);
  console.log(`   POST /campaign/create - Create referral campaign`);
  console.log(`   GET  /campaign/active - Get active campaigns`);
});

module.exports = app;
