/**
 * Platform Connectors API Server
 * Provides API endpoints for platform integrations
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const winston = require('winston');

// Import platform connectors
const BaseConnector = require('./base');
const MetaAdsConnector = require('./meta-ads');
const GoogleAdsConnector = require('./google-ads');
const ShopifyConnector = require('./shopify');
const WhatsAppConnector = require('./whatsapp');
const TwitterConnector = require('./twitter');
const LinkedInConnector = require('./linkedin');
const TikTokConnector = require('./tiktok');
const GmailConnector = require('./gmail');

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'platform-connectors' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/platform-connectors.log' })
  ],
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Platform Connectors API', 
    version: '1.0.0',
    endpoints: {
      health: '/health',
      initialize: '/api/integrations/:platform/initialize',
      content: '/api/integrations/:platform/content',
      schedule: '/api/integrations/:platform/schedule',
      update: '/api/integrations/:platform/content/:post_id',
      delete: '/api/integrations/:platform/content'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'platform-connectors' });
});

// Platform connectors mapping
const connectors = {
  'meta-ads': MetaAdsConnector,
  'google-ads': GoogleAdsConnector,
  'shopify': ShopifyConnector,
  'whatsapp': WhatsAppConnector,
  'twitter': TwitterConnector,
  'linkedin': LinkedInConnector,
  'tiktok': TikTokConnector,
  'gmail': GmailConnector
};

// Active connector instances
const activeConnectors = new Map();

// Connector instances will be created when needed
// No pre-initialization to avoid config errors

// API Routes

// Initialize platform integration
app.post('/api/integrations/:platform/initialize', async (req, res) => {
  try {
    const { platform } = req.params;
    const { credentials } = req.body;
    
    // Validate platform
    if (!connectors[platform]) {
      return res.status(400).json({
        error: 'Unsupported platform',
        supported_platforms: Object.keys(connectors)
      });
    }
    
    // Create new connector instance
    const ConnectorClass = connectors[platform];
    const connector = new ConnectorClass();
    const result = await connector.initialize(credentials);
    
    // Store active connector
    activeConnectors.set(result.id, connector);
    
    logger.info(`Platform ${platform} initialized successfully`, { connectorId: result.id });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to initialize platform integration', { error: error.message });
    res.status(500).json({
      error: 'Failed to initialize platform integration',
      message: error.message
    });
  }
});

// Publish content to platform
app.post('/api/integrations/:platform/content', async (req, res) => {
  try {
    const { platform } = req.params;
    const { connectorId, content } = req.body;
    
    // Validate platform
    if (!connectors[platform]) {
      return res.status(400).json({
        error: 'Unsupported platform',
        supported_platforms: Object.keys(connectors)
      });
    }
    
    // Validate connector ID
    if (!connectorId || !activeConnectors.has(connectorId)) {
      return res.status(400).json({
        error: 'Invalid or missing connector ID. Please initialize the platform first.'
      });
    }
    
    // Get connector instance
    const connector = activeConnectors.get(connectorId);
    
    // Publish content
    const result = await connector.publishContent(content);
    
    logger.info(`Content published to ${platform}`, { connectorId, contentId: result.id });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to publish content', { error: error.message });
    res.status(500).json({
      error: 'Failed to publish content',
      message: error.message
    });
  }
});

// Schedule content on platform
app.post('/api/integrations/:platform/schedule', async (req, res) => {
  try {
    const { platform } = req.params;
    const { connector_id, content, schedule_time } = req.body;
    
    if (!connectors[platform]) {
      return res.status(404).json({ error: `Platform ${platform} not supported` });
    }
    
    const connector = connectors[platform];
    
    // Validate connector ID
    if (connector.id !== connector_id) {
      return res.status(401).json({ error: 'Invalid connector ID' });
    }
    
    // Schedule content
    const result = await connector.scheduleContent(content, new Date(schedule_time));
    
    return res.status(200).json({
      success: true,
      post_id: result.id,
      scheduled_time: schedule_time,
      platform
    });
  } catch (error) {
    logger.error(`Error scheduling content on ${req.params.platform}: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Update existing content
app.put('/api/integrations/:platform/content/:post_id', async (req, res) => {
  try {
    const { platform, post_id } = req.params;
    const { connector_id, content } = req.body;
    
    if (!connectors[platform]) {
      return res.status(404).json({ error: `Platform ${platform} not supported` });
    }
    
    const connector = connectors[platform];
    
    // Validate connector ID
    if (connector.id !== connector_id) {
      return res.status(401).json({ error: 'Invalid connector ID' });
    }
    
    // Update content
    const result = await connector.updateContent(post_id, content);
    
    return res.status(200).json({
      success: true,
      post_id: result.id,
      url: result.url,
      platform
    });
  } catch (error) {
    logger.error(`Error updating content on ${req.params.platform}: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Delete content
app.delete('/api/integrations/:platform/content', async (req, res) => {
  try {
    const { platform } = req.params;
    const { connector_id, post_id } = req.body;
    
    if (!connectors[platform]) {
      return res.status(404).json({ error: `Platform ${platform} not supported` });
    }
    
    const connector = connectors[platform];
    
    // Validate connector ID
    if (connector.id !== connector_id) {
      return res.status(401).json({ error: 'Invalid connector ID' });
    }
    
    // Delete content
    const result = await connector.deleteContent(post_id);
    
    return res.status(200).json({
      success: true,
      deleted: true,
      platform
    });
  } catch (error) {
    logger.error(`Error deleting content from ${req.params.platform}: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Platform Connectors API running on port ${PORT}`);
});

// Export connectors for programmatic use
module.exports = {
  BaseConnector,
  MetaAdsConnector,
  GoogleAdsConnector,
  ShopifyConnector,
  WhatsAppConnector,
  GmailConnector,
  connectors
};