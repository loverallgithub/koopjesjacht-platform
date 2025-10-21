const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 9006;

// Middleware
app.use(cors());
app.use(express.json());

// Storage configuration
const UPLOAD_DIR = process.env.STORAGE_PATH || path.join(__dirname, 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default

// Ensure upload directory exists
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(path.join(UPLOAD_DIR, 'originals'));
fs.ensureDirSync(path.join(UPLOAD_DIR, 'thumbnails'));
fs.ensureDirSync(path.join(UPLOAD_DIR, 'optimized'));

// In-memory media storage (replace with database in production)
const mediaDatabase = new Map();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'originals'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Helper: Optimize image
async function optimizeImage(inputPath, outputPath, options = {}) {
  const { width, height, quality = 80 } = options;

  let pipeline = sharp(inputPath);

  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  return pipeline
    .jpeg({ quality, progressive: true })
    .webp({ quality })
    .toFile(outputPath);
}

// Helper: Generate thumbnail
async function generateThumbnail(inputPath, outputPath) {
  return sharp(inputPath)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toFile(outputPath);
}

// Helper: Get image metadata
async function getImageMetadata(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha
    };
  } catch (error) {
    return null;
  }
}

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'media-management',
    timestamp: new Date().toISOString(),
    storage: {
      directory: UPLOAD_DIR,
      maxFileSize: MAX_FILE_SIZE
    }
  });
});

// Upload media
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const media_id = uuidv4();
    const originalPath = req.file.path;
    const fileExt = path.extname(req.file.originalname);
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileExt);
    const isVideo = /\.(mp4|mov|avi)$/i.test(fileExt);

    let metadata = {
      media_id,
      original_filename: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      type: isImage ? 'image' : isVideo ? 'video' : 'unknown',
      uploaded_at: new Date().toISOString(),
      paths: {
        original: originalPath
      }
    };

    // Process images
    if (isImage) {
      const imageMetadata = await getImageMetadata(originalPath);
      metadata.image_metadata = imageMetadata;

      // Generate thumbnail
      const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', `thumb_${req.file.filename}`);
      await generateThumbnail(originalPath, thumbnailPath);
      metadata.paths.thumbnail = thumbnailPath;

      // Generate optimized version
      const optimizedPath = path.join(UPLOAD_DIR, 'optimized', `opt_${req.file.filename}`);
      await optimizeImage(originalPath, optimizedPath, { width: 1920, quality: 85 });
      metadata.paths.optimized = optimizedPath;
    }

    // Parse additional metadata from request
    if (req.body.metadata) {
      try {
        const additionalMetadata = JSON.parse(req.body.metadata);
        metadata = { ...metadata, ...additionalMetadata };
      } catch (e) {
        // Ignore invalid metadata
      }
    }

    // Store in database
    mediaDatabase.set(media_id, metadata);

    res.json({
      success: true,
      data: {
        media_id,
        filename: req.file.filename,
        type: metadata.type,
        size: req.file.size,
        uploaded_at: metadata.uploaded_at,
        thumbnail_available: !!metadata.paths.thumbnail,
        optimized_available: !!metadata.paths.optimized
      }
    });
  } catch (error) {
    console.error('[Media Upload Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get media details
app.get('/media/:media_id', (req, res) => {
  try {
    const { media_id } = req.params;
    const media = mediaDatabase.get(media_id);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete media
app.delete('/media/:media_id', async (req, res) => {
  try {
    const { media_id } = req.params;
    const media = mediaDatabase.get(media_id);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete files
    const filesToDelete = Object.values(media.paths);
    for (const filePath of filesToDelete) {
      try {
        await fs.remove(filePath);
      } catch (e) {
        console.error(`Failed to delete ${filePath}:`, e);
      }
    }

    // Remove from database
    mediaDatabase.delete(media_id);

    res.json({
      success: true,
      message: 'Media deleted successfully',
      media_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optimize existing image
app.post('/optimize', async (req, res) => {
  try {
    const { media_id, width, height, quality } = req.body;

    if (!media_id) {
      return res.status(400).json({ error: 'media_id is required' });
    }

    const media = mediaDatabase.get(media_id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (media.type !== 'image') {
      return res.status(400).json({ error: 'Can only optimize images' });
    }

    const optimizedPath = path.join(UPLOAD_DIR, 'optimized', `custom_${uuidv4()}${path.extname(media.filename)}`);
    await optimizeImage(media.paths.original, optimizedPath, { width, height, quality });

    // Update metadata
    media.paths.custom_optimized = optimizedPath;
    mediaDatabase.set(media_id, media);

    res.json({
      success: true,
      data: {
        media_id,
        optimized_path: optimizedPath
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get gallery for hunt/shop/team
app.get('/gallery/:entity_type/:entity_id', (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;

    // Filter media by entity
    const galleryMedia = [];
    for (const [media_id, media] of mediaDatabase.entries()) {
      if (media[entity_type + '_id'] === entity_id) {
        galleryMedia.push({
          media_id,
          filename: media.filename,
          type: media.type,
          uploaded_at: media.uploaded_at,
          thumbnail_path: media.paths.thumbnail,
          size: media.size
        });
      }
    }

    res.json({
      success: true,
      entity_type,
      entity_id,
      total_media: galleryMedia.length,
      data: galleryMedia
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate thumbnail for existing media
app.post('/thumbnail', async (req, res) => {
  try {
    const { media_id, width = 200, height = 200 } = req.body;

    if (!media_id) {
      return res.status(400).json({ error: 'media_id is required' });
    }

    const media = mediaDatabase.get(media_id);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (media.type !== 'image') {
      return res.status(400).json({ error: 'Can only generate thumbnails for images' });
    }

    const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', `custom_${width}x${height}_${media.filename}`);
    await sharp(media.paths.original)
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    res.json({
      success: true,
      data: {
        media_id,
        thumbnail_path: thumbnailPath,
        dimensions: { width, height }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[Media Agent Error]:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    status: error.status || 500
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Media Management Agent running on port ${PORT}`);
  console.log(`📁 Storage directory: ${UPLOAD_DIR}`);
  console.log(`📏 Max file size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`);
});
