const WebSocket = require('ws');
const { logger } = require('../middleware/security');
const { storeSession, getSession } = require('../middleware/cache');
const EventEmitter = require('events');

// Real-time event emitter for agent activities
class AgentActivityEmitter extends EventEmitter {}
const agentActivityEmitter = new AgentActivityEmitter();

// WebSocket server instance
let wss = null;
const connectedClients = new Map();

// Agent activity tracking
const agentActivities = {
  realTimeData: new Map(),
  decisions: new Map(),
  platformActions: new Map(),
  optimizations: new Map()
};

// Initialize WebSocket server
const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ noServer: true });
  
  wss.on('connection', (ws, req) => {
    const clientId = generateClientId();
    connectedClients.set(clientId, {
      ws,
      userId: null,
      subscribedChannels: new Set(),
      connectedAt: new Date().toISOString()
    });
    
    logger.info(`WebSocket client connected: ${clientId}`);
    
    // Handle client authentication
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await handleWebSocketMessage(clientId, data);
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      connectedClients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      clientId,
      message: 'Connected to Ekko real-time service'
    }));
  });
  
  logger.info('WebSocket server initialized');
};

// Handle WebSocket messages
const handleWebSocketMessage = async (clientId, data) => {
  const client = connectedClients.get(clientId);
  if (!client) return;
  
  switch (data.type) {
    case 'authenticate':
      await authenticateClient(clientId, data.token);
      break;
      
    case 'subscribe':
      await subscribeToChannel(clientId, data.channel);
      break;
      
    case 'unsubscribe':
      await unsubscribeFromChannel(clientId, data.channel);
      break;
      
    case 'agent_command':
      await handleAgentCommand(clientId, data);
      break;
      
    default:
      logger.warn(`Unknown WebSocket message type: ${data.type}`);
  }
};

// Authenticate WebSocket client
const authenticateClient = async (clientId, token) => {
  try {
    // Verify JWT token (implement your JWT verification logic)
    const client = connectedClients.get(clientId);
    if (client) {
      client.userId = 'authenticated-user'; // Replace with actual user ID from token
      client.ws.send(JSON.stringify({
        type: 'authenticated',
        message: 'Successfully authenticated'
      }));
    }
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
  }
};

// Subscribe client to real-time channel
const subscribeToChannel = async (clientId, channel) => {
  const client = connectedClients.get(clientId);
  if (client && client.userId) {
    client.subscribedChannels.add(channel);
    client.ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
      message: `Subscribed to ${channel}`
    }));
    
    // Send current data for the channel
    await sendChannelData(clientId, channel);
  }
};

// Unsubscribe client from channel
const unsubscribeFromChannel = async (clientId, channel) => {
  const client = connectedClients.get(clientId);
  if (client) {
    client.subscribedChannels.delete(channel);
    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      channel,
      message: `Unsubscribed from ${channel}`
    }));
  }
};

// Handle agent commands from dashboard
const handleAgentCommand = async (clientId, data) => {
  const { agentType, command, parameters } = data;
  
  try {
    // Emit agent command event
    agentActivityEmitter.emit('agent_command', {
      agentType,
      command,
      parameters,
      timestamp: new Date().toISOString(),
      clientId
    });
    
    // Store command in activity log
    await logAgentActivity(agentType, 'command', {
      command,
      parameters,
      source: 'dashboard'
    });
    
    // Broadcast to all subscribed clients
    broadcastToChannel('agent_activities', {
      type: 'agent_command_executed',
      agentType,
      command,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Agent command error:', error);
  }
};

// Log agent activity
const logAgentActivity = async (agentType, activityType, data) => {
  const activity = {
    id: generateActivityId(),
    agentType,
    activityType,
    data,
    timestamp: new Date().toISOString()
  };
  
  // Store in appropriate activity map
  switch (activityType) {
    case 'decision':
      agentActivities.decisions.set(activity.id, activity);
      break;
    case 'platform_action':
      agentActivities.platformActions.set(activity.id, activity);
      break;
    case 'optimization':
      agentActivities.optimizations.set(activity.id, activity);
      break;
    default:
      agentActivities.realTimeData.set(activity.id, activity);
  }
  
  // Store in cache for persistence
  await storeSession(`activity:${activity.id}`, activity, 86400); // 24 hours
  
  // Broadcast to subscribed clients
  broadcastToChannel('agent_activities', {
    type: 'new_activity',
    activity
  });
  
  return activity;
};

// Log agent decision
const logAgentDecision = async (agentType, decision, context = {}) => {
  return await logAgentActivity(agentType, 'decision', {
    decision,
    context,
    reasoning: decision.reasoning || 'No reasoning provided',
    confidence: decision.confidence || 0.5,
    alternatives: decision.alternatives || []
  });
};

// Log platform action
const logPlatformAction = async (agentType, platform, action, result) => {
  return await logAgentActivity(agentType, 'platform_action', {
    platform,
    action,
    result,
    success: result.success || false,
    metrics: result.metrics || {}
  });
};

// Log optimization
const logOptimization = async (agentType, optimization) => {
  return await logAgentActivity(agentType, 'optimization', {
    type: optimization.type,
    before: optimization.before,
    after: optimization.after,
    improvement: optimization.improvement,
    metrics: optimization.metrics || {}
  });
};

// Broadcast message to all clients subscribed to a channel
const broadcastToChannel = (channel, message) => {
  connectedClients.forEach((client, clientId) => {
    if (client.subscribedChannels.has(channel) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        channel,
        ...message,
        timestamp: new Date().toISOString()
      }));
    }
  });
};

