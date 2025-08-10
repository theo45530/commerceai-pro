const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const amqp = require('amqplib');
const winston = require('winston');
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const mjml2html = require('mjml');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

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
  defaultMeta: { service: 'email-marketing-agent' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/email-marketing.log' })
  ],
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ekko')
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Define email template schema
const emailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // welcome, abandoned_cart, promo, newsletter
  subject: { type: String, required: true },
  mjmlTemplate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

// Define email campaign schema
const emailCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
  status: { type: String, default: 'draft' }, // draft, scheduled, sent
  scheduledDate: { type: Date },
  recipients: { type: Array, default: [] },
  openRate: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const EmailCampaign = mongoose.model('EmailCampaign', emailCampaignSchema);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Ekko Email Marketing AI Agent',
    version: '1.0.0'
  });
});

// Create email template endpoint
app.post('/api/email/templates', async (req, res) => {
  try {
    const { name, type, brandInfo } = req.body;
    
    if (!name || !type || !brandInfo) {
      return res.status(400).json({ success: false, error: 'Name, type, and brand info are required' });
    }
    
    logger.info(`Generating email template: ${name} of type: ${type}`);
    
    // Generate email template using AI
    const { subject, mjmlTemplate } = await generateEmailTemplate(type, brandInfo);
    
    // Save template to database
    const template = new EmailTemplate({
      name,
      type,
      subject,
      mjmlTemplate
    });
    
    await template.save();
    
    return res.json({
      success: true,
      template: {
        id: template._id,
        name: template.name,
        type: template.type,
        subject: template.subject,
        preview: mjml2html(template.mjmlTemplate).html
      }
    });
  } catch (error) {
    logger.error('Error creating email template:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get email templates endpoint
app.get('/api/email/templates', async (req, res) => {
  try {
    const templates = await EmailTemplate.find().sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      templates: templates.map(template => ({
        id: template._id,
        name: template.name,
        type: template.type,
        subject: template.subject,
        createdAt: template.createdAt
      }))
    });
  } catch (error) {
    logger.error('Error fetching email templates:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create email campaign endpoint
app.post('/api/email/campaigns', async (req, res) => {
  try {
    const { name, templateId, recipients, scheduledDate } = req.body;
    
    if (!name || !templateId || !recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Name, template ID, and recipients are required' });
    }
    
    // Get template
    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    // Create campaign
    const campaign = new EmailCampaign({
      name,
      subject: template.subject,
      templateId,
      recipients,
      status: scheduledDate ? 'scheduled' : 'draft',
      scheduledDate: scheduledDate || null
    });
    
    await campaign.save();
    
    return res.json({
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        scheduledDate: campaign.scheduledDate,
        recipientCount: campaign.recipients.length
      }
    });
  } catch (error) {
    logger.error('Error creating email campaign:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Send test email endpoint
app.post('/api/email/send-test', async (req, res) => {
  try {
    const { templateId, testEmail, testData } = req.body;
    
    if (!templateId || !testEmail) {
      return res.status(400).json({ success: false, error: 'Template ID and test email are required' });
    }
    
    // Get template
    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    // Compile template
    const compiledTemplate = Handlebars.compile(template.mjmlTemplate);
    const mjmlContent = compiledTemplate(testData || {});
    const { html } = mjml2html(mjmlContent);
    
    // Send test email
    // Note: In a real implementation, you would configure a proper email service
    const testResult = await sendEmail(testEmail, template.subject, html);
    
    return res.json({
      success: true,
      message: 'Test email sent successfully',
      testResult
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Generate abandoned cart email endpoint
app.post('/api/email/abandoned-cart', async (req, res) => {
  try {
    const { customerEmail, cartItems, customerName, storeInfo } = req.body;
    
    if (!customerEmail || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Customer email and cart items are required' });
    }
    
    // Find abandoned cart template
    const template = await EmailTemplate.findOne({ type: 'abandoned_cart' });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Abandoned cart template not found' });
    }
    
    // Compile template with cart data
    const templateData = {
      customerName: customerName || 'Valued Customer',
      cartItems,
      storeInfo,
      currentYear: new Date().getFullYear(),
      unsubscribeUrl: `https://example.com/unsubscribe?email=${encodeURIComponent(customerEmail)}`
    };
    
    const compiledTemplate = Handlebars.compile(template.mjmlTemplate);
    const mjmlContent = compiledTemplate(templateData);
    const { html } = mjml2html(mjmlContent);
    
    // Send email
    const emailResult = await sendEmail(customerEmail, template.subject, html);
    
    return res.json({
      success: true,
      message: 'Abandoned cart email sent successfully',
      emailResult
    });
  } catch (error) {
    logger.error('Error sending abandoned cart email:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Function to generate email template using AI
async function generateEmailTemplate(type, brandInfo) {
  try {
    // Create a system message based on the email type
    let systemMessage = 'You are an expert email marketing AI that creates beautiful, branded email templates.';
    
    // Prepare the prompt based on email type
    let prompt;
    switch (type) {
      case 'welcome':
        prompt = `Create a welcome email template for new customers of ${brandInfo.name}. The email should have a warm, friendly tone and include:
1. A personalized welcome message
2. Brief introduction to the brand
3. Key benefits of shopping with them
4. A special welcome discount code
5. Call-to-action to start shopping

Brand information:
- Name: ${brandInfo.name}
- Colors: ${brandInfo.colors.join(', ')}
- Logo URL: ${brandInfo.logoUrl}
- Industry: ${brandInfo.industry}
- Tagline: ${brandInfo.tagline}

Provide the email subject line and the complete MJML template code.`;
        break;
      
      case 'abandoned_cart':
        prompt = `Create an abandoned cart reminder email template for ${brandInfo.name}. The email should:
1. Remind customers about items left in their cart
2. Create urgency but not be pushy
3. Show product images and details
4. Include a prominent "Return to Cart" button
5. Possibly offer a small discount to incentivize completion

Brand information:
- Name: ${brandInfo.name}
- Colors: ${brandInfo.colors.join(', ')}
- Logo URL: ${brandInfo.logoUrl}
- Industry: ${brandInfo.industry}
- Tagline: ${brandInfo.tagline}

Provide the email subject line and the complete MJML template code.`;
        break;
      
      case 'promo':
        prompt = `Create a promotional email template for ${brandInfo.name} to announce sales or special offers. The email should:
1. Have an eye-catching header with the promotion details
2. Showcase featured products with images
3. Clearly state the discount amount and duration
4. Include a countdown timer if applicable
5. Have multiple call-to-action buttons

Brand information:
- Name: ${brandInfo.name}
- Colors: ${brandInfo.colors.join(', ')}
- Logo URL: ${brandInfo.logoUrl}
- Industry: ${brandInfo.industry}
- Tagline: ${brandInfo.tagline}

Provide the email subject line and the complete MJML template code.`;
        break;
      
      case 'newsletter':
        prompt = `Create a monthly newsletter email template for ${brandInfo.name}. The email should:
1. Have sections for company news, product updates, and industry insights
2. Include space for featured blog posts or articles
3. Have a clean, scannable layout
4. Include social media links
5. Maintain the brand's visual identity

Brand information:
- Name: ${brandInfo.name}
- Colors: ${brandInfo.colors.join(', ')}
- Logo URL: ${brandInfo.logoUrl}
- Industry: ${brandInfo.industry}
- Tagline: ${brandInfo.tagline}

Provide the email subject line and the complete MJML template code.`;
        break;
      
      default:
        prompt = `Create a general email template for ${brandInfo.name} that can be adapted for various purposes. The email should:
1. Have a clean, professional design
2. Include the brand's logo and colors
3. Have a modular structure that can be customized
4. Include footer with contact information and unsubscribe link

Brand information:
- Name: ${brandInfo.name}
- Colors: ${brandInfo.colors.join(', ')}
- Logo URL: ${brandInfo.logoUrl}
- Industry: ${brandInfo.industry}
- Tagline: ${brandInfo.tagline}

Provide the email subject line and the complete MJML template code.`;
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      max_tokens: 2500,
    });
    
    const response = completion.choices[0].message.content;
    
    // Parse the response to extract subject and MJML template
    // This is a simplified parsing logic - in a real implementation, you would use more robust parsing
    const subjectMatch = response.match(/Subject:?\s*(.+?)\n/i);
    const mjmlMatch = response.match(/```mjml([\s\S]+?)```/);
    
    if (!subjectMatch || !mjmlMatch) {
      throw new Error('Failed to parse AI response for email template');
    }
    
    const subject = subjectMatch[1].trim();
    let mjmlTemplate = mjmlMatch[1].trim();
    
    // Ensure the MJML template has the required structure
    if (!mjmlTemplate.includes('<mjml>')) {
      mjmlTemplate = `<mjml>
${mjmlTemplate}
</mjml>`;
    }
    
    return { subject, mjmlTemplate };
  } catch (error) {
    logger.error('Error generating email template:', error);
    throw new Error('Failed to generate email template');
  }
}

// Function to send email
async function sendEmail(to, subject, html) {
  // Note: In a real implementation, you would configure a proper email service
  // This is a placeholder implementation
  logger.info(`Sending email to ${to} with subject: ${subject}`);
  
  // For demonstration purposes, we'll just log the email details
  return {
    success: true,
    to,
    subject,
    timestamp: new Date().toISOString()
  };
}

// Setup RabbitMQ connection
async function setupRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await connection.createChannel();
    
    const exchange = 'ekko.email.marketing';
    await channel.assertExchange(exchange, 'topic', { durable: true });
    
    const queue = 'email_marketing_requests';
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'email.request.*');
    
    logger.info('RabbitMQ setup completed');
    
    // Consume messages
    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info(`Processing message from queue: ${content.type}`);
          
          // Handle different types of email requests
          switch (content.type) {
            case 'abandoned_cart':
              // Process abandoned cart email
              break;
            case 'welcome':
              // Process welcome email
              break;
            case 'campaign':
              // Process campaign email
              break;
            default:
              logger.warn(`Unknown email request type: ${content.type}`);
          }
          
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message from queue:', error);
          channel.nack(msg);
        }
      }
    });
  } catch (error) {
    logger.error('Error setting up RabbitMQ:', error);
  }
}

// Create directories if they don't exist
fs.mkdirSync('logs', { recursive: true });

// Start the server
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  logger.info(`🟡 Ekko Email Marketing AI Agent started on port ${PORT}`);
  setupRabbitMQ().catch(err => logger.error('Failed to setup RabbitMQ:', err));
});