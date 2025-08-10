const express = require('express');
const axios = require('axios');
const winston = require('winston');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'health-monitor' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/health-monitor.log' })
  ],
});

const app = express();
app.use(express.json());

// Services to monitor
const services = [
  { name: 'API Gateway', url: 'http://localhost:4000/health', port: 4000 },
  { name: 'Platform Connectors', url: 'http://localhost:4001/health', port: 4001 },
  { name: 'Frontend', url: 'http://localhost:3001', port: 3001 },
  { name: 'SAV Agent', url: 'http://localhost:5001/health', port: 5001 },
  { name: 'Publicité Agent', url: 'http://localhost:5002/health', port: 5002 },
  { name: 'Contenu Agent', url: 'http://localhost:5003/health', port: 5003 },
  { name: 'Analyse Agent', url: 'http://localhost:5004/health', port: 5004 },
  { name: 'Pages Agent', url: 'http://localhost:5005/health', port: 5005 }
];

// Health status storage
let healthStatus = {};
let systemMetrics = {
  uptime: process.uptime(),
  lastCheck: new Date(),
  totalChecks: 0,
  failedChecks: 0
};

// Check health of a single service
async function checkServiceHealth(service) {
  try {
    const startTime = Date.now();
    const response = await axios.get(service.url, { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    
    return {
      name: service.name,
      status: 'healthy',
      responseTime,
      statusCode: response.status,
      timestamp: new Date(),
      details: response.data
    };
  } catch (error) {
    logger.error(`Health check failed for ${service.name}:`, error.message);
    return {
      name: service.name,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
}

// Check all services
async function checkAllServices() {
  logger.info('Starting health check for all services');
  systemMetrics.totalChecks++;
  
  const results = await Promise.all(
    services.map(service => checkServiceHealth(service))
  );
  
  // Update health status
  results.forEach(result => {
    healthStatus[result.name] = result;
    if (result.status === 'unhealthy') {
      systemMetrics.failedChecks++;
    }
  });
  
  systemMetrics.lastCheck = new Date();
  
  // Save to file for persistence
  const healthReport = {
    timestamp: new Date(),
    services: healthStatus,
    metrics: systemMetrics
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'health-report.json'),
    JSON.stringify(healthReport, null, 2)
  );
  
  logger.info(`Health check completed. ${results.filter(r => r.status === 'healthy').length}/${results.length} services healthy`);
}

// API endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Health Monitor',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

app.get('/api/health/status', (req, res) => {
  res.json({
    services: healthStatus,
    metrics: systemMetrics,
    overall: Object.values(healthStatus).every(s => s.status === 'healthy') ? 'healthy' : 'degraded'
  });
});

app.get('/api/health/services/:serviceName', (req, res) => {
  const { serviceName } = req.params;
  const service = healthStatus[serviceName];
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  res.json(service);
});

app.post('/api/health/check', async (req, res) => {
  await checkAllServices();
  res.json({ message: 'Health check initiated', timestamp: new Date() });
});

// Schedule health checks every 2 minutes
cron.schedule('*/2 * * * *', () => {
  checkAllServices();
});

// Initial health check
setTimeout(() => {
  checkAllServices();
}, 5000); // Wait 5 seconds for services to start

const PORT = process.env.MONITOR_PORT || 4002;
app.listen(PORT, () => {
  logger.info(`Health Monitor started on port ${PORT}`);
  console.log(`🏥 Health Monitor running on http://localhost:${PORT}`);
});

module.exports = app;