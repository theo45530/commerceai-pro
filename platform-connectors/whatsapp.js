/**
 * WhatsApp Connector
 * Handles integration with WhatsApp Business API
 */

const BaseConnector = require('./base');
const axios = require('axios');

class WhatsAppConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.businessAccountId = config.businessAccountId;
    this.apiVersion = config.apiVersion || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.id = null; // Connector ID for validation
    this.scheduledMessages = new Map(); // Store scheduled messages
  }
  
  /**
   * Initialize the connector with credentials
   * @param {object} credentials - The credentials for WhatsApp Business API
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      this.accessToken = credentials.accessToken;
      this.phoneNumberId = credentials.phoneNumberId;
      this.businessAccountId = credentials.businessAccountId;
      this.apiVersion = credentials.apiVersion || 'v18.0';
      this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
      
      // Generate a unique ID for this connector instance
      this.id = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Authenticate to verify credentials
      const authResult = await this.authenticate();
      
      return {
        id: this.id,
        name: authResult.name || 'WhatsApp Business Account',
        platform: 'whatsapp',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize WhatsApp connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with WhatsApp Business API
   * @returns {Promise<object>} Business account info if authentication successful
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      this.logApiActivity('authenticate', `${this.businessAccountId}`, {});
      
      const response = await axios.get(
        `${this.baseUrl}/${this.businessAccountId}`,
        {
          params: { access_token: this.accessToken }
        }
      );
      
      this.isAuthenticated = true;
      return response.data;
    } catch (error) {
      this.isAuthenticated = false;
      this.handleApiError(error);
    }
  }

  /**
   * Send a text message via WhatsApp
   * @param {string} to - Recipient's phone number with country code
   * @param {string} text - Message text
   * @param {boolean} previewUrl - Whether to show URL previews
   * @returns {Promise<object>} Message sending result
   */
  async sendTextMessage(to, text, previewUrl = false) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('sendTextMessage');
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: previewUrl,
          body: text
        }
      };
      
      this.logApiActivity('sendTextMessage', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Send a template message via WhatsApp
   * @param {string} to - Recipient's phone number with country code
   * @param {string} templateName - Name of the template
   * @param {string} language - Language code (e.g., 'en_US')
   * @param {Array} components - Template components (header, body, buttons)
   * @returns {Promise<object>} Message sending result
   */
  async sendTemplateMessage(to, templateName, language, components = []) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('sendTemplateMessage');
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components
        }
      };
      
      this.logApiActivity('sendTemplateMessage', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Send an image message via WhatsApp
   * @param {string} to - Recipient's phone number with country code
   * @param {string} imageUrl - URL of the image
   * @param {string} caption - Optional caption for the image
   * @returns {Promise<object>} Message sending result
   */
  async sendImageMessage(to, imageUrl, caption = '') {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('sendImageMessage');
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          caption
        }
      };
      
      this.logApiActivity('sendImageMessage', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Send a document message via WhatsApp
   * @param {string} to - Recipient's phone number with country code
   * @param {string} documentUrl - URL of the document
   * @param {string} filename - Name of the file
   * @param {string} caption - Optional caption for the document
   * @returns {Promise<object>} Message sending result
   */
  async sendDocumentMessage(to, documentUrl, filename, caption = '') {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('sendDocumentMessage');
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: {
          link: documentUrl,
          filename,
          caption
        }
      };
      
      this.logApiActivity('sendDocumentMessage', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Send an interactive message with buttons via WhatsApp
   * @param {string} to - Recipient's phone number with country code
   * @param {string} headerText - Header text
   * @param {string} bodyText - Body text
   * @param {string} footerText - Footer text
   * @param {Array} buttons - Array of button objects
   * @returns {Promise<object>} Message sending result
   */
  async sendInteractiveButtonsMessage(to, headerText, bodyText, footerText, buttons) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('sendInteractiveButtonsMessage');
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: footerText
          },
          action: {
            buttons
          }
        }
      };
      
      this.logApiActivity('sendInteractiveButtonsMessage', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Send an interactive list message via WhatsApp
   * @param {string} to - Recipient's phone number with country code
   * @param {string} headerText - Header text
   * @param {string} bodyText - Body text
   * @param {string} footerText - Footer text
   * @param {string} buttonText - Text for the list button
   * @param {Array} sections - Array of section objects
   * @returns {Promise<object>} Message sending result
   */
  async sendInteractiveListMessage(to, headerText, bodyText, footerText, buttonText, sections) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('sendInteractiveListMessage');
      
      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: {
            type: 'text',
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: footerText
          },
          action: {
            button: buttonText,
            sections
          }
        }
      };
      
      this.logApiActivity('sendInteractiveListMessage', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Mark a message as read
   * @param {string} messageId - ID of the message to mark as read
   * @returns {Promise<object>} Result of the operation
   */
  async markMessageAsRead(messageId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('markMessageAsRead');
      
      const data = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };
      
      this.logApiActivity('markMessageAsRead', `${this.phoneNumberId}/messages`, data);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get media URL for a media message
   * @param {string} mediaId - ID of the media
   * @returns {Promise<object>} Media URL information
   */
  async getMediaUrl(mediaId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getMediaUrl');
      
      this.logApiActivity('getMediaUrl', `${mediaId}`, {});
      
      const response = await axios.get(
        `${this.baseUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Download media from a media URL
   * @param {string} mediaUrl - URL of the media
   * @returns {Promise<Buffer>} Media content as buffer
   */
  async downloadMedia(mediaUrl) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('downloadMedia');
      
      this.logApiActivity('downloadMedia', mediaUrl, {});
      
      const response = await axios.get(
        mediaUrl,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          responseType: 'arraybuffer'
        }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Process an incoming webhook event
   * @param {object} webhookEvent - The webhook event object
   * @returns {object} Processed webhook data
   */
  processWebhookEvent(webhookEvent) {
    try {
      if (!webhookEvent || !webhookEvent.entry || webhookEvent.entry.length === 0) {
        throw new Error('Invalid webhook event format');
      }
      
      const entry = webhookEvent.entry[0];
      if (!entry.changes || entry.changes.length === 0) {
        throw new Error('No changes in webhook event');
      }
      
      const change = entry.changes[0];
      if (change.field !== 'messages') {
        return { type: 'non-message', data: change };
      }
      
      const value = change.value;
      if (!value.messages || value.messages.length === 0) {
        return { type: 'status-update', data: value };
      }
      
      const message = value.messages[0];
      const sender = value.contacts[0];
      
      return {
        type: 'message',
        data: {
          id: message.id,
          timestamp: message.timestamp,
          from: message.from,
          type: message.type,
          content: this.extractMessageContent(message),
          sender: {
            name: sender.profile.name,
            phone: sender.wa_id
          }
        }
      };
    } catch (error) {
      this.logger.error('Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Extract content from a message based on its type
   * @param {object} message - The message object
   * @returns {object} Extracted content
   */
  extractMessageContent(message) {
    switch (message.type) {
      case 'text':
        return { text: message.text.body };
      
      case 'image':
        return { 
          image: {
            id: message.image.id,
            caption: message.image.caption || ''
          }
        };
      
      case 'document':
        return { 
          document: {
            id: message.document.id,
            filename: message.document.filename,
            caption: message.document.caption || ''
          }
        };
      
      case 'audio':
        return { 
          audio: {
            id: message.audio.id
          }
        };
      
      case 'video':
        return { 
          video: {
            id: message.video.id,
            caption: message.video.caption || ''
          }
        };
      
      case 'location':
        return { 
          location: {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            name: message.location.name || '',
            address: message.location.address || ''
          }
        };
      
      case 'interactive':
        if (message.interactive.type === 'button_reply') {
          return { 
            button_reply: {
              id: message.interactive.button_reply.id,
              title: message.interactive.button_reply.title
            }
          };
        } else if (message.interactive.type === 'list_reply') {
          return { 
            list_reply: {
              id: message.interactive.list_reply.id,
              title: message.interactive.list_reply.title,
              description: message.interactive.list_reply.description || ''
            }
          };
        }
        return { interactive: message.interactive };
      
      default:
        return { raw: message };
    }
  }

  /**
   * Publish content to WhatsApp platform
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      // For WhatsApp, publishing content means sending a message
      // We'll need a recipient number - this should be provided in content
      if (!content.recipient) {
        throw new Error('Recipient phone number is required for WhatsApp messages');
      }
      
      let messageData;
      
      if (content.media && content.media.length > 0) {
        // Send media message
        const media = content.media[0];
        messageData = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: content.recipient,
          type: media.type === 'image' ? 'image' : 'document',
          [media.type === 'image' ? 'image' : 'document']: {
            link: media.url,
            caption: content.text
          }
        };
      } else {
        // Send text message
        messageData = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: content.recipient,
          type: 'text',
          text: {
            preview_url: true,
            body: content.text
          }
        };
      }
      
      this.logApiActivity('publishContent', `${this.phoneNumberId}/messages`, messageData);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        messageData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      return {
        id: response.data.messages[0].id,
        url: `https://wa.me/${content.recipient}`,
        platform: 'whatsapp',
        published_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Schedule content for future publication
   * @param {object} content - The content to schedule
   * @param {Date} scheduleTime - When to publish the content
   * @returns {Promise<object>} Scheduled content result
   */
  async scheduleContent(content, scheduleTime) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('scheduleContent');
      
      // WhatsApp Business API doesn't support native scheduling
      // We'll store the message and use a timeout to send it later
      
      if (!content.recipient) {
        throw new Error('Recipient phone number is required for WhatsApp messages');
      }
      
      const messageId = `scheduled_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const delay = scheduleTime.getTime() - Date.now();
      
      if (delay <= 0) {
        throw new Error('Schedule time must be in the future');
      }
      
      // Store the scheduled message
      this.scheduledMessages.set(messageId, {
        content,
        scheduleTime,
        timeout: setTimeout(async () => {
          try {
            await this.publishContent(content);
            this.scheduledMessages.delete(messageId);
          } catch (error) {
            console.error(`Failed to send scheduled WhatsApp message ${messageId}:`, error);
          }
        }, delay)
      });
      
      this.logApiActivity('scheduleContent', 'scheduled_messages', { messageId, content, scheduleTime });
      
      return {
        id: messageId,
        url: `https://wa.me/${content.recipient}`,
        platform: 'whatsapp',
        scheduled_time: scheduleTime.toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update existing content
   * @param {string} messageId - The ID of the message to update
   * @param {object} content - The updated content
   * @returns {Promise<object>} Updated content result
   */
  async updateContent(messageId, content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateContent');
      
      // WhatsApp doesn't support editing sent messages
      // We can only update scheduled messages that haven't been sent yet
      
      if (this.scheduledMessages.has(messageId)) {
        const scheduledMessage = this.scheduledMessages.get(messageId);
        
        // Clear the existing timeout
        clearTimeout(scheduledMessage.timeout);
        
        // Update the content
        const updatedContent = { ...scheduledMessage.content, ...content };
        const delay = scheduledMessage.scheduleTime.getTime() - Date.now();
        
        if (delay > 0) {
          // Reschedule with updated content
          scheduledMessage.content = updatedContent;
          scheduledMessage.timeout = setTimeout(async () => {
            try {
              await this.publishContent(updatedContent);
              this.scheduledMessages.delete(messageId);
            } catch (error) {
              console.error(`Failed to send updated scheduled WhatsApp message ${messageId}:`, error);
            }
          }, delay);
          
          this.scheduledMessages.set(messageId, scheduledMessage);
          
          this.logApiActivity('updateContent', 'scheduled_messages', { messageId, updatedContent });
          
          return {
            id: messageId,
            url: `https://wa.me/${updatedContent.recipient}`,
            platform: 'whatsapp',
            updated_at: new Date().toISOString()
          };
        } else {
          throw new Error('Cannot update message that has already been sent');
        }
      } else {
        throw new Error(`Scheduled message with ID ${messageId} not found or already sent`);
      }
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from the platform
   * @param {string} messageId - The ID of the message to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(messageId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      // WhatsApp doesn't support deleting sent messages via API
      // We can only cancel scheduled messages that haven't been sent yet
      
      if (this.scheduledMessages.has(messageId)) {
        const scheduledMessage = this.scheduledMessages.get(messageId);
        
        // Clear the timeout to prevent the message from being sent
        clearTimeout(scheduledMessage.timeout);
        
        // Remove from scheduled messages
        this.scheduledMessages.delete(messageId);
        
        this.logApiActivity('deleteContent', 'scheduled_messages', { messageId, action: 'cancelled' });
        
        return {
          id: messageId,
          platform: 'whatsapp',
          deleted: true,
          deleted_at: new Date().toISOString()
        };
      } else {
        throw new Error(`Cannot delete message with ID ${messageId}. WhatsApp doesn't support deleting sent messages via API.`);
      }
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = WhatsAppConnector;