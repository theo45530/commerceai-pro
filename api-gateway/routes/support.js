const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const supportService = require('../services/supportService');
const permissionService = require('../services/permissionService');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const logger = require('../../logging/logger-config');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/support/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Support agent middleware
const requireSupportAgent = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['support.manage_tickets', 'support.view_all_tickets']
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

// Create ticket
router.post('/tickets', [
  auth,
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ max: 5000 }),
  body('category').isIn(['technical', 'billing', 'feature_request', 'bug_report', 'general']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, priority = 'medium' } = req.body;
    
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      browserInfo: req.get('User-Agent'),
      systemInfo: req.body.systemInfo || ''
    };

    const ticket = await supportService.createTicket(
      { title, description, category, priority },
      req.user.id,
      req.user.organizationId,
      metadata
    );

    res.status(201).json({ ticket });
  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get tickets (user's own tickets)
router.get('/tickets', [
  auth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('category').optional().isString(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      userId: req.user.id,
      status: req.query.status,
      category: req.query.category,
      search: req.query.search
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await supportService.getTickets(filters, options);
    res.json(result);
  } catch (error) {
    logger.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get specific ticket
router.get('/tickets/:ticketId', auth, async (req, res) => {
  try {
    const ticket = await supportService.getTicketById(req.params.ticketId, req.user.id);
    res.json({ ticket });
  } catch (error) {
    logger.error('Get ticket error:', error);
    if (error.message === 'Ticket not found or access denied') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  }
});

// Add message to ticket
router.post('/tickets/:ticketId/messages', [
  auth,
  body('content').notEmpty().withMessage('Message content is required').isLength({ max: 5000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const ticketId = req.params.ticketId;

    // Verify user can access this ticket
    const ticket = await supportService.getTicketById(ticketId, req.user.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or access denied' });
    }

    const message = await supportService.addMessage(ticketId, {
      senderId: req.user.id,
      senderType: 'customer',
      content
    });

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Upload attachment
router.post('/tickets/:ticketId/attachments', [
  auth,
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ticketId = req.params.ticketId;
    
    // Verify user can access this ticket
    const ticket = await supportService.getTicketById(ticketId, req.user.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or access denied' });
    }

    const attachment = {
      filename: req.file.originalname,
      url: `/uploads/support/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    // Add file message
    const message = await supportService.addMessage(ticketId, {
      senderId: req.user.id,
      senderType: 'customer',
      content: `Uploaded file: ${req.file.originalname}`,
      messageType: 'file',
      attachments: [attachment]
    });

    res.status(201).json({ message, attachment });
  } catch (error) {
    logger.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Submit satisfaction rating
router.post('/tickets/:ticketId/satisfaction', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, feedback } = req.body;
    const ticketId = req.params.ticketId;

    // Verify user can access this ticket
    const ticket = await supportService.getTicketById(ticketId, req.user.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or access denied' });
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return res.status(400).json({ error: 'Can only rate resolved or closed tickets' });
    }

    const updatedTicket = await supportService.submitSatisfactionRating(ticketId, rating, feedback);
    res.json({ ticket: updatedTicket });
  } catch (error) {
    logger.error('Submit satisfaction rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// SUPPORT AGENT ROUTES

// Get all tickets (for support agents)
router.get('/agent/tickets', [
  auth,
  requireSupportAgent,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('priority').optional().isString(),
  query('category').optional().isString(),
  query('assignedTo').optional().isMongoId(),
  query('search').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      category: req.query.category,
      assignedTo: req.query.assignedTo,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await supportService.getTickets(filters, options);
    res.json(result);
  } catch (error) {
    logger.error('Get agent tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get ticket for agent (no user restriction)
router.get('/agent/tickets/:ticketId', auth, requireSupportAgent, async (req, res) => {
  try {
    const ticket = await supportService.getTicketById(req.params.ticketId);
    res.json({ ticket });
  } catch (error) {
    logger.error('Get agent ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Update ticket (agent only)
router.put('/agent/tickets/:ticketId', [
  auth,
  requireSupportAgent,
  body('status').optional().isIn(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignedTo').optional().isMongoId(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.priority) updates.priority = req.body.priority;
    if (req.body.assignedTo) updates.assignedTo = req.body.assignedTo;
    if (req.body.tags) updates.tags = req.body.tags;

    const ticket = await supportService.updateTicket(req.params.ticketId, updates, req.user.id);
    res.json({ ticket });
  } catch (error) {
    logger.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Assign ticket
router.post('/agent/tickets/:ticketId/assign', [
  auth,
  requireSupportAgent,
  body('assignedTo').isMongoId().withMessage('Valid user ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignedTo } = req.body;
    const ticket = await supportService.assignTicket(req.params.ticketId, assignedTo, req.user.id);
    res.json({ ticket });
  } catch (error) {
    logger.error('Assign ticket error:', error);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

// Resolve ticket
router.post('/agent/tickets/:ticketId/resolve', [
  auth,
  requireSupportAgent,
  body('resolution').notEmpty().withMessage('Resolution summary is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resolution } = req.body;
    const ticket = await supportService.resolveTicket(req.params.ticketId, resolution, req.user.id);
    res.json({ ticket });
  } catch (error) {
    logger.error('Resolve ticket error:', error);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
});

// Add agent message
router.post('/agent/tickets/:ticketId/messages', [
  auth,
  requireSupportAgent,
  body('content').notEmpty().withMessage('Message content is required').isLength({ max: 5000 }),
  body('isInternal').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, isInternal = false } = req.body;
    const ticketId = req.params.ticketId;

    const message = await supportService.addMessage(ticketId, {
      senderId: req.user.id,
      senderType: 'agent',
      content,
      isInternal
    });

    res.status(201).json({ message });
  } catch (error) {
    logger.error('Add agent message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// KNOWLEDGE BASE ROUTES

// Search knowledge base
router.get('/kb/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q: query, category } = req.query;
    const articles = await supportService.searchKB(query, { category });
    res.json({ articles });
  } catch (error) {
    logger.error('Search KB error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Get KB article
router.get('/kb/articles/:articleId', async (req, res) => {
  try {
    const article = await supportService.getKBArticle(req.params.articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ article });
  } catch (error) {
    logger.error('Get KB article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Rate KB article
router.post('/kb/articles/:articleId/rate', [
  body('helpful').isBoolean().withMessage('Helpful rating is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { helpful } = req.body;
    const article = await supportService.rateKBArticle(req.params.articleId, helpful);
    res.json({ article });
  } catch (error) {
    logger.error('Rate KB article error:', error);
    res.status(500).json({ error: 'Failed to rate article' });
  }
});

// Create KB article (agent only)
router.post('/kb/articles', [
  auth,
  requireSupportAgent,
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('content').notEmpty().withMessage('Content is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('subcategory').optional().isString(),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['draft', 'published', 'archived'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const articleData = {
      title: req.body.title,
      content: req.body.content,
      category: req.body.category,
      subcategory: req.body.subcategory,
      tags: req.body.tags || [],
      status: req.body.status || 'draft'
    };

    const article = await supportService.createKBArticle(articleData, req.user.id);
    res.status(201).json({ article });
  } catch (error) {
    logger.error('Create KB article error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// ANALYTICS ROUTES (Agent only)

// Get ticket analytics
router.get('/analytics/tickets', [
  auth,
  requireSupportAgent,
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('organizationId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      organizationId: req.query.organizationId
    };

    const analytics = await supportService.getTicketAnalytics(filters);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get ticket analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get satisfaction stats
router.get('/analytics/satisfaction', [
  auth,
  requireSupportAgent,
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('organizationId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      organizationId: req.query.organizationId
    };

    const stats = await supportService.getSatisfactionStats(filters);
    res.json({ stats });
  } catch (error) {
    logger.error('Get satisfaction stats error:', error);
    res.status(500).json({ error: 'Failed to fetch satisfaction stats' });
  }
});

module.exports = router;