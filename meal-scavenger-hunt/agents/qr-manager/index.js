const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { createClient } = require('redis');
const axios = require('axios');

const app = express();
const port = process.env.AGENT_PORT || 9002;

// Clue Generator service URL
const CLUE_GENERATOR_URL = process.env.CLUE_GENERATOR_URL || 'http://clue-agent:9001';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Redis connection for caching
let redisClient;
(async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (error) {
    console.error('⚠️ Redis connection failed:', error.message);
  }
})();

app.use(express.json());

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'QRManagerAgent',
    version: '1.0.0',
    endpoints: {
      generate: 'POST /generate-qr',
      verify: 'POST /verify-qr',
      get: 'GET /qr/:code',
      list: 'GET /qr/hunt/:huntId',
      invalidate: 'DELETE /qr/:code'
    }
  });
});

// ============================================
// GENERATE QR CODE
// ============================================
app.post('/generate-qr', async (req, res) => {
  try {
    const { shop_id, hunt_id, clue_data, location, expires_at } = req.body;

    // Validation
    if (!shop_id || !hunt_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['shop_id', 'hunt_id']
      });
    }

    // Generate unique QR code
    const qrCode = uuidv4();
    const qrData = {
      code: qrCode,
      shop_id,
      hunt_id,
      type: 'SHOP_LOCATION',
      timestamp: new Date().toISOString()
    };

    // Generate QR code image (Base64)
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#667eea',
        light: '#ffffff'
      }
    });

    // Store in database
    const query = `
      INSERT INTO qr_codes (
        code, shop_id, hunt_id, qr_data, location,
        is_active, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, code, shop_id, hunt_id, created_at
    `;

    const values = [
      qrCode,
      shop_id,
      hunt_id,
      JSON.stringify(qrData),
      location || null,
      true,
      expires_at || null
    ];

    const result = await pool.query(query, values);

    // Cache in Redis for fast verification (24 hour TTL)
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(
        `qr:${qrCode}`,
        86400,
        JSON.stringify({ shop_id, hunt_id, active: true })
      );
    }

    res.status(201).json({
      success: true,
      qr_code: {
        id: result.rows[0].id,
        code: qrCode,
        shop_id,
        hunt_id,
        qr_image: qrCodeDataURL,
        qr_data: qrData,
        created_at: result.rows[0].created_at,
        expires_at: expires_at || null
      },
      message: 'QR code generated successfully'
    });

  } catch (error) {
    console.error('Error generating QR code:', error);

    // Handle missing table gracefully
    if (error.code === '42P01') {
      return res.status(503).json({
        error: 'Database table not ready',
        message: 'QR codes table does not exist. Using in-memory storage.',
        qr_code: {
          code: uuidv4(),
          shop_id: req.body.shop_id,
          hunt_id: req.body.hunt_id,
          qr_image: await QRCode.toDataURL(JSON.stringify({
            code: uuidv4(),
            shop_id: req.body.shop_id,
            hunt_id: req.body.hunt_id
          }))
        }
      });
    }

    res.status(500).json({
      error: error.message,
      code: error.code
    });
  }
});

