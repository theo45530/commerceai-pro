const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  // Basic Information
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
  
  // Stripe Information
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  stripeProductId: {
    type: String,
    required: true
  },
  
  // Plan Information
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise', 'custom'],
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  
  // Pricing
  amount: {
    type: Number,
    required: true // Amount in cents
  },
  currency: {
    type: String,
    required: true,
    default: 'eur',
    enum: ['eur', 'usd', 'gbp', 'cad', 'aud']
  },
  interval: {
    type: String,
    enum: ['month', 'year'],
    required: true,
    default: 'month'
  },
  intervalCount: {
    type: Number,
    default: 1
  },
  
  // Status
  status: {
    type: String,
    enum: [
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    ],
    required: true,
    default: 'trialing'
  },
  
  // Dates
  currentPeriodStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  trialStart: {
    type: Date,
    default: null
  },
  trialEnd: {
    type: Date,
    default: null
  },
  canceledAt: {
    type: Date,
    default: null
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  endedAt: {
    type: Date,
    default: null
  },
  
  // Plan Features & Limits
  features: {
    // AI Agent Limits
    agentRequestsLimit: {
      type: Number,
      required: true
    },
    maxConcurrentRequests: {
      type: Number,
      required: true
    },
    
    // User Limits
    userLimit: {
      type: Number,
      required: true
    },
    
    // Storage Limits
    storageLimit: {
      type: Number,
      required: true // in bytes
    },
    
    // API Limits
    apiRequestsLimit: {
      type: Number,
      required: true
    },
    
    // Platform Connections
    platformConnectionsLimit: {
      type: Number,
      required: true
    },
    
    // Features
    enabledFeatures: [{
      type: String,
      enum: [
        'analytics',
        'notifications',
        'backup',
        'api_access',
        'webhooks',
        'custom_branding',
        'priority_support',
        'advanced_reporting',
        'white_label',
        'custom_integrations',
        'dedicated_support',
        'sla_guarantee'
      ]
    }],
    
    // Support Level
    supportLevel: {
      type: String,
      enum: ['community', 'email', 'priority', 'dedicated'],
      required: true
    },
    
    // Response Time SLA (in hours)
    supportResponseTime: {
      type: Number,
      required: true
    }
  },
  
  // Billing
  nextBillingDate: {
    type: Date,
    required: true
  },
  lastBillingDate: {
    type: Date,
    default: null
  },
  
  // Discounts & Coupons
  discount: {
    couponId: {
      type: String,
      default: null
    },
    percentOff: {
      type: Number,
      default: null
    },
    amountOff: {
      type: Number,
      default: null
    },
    duration: {
      type: String,
      enum: ['once', 'repeating', 'forever'],
      default: null
    },
    durationInMonths: {
      type: Number,
      default: null
    },
    validUntil: {
      type: Date,
      default: null
    }
  },
  
  // Payment Method
  defaultPaymentMethod: {
    stripePaymentMethodId: {
      type: String,
      default: null
    },
    type: {
      type: String,
      enum: ['card', 'sepa_debit', 'bank_transfer'],
      default: 'card'
    },
    last4: {
      type: String,
      default: null
    },
    brand: {
      type: String,
      default: null
    },
    expiryMonth: {
      type: Number,
      default: null
    },
    expiryYear: {
      type: Number,
      default: null
    }
  },
  
  // Usage Tracking
  currentUsage: {
    agentRequests: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0
    },
    apiRequests: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 1
    },
    platformConnections: {
      type: Number,
      default: 0
    }
  },
  
  // Notifications
  notifications: {
    paymentFailed: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      count: {
        type: Number,
        default: 0
      }
    },
    usageWarning: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      threshold: {
        type: Number,
        default: 80 // percentage
      }
    },
    renewalReminder: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      }
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ organizationId: 1 });
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });
subscriptionSchema.index({ plan: 1 });

// Virtual for trial status
subscriptionSchema.virtual('isTrialing').get(function() {
  return this.status === 'trialing' && this.trialEnd && this.trialEnd > new Date();
});

// Virtual for active status
subscriptionSchema.virtual('isActive').get(function() {
  return ['trialing', 'active'].includes(this.status);
});

