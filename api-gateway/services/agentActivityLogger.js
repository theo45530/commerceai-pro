const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../middleware/security');
const { broadcastToChannel } = require('./realtimeManager');
const { storeSession, getSession } = require('../middleware/cache');
const EventEmitter = require('events');

// Agent activity logger emitter
class AgentActivityEmitter extends EventEmitter {}
const agentActivityEmitter = new AgentActivityEmitter();

// Activity types
const ACTIVITY_TYPES = {
  DECISION: 'decision',
  ACTION: 'action',
  OPTIMIZATION: 'optimization',
  CREATION: 'creation',
  ANALYSIS: 'analysis',
  COMMUNICATION: 'communication',
  ERROR: 'error',
  PERFORMANCE: 'performance'
};

// Platform action types
const PLATFORM_ACTIONS = {
  'meta-ads': {
    CREATE_CAMPAIGN: 'create_campaign',
    UPDATE_CAMPAIGN: 'update_campaign',
    PAUSE_CAMPAIGN: 'pause_campaign',
    CREATE_ADSET: 'create_adset',
    UPDATE_BID: 'update_bid',
    CHANGE_BUDGET: 'change_budget',
    UPDATE_TARGETING: 'update_targeting',
    CREATE_AD: 'create_ad',
    UPDATE_CREATIVE: 'update_creative'
  },
  'whatsapp': {
    SEND_MESSAGE: 'send_message',
    CREATE_TEMPLATE: 'create_template',
    UPDATE_TEMPLATE: 'update_template',
    SETUP_AUTOMATION: 'setup_automation',
    UPDATE_WEBHOOK: 'update_webhook'
  },
  'instagram': {
    PUBLISH_POST: 'publish_post',
    PUBLISH_STORY: 'publish_story',
    PUBLISH_REEL: 'publish_reel',
    SCHEDULE_POST: 'schedule_post',
    UPDATE_BIO: 'update_bio',
    RESPOND_COMMENT: 'respond_comment',
    RESPOND_DM: 'respond_dm'
  },
  'tiktok': {
    PUBLISH_VIDEO: 'publish_video',
    CREATE_CAMPAIGN: 'create_campaign',
    UPDATE_CAMPAIGN: 'update_campaign',
    CREATE_ADGROUP: 'create_adgroup',
    UPDATE_BID: 'update_bid'
  },
  'gmail': {
    SEND_EMAIL: 'send_email',
    CREATE_TEMPLATE: 'create_template',
    SETUP_FILTER: 'setup_filter',
    CREATE_LABEL: 'create_label',
    SCHEDULE_EMAIL: 'schedule_email'
  },
  'shopify': {
    CREATE_PRODUCT: 'create_product',
    UPDATE_PRODUCT: 'update_product',
    UPDATE_INVENTORY: 'update_inventory',
    CREATE_DISCOUNT: 'create_discount',
    UPDATE_ORDER: 'update_order',
    CREATE_COLLECTION: 'create_collection'
  }
};

// Activity storage
const activityBuffer = [];
const MAX_BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 30000; // 30 seconds

// Activity statistics
const activityStats = {
  totalActivities: 0,
  activitiesByAgent: new Map(),
  activitiesByPlatform: new Map(),
  activitiesByType: new Map(),
  errorCount: 0,
  successCount: 0,
  lastActivity: null
};

// Initialize activity logger
const initializeActivityLogger = () => {
  // Start periodic flush
  setInterval(flushActivityBuffer, FLUSH_INTERVAL);
  
  // Setup graceful shutdown
  process.on('SIGINT', async () => {
    await flushActivityBuffer();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await flushActivityBuffer();
    process.exit(0);
  });
  
  logger.info('Agent activity logger initialized');
};

