const express = require('express');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 9007;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// Middleware
app.use(cors());
app.use(express.json());

// Redis client
let redisClient;
let redisConnected = false;

// Initialize Redis connection
async function initRedis() {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (err) => {
    console.error('[Redis Error]:', err);
    redisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('✅ Connected to Redis');
    redisConnected = true;
  });

  try {
    await redisClient.connect();
  } catch (error) {
    console.error('[Redis Connection Failed]:', error.message);
    console.log('⚠️  Running in fallback mode without Redis');
  }
}

// In-memory fallback storage
const inMemoryLeaderboards = new Map();
const inMemoryAchievements = new Map();
const inMemoryTeamData = new Map();

// Helper: Calculate score with bonuses and penalties
function calculateScore(basePoints, timeTaken, hintsUsed, completionBonus = 0) {
  let score = basePoints;

  // Time bonus (faster completion = more points)
  const timeBonus = Math.max(0, 500 - timeTaken); // Max 500 bonus points
  score += timeBonus;

  // Hint penalty
  score -= (hintsUsed * 50);

  // Completion bonus
  score += completionBonus;

  return Math.max(0, score); // Never negative
}

// Helper: Award achievement
async function awardAchievement(teamId, achievementType, details = {}) {
  const achievement = {
    achievement_id: uuidv4(),
    team_id: teamId,
    type: achievementType,
    details,
    awarded_at: new Date().toISOString()
  };

  const key = `achievements:${teamId}`;

  if (redisConnected) {
    await redisClient.sAdd(key, JSON.stringify(achievement));
  } else {
    if (!inMemoryAchievements.has(teamId)) {
      inMemoryAchievements.set(teamId, []);
    }
    inMemoryAchievements.get(teamId).push(achievement);
  }

  return achievement;
}

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'leaderboard',
    timestamp: new Date().toISOString(),
    redis: redisConnected ? 'connected' : 'fallback mode'
  });
});

