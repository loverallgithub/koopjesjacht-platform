const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const mime = require('mime-types');

const app = express();
const port = process.env.AGENT_PORT || 9007;

app.use(express.json());

// Agent URLs
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';
const VENUE_MANAGEMENT_URL = process.env.VENUE_MANAGEMENT_URL || 'http://venue-agent:9006';
const REWARD_AGENT_URL = process.env.REWARD_AGENT_URL || 'http://payment-agent:9004';

// Upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/photos';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp').split(',');

// Ensure upload directory exists
(async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true });
    console.log('✅ Upload directories created');
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
})();

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
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { hunt_id, team_id } = req.body;
    const uploadPath = path.join(UPLOAD_DIR, hunt_id || 'default', team_id || 'default');

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate thumbnail from image
 */
async function generateThumbnail(imagePath, thumbnailPath) {
  try {
    await sharp(imagePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);
    return thumbnailPath;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Optimize image
 */
async function optimizeImage(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();

    // Only optimize if image is larger than 1920x1080
    if (metadata.width > 1920 || metadata.height > 1080) {
      await sharp(imagePath)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(imagePath + '.optimized');

      // Replace original with optimized
      await fs.rename(imagePath + '.optimized', imagePath);
    }
  } catch (error) {
    console.error('Error optimizing image:', error);
  }
}

/**
 * Store photo metadata
 */
async function storePhoto(photo) {
  const key = `photo:${photo.photo_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(photo)); // 30 day TTL

  // Add to team's photo list
  await redisClient.sAdd(`team:${photo.team_id}:photos`, photo.photo_id);

  // Add to hunt's photo list
  await redisClient.sAdd(`hunt:${photo.hunt_id}:photos`, photo.photo_id);

  // Add to venue's photo list
  if (photo.venue_id) {
    await redisClient.sAdd(`venue:${photo.venue_id}:photos`, photo.photo_id);
  }
}

/**
 * Get photo metadata
 */
async function getPhoto(photo_id) {
  const key = `photo:${photo_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Verify photo location
 */
function verifyLocation(photoLocation, venueLocation) {
  if (!photoLocation || !venueLocation) {
    return { valid: false, reason: 'Missing location data' };
  }

  // Simple distance check (in real app, use Haversine formula)
  const latDiff = Math.abs(photoLocation.latitude - venueLocation.latitude);
  const lonDiff = Math.abs(photoLocation.longitude - venueLocation.longitude);

  // Allow ~500m radius (approx 0.005 degrees)
  const maxDiff = 0.005;
  const isNear = latDiff < maxDiff && lonDiff < maxDiff;

  return {
    valid: isNear,
    reason: isNear ? 'Location verified' : 'Photo taken too far from venue',
    distance_degrees: Math.sqrt(latDiff * latDiff + lonDiff * lonDiff)
  };
}

/**
 * Verify timestamp
 */
function verifyTimestamp(uploadedAt, huntStartTime, huntEndTime) {
  const uploadTime = new Date(uploadedAt);
  const start = huntStartTime ? new Date(huntStartTime) : null;
  const end = huntEndTime ? new Date(huntEndTime) : null;

  if (start && uploadTime < start) {
    return { valid: false, reason: 'Photo uploaded before hunt started' };
  }

  if (end && uploadTime > end) {
    return { valid: false, reason: 'Photo uploaded after hunt ended' };
  }

  return { valid: true, reason: 'Timestamp verified' };
}

/**
 * Award bonus points
 */
async function awardBonusPoints(team_id, hunt_id, points, reason) {
  try {
    await axios.post(`${STATS_AGGREGATOR_URL}/bonus/award`, {
      team_id,
      hunt_id,
      bonus_type: reason,
      bonus_points: points,
      description: `Bonus points for ${reason}`
    });
    return true;
  } catch (error) {
    console.error('Error awarding bonus points:', error.message);
    return false;
  }
}

/**
 * Send notification
 */
async function sendNotification(team_id, hunt_id, type, data) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/send`, {
      team_id,
      hunt_id,
      type,
      data
    });
  } catch (error) {
    console.error('Error sending notification:', error.message);
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'MediaUploadAgent',
    version: '1.0.0',
    features: [
      'Photo upload',
      'Photo verification',
      'Social sharing',
      'Photo gallery',
      'Photo challenges',
      'Analytics'
    ]
  });
});

// ============================================
// PHASE 1: CORE PHOTO UPLOAD
// ============================================

/**
 * Upload photo
 */
app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    const {
      team_id,
      hunt_id,
      venue_id,
      venue_name,
      caption,
      latitude,
      longitude
    } = req.body;

    if (!team_id || !hunt_id) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['team_id', 'hunt_id', 'photo file']
      });
    }

    // Optimize image
    await optimizeImage(req.file.path);

    // Generate thumbnail
    const thumbnailPath = path.join(
      UPLOAD_DIR,
      'thumbnails',
      `thumb-${req.file.filename}`
    );
    await generateThumbnail(req.file.path, thumbnailPath);

    // Create photo metadata
    const photo = {
      photo_id: uuidv4(),
      team_id,
      hunt_id,
      venue_id: venue_id || null,
      venue_name: venue_name || null,
      photo_url: `/photos/${hunt_id}/${team_id}/${req.file.filename}`,
      thumbnail_url: `/photos/thumbnails/thumb-${req.file.filename}`,
      caption: caption || '',
      location: (latitude && longitude) ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : null,
      uploaded_by: team_id,
      uploaded_at: new Date().toISOString(),
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      original_filename: req.file.originalname,
      status: 'approved', // Auto-approve for now
      verification_status: 'pending',
      bonus_points_awarded: 0,
      shared_to_social: false,
      featured: false
    };

    // Store photo metadata
    await storePhoto(photo);

    // Award bonus points for photo upload
    const bonusPoints = 25;
    await awardBonusPoints(team_id, hunt_id, bonusPoints, 'photo_upload');
    photo.bonus_points_awarded = bonusPoints;

    // Update photo with points awarded
    await storePhoto(photo);

    // Send notification
    await sendNotification(team_id, hunt_id, 'photo_uploaded', {
      photo_id: photo.photo_id,
      venue_name: venue_name || 'a location',
      bonus_points: bonusPoints
    });

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: {
        photo_id: photo.photo_id,
        photo_url: photo.photo_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption,
        uploaded_at: photo.uploaded_at,
        file_size: photo.file_size,
        bonus_points_awarded: bonusPoints
      }
    });

  } catch (error) {
    console.error('Error uploading photo:', error);

    // Clean up file if error occurred
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * Get photo details
 */
app.get('/photo/:photo_id', async (req, res) => {
  try {
    const { photo_id } = req.params;
    const photo = await getPhoto(photo_id);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({
      success: true,
      photo
    });

  } catch (error) {
    console.error('Error getting photo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get team photos
 */
app.get('/photos/team/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.query;

    if (!hunt_id) {
      return res.status(400).json({ error: 'Missing hunt_id query parameter' });
    }

    const photoIds = await redisClient.sMembers(`team:${team_id}:photos`);
    const photos = [];

    for (const photo_id of photoIds) {
      const photo = await getPhoto(photo_id);
      if (photo && photo.hunt_id === hunt_id) {
        photos.push(photo);
      }
    }

    // Sort by upload time (newest first)
    photos.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    res.json({
      success: true,
      team_id,
      hunt_id,
      photos,
      total: photos.length
    });

  } catch (error) {
    console.error('Error getting team photos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Serve photo files
 */
app.use('/photos', express.static(UPLOAD_DIR));

// ============================================
// PHASE 2: VERIFICATION & GALLERY
// ============================================

/**
 * Verify photo
 */
app.post('/verify/:photo_id', async (req, res) => {
  try {
    const { photo_id } = req.params;
    const { venue_location, hunt_start_time, hunt_end_time } = req.body;

    const photo = await getPhoto(photo_id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const checks = {
      timestamp_valid: true,
      location_valid: true,
      within_hunt_time: true,
      near_venue: true
    };

    let confidence_score = 1.0;
    let status = 'verified';
    const notes = [];

    // Timestamp verification
    if (hunt_start_time || hunt_end_time) {
      const timestampCheck = verifyTimestamp(
        photo.uploaded_at,
        hunt_start_time,
        hunt_end_time
      );
      checks.timestamp_valid = timestampCheck.valid;
      checks.within_hunt_time = timestampCheck.valid;

      if (!timestampCheck.valid) {
        confidence_score -= 0.3;
        notes.push(timestampCheck.reason);
      }
    }

    // Location verification
    if (photo.location && venue_location) {
      const locationCheck = verifyLocation(photo.location, venue_location);
      checks.location_valid = locationCheck.valid;
      checks.near_venue = locationCheck.valid;

      if (!locationCheck.valid) {
        confidence_score -= 0.4;
        notes.push(locationCheck.reason);
      } else {
        notes.push(`Location verified (${locationCheck.distance_degrees.toFixed(4)}° from venue)`);
      }
    }

    if (confidence_score < 0.5) {
      status = 'failed';
    } else if (confidence_score < 0.8) {
      status = 'manual_review';
    }

    const verification = {
      verification_id: uuidv4(),
      photo_id,
      verified_at: new Date().toISOString(),
      verification_method: 'location+timestamp',
      checks,
      confidence_score,
      status,
      notes: notes.join('; ')
    };

    // Update photo verification status
    photo.verification_status = status;
    await storePhoto(photo);

    // Store verification record
    await redisClient.setEx(
      `verification:${verification.verification_id}`,
      2592000,
      JSON.stringify(verification)
    );

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying photo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get hunt photo gallery
 */
app.get('/gallery/:hunt_id', async (req, res) => {
  try {
    const { hunt_id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const photoIds = await redisClient.sMembers(`hunt:${hunt_id}:photos`);
    const allPhotos = [];

    for (const photo_id of photoIds) {
      const photo = await getPhoto(photo_id);
      if (photo && photo.status === 'approved') {
        allPhotos.push(photo);
      }
    }

    // Sort by upload time (newest first)
    allPhotos.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    // Pagination
    const photos = allPhotos.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // Get venue photo counts
    const photosByVenue = {};
    allPhotos.forEach(photo => {
      if (photo.venue_id) {
        photosByVenue[photo.venue_id] = (photosByVenue[photo.venue_id] || 0) + 1;
      }
    });

    res.json({
      success: true,
      hunt_id,
      total_photos: allPhotos.length,
      photos,
      photos_by_venue: photosByVenue,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: allPhotos.length,
        has_more: parseInt(offset) + parseInt(limit) < allPhotos.length
      }
    });

  } catch (error) {
    console.error('Error getting gallery:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get venue photos
 */
app.get('/photos/venue/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const photoIds = await redisClient.sMembers(`venue:${venue_id}:photos`);
    const photos = [];

    for (const photo_id of photoIds) {
      const photo = await getPhoto(photo_id);
      if (photo && photo.status === 'approved') {
        photos.push(photo);
      }
    }

    // Sort by upload time (newest first)
    photos.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

    res.json({
      success: true,
      venue_id,
      photos,
      total: photos.length
    });

  } catch (error) {
    console.error('Error getting venue photos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Feature a photo
 */
app.post('/gallery/:photo_id/feature', async (req, res) => {
  try {
    const { photo_id } = req.params;
    const photo = await getPhoto(photo_id);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    photo.featured = true;
    await storePhoto(photo);

    // Send notification to team
    await sendNotification(photo.team_id, photo.hunt_id, 'photo_featured', {
      photo_id: photo.photo_id,
      message: 'Your photo has been featured in the hunt gallery!'
    });

    res.json({
      success: true,
      message: 'Photo featured successfully',
      photo
    });

  } catch (error) {
    console.error('Error featuring photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PHASE 3: SOCIAL SHARING
// ============================================

/**
 * Share photo to social media
 */
app.post('/share', async (req, res) => {
  try {
    const {
      photo_id,
      platform,
      caption,
      hashtags,
      share_url
    } = req.body;

    if (!photo_id || !platform) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['photo_id', 'platform']
      });
    }

    const photo = await getPhoto(photo_id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const share = {
      share_id: uuidv4(),
      photo_id,
      team_id: photo.team_id,
      hunt_id: photo.hunt_id,
      platform,
      shared_at: new Date().toISOString(),
      share_url: share_url || null,
      caption: caption || photo.caption,
      hashtags: hashtags || ['#ScavengerHunt', '#FoodHunt'],
      mentions: [],
      bonus_points_awarded: 25,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    };

    // Store share record
    await redisClient.setEx(
      `share:${share.share_id}`,
      2592000,
      JSON.stringify(share)
    );
    await redisClient.sAdd(`photo:${photo_id}:shares`, share.share_id);

    // Mark photo as shared
    photo.shared_to_social = true;
    await storePhoto(photo);

    // Award bonus points for sharing
    await awardBonusPoints(photo.team_id, photo.hunt_id, 25, 'social_share');

    // Send notification
    await sendNotification(photo.team_id, photo.hunt_id, 'photo_shared', {
      platform,
      bonus_points: 25
    });

    res.json({
      success: true,
      message: 'Photo shared successfully',
      share,
      bonus_points_awarded: 25
    });

  } catch (error) {
    console.error('Error sharing photo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get team shares
 */
app.get('/shares/team/:team_id', async (req, res) => {
  try {
    const { team_id } = req.params;
    const { hunt_id } = req.query;

    const photoIds = await redisClient.sMembers(`team:${team_id}:photos`);
    const shares = [];

    for (const photo_id of photoIds) {
      const photo = await getPhoto(photo_id);
      if (photo && photo.hunt_id === hunt_id) {
        const shareIds = await redisClient.sMembers(`photo:${photo_id}:shares`);

        for (const share_id of shareIds) {
          const shareData = await redisClient.get(`share:${share_id}`);
          if (shareData) {
            shares.push(JSON.parse(shareData));
          }
        }
      }
    }

    res.json({
      success: true,
      team_id,
      hunt_id,
      shares,
      total: shares.length
    });

  } catch (error) {
    console.error('Error getting team shares:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PHASE 4: ANALYTICS
// ============================================

/**
 * Get photo analytics
 */
app.get('/analytics/:hunt_id', async (req, res) => {
  try {
    const { hunt_id } = req.params;

    const photoIds = await redisClient.sMembers(`hunt:${hunt_id}:photos`);
    const photos = [];

    for (const photo_id of photoIds) {
      const photo = await getPhoto(photo_id);
      if (photo) {
        photos.push(photo);
      }
    }

    // Calculate metrics
    const totalPhotos = photos.length;
    const uniqueTeams = new Set(photos.map(p => p.team_id)).size;
    const photosShared = photos.filter(p => p.shared_to_social).length;
    const photosByVenue = {};
    let totalBonusPoints = 0;

    photos.forEach(photo => {
      if (photo.venue_id) {
        photosByVenue[photo.venue_id] = (photosByVenue[photo.venue_id] || 0) + 1;
      }
      totalBonusPoints += photo.bonus_points_awarded || 0;
    });

    const topVenues = Object.entries(photosByVenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([venue_id, count]) => ({ venue_id, photos: count }));

    const metrics = {
      total_photos: totalPhotos,
      unique_teams: uniqueTeams,
      photos_per_team: uniqueTeams > 0 ? (totalPhotos / uniqueTeams).toFixed(2) : 0,
      photos_shared: photosShared,
      share_rate: totalPhotos > 0 ? ((photosShared / totalPhotos) * 100).toFixed(1) + '%' : '0%',
      total_bonus_points: totalBonusPoints,
      top_venues: topVenues,
      photos_by_venue: photosByVenue
    };

    res.json({
      success: true,
      hunt_id,
      metrics,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`✅ Media Upload Agent v1.0 listening on port ${port}`);
  console.log(`📸 Features:`);
  console.log(`   - Photo upload with bonus points (+25 pts)`);
  console.log(`   - Photo verification (location + timestamp)`);
  console.log(`   - Social media sharing (+25 pts)`);
  console.log(`   - Photo galleries (hunt/team/venue)`);
  console.log(`   - Analytics dashboard`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /upload - Upload photo`);
  console.log(`   GET  /photo/:photo_id - Get photo details`);
  console.log(`   GET  /photos/team/:team_id - Get team photos`);
  console.log(`   GET  /photos/venue/:venue_id - Get venue photos`);
  console.log(`   POST /verify/:photo_id - Verify photo`);
  console.log(`   GET  /gallery/:hunt_id - Hunt photo gallery`);
  console.log(`   POST /gallery/:photo_id/feature - Feature photo`);
  console.log(`   POST /share - Share photo to social media`);
  console.log(`   GET  /shares/team/:team_id - Get team shares`);
  console.log(`   GET  /analytics/:hunt_id - Photo analytics`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`📏 Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
});

module.exports = app;
