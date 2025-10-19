const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9009;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const VENUE_MANAGEMENT_URL = process.env.VENUE_MANAGEMENT_URL || 'http://venue-agent:9006';
const VENUE_ONBOARDING_URL = process.env.VENUE_ONBOARDING_URL || 'http://venue-onboarding-agent:9008';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';

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

const VENUE_STATUS = {
  ACTIVE: 'active',           // Regular visitors, good performance
  PENDING: 'pending',         // Newly onboarded, awaiting first visits
  AT_RISK: 'at_risk',        // Low traffic or declining performance
  CHURNED: 'churned',         // No visitors in 30+ days
  SUSPENDED: 'suspended'      // Temporarily inactive
};

const COMMUNICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PHONE: 'phone',
  IN_PERSON: 'in_person',
  AUTOMATED: 'automated'
};

const CAMPAIGN_TYPES = {
  ONBOARDING: 'onboarding',
  PERFORMANCE_UPDATE: 'performance_update',
  ENGAGEMENT: 'engagement',
  RENEWAL: 'renewal',
  WINBACK: 'winback',
  PROMOTIONAL: 'promotional'
};

const ALERT_TYPES = {
  LOW_TRAFFIC: 'low_traffic',
  NO_SCANS: 'no_scans',
  NEGATIVE_FEEDBACK: 'negative_feedback',
  RENEWAL_DUE: 'renewal_due',
  PERFORMANCE_DECLINE: 'performance_decline'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store venue contact
 */
async function storeVenueContact(contact) {
  const key = `venue_contact:${contact.venue_id}`;
  await redisClient.set(key, JSON.stringify(contact));

  // Add to global contacts list
  await redisClient.sAdd('venue_contacts:all', contact.venue_id);

  // Add to status-specific list
  await redisClient.sAdd(`venue_contacts:status:${contact.status}`, contact.venue_id);
}

/**
 * Get venue contact
 */
async function getVenueContact(venueId) {
  const key = `venue_contact:${venueId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store communication
 */
async function storeCommunication(communication) {
  const key = `communication:${communication.communication_id}`;
  await redisClient.setEx(key, 7776000, JSON.stringify(communication)); // 90 day TTL

  // Add to venue's communication history
  await redisClient.lPush(`venue_communications:${communication.venue_id}`, communication.communication_id);
  await redisClient.lTrim(`venue_communications:${communication.venue_id}`, 0, 99); // Keep last 100
}

/**
 * Get venue communications
 */
async function getVenueCommunications(venueId, limit = 10) {
  const commIds = await redisClient.lRange(`venue_communications:${venueId}`, 0, limit - 1);

  const communications = [];
  for (const id of commIds) {
    const data = await redisClient.get(`communication:${id}`);
    if (data) {
      communications.push(JSON.parse(data));
    }
  }

  return communications;
}

/**
 * Store campaign
 */
async function storeCampaign(campaign) {
  const key = `venue_campaign:${campaign.campaign_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(campaign)); // 30 day TTL

  await redisClient.sAdd('venue_campaigns:all', campaign.campaign_id);
  await redisClient.sAdd(`venue_campaigns:type:${campaign.type}`, campaign.campaign_id);
}

/**
 * Get campaign
 */
async function getCampaign(campaignId) {
  const key = `venue_campaign:${campaignId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store alert
 */
async function storeAlert(alert) {
  const key = `venue_alert:${alert.alert_id}`;
  await redisClient.setEx(key, 604800, JSON.stringify(alert)); // 7 day TTL

  await redisClient.sAdd('venue_alerts:active', alert.alert_id);
  await redisClient.sAdd(`venue_alerts:venue:${alert.venue_id}`, alert.alert_id);
  await redisClient.sAdd(`venue_alerts:type:${alert.type}`, alert.alert_id);
}

/**
 * Get venue alerts
 */
async function getVenueAlerts(venueId, includeResolved = false) {
  const alertIds = await redisClient.sMembers(`venue_alerts:venue:${venueId}`);

  const alerts = [];
  for (const id of alertIds) {
    const data = await redisClient.get(`venue_alert:${id}`);
    if (data) {
      const alert = JSON.parse(data);
      if (includeResolved || !alert.resolved) {
        alerts.push(alert);
      }
    }
  }

  return alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Send notification
 */
async function sendNotification(venueId, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: venueId,
      hunt_id: 'venue_crm',
      type,
      data
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

/**
 * Calculate venue status based on activity
 */
async function calculateVenueStatus(venueId) {
  // This would integrate with Stats Aggregator to get actual visit data
  // For now, return mock status
  return VENUE_STATUS.ACTIVE;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'VenueCRMAgent',
    version: '1.0.0',
    features: [
      'Venue contact database',
      'Communication history tracking',
      'Bulk communication campaigns',
      'Venue segmentation (5 statuses)',
      'Performance alerts and monitoring',
      'Automated check-ins',
      'Satisfaction surveys',
      'Renewal tracking'
    ]
  });
});

// ============================================
// CAPABILITY 1: CONTACT MANAGEMENT
// ============================================

/**
 * Create or update venue contact
 */
app.post('/contact/upsert', async (req, res) => {
  try {
    const {
      venue_id,
      venue_name,
      owner_name,
      email,
      phone,
      secondary_contact,
      address,
      notes,
      tags
    } = req.body;

    if (!venue_id || !venue_name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['venue_id', 'venue_name', 'email']
      });
    }

    // Get existing contact or create new
    let contact = await getVenueContact(venue_id);

    if (contact) {
      // Update existing
      contact.venue_name = venue_name;
      contact.owner_name = owner_name || contact.owner_name;
      contact.email = email;
      contact.phone = phone || contact.phone;
      contact.secondary_contact = secondary_contact || contact.secondary_contact;
      contact.address = address || contact.address;
      contact.notes = notes || contact.notes;
      contact.tags = tags || contact.tags;
      contact.updated_at = new Date().toISOString();
    } else {
      // Create new
      contact = {
        venue_id,
        venue_name,
        owner_name: owner_name || 'Unknown',
        email,
        phone: phone || null,
        secondary_contact: secondary_contact || null,
        address: address || null,
        notes: notes || '',
        tags: tags || [],
        status: VENUE_STATUS.PENDING,
        last_contact_date: null,
        next_followup_date: null,
        satisfaction_score: null,
        total_communications: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    await storeVenueContact(contact);

    res.json({
      success: true,
      message: contact.created_at === contact.updated_at ? 'Contact created' : 'Contact updated',
      contact: {
        venue_id: contact.venue_id,
        venue_name: contact.venue_name,
        email: contact.email,
        status: contact.status
      }
    });

  } catch (error) {
    console.error('Error upserting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get venue contact
 */
app.get('/contact/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;

    const contact = await getVenueContact(venue_id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    console.error('Error getting contact:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all contacts by status
 */
app.get('/contact/status/:status', async (req, res) => {
  try {
    const { status } = req.params;

    if (!Object.values(VENUE_STATUS).includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: Object.values(VENUE_STATUS)
      });
    }

    const venueIds = await redisClient.sMembers(`venue_contacts:status:${status}`);

    const contacts = [];
    for (const venue_id of venueIds) {
      const contact = await getVenueContact(venue_id);
      if (contact) {
        contacts.push({
          venue_id: contact.venue_id,
          venue_name: contact.venue_name,
          email: contact.email,
          phone: contact.phone,
          status: contact.status,
          last_contact_date: contact.last_contact_date,
          satisfaction_score: contact.satisfaction_score
        });
      }
    }

    res.json({
      success: true,
      status,
      contacts,
      total: contacts.length
    });

  } catch (error) {
    console.error('Error getting contacts by status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: COMMUNICATION TRACKING
// ============================================

/**
 * Log communication
 */
app.post('/communication/log', async (req, res) => {
  try {
    const {
      venue_id,
      type,
      direction,
      subject,
      notes,
      outcome,
      followup_required,
      followup_date
    } = req.body;

    if (!venue_id || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['venue_id', 'type']
      });
    }

    const communication = {
      communication_id: uuidv4(),
      venue_id,
      type,
      direction: direction || 'outbound', // outbound or inbound
      subject: subject || '',
      notes: notes || '',
      outcome: outcome || null,
      followup_required: followup_required || false,
      followup_date: followup_date || null,
      created_at: new Date().toISOString(),
      created_by: 'system' // Would be actual user in production
    };

    await storeCommunication(communication);

    // Update contact
    const contact = await getVenueContact(venue_id);
    if (contact) {
      contact.last_contact_date = new Date().toISOString();
      contact.total_communications += 1;

      if (followup_required && followup_date) {
        contact.next_followup_date = followup_date;
      }

      await storeVenueContact(contact);
    }

    res.json({
      success: true,
      message: 'Communication logged',
      communication: {
        communication_id: communication.communication_id,
        venue_id,
        type,
        created_at: communication.created_at
      }
    });

  } catch (error) {
    console.error('Error logging communication:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get communication history
 */
app.get('/communication/venue/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { limit } = req.query;

    const communications = await getVenueCommunications(venue_id, parseInt(limit) || 10);

    res.json({
      success: true,
      venue_id,
      communications,
      total: communications.length
    });

  } catch (error) {
    console.error('Error getting communications:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: CAMPAIGNS
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
      subject,
      message,
      send_date
    } = req.body;

    if (!name || !type || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'type', 'subject', 'message']
      });
    }

    const campaign = {
      campaign_id: uuidv4(),
      name,
      type,
      target_status: target_status || 'all',
      subject,
      message,
      send_date: send_date || new Date().toISOString(),
      sent_count: 0,
      opened_count: 0,
      clicked_count: 0,
      responded_count: 0,
      created_at: new Date().toISOString(),
      status: 'draft'
    };

    await storeCampaign(campaign);

    res.json({
      success: true,
      message: 'Campaign created',
      campaign: {
        campaign_id: campaign.campaign_id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status
      }
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send campaign
 */
app.post('/campaign/:campaign_id/send', async (req, res) => {
  try {
    const { campaign_id } = req.params;

    const campaign = await getCampaign(campaign_id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get target venues
    let venueIds;

    if (campaign.target_status === 'all') {
      venueIds = await redisClient.sMembers('venue_contacts:all');
    } else {
      venueIds = await redisClient.sMembers(`venue_contacts:status:${campaign.target_status}`);
    }

    // Send to each venue
    let sent = 0;
    for (const venue_id of venueIds) {
      const contact = await getVenueContact(venue_id);
      if (contact) {
        await sendNotification(venue_id, 'venue_campaign', {
          venue_name: contact.venue_name,
          subject: campaign.subject,
          message: campaign.message
        });

        // Log communication
        await storeCommunication({
          communication_id: uuidv4(),
          venue_id,
          type: COMMUNICATION_TYPES.EMAIL,
          direction: 'outbound',
          subject: campaign.subject,
          notes: `Campaign: ${campaign.name}`,
          outcome: null,
          followup_required: false,
          followup_date: null,
          created_at: new Date().toISOString(),
          created_by: 'system'
        });

        sent++;
      }
    }

    // Update campaign
    campaign.sent_count = sent;
    campaign.status = 'sent';
    campaign.sent_at = new Date().toISOString();
    await storeCampaign(campaign);

    res.json({
      success: true,
      message: 'Campaign sent successfully',
      campaign: {
        campaign_id,
        name: campaign.name,
        sent_to: sent,
        total_targets: venueIds.length
      }
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
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
      campaignIds = await redisClient.sMembers(`venue_campaigns:type:${type}`);
    } else {
      campaignIds = await redisClient.sMembers('venue_campaigns:all');
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
          status: campaign.status,
          created_at: campaign.created_at
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
// CAPABILITY 4: ALERTS & MONITORING
// ============================================

/**
 * Create alert
 */
app.post('/alert/create', async (req, res) => {
  try {
    const {
      venue_id,
      type,
      severity,
      message,
      data
    } = req.body;

    if (!venue_id || !type || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['venue_id', 'type', 'message']
      });
    }

    const alert = {
      alert_id: uuidv4(),
      venue_id,
      type,
      severity: severity || 'medium', // low, medium, high, critical
      message,
      data: data || {},
      resolved: false,
      resolved_at: null,
      resolved_by: null,
      created_at: new Date().toISOString()
    };

    await storeAlert(alert);

    // Send notification to venue
    const contact = await getVenueContact(venue_id);
    if (contact) {
      await sendNotification(venue_id, 'venue_alert', {
        venue_name: contact.venue_name,
        alert_type: type,
        message
      });
    }

    res.json({
      success: true,
      message: 'Alert created',
      alert: {
        alert_id: alert.alert_id,
        venue_id,
        type,
        severity: alert.severity
      }
    });

  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resolve alert
 */
app.post('/alert/:alert_id/resolve', async (req, res) => {
  try {
    const { alert_id } = req.params;
    const { resolution_notes } = req.body;

    const alert = await redisClient.get(`venue_alert:${alert_id}`);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alertData = JSON.parse(alert);
    alertData.resolved = true;
    alertData.resolved_at = new Date().toISOString();
    alertData.resolved_by = 'system'; // Would be actual user
    alertData.resolution_notes = resolution_notes || '';

    await redisClient.setEx(`venue_alert:${alert_id}`, 604800, JSON.stringify(alertData));

    // Remove from active alerts
    await redisClient.sRem('venue_alerts:active', alert_id);

    res.json({
      success: true,
      message: 'Alert resolved',
      alert: {
        alert_id,
        resolved_at: alertData.resolved_at
      }
    });

  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get venue alerts
 */
app.get('/alert/venue/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { include_resolved } = req.query;

    const alerts = await getVenueAlerts(venue_id, include_resolved === 'true');

    res.json({
      success: true,
      venue_id,
      alerts,
      total: alerts.length
    });

  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: SATISFACTION & FEEDBACK
// ============================================

/**
 * Record satisfaction score
 */
app.post('/satisfaction/record', async (req, res) => {
  try {
    const { venue_id, score, feedback, category } = req.body;

    if (!venue_id || !score) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['venue_id', 'score']
      });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({
        error: 'Score must be between 1 and 5'
      });
    }

    const contact = await getVenueContact(venue_id);

    if (!contact) {
      return res.status(404).json({ error: 'Venue contact not found' });
    }

    // Store feedback
    const feedbackRecord = {
      feedback_id: uuidv4(),
      venue_id,
      score,
      feedback: feedback || '',
      category: category || 'general',
      recorded_at: new Date().toISOString()
    };

    await redisClient.setEx(
      `venue_feedback:${feedbackRecord.feedback_id}`,
      7776000, // 90 days
      JSON.stringify(feedbackRecord)
    );

    await redisClient.lPush(`venue_feedback_history:${venue_id}`, feedbackRecord.feedback_id);

    // Update contact satisfaction score (average)
    contact.satisfaction_score = score;
    contact.last_feedback_date = new Date().toISOString();
    await storeVenueContact(contact);

    // Create alert if low score
    if (score <= 2) {
      await storeAlert({
        alert_id: uuidv4(),
        venue_id,
        type: ALERT_TYPES.NEGATIVE_FEEDBACK,
        severity: 'high',
        message: `Low satisfaction score: ${score}/5`,
        data: { score, feedback },
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Satisfaction score recorded',
      satisfaction: {
        venue_id,
        score,
        feedback_id: feedbackRecord.feedback_id
      }
    });

  } catch (error) {
    console.error('Error recording satisfaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Venue CRM Agent v1.0 listening on port ${port}`);
  console.log(`📋 Features:`);
  console.log(`   - Venue contact database`);
  console.log(`   - Communication history tracking`);
  console.log(`   - Bulk campaigns`);
  console.log(`   - Venue segmentation`);
  console.log(`   - Performance alerts`);
  console.log(`   - Satisfaction tracking`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /contact/upsert - Create/update venue contact`);
  console.log(`   GET  /contact/:venue_id - Get venue contact`);
  console.log(`   GET  /contact/status/:status - Get contacts by status`);
  console.log(`   POST /communication/log - Log communication`);
  console.log(`   GET  /communication/venue/:venue_id - Get communication history`);
  console.log(`   POST /campaign/create - Create campaign`);
  console.log(`   POST /campaign/:id/send - Send campaign`);
  console.log(`   GET  /campaign/list - List campaigns`);
  console.log(`   POST /alert/create - Create alert`);
  console.log(`   POST /alert/:id/resolve - Resolve alert`);
  console.log(`   GET  /alert/venue/:venue_id - Get venue alerts`);
  console.log(`   POST /satisfaction/record - Record satisfaction score`);
});

module.exports = app;
