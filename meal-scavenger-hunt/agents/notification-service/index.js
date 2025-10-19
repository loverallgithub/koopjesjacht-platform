const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.AGENT_PORT || 9005;

app.use(express.json());

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
// NOTIFICATION TEMPLATES
// ============================================
const NOTIFICATION_TEMPLATES = {
  hunt_start: {
    title: '🎯 Hunt Started!',
    message: 'Your scavenger hunt "{hunt_name}" has started! Scan your first QR code to receive your clue. Good luck!',
    priority: 'HIGH'
  },
  venue_checkin: {
    title: '✅ Venue Checked In!',
    message: 'Congratulations! You found {venue_name}! +{points} points. Current total: {total_points} points.',
    priority: 'HIGH'
  },
  hint_sent: {
    title: '💡 Hint Received',
    message: 'Hint {hint_level}: {hint_text} (-{penalty} points)',
    priority: 'HIGH'
  },
  rank_up: {
    title: '📈 Rank Improved!',
    message: 'Great job! You moved up to rank {rank} out of {total_teams} teams!',
    priority: 'MEDIUM'
  },
  rank_down: {
    title: '📉 Rank Changed',
    message: 'Another team passed you. Current rank: {rank} out of {total_teams}',
    priority: 'LOW'
  },
  hunt_complete: {
    title: '🏆 Hunt Complete!',
    message: 'Congratulations {team_name}! You finished in {duration} minutes with {points} points. Final rank: {rank}/{total_teams}',
    priority: 'HIGH'
  },
  leader_change: {
    title: '👑 New Leader!',
    message: '{team_name} is now in 1st place!',
    priority: 'MEDIUM'
  },
  duplicate_scan: {
    title: '⚠️ Already Visited',
    message: 'You have already visited {venue_name}. Find a new venue!',
    priority: 'LOW'
  },
  close_race: {
    title: '🔥 Close Race!',
    message: 'You\'re only {points_diff} points behind {leading_team}! Keep going!',
    priority: 'MEDIUM'
  },
  photo_uploaded: {
    title: '📸 Photo Uploaded!',
    message: 'Your photo at {venue_name} has been uploaded successfully! +{bonus_points} bonus points',
    priority: 'MEDIUM'
  },
  photo_featured: {
    title: '⭐ Photo Featured!',
    message: 'Congratulations! Your photo has been featured in the hunt gallery!',
    priority: 'HIGH'
  },
  photo_shared: {
    title: '🎉 Photo Shared!',
    message: 'Thanks for sharing your photo on {platform}! +{bonus_points} bonus points',
    priority: 'MEDIUM'
  },
  venue_signup_started: {
    title: '🏪 Welcome to Scavenger Hunt!',
    message: 'Hi {owner_name}! Thanks for starting your venue registration for {venue_name}. Complete your profile to get approved!',
    priority: 'HIGH'
  },
  venue_email_verification: {
    title: '✉️ Verify Your Email',
    message: 'Please verify your email by clicking this link: {verification_link}',
    priority: 'HIGH'
  },
  venue_approved: {
    title: '✅ Venue Approved!',
    message: 'Congratulations {owner_name}! {venue_name} has been approved. Your QR code: {qr_code}. Venue ID: {venue_id}',
    priority: 'HIGH'
  },
  venue_rejected: {
    title: '❌ Application Not Approved',
    message: 'Unfortunately, {venue_name} was not approved. Reason: {reason}. Please contact support if you have questions.',
    priority: 'HIGH'
  },
  // Hunter Onboarding Templates
  hunter_welcome: {
    title: '👋 Welcome to Scavenger Hunt!',
    message: 'Hi {name}! Thanks for signing up. Complete your profile and tutorial hunt to get 20% off your first hunt!',
    priority: 'HIGH'
  },
  tutorial_start: {
    title: '🎓 Tutorial Hunt Begins!',
    message: 'Welcome {name}! Your tutorial hunt starts now. First stop: {first_stop}. Let the adventure begin!',
    priority: 'HIGH'
  },
  tutorial_complete: {
    title: '🎉 Tutorial Complete!',
    message: 'Congratulations {name}! You earned {total_points} points in the tutorial. You are ready for real hunts!',
    priority: 'HIGH'
  },
  first_hunt_discount: {
    title: '💰 Your 20% Discount Code!',
    message: 'Hi {name}! Use code {discount_code} for {discount_percentage}% off your first hunt! Valid until {valid_until}.',
    priority: 'HIGH'
  },
  abandoned_signup_24h: {
    title: '⏰ Complete Your Signup!',
    message: 'Hi {name}! You are almost there. Complete your profile and tutorial to start your scavenger hunt adventure!',
    priority: 'MEDIUM'
  },
  abandoned_signup_48h: {
    title: '🎯 Last Chance - Complete Signup',
    message: 'Hi {name}! Do not miss out on amazing scavenger hunts in your city. Complete signup now and get 20% off!',
    priority: 'MEDIUM'
  },
  referral_sent: {
    title: '🎁 Invitation from {referrer_name}',
    message: '{referrer_name} invites you to join Scavenger Hunt! Use referral code {referral_code} to get bonus points when you sign up!',
    priority: 'MEDIUM'
  },
  referral_completed: {
    title: '🎊 Referral Bonus Earned!',
    message: 'Great news {name}! Your friend {friend_email} signed up. You earned {bonus_points} bonus points!',
    priority: 'MEDIUM'
  },
  // Support Templates
  ticket_created: {
    title: '🎧 Support Ticket Created',
    message: 'Hi {user_name}! Your support ticket #{ticket_id} for "{subject}" has been created. We will respond soon!',
    priority: 'MEDIUM'
  },
  ticket_reply: {
    title: '💬 New Response to Your Ticket',
    message: 'Hi {user_name}! We have replied to your ticket #{ticket_id} about "{subject}". Check your support portal for details.',
    priority: 'MEDIUM'
  },
  ticket_resolved: {
    title: '✅ Ticket Resolved',
    message: 'Hi {user_name}! Your ticket #{ticket_id} about "{subject}" has been resolved. We hope we helped!',
    priority: 'MEDIUM'
  },
  ticket_escalated: {
    title: '⚠️ Ticket Escalated',
    message: 'Hi {user_name}! Your ticket #{ticket_id} has been escalated to senior support for priority attention.',
    priority: 'HIGH'
  },
  satisfaction_survey: {
    title: '⭐ Rate Your Support Experience',
    message: 'Hi {user_name}! How was your support experience for ticket #{ticket_id}? Please rate us 1-5 stars.',
    priority: 'LOW'
  },
  // Social Growth Templates
  badge_earned: {
    title: '{badge_icon} Badge Earned: {badge_name}!',
    message: 'Congratulations! You earned the {badge_name} badge! +{points_earned} points. {reason}',
    priority: 'HIGH'
  },
  challenge_joined: {
    title: '🎯 Challenge Joined!',
    message: 'You joined the challenge: {challenge_title}! Complete by {end_date} to win: {prize}',
    priority: 'MEDIUM'
  },
  challenge_completed: {
    title: '🏆 Challenge Complete!',
    message: 'Congratulations! You completed {challenge_title}! You finished at rank #{rank}. Prize: {prize}',
    priority: 'HIGH'
  },
  share_reward: {
    title: '🎉 Share Bonus!',
    message: 'Thanks for sharing on {platform}! +{points_earned} points',
    priority: 'LOW'
  },
  // Retention Templates
  reengagement_7day: {
    title: '👋 We Miss You!',
    message: 'Hi! We noticed you have not been on a hunt in 7 days. {message} {offer}',
    priority: 'MEDIUM'
  },
  reengagement_14day: {
    title: '🎯 Come Back and Hunt!',
    message: 'It has been 14 days since your last adventure! New hunts are waiting. {message}',
    priority: 'MEDIUM'
  },
  winback_30day: {
    title: '🎁 Special Offer Just For You!',
    message: 'We miss you! Here is a special offer to get you back hunting: {offer}. Expires: {expiry_date}',
    priority: 'HIGH'
  },
  seasonal_promotion: {
    title: '🎄 Seasonal Hunt Available!',
    message: '{message} Limited time offer: {offer}',
    priority: 'MEDIUM'
  },
  birthday_offer: {
    title: '🎂 Happy Birthday!',
    message: 'Happy Birthday! We have a special gift for you: {offer}. Enjoy your special day!',
    priority: 'HIGH'
  },
  loyalty_points_earned: {
    title: '⭐ Loyalty Points Earned!',
    message: '+{points_earned} loyalty points! New balance: {new_balance} points. Tier: {tier} ({discount}% discount). {reason}',
    priority: 'MEDIUM'
  },
  loyalty_tier_upgrade: {
    title: '🎊 Tier Upgraded!',
    message: 'Congratulations! You reached {new_tier} tier! You now get {discount}% off all hunts!',
    priority: 'HIGH'
  },
  // Venue CRM Templates
  venue_campaign: {
    title: '{subject}',
    message: '{message}',
    priority: 'MEDIUM'
  },
  venue_alert: {
    title: '⚠️ Alert: {alert_type}',
    message: 'Hi {venue_name}! {message}',
    priority: 'HIGH'
  },
  // Fraud Detection Templates
  fraud_alert: {
    title: '🚨 Fraud Alert: {alert_type}',
    message: 'Severity: {severity}. User: {user_id}. {description}. Risk score: {risk_score}/100',
    priority: 'CRITICAL'
  },
  // Referral Program Templates
  referral_signup: {
    title: '🎉 Friend Signed Up!',
    message: 'Great news! {referee_email} signed up using your referral link! You earned €{reward}',
    priority: 'HIGH'
  },
  referral_first_hunt: {
    title: '🏆 Referral Bonus Unlocked!',
    message: 'Awesome! {referee_email} completed their first hunt! You earned €{reward}',
    priority: 'HIGH'
  },
  referral_welcome: {
    title: '🎁 Welcome Gift from {referrer_name}!',
    message: 'Welcome! {referrer_name} invited you. You received €{discount} off your first hunt!',
    priority: 'HIGH'
  },
  referral_milestone: {
    title: '🏅 Referral Milestone Achieved!',
    message: 'Congratulations! You referred {count} hunters! Reward: €{reward}. Badge: {badge}',
    priority: 'HIGH'
  },
  // Email Marketing Templates
  email_welcome: {
    title: 'Welcome to Koopjesjacht! 🎯',
    message: 'Hi {name}! Welcome to the ultimate food scavenger hunt experience. Start your tutorial to get 20% off your first hunt!',
    priority: 'HIGH'
  },
  email_tutorial_reminder: {
    title: 'Complete your tutorial and get 20% off! 🎓',
    message: 'Hi {name}! You started your Koopjesjacht tutorial but did not finish. Complete it now to unlock your 20% discount code!',
    priority: 'MEDIUM'
  },
  email_weekly_digest: {
    title: 'New hunts this week in {city} 🍽️',
    message: 'Hi {name}! Check out the hottest new hunts in {city} this week. {hunt_count} new venues added!',
    priority: 'LOW'
  },
  email_hunt_recommendation: {
    title: 'Hunts we think you will love 💡',
    message: 'Hi {name}! Based on your preferences, we found {hunt_count} hunts you might enjoy in {city}.',
    priority: 'MEDIUM'
  },
  email_milestone_celebration: {
    title: 'Congratulations on {milestone}! 🏆',
    message: 'Hi {name}! You just reached a major milestone: {milestone}! Keep hunting and unlock even more rewards.',
    priority: 'MEDIUM'
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create notification record
 */
function createNotification(team_id, hunt_id, type, data = {}) {
  const template = NOTIFICATION_TEMPLATES[type];

  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  // Replace template variables
  let message = template.message;
  let title = template.title;

  Object.keys(data).forEach(key => {
    const placeholder = `{${key}}`;
    message = message.replace(new RegExp(placeholder, 'g'), data[key]);
    title = title.replace(new RegExp(placeholder, 'g'), data[key]);
  });

  return {
    notification_id: uuidv4(),
    hunt_id,
    team_id,
    type,
    title,
    message,
    priority: template.priority,
    delivery_method: ['websocket'],
    status: 'pending',
    created_at: new Date().toISOString(),
    sent_at: null,
    delivered_at: null,
    metadata: data
  };
}

/**
 * Store notification in Redis
 */
async function storeNotification(notification) {
  const key = `notification:${notification.notification_id}`;
  await redisClient.setEx(key, 86400, JSON.stringify(notification)); // 24 hour TTL

  // Add to team's notification list
  if (notification.team_id) {
    await redisClient.sAdd(`team:${notification.team_id}:notifications`, notification.notification_id);
  }

  // Add to hunt's notification list
  await redisClient.sAdd(`hunt:${notification.hunt_id}:notifications`, notification.notification_id);
}

/**
 * Mark notification as sent
 */
async function markAsSent(notification_id) {
  const key = `notification:${notification_id}`;
  const cached = await redisClient.get(key);

  if (cached) {
    const notification = JSON.parse(cached);
    notification.status = 'sent';
    notification.sent_at = new Date().toISOString();
    notification.delivered_at = new Date().toISOString();

    await redisClient.setEx(key, 86400, JSON.stringify(notification));
    return notification;
  }

  return null;
}

/**
 * Get notification history for team
 */
async function getTeamNotifications(team_id, limit = 20) {
  const notificationIds = await redisClient.sMembers(`team:${team_id}:notifications`);

  const notifications = [];
  for (const id of notificationIds.slice(0, limit)) {
    const cached = await redisClient.get(`notification:${id}`);
    if (cached) {
      notifications.push(JSON.parse(cached));
    }
  }

  // Sort by created_at descending
  notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return notifications;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'NotificationServiceAgent',
    version: '2.0.0',
    features: [
      'Team notifications',
      'Broadcast notifications',
      'Notification templates',
      'Webhook integration',
      'Notification history',
      'Redis caching'
    ]
  });
});

