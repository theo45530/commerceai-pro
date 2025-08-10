const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const Organization = require('../models/Organization');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const logger = require('../../logging/logger-config');

// Webhook endpoint schema
const webhookEndpointSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP or HTTPS URL'
    }
  },
  secret: {
    type: String,
    required: true
  },
  events: [{
    type: String,
    enum: [
      'user.created',
      'user.updated',
      'user.deleted',
      'organization.updated',
      'subscription.created',
      'subscription.updated',
      'subscription.cancelled',
      'payment.succeeded',
      'payment.failed',
      'invoice.created',
      'invoice.paid',
      'invoice.failed',
      'agent.created',
      'agent.updated',
      'agent.deleted',
      'usage.limit_reached',
      'usage.overage',
      'support.ticket_created',
      'support.ticket_updated',
      'audit.security_event',
      'system.maintenance'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  retryPolicy: {
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 1000 }, // milliseconds
    backoffMultiplier: { type: Number, default: 2 }
  },
  timeout: {
    type: Number,
    default: 30000 // 30 seconds
  },
  headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  lastTriggered: Date,
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  lastError: {
    message: String,
    timestamp: Date,
    statusCode: Number
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Webhook delivery log schema
const webhookDeliverySchema = new mongoose.Schema({
  webhookEndpointId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookEndpoint',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'retrying'],
    default: 'pending',
    index: true
  },
  httpStatus: Number,
  responseBody: String,
  responseHeaders: {
    type: Map,
    of: String
  },
  attempts: [{
    timestamp: { type: Date, default: Date.now },
    httpStatus: Number,
    responseTime: Number, // milliseconds
    error: String
  }],
  deliveredAt: Date,
  nextRetryAt: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
webhookEndpointSchema.index({ organizationId: 1, isActive: 1 });
webhookEndpointSchema.index({ events: 1, isActive: 1 });
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
webhookDeliverySchema.index({ createdAt: 1 });
webhookDeliverySchema.index({ eventType: 1, createdAt: -1 });

const WebhookEndpoint = mongoose.model('WebhookEndpoint', webhookEndpointSchema);
const WebhookDelivery = mongoose.model('WebhookDelivery', webhookDeliverySchema);

class WebhookService {
  constructor() {
    this.retryQueue = [];
    this.isProcessingRetries = false;
    
    // Start retry processor
    this.startRetryProcessor();
  }

  // Create webhook endpoint
  async createEndpoint(organizationId, endpointData) {
    try {
      const {
        name,
        url,
        events,
        retryPolicy = {},
        timeout = 30000,
        headers = {},
        metadata = {}
      } = endpointData;

      // Generate secret for webhook signing
      const secret = crypto.randomBytes(32).toString('hex');

      const endpoint = new WebhookEndpoint({
        organizationId,
        name,
        url,
        secret,
        events,
        retryPolicy: {
          maxRetries: retryPolicy.maxRetries || 3,
          retryDelay: retryPolicy.retryDelay || 1000,
          backoffMultiplier: retryPolicy.backoffMultiplier || 2
        },
        timeout,
        headers: new Map(Object.entries(headers)),
        metadata: new Map(Object.entries(metadata))
      });

      await endpoint.save();

      // Log endpoint creation
      await auditService.logEvent({
        eventType: 'webhook_endpoint_created',
        eventCategory: 'webhook',
        eventAction: 'create_endpoint',
        organizationId,
        metadata: {
          endpointId: endpoint._id,
          name,
          url,
          events
        }
      });

      return endpoint;
    } catch (error) {
      logger.error('Create webhook endpoint error:', error);
      throw error;
    }
  }

  // Update webhook endpoint
  async updateEndpoint(endpointId, organizationId, updateData) {
    try {
      const endpoint = await WebhookEndpoint.findOne({
        _id: endpointId,
        organizationId
      });

      if (!endpoint) {
        throw new Error('Webhook endpoint not found');
      }

      // Update allowed fields
      const allowedUpdates = ['name', 'url', 'events', 'isActive', 'retryPolicy', 'timeout', 'headers', 'metadata'];
      
      for (const field of allowedUpdates) {
        if (updateData[field] !== undefined) {
          if (field === 'headers' || field === 'metadata') {
            endpoint[field] = new Map(Object.entries(updateData[field]));
          } else {
            endpoint[field] = updateData[field];
          }
        }
      }

      await endpoint.save();

      // Log endpoint update
      await auditService.logEvent({
        eventType: 'webhook_endpoint_updated',
        eventCategory: 'webhook',
        eventAction: 'update_endpoint',
        organizationId,
        metadata: {
          endpointId: endpoint._id,
          updates: Object.keys(updateData)
        }
      });

      return endpoint;
    } catch (error) {
      logger.error('Update webhook endpoint error:', error);
      throw error;
    }
  }

  // Delete webhook endpoint
  async deleteEndpoint(endpointId, organizationId) {
    try {
      const endpoint = await WebhookEndpoint.findOneAndDelete({
        _id: endpointId,
        organizationId
      });

      if (!endpoint) {
        throw new Error('Webhook endpoint not found');
      }

      // Delete associated delivery logs (optional, or keep for audit)
      // await WebhookDelivery.deleteMany({ webhookEndpointId: endpointId });

      // Log endpoint deletion
      await auditService.logEvent({
        eventType: 'webhook_endpoint_deleted',
        eventCategory: 'webhook',
        eventAction: 'delete_endpoint',
        organizationId,
        metadata: {
          endpointId: endpoint._id,
          name: endpoint.name,
          url: endpoint.url
        }
      });

      return endpoint;
    } catch (error) {
      logger.error('Delete webhook endpoint error:', error);
      throw error;
    }
  }

  // Get webhook endpoints for organization
  async getEndpoints(organizationId, filters = {}) {
    try {
      const query = { organizationId };
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      
      if (filters.event) {
        query.events = { $in: [filters.event] };
      }

      const endpoints = await WebhookEndpoint.find(query)
        .sort({ createdAt: -1 })
        .lean();

      // Convert Maps to Objects for JSON serialization
      return endpoints.map(endpoint => ({
        ...endpoint,
        headers: Object.fromEntries(endpoint.headers || new Map()),
        metadata: Object.fromEntries(endpoint.metadata || new Map())
      }));
    } catch (error) {
      logger.error('Get webhook endpoints error:', error);
      throw error;
    }
  }

  // Trigger webhook for event
  async triggerWebhook(eventType, eventData, organizationId) {
    try {
      // Find active endpoints that listen to this event
      const endpoints = await WebhookEndpoint.find({
        organizationId,
        isActive: true,
        events: { $in: [eventType] }
      });

      if (endpoints.length === 0) {
        logger.debug(`No webhook endpoints found for event ${eventType} in organization ${organizationId}`);
        return [];
      }

      const deliveries = [];

      for (const endpoint of endpoints) {
        try {
          const delivery = await this.createDelivery(endpoint, eventType, eventData);
          deliveries.push(delivery);
          
          // Attempt immediate delivery
          this.deliverWebhook(delivery._id).catch(error => {
            logger.error(`Immediate webhook delivery failed for ${delivery._id}:`, error);
          });
        } catch (error) {
          logger.error(`Failed to create webhook delivery for endpoint ${endpoint._id}:`, error);
        }
      }

      return deliveries;
    } catch (error) {
      logger.error('Trigger webhook error:', error);
      throw error;
    }
  }

  // Create webhook delivery record
  async createDelivery(endpoint, eventType, eventData) {
    try {
      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      // Create payload
      const payload = {
        id: eventId,
        type: eventType,
        timestamp,
        data: eventData,
        organization_id: endpoint.organizationId
      };

      // Generate signature
      const signature = this.generateSignature(payload, endpoint.secret);

      const delivery = new WebhookDelivery({
        webhookEndpointId: endpoint._id,
        organizationId: endpoint.organizationId,
        eventType,
        eventId,
        payload,
        signature,
        status: 'pending'
      });

      await delivery.save();
      return delivery;
    } catch (error) {
      logger.error('Create webhook delivery error:', error);
      throw error;
    }
  }

  // Generate webhook signature
  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  // Deliver webhook
  async deliverWebhook(deliveryId) {
    try {
      const delivery = await WebhookDelivery.findById(deliveryId)
        .populate('webhookEndpointId');

      if (!delivery) {
        throw new Error('Webhook delivery not found');
      }

      const endpoint = delivery.webhookEndpointId;
      if (!endpoint || !endpoint.isActive) {
        delivery.status = 'failed';
        delivery.attempts.push({
          timestamp: new Date(),
          error: 'Endpoint not found or inactive'
        });
        await delivery.save();
        return;
      }

      const startTime = Date.now();
      
      try {
        // Prepare headers
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'CommerceAI-Webhooks/1.0',
          'X-Webhook-Signature': `sha256=${delivery.signature}`,
          'X-Webhook-Event': delivery.eventType,
          'X-Webhook-ID': delivery.eventId,
          'X-Webhook-Timestamp': new Date(delivery.createdAt).toISOString(),
          ...Object.fromEntries(endpoint.headers || new Map())
        };

        // Make HTTP request
        const response = await axios.post(endpoint.url, delivery.payload, {
          headers,
          timeout: endpoint.timeout,
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        });

        const responseTime = Date.now() - startTime;

        // Record attempt
        delivery.attempts.push({
          timestamp: new Date(),
          httpStatus: response.status,
          responseTime
        });

        if (response.status >= 200 && response.status < 300) {
          // Success
          delivery.status = 'delivered';
          delivery.httpStatus = response.status;
          delivery.responseBody = typeof response.data === 'string' 
            ? response.data.substring(0, 1000) 
            : JSON.stringify(response.data).substring(0, 1000);
          delivery.responseHeaders = new Map(Object.entries(response.headers || {}));
          delivery.deliveredAt = new Date();
          
          // Update endpoint success count
          endpoint.successCount += 1;
          endpoint.lastTriggered = new Date();
          await endpoint.save();
        } else {
          // HTTP error
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Record failed attempt
        delivery.attempts.push({
          timestamp: new Date(),
          httpStatus: error.response?.status,
          responseTime,
          error: error.message
        });

        // Update endpoint failure count
        endpoint.failureCount += 1;
        endpoint.lastError = {
          message: error.message,
          timestamp: new Date(),
          statusCode: error.response?.status
        };
        await endpoint.save();

        // Check if we should retry
        if (delivery.attempts.length < endpoint.retryPolicy.maxRetries) {
          delivery.status = 'retrying';
          
          // Calculate next retry time with exponential backoff
          const retryDelay = endpoint.retryPolicy.retryDelay * 
            Math.pow(endpoint.retryPolicy.backoffMultiplier, delivery.attempts.length - 1);
          
          delivery.nextRetryAt = new Date(Date.now() + retryDelay);
        } else {
          delivery.status = 'failed';
          delivery.httpStatus = error.response?.status;
          delivery.responseBody = error.message;
        }
      }

      await delivery.save();
      
      // Log delivery attempt
      await auditService.logEvent({
        eventType: 'webhook_delivered',
        eventCategory: 'webhook',
        eventAction: delivery.status === 'delivered' ? 'delivery_success' : 'delivery_failed',
        organizationId: delivery.organizationId,
        metadata: {
          deliveryId: delivery._id,
          endpointId: endpoint._id,
          eventType: delivery.eventType,
          status: delivery.status,
          attempts: delivery.attempts.length,
          httpStatus: delivery.httpStatus
        }
      });

    } catch (error) {
      logger.error('Deliver webhook error:', error);
      throw error;
    }
  }

  // Start retry processor
  startRetryProcessor() {
    setInterval(async () => {
      if (this.isProcessingRetries) return;
      
      this.isProcessingRetries = true;
      
      try {
        await this.processRetries();
      } catch (error) {
        logger.error('Retry processor error:', error);
      } finally {
        this.isProcessingRetries = false;
      }
    }, 60000); // Check every minute
  }

  // Process webhook retries
  async processRetries() {
    try {
      const now = new Date();
      
      const retriesToProcess = await WebhookDelivery.find({
        status: 'retrying',
        nextRetryAt: { $lte: now }
      }).limit(100); // Process up to 100 retries at a time

      for (const delivery of retriesToProcess) {
        try {
          await this.deliverWebhook(delivery._id);
        } catch (error) {
          logger.error(`Retry delivery failed for ${delivery._id}:`, error);
        }
      }

      if (retriesToProcess.length > 0) {
        logger.info(`Processed ${retriesToProcess.length} webhook retries`);
      }
    } catch (error) {
      logger.error('Process retries error:', error);
    }
  }

  // Get webhook deliveries
  async getDeliveries(organizationId, filters = {}) {
    try {
      const query = { organizationId };
      
      if (filters.endpointId) {
        query.webhookEndpointId = filters.endpointId;
      }
      
      if (filters.eventType) {
        query.eventType = filters.eventType;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const deliveries = await WebhookDelivery.find(query)
        .populate('webhookEndpointId', 'name url')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .lean();

      return deliveries.map(delivery => ({
        ...delivery,
        responseHeaders: Object.fromEntries(delivery.responseHeaders || new Map())
      }));
    } catch (error) {
      logger.error('Get webhook deliveries error:', error);
      throw error;
    }
  }

  // Test webhook endpoint
  async testEndpoint(endpointId, organizationId) {
    try {
      const endpoint = await WebhookEndpoint.findOne({
        _id: endpointId,
        organizationId
      });

      if (!endpoint) {
        throw new Error('Webhook endpoint not found');
      }

      // Create test event
      const testEventData = {
        test: true,
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString()
      };

      const delivery = await this.createDelivery(endpoint, 'system.test', testEventData);
      await this.deliverWebhook(delivery._id);

      // Return updated delivery
      return await WebhookDelivery.findById(delivery._id).lean();
    } catch (error) {
      logger.error('Test webhook endpoint error:', error);
      throw error;
    }
  }

  // Get webhook statistics
  async getStatistics(organizationId, filters = {}) {
    try {
      const query = { organizationId };
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const [totalDeliveries, statusStats, eventStats, endpointStats] = await Promise.all([
        WebhookDelivery.countDocuments(query),
        
        WebhookDelivery.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        
        WebhookDelivery.aggregate([
          { $match: query },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        
        WebhookDelivery.aggregate([
          { $match: query },
          {
            $lookup: {
              from: 'webhookendpoints',
              localField: 'webhookEndpointId',
              foreignField: '_id',
              as: 'endpoint'
            }
          },
          { $unwind: '$endpoint' },
          {
            $group: {
              _id: '$webhookEndpointId',
              name: { $first: '$endpoint.name' },
              count: { $sum: 1 },
              successCount: {
                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
              }
            }
          },
          { $sort: { count: -1 } }
        ])
      ]);

      return {
        totalDeliveries,
        statusBreakdown: statusStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        topEvents: eventStats,
        endpointPerformance: endpointStats.map(stat => ({
          ...stat,
          successRate: stat.count > 0 ? (stat.successCount / stat.count * 100).toFixed(2) : 0
        }))
      };
    } catch (error) {
      logger.error('Get webhook statistics error:', error);
      throw error;
    }
  }

  // Clean up old webhook deliveries
  async cleanupOldDeliveries(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const result = await WebhookDelivery.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['delivered', 'failed'] } // Keep retrying deliveries
      });
      
      logger.info(`Cleaned up ${result.deletedCount} old webhook deliveries`);
      return result;
    } catch (error) {
      logger.error('Cleanup old deliveries error:', error);
      throw error;
    }
  }
}

module.exports = new WebhookService();
module.exports.WebhookEndpoint = WebhookEndpoint;
module.exports.WebhookDelivery = WebhookDelivery;