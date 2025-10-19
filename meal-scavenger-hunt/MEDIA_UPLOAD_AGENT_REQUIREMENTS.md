# Media Upload Agent - Requirements

**Agent**: Media Upload Agent
**Port**: 9007
**Purpose**: Enable photo challenges, social sharing, and create lasting memories of scavenger hunts

---

## Vision

Transform scavenger hunts into memorable experiences by:
- **Photo challenges** at venues (proof of visit)
- **Social media sharing** (viral growth)
- **Photo gallery** (memories & engagement)
- **Bonus points** for participation (+25 points per photo)
- **Prevent cheating** via photo verification

---

## Core Capabilities

### Capability 1: Photo Upload 📸

#### Upload Photo at Venue
**Purpose**: Teams upload photos at venues as proof of visit

**Data Model**:
```javascript
{
  photo_id: "uuid",
  team_id: "team_alpha",
  hunt_id: "hunt_denhaag_001",
  venue_id: "golden_dragon",
  venue_name: "Golden Dragon",
  photo_url: "https://storage/.../photo.jpg",
  thumbnail_url: "https://storage/.../thumb.jpg",
  caption: "Amazing dim sum at Golden Dragon!",
  location: {
    latitude: 52.0705,
    longitude: 4.3007
  },
  uploaded_by: "hunter_id",
  uploaded_at: "2025-10-18T15:00:00Z",
  file_size: 2048000,  // bytes
  mime_type: "image/jpeg",
  status: "pending",  // pending, approved, rejected
  verification_status: "not_verified",  // not_verified, verified, failed
  bonus_points_awarded: 25,
  shared_to_social: false
}
```

**Features**:
- Accept image uploads (JPEG, PNG, WebP)
- Max file size: 10MB
- Auto-generate thumbnails
- Store metadata (location, timestamp)
- Award bonus points (+25 pts)

**Endpoints**:
- `POST /upload` - Upload photo
- `GET /photo/:photo_id` - Get photo details
- `PUT /photo/:photo_id` - Update caption/metadata
- `DELETE /photo/:photo_id` - Delete photo

---

### Capability 2: Photo Verification ✅

#### Verify Photo Authenticity
**Purpose**: Ensure photos are genuine and taken at venue

**Verification Methods**:
1. **Timestamp Check** - Photo taken during hunt window
2. **Location Verification** - GPS coordinates near venue
3. **Image Analysis** (Optional) - AI-based verification
   - Detect venue landmarks
   - Check for tampering
   - Verify it's not a stock photo

**Data Model**:
```javascript
{
  verification_id: "uuid",
  photo_id: "uuid",
  verified_at: "2025-10-18T15:01:00Z",
  verification_method: "location+timestamp",
  checks: {
    timestamp_valid: true,
    location_valid: true,
    image_authentic: true,
    within_hunt_time: true,
    near_venue: true
  },
  confidence_score: 0.95,  // 0-1
  status: "verified",  // verified, failed, manual_review
  notes: "Photo verified successfully"
}
```

**Endpoints**:
- `POST /verify/:photo_id` - Verify photo
- `GET /verify/:photo_id` - Get verification status
- `POST /verify/batch` - Verify multiple photos

---

### Capability 3: Social Media Sharing 📱

#### Share to Social Platforms
**Purpose**: Enable viral growth through social sharing

**Supported Platforms**:
- Instagram
- Facebook
- Twitter/X
- TikTok (future)

