const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9004;

app.use(cors());
app.use(express.json());

// Notification storage
const notifications = new Map();
const deliveryLogs = new Map();

// Email configuration
const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
let emailTransporter = null;

if (SMTP_CONFIGURED) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    providers: {
      email: SMTP_CONFIGURED ? 'configured' : 'not configured (using mock)',
      sms: 'mock',
      push: 'mock'
    }
  });
});

// Send email notification
app.post('/send-email', async (req, res) => {
  try {
    const {
      to,
      subject,
      body,
      html,
      from = process.env.SMTP_FROM || 'noreply@koopjesjacht.nl',
      cc,
      bcc,
      attachments = [],
      template,
      template_data = {},
      priority = 'normal'
    } = req.body;

    if (!to || !subject || (!body && !html && !template)) {
      return res.status(400).json({
        error: 'Required fields: to, subject, and (body or html or template)'
      });
    }

    const notification_id = uuidv4();

    let emailContent = {
      text: body,
      html: html
    };

    // Apply template if specified
    if (template) {
      emailContent = applyEmailTemplate(template, template_data);
    }

    const emailOptions = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: emailContent.text,
      html: emailContent.html,
      cc,
      bcc,
      attachments
    };

    let deliveryStatus;
    if (SMTP_CONFIGURED) {
      try {
        const info = await emailTransporter.sendMail(emailOptions);
        deliveryStatus = {
          status: 'sent',
          provider_response: info,
          sent_at: new Date().toISOString()
        };
      } catch (error) {
        deliveryStatus = {
          status: 'failed',
          error: error.message,
          failed_at: new Date().toISOString()
        };
      }
    } else {
      // Mock delivery
      deliveryStatus = {
        status: 'sent',
        provider_response: {
          mock: true,
          messageId: `<${uuidv4()}@koopjesjacht.nl>`
        },
        sent_at: new Date().toISOString()
      };
    }

    const notificationData = {
      notification_id,
      type: 'email',
      to,
      subject,
      from,
      priority,
      template,
      created_at: new Date().toISOString(),
      ...deliveryStatus
    };

    notifications.set(notification_id, notificationData);
    logDelivery(notification_id, 'email', deliveryStatus);

    console.log(`[Notification Service] Email ${notification_id} - ${deliveryStatus.status} to ${to}`);

    res.json({
      success: deliveryStatus.status === 'sent',
      data: notificationData
    });
  } catch (error) {
    console.error('[Notification Service] Email error:', error);
    res.status(500).json({ error: 'Email sending failed' });
  }
});

// Apply email template
function applyEmailTemplate(templateName, data) {
  const templates = {
    'welcome': {
      subject: `Welcome to Koopjesjacht, ${data.name || 'there'}!`,
      text: `Hi ${data.name || 'there'},\n\nWelcome to Koopjesjacht! We're excited to have you on board.\n\nBest regards,\nThe Koopjesjacht Team`,
      html: `<h2>Welcome to Koopjesjacht!</h2><p>Hi ${data.name || 'there'},</p><p>We're excited to have you on board.</p><p>Best regards,<br>The Koopjesjacht Team</p>`
    },
    'hunt_invitation': {
      subject: `You're invited to join: ${data.hunt_name || 'Scavenger Hunt'}`,
      text: `You've been invited to join "${data.hunt_name}"!\n\nHunt Details:\n- Start: ${data.start_date}\n- Duration: ${data.duration}\n- Locations: ${data.location_count}\n\nJoin now: ${data.join_url}`,
      html: `<h2>You're Invited!</h2><p>Join "${data.hunt_name}"</p><ul><li>Start: ${data.start_date}</li><li>Duration: ${data.duration}</li><li>Locations: ${data.location_count}</li></ul><a href="${data.join_url}">Join Now</a>`
    },
    'payment_confirmation': {
      subject: `Payment Confirmed - €${data.amount}`,
      text: `Your payment of €${data.amount} has been confirmed.\n\nTransaction ID: ${data.transaction_id}\nDate: ${data.date}\n\nThank you!`,
      html: `<h2>Payment Confirmed</h2><p>Amount: €${data.amount}</p><p>Transaction ID: ${data.transaction_id}</p><p>Date: ${data.date}</p><p>Thank you!</p>`
    },
    'hunt_reminder': {
      subject: `Reminder: ${data.hunt_name} starts ${data.time_until}`,
      text: `Don't forget! "${data.hunt_name}" starts ${data.time_until}.\n\nMeet at: ${data.meeting_point}\nTime: ${data.start_time}`,
      html: `<h2>Hunt Reminder</h2><p>"${data.hunt_name}" starts ${data.time_until}</p><p><strong>Meet at:</strong> ${data.meeting_point}</p><p><strong>Time:</strong> ${data.start_time}</p>`
    },
    'team_achievement': {
      subject: `Congratulations! Achievement Unlocked: ${data.achievement}`,
      text: `Your team "${data.team_name}" has unlocked: ${data.achievement}!\n\nPoints earned: ${data.points}\nTotal points: ${data.total_points}`,
      html: `<h2>🎉 Achievement Unlocked!</h2><p>Team "${data.team_name}" earned: <strong>${data.achievement}</strong></p><p>Points: +${data.points}</p><p>Total: ${data.total_points}</p>`
    }
  };

  return templates[templateName] || {
    text: 'Notification',
    html: '<p>Notification</p>'
  };
}

