const axios = require('axios');
const { logger } = require('../middleware/security');
const { storeSession, getSession } = require('../middleware/cache');

// Agent configuration
const AGENTS = {
  sav: {
    name: 'Customer Service Agent',
    baseUrl: process.env.AGENT_SAV_URL || 'http://agent-sav:3001',
    endpoints: {
      respond: '/api/customer-service/respond',
      health: '/health'
    },
    timeout: 30000,
    retries: 3,
    capabilities: ['customer_support', 'order_management', 'refunds', 'complaints']
  },
  analyse: {
    name: 'Analysis Agent',
    baseUrl: process.env.AGENT_ANALYSE_URL || 'http://agent-analyse:8001',
    endpoints: {
      analyze: '/analyze',
      health: '/health'
    },
    timeout: 60000,
    retries: 2,
    capabilities: ['data_analysis', 'performance_metrics', 'insights', 'reporting']
  },
  contenu: {
    name: 'Content Creation Agent',
    baseUrl: process.env.AGENT_CONTENU_URL || 'http://agent-contenu:3002',
    endpoints: {
      generate: '/api/content/generate',
      health: '/health'
    },
    timeout: 45000,
    retries: 2,
    capabilities: ['content_creation', 'copywriting', 'seo_optimization', 'translations']
  },
  publicite: {
    name: 'Advertising Agent',
    baseUrl: process.env.AGENT_PUBLICITE_URL || 'http://agent-publicite:3003',
    endpoints: {
      campaign: '/api/advertising/campaign',
      health: '/health'
    },
    timeout: 30000,
    retries: 2,
    capabilities: ['ad_creation', 'campaign_management', 'targeting', 'optimization']
  },
  email: {
    name: 'Email Marketing Agent',
    baseUrl: process.env.AGENT_EMAIL_URL || 'http://agent-email:3004',
    endpoints: {
      send: '/api/email/send',
      campaign: '/api/email/campaign',
      health: '/health'
    },
    timeout: 30000,
    retries: 3,
    capabilities: ['email_campaigns', 'automation', 'segmentation', 'analytics']
  },
  pages: {
    name: 'Page Generator Agent',
    baseUrl: process.env.AGENT_PAGES_URL || 'http://agent-pages:3005',
    endpoints: {
      generate: '/api/pages/generate',
      health: '/health'
    },
    timeout: 60000,
    retries: 2,
    capabilities: ['page_generation', 'landing_pages', 'product_pages', 'optimization']
  }
};

// Agent health status
const agentHealth = {};

// Request queue for load balancing
const requestQueues = {};

// Initialize agent health monitoring
Object.keys(AGENTS).forEach(agentType => {
  agentHealth[agentType] = {
    status: 'unknown',
    lastCheck: null,
    responseTime: null,
    errorCount: 0,
    successCount: 0
  };
  requestQueues[agentType] = [];
});

// Health check function
const checkAgentHealth = async (agentType) => {
  const agent = AGENTS[agentType];
  if (!agent) return false;
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${agent.baseUrl}${agent.endpoints.health}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'CommerceAI-Gateway/1.0'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    agentHealth[agentType] = {
      status: response.status === 200 ? 'healthy' : 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime,
      errorCount: agentHealth[agentType].errorCount,
      successCount: agentHealth[agentType].successCount + 1
    };
    
    logger.info(`Agent ${agentType} health check passed`, {
      responseTime,
      status: response.status
    });
    
    return true;
    
  } catch (error) {
    agentHealth[agentType] = {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      errorCount: agentHealth[agentType].errorCount + 1,
      successCount: agentHealth[agentType].successCount,
      error: error.message
    };
    
    logger.error(`Agent ${agentType} health check failed`, {
      error: error.message,
      responseTime: Date.now() - startTime
    });
    
    return false;
  }
};

// Periodic health checks
const startHealthMonitoring = () => {
  setInterval(async () => {
    const healthPromises = Object.keys(AGENTS).map(agentType => 
      checkAgentHealth(agentType)
    );
    
    await Promise.allSettled(healthPromises);
    
    // Log overall health status
    const healthyAgents = Object.keys(agentHealth).filter(
      agentType => agentHealth[agentType].status === 'healthy'
    ).length;
    
    logger.info('Agent health monitoring completed', {
      totalAgents: Object.keys(AGENTS).length,
      healthyAgents,
      unhealthyAgents: Object.keys(AGENTS).length - healthyAgents
    });
    
  }, 30000); // Check every 30 seconds
};