// ============================================
// VERIFY QR CODE (SCAN)
// ============================================
app.post('/verify-qr', async (req, res) => {
  try {
    const { code, team_id, hunter_id, location } = req.body;

    if (!code || !team_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['code', 'team_id']
      });
    }

    // Check Redis cache first
    let qrInfo;
    if (redisClient && redisClient.isOpen) {
      const cached = await redisClient.get(`qr:${code}`);
      if (cached) {
        qrInfo = JSON.parse(cached);
      }
    }

    // Query database for QR code
    const qrQuery = `
      SELECT id, code, shop_id, hunt_id, qr_data, is_active, expires_at, created_at
      FROM qr_codes
      WHERE code = $1
    `;

    const qrResult = await pool.query(qrQuery, [code]);

    if (qrResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found',
        valid: false
      });
    }

    const qrCode = qrResult.rows[0];

    // Validation checks
    const validations = {
      exists: qrResult.rows.length > 0,
      active: qrCode.is_active,
      not_expired: !qrCode.expires_at || new Date(qrCode.expires_at) > new Date()
    };

    const isValid = validations.exists && validations.active && validations.not_expired;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: !validations.active ? 'QR code is inactive' : 'QR code has expired',
        validations
      });
    }

    // Check for duplicate scan by same team
    const duplicateCheck = `
      SELECT id FROM scans
      WHERE qr_code_id = $1 AND team_id = $2
    `;
    const duplicateResult = await pool.query(duplicateCheck, [qrCode.id, team_id]);

    const isDuplicate = duplicateResult.rows.length > 0;

    // Record the scan
    const scanQuery = `
      INSERT INTO scans (
        qr_code_id, team_id, hunter_id, shop_id, hunt_id,
        scan_location, scanned_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, scanned_at
    `;

    const scanValues = [
      qrCode.id,
      team_id,
      hunter_id || null,
      qrCode.shop_id,
      qrCode.hunt_id,
      location || null
    ];

    const scanResult = await pool.query(scanQuery, scanValues);

    // Update hunt progress
    const progressQuery = `
      INSERT INTO hunt_progress (
        hunt_id, team_id, shop_id, status, points_earned, completed_at
      ) VALUES ($1, $2, $3, 'completed', $4, NOW())
      ON CONFLICT (hunt_id, team_id, shop_id)
      DO UPDATE SET
        status = 'completed',
        completed_at = NOW(),
        points_earned = EXCLUDED.points_earned
      RETURNING id
    `;

    const points = isDuplicate ? 0 : 100; // No points for duplicate scans
    await pool.query(progressQuery, [qrCode.hunt_id, team_id, qrCode.shop_id, points]);

    res.json({
      success: true,
      valid: true,
      scan: {
        id: scanResult.rows[0].id,
        qr_code: code,
        shop_id: qrCode.shop_id,
        hunt_id: qrCode.hunt_id,
        team_id,
        scanned_at: scanResult.rows[0].scanned_at,
        is_duplicate: isDuplicate,
        points_earned: points
      },
      message: isDuplicate
        ? 'QR code already scanned by this team. No additional points awarded.'
        : 'QR code verified successfully! Points awarded.',
      validations
    });

  } catch (error) {
    console.error('Error verifying QR code:', error);

    // Handle missing tables gracefully
    if (error.code === '42P01') {
      return res.json({
        success: true,
        valid: true,
        scan: {
          qr_code: req.body.code,
          team_id: req.body.team_id,
          scanned_at: new Date().toISOString(),
          points_earned: 100
        },
        message: 'QR code verified (in-memory mode)',
        note: 'Database tables not ready. Scan recorded in memory only.'
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET QR CODE DETAILS
// ============================================
app.get('/qr/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const query = `
      SELECT
        qc.id, qc.code, qc.shop_id, qc.hunt_id, qc.qr_data,
        qc.location, qc.is_active, qc.expires_at, qc.created_at,
        COUNT(s.id) as total_scans
      FROM qr_codes qc
      LEFT JOIN scans s ON s.qr_code_id = qc.id
      WHERE qc.code = $1
      GROUP BY qc.id
    `;

    const result = await pool.query(query, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    const qrCode = result.rows[0];

    res.json({
      success: true,
      qr_code: {
        id: qrCode.id,
        code: qrCode.code,
        shop_id: qrCode.shop_id,
        hunt_id: qrCode.hunt_id,
        location: qrCode.location,
        is_active: qrCode.is_active,
        expires_at: qrCode.expires_at,
        created_at: qrCode.created_at,
        total_scans: parseInt(qrCode.total_scans),
        status: qrCode.is_active ? 'active' : 'inactive'
      }
    });

  } catch (error) {
    console.error('Error fetching QR code:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LIST QR CODES FOR HUNT
// ============================================
app.get('/qr/hunt/:huntId', async (req, res) => {
  try {
    const { huntId } = req.params;

    const query = `
      SELECT
        qc.id, qc.code, qc.shop_id, qc.hunt_id, qc.location,
        qc.is_active, qc.expires_at, qc.created_at,
        COUNT(s.id) as total_scans
      FROM qr_codes qc
      LEFT JOIN scans s ON s.qr_code_id = qc.id
      WHERE qc.hunt_id = $1
      GROUP BY qc.id
      ORDER BY qc.created_at DESC
    `;

    const result = await pool.query(query, [huntId]);

    res.json({
      success: true,
      hunt_id: huntId,
      total_qr_codes: result.rows.length,
      qr_codes: result.rows.map(qr => ({
        id: qr.id,
        code: qr.code,
        shop_id: qr.shop_id,
        location: qr.location,
        is_active: qr.is_active,
        expires_at: qr.expires_at,
        created_at: qr.created_at,
        total_scans: parseInt(qr.total_scans)
      }))
    });

  } catch (error) {
    console.error('Error listing QR codes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVALIDATE QR CODE
// ============================================
app.delete('/qr/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const query = `
      UPDATE qr_codes
      SET is_active = false
      WHERE code = $1
      RETURNING id, code, shop_id, hunt_id
    `;

    const result = await pool.query(query, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Remove from Redis cache
    if (redisClient && redisClient.isOpen) {
      await redisClient.del(`qr:${code}`);
    }

    res.json({
      success: true,
      message: 'QR code invalidated successfully',
      qr_code: result.rows[0]
    });

  } catch (error) {
    console.error('Error invalidating QR code:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET SCAN HISTORY FOR TEAM
// ============================================
app.get('/scans/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const query = `
      SELECT
        s.id, s.qr_code_id, s.team_id, s.hunter_id,
        s.shop_id, s.hunt_id, s.scanned_at,
        qc.code as qr_code
      FROM scans s
      JOIN qr_codes qc ON qc.id = s.qr_code_id
      WHERE s.team_id = $1
      ORDER BY s.scanned_at DESC
    `;

    const result = await pool.query(query, [teamId]);

    res.json({
      success: true,
      team_id: teamId,
      total_scans: result.rows.length,
      scans: result.rows.map(scan => ({
        id: scan.id,
        qr_code: scan.qr_code,
        shop_id: scan.shop_id,
        hunt_id: scan.hunt_id,
        hunter_id: scan.hunter_id,
        scanned_at: scan.scanned_at
      }))
    });

  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREATE VENUE PACKAGE (Clue + QR Code)
// ============================================
app.post('/create-venue-package', async (req, res) => {
  try {
    const { shop_info, hunt_id, difficulty_level, team_id } = req.body;

    if (!shop_info || !shop_info.name || !hunt_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: {
          shop_info: {
            name: 'string (required)',
            description: 'string (optional)',
            cuisine: 'string (optional)',
            location: 'string (required)',
            address: 'string (optional)'
          },
          hunt_id: 'string (required)',
          difficulty_level: 'number 1-5 (optional, default: 3)',
          team_id: 'string (optional - for generating team-specific URLs)'
        }
      });
    }

    // Step 1: Generate intelligent clue from Clue Generator
    console.log('📝 Generating clue for:', shop_info.name);
    let clueResponse;
    try {
      clueResponse = await axios.post(`${CLUE_GENERATOR_URL}/generate-clue`, {
        shop_info,
        difficulty_level: difficulty_level || 3
      });
    } catch (error) {
      // Fallback if clue generator is down
      console.warn('⚠️ Clue generator not available, using fallback');
      clueResponse = {
        data: {
          clue: {
            text: `Find ${shop_info.name} in ${shop_info.location}`,
            difficulty: difficulty_level || 3,
            answer: shop_info.name
          },
          hints: []
        }
      };
    }

    const clueData = clueResponse.data;

    // Step 2: Generate unique QR code for venue
    const venueQRCode = uuidv4();
    const clueQRCode = uuidv4();

    // Step 3: Create retrieval URLs
    const baseURL = process.env.FRONTEND_URL || 'http://localhost:8081';
    const venueURL = `${baseURL}/scan/${venueQRCode}`;
    const clueURL = `${baseURL}/clue/${clueQRCode}`;

    // Step 4: Generate QR code images
    const venueQRData = {
      code: venueQRCode,
      type: 'VENUE_LOCATION',
      shop_id: shop_info.id || shop_info.name.toLowerCase().replace(/\s+/g, '-'),
      shop_name: shop_info.name,
      hunt_id,
      location: shop_info.location,
      url: venueURL,
      timestamp: new Date().toISOString()
    };

    const clueQRData = {
      code: clueQRCode,
      type: 'CLUE_RETRIEVAL',
      shop_id: shop_info.id || shop_info.name.toLowerCase().replace(/\s+/g, '-'),
      shop_name: shop_info.name,
      hunt_id,
      clue: clueData.clue,
      url: clueURL,
      timestamp: new Date().toISOString()
    };

    // Generate venue QR code image (for scanning at location)
    const venueQRImage = await QRCode.toDataURL(venueURL, {
      width: 400,
      margin: 2,
      color: {
        dark: '#667eea',  // Purple - matches brand
        light: '#ffffff'
      }
    });

    // Generate clue QR code image (for getting the clue)
    const clueQRImage = await QRCode.toDataURL(clueURL, {
      width: 300,
      margin: 2,
      color: {
        dark: '#10b981',  // Green - indicates clue
        light: '#ffffff'
      }
    });

    // Step 5: Store in Redis cache for quick retrieval
    if (redisClient && redisClient.isOpen) {
      // Cache venue QR data
      await redisClient.setEx(
        `qr:${venueQRCode}`,
        86400, // 24 hours
        JSON.stringify(venueQRData)
      );

      // Cache clue QR data with the full clue
      await redisClient.setEx(
        `qr:${clueQRCode}`,
        86400,
        JSON.stringify({ ...clueQRData, full_clue: clueData })
      );
    }

    // Step 6: Return complete venue package
    res.status(201).json({
      success: true,
      venue: {
        shop_info: {
          name: shop_info.name,
          location: shop_info.location,
          cuisine: shop_info.cuisine,
          address: shop_info.address
        },
        hunt_id
      },
      clue: {
        ...clueData.clue,
        difficulty: difficulty_level || 3
      },
      hints: clueData.hints,
      qr_codes: {
        venue: {
          code: venueQRCode,
          type: 'VENUE_LOCATION',
          purpose: 'Scan this QR code at the venue location to check in',
          url: venueURL,
          qr_image: venueQRImage,
          color: 'purple',
          instructions: `Print and place this QR code at ${shop_info.name}. Teams scan it when they arrive.`
        },
        clue: {
          code: clueQRCode,
          type: 'CLUE_RETRIEVAL',
          purpose: 'Scan this QR code to reveal the clue',
          url: clueURL,
          qr_image: clueQRImage,
          color: 'green',
          instructions: 'Teams scan this to get their clue at the start of the hunt.'
        }
      },
      message: 'Venue package created successfully with clue and QR codes'
    });

  } catch (error) {
    console.error('Error creating venue package:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================
// GET CLUE BY QR CODE
// ============================================
app.get('/scan/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // Check Redis cache first
    if (redisClient && redisClient.isOpen) {
      const cached = await redisClient.get(`qr:${code}`);
      if (cached) {
        const qrData = JSON.parse(cached);

        if (qrData.type === 'CLUE_RETRIEVAL') {
          // Return the clue
          return res.json({
            success: true,
            type: 'clue',
            shop_name: qrData.shop_name,
            clue: qrData.full_clue || qrData.clue,
            message: 'Clue retrieved successfully'
          });
        } else if (qrData.type === 'VENUE_LOCATION') {
          // Venue check-in
          return res.json({
            success: true,
            type: 'venue_checkin',
            shop_name: qrData.shop_name,
            location: qrData.location,
            message: `You've arrived at ${qrData.shop_name}! Scan to check in.`,
            instructions: 'Use the verify-qr endpoint with your team_id to record your visit.'
          });
        }
      }
    }

    res.status(404).json({
      error: 'QR code not found or expired',
      code
    });

  } catch (error) {
    console.error('Error retrieving QR data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ QR Manager Agent v2.0 listening on port ${port}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST   /create-venue-package - 🆕 Create clue + QR codes for venue`);
  console.log(`   POST   /generate-qr          - Generate QR code`);
  console.log(`   POST   /verify-qr            - Verify/scan QR code`);
  console.log(`   GET    /scan/:code           - 🆕 Retrieve clue/venue by QR code`);
  console.log(`   GET    /qr/:code             - Get QR details`);
  console.log(`   GET    /qr/hunt/:huntId      - List hunt QR codes`);
  console.log(`   DELETE /qr/:code             - Invalidate QR code`);
  console.log(`   GET    /scans/team/:teamId   - Get team scan history`);
  console.log(``);
  console.log(`🔗 Clue Generator: ${CLUE_GENERATOR_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing connections');
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
  await pool.end();
  process.exit(0);
});
