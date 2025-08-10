const { logger } = require('../middleware/security');
const { broadcastToChannel } = require('./realtimeManager');
const { storeSession, getSession } = require('../middleware/cache');
const { agentActivityEmitter } = require('./agentActivityLogger');
const { platformSyncEmitter } = require('./platformDataSync');
const EventEmitter = require('events');

// Feedback system emitter
class FeedbackSystemEmitter extends EventEmitter {}
const feedbackSystemEmitter = new FeedbackSystemEmitter();

// Feedback types
const FEEDBACK_TYPES = {
  PERFORMANCE: 'performance',
  OUTCOME: 'outcome',
  USER: 'user',
  SYSTEM: 'system',
  METRIC: 'metric',
  ERROR: 'error'
};

// Learning objectives for each agent type
const LEARNING_OBJECTIVES = {
  'advertising': {
    primary: ['roas', 'cpc', 'ctr', 'conversions'],
    secondary: ['reach', 'frequency', 'engagement'],
    thresholds: {
      roas: { good: 3.0, excellent: 5.0 },
      cpc: { good: 2.0, excellent: 1.0 },
      ctr: { good: 2.0, excellent: 4.0 },
      conversions: { good: 10, excellent: 50 }
    }
  },
  'customer-service': {
    primary: ['responseTime', 'satisfactionScore', 'resolutionRate'],
    secondary: ['escalationRate', 'firstContactResolution'],
    thresholds: {
      responseTime: { good: 60, excellent: 30 },
      satisfactionScore: { good: 4.0, excellent: 4.5 },
      resolutionRate: { good: 80, excellent: 95 }
    }
  },
  'content': {
    primary: ['engagement', 'reach', 'shares'],
    secondary: ['comments', 'saves', 'clickthrough'],
    thresholds: {
      engagement: { good: 5.0, excellent: 10.0 },
      reach: { good: 1000, excellent: 10000 },
      shares: { good: 10, excellent: 100 }
    }
  },
  'analysis': {
    primary: ['accuracy', 'insightQuality', 'predictionAccuracy'],
    secondary: ['processingTime', 'dataCompleteness'],
    thresholds: {
      accuracy: { good: 85, excellent: 95 },
      insightQuality: { good: 7.0, excellent: 9.0 },
      predictionAccuracy: { good: 75, excellent: 90 }
    }
  },
  'email': {
    primary: ['openRate', 'clickRate', 'deliverabilityRate'],
    secondary: ['unsubscribeRate', 'spamRate'],
    thresholds: {
      openRate: { good: 20, excellent: 35 },
      clickRate: { good: 3, excellent: 8 },
      deliverabilityRate: { good: 95, excellent: 99 }
    }
  },
  'pages': {
    primary: ['conversionRate', 'pageSpeed', 'userEngagement'],
    secondary: ['bounceRate', 'timeOnPage'],
    thresholds: {
      conversionRate: { good: 2.0, excellent: 5.0 },
      pageSpeed: { good: 3.0, excellent: 1.5 },
      userEngagement: { good: 60, excellent: 80 }
    }
  }
};

// Agent learning profiles
const agentLearningProfiles = new Map();

// Feedback queue
const feedbackQueue = [];
const MAX_QUEUE_SIZE = 500;

// Initialize feedback system
const initializeFeedbackSystem = () => {
  // Listen to activity events
  agentActivityEmitter.on('activity_logged', handleActivityFeedback);
  
  // Listen to platform data updates
  platformSyncEmitter.on('sync_completed', handlePlatformDataFeedback);
  
  // Process feedback queue periodically
  setInterval(processFeedbackQueue, 60000); // Every minute
  
  // Generate learning reports periodically
  setInterval(generateLearningReports, 300000); // Every 5 minutes
  
  logger.info('Agent feedback system initialized');
};

// Handle activity-based feedback
const handleActivityFeedback = async (activity) => {
  try {
    // Generate immediate feedback for completed actions
    if (activity.status === 'completed' && activity.type === 'action') {
      await generateActionFeedback(activity);
    }
    
    // Generate error feedback
    if (activity.status === 'failed') {
      await generateErrorFeedback(activity);
    }
    
    // Generate performance feedback
    if (activity.type === 'performance') {
      await generatePerformanceFeedback(activity);
    }
    
  } catch (error) {
    logger.error('Error handling activity feedback:', error);
  }
};

