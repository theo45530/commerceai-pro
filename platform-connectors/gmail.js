/**
 * Gmail Connector
 * Handles integration with Gmail API for email automation
 */

const BaseConnector = require('./base');
const { google } = require('googleapis');
const axios = require('axios');

class GmailConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    this.accessToken = config.accessToken;
    this.gmail = null;
    this.oauth2Client = null;
    this.id = null; // Connector ID for validation
  }

  /**
   * Initialize the connector with credentials
   * @param {object} credentials - The credentials for Gmail API
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      this.clientId = credentials.clientId;
      this.clientSecret = credentials.clientSecret;
      this.refreshToken = credentials.refreshToken;
      this.accessToken = credentials.accessToken;
      
      // Generate a unique ID for this connector instance
      this.id = `gmail_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Setup OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        'http://localhost:4000/api/auth/gmail/callback'
      );
      
      this.oauth2Client.setCredentials({
        access_token: this.accessToken,
        refresh_token: this.refreshToken
      });
      
      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Authenticate to verify credentials
      const authResult = await this.authenticate();
      
      return {
        id: this.id,
        name: authResult.emailAddress || 'Gmail Account',
        platform: 'gmail',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize Gmail connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with Gmail API
   * @returns {Promise<object>} User profile if authentication successful
   */
  async authenticate() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      return {
        emailAddress: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal
      };
    } catch (error) {
      if (error.code === 401) {
        throw new Error('Invalid Gmail credentials or expired token');
      }
      throw new Error(`Gmail authentication failed: ${error.message}`);
    }
  }

  /**
   * Send an email
   * @param {object} emailData - Email data
   * @returns {Promise<object>} Send result
   */
  async sendEmail(emailData) {
    try {
      const { to, subject, body, isHtml = false, attachments = [] } = emailData;
      
      let message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        isHtml ? body : body
      ].join('\n');
      
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
      
      return {
        id: response.data.id,
        threadId: response.data.threadId,
        status: 'sent',
        platform: 'gmail'
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email template
   * @param {object} templateData - Template data
   * @returns {Promise<object>} Send result
   */
  async sendTemplate(templateData) {
    try {
      const { to, templateId, variables = {} } = templateData;
      
      // For now, we'll use a simple template system
      // In production, you might want to integrate with a template service
      const templates = {
        'welcome': {
          subject: 'Bienvenue chez {{company}}',
          body: `
            <h1>Bienvenue {{name}} !</h1>
            <p>Nous sommes ravis de vous accueillir chez {{company}}.</p>
            <p>Votre compte a été créé avec succès.</p>
          `
        },
        'newsletter': {
          subject: 'Newsletter {{company}} - {{date}}',
          body: `
            <h1>Newsletter {{company}}</h1>
            <p>{{content}}</p>
            <p>Merci de votre fidélité !</p>
          `
        }
      };
      
      const template = templates[templateId];
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      // Replace variables in template
      let subject = template.subject;
      let body = template.body;
      
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, variables[key]);
        body = body.replace(regex, variables[key]);
      });
      
      return await this.sendEmail({
        to,
        subject,
        body,
        isHtml: true
      });
    } catch (error) {
      throw new Error(`Failed to send template: ${error.message}`);
    }
  }

  /**
   * Get inbox messages
   * @param {object} options - Query options
   * @returns {Promise<Array>} Messages
   */
  async getMessages(options = {}) {
    try {
      const { maxResults = 10, query = '' } = options;
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query
      });
      
      const messages = [];
      
      if (response.data.messages) {
        for (const message of response.data.messages) {
          const messageDetail = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          });
          
          messages.push({
            id: messageDetail.data.id,
            threadId: messageDetail.data.threadId,
            snippet: messageDetail.data.snippet,
            payload: messageDetail.data.payload
          });
        }
      }
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  /**
   * Publish content (send email)
   * @param {object} content - Content to publish
   * @returns {Promise<object>} Publish result
   */
  async publishContent(content) {
    try {
      const { type, data } = content;
      
      switch (type) {
        case 'email':
          return await this.sendEmail(data);
        case 'template':
          return await this.sendTemplate(data);
        default:
          throw new Error(`Unsupported content type: ${type}`);
      }
    } catch (error) {
      throw new Error(`Failed to publish content: ${error.message}`);
    }
  }

  /**
   * Schedule content (email)
   * @param {object} content - Content to schedule
   * @param {string} scheduleTime - ISO string of when to send
   * @returns {Promise<object>} Schedule result
   */
  async scheduleContent(content, scheduleTime) {
    try {
      // Gmail API doesn't support native scheduling
      // This would typically be handled by a job queue system
      const scheduleId = `gmail_schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Store scheduled email for later processing
      // In production, you'd use a proper job queue like Bull or Agenda
      console.log(`Email scheduled for ${scheduleTime} with ID: ${scheduleId}`);
      
      return {
        id: scheduleId,
        platform: 'gmail',
        scheduledFor: scheduleTime,
        status: 'scheduled',
        content
      };
    } catch (error) {
      throw new Error(`Failed to schedule content: ${error.message}`);
    }
  }

  /**
   * Update content (not applicable for sent emails)
   * @param {string} messageId - Message ID
   * @param {object} content - Updated content
   * @returns {Promise<object>} Update result
   */
  async updateContent(messageId, content) {
    // Gmail doesn't support editing sent emails
    throw new Error('Gmail does not support updating sent emails');
  }

  /**
   * Delete content (move to trash)
   * @param {string} messageId - Message ID
   * @returns {Promise<object>} Delete result
   */
  async deleteContent(messageId) {
    try {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId
      });
      
      return {
        id: messageId,
        platform: 'gmail',
        status: 'deleted'
      };
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}

module.exports = GmailConnector;