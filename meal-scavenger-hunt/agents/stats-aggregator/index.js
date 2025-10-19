const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9003;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const REWARD_AGENT_URL = process.env.REWARD_AGENT_URL || 'http://payment-agent:9004';

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
// DATA MODELS & HELPERS
// ============================================

/**
 * Team Stats Structure
 */
function createTeamStats(team_id, hunt_id, team_name) {
  return {
    team_id,
    hunt_id,
    team_name,
    total_points: 0,
    base_points: 0,
    hint_penalty: 0,
    venues_visited: 0,
    total_venues: 0,
    hints_used: 0,
    start_time: new Date().toISOString(),
    completion_time: null,
    duration_minutes: null,
    status: 'active',
    last_scan_time: null,
    venue_visits: []
  };
}

/**
 * Venue Visit Record
 */
function createVenueVisit(team_id, hunt_id, venue_data, scan_time) {
  return {
    visit_id: uuidv4(),
    team_id,
    hunt_id,
    venue_id: venue_data.venue_id || venue_data.shop_name,
    venue_name: venue_data.shop_name,
    scan_time,
    points_earned: venue_data.points_earned || 100,
    qr_code: venue_data.qr_code
  };
}

/**
 * Hint Usage Record
 */
function createHintRecord(team_id, hunt_id, venue_id, hint_level, penalty_points) {
  return {
    hint_id: uuidv4(),
    team_id,
    hunt_id,
    venue_id,
    hint_level,
    penalty_points,
    used_at: new Date().toISOString()
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create team stats
 */
async function getTeamStats(team_id, hunt_id) {
  const key = `team:${hunt_id}:${team_id}`;
  const cached = await redisClient.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  return null;
}

/**
 * Save team stats to Redis
 */
async function saveTeamStats(teamStats) {
  const key = `team:${teamStats.hunt_id}:${teamStats.team_id}`;
  await redisClient.setEx(key, 86400, JSON.stringify(teamStats)); // 24 hour TTL

  // Also add to hunt's team list
  await redisClient.sAdd(`hunt:${teamStats.hunt_id}:teams`, teamStats.team_id);
}

/**
 * Calculate team rank in hunt
 */
async function calculateTeamRank(hunt_id, team_id) {
  const teamIds = await redisClient.sMembers(`hunt:${hunt_id}:teams`);

  const teams = [];
  for (const tid of teamIds) {
    const stats = await getTeamStats(tid, hunt_id);
    if (stats) {
      teams.push(stats);
    }
  }

  // Sort by points (descending), then by duration (ascending)
  teams.sort((a, b) => {
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }
    // If points are equal, faster team ranks higher
    const aDuration = a.duration_minutes || 9999;
    const bDuration = b.duration_minutes || 9999;
    return aDuration - bDuration;
  });

  const rank = teams.findIndex(t => t.team_id === team_id) + 1;
  return { rank, total_teams: teams.length };
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'StatsAggregatorAgent',
    version: '2.0.0',
    features: [
      'Team statistics tracking',
      'Venue scan recording',
      'Hint usage tracking',
      'Real-time leaderboard',
      'Hunt analytics',
      'Redis caching'
    ]
  });
});