// Send current channel data to client
const sendChannelData = async (clientId, channel) => {
  const client = connectedClients.get(clientId);
  if (!client) return;
  
  let data = {};
  
  switch (channel) {
    case 'agent_activities':
      data = {
        recentActivities: Array.from(agentActivities.realTimeData.values()).slice(-50),
        recentDecisions: Array.from(agentActivities.decisions.values()).slice(-20),
        recentActions: Array.from(agentActivities.platformActions.values()).slice(-30),
        recentOptimizations: Array.from(agentActivities.optimizations.values()).slice(-10)
      };
      break;
      
    case 'platform_data':
      data = await getCurrentPlatformData();
      break;
      
    case 'agent_status':
      data = await getCurrentAgentStatus();
      break;
  }
  
  client.ws.send(JSON.stringify({
    type: 'channel_data',
    channel,
    data
  }));
};

// Get current platform data
const getCurrentPlatformData = async () => {
  // This would fetch real-time data from connected platforms
  return {
    platforms: {
      'meta-ads': { status: 'connected', lastSync: new Date().toISOString() },
      'whatsapp': { status: 'connected', lastSync: new Date().toISOString() },
      'tiktok': { status: 'connected', lastSync: new Date().toISOString() },
      'gmail': { status: 'connected', lastSync: new Date().toISOString() }
    },
    metrics: {
      totalCampaigns: 15,
      activeConversations: 23,
      emailsSent: 145,
      contentPublished: 8
    }
  };
};

// Get current agent status
const getCurrentAgentStatus = async () => {
  return {
    agents: {
      'advertising': { status: 'active', performance: 92, lastActivity: new Date().toISOString() },
      'customer-service': { status: 'active', performance: 88, lastActivity: new Date().toISOString() },
      'content': { status: 'active', performance: 95, lastActivity: new Date().toISOString() },
      'analysis': { status: 'active', performance: 90, lastActivity: new Date().toISOString() },
      'email': { status: 'active', performance: 87, lastActivity: new Date().toISOString() },
      'pages': { status: 'active', performance: 93, lastActivity: new Date().toISOString() }
    }
  };
};

// Generate unique IDs
const generateClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateActivityId = () => {
  return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get activity statistics
const getActivityStats = () => {
  return {
    totalActivities: agentActivities.realTimeData.size,
    totalDecisions: agentActivities.decisions.size,
    totalPlatformActions: agentActivities.platformActions.size,
    totalOptimizations: agentActivities.optimizations.size,
    connectedClients: connectedClients.size
  };
};

// Clean old activities (run periodically)
const cleanOldActivities = () => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  [agentActivities.realTimeData, agentActivities.decisions, 
   agentActivities.platformActions, agentActivities.optimizations].forEach(map => {
    map.forEach((activity, id) => {
      if (new Date(activity.timestamp).getTime() < oneDayAgo) {
        map.delete(id);
      }
    });
  });
};

// Start periodic cleanup
setInterval(cleanOldActivities, 60 * 60 * 1000); // Every hour

module.exports = {
  initializeRealtimeManager: initializeWebSocket,
  broadcastMessage: broadcastToChannel,
  getCurrentStatus: getActivityStats,
  getWebSocketServer: () => wss,
  agentActivityEmitter,
  logAgentActivity,
  logPlatformAction,
  logOptimization,
  connectedClients
};