// ============================================
// CAPABILITY 1: SEND TEAM NOTIFICATION
// ============================================
app.post('/send', async (req, res) => {
  try {
    const { team_id, hunt_id, type, data } = req.body;

    if (!team_id || !hunt_id || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          team_id: 'string',
          hunt_id: 'string',
          type: 'string (enum: hunt_start, venue_checkin, hint_sent, rank_up, etc.)',
          data: 'object (template variables)'
        }
      });
    }

    // Validate notification type
    if (!NOTIFICATION_TEMPLATES[type]) {
      return res.status(400).json({
        error: `Unknown notification type: ${type}`,
        available_types: Object.keys(NOTIFICATION_TEMPLATES)
      });
    }

    // Create notification
    const notification = createNotification(team_id, hunt_id, type, data);

    // Store in Redis
    await storeNotification(notification);

    // Mark as sent (for now, immediate delivery)
    await markAsSent(notification.notification_id);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      notification: {
        notification_id: notification.notification_id,
        team_id: notification.team_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        sent_at: notification.sent_at
      }
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: BROADCAST TO HUNT
// ============================================
app.post('/broadcast', async (req, res) => {
  try {
    const { hunt_id, type, data } = req.body;

    if (!hunt_id || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          hunt_id: 'string',
          type: 'string (notification type)',
          data: 'object (template variables)'
        }
      });
    }

    // Get all teams in hunt (from Stats Aggregator data)
    const teamIds = await redisClient.sMembers(`hunt:${hunt_id}:teams`);

    if (teamIds.length === 0) {
      return res.json({
        success: true,
        message: 'No teams in hunt',
        notifications_sent: 0
      });
    }

    // Send notification to each team
    const notifications = [];
    for (const team_id of teamIds) {
      try {
        const notification = createNotification(team_id, hunt_id, type, data);
        await storeNotification(notification);
        await markAsSent(notification.notification_id);
        notifications.push(notification);
      } catch (error) {
        console.error(`Error sending to team ${team_id}:`, error);
      }
    }

    res.json({
      success: true,
      message: 'Broadcast sent successfully',
      hunt_id,
      notifications_sent: notifications.length,
      total_teams: teamIds.length,
      notifications: notifications.map(n => ({
        notification_id: n.notification_id,
        team_id: n.team_id,
        title: n.title,
        message: n.message
      }))
    });

  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: GET NOTIFICATION TEMPLATES
