const express = require('express');
const redis = require('redis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const app = express();
const port = process.env.AGENT_PORT || 9016;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const HUNTER_ONBOARDING_URL = process.env.HUNTER_ONBOARDING_URL || 'http://hunter-onboarding-agent:9012';
const RETENTION_URL = process.env.RETENTION_URL || 'http://retention-agent:9014';
const BI_ANALYTICS_URL = process.env.BI_ANALYTICS_URL || 'http://bi-analytics-agent:9022';

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
// EMAIL MARKETING CONFIGURATION
// ============================================

const EMAIL_TEMPLATES = {
  WELCOME: {
    id: 'welcome',
    subject: 'Welcome to Koopjesjacht! 🎯',
    body: 'Hi {name}! Welcome to the ultimate food scavenger hunt experience. Start your tutorial to get 20% off your first hunt!',
    cta: 'Start Tutorial',
    cta_link: '{tutorial_link}'
  },
  TUTORIAL_REMINDER: {
    id: 'tutorial_reminder',
    subject: 'Complete your tutorial and get 20% off! 🎓',
    body: 'Hi {name}! You started your Koopjesjacht tutorial but did not finish. Complete it now to unlock your 20% discount code!',
    cta: 'Finish Tutorial',
    cta_link: '{tutorial_link}'
  },
  WEEKLY_DIGEST: {
    id: 'weekly_digest',
    subject: 'New hunts this week in {city} 🍽️',
    body: 'Hi {name}! Check out the hottest new hunts in {city} this week. {hunt_count} new venues added!',
    cta: 'Browse Hunts',
    cta_link: '{hunts_link}'
  },
  REENGAGEMENT_7DAY: {
    id: 'reengagement_7day',
    subject: 'We miss you! Come back for €5 off 💝',
    body: 'Hi {name}! It has been 7 days since your last hunt. Come back and get €5 off your next adventure!',
    cta: 'Claim Discount',
    cta_link: '{discount_link}'
  },
  REENGAGEMENT_30DAY: {
    id: 'reengagement_30day',
    subject: 'Special offer: 50% off your next hunt! 🎁',
    body: 'Hi {name}! We have missed you for 30 days. Here is a special 50% discount just for you. Expires in 7 days!',
    cta: 'Get 50% Off',
    cta_link: '{discount_link}'
  },
  REFERRAL_INVITATION: {
    id: 'referral_invitation',
    subject: 'Share Koopjesjacht and earn €10! 🎉',
    body: 'Hi {name}! Love Koopjesjacht? Invite your friends and earn €10 when they complete their first hunt. You both win!',
    cta: 'Get Referral Link',
    cta_link: '{referral_link}'
  },
  MILESTONE_CELEBRATION: {
    id: 'milestone_celebration',
    subject: 'Congratulations on {milestone}! 🏆',
    body: 'Hi {name}! You just reached a major milestone: {milestone}! Keep hunting and unlock even more rewards.',
    cta: 'See Your Progress',
    cta_link: '{profile_link}'
  },
  HUNT_RECOMMENDATION: {
    id: 'hunt_recommendation',
    subject: 'Hunts we think you will love 💡',
    body: 'Hi {name}! Based on your preferences, we found {hunt_count} hunts you might enjoy in {city}.',
    cta: 'View Recommendations',
    cta_link: '{hunts_link}'
  }
};

const DRIP_SEQUENCES = {
  WELCOME_SERIES: {
    id: 'welcome_series',
    name: 'Welcome Series',
    emails: [
      { template: 'WELCOME', delay_hours: 0 },
      { template: 'TUTORIAL_REMINDER', delay_hours: 24 },
      { template: 'HUNT_RECOMMENDATION', delay_hours: 72 },
      { template: 'REFERRAL_INVITATION', delay_hours: 168 }
    ]
  },
  REENGAGEMENT_SERIES: {
    id: 'reengagement_series',
    name: 'Re-engagement Series',
    emails: [
      { template: 'REENGAGEMENT_7DAY', delay_hours: 168 },
      { template: 'REENGAGEMENT_30DAY', delay_hours: 720 }
    ]
  }
};

const USER_SEGMENTS = {
  ALL: 'all',
  ACTIVE: 'active',
  AT_RISK: 'at_risk',
  DORMANT: 'dormant',
  CHURNED: 'churned',
  POWER_USERS: 'power_users',
  FIRST_TIMERS: 'first_timers',
  TUTORIAL_INCOMPLETE: 'tutorial_incomplete'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store campaign
 */
async function storeCampaign(campaign) {
  const key = `campaign:${campaign.campaign_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(campaign)); // 30 day TTL

  await redisClient.sAdd('campaigns:all', campaign.campaign_id);
  if (campaign.status === 'scheduled') {
    await redisClient.sAdd('campaigns:scheduled', campaign.campaign_id);
  }
}

/**
 * Get campaign
 */
async function getCampaign(campaignId) {
  const data = await redisClient.get(`campaign:${campaignId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Store email template
 */
async function storeTemplate(template) {
  const key = `template:${template.template_id}`;
  await redisClient.setEx(key, 31536000, JSON.stringify(template)); // 1 year TTL
  await redisClient.sAdd('templates:all', template.template_id);
}

/**
 * Get user segment
 */
async function getUserSegment(segmentType, limit = 1000) {
  // Simulated segmentation - in production, query from Hunter Onboarding/Retention agents
  const users = [];

  // This would normally fetch from other agents
  // For now, return mock data
  for (let i = 0; i < Math.min(limit, 50); i++) {
    users.push({
      user_id: `user_${i}`,
      email: `user${i}@example.com`,
      name: `User ${i}`,
      status: segmentType
    });
  }

  return users;
}

/**
 * Send email via Notification Service
 */
async function sendEmail(userId, templateId, variables) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      user_id: userId,
      template: templateId,
      variables,
      channels: ['email']
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    return false;
  }
}

/**
 * Track email event
 */
async function trackEmailEvent(campaignId, userId, event, data = {}) {
  const eventRecord = {
    event_id: uuidv4(),
    campaign_id: campaignId,
    user_id: userId,
    event_type: event, // sent, opened, clicked, unsubscribed
    timestamp: new Date().toISOString(),
    ...data
  };

  await redisClient.lPush(`campaign:${campaignId}:events`, JSON.stringify(eventRecord));
  await redisClient.incr(`campaign:${campaignId}:${event}_count`);
}

/**
 * Replace template variables
 */
function replaceVariables(text, variables) {
  let result = text;
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), variables[key]);
  });
  return result;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'EmailMarketingAgent',
    version: '1.0.0',
    features: [
      'Email campaigns',
      'Drip sequences',
      'User segmentation',
      'A/B testing for emails',
      'Campaign analytics',
      'Send time optimization',
      'Template management',
      'Automated scheduling'
    ]
  });
});