// Request with retry logic
const makeAgentRequest = async (agentType, endpoint, data, options = {}) => {
  const agent = AGENTS[agentType];
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }
  
  const {
    method = 'POST',
    timeout = agent.timeout,
    retries = agent.retries,
    headers = {}
  } = options;
  
  const url = `${agent.baseUrl}${endpoint}`;
  const requestId = `${agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request session
  await storeSession(requestId, {
    agentType,
    endpoint,
    timestamp: new Date().toISOString(),
    status: 'pending'
  }, 3600); // 1 hour TTL
  
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Making request to ${agentType} agent`, {
        requestId,
        attempt,
        url,
        method
      });
      
      const startTime = Date.now();
      
      const response = await axios({
        method,
        url,
        data,
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Gateway-Version': '1.0.0',
          ...headers
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      // Update success metrics
      agentHealth[agentType].successCount++;
      
      // Update request session
      await storeSession(requestId, {
        agentType,
        endpoint,
        timestamp: new Date().toISOString(),
        status: 'completed',
        responseTime,
        statusCode: response.status
      }, 3600);
      
      logger.info(`Agent request successful`, {
        requestId,
        agentType,
        responseTime,
        statusCode: response.status,
        attempt
      });
      
      return {
        success: true,
        data: response.data,
        requestId,
        responseTime,
        agentType
      };
      
    } catch (error) {
      lastError = error;
      
      // Update error metrics
      agentHealth[agentType].errorCount++;
      
      logger.warn(`Agent request failed`, {
        requestId,
        agentType,
        attempt,
        error: error.message,
        statusCode: error.response?.status
      });
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Update failed request session
  await storeSession(requestId, {
    agentType,
    endpoint,
    timestamp: new Date().toISOString(),
    status: 'failed',
    error: lastError.message,
    statusCode: lastError.response?.status
  }, 3600);
  
  logger.error(`Agent request failed after ${retries} attempts`, {
    requestId,
    agentType,
    error: lastError.message
  });
  
  throw new Error(`Agent ${agentType} request failed: ${lastError.message}`);
};

// Specific agent request methods
const customerServiceRequest = async (message, context = {}) => {
  return makeAgentRequest('sav', '/api/customer-service/respond', {
    message,
    context,
    timestamp: new Date().toISOString()
  });
};

const analysisRequest = async (data, analysisType = 'general') => {
  return makeAgentRequest('analyse', '/analyze', {
    data,
    analysisType,
    timestamp: new Date().toISOString()
  });
};

const contentGenerationRequest = async (prompt, contentType = 'general', options = {}) => {
  return makeAgentRequest('contenu', '/api/content/generate', {
    prompt,
    contentType,
    options,
    timestamp: new Date().toISOString()
  });
};

const advertisingRequest = async (campaignData) => {
  return makeAgentRequest('publicite', '/api/advertising/campaign', {
    ...campaignData,
    timestamp: new Date().toISOString()
  });
};

const emailMarketingRequest = async (emailData, action = 'send') => {
  const endpoint = action === 'campaign' ? '/api/email/campaign' : '/api/email/send';
  return makeAgentRequest('email', endpoint, {
    ...emailData,
    timestamp: new Date().toISOString()
  });
};

const pageGenerationRequest = async (pageData) => {
  return makeAgentRequest('pages', '/api/pages/generate', {
    ...pageData,
    timestamp: new Date().toISOString()
  });
};

// Get agent capabilities
const getAgentCapabilities = (agentType) => {
  const agent = AGENTS[agentType];
  return agent ? agent.capabilities : [];
};

// Get all agents status
const getAllAgentsStatus = () => {
  return Object.keys(AGENTS).map(agentType => ({
    type: agentType,
    name: AGENTS[agentType].name,
    health: agentHealth[agentType],
    capabilities: AGENTS[agentType].capabilities,
    baseUrl: AGENTS[agentType].baseUrl
  }));
};

// Find best agent for capability
const findAgentForCapability = (capability) => {
  const availableAgents = Object.keys(AGENTS).filter(agentType => {
    const agent = AGENTS[agentType];
    const health = agentHealth[agentType];
    return agent.capabilities.includes(capability) && health.status === 'healthy';
  });
  
  if (availableAgents.length === 0) {
    return null;
  }
  
  // Return agent with best performance (lowest error rate)
  return availableAgents.reduce((best, current) => {
    const bestHealth = agentHealth[best];
    const currentHealth = agentHealth[current];
    
    const bestErrorRate = bestHealth.errorCount / (bestHealth.errorCount + bestHealth.successCount) || 0;
    const currentErrorRate = currentHealth.errorCount / (currentHealth.errorCount + currentHealth.successCount) || 0;
    
    return currentErrorRate < bestErrorRate ? current : best;
  });
};

// Start health monitoring
startHealthMonitoring();

module.exports = {
  AGENTS,
  agentHealth,
  checkAgentHealth,
  makeAgentRequest,
  customerServiceRequest,
  analysisRequest,
  contentGenerationRequest,
  advertisingRequest,
  emailMarketingRequest,
  pageGenerationRequest,
  getAgentCapabilities,
  getAllAgentsStatus,
  findAgentForCapability
};