// ============================================
app.get('/templates', (req, res) => {
  res.json({
    success: true,
    templates: Object.keys(NOTIFICATION_TEMPLATES).map(type => ({
      type,
      title: NOTIFICATION_TEMPLATES[type].title,
      message: NOTIFICATION_TEMPLATES[type].message,
      priority: NOTIFICATION_TEMPLATES[type].priority,
      variables: extractVariables(NOTIFICATION_TEMPLATES[type].message)
    }))
  });
});

/**
 * Extract variables from template string
 */
function extractVariables(template) {
  const matches = template.match(/\{([^}]+)\}/g);
  return matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
}

// ============================================
// CAPABILITY 4: WEBHOOK FOR EVENTS
// ============================================
app.post('/webhook', async (req, res) => {
  try {
    const { event, team_id, hunt_id, data } = req.body;

    if (!event || !team_id || !hunt_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          event: 'string (venue_checkin, hint_used, rank_changed, etc.)',
          team_id: 'string',
          hunt_id: 'string',
          data: 'object (event-specific data)'
        }
      });
    }

    // Map event to notification type
    const eventToNotificationType = {
      'venue_checkin': 'venue_checkin',
      'hint_used': 'hint_sent',
      'rank_changed': null, // Determined by data
      'hunt_completed': 'hunt_complete',
      'duplicate_scan': 'duplicate_scan'
    };

    let notificationType = eventToNotificationType[event];

    // Handle rank changes
    if (event === 'rank_changed') {
      if (data.old_rank && data.new_rank) {
        notificationType = data.new_rank < data.old_rank ? 'rank_up' : 'rank_down';
        data.rank = data.new_rank;
      }
    }

    if (!notificationType) {
      return res.status(400).json({
        error: `Cannot map event to notification type: ${event}`
      });
    }

    // Create and send notification
    const notification = createNotification(team_id, hunt_id, notificationType, data);
    await storeNotification(notification);
    await markAsSent(notification.notification_id);

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      event,
      notification: {
        notification_id: notification.notification_id,
        type: notificationType,
        title: notification.title,
        message: notification.message
      }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: NOTIFICATION HISTORY
