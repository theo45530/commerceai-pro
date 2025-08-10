const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.SWAGGER_PORT || 4001;

// Enable CORS
app.use(cors());

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Swagger UI options
const options = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
  `,
  customSiteTitle: 'CommerceAI Pro API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    tryItOutEnabled: true
  }
};

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

// Redirect root to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'swagger-documentation',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve raw swagger.yaml
app.get('/swagger.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger.yaml'));
});

// Serve swagger.json
app.get('/swagger.json', (req, res) => {
  res.json(swaggerDocument);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Swagger server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
    availableEndpoints: [
      '/api-docs - Swagger UI Documentation',
      '/swagger.yaml - Raw YAML specification',
      '/swagger.json - JSON specification',
      '/health - Health check'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 CommerceAI Pro API Documentation`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`📄 YAML Spec: http://localhost:${PORT}/swagger.yaml`);
  console.log(`📄 JSON Spec: http://localhost:${PORT}/swagger.json`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n✨ Documentation server ready!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Swagger documentation server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Swagger documentation server shutting down...');
  process.exit(0);
});

module.exports = app;