// ============================================
// CAPABILITY 1: TRACK VENUE SCANS
// ============================================
app.post('/track-scan', async (req, res) => {
  try {
    const { team_id, hunt_id, team_name, venue_data } = req.body;

    if (!team_id || !hunt_id || !venue_data) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          team_id: 'string',
          hunt_id: 'string',
          team_name: 'string (optional)',
          venue_data: {
            shop_name: 'string',
            venue_id: 'string (optional)',
            qr_code: 'string',
            points_earned: 'number (optional, default: 100)'
          }
        }
      });
    }

    // Get or create team stats
    let teamStats = await getTeamStats(team_id, hunt_id);

    if (!teamStats) {
      // New team - create initial stats
      teamStats = createTeamStats(team_id, hunt_id, team_name || `Team ${team_id.slice(0, 8)}`);
    }

    // Check if venue already visited (prevent duplicate scans)
    const venue_id = venue_data.venue_id || venue_data.shop_name;
    const alreadyVisited = teamStats.venue_visits.some(v => v.venue_id === venue_id);

    if (alreadyVisited) {
      return res.json({
        success: false,
        message: 'Venue already visited',
        team_stats: teamStats,
        duplicate: true
      });
    }

    // Create venue visit record
    const scan_time = new Date().toISOString();
    const venueVisit = createVenueVisit(team_id, hunt_id, venue_data, scan_time);

    // Update team stats
    teamStats.venue_visits.push(venueVisit);
    teamStats.venues_visited += 1;
    teamStats.base_points += venueVisit.points_earned;
    teamStats.total_points = teamStats.base_points - teamStats.hint_penalty;
    teamStats.last_scan_time = scan_time;

    // Calculate duration if not completed
    if (teamStats.status === 'active') {
      const startTime = new Date(teamStats.start_time);
      const currentTime = new Date(scan_time);
      teamStats.duration_minutes = Math.round((currentTime - startTime) / 60000);
    }

    // Save to Redis
    await saveTeamStats(teamStats);

    // Store visit record separately for analytics
    const visitKey = `visit:${venueVisit.visit_id}`;
    await redisClient.setEx(visitKey, 86400, JSON.stringify(venueVisit));

    // Add to venue's visit list
    await redisClient.sAdd(`venue:${venue_id}:visits`, venueVisit.visit_id);

    // Calculate rank
    const { rank, total_teams } = await calculateTeamRank(hunt_id, team_id);

    // Send notification via webhook (don't wait for response)
    axios.post(`${NOTIFICATION_SERVICE_URL}/webhook`, {
      event: 'venue_checkin',
      team_id,
      hunt_id,
      data: {
        venue_name: venue_data.shop_name,
        points: venueVisit.points_earned,
        total_points: teamStats.total_points
      }
    }).catch(err => {
      console.error('Failed to send notification:', err.message);
    });

    // Auto-generate reward for team at this venue (don't wait for response)
    axios.post(`${REWARD_AGENT_URL}/webhook/venue-scan`, {
      team_id,
      hunt_id,
      venue_id: venue_id,
      scan_time: scan_time
    }).catch(err => {
      console.error('Failed to generate reward:', err.message);
    });

    res.json({
      success: true,
      message: 'Venue scan recorded successfully',
      visit: venueVisit,
      team_stats: teamStats,
      ranking: {
        current_rank: rank,
        total_teams: total_teams,
        points: teamStats.total_points
      }
    });

  } catch (error) {
    console.error('Error tracking scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: TRACK HINT USAGE
// ============================================
app.post('/track-hint', async (req, res) => {
  try {
    const { team_id, hunt_id, venue_id, venue_name, hint_level, penalty_points } = req.body;

    if (!team_id || !hunt_id || !venue_id || !hint_level || penalty_points === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          team_id: 'string',
          hunt_id: 'string',
          venue_id: 'string',
          venue_name: 'string (optional)',
          hint_level: 'number (1, 2, or 3)',
          penalty_points: 'number'
        }
      });
    }

    // Get team stats
    let teamStats = await getTeamStats(team_id, hunt_id);

    if (!teamStats) {
      return res.status(404).json({
        error: 'Team not found. Team must scan first venue before using hints.'
      });
    }

    // Create hint record
    const hintRecord = createHintRecord(team_id, hunt_id, venue_id, hint_level, penalty_points);

    // Update team stats
    teamStats.hints_used += 1;
    teamStats.hint_penalty += penalty_points;
    teamStats.total_points = teamStats.base_points - teamStats.hint_penalty;

    // Save to Redis
    await saveTeamStats(teamStats);

    // Store hint record
    const hintKey = `hint:${hintRecord.hint_id}`;
    await redisClient.setEx(hintKey, 86400, JSON.stringify(hintRecord));

    // Add to team's hint list
    await redisClient.sAdd(`team:${hunt_id}:${team_id}:hints`, hintRecord.hint_id);

    // Add to venue's hint list
    await redisClient.sAdd(`venue:${venue_id}:hints`, hintRecord.hint_id);

    // Calculate rank
    const { rank, total_teams } = await calculateTeamRank(hunt_id, team_id);

    res.json({
      success: true,
      message: 'Hint usage recorded',
      hint: hintRecord,
      team_stats: teamStats,
      ranking: {
        current_rank: rank,
        total_teams: total_teams,
        points: teamStats.total_points
      }
    });

  } catch (error) {
    console.error('Error tracking hint:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: GET TEAM STATS
// ============================================
app.get('/team/:team_id/stats', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.query;

    if (!hunt_id) {
      return res.status(400).json({
        error: 'Missing hunt_id query parameter',
        example: '/team/team123/stats?hunt_id=hunt_001'
      });
    }

    const teamStats = await getTeamStats(team_id, hunt_id);

    if (!teamStats) {
      return res.status(404).json({
        error: 'Team not found',
        team_id,
        hunt_id
      });
    }

    // Calculate rank
    const { rank, total_teams } = await calculateTeamRank(hunt_id, team_id);

    res.json({
      success: true,
      team_stats: teamStats,
      ranking: {
        current_rank: rank,
        total_teams: total_teams
      }
    });

  } catch (error) {
    console.error('Error getting team stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: LEADERBOARD
// ============================================
app.get('/leaderboard/:hunt_id', async (req, res) => {
  try {
    const { hunt_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Get all teams in this hunt
    const teamIds = await redisClient.sMembers(`hunt:${hunt_id}:teams`);

    if (teamIds.length === 0) {
      return res.json({
        success: true,
        hunt_id,
        leaderboard: [],
        total_teams: 0
      });
    }

    // Fetch all team stats
    const teams = [];
    for (const team_id of teamIds) {
      const stats = await getTeamStats(team_id, hunt_id);
      if (stats) {
        teams.push(stats);
      }
    }

    // Sort by points (descending), then by duration (ascending)
    teams.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      const aDuration = a.duration_minutes || 9999;
      const bDuration = b.duration_minutes || 9999;
      return aDuration - bDuration;
    });

    // Add rank to each team
    const leaderboard = teams.slice(0, limit).map((team, index) => ({
      rank: index + 1,
      team_id: team.team_id,
      team_name: team.team_name,
      total_points: team.total_points,
      base_points: team.base_points,
      hint_penalty: team.hint_penalty,
      venues_visited: team.venues_visited,
      hints_used: team.hints_used,
      duration_minutes: team.duration_minutes,
      status: team.status
    }));

    res.json({
      success: true,
      hunt_id,
      leaderboard,
      total_teams: teams.length,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: HUNT STATISTICS
// ============================================
app.get('/hunt/:hunt_id/stats', async (req, res) => {
  try {
    const { hunt_id } = req.params;

    // Get all teams
    const teamIds = await redisClient.sMembers(`hunt:${hunt_id}:teams`);

    if (teamIds.length === 0) {
      return res.json({
        success: true,
        hunt_id,
        stats: {
          total_teams: 0,
          active_teams: 0,
          completed_teams: 0,
          total_scans: 0,
          total_hints_used: 0
        }
      });
    }

    // Aggregate stats
    let active_teams = 0;
    let completed_teams = 0;
    let total_scans = 0;
    let total_hints_used = 0;
    let total_points = 0;

    for (const team_id of teamIds) {
      const stats = await getTeamStats(team_id, hunt_id);
      if (stats) {
        if (stats.status === 'active') active_teams++;
        if (stats.status === 'completed') completed_teams++;
        total_scans += stats.venues_visited;
        total_hints_used += stats.hints_used;
        total_points += stats.total_points;
      }
    }

    res.json({
      success: true,
      hunt_id,
      stats: {
        total_teams: teamIds.length,
        active_teams,
        completed_teams,
        total_scans,
        total_hints_used,
        average_points: teamIds.length > 0 ? Math.round(total_points / teamIds.length) : 0,
        average_scans_per_team: teamIds.length > 0 ? (total_scans / teamIds.length).toFixed(1) : 0,
        average_hints_per_team: teamIds.length > 0 ? (total_hints_used / teamIds.length).toFixed(1) : 0
      },
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting hunt stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: VENUE STATISTICS
// ============================================
app.get('/venue/:venue_id/stats', async (req, res) => {
  try {
    const { venue_id } = req.params;

    // Get all visits to this venue
    const visitIds = await redisClient.sMembers(`venue:${venue_id}:visits`);

    // Get all hints used for this venue
    const hintIds = await redisClient.sMembers(`venue:${venue_id}:hints`);

    res.json({
      success: true,
      venue_id,
      stats: {
        total_visits: visitIds.length,
        total_hints_used: hintIds.length,
        hint_usage_rate: visitIds.length > 0 ? ((hintIds.length / visitIds.length) * 100).toFixed(1) + '%' : '0%'
      }
    });

  } catch (error) {
    console.error('Error getting venue stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MARK HUNT COMPLETE
// ============================================
app.post('/complete-hunt', async (req, res) => {
  try {
    const { team_id, hunt_id } = req.body;

    if (!team_id || !hunt_id) {
      return res.status(400).json({
        error: 'Missing required fields: team_id, hunt_id'
      });
    }

    const teamStats = await getTeamStats(team_id, hunt_id);

    if (!teamStats) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (teamStats.status === 'completed') {
      return res.json({
        success: true,
        message: 'Hunt already completed',
        team_stats: teamStats
      });
    }

    // Mark as completed
    const completion_time = new Date().toISOString();
    teamStats.completion_time = completion_time;
    teamStats.status = 'completed';

    // Calculate final duration
    const startTime = new Date(teamStats.start_time);
    const endTime = new Date(completion_time);
    teamStats.duration_minutes = Math.round((endTime - startTime) / 60000);

    // Save
    await saveTeamStats(teamStats);

    // Calculate final rank
    const { rank, total_teams } = await calculateTeamRank(hunt_id, team_id);

    res.json({
      success: true,
      message: 'Hunt completed!',
      team_stats: teamStats,
      ranking: {
        final_rank: rank,
        total_teams: total_teams
      }
    });

  } catch (error) {
    console.error('Error completing hunt:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 7: AWARD BONUS POINTS
// ============================================
app.post('/bonus/award', async (req, res) => {
  try {
    const { team_id, hunt_id, bonus_type, bonus_points, description } = req.body;

    if (!team_id || !hunt_id || !bonus_type || bonus_points === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          team_id: 'string',
          hunt_id: 'string',
          bonus_type: 'string (photo_upload, photo_share, challenge_complete, etc.)',
          bonus_points: 'number',
          description: 'string (optional)'
        }
      });
    }

    // Get or create team stats
    let teamStats = await getTeamStats(team_id, hunt_id);

    if (!teamStats) {
      // Team doesn't exist yet - create initial stats
      teamStats = createTeamStats(team_id, hunt_id, `Team ${team_id.slice(0, 8)}`);
    }

    // Add bonus points
    teamStats.base_points += bonus_points;
    teamStats.total_points = teamStats.base_points - teamStats.hint_penalty;

    // Track bonus separately if needed
    if (!teamStats.bonus_points) {
      teamStats.bonus_points = 0;
    }
    teamStats.bonus_points += bonus_points;

    // Save to Redis
    await saveTeamStats(teamStats);

    // Store bonus record for analytics
    const bonusRecord = {
      bonus_id: uuidv4(),
      team_id,
      hunt_id,
      bonus_type,
      bonus_points,
      description: description || `Bonus points for ${bonus_type}`,
      awarded_at: new Date().toISOString()
    };

    const bonusKey = `bonus:${bonusRecord.bonus_id}`;
    await redisClient.setEx(bonusKey, 86400, JSON.stringify(bonusRecord));

    // Add to team's bonus list
    await redisClient.sAdd(`team:${hunt_id}:${team_id}:bonuses`, bonusRecord.bonus_id);

    // Calculate rank
    const { rank, total_teams } = await calculateTeamRank(hunt_id, team_id);

    res.json({
      success: true,
      message: 'Bonus points awarded successfully',
      bonus: bonusRecord,
      team_stats: {
        team_id: teamStats.team_id,
        hunt_id: teamStats.hunt_id,
        total_points: teamStats.total_points,
        base_points: teamStats.base_points,
        bonus_points: teamStats.bonus_points
      },
      ranking: {
        current_rank: rank,
        total_teams: total_teams
      }
    });

  } catch (error) {
    console.error('Error awarding bonus points:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Stats Aggregator Agent v2.0 listening on port ${port}`);
  console.log(`📊 Features:`);
  console.log(`   - Team statistics tracking`);
  console.log(`   - Venue scan recording`);
  console.log(`   - Hint usage tracking`);
  console.log(`   - Real-time leaderboard`);
  console.log(`   - Hunt analytics`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /track-scan - Record venue scan`);
  console.log(`   POST /track-hint - Record hint usage`);
  console.log(`   GET  /team/:team_id/stats - Get team statistics`);
  console.log(`   GET  /leaderboard/:hunt_id - Get leaderboard`);
  console.log(`   GET  /hunt/:hunt_id/stats - Get hunt statistics`);
  console.log(`   GET  /venue/:venue_id/stats - Get venue statistics`);
  console.log(`   POST /complete-hunt - Mark hunt as complete`);
  console.log(`   POST /bonus/award - Award bonus points`);
});

module.exports = app;
