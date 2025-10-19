const Joi = require('joi');

/**
 * Common validation schemas for consistent validation across agents
 */
const schemas = {
  // UUID validation
  uuid: Joi.string().uuid().required(),
  optional_uuid: Joi.string().uuid().optional(),

  // User data
  user_id: Joi.string().uuid().required(),
  email: Joi.string().email().max(255).required(),
  name: Joi.string().min(1).max(255).trim().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),

  // Financial
  amount: Joi.number().positive().max(100000).precision(2).required(),
  currency: Joi.string().valid('EUR', 'USD', 'GBP').default('EUR'),

  // Hunt/Venue IDs
  hunt_id: Joi.string().uuid().required(),
  venue_id: Joi.string().uuid().required(),
  team_id: Joi.string().uuid().required(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sort_by: Joi.string().optional()
  }),

  // Date ranges
  date_range: Joi.object({
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required()
  }),

  // Difficulty levels
  difficulty: Joi.number().integer().min(1).max(5).required(),

  // Status fields
  status: Joi.string().valid('active', 'inactive', 'pending', 'completed', 'cancelled').required()
};

/**
 * Validation middleware factory
 * Creates Express middleware that validates request body against a Joi schema
 *
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} target - What to validate: 'body' (default), 'query', 'params'
 * @returns {Function} Express middleware
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[target];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,      // Collect all errors, not just first
      stripUnknown: true,     // Remove unknown fields
      convert: true           // Type conversion (e.g., string to number)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Request data is invalid',
        errors
      });
    }

    // Store validated data
    req[`validated${target.charAt(0).toUpperCase() + target.slice(1)}`] = value;

    next();
  };
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
function sanitize(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Validate and sanitize email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  schemas,
  validate,
  sanitize,
  isValidEmail,
  Joi // Export Joi for custom schemas
};