// Handle platform data feedback
const handlePlatformDataFeedback = async (syncData) => {
  try {
    const { platform, data } = syncData;
    
    // Generate metric-based feedback for all agents working on this platform
    const agentProfiles = Array.from(agentLearningProfiles.values())
      .filter(profile => profile.activePlatforms.includes(platform));
    
    for (const profile of agentProfiles) {
      await generateMetricFeedback(profile.agentId, profile.agentType, platform, data);
    }
    
  } catch (error) {
    logger.error('Error handling platform data feedback:', error);
  }
};

// Generate action feedback
const generateActionFeedback = async (activity) => {
  const { agentId, agentType, platform, data } = activity;
  
  const feedback = {
    id: generateFeedbackId(),
    timestamp: new Date().toISOString(),
    type: FEEDBACK_TYPES.OUTCOME,
    agentId,
    agentType,
    platform,
    activityId: activity.id,
    data: {
      action: data.action,
      result: data.result,
      duration: activity.duration,
      success: true,
      impact: activity.impact,
      learningPoints: await extractLearningPoints(activity)
    },
    processed: false
  };
  
  await addFeedback(feedback);
};

// Generate error feedback
const generateErrorFeedback = async (activity) => {
  const { agentId, agentType, platform, data } = activity;
  
  const feedback = {
    id: generateFeedbackId(),
    timestamp: new Date().toISOString(),
    type: FEEDBACK_TYPES.ERROR,
    agentId,
    agentType,
    platform,
    activityId: activity.id,
    data: {
      errorType: data.errorType,
      errorMessage: data.errorMessage,
      context: data.context,
      severity: data.severity,
      recoverable: data.recoverable,
      learningPoints: await extractErrorLearningPoints(activity)
    },
    processed: false
  };
  
  await addFeedback(feedback);
};

// Generate performance feedback
const generatePerformanceFeedback = async (activity) => {
  const { agentId, agentType, data } = activity;
  
  const feedback = {
    id: generateFeedbackId(),
    timestamp: new Date().toISOString(),
    type: FEEDBACK_TYPES.PERFORMANCE,
    agentId,
    agentType,
    platform: null,
    activityId: activity.id,
    data: {
      metrics: data.metrics,
      period: data.period,
      comparison: data.comparison,
      trends: await calculatePerformanceTrends(agentId, agentType, data.metrics),
      recommendations: await generatePerformanceRecommendations(agentId, agentType, data.metrics)
    },
    processed: false
  };
  
  await addFeedback(feedback);
};

// Generate metric feedback
const generateMetricFeedback = async (agentId, agentType, platform, platformData) => {
  const objectives = LEARNING_OBJECTIVES[agentType];
  if (!objectives) return;
  
  const relevantMetrics = {};
  const metricFeedback = [];
  
  // Extract relevant metrics
  objectives.primary.forEach(metric => {
    if (platformData.metrics && platformData.metrics[metric] !== undefined) {
      relevantMetrics[metric] = platformData.metrics[metric];
      
      // Evaluate metric performance
      const threshold = objectives.thresholds[metric];
      if (threshold) {
        const performance = evaluateMetricPerformance(platformData.metrics[metric], threshold);
        metricFeedback.push({
          metric,
          value: platformData.metrics[metric],
          performance,
          threshold
        });
      }
    }
  });
  
  if (metricFeedback.length > 0) {
    const feedback = {
      id: generateFeedbackId(),
      timestamp: new Date().toISOString(),
      type: FEEDBACK_TYPES.METRIC,
      agentId,
      agentType,
      platform,
      activityId: null,
      data: {
        metrics: relevantMetrics,
        evaluations: metricFeedback,
        overallPerformance: calculateOverallPerformance(metricFeedback),
        recommendations: await generateMetricRecommendations(agentType, metricFeedback)
      },
      processed: false
    };
    
    await addFeedback(feedback);
  }
};

// Add feedback to queue
const addFeedback = async (feedback) => {
  feedbackQueue.push(feedback);
  
  // Trim queue if too large
  if (feedbackQueue.length > MAX_QUEUE_SIZE) {
    feedbackQueue.shift();
  }
  
  // Update agent learning profile
  await updateAgentLearningProfile(feedback);
  
  // Broadcast real-time feedback
  broadcastToChannel('agent_feedback', {
    type: 'feedback_generated',
    feedbackId: feedback.id,
    agentId: feedback.agentId,
    agentType: feedback.agentType,
    feedbackType: feedback.type,
    platform: feedback.platform,
    timestamp: feedback.timestamp
  });
  
  logger.debug(`Feedback generated: ${feedback.type} for ${feedback.agentType}:${feedback.agentId}`);
};

