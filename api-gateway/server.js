
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

// Import security middleware
const {
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  apiRateLimit,
  validateRequest,
  schemas,
  sanitizeInput,
  securityLogger,
  authenticateToken,
  corsOptions,
  logger
} = require('./middleware/security');

// Import error handling middleware
const {
  AppError,
  catchAsync,
  globalErrorHandler,
  handleUnhandledRoutes,
  gracefulShutdown
} = require('./middleware/errorHandler');

// Import monitoring middleware
const {
  requestMetrics,
  healthCheck,
  detailedMetrics,
  incrementSecurityMetric
} = require('./middleware/monitoring');

// Import cache middleware
const {
  dashboardCache,
  platformsCache,
  healthCache,
  userProfileCache,
  invalidateUserCache,
  getCacheStats
} = require('./middleware/cache');

// Import agent manager
const {
  customerServiceRequest,
  analysisRequest,
  contentGenerationRequest,
  advertisingRequest,
  emailMarketingRequest,
  pageGenerationRequest,
  getAllAgentsStatus,
  findAgentForCapability,
  getAgentCapabilities
} = require('./services/agentManager');

// Import new services
const { initializeRealtimeManager, getWebSocketServer } = require('./services/realtimeManager');
const { initializeAgentAutonomy } = require('./services/agentAutonomy');
const { initializePlatformSync, getAllPlatformData, forcePlatformSync, getSyncStatistics } = require('./services/platformDataSync');
const { initializeActivityLogger, getRecentActivities, getActivityStatistics, getAgentActivitySummary } = require('./services/agentActivityLogger');
const { initializeFeedbackSystem, getFeedbackStatistics } = require('./services/agentFeedbackSystem');
const AnalyticsService = require('./services/analyticsService');
const AuditService = require('./services/auditService');
const NotificationService = require('./services/notificationService');
const QuotaService = require('./services/quotaService');
const EncryptionService = require('./services/encryptionService');
const BackupService = require('./services/backupService');
const WebhookService = require('./services/webhookService');
const SupportService = require('./services/supportService');
const GDPRService = require('./services/gdprService');

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const organizationRoutes = require('./routes/organization');
const webhookRoutes = require('./routes/webhooks');
const analyticsRoutes = require('./routes/analytics');
const quotaRoutes = require('./routes/quota');
const rolesRoutes = require('./routes/roles');
const organizationsRoutes = require('./routes/organizations');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const chatSupportRoutes = require('./routes/chatSupport');
const gdprRoutes = require('./routes/gdpr');
const backupRoutes = require('./routes/backup');
const ssoRoutes = require('./routes/sso');
const emailVerificationRoutes = require('./routes/emailVerification');
const passwordResetRoutes = require('./routes/passwordReset');
const twoFactorRoutes = require('./routes/twoFactor');
const outgoingWebhooksRoutes = require('./routes/outgoingWebhooks');

const app = express();

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ekko-saas';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Webhook routes (before body parsing middleware)
app.use('/api/webhooks', webhookRoutes);

// Security middleware (order matters)
app.use(securityHeaders);
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(securityLogger);
app.use(requestMetrics);
app.use(generalRateLimit);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/chat-support', chatSupportRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/two-factor', twoFactorRoutes);
app.use('/api/outgoing-webhooks', outgoingWebhooksRoutes);

// Data persistence (legacy support)
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load users from file (legacy)
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
}

