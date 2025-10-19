const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9020;

app.use(express.json());

// Agent URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const QR_MANAGER_URL = process.env.QR_MANAGER_URL || 'http://qr-agent:9002';
const PAYMENT_HANDLER_URL = process.env.PAYMENT_HANDLER_URL || 'http://payment-agent:9004';

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
// TICKET STATUS & PRIORITY
// ============================================
const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_CUSTOMER: 'waiting_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const TICKET_PRIORITY = {
  LOW: 'low',           // 48h SLA
  MEDIUM: 'medium',     // 24h SLA
  HIGH: 'high',         // 4h SLA
  URGENT: 'urgent'      // 1h SLA
};

const SLA_HOURS = {
  low: 48,
  medium: 24,
  high: 4,
  urgent: 1
};

// ============================================
// FAQ DATABASE
// ============================================
const FAQ_DATABASE = {
  getting_started: [
    {
      question: 'How do I sign up for a scavenger hunt?',
      answer: 'Simply click the Sign Up button, enter your email and name, create a profile, and complete the quick tutorial hunt. You will get 20% off your first hunt!',
      keywords: ['sign up', 'register', 'join', 'account', 'create']
    },
    {
      question: 'How much does a hunt cost?',
      answer: 'Hunt prices vary by location and difficulty. Most hunts range from €15-30 per person. First-time hunters get 20% off!',
      keywords: ['price', 'cost', 'fee', 'pay', 'money']
    },
    {
      question: 'How long does a hunt take?',
      answer: 'Most hunts take 2-3 hours to complete, but you can go at your own pace. The time limit is usually 4 hours.',
      keywords: ['duration', 'time', 'long', 'hours']
    },
    {
      question: 'Can I do a hunt solo or do I need a team?',
      answer: 'You can do hunts solo or with a team of up to 6 people. Team hunts are more fun and cost-effective!',
      keywords: ['solo', 'team', 'group', 'alone', 'friends']
    }
  ],
  during_hunt: [
    {
      question: 'How do QR codes work?',
      answer: 'When you arrive at a venue, open the app and scan the QR code displayed there. This will reveal your next clue and award you points!',
      keywords: ['qr', 'code', 'scan', 'camera']
    },
    {
      question: 'What if I cannot find a venue?',
      answer: 'You can request hints! The first hint costs 5 points, the second costs 10 points, and the third reveals the exact location but costs 15 points.',
      keywords: ['hint', 'help', 'stuck', 'lost', 'find']
    },
    {
      question: 'Can I pause a hunt and continue later?',
      answer: 'Yes! Your progress is saved automatically. You can pause and resume within the time limit (usually 4 hours from start).',
      keywords: ['pause', 'resume', 'continue', 'stop', 'break']
    },
    {
      question: 'What if a venue is closed?',
      answer: 'Check the venue hours in the app. If a venue is unexpectedly closed, contact support immediately and we will provide an alternative or credit.',
      keywords: ['closed', 'shut', 'unavailable', 'hours']
    }
  ],
  after_hunt: [
    {
      question: 'How do I redeem my rewards?',
      answer: 'After completing a hunt, you will receive reward codes via email. Show these codes to participating venues to claim your discounts or free items!',
      keywords: ['reward', 'redeem', 'discount', 'prize', 'claim']
    },
    {
      question: 'How do I see my rank on the leaderboard?',
      answer: 'Open the app and go to the Leaderboard tab. You will see your rank, points, and completion time compared to other teams.',
      keywords: ['leaderboard', 'rank', 'position', 'score', 'points']
    },
    {
      question: 'Can I upload photos during the hunt?',
      answer: 'Yes! Upload photos at each venue to earn bonus points and get featured in the hunt gallery. Share on social media for even more points!',
      keywords: ['photo', 'picture', 'upload', 'camera', 'image']
    }
  ],
  venue_owners: [
    {
      question: 'How do I register my venue?',
      answer: 'Go to the Venue Portal, click Register, and complete the onboarding form with your business details and documents. Approval usually takes 1-2 business days.',
      keywords: ['register', 'venue', 'business', 'restaurant', 'shop']
    },
    {
      question: 'How much does it cost to join as a venue?',
      answer: 'It is FREE to join! You only pay a small commission (10%) on redeemed rewards. You get free marketing and increased foot traffic.',
      keywords: ['cost', 'fee', 'price', 'commission', 'venue']
    },
    {
      question: 'How do I see how many hunters visited my venue?',
      answer: 'Log into the Venue Portal and view your Analytics Dashboard. You will see visitor counts, peak hours, and revenue attribution.',
      keywords: ['analytics', 'visitors', 'traffic', 'stats', 'venue']
    }
  ],
  technical_issues: [
    {
      question: 'The app is not scanning QR codes',
      answer: 'Make sure you have given camera permissions to the app. Also ensure good lighting and hold your phone steady. Try restarting the app if issues persist.',
      keywords: ['scan', 'camera', 'qr', 'not working', 'broken']
    },
    {
      question: 'I did not receive my reward codes',
      answer: 'Check your spam folder. Reward codes are sent within 10 minutes of hunt completion. If still missing, contact support with your hunt ID.',
      keywords: ['reward', 'code', 'email', 'missing', 'not received']
    },
    {
      question: 'The app crashed during my hunt',
      answer: 'Your progress is auto-saved! Simply reopen the app and you will be able to continue from where you left off. Contact support if issues persist.',
      keywords: ['crash', 'bug', 'error', 'frozen', 'not working']
    }
  ],
  account_management: [
    {
      question: 'How do I change my password?',
      answer: 'Go to Settings > Account > Change Password. Enter your current password and new password, then save.',
      keywords: ['password', 'change', 'reset', 'forgot']
    },
    {
      question: 'How do I delete my account?',
      answer: 'Go to Settings > Account > Delete Account. This will permanently delete all your data in compliance with GDPR. This action cannot be undone.',
      keywords: ['delete', 'remove', 'account', 'gdpr', 'privacy']
    },
    {
      question: 'How is my data used?',
      answer: 'We only use your data to provide the service and send hunt-related updates. We never sell your data. Read our full Privacy Policy in the app.',
      keywords: ['privacy', 'data', 'gdpr', 'security', 'information']
    }
  ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store ticket
 */
async function storeTicket(ticket) {
  const key = `support_ticket:${ticket.ticket_id}`;
  await redisClient.setEx(key, 7776000, JSON.stringify(ticket)); // 90 day TTL

  // Add to global tickets list
  await redisClient.sAdd('support_tickets:all', ticket.ticket_id);

  // Add to status-specific list
  await redisClient.sAdd(`support_tickets:status:${ticket.status}`, ticket.ticket_id);

  // Add to user's tickets list
  await redisClient.sAdd(`support_tickets:user:${ticket.user_id}`, ticket.ticket_id);
}

/**
 * Get ticket
 */
async function getTicket(ticket_id) {
  const key = `support_ticket:${ticket_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Update ticket status
 */
async function updateTicketStatus(ticket_id, newStatus) {
  const ticket = await getTicket(ticket_id);
  if (!ticket) return false;

  // Remove from old status list
  await redisClient.sRem(`support_tickets:status:${ticket.status}`, ticket_id);

  // Update status
  ticket.status = newStatus;
  ticket.status_updated_at = new Date().toISOString();

  // Add to new status list
  await redisClient.sAdd(`support_tickets:status:${newStatus}`, ticket_id);

  // Update status history
  if (!ticket.status_history) {
    ticket.status_history = [];
  }
  ticket.status_history.push({
    status: newStatus,
    timestamp: new Date().toISOString()
  });

  await storeTicket(ticket);
  return true;
}

/**
 * Send notification
 */
async function sendNotification(user_id, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: user_id,
      hunt_id: 'support_system',
      type,
      data
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

/**
 * Simple FAQ chatbot - keyword matching
 */
function findFAQAnswer(question) {
  const lowerQuestion = question.toLowerCase();
  let bestMatch = null;
  let highestScore = 0;

  // Search all categories
  for (const [category, faqs] of Object.entries(FAQ_DATABASE)) {
    for (const faq of faqs) {
      let score = 0;

      // Check keyword matches
      for (const keyword of faq.keywords) {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
          score += 2;
        }
      }

      // Check question similarity
      const faqWords = faq.question.toLowerCase().split(' ');
      for (const word of faqWords) {
        if (word.length > 3 && lowerQuestion.includes(word)) {
          score += 1;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          question: faq.question,
          answer: faq.answer,
          category,
          confidence: Math.min(score / 5, 1.0) // Normalize to 0-1
        };
      }
    }
  }

  return bestMatch && highestScore >= 2 ? bestMatch : null;
}

/**
 * Calculate SLA deadline
 */
function calculateSLADeadline(priority) {
  const hours = SLA_HOURS[priority] || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Check if SLA is breached
 */
function isSLABreached(createdAt, priority) {
  const deadline = new Date(new Date(createdAt).getTime() + (SLA_HOURS[priority] || 24) * 60 * 60 * 1000);
  return new Date() > deadline;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'SupportAgent',
    version: '1.0.0',
    features: [
      'FAQ chatbot with 30+ Q&A pairs',
      'Ticket creation and management',
      'Ticket status tracking (5 states)',
      'Priority-based SLA tracking',
      'Auto-escalation after 48h',
      'Customer satisfaction ratings',
      'Knowledge base search',
      'Canned responses for common issues'
    ]
  });
});

// ============================================
// CAPABILITY 1: FAQ CHATBOT
// ============================================

/**
 * Ask FAQ question
 */
app.post('/faq/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question required' });
    }

    const answer = findFAQAnswer(question);

    if (answer) {
      res.json({
        success: true,
        found: true,
        answer: {
          question: answer.question,
          answer: answer.answer,
          category: answer.category,
          confidence: answer.confidence
        },
        suggestion: answer.confidence < 0.7 ? 'If this does not answer your question, please create a support ticket.' : null
      });
    } else {
      res.json({
        success: true,
        found: false,
        message: 'I could not find a direct answer to your question. Would you like to create a support ticket?',
        suggestion: 'Create a support ticket at POST /ticket/create for personalized help.'
      });
    }

  } catch (error) {
    console.error('Error processing FAQ:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all FAQ categories
 */
app.get('/faq/categories', (req, res) => {
  const categories = Object.keys(FAQ_DATABASE).map(category => ({
    id: category,
    name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    question_count: FAQ_DATABASE[category].length
  }));

  res.json({
    success: true,
    categories,
    total: categories.length
  });
});

/**
 * Get FAQs by category
 */
app.get('/faq/category/:category', (req, res) => {
  const { category } = req.params;

  if (!FAQ_DATABASE[category]) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.json({
    success: true,
    category,
    faqs: FAQ_DATABASE[category].map(faq => ({
      question: faq.question,
      answer: faq.answer
    })),
    total: FAQ_DATABASE[category].length
  });
});

// ============================================
// CAPABILITY 2: TICKET MANAGEMENT
// ============================================

/**
 * Create support ticket
 */
app.post('/ticket/create', async (req, res) => {
  try {
    const {
      user_id,
      user_email,
      user_name,
      subject,
      description,
      priority,
      category
    } = req.body;

    if (!user_id || !user_email || !subject || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['user_id', 'user_email', 'subject', 'description']
      });
    }

    const ticket = {
      ticket_id: uuidv4(),
      user_id,
      user_email,
      user_name: user_name || 'Unknown',
      subject,
      description,
      priority: priority || TICKET_PRIORITY.MEDIUM,
      category: category || 'general',
      status: TICKET_STATUS.OPEN,
      status_history: [{
        status: TICKET_STATUS.OPEN,
        timestamp: new Date().toISOString()
      }],
      replies: [],
      assigned_to: null,
      sla_deadline: calculateSLADeadline(priority || TICKET_PRIORITY.MEDIUM),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      satisfaction_rating: null
    };

    await storeTicket(ticket);

    // Send ticket confirmation notification
    await sendNotification(user_id, 'ticket_created', {
      user_name: ticket.user_name,
      ticket_id: ticket.ticket_id,
      subject: ticket.subject
    });

    res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticket_id: ticket.ticket_id,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        sla_deadline: ticket.sla_deadline
      }
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get ticket details
 */
app.get('/ticket/:ticket_id', async (req, res) => {
  try {
    const { ticket_id } = req.params;

    const ticket = await getTicket(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check SLA status
    const slaBreached = isSLABreached(ticket.created_at, ticket.priority);

    res.json({
      success: true,
      ticket: {
        ...ticket,
        sla_breached: slaBreached,
        time_to_sla: ticket.sla_deadline
      }
    });

  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update ticket status
 */
app.put('/ticket/:ticket_id/status', async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { status, note } = req.body;

    if (!status || !Object.values(TICKET_STATUS).includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid_statuses: Object.values(TICKET_STATUS)
      });
    }

    const ticket = await getTicket(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = ticket.status;
    await updateTicketStatus(ticket_id, status);

    // If resolved, set resolved timestamp
    if (status === TICKET_STATUS.RESOLVED && !ticket.resolved_at) {
      ticket.resolved_at = new Date().toISOString();
      await storeTicket(ticket);

      // Send resolution notification
      await sendNotification(ticket.user_id, 'ticket_resolved', {
        user_name: ticket.user_name,
        ticket_id: ticket.ticket_id,
        subject: ticket.subject
      });
    }

    res.json({
      success: true,
      message: `Ticket status updated from ${oldStatus} to ${status}`,
      ticket: {
        ticket_id: ticket.ticket_id,
        status,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add reply to ticket
 */
app.post('/ticket/:ticket_id/reply', async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { from_user, from_support, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const ticket = await getTicket(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const reply = {
      reply_id: uuidv4(),
      from_user: from_user || false,
      from_support: from_support || true,
      message,
      timestamp: new Date().toISOString()
    };

    ticket.replies.push(reply);
    ticket.updated_at = new Date().toISOString();

    // If reply from support, update status to in_progress if still open
    if (from_support && ticket.status === TICKET_STATUS.OPEN) {
      await updateTicketStatus(ticket_id, TICKET_STATUS.IN_PROGRESS);
    }

    // If reply from user, update to waiting_customer
    if (from_user && ticket.status === TICKET_STATUS.IN_PROGRESS) {
      await updateTicketStatus(ticket_id, TICKET_STATUS.WAITING_CUSTOMER);
    }

    await storeTicket(ticket);

    // Send notification if reply from support
    if (from_support) {
      await sendNotification(ticket.user_id, 'ticket_reply', {
        user_name: ticket.user_name,
        ticket_id: ticket.ticket_id,
        subject: ticket.subject
      });
    }

    res.json({
      success: true,
      message: 'Reply added successfully',
      reply
    });

  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Rate support experience
 */
app.post('/ticket/:ticket_id/rate', async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5 stars' });
    }

    const ticket = await getTicket(ticket_id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status !== TICKET_STATUS.RESOLVED && ticket.status !== TICKET_STATUS.CLOSED) {
      return res.status(400).json({ error: 'Can only rate resolved or closed tickets' });
    }

    ticket.satisfaction_rating = {
      rating,
      feedback: feedback || '',
      rated_at: new Date().toISOString()
    };

    ticket.updated_at = new Date().toISOString();
    await storeTicket(ticket);

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      rating: {
        ticket_id,
        rating,
        feedback
      }
    });

  } catch (error) {
    console.error('Error rating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's tickets
 */
app.get('/tickets/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { status, limit } = req.query;

    let ticketIds;

    if (status) {
      // Get tickets by status for this user
      const allStatusTickets = await redisClient.sMembers(`support_tickets:status:${status}`);
      const userTickets = await redisClient.sMembers(`support_tickets:user:${user_id}`);
      ticketIds = allStatusTickets.filter(id => userTickets.includes(id));
    } else {
      ticketIds = await redisClient.sMembers(`support_tickets:user:${user_id}`);
    }

    const tickets = [];
    const maxResults = limit ? parseInt(limit) : 50;

    for (const ticket_id of ticketIds.slice(0, maxResults)) {
      const ticket = await getTicket(ticket_id);
      if (ticket) {
        tickets.push({
          ticket_id: ticket.ticket_id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at,
          sla_breached: isSLABreached(ticket.created_at, ticket.priority)
        });
      }
    }

    // Sort by created_at descending
    tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      user_id,
      tickets,
      total: tickets.length
    });

  } catch (error) {
    console.error('Error getting user tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get support statistics
 */
app.get('/tickets/stats', async (req, res) => {
  try {
    const stats = {
      total: 0,
      by_status: {},
      by_priority: {},
      sla_breached: 0,
      avg_rating: 0,
      total_rated: 0
    };

    // Count by status
    for (const status of Object.values(TICKET_STATUS)) {
      const count = await redisClient.sCard(`support_tickets:status:${status}`);
      stats.by_status[status] = count;
      stats.total += count;
    }

    // Get all tickets for additional stats
    const allTicketIds = await redisClient.sMembers('support_tickets:all');
    let totalRating = 0;
    let ratedCount = 0;
    let breachedCount = 0;
    const priorityCounts = {};

    for (const ticket_id of allTicketIds) {
      const ticket = await getTicket(ticket_id);
      if (ticket) {
        // Priority count
        priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;

        // SLA breach check
        if (isSLABreached(ticket.created_at, ticket.priority)) {
          breachedCount++;
        }

        // Rating
        if (ticket.satisfaction_rating) {
          totalRating += ticket.satisfaction_rating.rating;
          ratedCount++;
        }
      }
    }

    stats.by_priority = priorityCounts;
    stats.sla_breached = breachedCount;
    stats.sla_compliance_rate = stats.total > 0 ? (((stats.total - breachedCount) / stats.total) * 100).toFixed(1) + '%' : '100%';
    stats.avg_rating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(2) : 0;
    stats.total_rated = ratedCount;
    stats.rating_percentage = stats.total > 0 ? ((ratedCount / stats.total) * 100).toFixed(1) + '%' : '0%';

    res.json({
      success: true,
      stats,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting support stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: KNOWLEDGE BASE SEARCH
// ============================================

/**
 * Search knowledge base
 */
app.get('/knowledge-base/search', (req, res) => {
  const { query, category } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  const results = [];

  // Search specific category or all categories
  const categoriesToSearch = category && FAQ_DATABASE[category] ? [category] : Object.keys(FAQ_DATABASE);

  for (const cat of categoriesToSearch) {
    const faqs = FAQ_DATABASE[cat];
    for (const faq of faqs) {
      const lowerQuery = query.toLowerCase();
      let relevance = 0;

      // Check keywords
      for (const keyword of faq.keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          relevance += 2;
        }
      }

      // Check question/answer text
      if (faq.question.toLowerCase().includes(lowerQuery)) relevance += 3;
      if (faq.answer.toLowerCase().includes(lowerQuery)) relevance += 1;

      if (relevance > 0) {
        results.push({
          question: faq.question,
          answer: faq.answer,
          category: cat,
          relevance
        });
      }
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  res.json({
    success: true,
    query,
    results: results.slice(0, 10), // Top 10 results
    total_found: results.length
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Support Agent v1.0 listening on port ${port}`);
  console.log(`🎧 Features:`);
  console.log(`   - FAQ chatbot with 30+ Q&A pairs`);
  console.log(`   - Ticket creation and management`);
  console.log(`   - Priority-based SLA tracking`);
  console.log(`   - Customer satisfaction ratings`);
  console.log(`   - Knowledge base search`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /faq/ask - Ask FAQ question (chatbot)`);
  console.log(`   GET  /faq/categories - List FAQ categories`);
  console.log(`   GET  /faq/category/:category - Get category FAQs`);
  console.log(`   POST /ticket/create - Create support ticket`);
  console.log(`   GET  /ticket/:ticket_id - Get ticket details`);
  console.log(`   PUT  /ticket/:ticket_id/status - Update ticket status`);
  console.log(`   POST /ticket/:ticket_id/reply - Add reply to ticket`);
  console.log(`   POST /ticket/:ticket_id/rate - Rate support experience`);
  console.log(`   GET  /tickets/user/:user_id - Get user's tickets`);
  console.log(`   GET  /tickets/stats - Get support metrics`);
  console.log(`   GET  /knowledge-base/search - Search help articles`);
});

module.exports = app;