// Process feedback queue
const processFeedbackQueue = async () => {
  const unprocessedFeedback = feedbackQueue.filter(f => !f.processed);
  
  for (const feedback of unprocessedFeedback) {
    try {
      await processFeedback(feedback);
      feedback.processed = true;
    } catch (error) {
      logger.error(`Error processing feedback ${feedback.id}:`, error);
    }
  }
  
  if (unprocessedFeedback.length > 0) {
    logger.info(`Processed ${unprocessedFeedback.length} feedback items`);
  }
};

// Process individual feedback
const processFeedback = async (feedback) => {
  const profile = await getAgentLearningProfile(feedback.agentId, feedback.agentType);
  
  // Update learning metrics
  await updateLearningMetrics(profile, feedback);
  
  // Generate learning insights
  const insights = await generateLearningInsights(profile, feedback);
  
  // Update agent configuration if needed
  if (insights.configurationChanges && insights.configurationChanges.length > 0) {
    await applyConfigurationChanges(feedback.agentId, feedback.agentType, insights.configurationChanges);
  }
  
  // Store processed feedback
  await storeSession(`feedback:${feedback.id}`, feedback, 7 * 24 * 60 * 60); // 7 days
};

// Update agent learning profile
const updateAgentLearningProfile = async (feedback) => {
  const profileKey = `${feedback.agentType}:${feedback.agentId}`;
  let profile = agentLearningProfiles.get(profileKey);
  
  if (!profile) {
    profile = {
      agentId: feedback.agentId,
      agentType: feedback.agentType,
      createdAt: new Date().toISOString(),
      activePlatforms: [],
      totalFeedback: 0,
      feedbackByType: {},
      learningMetrics: {},
      performanceTrends: {},
      lastUpdate: null
    };
  }
  
  // Update basic stats
  profile.totalFeedback++;
  profile.feedbackByType[feedback.type] = (profile.feedbackByType[feedback.type] || 0) + 1;
  profile.lastUpdate = feedback.timestamp;
  
  // Update active platforms
  if (feedback.platform && !profile.activePlatforms.includes(feedback.platform)) {
    profile.activePlatforms.push(feedback.platform);
  }
  
  agentLearningProfiles.set(profileKey, profile);
  
  // Store in cache
  await storeSession(`agent_profile:${profileKey}`, profile, 24 * 60 * 60); // 24 hours
};

// Get agent learning profile
const getAgentLearningProfile = async (agentId, agentType) => {
  const profileKey = `${agentType}:${agentId}`;
  let profile = agentLearningProfiles.get(profileKey);
  
  if (!profile) {
    // Try to load from cache
    profile = await getSession(`agent_profile:${profileKey}`);
    if (profile) {
      agentLearningProfiles.set(profileKey, profile);
    }
  }
  
  return profile;
};

// Extract learning points from activity
const extractLearningPoints = async (activity) => {
  const learningPoints = [];
  
  // Duration-based learning
  if (activity.duration) {
    if (activity.duration < 1000) {
      learningPoints.push('Fast execution - good optimization');
    } else if (activity.duration > 10000) {
      learningPoints.push('Slow execution - consider optimization');
    }
  }
  
  // Impact-based learning
  if (activity.impact === 'high') {
    learningPoints.push('High impact action - monitor results closely');
  }
  
  // Platform-specific learning
  if (activity.platform && activity.data.result) {
    switch (activity.platform) {
      case 'meta-ads':
        if (activity.data.action === 'update_bid' && activity.data.result.improvement) {
          learningPoints.push('Bid optimization successful - apply similar strategy');
        }
        break;
      case 'instagram':
        if (activity.data.action === 'publish_post' && activity.data.result.engagement > 5) {
          learningPoints.push('High engagement post - analyze content strategy');
        }
        break;
    }
  }
  
  return learningPoints;
};

// Extract error learning points
const extractErrorLearningPoints = async (activity) => {
  const learningPoints = [];
  
  const errorType = activity.data.errorType;
  const context = activity.data.context;
  
  // Common error patterns
  if (errorType === 'rate_limit') {
    learningPoints.push('Rate limit exceeded - implement better request spacing');
  } else if (errorType === 'authentication') {
    learningPoints.push('Authentication failed - check token validity');
  } else if (errorType === 'validation') {
    learningPoints.push('Validation error - review input parameters');
  }
  
  // Context-based learning
  if (context.retryCount > 3) {
    learningPoints.push('Multiple retries failed - review error handling strategy');
  }
  
  return learningPoints;
};