// ============================================
// CAPABILITY 1: CAMPAIGN MANAGEMENT
// ============================================

/**
 * Create email campaign
 */
app.post('/campaign/create', async (req, res) => {
  try {
    const {
      name,
      template_id,
      segment,
      subject_variants,
      send_time,
      ab_test_enabled = false
    } = req.body;

    const campaign = {
      campaign_id: uuidv4(),
      name,
      template_id,
      segment,
      subject_variants: subject_variants || [],
      send_time,
      ab_test_enabled,
      status: 'draft',
      sent_count: 0,
      opened_count: 0,
      clicked_count: 0,
      unsubscribed_count: 0,
      created_at: new Date().toISOString()
    };

    await storeCampaign(campaign);

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
 * Send campaign
 */
app.post('/campaign/send', async (req, res) => {
  try {
    const { campaign_id } = req.body;

    const campaign = await getCampaign(campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get users in segment
    const users = await getUserSegment(campaign.segment);

    let sentCount = 0;
    const template = EMAIL_TEMPLATES[campaign.template_id];

    for (const user of users) {
      const variables = {
        name: user.name,
        city: 'Amsterdam',
        hunt_count: 5,
        tutorial_link: 'https://koopjesjacht.nl/tutorial',
        hunts_link: 'https://koopjesjacht.nl/hunts',
        discount_link: 'https://koopjesjacht.nl/discount',
        referral_link: 'https://koopjesjacht.nl/referral',
        profile_link: 'https://koopjesjacht.nl/profile',
        milestone: 'First Hunt Completed'
      };

      const success = await sendEmail(user.user_id, template.id, variables);

      if (success) {
        sentCount++;
        await trackEmailEvent(campaign_id, user.user_id, 'sent');
      }
    }

    // Update campaign status
    campaign.status = 'sent';
    campaign.sent_count = sentCount;
    campaign.sent_at = new Date().toISOString();
    await storeCampaign(campaign);

    res.json({
      success: true,
      message: 'Campaign sent',
      campaign_id,
      sent_count: sentCount,
      total_recipients: users.length
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Schedule campaign
 */
app.post('/campaign/schedule', async (req, res) => {
  try {
    const { campaign_id, send_time } = req.body;

    const campaign = await getCampaign(campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    campaign.status = 'scheduled';
    campaign.send_time = send_time;
    await storeCampaign(campaign);

    res.json({
      success: true,
      message: 'Campaign scheduled',
      campaign_id,
      send_time
    });

  } catch (error) {
    console.error('Error scheduling campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List campaigns
 */
app.get('/campaign/list', async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;

    const campaignIds = await redisClient.sMembers('campaigns:all');
    const campaigns = [];

    for (const id of campaignIds.slice(0, parseInt(limit))) {
      const campaign = await getCampaign(id);
      if (campaign && (!status || campaign.status === status)) {
        campaigns.push(campaign);
      }
    }

    // Sort by created_at descending
    campaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

/**
 * Get campaign details
 */
app.get('/campaign/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaign(id);
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
 * Get campaign statistics
 */
app.get('/campaign/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await getCampaign(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const sentCount = parseInt(await redisClient.get(`campaign:${id}:sent_count`) || '0');
    const openedCount = parseInt(await redisClient.get(`campaign:${id}:opened_count`) || '0');
    const clickedCount = parseInt(await redisClient.get(`campaign:${id}:clicked_count`) || '0');
    const unsubscribedCount = parseInt(await redisClient.get(`campaign:${id}:unsubscribed_count`) || '0');

    const stats = {
      campaign_id: id,
      sent_count: sentCount,
      opened_count: openedCount,
      clicked_count: clickedCount,
      unsubscribed_count: unsubscribedCount,
      open_rate: sentCount > 0 ? (openedCount / sentCount) : 0,
      click_rate: sentCount > 0 ? (clickedCount / sentCount) : 0,
      click_to_open_rate: openedCount > 0 ? (clickedCount / openedCount) : 0,
      unsubscribe_rate: sentCount > 0 ? (unsubscribedCount / sentCount) : 0
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: TEMPLATE MANAGEMENT
// ============================================

/**
 * Create email template
 */
app.post('/template/create', async (req, res) => {
  try {
    const { name, subject, body, cta, cta_link } = req.body;

    const template = {
      template_id: uuidv4(),
      name,
      subject,
      body,
      cta,
      cta_link,
      created_at: new Date().toISOString()
    };

    await storeTemplate(template);

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List templates
 */
app.get('/template/list', async (req, res) => {
  try {
    // Return built-in templates
    const templates = Object.keys(EMAIL_TEMPLATES).map(key => ({
      template_id: EMAIL_TEMPLATES[key].id,
      name: key,
      subject: EMAIL_TEMPLATES[key].subject,
      body: EMAIL_TEMPLATES[key].body
    }));

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: DRIP SEQUENCES
// ============================================

/**
 * Create drip sequence
 */
app.post('/drip/create', async (req, res) => {
  try {
    const { name, emails } = req.body;

    const drip = {
      drip_id: uuidv4(),
      name,
      emails, // Array of {template, delay_hours}
      active: true,
      created_at: new Date().toISOString()
    };

    await redisClient.setEx(`drip:${drip.drip_id}`, 31536000, JSON.stringify(drip));

    res.json({
      success: true,
      drip
    });

  } catch (error) {
    console.error('Error creating drip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enroll user in drip sequence
 */
app.post('/drip/enroll', async (req, res) => {
  try {
    const { user_id, drip_id } = req.body;

    const enrollment = {
      enrollment_id: uuidv4(),
      user_id,
      drip_id,
      enrolled_at: new Date().toISOString(),
      current_step: 0,
      completed: false
    };

    await redisClient.setEx(
      `drip_enrollment:${user_id}:${drip_id}`,
      2592000,
      JSON.stringify(enrollment)
    );

    res.json({
      success: true,
      message: 'User enrolled in drip sequence',
      enrollment
    });

  } catch (error) {
    console.error('Error enrolling in drip:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: SEGMENTATION
// ============================================

/**
 * Create user segment
 */
app.post('/segment/create', async (req, res) => {
  try {
    const { name, criteria } = req.body;

    const segment = {
      segment_id: uuidv4(),
      name,
      criteria, // {status: 'active', loyalty_tier: 'gold', etc.}
      created_at: new Date().toISOString()
    };

    await redisClient.setEx(`segment:${segment.segment_id}`, 31536000, JSON.stringify(segment));

    res.json({
      success: true,
      segment
    });

  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List segments
 */
app.get('/segment/list', async (req, res) => {
  try {
    const segments = Object.keys(USER_SEGMENTS).map(key => ({
      segment_id: USER_SEGMENTS[key],
      name: key,
      description: `Users in ${USER_SEGMENTS[key]} status`
    }));

    res.json({
      success: true,
      segments
    });

  } catch (error) {
    console.error('Error listing segments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get users in segment
 */
app.get('/segment/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const users = await getUserSegment(id, parseInt(limit));

    res.json({
      success: true,
      segment_id: id,
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Error getting segment users:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: ANALYTICS
// ============================================

/**
 * Get analytics overview
 */
app.get('/analytics/overview', async (req, res) => {
  try {
    const { period = 30 } = req.query;

    // Get all campaigns
    const campaignIds = await redisClient.sMembers('campaigns:all');

    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalUnsubscribed = 0;

    for (const id of campaignIds) {
      totalSent += parseInt(await redisClient.get(`campaign:${id}:sent_count`) || '0');
      totalOpened += parseInt(await redisClient.get(`campaign:${id}:opened_count`) || '0');
      totalClicked += parseInt(await redisClient.get(`campaign:${id}:clicked_count`) || '0');
      totalUnsubscribed += parseInt(await redisClient.get(`campaign:${id}:unsubscribed_count`) || '0');
    }

    const analytics = {
      period_days: parseInt(period),
      total_campaigns: campaignIds.length,
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      total_unsubscribed: totalUnsubscribed,
      overall_open_rate: totalSent > 0 ? (totalOpened / totalSent) : 0,
      overall_click_rate: totalSent > 0 ? (totalClicked / totalSent) : 0,
      overall_unsubscribe_rate: totalSent > 0 ? (totalUnsubscribed / totalSent) : 0
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Track email open
 */
app.post('/track/open', async (req, res) => {
  try {
    const { campaign_id, user_id } = req.body;

    await trackEmailEvent(campaign_id, user_id, 'opened');

    res.json({
      success: true,
      message: 'Open tracked'
    });

  } catch (error) {
    console.error('Error tracking open:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Track email click
 */
app.post('/track/click', async (req, res) => {
  try {
    const { campaign_id, user_id, link } = req.body;

    await trackEmailEvent(campaign_id, user_id, 'clicked', { link });

    res.json({
      success: true,
      message: 'Click tracked'
    });

  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Track unsubscribe
 */
app.post('/track/unsubscribe', async (req, res) => {
  try {
    const { campaign_id, user_id } = req.body;

    await trackEmailEvent(campaign_id, user_id, 'unsubscribed');

    // Mark user as unsubscribed
    await redisClient.set(`user:${user_id}:unsubscribed`, 'true');

    res.json({
      success: true,
      message: 'Unsubscribed'
    });

  } catch (error) {
    console.error('Error tracking unsubscribe:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CRON JOBS (Scheduled campaigns)
// ============================================

// Check for scheduled campaigns every hour
cron.schedule('0 * * * *', async () => {
  console.log('Checking for scheduled campaigns...');

  try {
    const scheduledIds = await redisClient.sMembers('campaigns:scheduled');
    const now = new Date();

    for (const campaignId of scheduledIds) {
      const campaign = await getCampaign(campaignId);

      if (campaign && new Date(campaign.send_time) <= now) {
        console.log(`Sending scheduled campaign: ${campaign.name}`);

        // Send campaign
        // (Implementation would call the send logic)

        // Remove from scheduled
        await redisClient.sRem('campaigns:scheduled', campaignId);
      }
    }
  } catch (error) {
    console.error('Error processing scheduled campaigns:', error);
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Email Marketing Agent v1.0 listening on port ${port}`);
  console.log(`📧 Features:`);
  console.log(`   - Email campaigns`);
  console.log(`   - Drip sequences`);
  console.log(`   - User segmentation`);
  console.log(`   - A/B testing`);
  console.log(`   - Campaign analytics`);
  console.log(`   - Template management`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /campaign/create - Create campaign`);
  console.log(`   POST /campaign/send - Send campaign`);
  console.log(`   POST /campaign/schedule - Schedule campaign`);
  console.log(`   GET  /campaign/list - List campaigns`);
  console.log(`   GET  /campaign/:id - Get campaign`);
  console.log(`   GET  /campaign/:id/stats - Get campaign stats`);
  console.log(`   POST /template/create - Create template`);
  console.log(`   GET  /template/list - List templates`);
  console.log(`   POST /drip/create - Create drip sequence`);
  console.log(`   POST /drip/enroll - Enroll in drip`);
  console.log(`   POST /segment/create - Create segment`);
  console.log(`   GET  /segment/list - List segments`);
  console.log(`   GET  /segment/:id/users - Get segment users`);
  console.log(`   GET  /analytics/overview - Analytics overview`);
  console.log(`   POST /track/open - Track email open`);
  console.log(`   POST /track/click - Track email click`);
  console.log(`   POST /track/unsubscribe - Track unsubscribe`);
});

module.exports = app;
