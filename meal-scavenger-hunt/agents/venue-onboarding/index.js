const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.AGENT_PORT || 9008;

app.use(express.json());

// Agent URLs
const VENUE_MANAGEMENT_URL = process.env.VENUE_MANAGEMENT_URL || 'http://venue-agent:9006';
const QR_MANAGER_URL = process.env.QR_MANAGER_URL || 'http://qr-agent:9002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads/documents';

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
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF allowed.'));
    }
  }
});

// ============================================
// ONBOARDING WORKFLOW STAGES
// ============================================
const ONBOARDING_STAGES = {
  INITIAL_SIGNUP: 'initial_signup',
  BUSINESS_INFO: 'business_info_submitted',
  DOCUMENTS_UPLOADED: 'documents_uploaded',
  VERIFICATION_PENDING: 'verification_pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ONBOARDING_COMPLETE: 'onboarding_complete'
};

const VERIFICATION_METHODS = {
  KVK_LOOKUP: 'kvk_lookup',        // Netherlands Chamber of Commerce
  MANUAL_REVIEW: 'manual_review',
  PHONE_VERIFICATION: 'phone_verification',
  EMAIL_VERIFICATION: 'email_verification'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Store onboarding application
 */
async function storeApplication(application) {
  const key = `onboarding:${application.application_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(application)); // 30 day TTL

  // Add to global applications list
  await redisClient.sAdd('onboarding:all', application.application_id);

  // Add to stage-specific list
  await redisClient.sAdd(`onboarding:stage:${application.stage}`, application.application_id);

  // Add to owner's applications list
  await redisClient.sAdd(`owner:${application.owner_email}:applications`, application.application_id);
}

/**
 * Get onboarding application
 */
async function getApplication(application_id) {
  const key = `onboarding:${application_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Update application stage
 */
async function updateApplicationStage(application_id, newStage) {
  const application = await getApplication(application_id);
  if (!application) return false;

  // Remove from old stage list
  await redisClient.sRem(`onboarding:stage:${application.stage}`, application_id);

  // Update stage
  application.stage = newStage;
  application.stage_updated_at = new Date().toISOString();

  // Add to new stage list
  await redisClient.sAdd(`onboarding:stage:${newStage}`, application_id);

  // Update stage history
  if (!application.stage_history) {
    application.stage_history = [];
  }
  application.stage_history.push({
    stage: newStage,
    timestamp: new Date().toISOString()
  });

  await storeApplication(application);
  return true;
}

/**
 * Send notification via Notification Service
 */
async function sendNotification(email, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id: email, // Using email as identifier for venue owners
      hunt_id: 'venue_onboarding',
      type,
      data
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

/**
 * Mock KVK (Netherlands Chamber of Commerce) lookup
 * In production, integrate with actual KVK API
 */
async function verifyBusinessKVK(kvk_number, business_name) {
  // Mock implementation
  // Real implementation would call: https://api.kvk.nl/api/v1/zoeken

  if (!kvk_number || kvk_number.length !== 8) {
    return {
      verified: false,
      error: 'Invalid KVK number format (must be 8 digits)'
    };
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock success for demo
  return {
    verified: true,
    business_name: business_name,
    registration_date: '2020-01-15',
    legal_form: 'BV',
    address: {
      street: 'Kalverstraat',
      number: '92',
      city: 'Amsterdam',
      postal_code: '1012 PH'
    }
  };
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'VenueOnboardingAgent',
    version: '1.0.0',
    features: [
      'Self-service venue registration',
      'Multi-step onboarding workflow',
      'Document upload (permits, photos, menus)',
      'Business verification (KVK lookup)',
      'Approval/rejection workflow',
      'QR code generation',
      'Welcome email automation',
      'Onboarding progress tracking'
    ]
  });
});

// ============================================
// CAPABILITY 1: INITIAL SIGNUP
// ============================================

/**
 * Start venue onboarding (Step 1: Initial Signup)
 */
app.post('/onboarding/start', async (req, res) => {
  try {
    const {
      owner_name,
      owner_email,
      owner_phone,
      venue_name,
      business_type,
      cuisine_type,
      city,
      heard_about_us
    } = req.body;

    if (!owner_name || !owner_email || !venue_name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['owner_name', 'owner_email', 'venue_name']
      });
    }

    // Check if email already has pending application
    const existingApps = await redisClient.sMembers(`owner:${owner_email}:applications`);
    for (const app_id of existingApps) {
      const app = await getApplication(app_id);
      if (app && app.stage !== ONBOARDING_STAGES.REJECTED && app.stage !== ONBOARDING_STAGES.ONBOARDING_COMPLETE) {
        return res.status(409).json({
          error: 'Application already exists',
          application_id: app.application_id,
          stage: app.stage
        });
      }
    }

    const application = {
      application_id: uuidv4(),
      owner_name,
      owner_email,
      owner_phone: owner_phone || null,
      venue_name,
      business_type: business_type || 'restaurant',
      cuisine_type: cuisine_type || 'general',
      city: city || null,
      heard_about_us: heard_about_us || 'other',
      stage: ONBOARDING_STAGES.INITIAL_SIGNUP,
      stage_history: [{
        stage: ONBOARDING_STAGES.INITIAL_SIGNUP,
        timestamp: new Date().toISOString()
      }],
      documents: [],
      verification_checks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await storeApplication(application);

    // Send welcome email
    await sendNotification(owner_email, 'venue_signup_started', {
      owner_name,
      venue_name,
      application_id: application.application_id
    });

    res.json({
      success: true,
      message: 'Venue onboarding started successfully',
      application: {
        application_id: application.application_id,
        stage: application.stage,
        next_steps: [
          'Complete business information',
          'Upload required documents',
          'Await verification'
        ]
      }
    });

  } catch (error) {
    console.error('Error starting onboarding:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: BUSINESS INFORMATION
// ============================================

/**
 * Submit business information (Step 2)
 */
app.post('/onboarding/:application_id/business-info', async (req, res) => {
  try {
    const { application_id } = req.params;
    const {
      kvk_number,
      tax_number,
      address,
      business_hours,
      website,
      social_media,
      description,
      established_year
    } = req.body;

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application with business info
    application.business_info = {
      kvk_number: kvk_number || null,
      tax_number: tax_number || null,
      address: address || {},
      business_hours: business_hours || {},
      website: website || null,
      social_media: social_media || {},
      description: description || '',
      established_year: established_year || null,
      submitted_at: new Date().toISOString()
    };

    application.updated_at = new Date().toISOString();
    await updateApplicationStage(application_id, ONBOARDING_STAGES.BUSINESS_INFO);

    res.json({
      success: true,
      message: 'Business information submitted successfully',
      application: {
        application_id: application.application_id,
        stage: application.stage,
        next_steps: [
          'Upload business permit',
          'Upload venue photos',
          'Upload menu (optional)'
        ]
      }
    });

  } catch (error) {
    console.error('Error submitting business info:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 3: DOCUMENT UPLOAD
// ============================================

/**
 * Upload documents (Step 3)
 */
app.post('/onboarding/:application_id/documents', upload.array('documents', 10), async (req, res) => {
  try {
    const { application_id } = req.params;
    const { document_types } = req.body; // JSON string array matching file order

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const types = document_types ? JSON.parse(document_types) : [];
    const uploadedDocs = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const docType = types[i] || 'other';

      const document = {
        document_id: uuidv4(),
        type: docType,
        filename: file.filename,
        original_name: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploaded_at: new Date().toISOString()
      };

      uploadedDocs.push(document);

      // Initialize documents array if needed
      if (!application.documents) {
        application.documents = [];
      }
      application.documents.push(document);
    }

    application.updated_at = new Date().toISOString();
    await updateApplicationStage(application_id, ONBOARDING_STAGES.DOCUMENTS_UPLOADED);

    res.json({
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully`,
      documents: uploadedDocs.map(d => ({
        document_id: d.document_id,
        type: d.type,
        filename: d.original_name
      })),
      application: {
        application_id: application.application_id,
        stage: application.stage,
        next_steps: ['Await verification review']
      }
    });

  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get uploaded documents for application
 */
app.get('/onboarding/:application_id/documents', async (req, res) => {
  try {
    const { application_id } = req.params;

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      success: true,
      application_id,
      documents: application.documents || [],
      total: (application.documents || []).length
    });

  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: VERIFICATION
// ============================================

/**
 * Request verification (Step 4 - Auto-triggered or manual)
 */
app.post('/onboarding/:application_id/verify', async (req, res) => {
  try {
    const { application_id } = req.params;
    const { verification_method } = req.body;

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const method = verification_method || VERIFICATION_METHODS.MANUAL_REVIEW;
    let verificationResult = {
      method,
      verified: false,
      details: null,
      timestamp: new Date().toISOString()
    };

    // KVK Verification (Netherlands)
    if (method === VERIFICATION_METHODS.KVK_LOOKUP && application.business_info?.kvk_number) {
      const kvkResult = await verifyBusinessKVK(
        application.business_info.kvk_number,
        application.venue_name
      );

      verificationResult.verified = kvkResult.verified;
      verificationResult.details = kvkResult;
    }

    // Email verification (send verification link)
    if (method === VERIFICATION_METHODS.EMAIL_VERIFICATION) {
      // Generate verification token
      const verificationToken = uuidv4();
      await redisClient.setEx(`email_verify:${verificationToken}`, 86400, application_id);

      verificationResult.verified = false; // Pending user action
      verificationResult.details = {
        verification_link: `https://scavengerhunt.com/verify-email?token=${verificationToken}`,
        sent_to: application.owner_email
      };

      // Send verification email
      await sendNotification(application.owner_email, 'venue_email_verification', {
        owner_name: application.owner_name,
        verification_link: verificationResult.details.verification_link
      });
    }

    // Store verification check
    if (!application.verification_checks) {
      application.verification_checks = [];
    }
    application.verification_checks.push(verificationResult);

    application.updated_at = new Date().toISOString();
    await updateApplicationStage(application_id, ONBOARDING_STAGES.VERIFICATION_PENDING);

    res.json({
      success: true,
      message: 'Verification initiated',
      verification: verificationResult,
      application: {
        application_id: application.application_id,
        stage: application.stage
      }
    });

  } catch (error) {
    console.error('Error initiating verification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: APPROVAL/REJECTION WORKFLOW
// ============================================

/**
 * Approve application (Admin endpoint)
 */
app.post('/onboarding/:application_id/approve', async (req, res) => {
  try {
    const { application_id } = req.params;
    const { approved_by, notes, hunt_id } = req.body;

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application
    application.approval = {
      approved: true,
      approved_by: approved_by || 'system',
      notes: notes || '',
      approved_at: new Date().toISOString()
    };

    await updateApplicationStage(application_id, ONBOARDING_STAGES.APPROVED);

    // Register venue in Venue Management Agent
    try {
      const venueResponse = await axios.post(`${VENUE_MANAGEMENT_URL}/venue/register`, {
        owner_id: application.owner_email,
        venue_name: application.venue_name,
        business_type: application.business_type,
        cuisine_type: application.cuisine_type,
        address: application.business_info?.address || {},
        contact: {
          email: application.owner_email,
          phone: application.owner_phone,
          name: application.owner_name
        },
        business_hours: application.business_info?.business_hours || {}
      });

      if (venueResponse.data.success) {
        application.venue_id = venueResponse.data.venue.venue_id;

        // Generate QR code for venue
        try {
          const qrResponse = await axios.post(`${QR_MANAGER_URL}/generate`, {
            hunt_id: hunt_id || 'default_hunt',
            shop_info: {
              name: application.venue_name,
              venue_id: application.venue_id
            },
            difficulty_level: 3
          });

          if (qrResponse.data.success) {
            application.qr_code = qrResponse.data.qr_code;
          }
        } catch (qrError) {
          console.error('Error generating QR code:', qrError.message);
        }
      }

    } catch (venueError) {
      console.error('Error registering venue:', venueError.message);
      return res.status(500).json({
        error: 'Application approved but venue registration failed',
        details: venueError.message
      });
    }

    // Complete onboarding
    await updateApplicationStage(application_id, ONBOARDING_STAGES.ONBOARDING_COMPLETE);

    // Send approval notification
    await sendNotification(application.owner_email, 'venue_approved', {
      owner_name: application.owner_name,
      venue_name: application.venue_name,
      venue_id: application.venue_id,
      qr_code: application.qr_code
    });

    res.json({
      success: true,
      message: 'Application approved and venue onboarded successfully',
      application: {
        application_id: application.application_id,
        venue_id: application.venue_id,
        qr_code: application.qr_code,
        stage: application.stage
      }
    });

  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reject application (Admin endpoint)
 */
app.post('/onboarding/:application_id/reject', async (req, res) => {
  try {
    const { application_id } = req.params;
    const { rejected_by, reason } = req.body;

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    // Update application
    application.approval = {
      approved: false,
      rejected_by: rejected_by || 'system',
      reason,
      rejected_at: new Date().toISOString()
    };

    await updateApplicationStage(application_id, ONBOARDING_STAGES.REJECTED);

    // Send rejection notification
    await sendNotification(application.owner_email, 'venue_rejected', {
      owner_name: application.owner_name,
      venue_name: application.venue_name,
      reason
    });

    res.json({
      success: true,
      message: 'Application rejected',
      application: {
        application_id: application.application_id,
        stage: application.stage,
        rejection_reason: reason
      }
    });

  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: APPLICATION MANAGEMENT
// ============================================

/**
 * Get application details
 */
app.get('/onboarding/:application_id', async (req, res) => {
  try {
    const { application_id } = req.params;

    const application = await getApplication(application_id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all applications (with filtering)
 */
app.get('/onboarding/applications/list', async (req, res) => {
  try {
    const { stage, owner_email, limit } = req.query;

    let applicationIds;

    if (stage) {
      applicationIds = await redisClient.sMembers(`onboarding:stage:${stage}`);
    } else if (owner_email) {
      applicationIds = await redisClient.sMembers(`owner:${owner_email}:applications`);
    } else {
      applicationIds = await redisClient.sMembers('onboarding:all');
    }

    const applications = [];
    const maxResults = limit ? parseInt(limit) : 100;

    for (const app_id of applicationIds.slice(0, maxResults)) {
      const app = await getApplication(app_id);
      if (app) {
        // Return summary only
        applications.push({
          application_id: app.application_id,
          venue_name: app.venue_name,
          owner_email: app.owner_email,
          stage: app.stage,
          created_at: app.created_at,
          updated_at: app.updated_at
        });
      }
    }

    res.json({
      success: true,
      applications,
      total: applications.length,
      filters: { stage, owner_email }
    });

  } catch (error) {
    console.error('Error listing applications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get onboarding statistics
 */
app.get('/onboarding/stats', async (req, res) => {
  try {
    const stats = {
      total: 0,
      by_stage: {}
    };

    // Count by stage
    for (const stage of Object.values(ONBOARDING_STAGES)) {
      const count = await redisClient.sCard(`onboarding:stage:${stage}`);
      stats.by_stage[stage] = count;
      stats.total += count;
    }

    // Calculate conversion rates
    stats.conversion = {
      signup_to_submission: stats.by_stage[ONBOARDING_STAGES.BUSINESS_INFO] + stats.by_stage[ONBOARDING_STAGES.DOCUMENTS_UPLOADED],
      approval_rate: stats.total > 0
        ? ((stats.by_stage[ONBOARDING_STAGES.APPROVED] + stats.by_stage[ONBOARDING_STAGES.ONBOARDING_COMPLETE]) / stats.total * 100).toFixed(1) + '%'
        : '0%',
      rejection_rate: stats.total > 0
        ? (stats.by_stage[ONBOARDING_STAGES.REJECTED] / stats.total * 100).toFixed(1) + '%'
        : '0%'
    };

    res.json({
      success: true,
      stats,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Venue Onboarding Agent v1.0 listening on port ${port}`);
  console.log(`🏪 Features:`);
  console.log(`   - Self-service venue registration`);
  console.log(`   - Multi-step onboarding workflow`);
  console.log(`   - Document upload & management`);
  console.log(`   - Business verification (KVK lookup)`);
  console.log(`   - Approval/rejection workflow`);
  console.log(`   - QR code generation on approval`);
  console.log(`   - Automated notifications`);
  console.log(`   - Onboarding analytics`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /onboarding/start - Start venue onboarding`);
  console.log(`   POST /onboarding/:id/business-info - Submit business info`);
  console.log(`   POST /onboarding/:id/documents - Upload documents`);
  console.log(`   GET  /onboarding/:id/documents - Get uploaded documents`);
  console.log(`   POST /onboarding/:id/verify - Request verification`);
  console.log(`   POST /onboarding/:id/approve - Approve application (admin)`);
  console.log(`   POST /onboarding/:id/reject - Reject application (admin)`);
  console.log(`   GET  /onboarding/:id - Get application details`);
  console.log(`   GET  /onboarding/applications/list - List all applications`);
  console.log(`   GET  /onboarding/stats - Get onboarding statistics`);
});

module.exports = app;