// Calculate performance trends
const calculatePerformanceTrends = async (agentId, agentType, currentMetrics) => {
  // This would compare with historical performance data
  // For now, return mock trends
  const trends = {};
  
  Object.keys(currentMetrics).forEach(metric => {
    trends[metric] = {
      direction: Math.random() > 0.5 ? 'up' : 'down',
      change: (Math.random() * 20 - 10).toFixed(2) + '%',
      confidence: Math.random() * 100
    };
  });
  
  return trends;
};

// Generate performance recommendations
const generatePerformanceRecommendations = async (agentId, agentType, metrics) => {
  const recommendations = [];
  const objectives = LEARNING_OBJECTIVES[agentType];
  
  if (!objectives) return recommendations;
  
  // Check each metric against thresholds
  objectives.primary.forEach(metric => {
    if (metrics[metric] !== undefined) {
      const threshold = objectives.thresholds[metric];
      if (threshold) {
        const value = metrics[metric];
        
        if (value < threshold.good) {
          recommendations.push({
            type: 'improvement',
            metric,
            current: value,
            target: threshold.good,
            suggestion: `Improve ${metric} to reach good performance threshold`
          });
        } else if (value >= threshold.excellent) {
          recommendations.push({
            type: 'maintain',
            metric,
            current: value,
            suggestion: `Excellent ${metric} performance - maintain current strategy`
          });
        }
      }
    }
  });
  
  return recommendations;
};

// Evaluate metric performance
const evaluateMetricPerformance = (value, threshold) => {
  if (value >= threshold.excellent) {
    return 'excellent';
  } else if (value >= threshold.good) {
    return 'good';
  } else {
    return 'needs_improvement';
  }
};

// Calculate overall performance
const calculateOverallPerformance = (metricFeedback) => {
  const scores = { excellent: 3, good: 2, needs_improvement: 1 };
  let totalScore = 0;
  let count = 0;
  
  metricFeedback.forEach(feedback => {
    totalScore += scores[feedback.performance] || 0;
    count++;
  });
  
  const averageScore = count > 0 ? totalScore / count : 0;
  
  if (averageScore >= 2.5) return 'excellent';
  if (averageScore >= 1.5) return 'good';
  return 'needs_improvement';
};

// Generate metric recommendations
const generateMetricRecommendations = async (agentType, metricFeedback) => {
  const recommendations = [];
  
  metricFeedback.forEach(feedback => {
    if (feedback.performance === 'needs_improvement') {
      recommendations.push({
        metric: feedback.metric,
        current: feedback.value,
        target: feedback.threshold.good,
        priority: 'high',
        suggestion: `Focus on improving ${feedback.metric} performance`
      });
    }
  });
  
  return recommendations;
};

// Update learning metrics
const updateLearningMetrics = async (profile, feedback) => {
  if (!profile.learningMetrics[feedback.type]) {
    profile.learningMetrics[feedback.type] = {
      count: 0,
      successRate: 0,
      averageImpact: 0,
      trends: []
    };
  }
  
  const metrics = profile.learningMetrics[feedback.type];
  metrics.count++;
  
  // Update success rate
  if (feedback.type === FEEDBACK_TYPES.OUTCOME) {
    const successCount = metrics.successRate * (metrics.count - 1) + (feedback.data.success ? 1 : 0);
    metrics.successRate = successCount / metrics.count;
  }
  
  // Update average impact
  if (feedback.data.impact) {
    const impactScore = { low: 1, medium: 2, high: 3 }[feedback.data.impact] || 2;
    const totalImpact = metrics.averageImpact * (metrics.count - 1) + impactScore;
    metrics.averageImpact = totalImpact / metrics.count;
  }
};

// Generate learning insights
const generateLearningInsights = async (profile, feedback) => {
  const insights = {
    patterns: [],
    recommendations: [],
    configurationChanges: []
  };
  
  // Analyze patterns
  if (profile.totalFeedback > 10) {
    const errorRate = (profile.feedbackByType[FEEDBACK_TYPES.ERROR] || 0) / profile.totalFeedback;
    if (errorRate > 0.2) {
      insights.patterns.push('High error rate detected');
      insights.recommendations.push('Review error handling and validation logic');
    }
    
    const performanceMetrics = profile.learningMetrics[FEEDBACK_TYPES.PERFORMANCE];
    if (performanceMetrics && performanceMetrics.averageImpact < 1.5) {
      insights.patterns.push('Low impact performance');
      insights.recommendations.push('Focus on high-impact optimizations');
    }
  }
  
  return insights;
};

