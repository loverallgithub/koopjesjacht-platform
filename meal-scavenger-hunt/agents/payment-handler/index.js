const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9004;

app.use(express.json());

// Service URLs
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';

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
// VENUE REWARD CATALOG
// ============================================
const VENUE_REWARDS = {
  golden_dragon: {
    venue_id: 'golden_dragon',
    venue_name: 'Golden Dragon',
    reward_type: 'percentage_discount',
    discount_percentage: 10,
    discount_amount: null,
    item_name: null,
    description: '10% off your entire meal',
    terms: 'Valid for dine-in only. Cannot be combined with other offers.',
    valid_days: 30
  },
  bella_napoli: {
    venue_id: 'bella_napoli',
    venue_name: 'Bella Napoli',
    reward_type: 'freebie',
    discount_percentage: null,
    discount_amount: null,
    item_name: 'Espresso',
    description: 'Free espresso with any pizza purchase',
    terms: 'One per table. Valid dine-in only.',
    valid_days: 30
  },
  de_haagse_kroeg: {
    venue_id: 'de_haagse_kroeg',
    venue_name: 'De Haagse Kroeg',
    reward_type: 'bogo',
    discount_percentage: null,
    discount_amount: null,
    item_name: 'Bitterballen',
    description: 'Buy one order of bitterballen, get one free',
    terms: 'Valid for equal or lesser value.',
    valid_days: 30
  }
};

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================
const ACHIEVEMENTS = {
  // Bronze Tier (Common)
  finisher: {
    achievement_id: 'finisher',
    name: 'Finisher',
    description: 'Complete the scavenger hunt',
    icon: '🏁',
    tier: 'bronze',
    bonus_points: 50,
    rarity: 'common',
    criteria: { type: 'status', value: 'completed' }
  },
  first_venue: {
    achievement_id: 'first_venue',
    name: 'First Steps',
    description: 'Visit your first venue',
    icon: '👣',
    tier: 'bronze',
    bonus_points: 10,
    rarity: 'common',
    criteria: { type: 'venues_visited', min: 1 }
  },
  social_sharer: {
    achievement_id: 'social_sharer',
    name: 'Social Butterfly',
    description: 'Share your hunt on social media',
    icon: '📱',
    tier: 'bronze',
    bonus_points: 25,
    rarity: 'common',
    criteria: { type: 'manual' }  // Manually triggered
  },

  // Silver Tier (Uncommon)
  half_way: {
    achievement_id: 'half_way',
    name: 'Half Way There',
    description: 'Visit 3 or more venues',
    icon: '🎯',
    tier: 'silver',
    bonus_points: 50,
    rarity: 'uncommon',
    criteria: { type: 'venues_visited', min: 3 }
  },
  fast_start: {
    achievement_id: 'fast_start',
    name: 'Fast Starter',
    description: 'Visit first venue within 10 minutes',
    icon: '🚀',
    tier: 'silver',
    bonus_points: 75,
    rarity: 'uncommon',
    criteria: { type: 'first_venue_time', max_minutes: 10 }
  },

  // Gold Tier (Rare)
  speed_runner: {
    achievement_id: 'speed_runner',
    name: 'Speed Runner',
    description: 'Complete the hunt in under 2 hours',
    icon: '⚡',
    tier: 'gold',
    bonus_points: 100,
    rarity: 'rare',
    criteria: { type: 'duration', max_minutes: 120 }
  },
  perfect_hunter: {
    achievement_id: 'perfect_hunter',
    name: 'Perfect Hunter',
    description: 'Complete without using any hints',
    icon: '🎯',
    tier: 'gold',
    bonus_points: 150,
    rarity: 'rare',
    criteria: { type: 'hints_used', max: 0 }
  },
  world_traveler: {
    achievement_id: 'world_traveler',
    name: 'World Traveler',
    description: 'Visit venues from 3 different cuisines',
    icon: '🌍',
    tier: 'gold',
    bonus_points: 100,
    rarity: 'rare',
    criteria: { type: 'cuisine_variety', min: 3 }
  },

  // Platinum Tier (Epic)
  champion: {
    achievement_id: 'champion',
    name: 'Champion',
    description: 'Finish in 1st place',
    icon: '👑',
    tier: 'platinum',
    bonus_points: 200,
    rarity: 'epic',
    criteria: { type: 'rank', value: 1 }
  },
  flawless: {
    achievement_id: 'flawless',
    name: 'Flawless Victory',
    description: 'Finish 1st with no hints used',
    icon: '💎',
    tier: 'platinum',
    bonus_points: 300,
    rarity: 'legendary',
    criteria: { type: 'combined', conditions: [
      { type: 'rank', value: 1 },
      { type: 'hints_used', max: 0 }
    ]}
  },
  comeback_kid: {
    achievement_id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Go from last place to top 3',
    icon: '💪',
    tier: 'platinum',
    bonus_points: 150,
    rarity: 'epic',
    criteria: { type: 'manual' }  // Complex logic, manually triggered
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate reward code
 */
function generateRewardCode(venue_id, team_id) {
  const venueCode = venue_id.substring(0, 2).toUpperCase();
  const teamCode = team_id.substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HUNT-${venueCode}-${teamCode}-${random}`;
}

/**
 * Create reward record
 */
function createReward(team_id, hunt_id, venue_id) {
  const venueReward = VENUE_REWARDS[venue_id];

  if (!venueReward) {
    throw new Error(`No reward configured for venue: ${venue_id}`);
  }

  const reward_code = generateRewardCode(venue_id, team_id);
  const issued_at = new Date();
  const valid_until = new Date();
  valid_until.setDate(valid_until.getDate() + venueReward.valid_days);

  return {
    reward_id: uuidv4(),
    team_id,
    hunt_id,
    venue_id,
    venue_name: venueReward.venue_name,
    reward_code,
    reward_type: venueReward.reward_type,
    discount_percentage: venueReward.discount_percentage,
    discount_amount: venueReward.discount_amount,
    item_name: venueReward.item_name,
    description: venueReward.description,
    terms: venueReward.terms,
    issued_at: issued_at.toISOString(),
    valid_until: valid_until.toISOString(),
    redemption_limit: 1,
    times_redeemed: 0,
    redeemed_at: null,
    status: 'active'
  };
}

/**
 * Store reward in Redis
 */
async function storeReward(reward) {
  const key = `reward:${reward.reward_id}`;
  await redisClient.setEx(key, 86400 * 30, JSON.stringify(reward)); // 30 day TTL

  // Index by reward code
  await redisClient.setEx(`reward_code:${reward.reward_code}`, 86400 * 30, reward.reward_id);

  // Add to team's rewards list
  await redisClient.sAdd(`team:${reward.team_id}:rewards`, reward.reward_id);

  // Add to hunt's rewards list
  await redisClient.sAdd(`hunt:${reward.hunt_id}:rewards`, reward.reward_id);
}

/**
 * Get reward by ID or code
 */
async function getReward(identifier) {
  let reward_id = identifier;

  // If it looks like a code, look up the ID
  if (identifier.startsWith('HUNT-')) {
    reward_id = await redisClient.get(`reward_code:${identifier}`);
    if (!reward_id) return null;
  }

  const key = `reward:${reward_id}`;
  const cached = await redisClient.get(key);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Check if team has already earned reward for venue
 */
async function hasRewardForVenue(team_id, venue_id) {
  const rewardIds = await redisClient.sMembers(`team:${team_id}:rewards`);

  for (const reward_id of rewardIds) {
    const reward = await getReward(reward_id);
    if (reward && reward.venue_id === venue_id) {
      return true;
    }
  }

  return false;
}

/**
 * Store achievement unlock
 */
async function storeAchievementUnlock(team_id, hunt_id, achievement) {
  const unlock = {
    team_id,
    hunt_id,
    achievement_id: achievement.achievement_id,
    name: achievement.name,
    icon: achievement.icon,
    tier: achievement.tier,
    bonus_points: achievement.bonus_points,
    unlocked_at: new Date().toISOString()
  };

  const key = `achievement:${team_id}:${achievement.achievement_id}`;
  await redisClient.setEx(key, 86400 * 30, JSON.stringify(unlock));

  // Add to team's achievements list
  await redisClient.sAdd(`team:${team_id}:achievements`, achievement.achievement_id);

  return unlock;
}

/**
 * Check if achievement already unlocked
 */
async function hasAchievement(team_id, achievement_id) {
  return await redisClient.sIsMember(`team:${team_id}:achievements`, achievement_id);
}

/**
 * Get team stats from Stats Aggregator
 */
async function getTeamStats(team_id, hunt_id) {
  try {
    const response = await axios.get(`${STATS_AGGREGATOR_URL}/team/${team_id}/stats?hunt_id=${hunt_id}`);
    return response.data.team_stats;
  } catch (error) {
    console.error('Failed to get team stats:', error.message);
    return null;
  }
}

/**
 * Check if criteria met
 */
function checkCriteria(stats, criteria) {
  switch (criteria.type) {
    case 'status':
      return stats.status === criteria.value;

    case 'venues_visited':
      return stats.venues_visited >= criteria.min;

    case 'duration':
      return stats.duration_minutes && stats.duration_minutes <= criteria.max_minutes;

    case 'hints_used':
      return stats.hints_used <= criteria.max;

    case 'rank':
      // Would need to get rank from leaderboard
      return false;  // Complex, implement later

    case 'first_venue_time':
      // Check if first venue was visited within time limit
      if (stats.venue_visits && stats.venue_visits.length > 0) {
        const firstVisit = new Date(stats.venue_visits[0].scan_time);
        const startTime = new Date(stats.start_time);
        const minutesElapsed = (firstVisit - startTime) / 60000;
        return minutesElapsed <= criteria.max_minutes;
      }
      return false;

    case 'combined':
      return criteria.conditions.every(cond => checkCriteria(stats, cond));

    case 'manual':
      return false;  // Must be manually triggered

    default:
      return false;
  }
}

/**
 * Award bonus points via Stats Aggregator
 */
async function awardBonusPoints(team_id, hunt_id, points, description) {
  // For now, just track locally
  // In future, would call Stats Aggregator to update points
  const bonus = {
    bonus_id: uuidv4(),
    team_id,
    hunt_id,
    bonus_points: points,
    description,
    awarded_at: new Date().toISOString()
  };

  const key = `bonus:${bonus.bonus_id}`;
  await redisClient.setEx(key, 86400 * 30, JSON.stringify(bonus));
  await redisClient.sAdd(`team:${team_id}:bonuses`, bonus.bonus_id);

  return bonus;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'RewardAchievementAgent',
    version: '2.0.0',
    features: [
      'Venue reward system',
      'Achievement tracking',
      'Bonus point management',
      'Reward redemption',
      'Achievement auto-detection',
      'Reward catalog'
    ]
  });
});

// ============================================
// CAPABILITY 1: GENERATE VENUE REWARD
// ============================================
app.post('/rewards/generate', async (req, res) => {
  try {
    const { team_id, hunt_id, venue_id } = req.body;

    if (!team_id || !hunt_id || !venue_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          team_id: 'string',
          hunt_id: 'string',
          venue_id: 'string'
        }
      });
    }

    // Check if venue has reward configured
    if (!VENUE_REWARDS[venue_id]) {
      return res.status(404).json({
        error: `No reward configured for venue: ${venue_id}`,
        available_venues: Object.keys(VENUE_REWARDS)
      });
    }

    // Check if team already has reward for this venue
    if (await hasRewardForVenue(team_id, venue_id)) {
      return res.json({
        success: false,
        message: 'Team already has reward for this venue',
        duplicate: true
      });
    }

    // Create reward
    const reward = createReward(team_id, hunt_id, venue_id);

    // Store in Redis
    await storeReward(reward);

    res.json({
      success: true,
      message: 'Reward generated successfully',
      reward: {
        reward_id: reward.reward_id,
        reward_code: reward.reward_code,
        venue_name: reward.venue_name,
        description: reward.description,
        reward_type: reward.reward_type,
        valid_until: reward.valid_until,
        terms: reward.terms
      }
    });

  } catch (error) {
    console.error('Error generating reward:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: VERIFY REWARD
// ============================================
app.get('/rewards/verify/:reward_code', async (req, res) => {
  try {
    const { reward_code } = req.params;

    const reward = await getReward(reward_code);

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found',
        valid: false
      });
    }

    // Check if expired
    const now = new Date();
    const valid_until = new Date(reward.valid_until);
    const expired = now > valid_until;

    // Check if fully redeemed
    const fully_redeemed = reward.times_redeemed >= reward.redemption_limit;

    const valid = !expired && !fully_redeemed && reward.status === 'active';

    res.json({
      success: true,
      valid,
      reward: {
        reward_code: reward.reward_code,
        venue_name: reward.venue_name,
        description: reward.description,
        reward_type: reward.reward_type,
        discount_percentage: reward.discount_percentage,
        item_name: reward.item_name,
        times_redeemed: reward.times_redeemed,
        redemption_limit: reward.redemption_limit,
        expired,
        fully_redeemed,
        valid_until: reward.valid_until
      }
    });

  } catch (error) {
    console.error('Error verifying reward:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: REDEEM REWARD
// ============================================
app.post('/rewards/redeem', async (req, res) => {
  try {
    const { reward_code, venue_staff_id } = req.body;

    if (!reward_code) {
      return res.status(400).json({
        error: 'Missing required field: reward_code'
      });
    }

    const reward = await getReward(reward_code);

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    // Check if expired
    const now = new Date();
    const valid_until = new Date(reward.valid_until);
    if (now > valid_until) {
      return res.json({
        success: false,
        error: 'Reward has expired',
        expired: true
      });
    }

    // Check if fully redeemed
    if (reward.times_redeemed >= reward.redemption_limit) {
      return res.json({
        success: false,
        error: 'Reward has already been fully redeemed',
        fully_redeemed: true
      });
    }

    // Mark as redeemed
    reward.times_redeemed += 1;
    reward.redeemed_at = now.toISOString();
    reward.redeemed_by = venue_staff_id || 'unknown';

    // Update in Redis
    const key = `reward:${reward.reward_id}`;
    await redisClient.setEx(key, 86400 * 30, JSON.stringify(reward));

    // Send notification
    axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: reward.team_id,
      hunt_id: reward.hunt_id,
      type: 'venue_checkin',  // Reuse template
      data: {
        venue_name: reward.venue_name,
        points: 0,
        total_points: 0
      }
    }).catch(err => console.error('Failed to send notification:', err.message));

    res.json({
      success: true,
      message: 'Reward redeemed successfully',
      reward: {
        reward_code: reward.reward_code,
        venue_name: reward.venue_name,
        description: reward.description,
        redeemed_at: reward.redeemed_at,
        times_redeemed: reward.times_redeemed,
        redemption_limit: reward.redemption_limit
      }
    });

  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: GET REWARD CATALOG
// ============================================
app.get('/rewards/catalog/:hunt_id', (req, res) => {
  const { hunt_id } = req.params;

  const catalog = Object.values(VENUE_REWARDS).map(venue => ({
    venue_id: venue.venue_id,
    venue_name: venue.venue_name,
    reward: {
      type: venue.reward_type,
      description: venue.description,
      discount_percentage: venue.discount_percentage,
      item_name: venue.item_name,
      terms: venue.terms
    }
  }));

  res.json({
    success: true,
    hunt_id,
    catalog,
    total_venues: catalog.length
  });
});

// ============================================
// CAPABILITY 5: GET TEAM REWARDS
// ============================================
app.get('/rewards/team/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.query;

    if (!hunt_id) {
      return res.status(400).json({
        error: 'Missing hunt_id query parameter'
      });
    }

    const rewardIds = await redisClient.sMembers(`team:${team_id}:rewards`);

    const rewards = [];
    for (const reward_id of rewardIds) {
      const reward = await getReward(reward_id);
      if (reward && reward.hunt_id === hunt_id) {
        rewards.push({
          reward_id: reward.reward_id,
          reward_code: reward.reward_code,
          venue_name: reward.venue_name,
          description: reward.description,
          reward_type: reward.reward_type,
          status: reward.status,
          redeemed: reward.times_redeemed > 0,
          valid_until: reward.valid_until,
          issued_at: reward.issued_at
        });
      }
    }

    // Sort by issued_at descending
    rewards.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));

    const total_redeemed = rewards.filter(r => r.redeemed).length;

    res.json({
      success: true,
      team_id,
      hunt_id,
      rewards,
      total_earned: rewards.length,
      total_redeemed
    });

  } catch (error) {
    console.error('Error getting team rewards:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: GET AVAILABLE ACHIEVEMENTS
// ============================================
app.get('/achievements/available/:hunt_id', (req, res) => {
  const { hunt_id } = req.params;

  const achievements = Object.values(ACHIEVEMENTS).map(ach => ({
    achievement_id: ach.achievement_id,
    name: ach.name,
    description: ach.description,
    icon: ach.icon,
    tier: ach.tier,
    bonus_points: ach.bonus_points,
    rarity: ach.rarity
  }));

  // Group by tier
  const by_tier = {
    bronze: achievements.filter(a => a.tier === 'bronze'),
    silver: achievements.filter(a => a.tier === 'silver'),
    gold: achievements.filter(a => a.tier === 'gold'),
    platinum: achievements.filter(a => a.tier === 'platinum')
  };

  res.json({
    success: true,
    hunt_id,
    achievements,
    by_tier,
    total: achievements.length
  });
});

// ============================================
// CAPABILITY 7: CHECK ACHIEVEMENTS
// ============================================
app.post('/achievements/check/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.body;

    if (!hunt_id) {
      return res.status(400).json({
        error: 'Missing required field: hunt_id'
      });
    }

    // Get team stats
    const stats = await getTeamStats(team_id, hunt_id);

    if (!stats) {
      return res.status(404).json({
        error: 'Team not found'
      });
    }

    // Check each achievement
    const newly_unlocked = [];

    for (const achievement of Object.values(ACHIEVEMENTS)) {
      // Skip if already unlocked
      if (await hasAchievement(team_id, achievement.achievement_id)) {
        continue;
      }

      // Check if criteria met
      if (checkCriteria(stats, achievement.criteria)) {
        // Unlock achievement
        const unlock = await storeAchievementUnlock(team_id, hunt_id, achievement);

        // Award bonus points
        await awardBonusPoints(team_id, hunt_id, achievement.bonus_points, `Achievement: ${achievement.name}`);

        // Send notification (don't wait)
        axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
          team_id,
          hunt_id,
          type: 'rank_up',  // Reuse template for now
          data: {
            rank: achievement.tier,
            total_teams: achievement.name
          }
        }).catch(err => console.error('Failed to send notification:', err.message));

        newly_unlocked.push(unlock);
      }
    }

    res.json({
      success: true,
      team_id,
      hunt_id,
      newly_unlocked,
      count: newly_unlocked.length
    });

  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 8: GET TEAM ACHIEVEMENTS
// ============================================
app.get('/achievements/team/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.query;

    const achievementIds = await redisClient.sMembers(`team:${team_id}:achievements`);

    const achievements = [];
    for (const achievement_id of achievementIds) {
      const key = `achievement:${team_id}:${achievement_id}`;
      const cached = await redisClient.get(key);
      if (cached) {
        const unlock = JSON.parse(cached);
        if (!hunt_id || unlock.hunt_id === hunt_id) {
          achievements.push(unlock);
        }
      }
    }

    // Sort by unlocked_at descending
    achievements.sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at));

    const total_possible = Object.keys(ACHIEVEMENTS).length;
    const completion_percentage = Math.round((achievements.length / total_possible) * 100);

    res.json({
      success: true,
      team_id,
      achievements,
      total_unlocked: achievements.length,
      total_possible,
      completion_percentage
    });

  } catch (error) {
    console.error('Error getting team achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEBHOOK: AUTO-GENERATE REWARD ON VENUE SCAN
// ============================================
app.post('/webhook/venue-scan', async (req, res) => {
  try {
    const { team_id, hunt_id, venue_id } = req.body;

    if (!team_id || !hunt_id || !venue_id) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Check if venue has reward
    if (!VENUE_REWARDS[venue_id]) {
      return res.json({
        success: true,
        message: 'No reward configured for this venue'
      });
    }

    // Check if already has reward
    if (await hasRewardForVenue(team_id, venue_id)) {
      return res.json({
        success: true,
        message: 'Team already has reward for this venue'
      });
    }

    // Generate reward
    const reward = createReward(team_id, hunt_id, venue_id);
    await storeReward(reward);

    // Check achievements (don't wait)
    axios.post(`${process.env.REWARD_SERVICE_URL || 'http://localhost:9004'}/achievements/check/${team_id}`, {
      hunt_id
    }).catch(err => console.error('Failed to check achievements:', err.message));

    res.json({
      success: true,
      message: 'Reward generated',
      reward: {
        reward_code: reward.reward_code,
        description: reward.description
      }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Reward & Achievement Agent v2.0 listening on port ${port}`);
  console.log(`🎁 Features:`);
  console.log(`   - Venue reward generation`);
  console.log(`   - ${Object.keys(VENUE_REWARDS).length} venue rewards configured`);
  console.log(`   - ${Object.keys(ACHIEVEMENTS).length} achievements available`);
  console.log(`   - Reward redemption system`);
  console.log(`   - Achievement auto-detection`);
  console.log(`   - Bonus point management`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /rewards/generate - Generate reward`);
  console.log(`   GET  /rewards/verify/:code - Verify reward`);
  console.log(`   POST /rewards/redeem - Redeem reward`);
  console.log(`   GET  /rewards/catalog/:hunt_id - Get reward catalog`);
  console.log(`   GET  /rewards/team/:team_id - Get team rewards`);
  console.log(`   GET  /achievements/available/:hunt_id - List achievements`);
  console.log(`   POST /achievements/check/:team_id - Check for new achievements`);
  console.log(`   GET  /achievements/team/:team_id - Get team achievements`);
  console.log(`   POST /webhook/venue-scan - Auto-generate reward on scan`);
});

module.exports = app;
