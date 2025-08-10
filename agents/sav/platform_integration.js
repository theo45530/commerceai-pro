const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'customer-service-platform-integration' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/platform-integration.log' })
  ],
});

class PlatformIntegration {
  constructor(apiGatewayUrl) {
    this.apiGatewayUrl = apiGatewayUrl || process.env.API_GATEWAY_URL || 'http://api-gateway:5000';
    this.connectors = {};
  }

  /**
   * Initialize a platform connector with credentials
   * @param {string} platform - The platform name (e.g., 'whatsapp', 'shopify')
   * @param {Object} credentials - The credentials for the platform
   * @returns {string} connector_id - A unique identifier for the initialized connector
   */
  async initializeConnector(platform, credentials) {
    try {
      logger.info(`Initializing connector for platform: ${platform}`);
      
      // Request connector initialization from API Gateway
      const response = await axios.post(`${this.apiGatewayUrl}/api/integrations/${platform}/initialize`, {
        credentials
      });
      
      if (response.data && response.data.connector_id) {
        this.connectors[platform] = {
          id: response.data.connector_id,
          initialized: true,
          credentials
        };
        
        logger.info(`Successfully initialized ${platform} connector with ID: ${response.data.connector_id}`);
        return response.data.connector_id;
      } else {
        logger.error(`Failed to initialize ${platform} connector: No connector ID returned`);
        return null;
      }
    } catch (error) {
      logger.error(`Error initializing ${platform} connector:`, error.message);
      return null;
    }
  }

  /**
   * Send a message to a customer via a specific platform
   * @param {string} platform - The platform to send the message on
   * @param {string} recipientId - The recipient's ID on the platform
   * @param {string} message - The message content
   * @param {Object} options - Additional options for the message (e.g., template, media)
   * @returns {Object} The response from the platform
   */
  async sendMessage(platform, recipientId, message, options = {}) {
    try {
      logger.info(`Sending message to ${recipientId} via ${platform}`);
      
      if (!this.connectors[platform] || !this.connectors[platform].initialized) {
        logger.error(`Connector for ${platform} not initialized`);
        throw new Error(`Connector for ${platform} not initialized`);
      }
      
      const payload = {
        recipient_id: recipientId,
        message,
        connector_id: this.connectors[platform].id,
        ...options
      };
      
      const response = await axios.post(
        `${this.apiGatewayUrl}/api/integrations/${platform}/send-message`,
        payload
      );
      
      logger.info(`Message sent successfully to ${recipientId} via ${platform}`);
      return response.data;
    } catch (error) {
      logger.error(`Error sending message via ${platform}:`, error.message);
      throw error;
    }
  }

  /**
   * Send a WhatsApp message
   * @param {string} recipientId - The recipient's phone number
   * @param {string} message - The message content
   * @param {Object} options - Additional options for the message
   * @returns {Object} The response from WhatsApp
   */
  async sendWhatsAppMessage(recipientId, message, options = {}) {
    return this.sendMessage('whatsapp', recipientId, message, options);
  }

  /**
   * Send a WhatsApp template message
   * @param {string} recipientId - The recipient's phone number
   * @param {string} templateName - The name of the template
   * @param {Array} templateParams - Parameters for the template
   * @returns {Object} The response from WhatsApp
   */
  async sendWhatsAppTemplate(recipientId, templateName, templateParams = []) {
    return this.sendMessage('whatsapp', recipientId, null, {
      message_type: 'template',
      template_name: templateName,
      template_params: templateParams
    });
  }

  /**
   * Send a WhatsApp interactive message with buttons
   * @param {string} recipientId - The recipient's phone number
   * @param {string} headerText - The header text
   * @param {string} bodyText - The body text
   * @param {Array} buttons - Array of button objects with id and title
   * @returns {Object} The response from WhatsApp
   */
  async sendWhatsAppButtons(recipientId, headerText, bodyText, buttons) {
    return this.sendMessage('whatsapp', recipientId, bodyText, {
      message_type: 'interactive',
      interactive_type: 'button',
      header: headerText,
      buttons: buttons
    });
  }