// Save users to file (legacy)
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Load platform connections from file (legacy)
function loadPlatformConnections() {
  try {
    if (fs.existsSync(PLATFORMS_FILE)) {
      const data = fs.readFileSync(PLATFORMS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading platform connections:', error);
  }
  return {};
}

// Save platform connections to file (legacy)
function savePlatformConnections(connections) {
  try {
    fs.writeFileSync(PLATFORMS_FILE, JSON.stringify(connections, null, 2));
  } catch (error) {
    console.error('Error saving platform connections:', error);
  }
}

// Health check endpoint
app.get('/health', healthCache, healthCheck);

// Metrics endpoint
app.get('/metrics', authenticateToken, detailedMetrics);

// Cache management endpoints
app.get('/cache/stats', authenticateToken, async (req, res) => {
  try {
    const stats = getCacheStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/cache/user/:userId?', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    invalidateUserCache(userId);
    res.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// OAuth simulation endpoint (for testing)
app.get('/api/auth/oauth/simulate', (req, res) => {
  const { platform, success = 'true' } = req.query;
  
  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter is required' });
  }
  
  const simulatedData = {
    meta: {
      success: {
        access_token: 'simulated_meta_token_12345',
        user_id: '1234567890',
        expires_in: 5183944
      },
      error: { error: 'access_denied', error_description: 'User denied access' }
    },
    instagram: {
      success: {
        access_token: 'simulated_instagram_token_67890',
        user_id: '0987654321'
      },
      error: { error: 'access_denied' }
    },
    tiktok: {
      success: {
        access_token: 'simulated_tiktok_token_abcde',
        open_id: 'tiktok_user_12345',
        scope: 'user.info.basic,video.list'
      },
      error: { error: 'access_denied' }
    },
    google: {
      success: {
        access_token: 'simulated_google_token_fghij',
        refresh_token: 'simulated_refresh_token',
        scope: 'https://www.googleapis.com/auth/adwords'
      },
      error: { error: 'access_denied' }
    },
    shopify: {
      success: {
        access_token: 'simulated_shopify_token_klmno',
        scope: 'read_products,write_products'
      },
      error: { error: 'access_denied' }
    }
  };
  
  const result = success === 'true' ? simulatedData[platform]?.success : simulatedData[platform]?.error;
  
  if (!result) {
    return res.status(400).json({ error: 'Unsupported platform for simulation' });
  }
  
  res.json(result);
});

// Dashboard endpoint (legacy)
app.get('/api/dashboard', authenticateToken, dashboardCache, (req, res) => {
  res.json({
    success: true,
    data: {
      connectedPlatforms: 3,
      activeAgents: 5,
      totalRequests: 1247,
      successRate: 94.2,
      recentActivity: [
        { type: 'content_generated', platform: 'Instagram', time: '2 minutes ago' },
        { type: 'analysis_completed', platform: 'TikTok', time: '15 minutes ago' },
        { type: 'campaign_created', platform: 'Meta', time: '1 hour ago' }
      ]
    }
  });
});

// Legacy user and platform data
let users = loadUsers();
let platformConnections = loadPlatformConnections();

// Legacy auth endpoints (keeping for backward compatibility)
app.post('/api/auth/register', authRateLimit, validateRequest(schemas.register), (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user
  const newUser = {
    id: Date.now().toString(),
    email,
    password, // In production, this should be hashed
    firstName,
    lastName,
    createdAt: new Date().toISOString(),
    platforms: {}
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Generate token (simplified)
  const token = Buffer.from(JSON.stringify({ id: newUser.id, email: newUser.email })).toString('base64');
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    }
  });
});

app.post('/api/auth/login', authRateLimit, validateRequest(schemas.login), (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate token (simplified)
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email })).toString('base64');
  
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
});

// Get current user (legacy)
app.get('/api/users/me', authenticateToken, userProfileCache, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      platforms: user.platforms || {},
      createdAt: user.createdAt
    }
  });
});

// OAuth endpoints (legacy)
app.get('/api/auth/oauth/:platform', (req, res) => {
  const { platform } = req.params;
  
  const oauthConfigs = {
    meta: {
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      clientId: process.env.META_CLIENT_ID,
      scope: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/meta`
    },
    instagram: {
      authUrl: 'https://api.instagram.com/oauth/authorize',
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      scope: 'user_profile,user_media',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/instagram`
    },
    tiktok: {
      authUrl: 'https://www.tiktok.com/auth/authorize/',
      clientId: process.env.TIKTOK_CLIENT_ID,
      scope: 'user.info.basic,video.list',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/tiktok`
    },
    google: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientId: process.env.GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/adwords',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/google`
    },
    shopify: {
      authUrl: 'https://myshopify.com/admin/oauth/authorize',
      clientId: process.env.SHOPIFY_CLIENT_ID,
      scope: 'read_products,write_products,read_orders',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/shopify`
    },
    linkedin: {
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      clientId: process.env.LINKEDIN_CLIENT_ID,
      scope: 'r_liteprofile,r_emailaddress,w_member_social',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/linkedin`
    },
    twitter: {
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      clientId: process.env.TWITTER_CLIENT_ID,
      scope: 'tweet.read,tweet.write,users.read',
      redirectUri: `${process.env.API_GATEWAY_URL}/api/auth/oauth/callback/twitter`
    }
  };
  
  const config = oauthConfigs[platform];
  if (!config) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }
  
  if (!config.clientId) {
    return res.status(500).json({ error: `${platform.toUpperCase()} client ID not configured` });
  }
  
  const state = Buffer.from(JSON.stringify({ platform, timestamp: Date.now() })).toString('base64');
  
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.append('client_id', config.clientId);
  authUrl.searchParams.append('redirect_uri', config.redirectUri);
  authUrl.searchParams.append('scope', config.scope);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  
  res.json({
    success: true,
    authUrl: authUrl.toString(),
    state
  });
});

