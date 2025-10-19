const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9012;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const PAYMENT_HANDLER_URL = process.env.PAYMENT_HANDLER_URL || 'http://payment-agent:9004';
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
// ONBOARDING STAGES
// ============================================
const SIGNUP_STAGES = {
  INITIAL_SIGNUP: 'initial_signup',
  PROFILE_CREATED: 'profile_created',
  TUTORIAL_STARTED: 'tutorial_started',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  FIRST_HUNT_READY: 'first_hunt_ready',
  ACTIVATED: 'activated',
  ABANDONED: 'abandoned'
};

// Tutorial hunt mock data
const TUTORIAL_STOPS = [
  {
    stop_number: 1,
    name: 'Welcome Stop',
    qr_code: 'TUTORIAL_STOP_1',
    clue: 'Welcome to your first scavenger hunt! Scan this QR code to begin.',
    points: 10
  },
  {
    stop_number: 2,
    name: 'Learning Stop',
    qr_code: 'TUTORIAL_STOP_2',
    clue: 'Great job! Now try requesting a hint to see how it works.',
    points: 15
  },
  {
    stop_number: 3,
    name: 'Final Stop',
    qr_code: 'TUTORIAL_STOP_3',
    clue: 'Excellent! You have completed the tutorial. Ready for the real adventure?',
    points: 25
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store signup data
 */
async function storeSignup(signup) {
  const key = `hunter_signup:${signup.signup_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(signup)); // 30 day TTL

  // Add to global signups list
  await redisClient.sAdd('hunter_signups:all', signup.signup_id);

  // Add to stage-specific list
  await redisClient.sAdd(`hunter_signups:stage:${signup.stage}`, signup.signup_id);

  // Add to user's signups list
  await redisClient.sAdd(`hunter:${signup.email}:signups`, signup.signup_id);
}

/**
 * Get signup data
 */
async function getSignup(signup_id) {
  const key = `hunter_signup:${signup_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Update signup stage
 */
async function updateSignupStage(signup_id, newStage) {
  const signup = await getSignup(signup_id);
  if (!signup) return false;

  // Remove from old stage list
  await redisClient.sRem(`hunter_signups:stage:${signup.stage}`, signup_id);

  // Update stage
  signup.stage = newStage;
  signup.stage_updated_at = new Date().toISOString();

  // Add to new stage list
  await redisClient.sAdd(`hunter_signups:stage:${newStage}`, signup_id);

  // Update stage history
  if (!signup.stage_history) {
    signup.stage_history = [];
  }
  signup.stage_history.push({
    stage: newStage,
    timestamp: new Date().toISOString()
  });

  await storeSignup(signup);
  return true;
}

/**
 * Send notification
 */
async function sendNotification(email, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: email,
      hunt_id: 'hunter_onboarding',
      type,
      data
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

/**
 * Generate discount code
 */
function generateDiscountCode() {
  const prefix = 'HUNT20';
  const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomString}`;
}

/**
 * Generate referral code
 */
function generateReferralCode(name) {
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4);
  const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${cleanName}${randomString}`;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'HunterOnboardingAgent',
    version: '1.0.0',
    features: [
      'Quick signup flow',
      'Profile creation with preferences',
      'Interactive tutorial hunt (3 stops)',
      'First hunt 20% discount',
      'Referral system with bonuses',
      'Progress tracking (6 stages)',
      'Abandoned signup recovery',
      'Gamification and achievements'
    ]
  });
});

// ============================================
// CAPABILITY 1: INITIAL SIGNUP
// ============================================

/**
 * Start hunter signup
 */
app.post('/signup/start', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      heard_about_us,
      accept_terms
    } = req.body;

    if (!name || !email || !accept_terms) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'accept_terms']
      });
    }

    // Check if email already has active signup
    const existingSignups = await redisClient.sMembers(`hunter:${email}:signups`);
    for (const signup_id of existingSignups) {
      const signup = await getSignup(signup_id);
      if (signup && signup.stage !== SIGNUP_STAGES.ABANDONED && signup.stage !== SIGNUP_STAGES.ACTIVATED) {
        return res.status(409).json({
          error: 'Signup already in progress',
          signup_id: signup.signup_id,
          stage: signup.stage
        });
      }
    }

    const signup = {
      signup_id: uuidv4(),
      name,
      email,
      phone: phone || null,
      heard_about_us: heard_about_us || 'other',
      accept_terms,
      stage: SIGNUP_STAGES.INITIAL_SIGNUP,
      stage_history: [{
        stage: SIGNUP_STAGES.INITIAL_SIGNUP,
        timestamp: new Date().toISOString()
      }],
      tutorial_progress: {
        started: false,
        stops_completed: [],
        total_points: 0,
        completed: false
      },
      referral_code: generateReferralCode(name),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await storeSignup(signup);

    // Send welcome notification
    await sendNotification(email, 'hunter_welcome', {
      name,
      signup_id: signup.signup_id
    });

    res.json({
      success: true,
      message: 'Signup started successfully',
      signup: {
        signup_id: signup.signup_id,
        stage: signup.stage,
        referral_code: signup.referral_code,
        next_steps: [
          'Create your profile',
          'Complete tutorial hunt',
          'Get 20% off your first hunt'
        ]
      }
    });

  } catch (error) {
    console.error('Error starting signup:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: PROFILE CREATION
// ============================================

/**
 * Create hunter profile
 */
app.post('/signup/:signup_id/profile', async (req, res) => {
  try {
    const { signup_id } = req.params;
    const {
      display_name,
      team_preference,
      experience_level,
      interests
    } = req.body;

    const signup = await getSignup(signup_id);
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    // Update profile
    signup.profile = {
      display_name: display_name || signup.name,
      team_preference: team_preference || 'flexible', // solo, team, flexible
      experience_level: experience_level || 'beginner', // beginner, intermediate, expert
      interests: interests || [],
      created_at: new Date().toISOString()
    };

    signup.updated_at = new Date().toISOString();
    await updateSignupStage(signup_id, SIGNUP_STAGES.PROFILE_CREATED);

    res.json({
      success: true,
      message: 'Profile created successfully',
      signup: {
        signup_id: signup.signup_id,
        stage: signup.stage,
        next_steps: ['Start tutorial hunt to learn how it works']
      }
    });

  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: TUTORIAL HUNT
// ============================================

/**
 * Start tutorial hunt
 */
app.post('/signup/:signup_id/tutorial/start', async (req, res) => {
  try {
    const { signup_id } = req.params;

    const signup = await getSignup(signup_id);
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    if (signup.tutorial_progress.started) {
      return res.json({
        success: true,
        message: 'Tutorial already started',
        tutorial: {
          stops_completed: signup.tutorial_progress.stops_completed.length,
          total_stops: TUTORIAL_STOPS.length,
          next_stop: TUTORIAL_STOPS.find(s => !signup.tutorial_progress.stops_completed.includes(s.stop_number))
        }
      });
    }

    // Start tutorial
    signup.tutorial_progress.started = true;
    signup.tutorial_progress.started_at = new Date().toISOString();
    signup.updated_at = new Date().toISOString();
    await storeSignup(signup); // Persist changes before updating stage
    await updateSignupStage(signup_id, SIGNUP_STAGES.TUTORIAL_STARTED);

    // Send tutorial start notification
    await sendNotification(signup.email, 'tutorial_start', {
      name: signup.name,
      first_stop: TUTORIAL_STOPS[0].name
    });

    res.json({
      success: true,
      message: 'Tutorial hunt started',
      tutorial: {
        total_stops: TUTORIAL_STOPS.length,
        first_stop: TUTORIAL_STOPS[0],
        instructions: 'Scan the QR codes at each stop to progress'
      }
    });

  } catch (error) {
    console.error('Error starting tutorial:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complete tutorial stop
 */
app.post('/signup/:signup_id/tutorial/scan', async (req, res) => {
  try {
    const { signup_id } = req.params;
    const { qr_code } = req.body;

    const signup = await getSignup(signup_id);
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    if (!signup.tutorial_progress.started) {
      return res.status(400).json({ error: 'Tutorial not started yet' });
    }

    // Find the stop
    const stop = TUTORIAL_STOPS.find(s => s.qr_code === qr_code);
    if (!stop) {
      return res.status(400).json({ error: 'Invalid tutorial QR code' });
    }

    // Check if already completed
    if (signup.tutorial_progress.stops_completed.includes(stop.stop_number)) {
      return res.status(400).json({ error: 'Stop already completed' });
    }

    // Complete the stop
    signup.tutorial_progress.stops_completed.push(stop.stop_number);
    signup.tutorial_progress.total_points += stop.points;

    // Check if tutorial is complete
    if (signup.tutorial_progress.stops_completed.length === TUTORIAL_STOPS.length) {
      signup.tutorial_progress.completed = true;
      signup.tutorial_progress.completed_at = new Date().toISOString();
      await updateSignupStage(signup_id, SIGNUP_STAGES.TUTORIAL_COMPLETED);

      // Generate first hunt discount
      const discountCode = generateDiscountCode();
      signup.first_hunt_discount = {
        code: discountCode,
        discount_percentage: 20,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        used: false
      };

      await updateSignupStage(signup_id, SIGNUP_STAGES.FIRST_HUNT_READY);

      // Send completion notification with discount
      await sendNotification(signup.email, 'tutorial_complete', {
        name: signup.name,
        total_points: signup.tutorial_progress.total_points
      });

      await sendNotification(signup.email, 'first_hunt_discount', {
        name: signup.name,
        discount_code: discountCode,
        discount_percentage: 20,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      });

      signup.updated_at = new Date().toISOString();
      await storeSignup(signup);

      return res.json({
        success: true,
        message: 'Tutorial completed! Congratulations!',
        tutorial: {
          completed: true,
          total_points: signup.tutorial_progress.total_points,
          discount_code: discountCode,
          discount_percentage: 20
        }
      });
    }

    signup.updated_at = new Date().toISOString();
    await storeSignup(signup);

    // Get next stop
    const nextStop = TUTORIAL_STOPS.find(s => !signup.tutorial_progress.stops_completed.includes(s.stop_number));

    res.json({
      success: true,
      message: `Stop ${stop.stop_number} completed! +${stop.points} points`,
      tutorial: {
        stop_completed: stop.stop_number,
        points_earned: stop.points,
        total_points: signup.tutorial_progress.total_points,
        stops_remaining: TUTORIAL_STOPS.length - signup.tutorial_progress.stops_completed.length,
        next_stop: nextStop || null
      }
    });

  } catch (error) {
    console.error('Error completing tutorial stop:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: REFERRAL SYSTEM
// ============================================

/**
 * Send referral invitations
 */
app.post('/signup/:signup_id/invite-friends', async (req, res) => {
  try {
    const { signup_id } = req.params;
    const { friend_emails } = req.body;

    if (!friend_emails || !Array.isArray(friend_emails) || friend_emails.length === 0) {
      return res.status(400).json({ error: 'friend_emails array required' });
    }

    const signup = await getSignup(signup_id);
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    // Store referral data
    if (!signup.referrals) {
      signup.referrals = {
        code: signup.referral_code,
        invites_sent: [],
        successful_signups: 0,
        bonus_earned: 0
      };
    }

    const invitationsSent = [];
    for (const friend_email of friend_emails) {
      // Store referral tracking
      const referralData = {
        referrer_id: signup_id,
        referrer_email: signup.email,
        referrer_name: signup.name,
        friend_email,
        referral_code: signup.referral_code,
        sent_at: new Date().toISOString(),
        completed: false
      };

      await redisClient.setEx(
        `referral:${signup.referral_code}:${friend_email}`,
        7776000, // 90 days
        JSON.stringify(referralData)
      );

      signup.referrals.invites_sent.push({
        email: friend_email,
        sent_at: new Date().toISOString()
      });

      invitationsSent.push(friend_email);

      // Send referral notification to friend
      await sendNotification(friend_email, 'referral_sent', {
        referrer_name: signup.name,
        referral_code: signup.referral_code
      });
    }

    signup.updated_at = new Date().toISOString();
    await storeSignup(signup);

    res.json({
      success: true,
      message: `${invitationsSent.length} invitation(s) sent`,
      referrals: {
        referral_code: signup.referral_code,
        invitations_sent: invitationsSent,
        total_sent: signup.referrals.invites_sent.length
      }
    });

  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Apply referral code during signup
 */
app.post('/signup/apply-referral', async (req, res) => {
  try {
    const { email, referral_code } = req.body;

    if (!email || !referral_code) {
      return res.status(400).json({ error: 'email and referral_code required' });
    }

    // Find referral record
    const referralKey = `referral:${referral_code}:${email}`;
    const referralData = await redisClient.get(referralKey);

    if (!referralData) {
      return res.status(404).json({ error: 'Invalid or expired referral code' });
    }

    const referral = JSON.parse(referralData);

    if (referral.completed) {
      return res.status(400).json({ error: 'Referral code already used' });
    }

    // Mark as completed
    referral.completed = true;
    referral.completed_at = new Date().toISOString();
    await redisClient.setEx(referralKey, 7776000, JSON.stringify(referral));

    // Update referrer's signup
    const referrerSignup = await getSignup(referral.referrer_id);
    if (referrerSignup) {
      referrerSignup.referrals.successful_signups += 1;
      referrerSignup.referrals.bonus_earned += 10; // 10 points per successful referral
      await storeSignup(referrerSignup);

      // Notify referrer
      await sendNotification(referrerSignup.email, 'referral_completed', {
        name: referrerSignup.name,
        friend_email: email,
        bonus_points: 10
      });
    }

    res.json({
      success: true,
      message: 'Referral code applied successfully',
      bonus: {
        referrer: referral.referrer_name,
        bonus_points: 5 // Referred user gets 5 points
      }
    });

  } catch (error) {
    console.error('Error applying referral:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: ABANDONED SIGNUP RECOVERY
// ============================================

/**
 * Trigger abandoned signup recovery
 */
app.post('/signup/:signup_id/abandon-recover', async (req, res) => {
  try {
    const { signup_id } = req.params;
    const { hours_since_signup } = req.body;

    const signup = await getSignup(signup_id);
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    if (signup.stage === SIGNUP_STAGES.ACTIVATED) {
      return res.status(400).json({ error: 'Signup already activated' });
    }

    // Mark as abandoned
    await updateSignupStage(signup_id, SIGNUP_STAGES.ABANDONED);

    // Send recovery email based on time elapsed
    const notificationType = hours_since_signup >= 48 ? 'abandoned_signup_48h' : 'abandoned_signup_24h';

    await sendNotification(signup.email, notificationType, {
      name: signup.name,
      signup_id,
      current_stage: signup.stage
    });

    res.json({
      success: true,
      message: 'Recovery email sent',
      signup: {
        signup_id,
        stage: signup.stage,
        recovery_email_sent: true
      }
    });

  } catch (error) {
    console.error('Error triggering recovery:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: SIGNUP MANAGEMENT
// ============================================

/**
 * Get signup details
 */
app.get('/signup/:signup_id', async (req, res) => {
  try {
    const { signup_id } = req.params;

    const signup = await getSignup(signup_id);
    if (!signup) {
      return res.status(404).json({ error: 'Signup not found' });
    }

    res.json({
      success: true,
      signup
    });

  } catch (error) {
    console.error('Error getting signup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get onboarding funnel statistics
 */
app.get('/signup/stats/funnel', async (req, res) => {
  try {
    const stats = {
      total: 0,
      by_stage: {},
      funnel_conversion: {}
    };

    // Count by stage
    for (const stage of Object.values(SIGNUP_STAGES)) {
      const count = await redisClient.sCard(`hunter_signups:stage:${stage}`);
      stats.by_stage[stage] = count;
      stats.total += count;
    }

    // Calculate funnel conversion rates
    const total = stats.total || 1; // Avoid division by zero
    stats.funnel_conversion = {
      signup_to_profile: ((stats.by_stage[SIGNUP_STAGES.PROFILE_CREATED] || 0) / total * 100).toFixed(1) + '%',
      profile_to_tutorial: ((stats.by_stage[SIGNUP_STAGES.TUTORIAL_STARTED] || 0) / total * 100).toFixed(1) + '%',
      tutorial_to_complete: ((stats.by_stage[SIGNUP_STAGES.TUTORIAL_COMPLETED] || 0) / total * 100).toFixed(1) + '%',
      complete_to_activated: ((stats.by_stage[SIGNUP_STAGES.ACTIVATED] || 0) / total * 100).toFixed(1) + '%',
      overall_conversion: ((stats.by_stage[SIGNUP_STAGES.ACTIVATED] || 0) / total * 100).toFixed(1) + '%',
      abandonment_rate: ((stats.by_stage[SIGNUP_STAGES.ABANDONED] || 0) / total * 100).toFixed(1) + '%'
    };

    res.json({
      success: true,
      stats,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting funnel stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Hunter Onboarding Agent v1.0 listening on port ${port}`);
  console.log(`🏃 Features:`);
  console.log(`   - Quick signup flow`);
  console.log(`   - Profile creation with preferences`);
  console.log(`   - Interactive tutorial hunt (3 stops)`);
  console.log(`   - First hunt 20% discount`);
  console.log(`   - Referral system with bonuses`);
  console.log(`   - Progress tracking (6 stages)`);
  console.log(`   - Abandoned signup recovery`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /signup/start - Start hunter signup`);
  console.log(`   POST /signup/:id/profile - Create profile`);
  console.log(`   POST /signup/:id/tutorial/start - Start tutorial hunt`);
  console.log(`   POST /signup/:id/tutorial/scan - Complete tutorial stop`);
  console.log(`   POST /signup/:id/invite-friends - Send referral invitations`);
  console.log(`   POST /signup/apply-referral - Apply referral code`);
  console.log(`   POST /signup/:id/abandon-recover - Trigger recovery email`);
  console.log(`   GET  /signup/:id - Get signup details`);
  console.log(`   GET  /signup/stats/funnel - Get onboarding funnel metrics`);
});

module.exports = app;