// Virtual for days until renewal
subscriptionSchema.virtual('daysUntilRenewal').get(function() {
  const now = new Date();
  const renewal = new Date(this.currentPeriodEnd);
  const diffTime = renewal - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for usage percentage
subscriptionSchema.virtual('usagePercentage').get(function() {
  const agentUsage = (this.currentUsage.agentRequests / this.features.agentRequestsLimit) * 100;
  const storageUsage = (this.currentUsage.storageUsed / this.features.storageLimit) * 100;
  const apiUsage = (this.currentUsage.apiRequests / this.features.apiRequestsLimit) * 100;
  
  return {
    agentRequests: Math.min(100, agentUsage),
    storage: Math.min(100, storageUsage),
    apiRequests: Math.min(100, apiUsage)
  };
});

// Method to check if feature is available
subscriptionSchema.methods.hasFeature = function(feature) {
  return this.features.enabledFeatures.includes(feature);
};

// Method to check usage limits
subscriptionSchema.methods.checkUsageLimit = function(type) {
  switch (type) {
    case 'agent_requests':
      return this.currentUsage.agentRequests < this.features.agentRequestsLimit;
    case 'storage':
      return this.currentUsage.storageUsed < this.features.storageLimit;
    case 'api_requests':
      return this.currentUsage.apiRequests < this.features.apiRequestsLimit;
    case 'users':
      return this.currentUsage.activeUsers < this.features.userLimit;
    case 'platform_connections':
      return this.currentUsage.platformConnections < this.features.platformConnectionsLimit;
    default:
      return true;
  }
};

// Method to increment usage
subscriptionSchema.methods.incrementUsage = function(type, amount = 1) {
  const updateField = `currentUsage.${type}`;
  return this.updateOne({ $inc: { [updateField]: amount } });
};

// Method to reset usage for new billing period
subscriptionSchema.methods.resetUsage = function() {
  return this.updateOne({
    $set: {
      'currentUsage.agentRequests': 0,
      'currentUsage.apiRequests': 0,
      'notifications.paymentFailed.sent': false,
      'notifications.usageWarning.sent': false,
      'notifications.renewalReminder.sent': false
    }
  });
};

// Method to calculate prorated amount for plan changes
subscriptionSchema.methods.calculateProration = function(newAmount) {
  const now = new Date();
  const periodStart = new Date(this.currentPeriodStart);
  const periodEnd = new Date(this.currentPeriodEnd);
  
  const totalPeriodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
  
  const currentDailyRate = this.amount / totalPeriodDays;
  const newDailyRate = newAmount / totalPeriodDays;
  
  const refund = currentDailyRate * remainingDays;
  const charge = newDailyRate * remainingDays;
  
  return {
    refund: Math.round(refund),
    charge: Math.round(charge),
    difference: Math.round(charge - refund),
    remainingDays
  };
};

// Static method to get plan configuration
subscriptionSchema.statics.getPlanConfig = function(planType) {
  const plans = {
    starter: {
      name: 'Starter',
      amount: 9900, // €99 in cents
      features: {
        agentRequestsLimit: 1000,
        maxConcurrentRequests: 5,
        userLimit: 3,
        storageLimit: 1073741824, // 1GB
        apiRequestsLimit: 5000,
        platformConnectionsLimit: 5,
        enabledFeatures: ['analytics', 'notifications'],
        supportLevel: 'email',
        supportResponseTime: 48
      }
    },
    professional: {
      name: 'Professional',
      amount: 29900, // €299 in cents
      features: {
        agentRequestsLimit: 10000,
        maxConcurrentRequests: 15,
        userLimit: 10,
        storageLimit: 5368709120, // 5GB
        apiRequestsLimit: 25000,
        platformConnectionsLimit: 15,
        enabledFeatures: [
          'analytics',
          'notifications',
          'backup',
          'api_access',
          'webhooks',
          'advanced_reporting'
        ],
        supportLevel: 'priority',
        supportResponseTime: 24
      }
    },
    enterprise: {
      name: 'Enterprise',
      amount: 99900, // €999 in cents
      features: {
        agentRequestsLimit: 100000,
        maxConcurrentRequests: 50,
        userLimit: 50,
        storageLimit: 53687091200, // 50GB
        apiRequestsLimit: 100000,
        platformConnectionsLimit: 50,
        enabledFeatures: [
          'analytics',
          'notifications',
          'backup',
          'api_access',
          'webhooks',
          'custom_branding',
          'priority_support',
          'advanced_reporting',
          'white_label',
          'custom_integrations',
          'sla_guarantee'
        ],
        supportLevel: 'dedicated',
        supportResponseTime: 4
      }
    }
  };
  
  return plans[planType] || null;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);