// Send SMS notification
app.post('/send-sms', async (req, res) => {
  try {
    const {
      to,
      message,
      from = 'Koopjesjacht'
    } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Required fields: to, message' });
    }

    const notification_id = uuidv4();

    // Mock SMS delivery (integrate with Twilio/etc in production)
    const deliveryStatus = {
      status: 'sent',
      provider_response: {
        mock: true,
        sid: `SM${uuidv4().substring(0, 32)}`
      },
      sent_at: new Date().toISOString()
    };

    const notificationData = {
      notification_id,
      type: 'sms',
      to,
      from,
      message,
      created_at: new Date().toISOString(),
      ...deliveryStatus
    };

    notifications.set(notification_id, notificationData);
    logDelivery(notification_id, 'sms', deliveryStatus);

    console.log(`[Notification Service] SMS ${notification_id} - sent to ${to}`);

    res.json({
      success: true,
      data: notificationData
    });
  } catch (error) {
    console.error('[Notification Service] SMS error:', error);
    res.status(500).json({ error: 'SMS sending failed' });
  }
});

// Send push notification
app.post('/send-push', async (req, res) => {
  try {
    const {
      user_id,
      device_token,
      title,
      body,
      data = {},
      badge,
      sound = 'default',
      priority = 'high'
    } = req.body;

    if (!user_id || !title || !body) {
      return res.status(400).json({ error: 'Required fields: user_id, title, body' });
    }

    const notification_id = uuidv4();

    // Mock push notification (integrate with FCM/APNS in production)
    const deliveryStatus = {
      status: 'sent',
      provider_response: {
        mock: true,
        message_id: uuidv4()
      },
      sent_at: new Date().toISOString()
    };

    const notificationData = {
      notification_id,
      type: 'push',
      user_id,
      device_token,
      title,
      body,
      data,
      badge,
      sound,
      priority,
      created_at: new Date().toISOString(),
      ...deliveryStatus
    };

    notifications.set(notification_id, notificationData);
    logDelivery(notification_id, 'push', deliveryStatus);

    console.log(`[Notification Service] Push ${notification_id} - sent to user ${user_id}`);

    res.json({
      success: true,
      data: notificationData
    });
  } catch (error) {
    console.error('[Notification Service] Push error:', error);
    res.status(500).json({ error: 'Push notification failed' });
  }
});

// Send bulk notifications
app.post('/send-bulk', async (req, res) => {
  try {
    const {
      type,
      recipients,
      template,
      template_data = {}
    } = req.body;

    if (!type || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'Required fields: type, recipients (array)' });
    }

    const bulk_id = uuidv4();
    const results = [];

    for (const recipient of recipients) {
      let notification;

      if (type === 'email') {
        const emailData = applyEmailTemplate(template, { ...template_data, ...recipient.data });
        notification = await sendEmailInternal(recipient.email, emailData.subject, emailData.text, emailData.html);
      } else if (type === 'sms') {
        notification = await sendSMSInternal(recipient.phone, template_data.message);
      } else if (type === 'push') {
        notification = await sendPushInternal(recipient.user_id, template_data.title, template_data.body);
      }

      results.push({
        recipient,
        notification_id: notification.notification_id,
        status: notification.status
      });
    }

    const successCount = results.filter(r => r.status === 'sent').length;

    console.log(`[Notification Service] Bulk ${bulk_id} - ${successCount}/${recipients.length} sent`);

    res.json({
      success: true,
      bulk_id,
      total: recipients.length,
      successful: successCount,
      failed: recipients.length - successCount,
      results
    });
  } catch (error) {
    console.error('[Notification Service] Bulk error:', error);
    res.status(500).json({ error: 'Bulk sending failed' });
  }
});

