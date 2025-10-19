const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.AGENT_PORT || 9006;

app.use(express.json());

// Agent URLs
const REWARD_AGENT_URL = process.env.REWARD_AGENT_URL || 'http://payment-agent:9004';
const STATS_AGGREGATOR_URL = process.env.STATS_AGGREGATOR_URL || 'http://stats-agent:9003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-agent:9005';

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
// REWARD TEMPLATES
// ============================================
const REWARD_TEMPLATES = {
  percentage_discount: {
    name: "Percentage Discount",
    description: "Offer X% off the bill",
    fields: ["discount_percentage", "description", "terms"]
  },
  fixed_discount: {
    name: "Fixed Amount Discount",
    description: "Offer €X off the bill",
    fields: ["discount_amount", "description", "terms"]
  },
  freebie: {
    name: "Free Item",
    description: "Offer a free item with purchase",
    fields: ["item_name", "description", "terms"]
  },
  bogo: {
    name: "Buy One Get One",
    description: "Buy one item, get one free",
    fields: ["item_name", "description", "terms"]
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Hash PIN code for security
 */
async function hashPin(pin) {
  return await bcrypt.hash(pin, 10);
}

/**
 * Verify PIN code
 */
async function verifyPin(pin, hash) {
  return await bcrypt.compare(pin, hash);
}

/**
 * Store venue data
 */
async function storeVenue(venue) {
  const key = `venue:${venue.venue_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(venue)); // 30 day TTL

  // Add to owner's venue list
  await redisClient.sAdd(`owner:${venue.owner_id}:venues`, venue.venue_id);

  // Add to global venue list
  await redisClient.sAdd('venues:all', venue.venue_id);
}

/**
 * Get venue data
 */
async function getVenue(venue_id) {
  const key = `venue:${venue_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store employee data
 */
async function storeEmployee(employee) {
  const key = `employee:${employee.employee_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(employee)); // 30 day TTL

  // Add to venue's employee list
  await redisClient.sAdd(`venue:${employee.venue_id}:employees`, employee.employee_id);
}

/**
 * Get employee data
 */
async function getEmployee(employee_id) {
  const key = `employee:${employee_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store check-in record
 */
async function storeCheckin(checkin) {
  const key = `checkin:${checkin.checkin_id}`;
  await redisClient.setEx(key, 86400, JSON.stringify(checkin)); // 24 hour TTL

  // Add to venue's check-in list
  await redisClient.sAdd(`venue:${checkin.venue_id}:checkins`, checkin.checkin_id);

  // Add to today's check-ins
  const today = new Date().toISOString().split('T')[0];
  await redisClient.sAdd(`venue:${checkin.venue_id}:checkins:${today}`, checkin.checkin_id);
}

/**
 * Get check-in record
 */
async function getCheckin(checkin_id) {
  const key = `checkin:${checkin_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store reward configuration
 */
async function storeRewardConfig(config) {
  const key = `reward_config:${config.reward_config_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(config)); // 30 day TTL

  // Add to venue's config list
  await redisClient.sAdd(`venue:${config.venue_id}:reward_configs`, config.reward_config_id);
}

/**
 * Get reward configuration
 */
async function getRewardConfig(config_id) {
  const key = `reward_config:${config_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Store item
 */
async function storeItem(item) {
  const key = `item:${item.item_id}`;
  await redisClient.setEx(key, 2592000, JSON.stringify(item)); // 30 day TTL

  // Add to venue's item list
  await redisClient.sAdd(`venue:${item.venue_id}:items`, item.item_id);
}

/**
 * Get item
 */
async function getItem(item_id) {
  const key = `item:${item_id}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'VenueManagementAgent',
    version: '1.0.0',
    features: [
      'Venue registration',
      'Reward configuration',
      'Employee management',
      'Hunter check-in',
      'Reward redemption',
      'Item management',
      'Analytics dashboard'
    ]
  });
});

// ============================================
// CAPABILITY 1: VENUE REGISTRATION
// ============================================

/**
 * Register new venue
 */
app.post('/venue/register', async (req, res) => {
  try {
    const {
      owner_id,
      venue_name,
      business_type,
      cuisine_type,
      address,
      contact,
      business_hours
    } = req.body;

    if (!owner_id || !venue_name || !contact || !contact.email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['owner_id', 'venue_name', 'contact.email']
      });
    }

    const venue = {
      venue_id: uuidv4(),
      owner_id,
      venue_name,
      business_type: business_type || 'restaurant',
      cuisine_type: cuisine_type || 'general',
      address: address || {},
      contact,
      business_hours: business_hours || {},
      registration_date: new Date().toISOString(),
      status: 'active',
      verification_status: 'pending'
    };

    await storeVenue(venue);

    res.json({
      success: true,
      message: 'Venue registered successfully',
      venue: {
        venue_id: venue.venue_id,
        venue_name: venue.venue_name,
        status: venue.status,
        verification_status: venue.verification_status
      }
    });

  } catch (error) {
    console.error('Error registering venue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get venue details
 */
app.get('/venue/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const venue = await getVenue(venue_id);

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json({
      success: true,
      venue
    });

  } catch (error) {
    console.error('Error getting venue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update venue details
 */
app.put('/venue/:venue_id', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const updates = req.body;

    const venue = await getVenue(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Update allowed fields
    const allowedFields = ['venue_name', 'business_type', 'cuisine_type', 'address', 'contact', 'business_hours', 'status'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        venue[field] = updates[field];
      }
    });

    venue.updated_at = new Date().toISOString();
    await storeVenue(venue);

    res.json({
      success: true,
      message: 'Venue updated successfully',
      venue
    });

  } catch (error) {
    console.error('Error updating venue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get venues by owner
 */
app.get('/venue/owner/:owner_id', async (req, res) => {
  try {
    const { owner_id } = req.params;

    const venueIds = await redisClient.sMembers(`owner:${owner_id}:venues`);
    const venues = [];

    for (const venue_id of venueIds) {
      const venue = await getVenue(venue_id);
      if (venue) {
        venues.push(venue);
      }
    }

    res.json({
      success: true,
      owner_id,
      venues,
      total: venues.length
    });

  } catch (error) {
    console.error('Error getting owner venues:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 2: REWARD CONFIGURATION
// ============================================

/**
 * Configure venue reward
 */
app.post('/venue/:venue_id/rewards/configure', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const {
      hunt_id,
      reward_type,
      discount_percentage,
      discount_amount,
      item_name,
      description,
      terms,
      valid_days,
      max_redemptions_per_hunt
    } = req.body;

    // Verify venue exists
    const venue = await getVenue(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    if (!reward_type || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['reward_type', 'description']
      });
    }

    const config = {
      reward_config_id: uuidv4(),
      venue_id,
      hunt_id: hunt_id || 'all_hunts',
      reward_type,
      discount_percentage: discount_percentage || null,
      discount_amount: discount_amount || null,
      item_name: item_name || null,
      description,
      terms: terms || '',
      valid_days: valid_days || 30,
      max_redemptions_per_hunt: max_redemptions_per_hunt || 100,
      redemptions_used: 0,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await storeRewardConfig(config);

    res.json({
      success: true,
      message: 'Reward configuration created',
      config
    });

  } catch (error) {
    console.error('Error configuring reward:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get venue reward configurations
 */
app.get('/venue/:venue_id/rewards/config', async (req, res) => {
  try {
    const { venue_id } = req.params;

    const configIds = await redisClient.sMembers(`venue:${venue_id}:reward_configs`);
    const configs = [];

    for (const config_id of configIds) {
      const config = await getRewardConfig(config_id);
      if (config && config.active) {
        configs.push(config);
      }
    }

    res.json({
      success: true,
      venue_id,
      configs,
      total: configs.length
    });

  } catch (error) {
    console.error('Error getting reward configs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get reward templates
 */
app.get('/venue/rewards/templates', (req, res) => {
  res.json({
    success: true,
    templates: REWARD_TEMPLATES
  });
});

// ============================================
// CAPABILITY 3: EMPLOYEE MANAGEMENT
// ============================================

/**
 * Add employee
 */
app.post('/venue/:venue_id/employees', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const {
      employee_name,
      email,
      phone,
      role,
      pin_code,
      permissions
    } = req.body;

    // Verify venue exists
    const venue = await getVenue(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    if (!employee_name || !email || !pin_code) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['employee_name', 'email', 'pin_code']
      });
    }

    // Hash PIN for security
    const hashedPin = await hashPin(pin_code);

    const employee = {
      employee_id: uuidv4(),
      venue_id,
      employee_name,
      email,
      phone: phone || null,
      role: role || 'staff',
      pin_code_hash: hashedPin,
      permissions: permissions || {
        check_in_hunters: true,
        validate_rewards: true,
        view_analytics: false,
        manage_rewards: false
      },
      status: 'active',
      created_at: new Date().toISOString(),
      last_login: null
    };

    await storeEmployee(employee);

    // Don't return hashed PIN
    const { pin_code_hash, ...employeeResponse } = employee;

    res.json({
      success: true,
      message: 'Employee added successfully',
      employee: employeeResponse
    });

  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List venue employees
 */
app.get('/venue/:venue_id/employees', async (req, res) => {
  try {
    const { venue_id } = req.params;

    const employeeIds = await redisClient.sMembers(`venue:${venue_id}:employees`);
    const employees = [];

    for (const employee_id of employeeIds) {
      const employee = await getEmployee(employee_id);
      if (employee && employee.status === 'active') {
        // Don't return hashed PIN
        const { pin_code_hash, ...employeeData } = employee;
        employees.push(employeeData);
      }
    }

    res.json({
      success: true,
      venue_id,
      employees,
      total: employees.length
    });

  } catch (error) {
    console.error('Error listing employees:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Employee login with PIN
 */
app.post('/venue/:venue_id/employees/login', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { email, pin_code } = req.body;

    if (!email || !pin_code) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'pin_code']
      });
    }

    // Find employee by email
    const employeeIds = await redisClient.sMembers(`venue:${venue_id}:employees`);
    let foundEmployee = null;

    for (const employee_id of employeeIds) {
      const employee = await getEmployee(employee_id);
      if (employee && employee.email === email) {
        foundEmployee = employee;
        break;
      }
    }

    if (!foundEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (foundEmployee.status !== 'active') {
      return res.status(403).json({ error: 'Employee account is suspended' });
    }

    // Verify PIN
    const pinValid = await verifyPin(pin_code, foundEmployee.pin_code_hash);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid PIN code' });
    }

    // Update last login
    foundEmployee.last_login = new Date().toISOString();
    await storeEmployee(foundEmployee);

    // Don't return hashed PIN
    const { pin_code_hash, ...employeeResponse } = foundEmployee;

    res.json({
      success: true,
      message: 'Login successful',
      employee: employeeResponse
    });

  } catch (error) {
    console.error('Error during employee login:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 4: HUNTER CHECK-IN
// ============================================

/**
 * Check in hunter
 */
app.post('/venue/:venue_id/checkin', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const {
      team_id,
      hunt_id,
      checked_in_by,
      party_size,
      notes
    } = req.body;

    if (!team_id || !hunt_id || !checked_in_by) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['team_id', 'hunt_id', 'checked_in_by']
      });
    }

    // Verify venue exists
    const venue = await getVenue(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Verify employee exists
    const employee = await getEmployee(checked_in_by);
    if (!employee || employee.venue_id !== venue_id) {
      return res.status(403).json({ error: 'Employee not authorized for this venue' });
    }

    // Create check-in record
    const checkin = {
      checkin_id: uuidv4(),
      venue_id,
      team_id,
      hunt_id,
      checked_in_by,
      checkin_time: new Date().toISOString(),
      party_size: party_size || 1,
      notes: notes || '',
      status: 'checked_in'
    };

    await storeCheckin(checkin);

    // Get available rewards for this venue
    const configIds = await redisClient.sMembers(`venue:${venue_id}:reward_configs`);
    const availableRewards = [];

    for (const config_id of configIds) {
      const config = await getRewardConfig(config_id);
      if (config && config.active && (config.hunt_id === hunt_id || config.hunt_id === 'all_hunts')) {
        availableRewards.push({
          reward_type: config.reward_type,
          description: config.description
        });
      }
    }

    res.json({
      success: true,
      message: 'Hunter checked in successfully',
      checkin,
      available_rewards: availableRewards
    });

  } catch (error) {
    console.error('Error checking in hunter:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get today's check-ins
 */
app.get('/venue/:venue_id/checkins', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { date } = req.query;

    const today = date || new Date().toISOString().split('T')[0];
    const checkinIds = await redisClient.sMembers(`venue:${venue_id}:checkins:${today}`);

    const checkins = [];
    for (const checkin_id of checkinIds) {
      const checkin = await getCheckin(checkin_id);
      if (checkin) {
        checkins.push(checkin);
      }
    }

    res.json({
      success: true,
      venue_id,
      date: today,
      checkins,
      total: checkins.length
    });

  } catch (error) {
    console.error('Error getting check-ins:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 5: REWARD REDEMPTION (VENUE SIDE)
// ============================================

/**
 * Validate reward code
 */
app.post('/venue/:venue_id/rewards/validate', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { reward_code } = req.body;

    if (!reward_code) {
      return res.status(400).json({ error: 'Missing reward_code' });
    }

    // Call Reward Agent to validate
    const response = await axios.get(`${REWARD_AGENT_URL}/rewards/verify/${reward_code}`);

    if (!response.data.valid) {
      return res.json({
        success: false,
        valid: false,
        error: response.data.error || 'Invalid reward code'
      });
    }

    const reward = response.data.reward;

    // Verify reward belongs to this venue
    // Extract venue code from reward code (format: HUNT-VE-TEAM-XXXX)
    const parts = reward_code.split('-');
    if (parts.length >= 2) {
      const venueCode = parts[1];
      const venue = await getVenue(venue_id);
      if (venue && !venue.venue_name.toLowerCase().includes(venueCode.toLowerCase())) {
        // Additional check: venue_id should match
        // For now, we'll allow if venue exists
      }
    }

    res.json({
      success: true,
      valid: true,
      reward
    });

  } catch (error) {
    console.error('Error validating reward:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Redeem reward
 */
app.post('/venue/:venue_id/rewards/redeem', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { reward_code, employee_id } = req.body;

    if (!reward_code || !employee_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['reward_code', 'employee_id']
      });
    }

    // Verify employee
    const employee = await getEmployee(employee_id);
    if (!employee || employee.venue_id !== venue_id) {
      return res.status(403).json({ error: 'Employee not authorized for this venue' });
    }

    if (!employee.permissions.validate_rewards) {
      return res.status(403).json({ error: 'Employee does not have permission to validate rewards' });
    }

    // Call Reward Agent to redeem
    const response = await axios.post(`${REWARD_AGENT_URL}/rewards/redeem`, {
      reward_code,
      venue_id
    });

    if (!response.data.success) {
      return res.json({
        success: false,
        error: response.data.error
      });
    }

    res.json({
      success: true,
      message: 'Reward redeemed successfully',
      reward: response.data.reward,
      redeemed_by: employee.employee_name
    });

  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 6: ITEM MANAGEMENT
// ============================================

/**
 * Add venue item
 */
app.post('/venue/:venue_id/items', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const {
      item_type,
      item_name,
      description,
      category,
      price,
      hunter_only,
      requires_checkin,
      image_url
    } = req.body;

    if (!item_name || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['item_name', 'description']
      });
    }

    const item = {
      item_id: uuidv4(),
      venue_id,
      item_type: item_type || 'menu_item',
      item_name,
      description,
      category: category || 'food',
      price: price || 0,
      hunter_only: hunter_only || false,
      requires_checkin: requires_checkin || false,
      image_url: image_url || null,
      available: true,
      created_at: new Date().toISOString()
    };

    await storeItem(item);

    res.json({
      success: true,
      message: 'Item added successfully',
      item
    });

  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List venue items
 */
app.get('/venue/:venue_id/items', async (req, res) => {
  try {
    const { venue_id } = req.params;

    const itemIds = await redisClient.sMembers(`venue:${venue_id}:items`);
    const items = [];

    for (const item_id of itemIds) {
      const item = await getItem(item_id);
      if (item && item.available) {
        items.push(item);
      }
    }

    res.json({
      success: true,
      venue_id,
      items,
      total: items.length
    });

  } catch (error) {
    console.error('Error listing items:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAPABILITY 7: ANALYTICS
// ============================================

/**
 * Get venue analytics
 */
app.get('/venue/:venue_id/analytics', async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { hunt_id, date } = req.query;

    const venue = await getVenue(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Get check-ins
    const today = date || new Date().toISOString().split('T')[0];
    const checkinIds = await redisClient.sMembers(`venue:${venue_id}:checkins:${today}`);

    let totalCheckins = checkinIds.length;
    let uniqueTeams = new Set();
    let totalHunters = 0;

    for (const checkin_id of checkinIds) {
      const checkin = await getCheckin(checkin_id);
      if (checkin) {
        uniqueTeams.add(checkin.team_id);
        totalHunters += checkin.party_size;
      }
    }

    // Mock analytics (in production, would aggregate from reward redemptions)
    const analytics = {
      venue_id,
      venue_name: venue.venue_name,
      hunt_id: hunt_id || 'all',
      period: date || 'today',
      metrics: {
        total_checkins: totalCheckins,
        unique_teams: uniqueTeams.size,
        total_hunters: totalHunters,
        average_party_size: totalCheckins > 0 ? (totalHunters / totalCheckins).toFixed(1) : 0,
        // Mock data for demo
        rewards_issued: Math.floor(totalCheckins * 0.95),
        rewards_redeemed: Math.floor(totalCheckins * 0.65),
        redemption_rate: '65%',
        estimated_revenue: totalHunters * 20,
        discount_value: totalHunters * 2,
        net_revenue: totalHunters * 18
      },
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      analytics
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
  console.log(`✅ Venue Management Agent v1.0 listening on port ${port}`);
  console.log(`🏪 Features:`);
  console.log(`   - Venue registration`);
  console.log(`   - Reward configuration`);
  console.log(`   - Employee management`);
  console.log(`   - Hunter check-in`);
  console.log(`   - Reward redemption`);
  console.log(`   - Item management`);
  console.log(`   - Analytics dashboard`);
  console.log(`📍 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /venue/register - Register venue`);
  console.log(`   GET  /venue/:venue_id - Get venue details`);
  console.log(`   POST /venue/:venue_id/rewards/configure - Configure rewards`);
  console.log(`   GET  /venue/:venue_id/rewards/config - Get reward configs`);
  console.log(`   POST /venue/:venue_id/employees - Add employee`);
  console.log(`   GET  /venue/:venue_id/employees - List employees`);
  console.log(`   POST /venue/:venue_id/employees/login - Employee login`);
  console.log(`   POST /venue/:venue_id/checkin - Check in hunter`);
  console.log(`   GET  /venue/:venue_id/checkins - Get check-ins`);
  console.log(`   POST /venue/:venue_id/rewards/validate - Validate reward`);
  console.log(`   POST /venue/:venue_id/rewards/redeem - Redeem reward`);
  console.log(`   POST /venue/:venue_id/items - Add item`);
  console.log(`   GET  /venue/:venue_id/items - List items`);
  console.log(`   GET  /venue/:venue_id/analytics - Get analytics`);
});

module.exports = app;
