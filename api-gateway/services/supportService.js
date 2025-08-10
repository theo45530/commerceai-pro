const mongoose = require('mongoose');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const logger = require('../../logging/logger-config');

// Support Ticket Schema
const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'feature_request', 'bug_report', 'general'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    default: 'open'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    maxlength: 50
  }],
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketMessage'
  }],
  resolution: {
    summary: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    resolutionTime: Number // in minutes
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    submittedAt: Date
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    browserInfo: String,
    systemInfo: String
  },
  sla: {
    responseTime: Number, // in minutes
    resolutionTime: Number, // in minutes
    breached: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Ticket Message Schema
const ticketMessageSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['customer', 'agent', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'system_update'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  isInternal: {
    type: Boolean,
    default: false
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Knowledge Base Schema
const knowledgeBaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  searchKeywords: [String],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }]
}, {
  timestamps: true
});

// Indexes
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ userId: 1, status: 1 });
ticketSchema.index({ organizationId: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ priority: 1, status: 1 });

ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });
ticketMessageSchema.index({ senderId: 1 });

knowledgeBaseSchema.index({ title: 'text', content: 'text', searchKeywords: 'text' });
knowledgeBaseSchema.index({ category: 1, status: 1 });
knowledgeBaseSchema.index({ views: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);
const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

class SupportService {
  // Ticket Management
  async createTicket(ticketData, userId, organizationId, metadata = {}) {
    try {
      const ticketNumber = await this.generateTicketNumber();
      
      const ticket = new Ticket({
        ...ticketData,
        ticketNumber,
        userId,
        organizationId,
        metadata
      });

      await ticket.save();
      await ticket.populate(['userId', 'organizationId']);

      // Create initial system message
      await this.addMessage(ticket._id, {
        senderId: userId,
        senderType: 'system',
        content: `Ticket created: ${ticket.title}`,
        messageType: 'system_update'
      });

      // Send notification to support team
      await notificationService.sendNotification('support_team', {
        type: 'support',
        category: 'new_ticket',
        title: 'New Support Ticket',
        message: `New ${ticket.priority} priority ticket: ${ticket.title}`,
        priority: ticket.priority === 'urgent' ? 'high' : 'medium',
        metadata: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        }
      });

      // Log audit event
      await auditService.logEvent({
        eventType: 'support.ticket_created',
        userId,
        organizationId,
        action: 'create',
        resource: 'ticket',
        resourceId: ticket._id,
        success: true,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          priority: ticket.priority
        }
      });

      return ticket;
    } catch (error) {
      logger.error('Create ticket error:', error);
      throw error;
    }
  }

  async getTickets(filters = {}, options = {}) {
    try {
      const {
        userId,
        organizationId,
        assignedTo,
        status,
        priority,
        category,
        search,
        dateFrom,
        dateTo
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query = {};
      if (userId) query.userId = userId;
      if (organizationId) query.organizationId = organizationId;
      if (assignedTo) query.assignedTo = assignedTo;
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (category) query.category = category;
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { ticketNumber: { $regex: search, $options: 'i' } }
        ];
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const [tickets, total] = await Promise.all([
        Ticket.find(query)
          .populate('userId', 'firstName lastName email')
          .populate('organizationId', 'name')
          .populate('assignedTo', 'firstName lastName email')
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .lean(),
        Ticket.countDocuments(query)
      ]);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get tickets error:', error);
      throw error;
    }
  }

  async getTicketById(ticketId, userId = null) {
    try {
      const query = { _id: ticketId };
      if (userId) {
        // If userId provided, ensure user can access this ticket
        query.$or = [
          { userId },
          { assignedTo: userId }
        ];
      }

      const ticket = await Ticket.findOne(query)
        .populate('userId', 'firstName lastName email')
        .populate('organizationId', 'name')
        .populate('assignedTo', 'firstName lastName email')
        .populate({
          path: 'messages',
          populate: {
            path: 'senderId',
            select: 'firstName lastName email role'
          }
        })
        .lean();

      if (!ticket) {
        throw new Error('Ticket not found or access denied');
      }

      return ticket;
    } catch (error) {
      logger.error('Get ticket by ID error:', error);
      throw error;
    }
  }

  async updateTicket(ticketId, updates, userId) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const oldValues = {
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo
      };

      const updatedTicket = await Ticket.findByIdAndUpdate(
        ticketId,
        updates,
        { new: true }
      ).populate(['userId', 'organizationId', 'assignedTo']);

      // Create system message for status changes
      if (updates.status && updates.status !== oldValues.status) {
        await this.addMessage(ticketId, {
          senderId: userId,
          senderType: 'system',
          content: `Status changed from ${oldValues.status} to ${updates.status}`,
          messageType: 'system_update'
        });

        // Send notification to customer
        await notificationService.sendNotification(ticket.userId, {
          type: 'support',
          category: 'ticket_status_changed',
          title: 'Ticket Status Updated',
          message: `Your ticket #${ticket.ticketNumber} status has been updated to ${updates.status}`,
          priority: 'medium',
          metadata: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            newStatus: updates.status
          }
        });
      }

      // Log audit event
      await auditService.logDataEvent(
        'support.ticket_updated',
        { id: userId },
        {},
        'ticket',
        ticketId,
        oldValues,
        updates,
        true
      );

      return updatedTicket;
    } catch (error) {
      logger.error('Update ticket error:', error);
      throw error;
    }
  }

  async assignTicket(ticketId, assignedTo, assignedBy) {
    try {
      const ticket = await this.updateTicket(ticketId, {
        assignedTo,
        status: 'in_progress'
      }, assignedBy);

      // Send notification to assigned agent
      await notificationService.sendNotification(assignedTo, {
        type: 'support',
        category: 'ticket_assigned',
        title: 'Ticket Assigned',
        message: `You have been assigned ticket #${ticket.ticketNumber}: ${ticket.title}`,
        priority: ticket.priority === 'urgent' ? 'high' : 'medium',
        metadata: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        }
      });

      return ticket;
    } catch (error) {
      logger.error('Assign ticket error:', error);
      throw error;
    }
  }

  async resolveTicket(ticketId, resolution, resolvedBy) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const resolutionTime = Math.floor((Date.now() - ticket.createdAt) / (1000 * 60)); // in minutes

      const updatedTicket = await this.updateTicket(ticketId, {
        status: 'resolved',
        resolution: {
          summary: resolution,
          resolvedBy,
          resolvedAt: new Date(),
          resolutionTime
        }
      }, resolvedBy);

      // Send satisfaction survey
      await this.sendSatisfactionSurvey(ticket.userId, ticketId);

      return updatedTicket;
    } catch (error) {
      logger.error('Resolve ticket error:', error);
      throw error;
    }
  }

  // Message Management
  async addMessage(ticketId, messageData) {
    try {
      const message = new TicketMessage({
        ticketId,
        ...messageData
      });

      await message.save();
      await message.populate('senderId', 'firstName lastName email role');

      // Add message to ticket
      await Ticket.findByIdAndUpdate(ticketId, {
        $push: { messages: message._id },
        $set: { updatedAt: new Date() }
      });

      // Send notification if message is from agent to customer
      if (messageData.senderType === 'agent') {
        const ticket = await Ticket.findById(ticketId).populate('userId');
        if (ticket) {
          await notificationService.sendNotification(ticket.userId._id, {
            type: 'support',
            category: 'ticket_reply',
            title: 'New Reply on Your Ticket',
            message: `You have a new reply on ticket #${ticket.ticketNumber}`,
            priority: 'medium',
            metadata: {
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber
            }
          });
        }
      }

      return message;
    } catch (error) {
      logger.error('Add message error:', error);
      throw error;
    }
  }

  async getMessages(ticketId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;

      const messages = await TicketMessage.find({ ticketId })
        .populate('senderId', 'firstName lastName email role')
        .sort({ createdAt: 1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();

      return messages;
    } catch (error) {
      logger.error('Get messages error:', error);
      throw error;
    }
  }

  // Knowledge Base
  async createKBArticle(articleData, authorId) {
    try {
      const article = new KnowledgeBase({
        ...articleData,
        authorId,
        searchKeywords: this.extractKeywords(articleData.title + ' ' + articleData.content)
      });

      await article.save();
      return article;
    } catch (error) {
      logger.error('Create KB article error:', error);
      throw error;
    }
  }

  async searchKB(query, filters = {}) {
    try {
      const { category, status = 'published' } = filters;

      const searchQuery = {
        status,
        $text: { $search: query }
      };

      if (category) {
        searchQuery.category = category;
      }

      const articles = await KnowledgeBase.find(searchQuery, {
        score: { $meta: 'textScore' }
      })
        .sort({ score: { $meta: 'textScore' } })
        .populate('authorId', 'firstName lastName')
        .limit(20)
        .lean();

      return articles;
    } catch (error) {
      logger.error('Search KB error:', error);
      throw error;
    }
  }

  async getKBArticle(articleId) {
    try {
      const article = await KnowledgeBase.findByIdAndUpdate(
        articleId,
        { $inc: { views: 1 } },
        { new: true }
      )
        .populate('authorId', 'firstName lastName')
        .populate('relatedArticles', 'title category')
        .lean();

      return article;
    } catch (error) {
      logger.error('Get KB article error:', error);
      throw error;
    }
  }

  async rateKBArticle(articleId, helpful) {
    try {
      const updateField = helpful ? 'helpful' : 'notHelpful';
      
      const article = await KnowledgeBase.findByIdAndUpdate(
        articleId,
        { $inc: { [updateField]: 1 } },
        { new: true }
      );

      return article;
    } catch (error) {
      logger.error('Rate KB article error:', error);
      throw error;
    }
  }

  // Analytics
  async getTicketAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo, organizationId } = filters;
      
      const matchQuery = {};
      if (organizationId) matchQuery.organizationId = mongoose.Types.ObjectId(organizationId);
      if (dateFrom || dateTo) {
        matchQuery.createdAt = {};
        if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
      }

      const [statusStats, priorityStats, categoryStats, resolutionStats] = await Promise.all([
        Ticket.aggregate([
          { $match: matchQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Ticket.aggregate([
          { $match: matchQuery },
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),
        Ticket.aggregate([
          { $match: matchQuery },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Ticket.aggregate([
          { $match: { ...matchQuery, 'resolution.resolutionTime': { $exists: true } } },
          {
            $group: {
              _id: null,
              avgResolutionTime: { $avg: '$resolution.resolutionTime' },
              minResolutionTime: { $min: '$resolution.resolutionTime' },
              maxResolutionTime: { $max: '$resolution.resolutionTime' }
            }
          }
        ])
      ]);

      return {
        statusStats,
        priorityStats,
        categoryStats,
        resolutionStats: resolutionStats[0] || {
          avgResolutionTime: 0,
          minResolutionTime: 0,
          maxResolutionTime: 0
        }
      };
    } catch (error) {
      logger.error('Get ticket analytics error:', error);
      throw error;
    }
  }

  async getSatisfactionStats(filters = {}) {
    try {
      const { dateFrom, dateTo, organizationId } = filters;
      
      const matchQuery = {
        'satisfaction.rating': { $exists: true }
      };
      
      if (organizationId) matchQuery.organizationId = mongoose.Types.ObjectId(organizationId);
      if (dateFrom || dateTo) {
        matchQuery.createdAt = {};
        if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Ticket.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$satisfaction.rating' },
            totalResponses: { $sum: 1 },
            ratingDistribution: {
              $push: '$satisfaction.rating'
            }
          }
        }
      ]);

      return stats[0] || {
        avgRating: 0,
        totalResponses: 0,
        ratingDistribution: []
      };
    } catch (error) {
      logger.error('Get satisfaction stats error:', error);
      throw error;
    }
  }

  // Helper Methods
  async generateTicketNumber() {
    const prefix = 'TKT';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last ticket number for today
    const lastTicket = await Ticket.findOne({
      ticketNumber: { $regex: `^${prefix}-${date}` }
    }).sort({ ticketNumber: -1 });

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${date}-${sequence.toString().padStart(4, '0')}`;
  }

  extractKeywords(text) {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return [...new Set(words)].slice(0, 20); // Unique words, max 20
  }

  async sendSatisfactionSurvey(userId, ticketId) {
    try {
      await notificationService.sendNotification(userId, {
        type: 'support',
        category: 'satisfaction_survey',
        title: 'How was your support experience?',
        message: 'Please take a moment to rate your support experience',
        priority: 'low',
        metadata: {
          ticketId,
          surveyUrl: `/support/satisfaction/${ticketId}`
        }
      });
    } catch (error) {
      logger.error('Send satisfaction survey error:', error);
    }
  }

  async submitSatisfactionRating(ticketId, rating, feedback = '') {
    try {
      const ticket = await Ticket.findByIdAndUpdate(
        ticketId,
        {
          satisfaction: {
            rating,
            feedback,
            submittedAt: new Date()
          }
        },
        { new: true }
      );

      return ticket;
    } catch (error) {
      logger.error('Submit satisfaction rating error:', error);
      throw error;
    }
  }
}

module.exports = new SupportService();