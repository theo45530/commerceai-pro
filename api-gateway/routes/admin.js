const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const permissionService = require('../services/permissionService');
const { body, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
const logger = require('../../logging/logger-config');

// Admin middleware - requires admin or super_admin role
const requireAdmin = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['system.monitoring', 'users.manage_roles', 'organization.read']
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dashboard Overview
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
  try {
    const [userStats, orgStats, subscriptionStats, revenueStats] = await Promise.all([
      getUserStats(),
      getOrganizationStats(),
      getSubscriptionStats(),
      getRevenueStats()
    ]);

    const dashboardData = {
      users: userStats,
      organizations: orgStats,
      subscriptions: subscriptionStats,
      revenue: revenueStats,
      timestamp: new Date().toISOString()
    };

    await auditService.logEvent({
      eventType: 'system.monitoring',
      userId: req.user.id,
      action: 'dashboard_access',
      resource: 'admin_dashboard',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    });

    res.json(dashboardData);
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// User Management
router.get('/users', [
  auth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('role').optional().isString(),
  query('status').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      search,
      role,
      status
    } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    if (status) {
      query.status = status;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('organizationId', 'name')
        .select('-password -twoFactorSecret')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get specific user
router.get('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('organizationId')
      .select('-password -twoFactorSecret')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's audit logs
    const auditLogs = await auditService.getAuditLogs(
      { userId: req.params.userId },
      { limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
    );

    res.json({
      user,
      auditLogs: auditLogs.logs
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/users/:userId', [
  auth,
  requireAdmin,
  body('role').optional().isIn(['user', 'admin', 'super_admin']),
  body('status').optional().isIn(['active', 'suspended', 'inactive']),
  body('organizationRole').optional().isIn(['owner', 'admin', 'member', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role, status, organizationRole } = req.body;
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldValues = {
      role: user.role,
      status: user.status,
      organizationRole: user.organizationRole
    };

    // Update user
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (organizationRole !== undefined) updateData.organizationRole = organizationRole;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password -twoFactorSecret' }
    ).populate('organizationId');

    // Log the change
    await auditService.logDataEvent(
      'user.update',
      req.user,
      req,
      'user',
      userId,
      oldValues,
      updateData,
      true
    );

    // Send notification to user if status changed
    if (status && status !== oldValues.status) {
      await notificationService.sendNotification(userId, {
        type: 'system',
        category: 'user_status_changed',
        title: 'Account Status Updated',
        message: `Your account status has been changed to ${status}`,
        priority: status === 'suspended' ? 'high' : 'medium'
      });
    }

    res.json({ user: updatedUser });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of super admins
    if (user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin users' });
    }

    // Soft delete - mark as deleted instead of removing
    await User.findByIdAndUpdate(userId, {
      status: 'deleted',
      email: `deleted_${Date.now()}_${user.email}`,
      deletedAt: new Date()
    });

    // Log the deletion
    await auditService.logEvent({
      eventType: 'user.delete',
      userId: req.user.id,
      action: 'delete',
      resource: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      metadata: {
        deletedUserEmail: user.email,
        deletedUserRole: user.role
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Organization Management
router.get('/organizations', [
  auth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isString()
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      query.status = status;
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .populate('ownerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),
      Organization.countDocuments(query)
    ]);

    res.json({
      organizations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Analytics & Reports
router.get('/analytics/overview', auth, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const startDate = getStartDate(period);

    const [userGrowth, revenueGrowth, churnRate, ltv] = await Promise.all([
      getUserGrowthAnalytics(startDate),
      getRevenueGrowthAnalytics(startDate),
      getChurnRateAnalytics(startDate),
      getLTVAnalytics()
    ]);

    res.json({
      period,
      userGrowth,
      revenueGrowth,
      churnRate,
      ltv,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Usage Analytics
router.get('/analytics/usage', auth, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const startDate = getStartDate(period);

    const usageStats = await getUsageAnalytics(startDate);

    res.json({
      period,
      usage: usageStats,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Usage analytics error:', error);
    res.status(500).json({ error: 'Failed to generate usage analytics' });
  }
});

// System Health
router.get('/system/health', auth, requireAdmin, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        email: await checkEmailHealth(),
        storage: await checkStorageHealth()
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Determine overall health
    const unhealthyServices = Object.values(health.services).filter(s => s.status !== 'healthy');
    if (unhealthyServices.length > 0) {
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    logger.error('System health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Audit Logs
router.get('/audit-logs', [
  auth,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('eventType').optional().isString(),
  query('userId').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      eventType: req.query.eventType,
      userId: req.query.userId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };

    const auditLogs = await auditService.getAuditLogs(filters, options);

    res.json(auditLogs);
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Export audit logs
router.get('/audit-logs/export', [
  auth,
  requireAdmin,
  query('format').optional().isIn(['json', 'csv']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601()
], async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;
    
    const filters = { dateFrom, dateTo };
    const exportData = await auditService.exportAuditLogs(filters, format);

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    
    // Log export action
    await auditService.logEvent({
      eventType: 'data.export',
      userId: req.user.id,
      action: 'export',
      resource: 'audit_logs',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      metadata: { format, dateFrom, dateTo }
    });

    res.send(exportData);
  } catch (error) {
    logger.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// System Notifications
router.post('/notifications/system', [
  auth,
  requireAdmin,
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['system', 'maintenance', 'feature', 'alert']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('targetUsers').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, type, priority = 'medium', targetUsers } = req.body;

    const notificationData = {
      type,
      category: 'system_announcement',
      title,
      message,
      priority
    };

    let sentCount;
    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      sentCount = 0;
      for (const userId of targetUsers) {
        try {
          await notificationService.sendNotification(userId, notificationData);
          sentCount++;
        } catch (error) {
          logger.error(`Failed to send notification to user ${userId}:`, error);
        }
      }
    } else {
      // Send to all users
      sentCount = await notificationService.sendSystemNotification(notificationData);
    }

    // Log the action
    await auditService.logEvent({
      eventType: 'system.notification',
      userId: req.user.id,
      action: 'send_system_notification',
      resource: 'notification',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      metadata: { title, type, priority, sentCount }
    });

    res.json({
      message: 'System notification sent successfully',
      sentCount
    });
  } catch (error) {
    logger.error('Send system notification error:', error);
    res.status(500).json({ error: 'Failed to send system notification' });
  }
});

// Helper functions

async function getUserStats() {
  const [total, active, newThisMonth, byRole] = await Promise.all([
    User.countDocuments({ status: { $ne: 'deleted' } }),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
      status: { $ne: 'deleted' }
    }),
    User.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
  ]);

  return { total, active, newThisMonth, byRole };
}

async function getOrganizationStats() {
  const [total, active, trial, byStatus] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ status: 'active' }),
    Organization.countDocuments({ status: 'trial' }),
    Organization.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  return { total, active, trial, byStatus };
}

async function getSubscriptionStats() {
  const [total, active, cancelled, byPlan] = await Promise.all([
    Subscription.countDocuments(),
    Subscription.countDocuments({ status: 'active' }),
    Subscription.countDocuments({ status: 'cancelled' }),
    Subscription.aggregate([
      { $group: { _id: '$planId', count: { $sum: 1 } } }
    ])
  ]);

  return { total, active, cancelled, byPlan };
}

async function getRevenueStats() {
  const thisMonth = new Date(new Date().setDate(1));
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1, 1));

  const [thisMonthRevenue, lastMonthRevenue, totalRevenue] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  const thisMonthTotal = thisMonthRevenue[0]?.total || 0;
  const lastMonthTotal = lastMonthRevenue[0]?.total || 0;
  const growth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  return {
    thisMonth: thisMonthTotal,
    lastMonth: lastMonthTotal,
    total: totalRevenue[0]?.total || 0,
    growth
  };
}

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.setDate(now.getDate() - 7));
    case '30d':
      return new Date(now.setDate(now.getDate() - 30));
    case '90d':
      return new Date(now.setDate(now.getDate() - 90));
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setDate(now.getDate() - 30));
  }
}

async function getUserGrowthAnalytics(startDate) {
  return User.aggregate([
    { $match: { createdAt: { $gte: startDate }, status: { $ne: 'deleted' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
}

async function getRevenueGrowthAnalytics(startDate) {
  return Invoice.aggregate([
    { $match: { createdAt: { $gte: startDate }, status: 'paid' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
}

async function getChurnRateAnalytics(startDate) {
  const [cancelled, total] = await Promise.all([
    Subscription.countDocuments({
      status: 'cancelled',
      updatedAt: { $gte: startDate }
    }),
    Subscription.countDocuments({
      createdAt: { $lt: startDate }
    })
  ]);

  return {
    cancelled,
    total,
    rate: total > 0 ? (cancelled / total) * 100 : 0
  };
}

async function getLTVAnalytics() {
  // Simplified LTV calculation
  const avgRevenue = await Invoice.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: '$organizationId', totalRevenue: { $sum: '$amount' } } },
    { $group: { _id: null, avgLTV: { $avg: '$totalRevenue' } } }
  ]);

  return avgRevenue[0]?.avgLTV || 0;
}

async function getUsageAnalytics(startDate) {
  // This would need to be implemented based on your usage tracking
  return {
    agentRequests: 0,
    apiCalls: 0,
    storageUsed: 0
  };
}

async function checkDatabaseHealth() {
  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedisHealth() {
  // Implement Redis health check if using Redis
  return { status: 'healthy' };
}

async function checkEmailHealth() {
  // Implement email service health check
  return { status: 'healthy' };
}

async function checkStorageHealth() {
  // Implement storage health check
  return { status: 'healthy' };
}

module.exports = router;