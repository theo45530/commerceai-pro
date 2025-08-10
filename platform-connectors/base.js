/**
 * Base Connector Class
 * Provides common functionality for all platform connectors
 */

class BaseConnector {
  constructor(config) {
    this.config = config;
    this.isAuthenticated = false;
    this.rateLimits = {};
    this.lastApiCall = null;
  }

  /**
   * Authenticate with the platform
   * Must be implemented by each connector
   */
  async authenticate() {
    throw new Error('Method authenticate() must be implemented by subclass');
  }

  /**
   * Ensure the connector is authenticated before making API calls
   */
  ensureAuthenticated() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }

  /**
   * Handle API errors in a standardized way
   * @param {Error} error - The error object from the API call
   */
  handleApiError(error) {
    // Check for rate limiting
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
    }

    // Check for authentication errors
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      this.isAuthenticated = false;
      throw new Error(`Authentication error: ${error.message}`);
    }

    // Handle other errors
    throw new Error(`API error: ${error.message}`);
  }

  /**
   * Apply rate limiting before making API calls
   * @param {string} endpoint - The API endpoint being called
   */
  async applyRateLimit(endpoint) {
    const now = Date.now();
    const limit = this.rateLimits[endpoint] || { calls: 0, resetTime: now + 60000 };

    if (now > limit.resetTime) {
      // Reset the counter if the time window has passed
      limit.calls = 0;
      limit.resetTime = now + 60000;
    } else if (limit.calls >= (this.config.maxCallsPerMinute || 60)) {
      // Wait until the rate limit resets
      const waitTime = limit.resetTime - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      limit.calls = 0;
      limit.resetTime = Date.now() + 60000;
    }

    // Increment the call counter
    limit.calls++;
    this.rateLimits[endpoint] = limit;
    this.lastApiCall = now;
  }

  /**
   * Log API activity for monitoring
   * @param {string} action - The action being performed
   * @param {string} endpoint - The API endpoint
   * @param {object} data - The data being sent or received
   */
  logApiActivity(action, endpoint, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${this.constructor.name} - ${action} - ${endpoint}`);
    
    // In a production environment, you would want to send this to a logging service
    // rather than just console.log
  }
}

module.exports = BaseConnector;