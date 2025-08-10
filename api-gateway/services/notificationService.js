const nodemailer = require('nodemailer');
const axios = require('axios');
const mongoose = require('mongoose');
const logger = require('../../logging/logger-config');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Notification Schema
const notificationSchema = new mongoose.Schema({
  // Recipient Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  
  // Notification Content
  type: {
    type: String,
    required: true,
    enum: [
      'system',
      'security',
      'billing',
      'usage',
      'feature',
      'maintenance',
      'welcome',
      'reminder',
      'alert'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      'user_joined',
      'user_left',
      'subscription_changed',
      'payment_success',
      'payment_failed',
      'usage_limit_reached',
      'usage_warning',
      'security_alert',
      'login_suspicious',
      'password_changed',
      '2fa_enabled',
      '2fa_disabled',
      'system_maintenance',
      'feature_update',
      'trial_ending',
      'trial_expired',
      'subscription_renewal',
      'backup_completed',
      'backup_failed'
    ]
  },
  
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Delivery Channels
  channels: {
    email: {
      enabled: { type: Boolean, default: true },
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    push: {
      enabled: { type: Boolean, default: true },
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    slack: {
      enabled: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    },
    discord: {
      enabled: { type: Boolean, default: false },
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      error: { type: String, default: null }
    }
  },
  
  // Status
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // Metadata
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Scheduling
  scheduledFor: {
    type: Date,
    default: null
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration: 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, category: 1 });
notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  async initializeEmailTransporter() {
    try {
      if (process.env.SMTP_HOST) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        // Verify connection
        await this.emailTransporter.verify();
        logger.info('Email transporter initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {object} notificationData - Notification data
   * @returns {Promise<object>} Created notification
   */
  async sendNotification(userId, notificationData) {
    try {
      const user = await User.findById(userId).populate('organizationId');
      if (!user) {
        throw new Error('User not found');
      }

      // Create notification record
      const notification = new Notification({
        userId,
        organizationId: user.organizationId?._id,
        ...notificationData,
        channels: this.determineChannels(user, notificationData)
      });

      await notification.save();

      // Send through enabled channels
      await this.deliverNotification(notification, user);

      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to organization
   * @param {string} organizationId - Organization ID
   * @param {object} notificationData - Notification data
   * @param {Array} roles - Target roles (optional)
   * @returns {Promise<Array>} Created notifications
   */
  async sendOrganizationNotification(organizationId, notificationData, roles = null) {
    try {
      const query = { organizationId };
      if (roles) {
        query.organizationRole = { $in: roles };
      }

      const users = await User.find(query);
      const notifications = [];

      for (const user of users) {
        const notification = await this.sendNotification(user._id, notificationData);
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      logger.error('Error sending organization notification:', error);
      throw error;
    }
  }

  /**
   * Send system-wide notification
   * @param {object} notificationData - Notification data
   * @param {object} filters - User filters (optional)
   * @returns {Promise<number>} Number of notifications sent
   */
  async sendSystemNotification(notificationData, filters = {}) {
    try {
      const users = await User.find(filters);
      let sentCount = 0;

      for (const user of users) {
        try {
          await this.sendNotification(user._id, notificationData);
          sentCount++;
        } catch (error) {
          logger.error(`Failed to send notification to user ${user._id}:`, error);
        }
      }

      logger.info(`System notification sent to ${sentCount} users`);
      return sentCount;
    } catch (error) {
      logger.error('Error sending system notification:', error);
      throw error;
    }
  }

  /**
   * Deliver notification through enabled channels
   * @param {object} notification - Notification object
   * @param {object} user - User object
   */
  async deliverNotification(notification, user) {
    const deliveryPromises = [];

    // Email delivery
    if (notification.channels.email.enabled) {
      deliveryPromises.push(this.sendEmail(notification, user));
    }

    // Slack delivery
    if (notification.channels.slack.enabled && user.organizationId?.settings?.notifications?.slack?.enabled) {
      deliveryPromises.push(this.sendSlack(notification, user));
    }

    // Discord delivery
    if (notification.channels.discord.enabled && user.organizationId?.settings?.notifications?.discord?.enabled) {
      deliveryPromises.push(this.sendDiscord(notification, user));
    }

    // SMS delivery (if implemented)
    if (notification.channels.sms.enabled) {
      deliveryPromises.push(this.sendSMS(notification, user));
    }

    // Execute all deliveries
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Send email notification
   * @param {object} notification - Notification object
   * @param {object} user - User object
   */
  async sendEmail(notification, user) {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not configured');
      }

      const emailTemplate = this.getEmailTemplate(notification);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@commerceai.pro',
        to: user.email,
        subject: notification.title,
        html: emailTemplate,
        text: notification.message
      };

      await this.emailTransporter.sendMail(mailOptions);
      
      // Update notification status
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.email.sent': true,
        'channels.email.sentAt': new Date()
      });

      logger.info(`Email notification sent to ${user.email}`);
    } catch (error) {
      logger.error('Error sending email notification:', error);
      
      // Update notification with error
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.email.error': error.message
      });
    }
  }

  /**
   * Send Slack notification
   * @param {object} notification - Notification object
   * @param {object} user - User object
   */
  async sendSlack(notification, user) {
    try {
      const webhookUrl = user.organizationId?.settings?.notifications?.slack?.webhookUrl;
      if (!webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const slackMessage = {
        text: notification.title,
        attachments: [{
          color: this.getSlackColor(notification.priority),
          fields: [
            {
              title: 'Message',
              value: notification.message,
              short: false
            },
            {
              title: 'User',
              value: `${user.firstName} ${user.lastName} (${user.email})`,
              short: true
            },
            {
              title: 'Priority',
              value: notification.priority.toUpperCase(),
              short: true
            }
          ],
          timestamp: Math.floor(Date.now() / 1000)
        }]
      };

      await axios.post(webhookUrl, slackMessage);
      
      // Update notification status
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.slack.sent': true,
        'channels.slack.sentAt': new Date()
      });

      logger.info(`Slack notification sent for user ${user.email}`);
    } catch (error) {
      logger.error('Error sending Slack notification:', error);
      
      // Update notification with error
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.slack.error': error.message
      });
    }
  }

  /**
   * Send Discord notification
   * @param {object} notification - Notification object
   * @param {object} user - User object
   */
  async sendDiscord(notification, user) {
    try {
      const webhookUrl = user.organizationId?.settings?.notifications?.discord?.webhookUrl;
      if (!webhookUrl) {
        throw new Error('Discord webhook URL not configured');
      }

      const discordMessage = {
        embeds: [{
          title: notification.title,
          description: notification.message,
          color: this.getDiscordColor(notification.priority),
          fields: [
            {
              name: 'User',
              value: `${user.firstName} ${user.lastName} (${user.email})`,
              inline: true
            },
            {
              name: 'Priority',
              value: notification.priority.toUpperCase(),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await axios.post(webhookUrl, discordMessage);
      
      // Update notification status
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.discord.sent': true,
        'channels.discord.sentAt': new Date()
      });

      logger.info(`Discord notification sent for user ${user.email}`);
    } catch (error) {
      logger.error('Error sending Discord notification:', error);
      
      // Update notification with error
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.discord.error': error.message
      });
    }
  }

  /**
   * Send SMS notification (placeholder)
   * @param {object} notification - Notification object
   * @param {object} user - User object
   */
  async sendSMS(notification, user) {
    try {
      // TODO: Implement SMS service (Twilio, AWS SNS, etc.)
      logger.info(`SMS notification would be sent to ${user.phone}`);
      
      // Update notification status
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.sms.sent': true,
        'channels.sms.sentAt': new Date()
      });
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
      
      // Update notification with error
      await Notification.findByIdAndUpdate(notification._id, {
        'channels.sms.error': error.message
      });
    }
  }

  /**
   * Get user notifications with pagination
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Paginated notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type = null
      } = options;

      const query = { userId };
      if (unreadOnly) {
        query.read = false;
      }
      if (type) {
        query.type = type;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit)
          .lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId, read: false })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() }
      );

      return !!result;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of updated notifications
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      return result.modifiedCount;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        userId
      });

      return !!result;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   * @returns {Promise<number>} Number of deleted notifications
   */
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      logger.info(`Cleaned up ${result.deletedCount} expired notifications`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Determine notification channels based on user preferences
   * @param {object} user - User object
   * @param {object} notificationData - Notification data
   * @returns {object} Channel configuration
   */
  determineChannels(user, notificationData) {
    const userPrefs = user.preferences?.notifications || {};
    const orgSettings = user.organizationId?.settings?.notifications || {};

    return {
      email: {
        enabled: userPrefs.email !== false && notificationData.priority !== 'low'
      },
      push: {
        enabled: userPrefs.push !== false
      },
      sms: {
        enabled: userPrefs.sms === true && ['high', 'urgent'].includes(notificationData.priority)
      },
      slack: {
        enabled: orgSettings.slack?.enabled && ['medium', 'high', 'urgent'].includes(notificationData.priority)
      },
      discord: {
        enabled: orgSettings.discord?.enabled && ['medium', 'high', 'urgent'].includes(notificationData.priority)
      }
    };
  }

  /**
   * Get email template for notification
   * @param {object} notification - Notification object
   * @returns {string} HTML email template
   */
  getEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .priority-${notification.priority} { border-left: 4px solid ${this.getPriorityColor(notification.priority)}; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CommerceAI Pro</h1>
          </div>
          <div class="content priority-${notification.priority}">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.data?.actionUrl ? `<p><a href="${notification.data.actionUrl}" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a></p>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from CommerceAI Pro. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get Slack color for priority
   * @param {string} priority - Priority level
   * @returns {string} Slack color
   */
  getSlackColor(priority) {
    const colors = {
      low: 'good',
      medium: 'warning',
      high: 'danger',
      urgent: '#ff0000'
    };
    return colors[priority] || 'good';
  }

  /**
   * Get Discord color for priority
   * @param {string} priority - Priority level
   * @returns {number} Discord color
   */
  getDiscordColor(priority) {
    const colors = {
      low: 0x00ff00,
      medium: 0xffff00,
      high: 0xff8000,
      urgent: 0xff0000
    };
    return colors[priority] || 0x00ff00;
  }

  /**
   * Get priority color for email
   * @param {string} priority - Priority level
   * @returns {string} Color code
   */
  getPriorityColor(priority) {
    const colors = {
      low: '#00ff00',
      medium: '#ffff00',
      high: '#ff8000',
      urgent: '#ff0000'
    };
    return colors[priority] || '#00ff00';
  }
}

module.exports = new NotificationService();