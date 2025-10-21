const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 9009;

// Middleware
app.use(cors());
app.use(express.json());

// Cache configuration (10 minute TTL for geocoding results)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Nominatim API configuration (free geocoding service)
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'KoopjesJacht/1.0';

// In-memory location storage (replace with database in production)
const locationDatabase = new Map();
const verificationHistory = new Map();

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Helper: Geocode address using Nominatim
async function geocodeAddress(address) {
  const cacheKey = `geocode:${address}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1
      },
      headers: {
        'User-Agent': USER_AGENT
      }
    });

    if (response.data && response.data.length > 0) {
      const result = {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        display_name: response.data[0].display_name,
        address: response.data[0].address
      };
      cache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('[Geocoding Error]:', error.message);
    return null;
  }
}

// Helper: Reverse geocode coordinates
async function reverseGeocode(latitude, longitude) {
  const cacheKey = `reverse:${latitude},${longitude}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': USER_AGENT
      }
    });

    if (response.data) {
      const result = {
        display_name: response.data.display_name,
        address: response.data.address
      };
      cache.set(cacheKey, result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('[Reverse Geocoding Error]:', error.message);
    return null;
  }
}

// Helper: Optimize route using nearest neighbor algorithm (simplified TSP)
function optimizeRoute(startLocation, destinations) {
  if (!destinations || destinations.length === 0) return [];
  if (destinations.length === 1) return destinations;

  const route = [];
  let current = startLocation;
  const remaining = [...destinations];

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let shortestDistance = Infinity;

    remaining.forEach((dest, index) => {
      const distance = calculateDistance(
        current.latitude,
        current.longitude,
        dest.latitude,
        dest.longitude
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestIndex = index;
      }
    });

    const nearest = remaining.splice(nearestIndex, 1)[0];
    route.push({
      ...nearest,
      distance_from_previous: shortestDistance,
      order: route.length + 1
    });
    current = nearest;
  }

  return route;
}

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'geolocation',
    timestamp: new Date().toISOString(),
    cache_stats: cache.getStats()
  });
});

// Geocode address to coordinates
app.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    const result = await geocodeAddress(address);

    if (!result) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reverse geocode coordinates to address
app.post('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const result = await reverseGeocode(latitude, longitude);

    if (!result) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({
      success: true,
      data: {
        latitude,
        longitude,
        ...result
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate distance between two points
app.post('/distance', (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      return res.status(400).json({ error: 'latitude and longitude required for both points' });
    }

    const distance = calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    res.json({
      success: true,
      data: {
        distance_km: distance,
        distance_meters: distance * 1000,
        distance_miles: distance * 0.621371,
        origin,
        destination
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify user proximity to a location
app.post('/verify-proximity', (req, res) => {
  try {
    const {
      user_location,
      target_location,
      radius_meters = 100,
      team_id,
      shop_id
    } = req.body;

    if (!user_location || !target_location) {
      return res.status(400).json({ error: 'user_location and target_location are required' });
    }

    const distance = calculateDistance(
      user_location.latitude,
      user_location.longitude,
      target_location.latitude,
      target_location.longitude
    );

    const distanceMeters = distance * 1000;
    const isWithinRadius = distanceMeters <= radius_meters;

    // Record verification
    const verification_id = uuidv4();
    const verification = {
      verification_id,
      team_id,
      shop_id,
      user_location,
      target_location,
      distance_meters: distanceMeters,
      radius_meters,
      is_within_radius: isWithinRadius,
      verified_at: new Date().toISOString()
    };

    verificationHistory.set(verification_id, verification);

    res.json({
      success: true,
      data: {
        verification_id,
        is_within_radius: isWithinRadius,
        distance_meters: distanceMeters,
        radius_meters,
        distance_from_target: `${distanceMeters.toFixed(2)}m`,
        message: isWithinRadius
          ? 'User is within required proximity'
          : `User is ${(distanceMeters - radius_meters).toFixed(2)}m too far`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optimize route for multiple destinations
app.post('/optimize-route', (req, res) => {
  try {
    const { start_location, destinations } = req.body;

    if (!start_location || !destinations) {
      return res.status(400).json({ error: 'start_location and destinations are required' });
    }

    if (!Array.isArray(destinations)) {
      return res.status(400).json({ error: 'destinations must be an array' });
    }

    const optimizedRoute = optimizeRoute(start_location, destinations);

    // Calculate total distance
    let totalDistance = 0;
    if (optimizedRoute.length > 0) {
      totalDistance = calculateDistance(
        start_location.latitude,
        start_location.longitude,
        optimizedRoute[0].latitude,
        optimizedRoute[0].longitude
      );
      optimizedRoute.forEach(stop => {
        totalDistance += stop.distance_from_previous;
      });
    }

    res.json({
      success: true,
      data: {
        start_location,
        optimized_route: optimizedRoute,
        total_stops: optimizedRoute.length,
        total_distance_km: totalDistance,
        total_distance_miles: totalDistance * 0.621371,
        estimated_time_minutes: Math.ceil(totalDistance * 12) // Assume 5 km/h walking speed
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find nearby locations
app.get('/nearby/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const { radius_km = 1, type } = req.query;

    // Parse location (format: "lat,lon")
    const [lat, lon] = location.split(',').map(parseFloat);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid location format. Use: lat,lon' });
    }

    // Find nearby locations from database
    const nearby = [];
    for (const [location_id, loc] of locationDatabase.entries()) {
      if (type && loc.type !== type) continue;

      const distance = calculateDistance(lat, lon, loc.latitude, loc.longitude);
      if (distance <= radius_km) {
        nearby.push({
          location_id,
          ...loc,
          distance_km: distance,
          distance_meters: distance * 1000
        });
      }
    }

    // Sort by distance
    nearby.sort((a, b) => a.distance_km - b.distance_km);

    res.json({
      success: true,
      search_location: { latitude: lat, longitude: lon },
      radius_km,
      total_found: nearby.length,
      data: nearby
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Store a location (for testing/admin)
app.post('/locations', (req, res) => {
  try {
    const { name, latitude, longitude, type, metadata } = req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({ error: 'name, latitude, and longitude are required' });
    }

    const location_id = uuidv4();
    const location = {
      location_id,
      name,
      latitude,
      longitude,
      type: type || 'unknown',
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    locationDatabase.set(location_id, location);

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get verification history
app.get('/verifications/:team_id', (req, res) => {
  try {
    const { team_id } = req.params;
    const verifications = [];

    for (const [verification_id, verification] of verificationHistory.entries()) {
      if (verification.team_id === team_id) {
        verifications.push(verification);
      }
    }

    res.json({
      success: true,
      team_id,
      total_verifications: verifications.length,
      data: verifications.sort((a, b) =>
        new Date(b.verified_at) - new Date(a.verified_at)
      )
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('[Geolocation Agent Error]:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    status: error.status || 500
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌍 Geolocation Agent running on port ${PORT}`);
  console.log(`📍 Geocoding: Nominatim OpenStreetMap`);
  console.log(`💾 Cache: ${cache.getStats().keys} entries`);
});
