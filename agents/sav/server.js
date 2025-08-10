const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const amqp = require('amqplib');
const winston = require('winston');
const PlatformIntegration = require('./platform_integration');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'customer-service-agent' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/customer-service.log' })
  ],
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize platform integration
const platformIntegration = new PlatformIntegration(process.env.API_GATEWAY_URL);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Ekko Customer Service AI Agent',
    version: '1.0.0',
    platform_integration: 'enabled'
  });
});

// Customer service response endpoint
app.post('/api/customer-service/respond', async (req, res) => {
  try {
    const { message, platform, context, recipientId } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    logger.info(`Received customer service request via ${platform || 'unknown platform'}`);
    
    // Generate AI response
    const response = await generateAIResponse(message, platform, context);
    
    // Send response via platform if recipientId is provided
    if (platform && recipientId) {
      try {
        await platformIntegration.sendMessage(platform, recipientId, response);
        logger.info(`Response sent to ${recipientId} via ${platform}`);
      } catch (platformError) {
        logger.error(`Error sending response via ${platform}:`, platformError);
        // Continue with the API response even if platform delivery fails
      }
    }
    
    return res.json({
      success: true,
      response,
      platform,
      delivered: Boolean(platform && recipientId)
    });
  } catch (error) {
    logger.error('Error processing customer service request:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Function to generate AI response
async function generateAIResponse(message, platform, context) {
  try {
    // Create a system message based on the platform
    let systemMessage = 'You are a helpful, friendly, and professional customer service representative for an e-commerce store.';
    
    if (platform) {
      systemMessage += ` You are responding to a customer on ${platform}. Keep your tone conversational and helpful.`;
    }
    
    if (context && context.productInfo) {
      systemMessage += ` The customer is inquiring about: ${context.productInfo}.`;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
      max_tokens: 500,
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Platform integration endpoints
app.post('/api/customer-service/platforms/credentials', async (req, res) => {
  try {
    const { platform, credentials } = req.body;
    
    if (!platform || !credentials) {
      return res.status(400).json({ success: false, error: 'Platform and credentials are required' });
    }
    
    logger.info(`Setting credentials for platform: ${platform}`);
    
    const connectorId = await platformIntegration.initializeConnector(platform, credentials);
    
    if (connectorId) {
      return res.json({
        success: true,
        message: `Credentials set for ${platform}`,
        connector_id: connectorId
      });
    } else {
      return res.status(500).json({ success: false, error: `Failed to initialize connector for ${platform}` });
    }
  } catch (error) {
    logger.error('Error setting platform credentials:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Webhook endpoint for platform events
app.post('/api/customer-service/platforms/:platform/webhook', async (req, res) => {
  try {
    const { platform } = req.params;
    const event = req.body;
    
    logger.info(`Received webhook event from ${platform}`);
    
    // Process the webhook event
    const processedEvent = platformIntegration.processWebhookEvent(platform, event);
    
    // If it's a message event, generate a response
    if (processedEvent.message && processedEvent.senderId) {
      // Generate AI response
      const response = await generateAIResponse(
        processedEvent.message,
        platform,
        { originalEvent: processedEvent }
      );
      
      // Send response back via the platform
      await platformIntegration.sendMessage(platform, processedEvent.senderId, response);
      
      logger.info(`Response sent to ${processedEvent.senderId} via ${platform}`);
    }
    
    // Acknowledge receipt of webhook
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error(`Error processing ${req.params.platform} webhook:`, error);
    // Always return 200 for webhooks to prevent retries
    return res.status(200).json({ success: false, error: 'Processed with errors' });
  }
});

// Send message endpoint
app.post('/api/customer-service/platforms/:platform/send', async (req, res) => {
  try {
    const { platform } = req.params;
    const { recipientId, message, options } = req.body;
    
    if (!recipientId || !message) {
      return res.status(400).json({ success: false, error: 'Recipient ID and message are required' });
    }
    
    logger.info(`Sending message to ${recipientId} via ${platform}`);
    
    const result = await platformIntegration.sendMessage(platform, recipientId, message, options);
    
    return res.json({
      success: true,
      message: `Message sent to ${recipientId} via ${platform}`,
      result
    });
  } catch (error) {
    logger.error(`Error sending message via ${req.params.platform}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Setup RabbitMQ connection
async function setupRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await connection.createChannel();
    
    const exchange = 'ekko.customer.service';
    await channel.assertExchange(exchange, 'topic', { durable: true });
    
    const queue = 'customer_service_requests';
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'customer.request.*');
    
    // Add platform integration queue
    const platformQueue = 'platform_integration_requests';
    await channel.assertQueue(platformQueue, { durable: true });
    await channel.bindQueue(platformQueue, exchange, 'platform.request.*');
    
    logger.info('RabbitMQ setup completed');
    
    // Consume messages from customer service queue
    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Processing message from queue: ${content.platform}`);
          
          const response = await generateAIResponse(content.message, content.platform, content.context);
          
          // Publish response back to a response queue
          channel.publish(
            exchange,
            `customer.response.${content.platform}`,
            Buffer.from(JSON.stringify({ response, originalRequest: content }))
          );
          
          // If recipientId is provided, send response via platform
          if (content.platform && content.recipientId) {
            try {
              await platformIntegration.sendMessage(content.platform, content.recipientId, response);
              logger.info(`Response sent to ${content.recipientId} via ${content.platform}`);
            } catch (platformError) {
              logger.error(`Error sending response via ${content.platform}:`, platformError);
            }
          }
          
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message from queue:', error);
          channel.nack(msg);
        }
      }
    });
    
    // Consume messages from platform integration queue
    channel.consume(platformQueue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Processing platform integration request: ${content.action} for ${content.platform}`);
          
          let result;
          switch (content.action) {
            case 'send_message':
              result = await platformIntegration.sendMessage(
                content.platform,
                content.recipientId,
                content.message,
                content.options
              );
              break;
            case 'initialize_connector':
              result = await platformIntegration.initializeConnector(
                content.platform,
                content.credentials
              );
              break;
            default:
              throw new Error(`Unknown action: ${content.action}`);
          }
          
          // Publish result back to response queue
          channel.publish(
            exchange,
            `platform.response.${content.requestId}`,
            Buffer.from(JSON.stringify({ result, originalRequest: content }))
          );
          
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing platform integration request:', error);
          channel.nack(msg);
        }
      }
    });
    
    return channel;
  } catch (error) {
    logger.error('Error setting up RabbitMQ:', error);
  }
}

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(`🔵 Ekko Customer Service AI Agent started on port ${PORT}`);
  setupRabbitMQ().catch(err => logger.error('Failed to setup RabbitMQ:', err));
});