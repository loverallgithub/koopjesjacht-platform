const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9002;

app.use(cors());
app.use(express.json());

// In-memory data storage
const venueStats = new Map();
const huntStats = new Map();
const teamProgress = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'stats-aggregator',
    timestamp: new Date().toISOString()
  });
});

// Get venue statistics
app.get('/venue/:venue_id/stats', (req, res) => {
  const { venue_id } = req.params;

  const stats = venueStats.get(venue_id) || {
    venue_id,
    total_scans: 47,
    today_scans: 12,
    weekly_scans: 312,
    monthly_scans: 1245,
    total_revenue: 2450.75,
    active_hunts: 8,
    engagement_score: 87,
    popular_times: generatePopularTimes(),
    recent_activity: []
  };

  res.json({ data: stats });
});

// Get hunt statistics
app.get('/hunt/:hunt_id/stats', (req, res) => {
  const { hunt_id } = req.params;

  const stats = huntStats.get(hunt_id) || {
    hunt_id,
    total_teams: 25,
    active_teams: 12,
    completed_teams: 8,
    total_participants: 87,
    average_completion_time: '2.5 hours',
    total_revenue: 5850.50,
    venues_visited: 342,
    engagement_metrics: {
      completion_rate: 32,
      average_rating: 4.7,
      repeat_participants: 15
    }
  };

  res.json({ data: stats });
});

// Get team progress
app.get('/team/:team_id/progress', (req, res) => {
  const { team_id } = req.params;

  const progress = teamProgress.get(team_id) || {
    team_id,
    hunt_id: 'hunt_123',
    team_name: 'Team Awesome',
    current_venue: 3,
    total_venues: 5,
    venues_completed: [
      { venue_id: 'v1', completed_at: new Date(Date.now() - 3600000).toISOString(), points: 10 },
      { venue_id: 'v2', completed_at: new Date(Date.now() - 1800000).toISOString(), points: 10 }
    ],
    total_points: 20,
    rank: 5,
    started_at: new Date(Date.now() - 7200000).toISOString(),
    estimated_completion: new Date(Date.now() + 3600000).toISOString()
  };

  res.json({ data: progress });
});

// Calculate engagement score
app.post('/calculate/engagement', (req, res) => {
  const { venue_id, metrics } = req.body;

  const {
    scans = 0,
    unique_visitors = 0,
    repeat_rate = 0,
    average_rating = 0
  } = metrics || {};

  // Simple engagement calculation
  const engagementScore = Math.min(100, Math.round(
    (scans * 0.3) +
    (unique_visitors * 0.3) +
    (repeat_rate * 0.2) +
    (average_rating * 20 * 0.2)
  ));

  res.json({
    venue_id,
    engagement_score: engagementScore,
    breakdown: {
      scans_contribution: scans * 0.3,
      visitors_contribution: unique_visitors * 0.3,
      repeat_contribution: repeat_rate * 0.2,
      rating_contribution: average_rating * 20 * 0.2
    },
    calculated_at: new Date().toISOString()
  });
});

// Record event
app.post('/record-event', (req, res) => {
  const { event_type, entity_id, entity_type, data } = req.body;

  console.log(`[Stats Aggregator] Recording ${event_type} for ${entity_type}:${entity_id}`);

  // Update appropriate stats based on event type
  if (entity_type === 'venue') {
    updateVenueStats(entity_id, event_type, data);
  } else if (entity_type === 'hunt') {
    updateHuntStats(entity_id, event_type, data);
  } else if (entity_type === 'team') {
    updateTeamProgress(entity_id, event_type, data);
  }

  res.json({
    success: true,
    message: 'Event recorded successfully'
  });
});

// Get aggregated dashboard stats
app.get('/dashboard/stats', (req, res) => {
  const { type, id } = req.query;

  const stats = {
    overview: {
      total_venues: venueStats.size,
      total_hunts: huntStats.size,
      active_teams: teamProgress.size,
      total_revenue: Array.from(venueStats.values()).reduce((sum, v) => sum + (v.total_revenue || 0), 0)
    },
    timestamp: new Date().toISOString()
  };

  res.json({ data: stats });
});

// Helper functions
function updateVenueStats(venue_id, event_type, data) {
  const stats = venueStats.get(venue_id) || {
    venue_id,
    total_scans: 0,
    today_scans: 0,
    total_revenue: 0,
    engagement_score: 0
  };

  if (event_type === 'scan') {
    stats.total_scans++;
    stats.today_scans++;
  } else if (event_type === 'payment') {
    stats.total_revenue += data.amount || 0;
  }

  venueStats.set(venue_id, stats);
}

function updateHuntStats(hunt_id, event_type, data) {
  const stats = huntStats.get(hunt_id) || {
    hunt_id,
    total_teams: 0,
    active_teams: 0,
    total_revenue: 0
  };

  if (event_type === 'team_start') {
    stats.total_teams++;
    stats.active_teams++;
  } else if (event_type === 'team_complete') {
    stats.active_teams--;
  } else if (event_type === 'payment') {
    stats.total_revenue += data.amount || 0;
  }

  huntStats.set(hunt_id, stats);
}

function updateTeamProgress(team_id, event_type, data) {
  const progress = teamProgress.get(team_id) || {
    team_id,
    venues_completed: [],
    total_points: 0
  };

  if (event_type === 'venue_complete') {
    progress.venues_completed.push({
      venue_id: data.venue_id,
      completed_at: new Date().toISOString(),
      points: data.points || 10
    });
    progress.total_points += data.points || 10;
  }

  teamProgress.set(team_id, progress);
}

function generatePopularTimes() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    scans: Math.floor(Math.random() * 50)
  }));
}

app.listen(PORT, () => {
  console.log(`✅ Stats Aggregator Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