// Log agent decision
const logAgentDecision = async (agentId, agentType, decision) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.DECISION,
    agentId,
    agentType,
    data: {
      decision: decision.action,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      context: decision.context,
      parameters: decision.parameters,
      expectedOutcome: decision.expectedOutcome
    },
    platform: decision.platform || null,
    status: 'completed',
    duration: null,
    impact: decision.impact || 'medium'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time decision
  broadcastToChannel('agent_decisions', {
    type: 'agent_decision',
    agentId,
    agentType,
    decision: decision.action,
    reasoning: decision.reasoning,
    confidence: decision.confidence,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Log platform action
const logPlatformAction = async (agentId, agentType, platform, action, details) => {
  const startTime = Date.now();
  
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.ACTION,
    agentId,
    agentType,
    platform,
    data: {
      action,
      details,
      startTime,
      endTime: null,
      result: null,
      error: null
    },
    status: 'in_progress',
    duration: null,
    impact: details.impact || 'medium'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time action start
  broadcastToChannel('platform_actions', {
    type: 'action_started',
    activityId: activity.id,
    agentId,
    agentType,
    platform,
    action,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Update platform action result
const updatePlatformActionResult = async (activityId, result, error = null) => {
  const activity = activityBuffer.find(a => a.id === activityId);
  if (!activity) {
    logger.warn(`Activity ${activityId} not found in buffer`);
    return;
  }
  
  const endTime = Date.now();
  activity.data.endTime = endTime;
  activity.data.result = result;
  activity.data.error = error;
  activity.status = error ? 'failed' : 'completed';
  activity.duration = endTime - activity.data.startTime;
  
  // Update statistics
  if (error) {
    activityStats.errorCount++;
  } else {
    activityStats.successCount++;
  }
  
  // Broadcast real-time action completion
  broadcastToChannel('platform_actions', {
    type: error ? 'action_failed' : 'action_completed',
    activityId,
    agentId: activity.agentId,
    agentType: activity.agentType,
    platform: activity.platform,
    action: activity.data.action,
    result,
    error,
    duration: activity.duration,
    timestamp: new Date().toISOString()
  });
};

// Log agent optimization
const logAgentOptimization = async (agentId, agentType, platform, optimization) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.OPTIMIZATION,
    agentId,
    agentType,
    platform,
    data: {
      optimizationType: optimization.type,
      target: optimization.target,
      beforeMetrics: optimization.beforeMetrics,
      afterMetrics: optimization.afterMetrics,
      changes: optimization.changes,
      expectedImprovement: optimization.expectedImprovement,
      actualImprovement: optimization.actualImprovement
    },
    status: 'completed',
    duration: optimization.duration || null,
    impact: optimization.impact || 'high'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time optimization
  broadcastToChannel('agent_optimizations', {
    type: 'optimization_applied',
    agentId,
    agentType,
    platform,
    optimizationType: optimization.type,
    target: optimization.target,
    expectedImprovement: optimization.expectedImprovement,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Log content creation
const logContentCreation = async (agentId, agentType, platform, content) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.CREATION,
    agentId,
    agentType,
    platform,
    data: {
      contentType: content.type,
      title: content.title,
      description: content.description,
      targetAudience: content.targetAudience,
      keywords: content.keywords,
      scheduledFor: content.scheduledFor,
      status: content.status,
      metrics: content.metrics || {}
    },
    status: 'completed',
    duration: content.creationTime || null,
    impact: 'medium'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time content creation
  broadcastToChannel('content_creation', {
    type: 'content_created',
    agentId,
    agentType,
    platform,
    contentType: content.type,
    title: content.title,
    scheduledFor: content.scheduledFor,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Log agent analysis
const logAgentAnalysis = async (agentId, agentType, analysis) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.ANALYSIS,
    agentId,
    agentType,
    platform: analysis.platform || null,
    data: {
      analysisType: analysis.type,
      dataSource: analysis.dataSource,
      timeRange: analysis.timeRange,
      metrics: analysis.metrics,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      confidence: analysis.confidence
    },
    status: 'completed',
    duration: analysis.duration || null,
    impact: 'high'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time analysis
  broadcastToChannel('agent_analysis', {
    type: 'analysis_completed',
    agentId,
    agentType,
    analysisType: analysis.type,
    insights: analysis.insights,
    recommendations: analysis.recommendations,
    confidence: analysis.confidence,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Log agent communication
const logAgentCommunication = async (agentId, agentType, platform, communication) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.COMMUNICATION,
    agentId,
    agentType,
    platform,
    data: {
      communicationType: communication.type,
      recipient: communication.recipient,
      channel: communication.channel,
      message: communication.message,
      context: communication.context,
      response: communication.response,
      sentiment: communication.sentiment
    },
    status: 'completed',
    duration: communication.duration || null,
    impact: 'medium'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time communication
  broadcastToChannel('agent_communications', {
    type: 'communication_sent',
    agentId,
    agentType,
    platform,
    communicationType: communication.type,
    recipient: communication.recipient,
    channel: communication.channel,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Log agent error
const logAgentError = async (agentId, agentType, error, context) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.ERROR,
    agentId,
    agentType,
    platform: context.platform || null,
    data: {
      errorType: error.type || 'unknown',
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      severity: error.severity || 'medium',
      recoverable: error.recoverable || false
    },
    status: 'failed',
    duration: null,
    impact: 'high'
  };
  
  await logActivity(activity);
  
  // Update error statistics
  activityStats.errorCount++;
  
  // Broadcast real-time error
  broadcastToChannel('agent_errors', {
    type: 'agent_error',
    agentId,
    agentType,
    errorType: error.type,
    errorMessage: error.message,
    severity: error.severity,
    platform: context.platform,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Log agent performance metrics
const logAgentPerformance = async (agentId, agentType, metrics) => {
  const activity = {
    id: generateActivityId(),
    timestamp: new Date().toISOString(),
    type: ACTIVITY_TYPES.PERFORMANCE,
    agentId,
    agentType,
    platform: null,
    data: {
      metrics: {
        responseTime: metrics.responseTime,
        successRate: metrics.successRate,
        throughput: metrics.throughput,
        errorRate: metrics.errorRate,
        resourceUsage: metrics.resourceUsage,
        customMetrics: metrics.customMetrics || {}
      },
      period: metrics.period,
      comparison: metrics.comparison || null
    },
    status: 'completed',
    duration: null,
    impact: 'low'
  };
  
  await logActivity(activity);
  
  // Broadcast real-time performance
  broadcastToChannel('agent_performance', {
    type: 'performance_update',
    agentId,
    agentType,
    metrics: activity.data.metrics,
    timestamp: activity.timestamp
  });
  
  return activity.id;
};

// Core activity logging function
const logActivity = async (activity) => {
  // Add to buffer
  activityBuffer.push(activity);
  
  // Update statistics
  activityStats.totalActivities++;
  activityStats.lastActivity = activity.timestamp;
  
  // Update agent statistics
  const agentKey = `${activity.agentType}:${activity.agentId}`;
  const agentStats = activityStats.activitiesByAgent.get(agentKey) || { count: 0, lastActivity: null };
  agentStats.count++;
  agentStats.lastActivity = activity.timestamp;
  activityStats.activitiesByAgent.set(agentKey, agentStats);
  
  // Update platform statistics
  if (activity.platform) {
    const platformStats = activityStats.activitiesByPlatform.get(activity.platform) || { count: 0, lastActivity: null };
    platformStats.count++;
    platformStats.lastActivity = activity.timestamp;
    activityStats.activitiesByPlatform.set(activity.platform, platformStats);
  }
  
  // Update type statistics
  const typeStats = activityStats.activitiesByType.get(activity.type) || { count: 0, lastActivity: null };
  typeStats.count++;
  typeStats.lastActivity = activity.timestamp;
  activityStats.activitiesByType.set(activity.type, typeStats);
  
  // Flush buffer if it's getting too large
  if (activityBuffer.length >= MAX_BUFFER_SIZE) {
    await flushActivityBuffer();
  }
  
  // Emit activity event
  agentActivityEmitter.emit('activity_logged', activity);
  
  logger.debug(`Activity logged: ${activity.type} by ${activity.agentType}:${activity.agentId}`);
};

// Flush activity buffer to persistent storage
const flushActivityBuffer = async () => {
  if (activityBuffer.length === 0) return;
  
  try {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFile = path.join(__dirname, '../logs', `agent-activities-${timestamp}.json`);
    
    // Ensure logs directory exists
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    
    // Read existing log file if it exists
    let existingActivities = [];
    try {
      const existingData = await fs.readFile(logFile, 'utf8');
      existingActivities = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
    }
    
    // Append new activities
    const allActivities = [...existingActivities, ...activityBuffer];
    
    // Write to file
    await fs.writeFile(logFile, JSON.stringify(allActivities, null, 2));
    
    // Store in cache for quick access
    await storeSession(`agent_activities:${timestamp}`, allActivities, 24 * 60 * 60); // 24 hours
    
    logger.info(`Flushed ${activityBuffer.length} activities to ${logFile}`);
    
    // Clear buffer
    activityBuffer.length = 0;
    
  } catch (error) {
    logger.error('Failed to flush activity buffer:', error);
  }
};

// Get recent activities
const getRecentActivities = async (limit = 100, filters = {}) => {
  const allActivities = [...activityBuffer];
  
  // Apply filters
  let filteredActivities = allActivities;
  
  if (filters.agentId) {
    filteredActivities = filteredActivities.filter(a => a.agentId === filters.agentId);
  }
  
  if (filters.agentType) {
    filteredActivities = filteredActivities.filter(a => a.agentType === filters.agentType);
  }
  
  if (filters.platform) {
    filteredActivities = filteredActivities.filter(a => a.platform === filters.platform);
  }
  
  if (filters.type) {
    filteredActivities = filteredActivities.filter(a => a.type === filters.type);
  }
  
  if (filters.status) {
    filteredActivities = filteredActivities.filter(a => a.status === filters.status);
  }
  
  if (filters.since) {
    const sinceDate = new Date(filters.since);
    filteredActivities = filteredActivities.filter(a => new Date(a.timestamp) >= sinceDate);
  }
  
  // Sort by timestamp (newest first) and limit
  return filteredActivities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

// Get activity statistics
const getActivityStatistics = () => {
  return {
    total: activityStats.totalActivities,
    errors: activityStats.errorCount,
    successes: activityStats.successCount,
    successRate: activityStats.totalActivities > 0 ? (activityStats.successCount / activityStats.totalActivities) * 100 : 0,
    lastActivity: activityStats.lastActivity,
    byAgent: Object.fromEntries(activityStats.activitiesByAgent),
    byPlatform: Object.fromEntries(activityStats.activitiesByPlatform),
    byType: Object.fromEntries(activityStats.activitiesByType),
    bufferSize: activityBuffer.length
  };
};

// Get agent activity summary
const getAgentActivitySummary = async (agentId, agentType, timeRange = '24h') => {
  const activities = await getRecentActivities(1000, { agentId, agentType });
  
  // Calculate time range
  const now = new Date();
  const since = new Date();
  switch (timeRange) {
    case '1h':
      since.setHours(now.getHours() - 1);
      break;
    case '24h':
      since.setDate(now.getDate() - 1);
      break;
    case '7d':
      since.setDate(now.getDate() - 7);
      break;
    case '30d':
      since.setDate(now.getDate() - 30);
      break;
  }
  
  const recentActivities = activities.filter(a => new Date(a.timestamp) >= since);
  
  const summary = {
    agentId,
    agentType,
    timeRange,
    totalActivities: recentActivities.length,
    activitiesByType: {},
    activitiesByPlatform: {},
    activitiesByStatus: {},
    averageResponseTime: 0,
    successRate: 0,
    lastActivity: recentActivities[0]?.timestamp || null,
    topActions: [],
    recentErrors: []
  };
  
  // Calculate statistics
  let totalDuration = 0;
  let durationCount = 0;
  let successCount = 0;
  
  recentActivities.forEach(activity => {
    // By type
    summary.activitiesByType[activity.type] = (summary.activitiesByType[activity.type] || 0) + 1;
    
    // By platform
    if (activity.platform) {
      summary.activitiesByPlatform[activity.platform] = (summary.activitiesByPlatform[activity.platform] || 0) + 1;
    }
    
    // By status
    summary.activitiesByStatus[activity.status] = (summary.activitiesByStatus[activity.status] || 0) + 1;
    
    // Duration
    if (activity.duration) {
      totalDuration += activity.duration;
      durationCount++;
    }
    
    // Success rate
    if (activity.status === 'completed') {
      successCount++;
    }
    
    // Recent errors
    if (activity.status === 'failed' && summary.recentErrors.length < 5) {
      summary.recentErrors.push({
        timestamp: activity.timestamp,
        type: activity.type,
        platform: activity.platform,
        error: activity.data.error || activity.data.errorMessage
      });
    }
  });
  
  summary.averageResponseTime = durationCount > 0 ? totalDuration / durationCount : 0;
  summary.successRate = recentActivities.length > 0 ? (successCount / recentActivities.length) * 100 : 0;
  
  return summary;
};

// Generate unique activity ID
const generateActivityId = () => {
  return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  initializeActivityLogger,
  logAgentDecision,
  logPlatformAction,
  updatePlatformActionResult,
  logAgentOptimization,
  logContentCreation,
  logAgentAnalysis,
  logAgentCommunication,
  logAgentError,
  logAgentPerformance,
  getRecentActivities,
  getActivityStatistics,
  getAgentActivitySummary,
  flushActivityBuffer,
  agentActivityEmitter,
  ACTIVITY_TYPES,
  PLATFORM_ACTIONS
};