const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  timezone: {
    type: String,
    default: 'Europe/Paris'
  },
  language: {
    type: String,
    default: 'fr',
    enum: ['fr', 'en', 'es', 'de', 'it']
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorBackupCodes: [{
    type: String
  }],
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  permissions: [{
    type: String
  }],
  
  // Organization & Multi-tenant
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  organizationRole: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    default: null
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
  
  // Onboarding
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingStep: {
    type: String,
    enum: ['brand_setup', 'platform_connections', 'goals_setup', 'completed'],
    default: 'brand_setup'
  },
  onboardingData: {
    businessName: String,
    businessType: String,
    businessAge: String,
    targetMarket: String,
    businessDescription: String,
    selectedPlatforms: [String],
    marketingGoals: [String],
    budget: String
  },
  
  // Platform Connections
  platformConnections: [{
    platform: String,
    platformName: String,
    accountName: String,
    accountId: String,
    connectionType: String,
    status: {
      type: String,
      enum: ['connected', 'pending_verification', 'error', 'disconnected'],
      default: 'pending_verification'
    },
    connectedAt: Date,
    lastSyncAt: Date,
    credentials: {
      type: mongoose.Schema.Types.Mixed,
      select: false // Never include credentials in queries by default
    }
  }],
  
  // Usage & Analytics
  lastLoginAt: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  ipAddresses: [{
    ip: String,
    lastUsed: Date,
    userAgent: String
  }],
  
  // Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    dashboard: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      },
      layout: {
        type: String,
        enum: ['compact', 'comfortable', 'spacious'],
        default: 'comfortable'
      }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ stripeCustomerId: 1 });
userSchema.index({ 'platformConnections.platform': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() },
    $inc: { loginCount: 1 }
  });
};

// Method to add platform connection
userSchema.methods.addPlatformConnection = function(connectionData) {
  // Remove existing connection for the same platform
  this.platformConnections = this.platformConnections.filter(
    conn => conn.platform !== connectionData.platform
  );
  
  // Add new connection
  this.platformConnections.push({
    ...connectionData,
    connectedAt: new Date()
  });
  
  return this.save();
};

// Method to update platform connection status
userSchema.methods.updatePlatformConnection = function(platform, updates) {
  const connection = this.platformConnections.find(conn => conn.platform === platform);
  if (connection) {
    Object.assign(connection, updates);
    if (updates.status === 'connected') {
      connection.lastSyncAt = new Date();
    }
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema);