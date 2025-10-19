const AGENT_SECRET = process.env.AGENT_SECRET || 'shared_agent_secret_2025';

/**
 * Middleware to validate agent-to-agent authentication
 * Protects endpoints from unauthorized direct access
 */
function validateAgentAuth(req, res, next) {
  const agentSecret = req.headers['x-agent-secret'];
  const path = req.path;

  // Public endpoints that don't require authentication
  const publicEndpoints = ['/health', '/docs', '/ready', '/live', '/metrics'];

  if (publicEndpoints.includes(path)) {
    return next();
  }

  // Validate agent secret
  if (!agentSecret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Agent authentication required',
      code: 'MISSING_AGENT_SECRET'
    });
  }

  if (agentSecret !== AGENT_SECRET) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid agent authentication',
      code: 'INVALID_AGENT_SECRET'
    });
  }

  // Valid authentication - proceed
  next();
}

/**
 * Helper function to make authenticated requests to other agents
 */
function createAuthenticatedAxios(axios) {
  const authenticatedAxios = axios.create();

  // Add agent secret to all requests
  authenticatedAxios.interceptors.request.use(config => {
    config.headers['X-Agent-Secret'] = AGENT_SECRET;
    return config;
  });

  return authenticatedAxios;
}

module.exports = {
  validateAgentAuth,
  createAuthenticatedAxios,
  AGENT_SECRET
};
