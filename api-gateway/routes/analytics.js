const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const permissionService = require('../services/permissionService');
const { query, validationResult } = require('express-validator');
const logger = require('../../logging/logger-config');

// Analytics access middleware
const requireAnalyticsAccess = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['analytics.view', 'analytics.manage', 'organization.analytics']
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Analytics access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Analytics access middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin analytics access
const requireAdminAnalytics = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['analytics.manage', 'system.monitoring']
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Admin analytics access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Admin analytics middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Track usage event
router.post('/track', [
  auth,
  // No validation middleware needed as this is for internal tracking
], async (req, res) => {
  try {
    const {
      eventType,
      eventCategory,
      eventAction,
      value = 1,
      metadata = {},
      sessionId
    } = req.body;

    if (!eventType || !eventCategory || !eventAction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const eventData = {
      organizationId: req.user.organizationId,
      userId: req.user.id,
      eventType,
      eventCategory,
      eventAction,
      value,
      metadata,
      sessionId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    await analyticsService.trackEvent(eventData);
    res.json({ success: true });
  } catch (error) {
    logger.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get organization analytics (for organization members)
router.get('/organization', [
  auth,
  requireAnalyticsAccess,
  query('period').optional().isIn(['daily', 'weekly', 'monthly']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      period = 'daily',
      startDate,
      endDate,
      limit = 30
    } = req.query;

    // Get organization-specific metrics
    const organizationId = req.user.organizationId;
    
    const [usageAnalytics, revenueData] = await Promise.all([
      analyticsService.getUsageAnalytics(organizationId, startDate, endDate),
      analyticsService.getRevenueAnalytics(startDate, endDate)
    ]);

    res.json({
      organizationId,
      period,
      usage: usageAnalytics,
      revenue: revenueData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get organization analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get usage analytics
router.get('/usage', [
  auth,
  requireAnalyticsAccess,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('organizationId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      organizationId
    } = req.query;

    // If organizationId not provided and user is not admin, use their organization
    const targetOrgId = organizationId || req.user.organizationId;
    
    // Check if user can access this organization's data
    if (organizationId && organizationId !== req.user.organizationId) {
      const hasAdminAccess = await permissionService.hasPermission(
        req.user.id,
        'analytics.manage'
      );
      if (!hasAdminAccess) {
        return res.status(403).json({ error: 'Access denied to this organization data' });
      }
    }

    const analytics = await analyticsService.getUsageAnalytics(targetOrgId, startDate, endDate);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get usage analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

// ADMIN ROUTES

// Get business metrics
router.get('/metrics', [
  auth,
  requireAdminAnalytics,
  query('period').optional().isIn(['daily', 'weekly', 'monthly']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      period = 'daily',
      startDate,
      endDate,
      limit = 30
    } = req.query;

    const metrics = await analyticsService.getMetrics(period, startDate, endDate, limit);
    res.json({ metrics });
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get revenue analytics
router.get('/revenue', [
  auth,
  requireAdminAnalytics,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const analytics = await analyticsService.getRevenueAnalytics(startDate, endDate);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// Get user growth analytics
router.get('/user-growth', [
  auth,
  requireAdminAnalytics,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const analytics = await analyticsService.getUserGrowthAnalytics(startDate, endDate);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get user growth analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user growth analytics' });
  }
});

// Get churn analytics
router.get('/churn', [
  auth,
  requireAdminAnalytics,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const analytics = await analyticsService.getChurnAnalytics(startDate, endDate);
    res.json({ analytics });
  } catch (error) {
    logger.error('Get churn analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch churn analytics' });
  }
});

// Get top organizations
router.get('/top-organizations', [
  auth,
  requireAdminAnalytics,
  query('metric').optional().isIn(['revenue', 'usage', 'users']),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      metric = 'revenue',
      limit = 10
    } = req.query;

    const organizations = await analyticsService.getTopOrganizations(metric, limit);
    res.json({ organizations });
  } catch (error) {
    logger.error('Get top organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch top organizations' });
  }
});

// Get real-time metrics
router.get('/realtime', auth, requireAdminAnalytics, async (req, res) => {
  try {
    const metrics = await analyticsService.getRealTimeMetrics();
    res.json({ metrics });
  } catch (error) {
    logger.error('Get real-time metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

// Calculate metrics manually (admin only)
router.post('/calculate', [
  auth,
  requireAdminAnalytics,
  query('period').optional().isIn(['daily', 'monthly']),
  query('date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      period = 'daily',
      date = new Date().toISOString()
    } = req.query;

    let metrics;
    if (period === 'daily') {
      metrics = await analyticsService.calculateDailyMetrics(new Date(date));
    } else {
      metrics = await analyticsService.calculateMonthlyMetrics(new Date(date));
    }

    res.json({ metrics, period, date });
  } catch (error) {
    logger.error('Calculate metrics error:', error);
    res.status(500).json({ error: 'Failed to calculate metrics' });
  }
});

// Generate reports
router.get('/reports/daily', [
  auth,
  requireAdminAnalytics,
  query('date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const date = req.query.date ? new Date(req.query.date) : new Date();
    const report = await analyticsService.generateDailyReport(date);
    
    res.json({ report });
  } catch (error) {
    logger.error('Generate daily report error:', error);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

router.get('/reports/monthly', [
  auth,
  requireAdminAnalytics,
  query('date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const date = req.query.date ? new Date(req.query.date) : new Date();
    const report = await analyticsService.generateMonthlyReport(date);
    
    res.json({ report });
  } catch (error) {
    logger.error('Generate monthly report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Export analytics data
router.get('/export', [
  auth,
  requireAdminAnalytics,
  query('type').isIn(['metrics', 'usage', 'revenue']),
  query('format').optional().isIn(['json', 'csv']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type,
      format = 'json',
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    let data;
    switch (type) {
      case 'metrics':
        data = await analyticsService.getMetrics('daily', startDate, endDate, 1000);
        break;
      case 'usage':
        data = await analyticsService.getUsageAnalytics(null, startDate, endDate);
        break;
      case 'revenue':
        data = await analyticsService.getRevenueAnalytics(startDate, endDate);
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    const filename = `${type}-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      // Convert to CSV (simplified)
      const csv = convertToCSV(data);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    }
  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

// Dashboard summary (for organization dashboard)
router.get('/dashboard', [
  auth,
  requireAnalyticsAccess
], async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [usage30Days, usage7Days, recentActivity] = await Promise.all([
      analyticsService.getUsageAnalytics(organizationId, last30Days.toISOString(), now.toISOString()),
      analyticsService.getUsageAnalytics(organizationId, last7Days.toISOString(), now.toISOString()),
      analyticsService.getRecentActivity(last7Days)
    ]);

    const summary = {
      organizationId,
      period: {
        last30Days: usage30Days,
        last7Days: usage7Days
      },
      recentActivity,
      generatedAt: now.toISOString()
    };

    res.json({ summary });
  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;