  /**
   * Process a webhook event from a platform
   * @param {string} platform - The platform that sent the webhook
   * @param {Object} event - The webhook event data
   * @returns {Object} Processed event data
   */
  processWebhookEvent(platform, event) {
    try {
      logger.info(`Processing webhook event from ${platform}`);
      
      let processedEvent = {
        platform,
        originalEvent: event,
        timestamp: new Date().toISOString(),
      };
      
      // Platform-specific processing
      switch (platform) {
        case 'whatsapp':
          processedEvent = this.processWhatsAppEvent(event, processedEvent);
          break;
        case 'shopify':
          processedEvent = this.processShopifyEvent(event, processedEvent);
          break;
        default:
          logger.warn(`No specific processing for ${platform} events`);
      }
      
      return processedEvent;
    } catch (error) {
      logger.error(`Error processing webhook event from ${platform}:`, error.message);
      throw error;
    }
  }

  /**
   * Process a WhatsApp webhook event
   * @param {Object} event - The WhatsApp webhook event
   * @param {Object} processedEvent - The base processed event object
   * @returns {Object} Enhanced processed event
   */
  processWhatsAppEvent(event, processedEvent) {
    try {
      // Extract relevant information from WhatsApp event
      if (event.entry && event.entry.length > 0) {
        const entry = event.entry[0];
        if (entry.changes && entry.changes.length > 0) {
          const change = entry.changes[0];
          if (change.value && change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            
            processedEvent.senderId = message.from;
            processedEvent.timestamp = message.timestamp;
            
            // Extract message content based on type
            switch (message.type) {
              case 'text':
                processedEvent.messageType = 'text';
                processedEvent.message = message.text.body;
                break;
              case 'interactive':
                processedEvent.messageType = 'interactive';
                if (message.interactive.type === 'button_reply') {
                  processedEvent.message = message.interactive.button_reply.title;
                  processedEvent.buttonId = message.interactive.button_reply.id;
                } else if (message.interactive.type === 'list_reply') {
                  processedEvent.message = message.interactive.list_reply.title;
                  processedEvent.listItemId = message.interactive.list_reply.id;
                }
                break;
              case 'image':
              case 'video':
              case 'document':
              case 'audio':
                processedEvent.messageType = message.type;
                processedEvent.mediaId = message[message.type].id;
                if (message[message.type].caption) {
                  processedEvent.caption = message[message.type].caption;
                }
                break;
              default:
                processedEvent.messageType = message.type;
                processedEvent.message = 'Unsupported message type';
            }
          }
        }
      }
      
      return processedEvent;
    } catch (error) {
      logger.error('Error processing WhatsApp event:', error.message);
      return processedEvent;
    }
  }

  /**
   * Process a Shopify webhook event
   * @param {Object} event - The Shopify webhook event
   * @param {Object} processedEvent - The base processed event object
   * @returns {Object} Enhanced processed event
   */
  processShopifyEvent(event, processedEvent) {
    try {
      // Extract relevant information from Shopify event
      processedEvent.eventType = event.topic || 'unknown';
      
      switch (processedEvent.eventType) {
        case 'orders/create':
          processedEvent.orderId = event.order_id;
          processedEvent.customerEmail = event.email;
          processedEvent.customerName = `${event.customer.first_name} ${event.customer.last_name}`;
          processedEvent.totalPrice = event.total_price;
          processedEvent.message = `New order #${event.name} created`;
          break;
        case 'customers/create':
          processedEvent.customerId = event.id;
          processedEvent.customerEmail = event.email;
          processedEvent.customerName = `${event.first_name} ${event.last_name}`;
          processedEvent.message = `New customer ${processedEvent.customerName} registered`;
          break;
        default:
          processedEvent.message = `Received ${processedEvent.eventType} event`;
      }
      
      return processedEvent;
    } catch (error) {
      logger.error('Error processing Shopify event:', error.message);
      return processedEvent;
    }
  }
}

module.exports = PlatformIntegration;