const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  
  // Business Information
  industry: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    default: '1-10'
  },
  foundedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },
  
  // Branding
  logo: {
    type: String,
    default: null
  },
  primaryColor: {
    type: String,
    default: '#6366f1'
  },
  secondaryColor: {
    type: String,
    default: '#8b5cf6'
  },
  
  // Owner Information
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Subscription & Billing
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  
  // Settings
  settings: {
    // General Settings
    timezone: {
      type: String,
      default: 'Europe/Paris'
    },
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'es', 'de', 'it']
    },
    currency: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GBP', 'CAD', 'AUD']
    },
    
    // Security Settings
    requireTwoFactor: {
      type: Boolean,
      default: false
    },
    allowedDomains: [{
      type: String,
      lowercase: true
    }],
    sessionTimeout: {
      type: Number,
      default: 24 // hours
    },
    
    // Feature Settings
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
        'advanced_reporting'
      ]
    }],
    
    // AI Agent Settings
    agentSettings: {
      maxConcurrentRequests: {
        type: Number,
        default: 10
      },
      requestsPerMinute: {
        type: Number,
        default: 60
      },
      contextLength: {
        type: Number,
        default: 4000
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 2
      }
    },
    
    // Notification Settings
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        events: [{
          type: String,
          enum: [
            'user_joined',
            'user_left',
            'subscription_changed',
            'payment_failed',
            'usage_limit_reached',
            'security_alert',
            'system_maintenance'
          ]
        }]
      },
      slack: {
        enabled: {
          type: Boolean,
          default: false
        },
        webhookUrl: {
          type: String,
          select: false
        }
      },
      discord: {
        enabled: {
          type: Boolean,
          default: false
        },
        webhookUrl: {
          type: String,
          select: false
        }
      }
    }
  },
  
  // Usage & Limits
  usage: {
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: function() {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date;
      }
    },
    
    // AI Agent Usage
    agentRequests: {
      type: Number,
      default: 0
    },
    agentRequestsLimit: {
      type: Number,
      default: 1000
    },
    
    // Storage Usage
    storageUsed: {
      type: Number,
      default: 0 // in bytes
    },
    storageLimit: {
      type: Number,
      default: 1073741824 // 1GB in bytes
    },
    
    // API Usage
    apiRequests: {
      type: Number,
      default: 0
    },
    apiRequestsLimit: {
      type: Number,
      default: 10000
    },
    
    // User Limits
    userCount: {
      type: Number,
      default: 1
    },
    userLimit: {
      type: Number,
      default: 5
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled', 'trial'],
    default: 'trial'
  },
  
  // Trial Information
  trialEndsAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 14); // 14-day trial
      return date;
    }
  },
  
  // Compliance & Legal
  gdprConsent: {
    given: {
      type: Boolean,
      default: false
    },
    givenAt: {
      type: Date,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    }
  },
  
  termsAccepted: {
    version: {
      type: String,
      default: null
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
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
organizationSchema.index({ slug: 1 });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ stripeCustomerId: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ trialEndsAt: 1 });

// Virtual for trial status
organizationSchema.virtual('isTrialActive').get(function() {
  return this.status === 'trial' && this.trialEndsAt > new Date();
});

// Virtual for trial days remaining
organizationSchema.virtual('trialDaysRemaining').get(function() {
  if (this.status !== 'trial') return 0;
  const now = new Date();
  const trialEnd = new Date(this.trialEndsAt);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Method to check if feature is enabled
organizationSchema.methods.hasFeature = function(feature) {
  return this.settings.enabledFeatures.includes(feature);
};

// Method to check usage limits
organizationSchema.methods.checkUsageLimit = function(type) {
  switch (type) {
    case 'agent_requests':
      return this.usage.agentRequests < this.usage.agentRequestsLimit;
    case 'storage':
      return this.usage.storageUsed < this.usage.storageLimit;
    case 'api_requests':
      return this.usage.apiRequests < this.usage.apiRequestsLimit;
    case 'users':
      return this.usage.userCount < this.usage.userLimit;
    default:
      return true;
  }
};

// Method to increment usage
organizationSchema.methods.incrementUsage = function(type, amount = 1) {
  const updateField = `usage.${type}`;
  return this.updateOne({ $inc: { [updateField]: amount } });
};

// Method to reset monthly usage
organizationSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  return this.updateOne({
    $set: {
      'usage.currentPeriodStart': now,
      'usage.currentPeriodEnd': nextMonth,
      'usage.agentRequests': 0,
      'usage.apiRequests': 0
    }
  });
};

// Pre-save middleware to generate slug
organizationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);