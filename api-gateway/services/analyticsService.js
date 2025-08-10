const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const logger = require('../../logging/logger-config');

// Usage Tracking Schema
const usageTrackingSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'agent_request',
      'api_call',
      'storage_usage',
      'user_login',
      'feature_usage',
      'platform_connection',
      'email_sent',
      'document_processed'
    ],
    required: true
  },
  eventCategory: {
    type: String,
    required: true
  },
  eventAction: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    default: 1
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Business Metrics Schema
const businessMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  metrics: {
    // Revenue Metrics
    mrr: { type: Number, default: 0 }, // Monthly Recurring Revenue
    arr: { type: Number, default: 0 }, // Annual Recurring Revenue
    totalRevenue: { type: Number, default: 0 },
    newRevenue: { type: Number, default: 0 },
    churnedRevenue: { type: Number, default: 0 },
    expansionRevenue: { type: Number, default: 0 },
    
    // User Metrics
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    churnedUsers: { type: Number, default: 0 },
    
    // Organization Metrics
    totalOrganizations: { type: Number, default: 0 },
    activeOrganizations: { type: Number, default: 0 },
    newOrganizations: { type: Number, default: 0 },
    churnedOrganizations: { type: Number, default: 0 },
    
    // Subscription Metrics
    totalSubscriptions: { type: Number, default: 0 },
    activeSubscriptions: { type: Number, default: 0 },
    newSubscriptions: { type: Number, default: 0 },
    cancelledSubscriptions: { type: Number, default: 0 },
    
    // Usage Metrics
    totalAgentRequests: { type: Number, default: 0 },
    totalApiCalls: { type: Number, default: 0 },
    totalStorageUsed: { type: Number, default: 0 },
    
    // Engagement Metrics
    avgSessionDuration: { type: Number, default: 0 },
    avgRequestsPerUser: { type: Number, default: 0 },
    featureAdoptionRate: { type: Number, default: 0 },
    
    // Financial Metrics
    ltv: { type: Number, default: 0 }, // Lifetime Value
    cac: { type: Number, default: 0 }, // Customer Acquisition Cost
    churnRate: { type: Number, default: 0 },
    grossChurnRate: { type: Number, default: 0 },
    netChurnRate: { type: Number, default: 0 }
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
usageTrackingSchema.index({ organizationId: 1, timestamp: -1 });
usageTrackingSchema.index({ userId: 1, timestamp: -1 });
usageTrackingSchema.index({ eventType: 1, timestamp: -1 });
usageTrackingSchema.index({ timestamp: -1 });

businessMetricsSchema.index({ date: 1, period: 1 }, { unique: true });
businessMetricsSchema.index({ period: 1, date: -1 });

const AnalyticsTracking = mongoose.model('AnalyticsTracking', usageTrackingSchema);
const BusinessMetrics = mongoose.model('BusinessMetrics', businessMetricsSchema);

class AnalyticsService {
  // Usage Tracking
  async trackEvent(eventData) {
    try {
      const usage = new AnalyticsTracking(eventData);
      await usage.save();
      
      // Update organization usage in real-time
      if (eventData.organizationId) {
        await this.updateOrganizationUsage(eventData.organizationId, eventData.eventType, eventData.value || 1);
      }
      
      return usage;
    } catch (error) {
      logger.error('Track event error:', error);
      throw error;
    }
  }

  async updateOrganizationUsage(organizationId, eventType, value = 1) {
    try {
      const updateField = this.getUsageField(eventType);
      if (updateField) {
        await Organization.findByIdAndUpdate(
          organizationId,
          { $inc: { [`usage.${updateField}`]: value } }
        );
      }
    } catch (error) {
      logger.error('Update organization usage error:', error);
    }
  }

  getUsageField(eventType) {
    const mapping = {
      'agent_request': 'agentRequests',
      'api_call': 'apiRequests',
      'storage_usage': 'storageUsed',
      'email_sent': 'emailsSent'
    };
    return mapping[eventType];
  }

  // Business Metrics Calculation
  async calculateDailyMetrics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const metrics = await this.calculateMetricsForPeriod(startOfDay, endOfDay);
      
      await BusinessMetrics.findOneAndUpdate(
        { date: startOfDay, period: 'daily' },
        { metrics, calculatedAt: new Date() },
        { upsert: true, new: true }
      );

      return metrics;
    } catch (error) {
      logger.error('Calculate daily metrics error:', error);
      throw error;
    }
  }

  async calculateMonthlyMetrics(date = new Date()) {
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const metrics = await this.calculateMetricsForPeriod(startOfMonth, endOfMonth);
      
      await BusinessMetrics.findOneAndUpdate(
        { date: startOfMonth, period: 'monthly' },
        { metrics, calculatedAt: new Date() },
        { upsert: true, new: true }
      );

      return metrics;
    } catch (error) {
      logger.error('Calculate monthly metrics error:', error);
      throw error;
    }
  }

  async calculateMetricsForPeriod(startDate, endDate) {
    try {
      const [revenueMetrics, userMetrics, organizationMetrics, subscriptionMetrics, usageMetrics] = await Promise.all([
        this.calculateRevenueMetrics(startDate, endDate),
        this.calculateUserMetrics(startDate, endDate),
        this.calculateOrganizationMetrics(startDate, endDate),
        this.calculateSubscriptionMetrics(startDate, endDate),
        this.calculateUsageMetrics(startDate, endDate)
      ]);

      const engagementMetrics = await this.calculateEngagementMetrics(startDate, endDate);
      const financialMetrics = await this.calculateFinancialMetrics(startDate, endDate);

      return {
        ...revenueMetrics,
        ...userMetrics,
        ...organizationMetrics,
        ...subscriptionMetrics,
        ...usageMetrics,
        ...engagementMetrics,
        ...financialMetrics
      };
    } catch (error) {
      logger.error('Calculate metrics for period error:', error);
      throw error;
    }
  }

  async calculateRevenueMetrics(startDate, endDate) {
    try {
      const [totalRevenue, newRevenue, activeSubscriptions] = await Promise.all([
        Invoice.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Invoice.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Subscription.countDocuments({ status: 'active' })
      ]);

      const totalRevenueAmount = totalRevenue[0]?.total || 0;
      const newRevenueAmount = newRevenue[0]?.total || 0;

      // Calculate MRR (Monthly Recurring Revenue)
      const mrrData = await Subscription.aggregate([
        { $match: { status: 'active' } },
        { $lookup: { from: 'invoices', localField: '_id', foreignField: 'subscriptionId', as: 'invoices' } },
        { $unwind: '$invoices' },
        { $match: { 'invoices.status': 'paid' } },
        { $group: { _id: null, mrr: { $sum: '$invoices.amount' } } }
      ]);

      const mrr = mrrData[0]?.mrr || 0;
      const arr = mrr * 12;

      return {
        totalRevenue: totalRevenueAmount,
        newRevenue: newRevenueAmount,
        mrr,
        arr
      };
    } catch (error) {
      logger.error('Calculate revenue metrics error:', error);
      return { totalRevenue: 0, newRevenue: 0, mrr: 0, arr: 0 };
    }
  }

  async calculateUserMetrics(startDate, endDate) {
    try {
      const [totalUsers, activeUsers, newUsers] = await Promise.all([
        User.countDocuments({ status: { $ne: 'deleted' } }),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'deleted' }
        })
      ]);

      return {
        totalUsers,
        activeUsers,
        newUsers
      };
    } catch (error) {
      logger.error('Calculate user metrics error:', error);
      return { totalUsers: 0, activeUsers: 0, newUsers: 0 };
    }
  }

  async calculateOrganizationMetrics(startDate, endDate) {
    try {
      const [totalOrganizations, activeOrganizations, newOrganizations] = await Promise.all([
        Organization.countDocuments(),
        Organization.countDocuments({ status: 'active' }),
        Organization.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        })
      ]);

      return {
        totalOrganizations,
        activeOrganizations,
        newOrganizations
      };
    } catch (error) {
      logger.error('Calculate organization metrics error:', error);
      return { totalOrganizations: 0, activeOrganizations: 0, newOrganizations: 0 };
    }
  }

  async calculateSubscriptionMetrics(startDate, endDate) {
    try {
      const [totalSubscriptions, activeSubscriptions, newSubscriptions, cancelledSubscriptions] = await Promise.all([
        Subscription.countDocuments(),
        Subscription.countDocuments({ status: 'active' }),
        Subscription.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        }),
        Subscription.countDocuments({
          status: 'cancelled',
          updatedAt: { $gte: startDate, $lte: endDate }
        })
      ]);

      return {
        totalSubscriptions,
        activeSubscriptions,
        newSubscriptions,
        cancelledSubscriptions
      };
    } catch (error) {
      logger.error('Calculate subscription metrics error:', error);
      return { totalSubscriptions: 0, activeSubscriptions: 0, newSubscriptions: 0, cancelledSubscriptions: 0 };
    }
  }

  async calculateUsageMetrics(startDate, endDate) {
    try {
      const usageData = await AnalyticsTracking.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$eventType',
            total: { $sum: '$value' }
          }
        }
      ]);

      const metrics = {
        totalAgentRequests: 0,
        totalApiCalls: 0,
        totalStorageUsed: 0
      };

      usageData.forEach(item => {
        switch (item._id) {
          case 'agent_request':
            metrics.totalAgentRequests = item.total;
            break;
          case 'api_call':
            metrics.totalApiCalls = item.total;
            break;
          case 'storage_usage':
            metrics.totalStorageUsed = item.total;
            break;
        }
      });

      return metrics;
    } catch (error) {
      logger.error('Calculate usage metrics error:', error);
      return { totalAgentRequests: 0, totalApiCalls: 0, totalStorageUsed: 0 };
    }
  }

  async calculateEngagementMetrics(startDate, endDate) {
    try {
      // Calculate average session duration
      const sessionData = await AnalyticsTracking.aggregate([
        { $match: { eventType: 'user_login', timestamp: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$sessionId', duration: { $max: '$timestamp' } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ]);

      // Calculate average requests per user
      const requestData = await AnalyticsTracking.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$userId', requests: { $sum: 1 } } },
        { $group: { _id: null, avgRequests: { $avg: '$requests' } } }
      ]);

      return {
        avgSessionDuration: sessionData[0]?.avgDuration || 0,
        avgRequestsPerUser: requestData[0]?.avgRequests || 0,
        featureAdoptionRate: 0 // This would need more complex calculation
      };
    } catch (error) {
      logger.error('Calculate engagement metrics error:', error);
      return { avgSessionDuration: 0, avgRequestsPerUser: 0, featureAdoptionRate: 0 };
    }
  }

  async calculateFinancialMetrics(startDate, endDate) {
    try {
      // Calculate LTV (simplified)
      const ltvData = await Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$organizationId', totalRevenue: { $sum: '$amount' } } },
        { $group: { _id: null, avgLTV: { $avg: '$totalRevenue' } } }
      ]);

      // Calculate churn rate
      const [totalSubscriptionsStart, cancelledInPeriod] = await Promise.all([
        Subscription.countDocuments({ createdAt: { $lt: startDate } }),
        Subscription.countDocuments({
          status: 'cancelled',
          updatedAt: { $gte: startDate, $lte: endDate }
        })
      ]);

      const churnRate = totalSubscriptionsStart > 0 ? (cancelledInPeriod / totalSubscriptionsStart) * 100 : 0;

      return {
        ltv: ltvData[0]?.avgLTV || 0,
        cac: 0, // Would need marketing spend data
        churnRate,
        grossChurnRate: churnRate,
        netChurnRate: churnRate // Simplified, would need expansion revenue
      };
    } catch (error) {
      logger.error('Calculate financial metrics error:', error);
      return { ltv: 0, cac: 0, churnRate: 0, grossChurnRate: 0, netChurnRate: 0 };
    }
  }

  // Analytics Queries
  async getMetrics(period = 'daily', startDate, endDate, limit = 30) {
    try {
      const query = { period };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const metrics = await BusinessMetrics.find(query)
        .sort({ date: -1 })
        .limit(limit)
        .lean();

      return metrics;
    } catch (error) {
      logger.error('Get metrics error:', error);
      throw error;
    }
  }

  async getUsageAnalytics(organizationId, startDate, endDate) {
    try {
      const query = { timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } };
      if (organizationId) {
        query.organizationId = mongoose.Types.ObjectId(organizationId);
      }

      const analytics = await AnalyticsTracking.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              eventType: '$eventType',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            count: { $sum: '$value' }
          }
        },
        {
          $group: {
            _id: '$_id.eventType',
            data: {
              $push: {
                date: '$_id.date',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        }
      ]);

      return analytics;
    } catch (error) {
      logger.error('Get usage analytics error:', error);
      throw error;
    }
  }

  async getRevenueAnalytics(startDate, endDate) {
    try {
      const analytics = await Invoice.aggregate([
        {
          $match: {
            status: 'paid',
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      return analytics;
    } catch (error) {
      logger.error('Get revenue analytics error:', error);
      throw error;
    }
  }

  async getUserGrowthAnalytics(startDate, endDate) {
    try {
      const analytics = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $ne: 'deleted' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      return analytics;
    } catch (error) {
      logger.error('Get user growth analytics error:', error);
      throw error;
    }
  }

  async getChurnAnalytics(startDate, endDate) {
    try {
      const analytics = await Subscription.aggregate([
        {
          $match: {
            status: 'cancelled',
            updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            churnedSubscriptions: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      return analytics;
    } catch (error) {
      logger.error('Get churn analytics error:', error);
      throw error;
    }
  }

  async getTopOrganizations(metric = 'revenue', limit = 10) {
    try {
      let pipeline = [];

      switch (metric) {
        case 'revenue':
          pipeline = [
            { $lookup: { from: 'invoices', localField: '_id', foreignField: 'organizationId', as: 'invoices' } },
            { $unwind: '$invoices' },
            { $match: { 'invoices.status': 'paid' } },
            { $group: { _id: '$_id', name: { $first: '$name' }, totalRevenue: { $sum: '$invoices.amount' } } },
            { $sort: { totalRevenue: -1 } }
          ];
          break;
        case 'usage':
          pipeline = [
            { $sort: { 'usage.agentRequests': -1 } },
            { $project: { name: 1, 'usage.agentRequests': 1, 'usage.apiRequests': 1, 'usage.storageUsed': 1 } }
          ];
          break;
        case 'users':
          pipeline = [
            { $sort: { 'usage.userCount': -1 } },
            { $project: { name: 1, 'usage.userCount': 1 } }
          ];
          break;
      }

      const organizations = await Organization.aggregate(pipeline).limit(limit);
      return organizations;
    } catch (error) {
      logger.error('Get top organizations error:', error);
      throw error;
    }
  }

  // Real-time Analytics
  async getRealTimeMetrics() {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [activeUsers, recentActivity, systemHealth] = await Promise.all([
        this.getActiveUsersCount(lastHour),
        this.getRecentActivity(last24Hours),
        this.getSystemHealth()
      ]);

      return {
        activeUsers,
        recentActivity,
        systemHealth,
        timestamp: now
      };
    } catch (error) {
      logger.error('Get real-time metrics error:', error);
      throw error;
    }
  }

  async getActiveUsersCount(since) {
    try {
      const count = await AnalyticsTracking.distinct('userId', {
        timestamp: { $gte: since }
      });
      return count.length;
    } catch (error) {
      logger.error('Get active users count error:', error);
      return 0;
    }
  }

  async getRecentActivity(since) {
    try {
      const activity = await AnalyticsTracking.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            lastActivity: { $max: '$timestamp' }
          }
        }
      ]);

      return activity;
    } catch (error) {
      logger.error('Get recent activity error:', error);
      return [];
    }
  }

  async getSystemHealth() {
    try {
      // This would integrate with your monitoring system
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      };
    } catch (error) {
      logger.error('Get system health error:', error);
      return { status: 'unknown' };
    }
  }

  // Automated Reporting
  async generateDailyReport(date = new Date()) {
    try {
      const metrics = await this.calculateDailyMetrics(date);
      
      const report = {
        date: date.toISOString().split('T')[0],
        period: 'daily',
        summary: {
          revenue: metrics.totalRevenue,
          newUsers: metrics.newUsers,
          activeUsers: metrics.activeUsers,
          churnRate: metrics.churnRate
        },
        metrics,
        generatedAt: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Generate daily report error:', error);
      throw error;
    }
  }

  async generateMonthlyReport(date = new Date()) {
    try {
      const metrics = await this.calculateMonthlyMetrics(date);
      
      const report = {
        date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0],
        period: 'monthly',
        summary: {
          mrr: metrics.mrr,
          arr: metrics.arr,
          totalRevenue: metrics.totalRevenue,
          churnRate: metrics.churnRate,
          ltv: metrics.ltv
        },
        metrics,
        generatedAt: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Generate monthly report error:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();