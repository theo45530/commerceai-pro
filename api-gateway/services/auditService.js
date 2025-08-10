const mongoose = require('mongoose');
const logger = require('../../logging/logger-config');

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: true,
    enum: [
      'user.login',
      'user.logout',
      'user.register',
      'user.update',
      'user.delete',
      'user.password_change',
      'user.2fa_enable',
      'user.2fa_disable',
      'user.role_change',
      'organization.create',
      'organization.update',
      'organization.delete',
      'organization.member_add',
      'organization.member_remove',
      'subscription.create',
      'subscription.update',
      'subscription.cancel',
      'payment.success',
      'payment.failed',
      'agent.create',
      'agent.update',
      'agent.delete',
      'agent.execute',
      'platform.connect',
      'platform.disconnect',
      'api.access',
      'security.breach_attempt',
      'security.rate_limit_exceeded',
      'system.backup',
      'system.maintenance',
      'data.export',
      'data.import',
      'gdpr.consent_given',
      'gdpr.data_deletion'
    ]
  },
  
  // Actor Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userEmail: {
    type: String,
    default: null
  },
  userRole: {
    type: String,
    default: null
  },
  
  // Organization Context
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  
  // Event Details
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    default: null
  },
  resourceId: {
    type: String,
    default: null
  },
  
  // Request Information
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  requestId: {
    type: String,
    default: null
  },
  
  // Event Data
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Result
  success: {
    type: Boolean,
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  
  // Risk Assessment
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Compliance
  gdprRelevant: {
    type: Boolean,
    default: false
  },
  retentionPeriod: {
    type: Date,
    default: function() {
      // Default retention: 7 years for compliance
      return new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  // Prevent modification of audit logs
  strict: true
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ riskLevel: 1, createdAt: -1 });
auditLogSchema.index({ retentionPeriod: 1 });
auditLogSchema.index({ 'metadata.sessionId': 1 });

// Prevent updates to audit logs
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs cannot be modified');
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class AuditService {
  /**
   * Log an audit event
   * @param {object} eventData - Event data
   * @returns {Promise<object>} Created audit log
   */
  async logEvent(eventData) {
    try {
      const auditLog = new AuditLog({
        ...eventData,
        riskLevel: this.assessRiskLevel(eventData.eventType, eventData.metadata),
        gdprRelevant: this.isGdprRelevant(eventData.eventType)
      });

      await auditLog.save();
      
      // Log high-risk events immediately
      if (auditLog.riskLevel === 'high' || auditLog.riskLevel === 'critical') {
        logger.warn('High-risk audit event:', {
          eventType: auditLog.eventType,
          userId: auditLog.userId,
          ipAddress: auditLog.ipAddress,
          riskLevel: auditLog.riskLevel
        });
      }

      return auditLog;
    } catch (error) {
      logger.error('Error logging audit event:', error);
      throw error;
    }
  }

  /**
   * Log user authentication event
   * @param {string} eventType - Type of auth event
   * @param {object} user - User object
   * @param {object} req - Request object
   * @param {boolean} success - Success status
   * @param {string} errorMessage - Error message if failed
   * @returns {Promise<object>} Audit log
   */
  async logAuthEvent(eventType, user, req, success, errorMessage = null) {
    return this.logEvent({
      eventType,
      userId: user?._id,
      userEmail: user?.email,
      userRole: user?.role,
      organizationId: user?.organizationId,
      action: eventType.split('.')[1], // Extract action from eventType
      resource: 'user',
      resourceId: user?._id?.toString(),
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      success,
      errorMessage,
      metadata: {
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log data modification event
   * @param {string} eventType - Type of event
   * @param {object} user - User performing action
   * @param {object} req - Request object
   * @param {string} resource - Resource type
   * @param {string} resourceId - Resource ID
   * @param {object} oldValues - Previous values
   * @param {object} newValues - New values
   * @param {boolean} success - Success status
   * @returns {Promise<object>} Audit log
   */
  async logDataEvent(eventType, user, req, resource, resourceId, oldValues, newValues, success) {
    return this.logEvent({
      eventType,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      organizationId: user.organizationId,
      action: eventType.split('.')[1],
      resource,
      resourceId,
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      oldValues: this.sanitizeData(oldValues),
      newValues: this.sanitizeData(newValues),
      success,
      metadata: {
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log security event
   * @param {string} eventType - Type of security event
   * @param {object} req - Request object
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Audit log
   */
  async logSecurityEvent(eventType, req, metadata = {}) {
    return this.logEvent({
      eventType,
      action: eventType.split('.')[1],
      resource: 'security',
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      success: false, // Security events are typically failures
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get audit logs with filtering and pagination
   * @param {object} filters - Filter criteria
   * @param {object} options - Query options
   * @returns {Promise<object>} Paginated audit logs
   */
  async getAuditLogs(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = this.buildQuery(filters);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'email firstName lastName')
          .populate('organizationId', 'name')
          .sort(sort)
          .limit(limit * 1)
          .skip((page - 1) * limit)
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {object} filters - Filter criteria
   * @returns {Promise<object>} Audit statistics
   */
  async getAuditStats(filters = {}) {
    try {
      const query = this.buildQuery(filters);
      
      const [eventTypeStats, riskLevelStats, dailyStats] = await Promise.all([
        // Event type distribution
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        
        // Risk level distribution
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
        ]),
        
        // Daily activity
        AuditLog.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': -1 } },
          { $limit: 30 }
        ])
      ]);

      return {
        eventTypes: eventTypeStats,
        riskLevels: riskLevelStats,
        dailyActivity: dailyStats
      };
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   * @param {object} filters - Filter criteria
   * @param {string} format - Export format (json, csv)
   * @returns {Promise<string>} Exported data
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const query = this.buildQuery(filters);
      const logs = await AuditLog.find(query)
        .populate('userId', 'email firstName lastName')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      if (format === 'csv') {
        return this.convertToCSV(logs);
      }

      return JSON.stringify(logs, null, 2);
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   * @returns {Promise<number>} Number of deleted logs
   */
  async cleanupOldLogs() {
    try {
      const result = await AuditLog.deleteMany({
        retentionPeriod: { $lt: new Date() }
      });

      logger.info(`Cleaned up ${result.deletedCount} old audit logs`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Assess risk level based on event type and metadata
   * @param {string} eventType - Event type
   * @param {object} metadata - Event metadata
   * @returns {string} Risk level
   */
  assessRiskLevel(eventType, metadata = {}) {
    const highRiskEvents = [
      'user.delete',
      'organization.delete',
      'security.breach_attempt',
      'gdpr.data_deletion'
    ];

    const mediumRiskEvents = [
      'user.role_change',
      'user.2fa_disable',
      'subscription.cancel',
      'platform.disconnect',
      'data.export'
    ];

    if (highRiskEvents.includes(eventType)) {
      return 'high';
    }

    if (mediumRiskEvents.includes(eventType)) {
      return 'medium';
    }

    // Check for suspicious patterns
    if (metadata.failedAttempts && metadata.failedAttempts > 5) {
      return 'high';
    }

    if (eventType.includes('security.')) {
      return 'critical';
    }

    return 'low';
  }

  /**
   * Check if event is GDPR relevant
   * @param {string} eventType - Event type
   * @returns {boolean} GDPR relevance
   */
  isGdprRelevant(eventType) {
    const gdprEvents = [
      'user.register',
      'user.update',
      'user.delete',
      'gdpr.consent_given',
      'gdpr.data_deletion',
      'data.export'
    ];

    return gdprEvents.includes(eventType);
  }

  /**
   * Get client IP address from request
   * @param {object} req - Request object
   * @returns {string} IP address
   */
  getClientIp(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
  }

  /**
   * Sanitize sensitive data before logging
   * @param {object} data - Data to sanitize
   * @returns {object} Sanitized data
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credentials'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Build MongoDB query from filters
   * @param {object} filters - Filter criteria
   * @returns {object} MongoDB query
   */
  buildQuery(filters) {
    const query = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.organizationId) {
      query.organizationId = filters.organizationId;
    }

    if (filters.eventType) {
      query.eventType = filters.eventType;
    }

    if (filters.riskLevel) {
      query.riskLevel = filters.riskLevel;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    if (filters.ipAddress) {
      query.ipAddress = filters.ipAddress;
    }

    return query;
  }

  /**
   * Convert logs to CSV format
   * @param {Array} logs - Audit logs
   * @returns {string} CSV data
   */
  convertToCSV(logs) {
    if (!logs.length) {
      return '';
    }

    const headers = [
      'timestamp',
      'eventType',
      'userEmail',
      'action',
      'resource',
      'ipAddress',
      'success',
      'riskLevel'
    ];

    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.createdAt.toISOString(),
        log.eventType,
        log.userEmail || '',
        log.action,
        log.resource || '',
        log.ipAddress,
        log.success,
        log.riskLevel
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}

module.exports = new AuditService();