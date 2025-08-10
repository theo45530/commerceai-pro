const mongoose = require('mongoose');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true
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
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended', 'transferred'],
    default: 'waiting'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'feature_request', 'bug_report', 'general'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subject: {
    type: String,
    maxlength: 200
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    pageUrl: String
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
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  duration: Number, // in seconds
  waitTime: Number, // in seconds
  responseTime: Number // average response time in seconds
}, {
  timestamps: true
});

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['customer', 'agent', 'system', 'bot'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'system_message', 'quick_reply'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  metadata: {
    edited: Boolean,
    editedAt: Date,
    originalContent: String
  }
}, {
  timestamps: true
});

// Indexes
chatSessionSchema.index({ sessionId: 1 });
chatSessionSchema.index({ userId: 1, status: 1 });
chatSessionSchema.index({ agentId: 1, status: 1 });
chatSessionSchema.index({ organizationId: 1, status: 1 });
chatSessionSchema.index({ createdAt: -1 });

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ senderId: 1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

class ChatSupportService {
  constructor() {
    this.activeAgents = new Map(); // agentId -> { socketId, status, currentChats }
    this.waitingQueue = []; // sessions waiting for agent
    this.activeSessions = new Map(); // sessionId -> { userId, agentId, socketIds }
  }

  // Generate unique session ID
  generateSessionId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Start new chat session
  async startChatSession(userId, organizationId, metadata = {}) {
    try {
      const sessionId = this.generateSessionId();
      
      const session = new ChatSession({
        sessionId,
        userId,
        organizationId,
        metadata,
        startedAt: new Date()
      });

      await session.save();

      // Add to waiting queue
      this.waitingQueue.push({
        sessionId,
        userId,
        organizationId,
        startedAt: new Date()
      });

      // Try to assign available agent
      await this.tryAssignAgent(sessionId);

      logger.info(`Chat session started: ${sessionId} for user: ${userId}`);
      return session;
    } catch (error) {
      logger.error('Error starting chat session:', error);
      throw error;
    }
  }

  // Try to assign available agent
  async tryAssignAgent(sessionId) {
    try {
      const availableAgent = this.findAvailableAgent();
      if (availableAgent) {
        await this.assignAgentToSession(sessionId, availableAgent.agentId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error assigning agent:', error);
      return false;
    }
  }

  // Find available agent
  findAvailableAgent() {
    for (const [agentId, agentData] of this.activeAgents) {
      if (agentData.status === 'available' && agentData.currentChats < 3) {
        return { agentId, ...agentData };
      }
    }
    return null;
  }

  // Assign agent to session
  async assignAgentToSession(sessionId, agentId) {
    try {
      const session = await ChatSession.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      session.agentId = agentId;
      session.status = 'active';
      session.waitTime = Math.floor((new Date() - session.startedAt) / 1000);
      await session.save();

      // Update agent data
      const agentData = this.activeAgents.get(agentId);
      if (agentData) {
        agentData.currentChats += 1;
        if (agentData.currentChats >= 3) {
          agentData.status = 'busy';
        }
      }

      // Remove from waiting queue
      this.waitingQueue = this.waitingQueue.filter(item => item.sessionId !== sessionId);

      // Add to active sessions
      this.activeSessions.set(sessionId, {
        userId: session.userId,
        agentId,
        socketIds: []
      });

      logger.info(`Agent ${agentId} assigned to session ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Error assigning agent to session:', error);
      throw error;
    }
  }

  // Add message to chat
  async addMessage(sessionId, senderId, senderType, content, messageType = 'text', attachments = []) {
    try {
      const message = new ChatMessage({
        sessionId,
        senderId,
        senderType,
        content,
        messageType,
        attachments
      });

      await message.save();

      // Add message to session
      await ChatSession.findOneAndUpdate(
        { sessionId },
        { $push: { messages: message._id } }
      );

      logger.info(`Message added to session ${sessionId} by ${senderType}`);
      return message;
    } catch (error) {
      logger.error('Error adding message:', error);
      throw error;
    }
  }

  // Get chat session with messages
  async getChatSession(sessionId, populateMessages = true) {
    try {
      let query = ChatSession.findOne({ sessionId });
      
      if (populateMessages) {
        query = query.populate({
          path: 'messages',
          options: { sort: { createdAt: 1 } }
        });
      }

      const session = await query.exec();
      return session;
    } catch (error) {
      logger.error('Error getting chat session:', error);
      throw error;
    }
  }

  // End chat session
  async endChatSession(sessionId, endedBy) {
    try {
      const session = await ChatSession.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      const endTime = new Date();
      session.status = 'ended';
      session.endedAt = endTime;
      session.duration = Math.floor((endTime - session.startedAt) / 1000);
      await session.save();

      // Update agent availability
      if (session.agentId) {
        const agentData = this.activeAgents.get(session.agentId.toString());
        if (agentData) {
          agentData.currentChats = Math.max(0, agentData.currentChats - 1);
          if (agentData.currentChats < 3) {
            agentData.status = 'available';
          }
        }
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      logger.info(`Chat session ended: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Error ending chat session:', error);
      throw error;
    }
  }

  // Register agent as online
  registerAgent(agentId, socketId) {
    this.activeAgents.set(agentId, {
      socketId,
      status: 'available',
      currentChats: 0,
      lastSeen: new Date()
    });
    
    logger.info(`Agent ${agentId} registered as online`);
    
    // Try to assign waiting sessions
    this.processWaitingQueue();
  }

  // Unregister agent
  unregisterAgent(agentId) {
    this.activeAgents.delete(agentId);
    logger.info(`Agent ${agentId} unregistered`);
  }

  // Process waiting queue
  async processWaitingQueue() {
    while (this.waitingQueue.length > 0) {
      const availableAgent = this.findAvailableAgent();
      if (!availableAgent) break;

      const waitingSession = this.waitingQueue[0];
      await this.assignAgentToSession(waitingSession.sessionId, availableAgent.agentId);
    }
  }

  // Get waiting queue status
  getWaitingQueueStatus() {
    return {
      queueLength: this.waitingQueue.length,
      availableAgents: Array.from(this.activeAgents.values()).filter(agent => agent.status === 'available').length,
      totalAgents: this.activeAgents.size
    };
  }

  // Submit satisfaction rating
  async submitSatisfactionRating(sessionId, rating, feedback = '') {
    try {
      const session = await ChatSession.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }

      session.satisfaction = {
        rating,
        feedback,
        submittedAt: new Date()
      };

      await session.save();
      logger.info(`Satisfaction rating submitted for session ${sessionId}: ${rating}/5`);
      return session;
    } catch (error) {
      logger.error('Error submitting satisfaction rating:', error);
      throw error;
    }
  }

  // Get chat analytics
  async getChatAnalytics(filters = {}) {
    try {
      const { dateFrom, dateTo, organizationId } = filters;
      
      const matchStage = {};
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }
      if (organizationId) {
        matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);
      }

      const analytics = await ChatSession.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            endedSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] }
            },
            avgWaitTime: { $avg: '$waitTime' },
            avgDuration: { $avg: '$duration' },
            avgSatisfaction: { $avg: '$satisfaction.rating' }
          }
        }
      ]);

      return analytics[0] || {
        totalSessions: 0,
        activeSessions: 0,
        endedSessions: 0,
        avgWaitTime: 0,
        avgDuration: 0,
        avgSatisfaction: 0
      };
    } catch (error) {
      logger.error('Error getting chat analytics:', error);
      throw error;
    }
  }
}

module.exports = new ChatSupportService();