const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const quotaService = require('../services/quotaService');
const permissionService = require('../services/permissionService');
const { query, param, validationResult } = require('express-validator');
const logger = require('../../logging/logger-config');

// Middleware to check quota access
const requireQuotaAccess = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['organization.view', 'organization.manage']
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Quota access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Quota access middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin quota access
const requireAdminQuotaAccess = async (req, res, next) => {
  try {
    const hasPermission = await permissionService.hasAnyPermission(
      req.user.id,
      ['system.monitoring', 'organization.manage_all']
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Admin quota access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Admin quota access middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Middleware to check usage before allowing action
const checkUsageLimit = (usageType, amount = 1) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user.organizationId;
      const check = await quotaService.checkUsageLimit(organizationId, usageType, amount);
      
      if (!check.allowed) {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          details: {
            usageType,
            currentUsage: check.currentUsage,
            limit: check.limit,
            overage: check.overage
          }
        });
      }
      
      // Add usage info to request for tracking
      req.usageInfo = {
        type: usageType,
        amount,
        organizationId
      };
      
      next();
    } catch (error) {
      logger.error('Check usage limit middleware error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
};

// Track usage after successful action
const trackUsage = async (req, res, next) => {
  try {
    if (req.usageInfo) {
      await quotaService.trackUsage(
        req.usageInfo.organizationId,
        req.usageInfo.type,
        req.usageInfo.amount,
        {
          userId: req.user.id,
          endpoint: req.originalUrl,
          method: req.method,
          timestamp: new Date()
        }
      );
    }
    next();
  } catch (error) {
    logger.error('Track usage middleware error:', error);
    // Don't fail the request if usage tracking fails
    next();
  }
};

// Get current usage summary
router.get('/usage', [
  auth,
  requireQuotaAccess,
  query('period').optional().isIn(['daily', 'monthly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { period = 'monthly' } = req.query;
    const organizationId = req.user.organizationId;
    
    const summary = await quotaService.getUsageSummary(organizationId, period);
    res.json({ summary });
  } catch (error) {
    logger.error('Get usage summary error:', error);
    res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

// Get historical usage data
router.get('/usage/history', [
  auth,
  requireQuotaAccess,
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('months').optional().isInt({ min: 1, max: 24 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      period = 'monthly',
      months = 12
    } = req.query;
    
    const organizationId = req.user.organizationId;
    const history = await quotaService.getHistoricalUsage(organizationId, period, parseInt(months));
    
    res.json({ history });
  } catch (error) {
    logger.error('Get usage history error:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

// Check specific usage limit
router.get('/check/:usageType', [
  auth,
  requireQuotaAccess,
  param('usageType').isIn([
    'aiAgentRequests',
    'apiRequests',
    'storageUsed',
    'activeUsers',
    'platformConnections',
    'customAgents',
    'supportTickets',
    'emailsSent',
    'webhookCalls',
    'exportOperations'
  ]),
  query('amount').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { usageType } = req.params;
    const { amount = 1 } = req.query;
    const organizationId = req.user.organizationId;
    
    const check = await quotaService.checkUsageLimit(organizationId, usageType, parseInt(amount));
    res.json({ check });
  } catch (error) {
    logger.error('Check usage limit error:', error);
    res.status(500).json({ error: 'Failed to check usage limit' });
  }
});

// Get plan limits
router.get('/limits', auth, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const usage = await quotaService.getCurrentUsage(organizationId);
    
    res.json({
      limits: usage.limits,
      plan: req.user.organization?.subscription?.plan || 'free'
    });
  } catch (error) {
    logger.error('Get plan limits error:', error);
    res.status(500).json({ error: 'Failed to fetch plan limits' });
  }
});

// Get available plans and their limits
router.get('/plans', auth, async (req, res) => {
  try {
    const plans = {};
    
    for (const [planName, limits] of Object.entries(quotaService.PLAN_LIMITS)) {
      plans[planName] = {
        limits,
        features: limits.features
      };
    }
    
    res.json({ plans });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Check feature access
router.get('/features/:feature', [
  auth,
  param('feature').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { feature } = req.params;
    const plan = req.user.organization?.subscription?.plan || 'free';
    
    const hasAccess = quotaService.hasFeatureAccess(plan, feature);
    
    res.json({
      feature,
      plan,
      hasAccess
    });
  } catch (error) {
    logger.error('Check feature access error:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

// ADMIN ROUTES

// Get usage for specific organization (admin only)
router.get('/admin/usage/:organizationId', [
  auth,
  requireAdminQuotaAccess,
  param('organizationId').isMongoId(),
  query('period').optional().isIn(['daily', 'monthly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { organizationId } = req.params;
    const { period = 'monthly' } = req.query;
    
    const summary = await quotaService.getUsageSummary(organizationId, period);
    res.json({ summary });
  } catch (error) {
    logger.error('Get admin usage summary error:', error);
    res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

// Update plan limits for organization (admin only)
router.put('/admin/limits/:organizationId', [
  auth,
  requireAdminQuotaAccess,
  param('organizationId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { organizationId } = req.params;
    const { plan } = req.body;
    
    if (!quotaService.PLAN_LIMITS[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    const newLimits = await quotaService.updatePlanLimits(organizationId, plan);
    
    res.json({
      organizationId,
      plan,
      limits: newLimits
    });
  } catch (error) {
    logger.error('Update plan limits error:', error);
    res.status(500).json({ error: 'Failed to update plan limits' });
  }
});

// Reset usage for organization (admin only)
router.post('/admin/reset/:organizationId', [
  auth,
  requireAdminQuotaAccess,
  param('organizationId').isMongoId(),
  query('period').isIn(['daily', 'monthly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { organizationId } = req.params;
    const { period } = req.query;
    
    const usage = await quotaService.resetUsageForPeriod(organizationId, period);
    
    res.json({
      message: 'Usage reset successfully',
      organizationId,
      period,
      usage
    });
  } catch (error) {
    logger.error('Reset usage error:', error);
    res.status(500).json({ error: 'Failed to reset usage' });
  }
});

// Get overage summary (admin only)
router.get('/admin/overages', [
  auth,
  requireAdminQuotaAccess,
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
    
    const query = {
      'overages.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (organizationId) {
      query.organizationId = organizationId;
    }
    
    const usageRecords = await quotaService.UsageTracking.find(query)
      .populate('organizationId', 'name email')
      .sort({ 'overages.date': -1 });
    
    // Extract and format overages
    const overages = [];
    usageRecords.forEach(record => {
      record.overages.forEach(overage => {
        if (overage.date >= new Date(startDate) && overage.date <= new Date(endDate)) {
          overages.push({
            organizationId: record.organizationId._id,
            organizationName: record.organizationId.name,
            type: overage.type,
            amount: overage.amount,
            cost: overage.cost,
            date: overage.date,
            period: record.period,
            periodDate: record.date
          });
        }
      });
    });
    
    // Calculate totals
    const totalCost = overages.reduce((sum, overage) => sum + overage.cost, 0);
    const totalsByType = overages.reduce((acc, overage) => {
      if (!acc[overage.type]) {
        acc[overage.type] = { count: 0, cost: 0 };
      }
      acc[overage.type].count += overage.amount;
      acc[overage.type].cost += overage.cost;
      return acc;
    }, {});
    
    res.json({
      overages,
      summary: {
        totalCost,
        totalsByType,
        count: overages.length
      },
      period: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Get overages summary error:', error);
    res.status(500).json({ error: 'Failed to fetch overages summary' });
  }
});

// Cleanup old usage records (admin only)
router.delete('/admin/cleanup', [
  auth,
  requireAdminQuotaAccess,
  query('retentionMonths').optional().isInt({ min: 1, max: 60 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { retentionMonths = 24 } = req.query;
    
    const result = await quotaService.cleanupOldUsage(parseInt(retentionMonths));
    
    res.json({
      message: 'Cleanup completed',
      deletedCount: result.deletedCount,
      retentionMonths
    });
  } catch (error) {
    logger.error('Cleanup old usage error:', error);
    res.status(500).json({ error: 'Failed to cleanup old usage records' });
  }
});

// Export usage data (admin only)
router.get('/admin/export', [
  auth,
  requireAdminQuotaAccess,
  query('format').optional().isIn(['json', 'csv']),
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
      format = 'json',
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      organizationId
    } = req.query;
    
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (organizationId) {
      query.organizationId = organizationId;
    }
    
    const usageData = await quotaService.UsageTracking.find(query)
      .populate('organizationId', 'name email subscription.plan')
      .sort({ date: -1 })
      .lean();
    
    const filename = `usage-export-${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      const csv = convertUsageToCSV(usageData);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json({ usageData });
    }
  } catch (error) {
    logger.error('Export usage data error:', error);
    res.status(500).json({ error: 'Failed to export usage data' });
  }
});

// Helper function to convert usage data to CSV
function convertUsageToCSV(usageData) {
  if (!usageData || usageData.length === 0) {
    return 'No data available';
  }

  const headers = [
    'Organization ID',
    'Organization Name',
    'Plan',
    'Period',
    'Date',
    'AI Agent Requests',
    'API Requests',
    'Storage Used (MB)',
    'Active Users',
    'Platform Connections',
    'Custom Agents',
    'Support Tickets',
    'Emails Sent',
    'Webhook Calls',
    'Export Operations',
    'Total Overages',
    'Overage Cost'
  ];

  const csvRows = [headers.join(',')];

  for (const record of usageData) {
    const totalOverageCost = record.overages?.reduce((sum, overage) => sum + (overage.cost || 0), 0) || 0;
    const totalOverages = record.overages?.length || 0;
    
    const row = [
      record.organizationId._id,
      `"${record.organizationId.name || 'N/A'}"`,
      record.organizationId.subscription?.plan || 'free',
      record.period,
      record.date.toISOString().split('T')[0],
      record.usage.aiAgentRequests || 0,
      record.usage.apiRequests || 0,
      record.usage.storageUsed || 0,
      record.usage.activeUsers || 0,
      record.usage.platformConnections || 0,
      record.usage.customAgents || 0,
      record.usage.supportTickets || 0,
      record.usage.emailsSent || 0,
      record.usage.webhookCalls || 0,
      record.usage.exportOperations || 0,
      totalOverages,
      totalOverageCost.toFixed(2)
    ];
    
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

// Export middleware functions for use in other routes
module.exports = router;
module.exports.checkUsageLimit = checkUsageLimit;
module.exports.trackUsage = trackUsage;
module.exports.requireQuotaAccess = requireQuotaAccess;