const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9013;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const HUNTER_ONBOARDING_URL = process.env.HUNTER_ONBOARDING_URL || 'http://hunter-onboarding-agent:9012';
const QR_MANAGER_URL = process.env.QR_MANAGER_URL || 'http://qr-agent:9002';

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

const BADGE_TYPES = {
  FIRST_HUNT: { id: 'first_hunt', name: 'First Steps', points: 10, icon: '🎯' },
  SPEED_DEMON: { id: 'speed_demon', name: 'Speed Demon', points: 25, icon: '⚡' },
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', points: 15, icon: '🦋' },
  PERFECT_SCORE: { id: 'perfect_score', name: 'Perfect Score', points: 50, icon: '💯' },
  TEAM_PLAYER: { id: 'team_player', name: 'Team Player', points: 20, icon: '👥' },
  PHOTOGRAPHER: { id: 'photographer', name: 'Photographer', points: 15, icon: '📸' },
  VETERAN: { id: 'veteran', name: 'Veteran Hunter', points: 100, icon: '🏆' },
  REFERRAL_MASTER: { id: 'referral_master', name: 'Referral Master', points: 50, icon: '🎁' }
};

const CHALLENGE_TYPES = {
  WEEKLY_HUNT: 'weekly_hunt',
  PHOTO_CHALLENGE: 'photo_challenge',
  SPEED_CHALLENGE: 'speed_challenge',
  TEAM_CHALLENGE: 'team_challenge',
  SOCIAL_SHARE: 'social_share'
};

const SHARE_PLATFORMS = ['facebook', 'twitter', 'instagram', 'whatsapp', 'email'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store badge award
 */
async function storeBadge(userId, badgeId) {
  const key = `user_badges:${userId}`;
  const badgeData = {
    badge_id: badgeId,
    awarded_at: new Date().toISOString()
  };

  await redisClient.sAdd(key, JSON.stringify(badgeData));
  await redisClient.sAdd('badges:all', `${userId}:${badgeId}`);
}

/**
 * Get user badges
 */
async function getUserBadges(userId) {
  const key = `user_badges:${userId}`;
  const badges = await redisClient.sMembers(key);
  return badges.map(b => JSON.parse(b));
}

/**
 * Store leaderboard entry
 */
async function updateLeaderboard(leaderboardType, userId, score, metadata = {}) {
  const key = `leaderboard:${leaderboardType}`;

  // Store score with user data
  const entry = {
    user_id: userId,
    score,
    ...metadata,
    updated_at: new Date().toISOString()
  };

  await redisClient.zAdd(key, {
    score,
    value: JSON.stringify(entry)
  });
}

/**
 * Get leaderboard
 */
async function getLeaderboard(leaderboardType, limit = 10) {
  const key = `leaderboard:${leaderboardType}`;

  // Get top scores (descending order)
  const entries = await redisClient.zRange(key, 0, limit - 1, {
    REV: true,
    WITHSCORES: true
  });

  const leaderboard = [];
  for (let i = 0; i < entries.length; i += 2) {
    const data = JSON.parse(entries[i].value);
    leaderboard.push({
      rank: Math.floor(i / 2) + 1,
      ...data,
      score: entries[i].score
    });
  }

  return leaderboard;
}

/**
 * Store challenge
 */
async function storeChallenge(challenge) {
  const key = `challenge:${challenge.challenge_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(challenge)); // 30 day TTL

  await redisClient.sAdd('challenges:active', challenge.challenge_id);
  await redisClient.sAdd(`challenges:type:${challenge.type}`, challenge.challenge_id);
}

/**
 * Get challenge
 */
async function getChallenge(challengeId) {
  const key = `challenge:${challengeId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store share event
 */
async function storeShare(shareData) {
  const key = `share:${shareData.share_id}`;
  await redisClient.setEx(key, 7776000, JSON.stringify(shareData)); // 90 day TTL

  await redisClient.sAdd('shares:all', shareData.share_id);
  await redisClient.sAdd(`shares:user:${shareData.user_id}`, shareData.share_id);
  await redisClient.sAdd(`shares:platform:${shareData.platform}`, shareData.share_id);
}

/**
 * Send notification
 */
async function sendNotification(userId, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: userId,
      hunt_id: 'social_growth',
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
    agent: 'SocialGrowthAgent',
    version: '1.0.0',
    features: [
      'Referral tracking and rewards',
      'Badge and achievement system',
      'Team leaderboards (weekly, monthly, all-time)',
      'Weekly challenges with prizes',
      'Social media sharing automation',
      'Viral sharing mechanics',
      'Share tracking and analytics',
      'Achievement notifications'
    ]
  });
});