// ============================================
app.get('/history/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await getTeamNotifications(team_id, limit);

    res.json({
      success: true,
      team_id,
      total: notifications.length,
      notifications: notifications.map(n => ({
        notification_id: n.notification_id,
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority,
        status: n.status,
        created_at: n.created_at,
        sent_at: n.sent_at
      }))
    });

  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: HUNT NOTIFICATION HISTORY
// ============================================
app.get('/history/hunt/:hunt_id', async (req, res) => {
  try {
    const { hunt_id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const notificationIds = await redisClient.sMembers(`hunt:${hunt_id}:notifications`);

    const notifications = [];
    for (const id of notificationIds.slice(0, limit)) {
      const cached = await redisClient.get(`notification:${id}`);
      if (cached) {
        notifications.push(JSON.parse(cached));
      }
    }

    // Sort by created_at descending
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Aggregate statistics
    const stats = {
      total_notifications: notifications.length,
      by_type: {},
      by_priority: {},
      sent: 0,
      pending: 0,
      failed: 0
    };

    notifications.forEach(n => {
      stats.by_type[n.type] = (stats.by_type[n.type] || 0) + 1;
      stats.by_priority[n.priority] = (stats.by_priority[n.priority] || 0) + 1;
      stats[n.status] = (stats[n.status] || 0) + 1;
    });

    res.json({
      success: true,
      hunt_id,
      stats,
      notifications: notifications.map(n => ({
        notification_id: n.notification_id,
        team_id: n.team_id,
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority,
        status: n.status,
        created_at: n.created_at
      }))
    });

  } catch (error) {
    console.error('Error getting hunt notification history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEST NOTIFICATION
// ============================================
app.post('/test', async (req, res) => {
  try {
    const { team_id, hunt_id, type } = req.body;

    if (!team_id || !hunt_id) {
      return res.status(400).json({
        error: 'Missing required fields: team_id, hunt_id'
      });
    }

    const testType = type || 'venue_checkin';

    // Test data
    const testData = {
      hunt_name: 'Den Haag Food Hunt',
      venue_name: 'Golden Dragon',
      points: 100,
      total_points: 200,
      hint_level: 1,
      hint_text: 'Look in Frederik Hendrikplein',
      penalty: 15,
      rank: 1,
      total_teams: 3,
      team_name: 'Team Alpha',
      duration: 45,
      points_diff: 20,
      leading_team: 'Team Beta'
    };

    const notification = createNotification(team_id, hunt_id, testType, testData);
    await storeNotification(notification);
    await markAsSent(notification.notification_id);

    res.json({
      success: true,
      message: 'Test notification sent',
      notification: {
        notification_id: notification.notification_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority
      }
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Notification Service Agent v2.0 listening on port ${port}`);
  console.log(`📬 Features:`);
  console.log(`   - Team notifications`);
  console.log(`   - Broadcast to hunt`);
  console.log(`   - Notification templates`);
  console.log(`   - Webhook integration`);
  console.log(`   - Notification history`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /send - Send notification to team`);
  console.log(`   POST /broadcast - Broadcast to all teams in hunt`);
  console.log(`   GET  /templates - Get available notification templates`);
  console.log(`   POST /webhook - Receive events from other agents`);
  console.log(`   GET  /history/:team_id - Get team notification history`);
  console.log(`   GET  /history/hunt/:hunt_id - Get hunt notification history`);
  console.log(`   POST /test - Send test notification`);
});

module.exports = app;
