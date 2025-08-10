const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const logger = require('../../logging/logger-config');

// Usage tracking schema
const usageTrackingSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'monthly', 'yearly'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  usage: {
    aiAgentRequests: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // in MB
    activeUsers: { type: Number, default: 0 },
    platformConnections: { type: Number, default: 0 },
    customAgents: { type: Number, default: 0 },
    supportTickets: { type: Number, default: 0 },
    emailsSent: { type: Number, default: 0 },
    webhookCalls: { type: Number, default: 0 },
    exportOperations: { type: Number, default: 0 }
  },
  limits: {
    aiAgentRequests: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 },
    storageLimit: { type: Number, default: 0 }, // in MB
    maxUsers: { type: Number, default: 0 },
    maxPlatformConnections: { type: Number, default: 0 },
    maxCustomAgents: { type: Number, default: 0 },
    maxSupportTickets: { type: Number, default: 0 },
    maxEmailsPerMonth: { type: Number, default: 0 },
    maxWebhookCalls: { type: Number, default: 0 },
    maxExportsPerMonth: { type: Number, default: 0 }
  },
  warnings: [{
    type: String,
    threshold: Number,
    triggeredAt: Date,
    notificationSent: { type: Boolean, default: false }
  }],
  overages: [{
    type: String,
    amount: Number,
    cost: Number,
    date: Date
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
usageTrackingSchema.index({ organizationId: 1, period: 1, date: 1 }, { unique: true });
usageTrackingSchema.index({ date: 1, period: 1 });

const UsageTracking = mongoose.model('UsageTracking', usageTrackingSchema);

// Plan definitions with limits
const PLAN_LIMITS = {
  free: {
    aiAgentRequests: 100,
    apiRequests: 1000,
    storageLimit: 100, // MB
    maxUsers: 1,
    maxPlatformConnections: 2,
    maxCustomAgents: 1,
    maxSupportTickets: 5,
    maxEmailsPerMonth: 50,
    maxWebhookCalls: 100,
    maxExportsPerMonth: 5,
    features: ['basic_analytics', 'email_support']
  },
  starter: {
    aiAgentRequests: 1000,
    apiRequests: 10000,
    storageLimit: 1000, // MB
    maxUsers: 5,
    maxPlatformConnections: 5,
    maxCustomAgents: 3,
    maxSupportTickets: 20,
    maxEmailsPerMonth: 500,
    maxWebhookCalls: 1000,
    maxExportsPerMonth: 25,
    features: ['advanced_analytics', 'email_support', 'api_access']
  },
  professional: {
    aiAgentRequests: 10000,
    apiRequests: 100000,
    storageLimit: 10000, // MB
    maxUsers: 25,
    maxPlatformConnections: 15,
    maxCustomAgents: 10,
    maxSupportTickets: 100,
    maxEmailsPerMonth: 2500,
    maxWebhookCalls: 10000,
    maxExportsPerMonth: 100,
    features: ['advanced_analytics', 'priority_support', 'api_access', 'webhooks', 'sso']
  },
  enterprise: {
    aiAgentRequests: -1, // unlimited
    apiRequests: -1, // unlimited
    storageLimit: -1, // unlimited
    maxUsers: -1, // unlimited
    maxPlatformConnections: -1, // unlimited
    maxCustomAgents: -1, // unlimited
    maxSupportTickets: -1, // unlimited
    maxEmailsPerMonth: -1, // unlimited
    maxWebhookCalls: -1, // unlimited
    maxExportsPerMonth: -1, // unlimited
    features: ['advanced_analytics', 'dedicated_support', 'api_access', 'webhooks', 'sso', 'custom_integrations', 'white_label']
  }
};

// Warning thresholds (percentage of limit)
const WARNING_THRESHOLDS = {
  warning: 80, // 80% of limit
  critical: 95, // 95% of limit
  exceeded: 100 // 100% of limit
};

// Overage pricing (per unit over limit)
const OVERAGE_PRICING = {
  aiAgentRequests: 0.01, // $0.01 per request
  apiRequests: 0.001, // $0.001 per request
  storageLimit: 0.10, // $0.10 per MB
  maxUsers: 5.00, // $5.00 per user
  maxEmailsPerMonth: 0.02, // $0.02 per email
  maxWebhookCalls: 0.005 // $0.005 per webhook call
};

class QuotaService {
  // Get current usage for organization
  async getCurrentUsage(organizationId, period = 'monthly') {
    try {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          throw new Error('Invalid period');
      }

      let usage = await UsageTracking.findOne({
        organizationId,
        period,
        date: startDate
      });

      if (!usage) {
        // Create new usage record
        const organization = await Organization.findById(organizationId);
        if (!organization) {
          throw new Error('Organization not found');
        }

        const limits = this.getPlanLimits(organization.subscription.plan);
        
        usage = new UsageTracking({
          organizationId,
          period,
          date: startDate,
          usage: {},
          limits
        });
        
        await usage.save();
      }

      return usage;
    } catch (error) {
      logger.error('Get current usage error:', error);
      throw error;
    }
  }

  // Get plan limits
  getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  }

  // Check if organization has feature access
  hasFeatureAccess(plan, feature) {
    const planLimits = this.getPlanLimits(plan);
    return planLimits.features.includes(feature);
  }

  // Track usage
  async trackUsage(organizationId, usageType, amount = 1, metadata = {}) {
    try {
      const usage = await this.getCurrentUsage(organizationId, 'monthly');
      
      // Update usage
      usage.usage[usageType] = (usage.usage[usageType] || 0) + amount;
      
      // Check for warnings and overages
      await this.checkLimitsAndNotify(usage, usageType);
      
      await usage.save();
      
      // Log usage tracking
      await auditService.logEvent({
        eventType: 'usage_tracked',
        eventCategory: 'quota',
        eventAction: 'track_usage',
        organizationId,
        metadata: {
          usageType,
          amount,
          newTotal: usage.usage[usageType],
          limit: usage.limits[usageType],
          ...metadata
        }
      });

      return usage;
    } catch (error) {
      logger.error('Track usage error:', error);
      throw error;
    }
  }

  // Check if usage is within limits
  async checkUsageLimit(organizationId, usageType, requestedAmount = 1) {
    try {
      const usage = await this.getCurrentUsage(organizationId, 'monthly');
      const currentUsage = usage.usage[usageType] || 0;
      const limit = usage.limits[usageType];
      
      // Unlimited (-1) means no limit
      if (limit === -1) {
        return {
          allowed: true,
          currentUsage,
          limit,
          remaining: -1,
          willExceed: false
        };
      }
      
      const newUsage = currentUsage + requestedAmount;
      const willExceed = newUsage > limit;
      
      return {
        allowed: !willExceed,
        currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage),
        willExceed,
        overage: willExceed ? newUsage - limit : 0
      };
    } catch (error) {
      logger.error('Check usage limit error:', error);
      throw error;
    }
  }

  // Check limits and send notifications
  async checkLimitsAndNotify(usage, usageType) {
    try {
      const currentUsage = usage.usage[usageType] || 0;
      const limit = usage.limits[usageType];
      
      // Skip if unlimited
      if (limit === -1) return;
      
      const percentage = (currentUsage / limit) * 100;
      
      // Check thresholds
      for (const [thresholdName, thresholdValue] of Object.entries(WARNING_THRESHOLDS)) {
        if (percentage >= thresholdValue) {
          // Check if we already sent this warning
          const existingWarning = usage.warnings.find(
            w => w.type === `${usageType}_${thresholdName}` && 
                 w.threshold === thresholdValue
          );
          
          if (!existingWarning || !existingWarning.notificationSent) {
            await this.sendUsageNotification(usage.organizationId, usageType, thresholdName, {
              currentUsage,
              limit,
              percentage: Math.round(percentage)
            });
            
            // Record warning
            if (existingWarning) {
              existingWarning.notificationSent = true;
            } else {
              usage.warnings.push({
                type: `${usageType}_${thresholdName}`,
                threshold: thresholdValue,
                triggeredAt: new Date(),
                notificationSent: true
              });
            }
          }
          
          // Handle overage
          if (thresholdName === 'exceeded') {
            await this.handleOverage(usage, usageType, currentUsage - limit);
          }
        }
      }
    } catch (error) {
      logger.error('Check limits and notify error:', error);
    }
  }

  // Handle usage overage
  async handleOverage(usage, usageType, overageAmount) {
    try {
      const organization = await Organization.findById(usage.organizationId);
      if (!organization) return;
      
      // Calculate overage cost
      const unitCost = OVERAGE_PRICING[usageType] || 0;
      const overageCost = overageAmount * unitCost;
      
      // Record overage
      usage.overages.push({
        type: usageType,
        amount: overageAmount,
        cost: overageCost,
        date: new Date()
      });
      
      // Update organization's overage charges
      if (!organization.billing.overageCharges) {
        organization.billing.overageCharges = [];
      }
      
      organization.billing.overageCharges.push({
        type: usageType,
        amount: overageAmount,
        cost: overageCost,
        date: new Date(),
        period: usage.period,
        periodDate: usage.date
      });
      
      await organization.save();
      
      // Send overage notification
      await this.sendOverageNotification(usage.organizationId, usageType, {
        overageAmount,
        overageCost,
        unitCost
      });
      
      // Log overage event
      await auditService.logEvent({
        eventType: 'usage_overage',
        eventCategory: 'billing',
        eventAction: 'overage_charged',
        organizationId: usage.organizationId,
        metadata: {
          usageType,
          overageAmount,
          overageCost,
          unitCost
        }
      });
    } catch (error) {
      logger.error('Handle overage error:', error);
    }
  }

  // Send usage notification
  async sendUsageNotification(organizationId, usageType, thresholdType, data) {
    try {
      const organization = await Organization.findById(organizationId).populate('owner');
      if (!organization) return;
      
      const { currentUsage, limit, percentage } = data;
      
      let title, message, priority;
      
      switch (thresholdType) {
        case 'warning':
          title = `Usage Warning: ${usageType}`;
          message = `Your ${usageType} usage is at ${percentage}% (${currentUsage}/${limit}). Consider upgrading your plan.`;
          priority = 'medium';
          break;
        case 'critical':
          title = `Critical Usage Alert: ${usageType}`;
          message = `Your ${usageType} usage is at ${percentage}% (${currentUsage}/${limit}). You're approaching your limit.`;
          priority = 'high';
          break;
        case 'exceeded':
          title = `Usage Limit Exceeded: ${usageType}`;
          message = `Your ${usageType} usage has exceeded the limit (${currentUsage}/${limit}). Overage charges may apply.`;
          priority = 'urgent';
          break;
      }
      
      await notificationService.sendNotification({
        recipientId: organization.owner._id,
        organizationId,
        title,
        message,
        type: 'usage_alert',
        priority,
        channels: ['email', 'in_app'],
        metadata: {
          usageType,
          currentUsage,
          limit,
          percentage,
          thresholdType
        }
      });
    } catch (error) {
      logger.error('Send usage notification error:', error);
    }
  }

  // Send overage notification
  async sendOverageNotification(organizationId, usageType, data) {
    try {
      const organization = await Organization.findById(organizationId).populate('owner');
      if (!organization) return;
      
      const { overageAmount, overageCost, unitCost } = data;
      
      await notificationService.sendNotification({
        recipientId: organization.owner._id,
        organizationId,
        title: 'Overage Charges Applied',
        message: `You've been charged $${overageCost.toFixed(2)} for ${overageAmount} ${usageType} overage (${unitCost}/unit).`,
        type: 'billing_alert',
        priority: 'high',
        channels: ['email', 'in_app'],
        metadata: {
          usageType,
          overageAmount,
          overageCost,
          unitCost
        }
      });
    } catch (error) {
      logger.error('Send overage notification error:', error);
    }
  }

  // Get usage summary for organization
  async getUsageSummary(organizationId, period = 'monthly') {
    try {
      const usage = await this.getCurrentUsage(organizationId, period);
      const organization = await Organization.findById(organizationId);
      
      if (!organization) {
        throw new Error('Organization not found');
      }
      
      const planLimits = this.getPlanLimits(organization.subscription.plan);
      
      const summary = {
        organizationId,
        plan: organization.subscription.plan,
        period,
        periodDate: usage.date,
        usage: usage.usage,
        limits: usage.limits,
        utilization: {},
        warnings: usage.warnings,
        overages: usage.overages,
        features: planLimits.features
      };
      
      // Calculate utilization percentages
      for (const [key, limit] of Object.entries(usage.limits)) {
        const currentUsage = usage.usage[key] || 0;
        if (limit === -1) {
          summary.utilization[key] = 0; // Unlimited
        } else {
          summary.utilization[key] = Math.round((currentUsage / limit) * 100);
        }
      }
      
      return summary;
    } catch (error) {
      logger.error('Get usage summary error:', error);
      throw error;
    }
  }

  // Reset usage for new period
  async resetUsageForPeriod(organizationId, period) {
    try {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          throw new Error('Invalid period');
      }
      
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }
      
      const limits = this.getPlanLimits(organization.subscription.plan);
      
      // Create new usage record for the period
      const usage = new UsageTracking({
        organizationId,
        period,
        date: startDate,
        usage: {},
        limits
      });
      
      await usage.save();
      
      return usage;
    } catch (error) {
      logger.error('Reset usage for period error:', error);
      throw error;
    }
  }

  // Update plan limits when subscription changes
  async updatePlanLimits(organizationId, newPlan) {
    try {
      const newLimits = this.getPlanLimits(newPlan);
      
      // Update current period usage limits
      await UsageTracking.updateMany(
        {
          organizationId,
          date: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        { $set: { limits: newLimits } }
      );
      
      // Log plan change
      await auditService.logEvent({
        eventType: 'plan_changed',
        eventCategory: 'subscription',
        eventAction: 'update_limits',
        organizationId,
        metadata: {
          newPlan,
          newLimits
        }
      });
      
      return newLimits;
    } catch (error) {
      logger.error('Update plan limits error:', error);
      throw error;
    }
  }

  // Get historical usage data
  async getHistoricalUsage(organizationId, period = 'monthly', months = 12) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      const usage = await UsageTracking.find({
        organizationId,
        period,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ date: 1 });
      
      return usage;
    } catch (error) {
      logger.error('Get historical usage error:', error);
      throw error;
    }
  }

  // Clean up old usage records
  async cleanupOldUsage(retentionMonths = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
      
      const result = await UsageTracking.deleteMany({
        date: { $lt: cutoffDate }
      });
      
      logger.info(`Cleaned up ${result.deletedCount} old usage records`);
      return result;
    } catch (error) {
      logger.error('Cleanup old usage error:', error);
      throw error;
    }
  }
}

module.exports = new QuotaService();
module.exports.UsageTracking = UsageTracking;
module.exports.PLAN_LIMITS = PLAN_LIMITS;
module.exports.WARNING_THRESHOLDS = WARNING_THRESHOLDS;
module.exports.OVERAGE_PRICING = OVERAGE_PRICING;