// Get hunt leaderboard
app.get('/leaderboard/:hunt_id', async (req, res) => {
  try {
    const { hunt_id } = req.params;
    const key = `leaderboard:hunt:${hunt_id}`;

    let leaderboard = [];

    if (redisConnected) {
      const rankings = await redisClient.zRevRangeWithScores(key, 0, -1);
      leaderboard = rankings.map((item, index) => ({
        rank: index + 1,
        team_id: item.value,
        team_name: item.value.split(':')[1] || 'Unknown Team',
        total_points: item.score
      }));
    } else {
      const data = inMemoryLeaderboards.get(key) || [];
      leaderboard = data
        .sort((a, b) => b.total_points - a.total_points)
        .map((item, index) => ({
          ...item,
          rank: index + 1
        }));
    }

    res.json({
      success: true,
      hunt_id,
      total_teams: leaderboard.length,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get global leaderboard
app.get('/leaderboard/global', async (req, res) => {
  try {
    const key = 'leaderboard:global';
    let leaderboard = [];

    if (redisConnected) {
      const rankings = await redisClient.zRevRangeWithScores(key, 0, 99); // Top 100
      leaderboard = rankings.map((item, index) => ({
        rank: index + 1,
        team_id: item.value,
        total_points: item.score
      }));
    } else {
      const data = inMemoryLeaderboards.get(key) || [];
      leaderboard = data
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 100)
        .map((item, index) => ({
          ...item,
          rank: index + 1
        }));
    }

    res.json({
      success: true,
      total_teams: leaderboard.length,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team score
app.post('/update-score', async (req, res) => {
  try {
    const {
      team_id,
      team_name,
      hunt_id,
      base_points = 0,
      time_taken = 0,
      hints_used = 0,
      completion_bonus = 0,
      replace = false
    } = req.body;

    if (!team_id || !hunt_id) {
      return res.status(400).json({ error: 'team_id and hunt_id are required' });
    }

    // Calculate new score
    const calculatedScore = calculateScore(base_points, time_taken, hints_used, completion_bonus);

    const huntKey = `leaderboard:hunt:${hunt_id}`;
    const globalKey = 'leaderboard:global';
    const teamKey = `${team_id}:${team_name || 'Team'}`;

    let newScore;

    if (redisConnected) {
      if (replace) {
        // Replace score
        await redisClient.zAdd(huntKey, { score: calculatedScore, value: teamKey });
        await redisClient.zAdd(globalKey, { score: calculatedScore, value: team_id });
        newScore = calculatedScore;
      } else {
        // Increment score
        newScore = await redisClient.zIncrBy(huntKey, calculatedScore, teamKey);
        await redisClient.zIncrBy(globalKey, calculatedScore, team_id);
      }
    } else {
      // In-memory fallback
      if (!inMemoryLeaderboards.has(huntKey)) {
        inMemoryLeaderboards.set(huntKey, []);
      }

      const huntBoard = inMemoryLeaderboards.get(huntKey);
      const existingIndex = huntBoard.findIndex(t => t.team_id === team_id);

      if (existingIndex >= 0) {
        if (replace) {
          huntBoard[existingIndex].total_points = calculatedScore;
        } else {
          huntBoard[existingIndex].total_points += calculatedScore;
        }
        newScore = huntBoard[existingIndex].total_points;
      } else {
        huntBoard.push({
          team_id,
          team_name: team_name || 'Team',
          total_points: calculatedScore
        });
        newScore = calculatedScore;
      }
    }

    // Store team data
    const teamData = {
      team_id,
      team_name,
      hunt_id,
      last_score: calculatedScore,
      total_score: newScore,
      last_updated: new Date().toISOString()
    };

    inMemoryTeamData.set(team_id, teamData);

    // Check for achievements
    const achievements = [];

    // First to 1000 points
    if (newScore >= 1000 && newScore - calculatedScore < 1000) {
      achievements.push(await awardAchievement(team_id, 'points_milestone', { milestone: 1000 }));
    }

    // Perfect score (no hints, fast time)
    if (hints_used === 0 && time_taken < 300) {
      achievements.push(await awardAchievement(team_id, 'perfect_round', { time_taken }));
    }

    res.json({
      success: true,
      data: {
        team_id,
        team_name,
        hunt_id,
        previous_score: newScore - calculatedScore,
        points_added: calculatedScore,
        new_total_score: newScore,
        achievements_unlocked: achievements
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team rank
app.get('/team/:team_id/rank', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.query;

    if (!hunt_id) {
      return res.status(400).json({ error: 'hunt_id query parameter is required' });
    }

    const key = `leaderboard:hunt:${hunt_id}`;
    let rank = null;
    let score = 0;

    if (redisConnected) {
      rank = await redisClient.zRevRank(key, team_id);
      score = await redisClient.zScore(key, team_id) || 0;
      rank = rank !== null ? rank + 1 : null; // Convert 0-based to 1-based
    } else {
      const data = inMemoryLeaderboards.get(key) || [];
      const sorted = data.sort((a, b) => b.total_points - a.total_points);
      const index = sorted.findIndex(t => t.team_id === team_id);
      rank = index >= 0 ? index + 1 : null;
      score = index >= 0 ? sorted[index].total_points : 0;
    }

    res.json({
      success: true,
      data: {
        team_id,
        hunt_id,
        rank,
        score,
        ranked: rank !== null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get achievements for team
app.get('/achievements/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    let achievements = [];

    if (redisConnected) {
      const key = `achievements:${team_id}`;
      const data = await redisClient.sMembers(key);
      achievements = data.map(a => JSON.parse(a));
    } else {
      achievements = inMemoryAchievements.get(team_id) || [];
    }

    res.json({
      success: true,
      team_id,
      total_achievements: achievements.length,
      data: achievements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate rankings (admin endpoint)
app.post('/calculate', async (req, res) => {
  try {
    const { hunt_id } = req.body;

    if (!hunt_id) {
      return res.status(400).json({ error: 'hunt_id is required' });
    }

    // This would typically pull from database and recalculate
    // For now, just return current state

    const key = `leaderboard:hunt:${hunt_id}`;
    let totalTeams = 0;

    if (redisConnected) {
      totalTeams = await redisClient.zCard(key);
    } else {
      totalTeams = (inMemoryLeaderboards.get(key) || []).length;
    }

    res.json({
      success: true,
      message: 'Rankings recalculated',
      hunt_id,
      total_teams: totalTeams,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical rankings
app.get('/history/:hunt_id', async (req, res) => {
  try {
    const { hunt_id } = req.params;

    // This would typically pull from database
    // For now, return empty array

    res.json({
      success: true,
      hunt_id,
      message: 'Historical rankings coming soon',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[Leaderboard Agent Error]:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    status: error.status || 500
  });
});

// Start server
initRedis().then(() => {
  app.listen(PORT, () => {
    console.log(`🏆 Leaderboard Agent running on port ${PORT}`);
    console.log(`📊 Redis: ${redisConnected ? 'Connected' : 'Fallback mode'}`);
  });
});