// Internal send functions
async function sendEmailInternal(to, subject, text, html) {
  const notification_id = uuidv4();
  const notificationData = {
    notification_id,
    type: 'email',
    to,
    subject,
    status: 'sent',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  notifications.set(notification_id, notificationData);
  return notificationData;
}

async function sendSMSInternal(to, message) {
  const notification_id = uuidv4();
  const notificationData = {
    notification_id,
    type: 'sms',
    to,
    message,
    status: 'sent',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  notifications.set(notification_id, notificationData);
  return notificationData;
}

async function sendPushInternal(user_id, title, body) {
  const notification_id = uuidv4();
  const notificationData = {
    notification_id,
    type: 'push',
    user_id,
    title,
    body,
    status: 'sent',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  notifications.set(notification_id, notificationData);
  return notificationData;
}

// Get notification details
app.get('/notification/:notification_id', (req, res) => {
  const { notification_id } = req.params;
  const notification = notifications.get(notification_id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ data: notification });
});

// Get delivery status
app.get('/notification/:notification_id/status', (req, res) => {
  const { notification_id } = req.params;
  const notification = notifications.get(notification_id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({
    notification_id,
    type: notification.type,
    status: notification.status,
    sent_at: notification.sent_at,
    failed_at: notification.failed_at
  });
});

// Get all notifications
app.get('/notifications', (req, res) => {
  const { type, status, user_id, limit = 50 } = req.query;

  let notificationList = Array.from(notifications.values());

  if (type) {
    notificationList = notificationList.filter(n => n.type === type);
  }
  if (status) {
    notificationList = notificationList.filter(n => n.status === status);
  }
  if (user_id) {
    notificationList = notificationList.filter(n =>
      n.user_id === user_id || n.to === user_id
    );
  }

  notificationList = notificationList
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, parseInt(limit));

  res.json({
    count: notificationList.length,
    data: notificationList
  });
});

// Get delivery statistics
app.get('/stats', (req, res) => {
  const allNotifications = Array.from(notifications.values());

  const stats = {
    total_notifications: allNotifications.length,
    by_type: {
      email: allNotifications.filter(n => n.type === 'email').length,
      sms: allNotifications.filter(n => n.type === 'sms').length,
      push: allNotifications.filter(n => n.type === 'push').length
    },
    by_status: {
      sent: allNotifications.filter(n => n.status === 'sent').length,
      failed: allNotifications.filter(n => n.status === 'failed').length,
      pending: allNotifications.filter(n => n.status === 'pending').length
    },
    delivery_rate: allNotifications.length > 0
      ? ((allNotifications.filter(n => n.status === 'sent').length / allNotifications.length) * 100).toFixed(2) + '%'
      : '0%',
    recent_activity: Array.from(deliveryLogs.values()).slice(-10)
  };

  res.json({ data: stats });
});

// Log delivery
function logDelivery(notification_id, type, deliveryStatus) {
  const log_id = uuidv4();
  deliveryLogs.set(log_id, {
    log_id,
    notification_id,
    type,
    status: deliveryStatus.status,
    timestamp: new Date().toISOString()
  });
}

// Get available templates
app.get('/templates', (req, res) => {
  const templates = [
    { name: 'welcome', description: 'Welcome new users' },
    { name: 'hunt_invitation', description: 'Invite users to hunt' },
    { name: 'payment_confirmation', description: 'Confirm payment received' },
    { name: 'hunt_reminder', description: 'Remind about upcoming hunt' },
    { name: 'team_achievement', description: 'Celebrate team achievements' }
  ];

  res.json({ data: templates });
});

app.listen(PORT, () => {
  console.log(`✅ Notification Service Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Email: ${SMTP_CONFIGURED ? 'Enabled' : 'Mock mode'}`);
  console.log(`   SMS: Mock mode`);
  console.log(`   Push: Mock mode`);
});