**Features**:
- Generate shareable links
- Auto-hashtags (#DenHaagHunt #ScavengerHunt)
- Mention venues (@GoldenDragonNL)
- Award bonus points for sharing (+25 pts)
- Track share metrics

**Data Model**:
```javascript
{
  share_id: "uuid",
  photo_id: "uuid",
  team_id: "team_alpha",
  platform: "instagram",
  shared_at: "2025-10-18T15:05:00Z",
  share_url: "https://instagram.com/p/...",
  caption: "Found Golden Dragon! #DenHaagHunt 🥟",
  hashtags: ["#DenHaagHunt", "#ScavengerHunt", "#GoldenDragon"],
  mentions: ["@GoldenDragonNL"],
  bonus_points_awarded: 25,
  engagement: {
    likes: 0,
    comments: 0,
    shares: 0
  }
}
```

**Endpoints**:
- `POST /share` - Share photo to social media
- `GET /shares/team/:team_id` - Get team's shares
- `GET /shares/photo/:photo_id` - Get photo shares
- `GET /shares/stats/:hunt_id` - Hunt share statistics

---

### Capability 4: Photo Gallery 🖼️

#### Hunt Photo Gallery
**Purpose**: Showcase all hunt photos in a public gallery

**Features**:
- Public gallery per hunt
- Filter by venue
- Sort by upload time, likes, etc.
- Team-specific galleries
- Download all photos (hunt organizers)

**Gallery Views**:
```javascript
{
  hunt_gallery: {
    hunt_id: "hunt_denhaag_001",
    total_photos: 45,
    total_teams: 12,
    featured_photos: [...],
    recent_photos: [...],
    photos_by_venue: {
      "golden_dragon": 8,
      "bella_napoli": 12,
      // ...
    }
  },
  team_gallery: {
    team_id: "team_alpha",
    total_photos: 5,
    photos: [...]
  },
  venue_gallery: {
    venue_id: "golden_dragon",
    total_photos: 8,
    photos: [...]
  }
}
```

**Endpoints**:
- `GET /gallery/:hunt_id` - Hunt photo gallery
- `GET /gallery/team/:team_id` - Team gallery
- `GET /gallery/venue/:venue_id` - Venue gallery
- `GET /gallery/featured/:hunt_id` - Featured photos
- `POST /gallery/:photo_id/feature` - Mark photo as featured

---

### Capability 5: Photo Challenges 🎯

#### Venue-Specific Photo Challenges
**Purpose**: Create fun photo challenges at venues

**Challenge Types**:
```javascript
{
  selfie: "Take a selfie with the Golden Dragon sign",
  group: "Group photo with restaurant staff",
  food: "Photo of your team eating pizza",
  creative: "Strike a pose like a dragon",
  scavenger: "Find and photograph the secret menu item"
}
```

**Data Model**:
```javascript
{
  challenge_id: "uuid",
  venue_id: "golden_dragon",
  hunt_id: "hunt_denhaag_001",
  challenge_type: "selfie",
  title: "Dragon Sign Selfie",
  description: "Take a selfie with the Golden Dragon sign",
  instructions: "Stand in front of the sign and smile!",
  bonus_points: 50,
  required: false,
  time_limit: null,  // optional
  verification_required: true,
  photo_examples: ["https://.../example.jpg"],
  completions: 12
}
```

**Endpoints**:
- `GET /challenges/:hunt_id` - List photo challenges
- `GET /challenges/venue/:venue_id` - Venue challenges
- `POST /challenge/complete` - Complete challenge with photo
- `GET /challenge/leaderboard/:challenge_id` - Challenge leaderboard

---

### Capability 6: Photo Moderation 🛡️

#### Content Moderation
**Purpose**: Ensure appropriate content in galleries

**Features**:
- Auto-moderation (AI-based)
- Manual review queue
- Report inappropriate photos
- Admin approval workflow

**Moderation Checks**:
- No inappropriate content
- No offensive language in captions
- Not a duplicate
- Actually related to hunt

**Data Model**:
```javascript
{
  moderation_id: "uuid",
  photo_id: "uuid",
  moderated_at: "2025-10-18T15:10:00Z",
  moderated_by: "admin_id or auto",
  checks: {
    appropriate_content: true,
    no_offensive_language: true,
    not_duplicate: true,
    hunt_related: true
  },
  action: "approved",  // approved, rejected, flagged
  reason: null,
  confidence_score: 0.98
}
```

**Endpoints**:
- `GET /moderation/queue` - Pending moderation
- `POST /moderation/review/:photo_id` - Review photo
- `POST /moderation/report/:photo_id` - Report photo
- `GET /moderation/stats` - Moderation statistics

---

### Capability 7: Photo Analytics 📊

#### Track Photo Engagement
**Purpose**: Measure photo challenge success

**Metrics**:
```javascript
{
  hunt_id: "hunt_denhaag_001",
  metrics: {
    total_photos: 45,
    total_uploads: 48,
    photos_per_team: 3.75,
    photos_per_venue: 7.5,
    verification_rate: 0.94,
    social_shares: 28,
    share_rate: 0.62,
    average_file_size: 1800000,
    bonus_points_awarded: 1200,
    top_venues: [
      { venue_id: "bella_napoli", photos: 12 },
      { venue_id: "golden_dragon", photos: 8 }
    ],
    most_active_team: "team_alpha",
    peak_upload_time: "15:00-16:00"
  }
}
```

**Endpoints**:
- `GET /analytics/:hunt_id` - Hunt photo analytics
- `GET /analytics/venue/:venue_id` - Venue photo analytics
- `GET /analytics/team/:team_id` - Team photo analytics

---

## Integration Points

### With Stats Aggregator (Port 9003):
- Award bonus points for photo uploads (+25 pts)
- Award bonus points for social shares (+25 pts)
- Award bonus points for challenge completions (+50 pts)
- Update team statistics

### With Notification Service (Port 9005):
- Notify team: "Photo uploaded successfully! +25 points"
- Notify team: "Your photo has been featured!"
- Notify team: "Photo challenge completed! +50 points"
- Notify venue: "New photo uploaded at your venue"

### With Venue Management (Port 9006):
- Query venue information
- Link photos to venue check-ins
- Venue-specific photo challenges

### With Reward Agent (Port 9004):
- Photo-based achievements:
  - 📸 "Photographer" - Upload 5 photos
  - 🌟 "Instagram Star" - Share 3 photos on social
  - 🎯 "Challenge Master" - Complete all photo challenges

---

## Storage Strategy

### File Storage
**Options**:
1. **Local Storage** (Development):
   - Store in `/uploads/photos/{hunt_id}/{team_id}/`
   - Serve via Express static middleware

2. **S3/Cloud Storage** (Production):
   - AWS S3, Google Cloud Storage, or Azure Blob
   - Generate presigned URLs for uploads
   - CDN for fast delivery

### Database (PostgreSQL)
- Photo metadata
- Verification records
- Share records
- Challenge completions

### Cache (Redis)
- Recent uploads (24h TTL)
- Gallery data (1h TTL)
- Photo URLs (24h TTL)

---

## API Endpoints Summary

### Photo Management
1. `POST /upload` - Upload photo
2. `GET /photo/:photo_id` - Get photo
3. `PUT /photo/:photo_id` - Update photo
4. `DELETE /photo/:photo_id` - Delete photo
5. `GET /photos/team/:team_id` - Team photos
6. `GET /photos/venue/:venue_id` - Venue photos

### Verification
7. `POST /verify/:photo_id` - Verify photo
8. `GET /verify/:photo_id` - Verification status

### Social Sharing
9. `POST /share` - Share to social media
10. `GET /shares/team/:team_id` - Team shares
11. `GET /shares/stats/:hunt_id` - Share statistics

### Gallery
12. `GET /gallery/:hunt_id` - Hunt gallery
13. `GET /gallery/team/:team_id` - Team gallery
14. `GET /gallery/venue/:venue_id` - Venue gallery
15. `POST /gallery/:photo_id/feature` - Feature photo

### Challenges
16. `GET /challenges/:hunt_id` - List challenges
17. `POST /challenge/complete` - Complete challenge

### Moderation
18. `GET /moderation/queue` - Moderation queue
19. `POST /moderation/review/:photo_id` - Review photo
20. `POST /moderation/report/:photo_id` - Report photo

### Analytics
21. `GET /analytics/:hunt_id` - Photo analytics

---

## User Flows

### Flow 1: Upload Photo at Venue
```
1. Hunter arrives at Golden Dragon
   ↓
2. Hunter scans venue QR code (check-in)
   ↓
3. App prompts: "Take a photo to earn +25 points!"
   ↓
4. Hunter takes photo of team at restaurant
   ↓
5. Hunter adds caption: "Best dim sum in Den Haag!"
   ↓
6. Photo uploads to Media Agent
   ↓
7. System verifies location + timestamp
   ↓
8. +25 bonus points awarded
   ↓
9. Notification: "Photo uploaded! +25 points"
   ↓
10. Photo appears in hunt gallery
```

### Flow 2: Share to Social Media
```
1. Hunter uploads photo
   ↓
2. App shows: "Share on Instagram for +25 more points?"
   ↓
3. Hunter clicks "Share"
   ↓
4. App generates caption with hashtags
   ↓
5. Hunter posts to Instagram
   ↓
6. System records share
   ↓
7. +25 bonus points awarded
   ↓
8. Notification: "Thanks for sharing! +25 points"
   ↓
9. Share tracked in analytics
```

### Flow 3: Complete Photo Challenge
```
1. Hunter checks photo challenges at Golden Dragon
   ↓
2. Challenge: "Take a selfie with the dragon sign"
   ↓
3. Hunter takes creative selfie
   ↓
4. Uploads photo for challenge
   ↓
5. System verifies it's at correct location
   ↓
6. +50 bonus points awarded (challenge bonus)
   ↓
7. Notification: "Challenge completed! +50 points"
   ↓
8. Challenge marked as complete
   ↓
9. Photo featured in challenge gallery
```

---

## Security Considerations

### File Upload Security
- Validate file types (only images)
- Check file size (max 10MB)
- Scan for malware
- Strip EXIF data (privacy)
- Generate new filenames (prevent injection)

### Content Safety
- Auto-moderation for inappropriate content
- Manual review for flagged photos
- Report mechanism for users
- Admin approval for public gallery

### Privacy
- GDPR compliance
- Photo deletion on request
- Blur faces option (optional)
- Location data anonymization

### API Security
- Rate limiting (10 uploads per minute)
- Team/hunt validation
- JWT authentication
- File access control

---

## Performance Considerations

### Image Optimization
- Auto-resize large images (max 1920x1080)
- Generate thumbnails (300x300)
- Compress JPEG (85% quality)
- WebP format support
- Lazy loading in galleries

### Upload Speed
- Direct upload to cloud storage
- Progress indicators
- Resume failed uploads
- Background processing

### Gallery Performance
- Pagination (20 photos per page)
- CDN delivery
- Image lazy loading
- Thumbnail preloading

---

## Success Metrics

### Engagement
- Photo upload rate: Target 70%+ of teams
- Average photos per team: Target 3+
- Social share rate: Target 50%+
- Challenge completion rate: Target 60%+

### Quality
- Verification success rate: Target 90%+
- Appropriate content rate: Target 95%+
- Featured photo rate: Target 10%+

### Business Value
- Social media reach (impressions)
- Viral coefficient (shares per hunter)
- Venue exposure (photos per venue)
- Repeat participation (photo memories)

---

## Implementation Plan

### Phase 1: Core Upload (MVP)
✅ Photo upload endpoint
✅ File storage (local)
✅ Basic metadata storage
✅ Thumbnail generation
✅ Bonus point award
✅ Integration with Stats Aggregator

### Phase 2: Verification & Gallery
✅ Location verification
✅ Timestamp verification
✅ Hunt gallery endpoint
✅ Team gallery endpoint
✅ Featured photos

### Phase 3: Social & Challenges
✅ Social media sharing
✅ Share tracking
✅ Photo challenges
✅ Challenge completion

### Phase 4: Advanced Features
✅ Moderation system
✅ Analytics dashboard
✅ Cloud storage migration
✅ AI-based verification

---

## Technical Stack

### Dependencies
```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",  // File uploads
  "sharp": "^0.33.0",  // Image processing
  "axios": "^1.6.5",
  "redis": "^4.6.12",
  "uuid": "^9.0.1",
  "mime-types": "^2.1.35"
}
```

### Image Processing
- **sharp**: Resize, compress, thumbnail generation
- **multer**: Handle multipart/form-data uploads
- **mime-types**: Validate image types

### Storage
- **Development**: Local file system
- **Production**: AWS S3 or similar (configurable)

---

## Next Steps

1. ✅ Define capabilities (this document)
2. ⏳ Create agent structure
3. ⏳ Implement photo upload
4. ⏳ Implement verification
5. ⏳ Implement gallery
6. ⏳ Implement social sharing
7. ⏳ Test complete workflow
8. ⏳ Document results

---

**Status**: Ready to build the Media Upload Agent! 📸🎯