// Apply configuration changes
const applyConfigurationChanges = async (agentId, agentType, changes) => {
  // This would update agent configuration
  logger.info(`Applying ${changes.length} configuration changes to ${agentType}:${agentId}`);
  
  // Broadcast configuration update
  broadcastToChannel('agent_config', {
    type: 'configuration_updated',
    agentId,
    agentType,
    changes,
    timestamp: new Date().toISOString()
  });
};

// Generate learning reports
const generateLearningReports = async () => {
  const reports = [];
  
  for (const [profileKey, profile] of agentLearningProfiles) {
    const report = {
      agentId: profile.agentId,
      agentType: profile.agentType,
      reportDate: new Date().toISOString(),
      totalFeedback: profile.totalFeedback,
      activePlatforms: profile.activePlatforms,
      learningProgress: calculateLearningProgress(profile),
      recommendations: await generateAgentRecommendations(profile)
    };
    
    reports.push(report);
  }
  
  // Broadcast learning reports
  broadcastToChannel('learning_reports', {
    type: 'learning_reports_generated',
    reports,
    timestamp: new Date().toISOString()
  });
  
  logger.info(`Generated learning reports for ${reports.length} agents`);
};

// Calculate learning progress
const calculateLearningProgress = (profile) => {
  const progress = {
    overall: 0,
    byType: {},
    trends: 'stable'
  };
  
  // Calculate overall progress based on feedback volume and success rates
  let totalScore = 0;
  let typeCount = 0;
  
  Object.entries(profile.learningMetrics).forEach(([type, metrics]) => {
    let typeScore = 0;
    
    // Volume score (0-40)
    typeScore += Math.min(metrics.count / 10, 4) * 10;
    
    // Success rate score (0-60)
    if (metrics.successRate !== undefined) {
      typeScore += metrics.successRate * 60;
    }
    
    progress.byType[type] = Math.round(typeScore);
    totalScore += typeScore;
    typeCount++;
  });
  
  progress.overall = typeCount > 0 ? Math.round(totalScore / typeCount) : 0;
  
  return progress;
};

// Generate agent recommendations
const generateAgentRecommendations = async (profile) => {
  const recommendations = [];
  
  // Low activity recommendation
  if (profile.totalFeedback < 5) {
    recommendations.push({
      type: 'activity',
      priority: 'medium',
      message: 'Increase agent activity to gather more learning data'
    });
  }
  
  // High error rate recommendation
  const errorRate = (profile.feedbackByType[FEEDBACK_TYPES.ERROR] || 0) / profile.totalFeedback;
  if (errorRate > 0.15) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      message: 'High error rate detected - review error handling'
    });
  }
  
  // Platform expansion recommendation
  if (profile.activePlatforms.length < 2) {
    recommendations.push({
      type: 'expansion',
      priority: 'low',
      message: 'Consider expanding to additional platforms'
    });
  }
  
  return recommendations;
};

// Get feedback statistics
const getFeedbackStatistics = () => {
  const stats = {
    totalFeedback: feedbackQueue.length,
    processed: feedbackQueue.filter(f => f.processed).length,
    pending: feedbackQueue.filter(f => !f.processed).length,
    byType: {},
    byAgent: {},
    recentFeedback: feedbackQueue.slice(-10)
  };
  
  feedbackQueue.forEach(feedback => {
    // By type
    stats.byType[feedback.type] = (stats.byType[feedback.type] || 0) + 1;
    
    // By agent
    const agentKey = `${feedback.agentType}:${feedback.agentId}`;
    stats.byAgent[agentKey] = (stats.byAgent[agentKey] || 0) + 1;
  });
  
  return stats;
};

// Generate feedback ID
const generateFeedbackId = () => {
  return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  initializeFeedbackSystem,
  generateActionFeedback,
  generateErrorFeedback,
  generatePerformanceFeedback,
  generateMetricFeedback,
  getAgentLearningProfile,
  getFeedbackStatistics,
  generateLearningReports,
  feedbackSystemEmitter,
  FEEDBACK_TYPES,
  LEARNING_OBJECTIVES
};