// ============================================
// CAPABILITY 1: BADGE SYSTEM
// ============================================

/**
 * Award badge to user
 */
app.post('/badge/award', async (req, res) => {
  try {
    const { user_id, badge_id, reason } = req.body;

    if (!user_id || !badge_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'badge_id']
      });
    }

    const badge = BADGE_TYPES[badge_id.toUpperCase()];
    if (!badge) {
      return res.status(400).json({
        error: 'Invalid badge_id',
        valid_badges: Object.keys(BADGE_TYPES)
      });
    }

    // Check if already awarded
    const existingBadges = await getUserBadges(user_id);
    const alreadyHas = existingBadges.some(b => b.badge_id === badge_id);

    if (alreadyHas) {
      return res.status(409).json({
        error: 'Badge already awarded to this user'
      });
    }

    // Award badge
    await storeBadge(user_id, badge_id);

    // Send notification
    await sendNotification(user_id, 'badge_earned', {
      badge_name: badge.name,
      badge_icon: badge.icon,
      points_earned: badge.points,
      reason: reason || 'Great job!'
    });

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      badge: {
        id: badge.id,
        name: badge.name,
        icon: badge.icon,
        points: badge.points
      }
    });

  } catch (error) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's badges
 */
app.get('/badge/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const badges = await getUserBadges(user_id);

    const enrichedBadges = badges.map(b => {
      const badgeInfo = BADGE_TYPES[b.badge_id.toUpperCase()];
      return {
        ...b,
        ...badgeInfo
      };
    });

    res.json({
      success: true,
      user_id,
      badges: enrichedBadges,
      total_badges: enrichedBadges.length,
      total_points: enrichedBadges.reduce((sum, b) => sum + (b.points || 0), 0)
    });

  } catch (error) {
    console.error('Error getting badges:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all available badges
 */
app.get('/badge/catalog', (req, res) => {
  const catalog = Object.values(BADGE_TYPES).map(badge => ({
    id: badge.id,
    name: badge.name,
    icon: badge.icon,
    points: badge.points
  }));

  res.json({
    success: true,
    badges: catalog,
    total: catalog.length
  });
});

// ============================================
// CAPABILITY 2: LEADERBOARDS
// ============================================

/**
 * Update leaderboard entry
 */
app.post('/leaderboard/update', async (req, res) => {
  try {
    const { type, user_id, score, user_name, team_name } = req.body;

    if (!type || !user_id || score === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'user_id', 'score']
      });
    }

    await updateLeaderboard(type, user_id, score, {
      user_name,
      team_name
    });

    res.json({
      success: true,
      message: 'Leaderboard updated',
      entry: {
        type,
        user_id,
        score
      }
    });

  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get leaderboard
 */
app.get('/leaderboard/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit } = req.query;

    const leaderboard = await getLeaderboard(type, parseInt(limit) || 10);

    res.json({
      success: true,
      type,
      leaderboard,
      total_entries: leaderboard.length,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's leaderboard rank
 */
app.get('/leaderboard/:type/user/:user_id', async (req, res) => {
  try {
    const { type, user_id } = req.params;

    const key = `leaderboard:${type}`;

    // Get all entries to find rank
    const allEntries = await redisClient.zRange(key, 0, -1, {
      REV: true,
      WITHSCORES: true
    });

    let rank = null;
    let score = null;

    for (let i = 0; i < allEntries.length; i += 2) {
      const data = JSON.parse(allEntries[i].value);
      if (data.user_id === user_id) {
        rank = Math.floor(i / 2) + 1;
        score = allEntries[i].score;
        break;
      }
    }

    if (rank === null) {
      return res.status(404).json({
        error: 'User not found on leaderboard'
      });
    }

    res.json({
      success: true,
      user_id,
      type,
      rank,
      score,
      total_entries: allEntries.length / 2
    });

  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: CHALLENGES
// ============================================

/**
 * Create challenge
 */
app.post('/challenge/create', async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      start_date,
      end_date,
      prize,
      requirements
    } = req.body;

    if (!title || !type || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'type', 'end_date']
      });
    }

    const challenge = {
      challenge_id: uuidv4(),
      title,
      description: description || '',
      type,
      start_date: start_date || new Date().toISOString(),
      end_date,
      prize: prize || 'Recognition and points',
      requirements: requirements || {},
      participants: [],
      completions: [],
      status: 'active',
      created_at: new Date().toISOString()
    };

    await storeChallenge(challenge);

    res.json({
      success: true,
      message: 'Challenge created successfully',
      challenge: {
        challenge_id: challenge.challenge_id,
        title: challenge.title,
        type: challenge.type,
        end_date: challenge.end_date,
        prize: challenge.prize
      }
    });

  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Join challenge
 */
app.post('/challenge/:challenge_id/join', async (req, res) => {
  try {
    const { challenge_id } = req.params;
    const { user_id, user_name } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const challenge = await getChallenge(challenge_id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if already joined
    const alreadyJoined = challenge.participants.some(p => p.user_id === user_id);
    if (alreadyJoined) {
      return res.status(409).json({ error: 'Already joined this challenge' });
    }

    // Add participant
    challenge.participants.push({
      user_id,
      user_name: user_name || 'Anonymous',
      joined_at: new Date().toISOString()
    });

    await storeChallenge(challenge);

    // Send notification
    await sendNotification(user_id, 'challenge_joined', {
      challenge_title: challenge.title,
      end_date: new Date(challenge.end_date).toLocaleDateString(),
      prize: challenge.prize
    });

    res.json({
      success: true,
      message: 'Joined challenge successfully',
      challenge: {
        challenge_id,
        title: challenge.title,
        participants: challenge.participants.length
      }
    });

  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complete challenge
 */
app.post('/challenge/:challenge_id/complete', async (req, res) => {
  try {
    const { challenge_id } = req.params;
    const { user_id, proof } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const challenge = await getChallenge(challenge_id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if already completed
    const alreadyCompleted = challenge.completions.some(c => c.user_id === user_id);
    if (alreadyCompleted) {
      return res.status(409).json({ error: 'Challenge already completed' });
    }

    // Add completion
    challenge.completions.push({
      user_id,
      completed_at: new Date().toISOString(),
      proof: proof || {}
    });

    await storeChallenge(challenge);

    // Send notification
    await sendNotification(user_id, 'challenge_completed', {
      challenge_title: challenge.title,
      prize: challenge.prize,
      rank: challenge.completions.length
    });

    res.json({
      success: true,
      message: 'Challenge completed!',
      challenge: {
        challenge_id,
        title: challenge.title,
        completion_rank: challenge.completions.length
      }
    });

  } catch (error) {
    console.error('Error completing challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active challenges
 */
app.get('/challenge/active', async (req, res) => {
  try {
    const challengeIds = await redisClient.sMembers('challenges:active');

    const challenges = [];
    for (const challenge_id of challengeIds) {
      const challenge = await getChallenge(challenge_id);
      if (challenge && new Date(challenge.end_date) > new Date()) {
        challenges.push({
          challenge_id: challenge.challenge_id,
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          end_date: challenge.end_date,
          prize: challenge.prize,
          participants: challenge.participants.length,
          completions: challenge.completions.length
        });
      }
    }

    res.json({
      success: true,
      challenges,
      total: challenges.length
    });

  } catch (error) {
    console.error('Error getting challenges:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: SOCIAL SHARING
// ============================================

/**
 * Track share event
 */
app.post('/share/track', async (req, res) => {
  try {
    const {
      user_id,
      platform,
      content_type,
      content_id,
      message
    } = req.body;

    if (!user_id || !platform || !content_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'platform', 'content_type']
      });
    }

    if (!SHARE_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        error: 'Invalid platform',
        valid_platforms: SHARE_PLATFORMS
      });
    }

    const shareData = {
      share_id: uuidv4(),
      user_id,
      platform,
      content_type,
      content_id: content_id || null,
      message: message || null,
      shared_at: new Date().toISOString()
    };

    await storeShare(shareData);

    // Award points for sharing
    const sharePoints = 5;

    // Send notification
    await sendNotification(user_id, 'share_reward', {
      platform,
      points_earned: sharePoints
    });

    res.json({
      success: true,
      message: 'Share tracked successfully',
      share: {
        share_id: shareData.share_id,
        platform,
        points_earned: sharePoints
      }
    });

  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get share statistics
 */
app.get('/share/stats', async (req, res) => {
  try {
    const { user_id, platform } = req.query;

    let shareIds;

    if (user_id) {
      shareIds = await redisClient.sMembers(`shares:user:${user_id}`);
    } else if (platform) {
      shareIds = await redisClient.sMembers(`shares:platform:${platform}`);
    } else {
      shareIds = await redisClient.sMembers('shares:all');
    }

    const stats = {
      total_shares: shareIds.length,
      by_platform: {},
      by_content_type: {}
    };

    // Aggregate stats
    for (const share_id of shareIds) {
      const key = `share:${share_id}`;
      const data = await redisClient.get(key);
      if (data) {
        const share = JSON.parse(data);
        stats.by_platform[share.platform] = (stats.by_platform[share.platform] || 0) + 1;
        stats.by_content_type[share.content_type] = (stats.by_content_type[share.content_type] || 0) + 1;
      }
    }

    res.json({
      success: true,
      stats,
      filters: { user_id, platform }
    });

  } catch (error) {
    console.error('Error getting share stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate share content
 */
app.post('/share/generate', async (req, res) => {
  try {
    const { content_type, content_id, user_name } = req.body;

    if (!content_type) {
      return res.status(400).json({ error: 'content_type required' });
    }

    let shareText = '';
    let shareUrl = 'https://scavengerhunt.com';

    switch (content_type) {
      case 'hunt_completion':
        shareText = `I just completed an amazing scavenger hunt! Can you beat my time? Join me at ${shareUrl}`;
        break;
      case 'badge_earned':
        shareText = `I just earned a new badge in Scavenger Hunt! Think you can do better? ${shareUrl}`;
        break;
      case 'leaderboard_rank':
        shareText = `I am on the Scavenger Hunt leaderboard! Can you make it to the top? ${shareUrl}`;
        break;
      case 'referral':
        shareText = `Join me on Scavenger Hunt! Use my referral code to get bonus points: ${shareUrl}`;
        break;
      default:
        shareText = `Check out Scavenger Hunt - the most fun way to explore your city! ${shareUrl}`;
    }

    res.json({
      success: true,
      share_content: {
        text: shareText,
        url: shareUrl,
        hashtags: ['ScavengerHunt', 'CityExploration', 'AdventureTime']
      }
    });

  } catch (error) {
    console.error('Error generating share content:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Social Growth Agent v1.0 listening on port ${port}`);
  console.log(`🎯 Features:`);
  console.log(`   - Badge and achievement system`);
  console.log(`   - Team leaderboards (weekly, monthly, all-time)`);
  console.log(`   - Weekly challenges with prizes`);
  console.log(`   - Social media sharing automation`);
  console.log(`   - Viral sharing mechanics`);
  console.log(`   - Share tracking and analytics`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /badge/award - Award badge to user`);
  console.log(`   GET  /badge/user/:user_id - Get user badges`);
  console.log(`   GET  /badge/catalog - Get all available badges`);
  console.log(`   POST /leaderboard/update - Update leaderboard`);
  console.log(`   GET  /leaderboard/:type - Get leaderboard`);
  console.log(`   GET  /leaderboard/:type/user/:user_id - Get user rank`);
  console.log(`   POST /challenge/create - Create challenge`);
  console.log(`   POST /challenge/:id/join - Join challenge`);
  console.log(`   POST /challenge/:id/complete - Complete challenge`);
  console.log(`   GET  /challenge/active - Get active challenges`);
  console.log(`   POST /share/track - Track share event`);
  console.log(`   GET  /share/stats - Get share statistics`);
  console.log(`   POST /share/generate - Generate share content`);
});

module.exports = app;
