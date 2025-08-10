const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const chatSupportService = require('../services/chatSupportService');
const permissionService = require('../services/permissionService');
const { body, validationResult, query } = require('express-validator');
const logger = require('../../logging/logger-config');

// Support agent middleware
const requireSupportAgent = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['support.manage_chat', 'support.view_all_chats']
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Support agent access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Support agent middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Start new chat session
router.post('/sessions', [
  auth,
  body('subject').optional().isLength({ max: 200 }),
  body('category').optional().isIn(['technical', 'billing', 'feature_request', 'bug_report', 'general']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, category, priority } = req.body;
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer'),
      pageUrl: req.body.pageUrl || ''
    };

    const session = await chatSupportService.startChatSession(
      req.user.id,
      req.user.organizationId,
      { ...metadata, subject, category, priority }
    );

    res.status(201).json({ 
      session: {
        sessionId: session.sessionId,
        status: session.status,
        category: session.category,
        priority: session.priority,
        subject: session.subject,
        startedAt: session.startedAt
      },
      queueStatus: chatSupportService.getWaitingQueueStatus()
    });
  } catch (error) {
    logger.error('Start chat session error:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// Get chat session
router.get('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await chatSupportService.getChatSession(sessionId, true);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user has access to this session
    const hasAccess = session.userId.toString() === req.user.id ||
                     session.agentId?.toString() === req.user.id ||
                     await permissionService.hasPermission(req.user.id, 'support.view_all_chats');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ session });
  } catch (error) {
    logger.error('Get chat session error:', error);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

// Add message to chat
router.post('/sessions/:sessionId/messages', [
  auth,
  body('content').notEmpty().withMessage('Message content is required').isLength({ max: 2000 }),
  body('messageType').optional().isIn(['text', 'file', 'image', 'quick_reply'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { content, messageType = 'text', attachments = [] } = req.body;
    
    const session = await chatSupportService.getChatSession(sessionId, false);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Determine sender type
    let senderType = 'customer';
    if (session.agentId?.toString() === req.user.id) {
      senderType = 'agent';
    }

    // Check if user has access to this session
    const hasAccess = session.userId.toString() === req.user.id ||
                     session.agentId?.toString() === req.user.id;
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await chatSupportService.addMessage(
      sessionId,
      req.user.id,
      senderType,
      content,
      messageType,
      attachments
    );

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Add chat message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// End chat session
router.post('/sessions/:sessionId/end', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await chatSupportService.getChatSession(sessionId, false);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user has access to end this session
    const hasAccess = session.userId.toString() === req.user.id ||
                     session.agentId?.toString() === req.user.id ||
                     await permissionService.hasPermission(req.user.id, 'support.manage_chat');
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const endedSession = await chatSupportService.endChatSession(sessionId, req.user.id);
    res.json({ session: endedSession });
  } catch (error) {
    logger.error('End chat session error:', error);
    res.status(500).json({ error: 'Failed to end chat session' });
  }
});

// Submit satisfaction rating
router.post('/sessions/:sessionId/satisfaction', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { rating, feedback = '' } = req.body;
    
    const session = await chatSupportService.getChatSession(sessionId, false);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Only the customer can rate the session
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the customer can rate the session' });
    }

    const updatedSession = await chatSupportService.submitSatisfactionRating(
      sessionId,
      rating,
      feedback
    );

    res.json({ session: updatedSession });
  } catch (error) {
    logger.error('Submit satisfaction rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get user's chat sessions
router.get('/sessions', [
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isString()
], async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { userId: req.user.id };
    if (status) {
      filter.status = status;
    }

    const sessions = await chatSupportService.constructor.model('ChatSession')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('sessionId status category priority subject startedAt endedAt duration satisfaction')
      .exec();

    const total = await chatSupportService.constructor.model('ChatSession').countDocuments(filter);

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get user chat sessions error:', error);
    res.status(500).json({ error: 'Failed to get chat sessions' });
  }
});

// Get queue status
router.get('/queue/status', auth, async (req, res) => {
  try {
    const queueStatus = chatSupportService.getWaitingQueueStatus();
    res.json({ queueStatus });
  } catch (error) {
    logger.error('Get queue status error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// AGENT ROUTES

// Get agent's assigned sessions
router.get('/agent/sessions', [
  auth,
  requireSupportAgent,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isString()
], async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { agentId: req.user.id };
    if (status) {
      filter.status = status;
    }

    const sessions = await chatSupportService.constructor.model('ChatSession')
      .find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const total = await chatSupportService.constructor.model('ChatSession').countDocuments(filter);

    res.json({
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get agent chat sessions error:', error);
    res.status(500).json({ error: 'Failed to get agent chat sessions' });
  }
});

// Transfer chat session to another agent
router.post('/agent/sessions/:sessionId/transfer', [
  auth,
  requireSupportAgent,
  body('targetAgentId').isMongoId().withMessage('Valid agent ID required'),
  body('reason').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { targetAgentId, reason = '' } = req.body;
    
    const session = await chatSupportService.getChatSession(sessionId, false);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if current user is the assigned agent
    if (session.agentId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this session' });
    }

    // Update session with new agent
    session.agentId = targetAgentId;
    session.status = 'transferred';
    await session.save();

    // Add system message about transfer
    await chatSupportService.addMessage(
      sessionId,
      req.user.id,
      'system',
      `Chat transferred to another agent. Reason: ${reason}`,
      'system_message'
    );

    res.json({ session });
  } catch (error) {
    logger.error('Transfer chat session error:', error);
    res.status(500).json({ error: 'Failed to transfer chat session' });
  }
});

// Get chat analytics
router.get('/analytics', [
  auth,
  requireSupportAgent,
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('organizationId').optional().isMongoId()
], async (req, res) => {
  try {
    const { dateFrom, dateTo, organizationId } = req.query;
    
    const analytics = await chatSupportService.getChatAnalytics({
      dateFrom,
      dateTo,
      organizationId
    });

    res.json({ analytics });
  } catch (error) {
    logger.error('Get chat analytics error:', error);
    res.status(500).json({ error: 'Failed to get chat analytics' });
  }
});

module.exports = router;