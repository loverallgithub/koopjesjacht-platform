const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://scavenger_user:scavenger_pass@localhost:5432/scavenger_hunt';
const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Critical audit event types
 * These events must be logged for security, compliance, and debugging
 */
const AUDIT_EVENTS = {
  // Authentication
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',

  // Payments
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REFUNDED: 'payment_refunded',

  // User management
  USER_BANNED: 'user_banned',
  USER_UNBANNED: 'user_unbanned',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',

  // Venue management
  VENUE_CREATED: 'venue_created',
  VENUE_APPROVED: 'venue_approved',
  VENUE_REJECTED: 'venue_rejected',
  VENUE_SUSPENDED: 'venue_suspended',
  VENUE_DELETED: 'venue_deleted',

  // Security
  FRAUD_FLAG: 'fraud_flag',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',

  // Data & Privacy
  DATA_EXPORT: 'data_export',
  DATA_DELETION_REQUEST: 'data_deletion_request',
  GDPR_REQUEST: 'gdpr_request',

  // Admin actions
  ADMIN_ACTION: 'admin_action',
  CONFIG_CHANGED: 'config_changed',
  SYSTEM_OVERRIDE: 'system_override'
};

/**
 * Log an audit event to the database
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.event_type - Type of event (use AUDIT_EVENTS constants)
 * @param {string} params.user_id - User who performed the action
 * @param {string} params.target_id - ID of the affected entity (optional)
 * @param {string} params.action - Human-readable description of the action
 * @param {Object} params.details - Additional context (will be stored as JSONB)
 * @param {string} params.ip_address - IP address of the requester
 * @param {string} params.user_agent - User agent string
 * @param {string} params.result - 'success' or 'failure'
 * @returns {Promise<string>} - Audit log ID
 */
async function auditLog({
  event_type,
  user_id = null,
  target_id = null,
  action,
  details = {},
  ip_address = null,
  user_agent = null,
  result = 'success'
}) {
  try {
    // Validate event type
    if (!Object.values(AUDIT_EVENTS).includes(event_type)) {
      console.warn(`Unknown audit event type: ${event_type}`);
    }

    const query = `
      INSERT INTO audit_logs (
        event_type, user_id, target_id, action,
        details, ip_address, user_agent, result, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `;

    const values = [
      event_type,
      user_id,
      target_id,
      action,
      JSON.stringify(details),
      ip_address,
      user_agent,
      result
    ];

    const queryResult = await pool.query(query, values);
    return queryResult.rows[0].id;
  } catch (error) {
    console.error('Audit log error:', error.message);
    // Don't throw - audit failures shouldn't break the app
    // But log to console for monitoring
    return null;
  }
}

/**
 * Express middleware to automatically log audit events
 * Extracts IP and user agent from request
 *
 * @param {string} event_type - Event type constant
 * @param {Function} getDetails - Function that takes (req, res) and returns audit details
 * @returns {Function} Express middleware
 */
function auditMiddleware(event_type, getDetails) {
  return async (req, res, next) => {
    const originalSend = res.json.bind(res);

    res.json = function(data) {
      // Log after response (so we know success/failure)
      const result = res.statusCode < 400 ? 'success' : 'failure';

      const details = typeof getDetails === 'function' ? getDetails(req, res, data) : {};

      auditLog({
        event_type,
        user_id: req.user?.user_id || req.body?.user_id,
        target_id: data?.id || req.params?.id,
        action: `${req.method} ${req.path}`,
        details,
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        result
      }).catch(err => console.error('Audit middleware error:', err));

      return originalSend(data);
    };

    next();
  };
}

/**
 * Query audit logs (for compliance reports, investigations)
 *
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} - Audit log entries
 */
async function queryAuditLogs({
  event_type = null,
  user_id = null,
  target_id = null,
  start_date = null,
  end_date = null,
  result = null,
  limit = 100,
  offset = 0
}) {
  try {
    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (event_type) {
      paramCount++;
      conditions.push(`event_type = $${paramCount}`);
      values.push(event_type);
    }

    if (user_id) {
      paramCount++;
      conditions.push(`user_id = $${paramCount}`);
      values.push(user_id);
    }

    if (target_id) {
      paramCount++;
      conditions.push(`target_id = $${paramCount}`);
      values.push(target_id);
    }

    if (start_date) {
      paramCount++;
      conditions.push(`created_at >= $${paramCount}`);
      values.push(start_date);
    }

    if (end_date) {
      paramCount++;
      conditions.push(`created_at <= $${paramCount}`);
      values.push(end_date);
    }

    if (result) {
      paramCount++;
      conditions.push(`result = $${paramCount}`);
      values.push(result);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    paramCount++;
    values.push(limit);
    paramCount++;
    values.push(offset);

    const query = `
      SELECT
        id, event_type, user_id, target_id, action,
        details, ip_address, user_agent, result, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const queryResult = await pool.query(query, values);
    return queryResult.rows;
  } catch (error) {
    console.error('Query audit logs error:', error);
    throw error;
  }
}

/**
 * Get audit statistics (for compliance dashboards)
 *
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} - Statistics
 */
async function getAuditStats(days = 30) {
  try {
    const query = `
      SELECT
        event_type,
        COUNT(*) as total,
        COUNT(CASE WHEN result = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN result = 'failure' THEN 1 END) as failure_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY event_type
      ORDER BY total DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Get audit stats error:', error);
    throw error;
  }
}

module.exports = {
  auditLog,
  auditMiddleware,
  queryAuditLogs,
  getAuditStats,
  AUDIT_EVENTS
};
