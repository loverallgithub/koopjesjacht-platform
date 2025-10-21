const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (would use database in production)
const qrCodes = new Map();
const scanHistory = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'qr-manager',
    timestamp: new Date().toISOString()
  });
});

// Generate QR code for venue
app.post('/generate-qr', async (req, res) => {
  try {
    const { venue_id, venue_name, hunt_id } = req.body;

    if (!venue_id) {
      return res.status(400).json({ error: 'venue_id is required' });
    }

    const qr_id = uuidv4();
    const qrData = {
      qr_id,
      venue_id,
      venue_name: venue_name || 'Unknown Venue',
      hunt_id: hunt_id || null,
      created_at: new Date().toISOString(),
      scan_count: 0,
      active: true
    };

    // Generate QR code image
    const qrCodeUrl = `koopjesjacht://scan/${qr_id}`;
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });

    qrData.qr_code_url = qrCodeUrl;
    qrData.qr_code_image = qrCodeImage;

    qrCodes.set(qr_id, qrData);

    console.log(`[QR Manager] Generated QR code ${qr_id} for venue ${venue_id}`);

    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    console.error('[QR Manager] Generate error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Validate QR code scan
app.post('/validate-scan', (req, res) => {
  try {
    const { qr_id, team_id, user_id, location } = req.body;

    if (!qr_id || !team_id) {
      return res.status(400).json({ error: 'qr_id and team_id are required' });
    }

    const qrData = qrCodes.get(qr_id);

    if (!qrData) {
      return res.status(404).json({
        valid: false,
        error: 'QR code not found'
      });
    }

    if (!qrData.active) {
      return res.status(403).json({
        valid: false,
        error: 'QR code is inactive'
      });
    }

    // Record scan
    const scan_id = uuidv4();
    const scanRecord = {
      scan_id,
      qr_id,
      venue_id: qrData.venue_id,
      team_id,
      user_id: user_id || null,
      location: location || null,
      scanned_at: new Date().toISOString()
    };

    if (!scanHistory.has(qr_id)) {
      scanHistory.set(qr_id, []);
    }
    scanHistory.get(qr_id).push(scanRecord);

    // Update scan count
    qrData.scan_count++;
    qrCodes.set(qr_id, qrData);

    console.log(`[QR Manager] Valid scan ${scan_id} for QR ${qr_id} by team ${team_id}`);

    res.json({
      valid: true,
      scan_id,
      venue_id: qrData.venue_id,
      venue_name: qrData.venue_name,
      hunt_id: qrData.hunt_id,
      points_earned: 10,
      message: 'Scan successful!'
    });
  } catch (error) {
    console.error('[QR Manager] Validation error:', error);
    res.status(500).json({ error: 'Failed to validate scan' });
  }
});

// Get QR code details
app.get('/qr-code/:qr_id', (req, res) => {
  const { qr_id } = req.params;
  const qrData = qrCodes.get(qr_id);

  if (!qrData) {
    return res.status(404).json({ error: 'QR code not found' });
  }

  res.json({ data: qrData });
});

// Get scan analytics
app.get('/analytics/:qr_id', (req, res) => {
  const { qr_id } = req.params;
  const qrData = qrCodes.get(qr_id);
  const scans = scanHistory.get(qr_id) || [];

  if (!qrData) {
    return res.status(404).json({ error: 'QR code not found' });
  }

  const analytics = {
    qr_id,
    venue_id: qrData.venue_id,
    total_scans: scans.length,
    unique_teams: new Set(scans.map(s => s.team_id)).size,
    created_at: qrData.created_at,
    last_scan: scans.length > 0 ? scans[scans.length - 1].scanned_at : null,
    scan_history: scans.slice(-10) // Last 10 scans
  };

  res.json({ data: analytics });
});

// Regenerate QR code
app.post('/regenerate/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { venue_name, hunt_id } = req.body;

    // Deactivate old QR codes for this venue
    for (const [qr_id, data] of qrCodes.entries()) {
      if (data.venue_id === venue_id && data.active) {
        data.active = false;
        qrCodes.set(qr_id, data);
      }
    }

    // Generate new QR code
    const qr_id = uuidv4();
    const qrData = {
      qr_id,
      venue_id,
      venue_name: venue_name || 'Unknown Venue',
      hunt_id: hunt_id || null,
      created_at: new Date().toISOString(),
      scan_count: 0,
      active: true
    };

    const qrCodeUrl = `koopjesjacht://scan/${qr_id}`;
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });

    qrData.qr_code_url = qrCodeUrl;
    qrData.qr_code_image = qrCodeImage;

    qrCodes.set(qr_id, qrData);

    console.log(`[QR Manager] Regenerated QR code ${qr_id} for venue ${venue_id}`);

    res.json({
      success: true,
      data: qrData,
      message: 'QR code regenerated successfully'
    });
  } catch (error) {
    console.error('[QR Manager] Regenerate error:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

// List all QR codes (for admin)
app.get('/qr-codes', (req, res) => {
  const allQRCodes = Array.from(qrCodes.values());
  res.json({
    count: allQRCodes.length,
    data: allQRCodes
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ QR Manager Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