// OAuth callback (legacy)
app.get('/api/auth/oauth/callback/:platform', (req, res) => {
  const { platform } = req.params;
  const { code, state, error } = req.query;
  
  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/platforms?error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/platforms?error=no_code`);
  }
  
  // In a real implementation, you would:
  // 1. Verify the state parameter
  // 2. Exchange the code for an access token
  // 3. Store the token securely
  // 4. Redirect to success page
  
  res.redirect(`${process.env.FRONTEND_URL}/dashboard/platforms?success=${platform}`);
});

// Platform management endpoints (legacy)
app.get('/api/users/platforms', authenticateToken, platformsCache, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const userPlatforms = user.platforms || {};
  const platformList = Object.keys(userPlatforms).map(platform => ({
    platform,
    connected: true,
    connectedAt: userPlatforms[platform].connectedAt || new Date().toISOString(),
    status: 'active'
  }));
  
  res.json({
    success: true,
    platforms: platformList,
    total: platformList.length
  });
});

// Agent endpoints
app.get('/api/agents/status', authenticateToken, (req, res) => {
  catchAsync(async () => {
    const agentsStatus = await getAllAgentsStatus();
    res.json({
      success: true,
      agents: agentsStatus
    });
  })(req, res);
});

app.get('/api/agents/:agentType/capabilities', authenticateToken, (req, res) => {
  catchAsync(async () => {
    const { agentType } = req.params;
    const capabilities = await getAgentCapabilities(agentType);
    
    if (!capabilities) {
      return res.status(404).json({ error: 'Agent type not found' });
    }
    
    res.json({
      success: true,
      agentType,
      capabilities
    });
  })(req, res);
});

// Smart agent request routing
app.post('/api/agents/smart-request', apiRateLimit, authenticateToken, validateRequest(schemas.agentRequest), async (req, res) => {
  catchAsync(async () => {
    const { request, context } = req.body;
    
    // Find the best agent for this request
    const bestAgent = await findAgentForCapability(request, context);
    
    if (!bestAgent) {
      return res.status(400).json({ error: 'No suitable agent found for this request' });
    }
    
    let result;
    switch (bestAgent.type) {
      case 'customer-service':
        result = await customerServiceRequest(request, context);
        break;
      case 'content-generation':
        result = await contentGenerationRequest(request, context);
        break;
      case 'analysis':
        result = await analysisRequest(request, context);
        break;
      case 'advertising':
        result = await advertisingRequest(request, context);
        break;
      case 'email-marketing':
        result = await emailMarketingRequest(request, context);
        break;
      case 'page-generation':
        result = await pageGenerationRequest(request, context);
        break;
      default:
        return res.status(400).json({ error: 'Unknown agent type' });
    }
    
    res.json({
      success: true,
      agent: bestAgent,
      result
    });
  })(req, res);
});

// Specific agent endpoints
app.post('/api/agents/customer-service', apiRateLimit, authenticateToken, validateRequest(schemas.agentRequest), async (req, res) => {
  catchAsync(async () => {
    const { request, context } = req.body;
    const result = await customerServiceRequest(request, context);
    
    res.json({
      success: true,
      agent: 'customer-service',
      result
    });
  })(req, res);
});

app.post('/api/agents/content-generation', apiRateLimit, authenticateToken, validateRequest(schemas.agentRequest), async (req, res) => {
  catchAsync(async () => {
    const { request, context } = req.body;
    const result = await contentGenerationRequest(request, context);
    
    res.json({
      success: true,
      agent: 'content-generation',
      result
    });
  })(req, res);
});

app.post('/api/agents/analysis', apiRateLimit, authenticateToken, validateRequest(schemas.agentRequest), async (req, res) => {
  catchAsync(async () => {
    const { request, context } = req.body;
    const result = await analysisRequest(request, context);
    
    res.json({
      success: true,
      agent: 'analysis',
      result
    });
  })(req, res);
});

// Generic agent request handler
app.post('/api/agents/:agentType/request', apiRateLimit, authenticateToken, validateRequest(schemas.agentRequest), async (req, res) => {
  catchAsync(async () => {
    const { agentType } = req.params;
    const { request, context } = req.body;
    
    let result;
    switch (agentType) {
      case 'customer-service':
        result = await customerServiceRequest(request, context);
        break;
      case 'content-generation':
        result = await contentGenerationRequest(request, context);
        break;
      case 'analysis':
        result = await analysisRequest(request, context);
        break;
      case 'advertising':
        result = await advertisingRequest(request, context);
        break;
      case 'email-marketing':
        result = await emailMarketingRequest(request, context);
        break;
      case 'page-generation':
        result = await pageGenerationRequest(request, context);
        break;
      default:
        return res.status(400).json({ error: 'Unknown agent type' });
    }
    
    res.json({
      success: true,
      agent: agentType,
      result
    });
  })(req, res);
});

// Integrations endpoint
app.get('/api/integrations', (req, res) => {
  res.json({
    success: true,
    integrations: [
      { name: 'Meta Business', status: 'available', category: 'social' },
      { name: 'Instagram', status: 'available', category: 'social' },
      { name: 'TikTok Business', status: 'available', category: 'social' },
      { name: 'Google Ads', status: 'available', category: 'advertising' },
      { name: 'Shopify', status: 'available', category: 'ecommerce' }
    ]
  });
});

// Initialize services
initializeRealtimeManager();
initializeAgentAutonomy();
initializePlatformSync();
initializeActivityLogger();
initializeFeedbackSystem();

// Initialize SaaS services
const analyticsService = AnalyticsService;
const auditService = AuditService;
const notificationService = NotificationService;
const quotaService = QuotaService;
const encryptionService = EncryptionService;
const backupService = BackupService;
const webhookService = WebhookService;
const supportService = SupportService;
const gdprService = GDPRService;

// Initialize notification service email transporter
notificationService.initializeEmailTransporter().catch(console.error);

// Start background tasks
// Note: Analytics calculations can be triggered manually via API endpoints
// quotaService.startMonthlyReset();
// auditService.startCleanupScheduler();
// backupService.startScheduledBackups();
// webhookService.startRetryScheduler();

// Platform data endpoints
app.get('/api/platform-data', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const allData = await getAllPlatformData();
    res.json({
      success: true,
      data: allData
    });
  })(req, res);
});

app.get('/api/platform-data/:platform', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const { platform } = req.params;
    const data = await getAllPlatformData(platform);
    
    if (!data[platform]) {
      return res.status(404).json({ error: 'Platform data not found' });
    }
    
    res.json({
      success: true,
      platform,
      data: data[platform]
    });
  })(req, res);
});

app.post('/api/platform-data/:platform/sync', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const { platform } = req.params;
    const result = await forcePlatformSync(platform);
    
    res.json({
      success: true,
      platform,
      result
    });
  })(req, res);
});

app.get('/api/sync-statistics', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const stats = await getSyncStatistics();
    res.json({
      success: true,
      statistics: stats
    });
  })(req, res);
});

// Agent activity endpoints
app.get('/api/agent-activities', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const { limit = 50, offset = 0, agentType, agentId } = req.query;
    const activities = await getRecentActivities({
      limit: parseInt(limit),
      offset: parseInt(offset),
      agentType,
      agentId
    });
    
    res.json({
      success: true,
      activities
    });
  })(req, res);
});

app.get('/api/agent-activities/statistics', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const stats = await getActivityStatistics();
    res.json({
      success: true,
      statistics: stats
    });
  })(req, res);
});

app.get('/api/agent-activities/summary/:agentType/:agentId', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const { agentType, agentId } = req.params;
    const summary = await getAgentActivitySummary(agentType, agentId);
    
    res.json({
      success: true,
      agentType,
      agentId,
      summary
    });
  })(req, res);
});

// Agent feedback endpoints
app.get('/api/agent-feedback/statistics', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const stats = await getFeedbackStatistics();
    res.json({
      success: true,
      statistics: stats
    });
  })(req, res);
});

// Dashboard summary endpoint
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  catchAsync(async () => {
    const [agentsStatus, syncStats, activityStats, feedbackStats] = await Promise.all([
      getAllAgentsStatus(),
      getSyncStatistics(),
      getActivityStatistics(),
      getFeedbackStatistics()
    ]);
    
    res.json({
      success: true,
      summary: {
        agents: {
          total: agentsStatus.length,
          active: agentsStatus.filter(a => a.status === 'healthy').length,
          status: agentsStatus
        },
        sync: syncStats,
        activity: activityStats,
        feedback: feedbackStats,
        lastUpdated: new Date().toISOString()
      }
    });
  })(req, res);
});

// Error handling
app.all('*', handleUnhandledRoutes);
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`💬 Chat Support WebSocket: ws://localhost:${PORT}/socket.io/chat`);
});

// Initialize Chat Support WebSocket
const ChatSocketHandler = require('./websocket/chatSocketHandler');
const chatSocketHandler = new ChatSocketHandler(server);

// WebSocket server setup
const wsServer = getWebSocketServer();
if (wsServer) {
  server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit('connection', ws, request);
    });
  });
}

// Graceful shutdown
gracefulShutdown(server);

module.exports = app;
