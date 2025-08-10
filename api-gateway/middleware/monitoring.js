const { logger } = require('./security');
const os = require('os');
const process = require('process');

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byEndpoint: {},
    byMethod: {},
    responseTime: []
  },
  system: {
    startTime: Date.now(),
    uptime: 0,
    memory: {},
    cpu: {}
  },
  security: {
    rateLimitHits: 0,
    authFailures: 0,
    validationErrors: 0
  }
};

// Request metrics middleware
const requestMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request
  metrics.requests.total++;
  
  // Track by endpoint
  const endpoint = req.route?.path || req.path;
  metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;
  
  // Track by method
  metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;
  
  // Track response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Store response time (keep last 1000 requests)
    metrics.requests.responseTime.push(responseTime);
    if (metrics.requests.responseTime.length > 1000) {
      metrics.requests.responseTime.shift();
    }
    
    // Track success/error
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.errors++;
    }
    
    // Log slow requests
    if (responseTime > 5000) {
      logger.warn('Slow request detected', {
        endpoint,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        ip: req.ip
      });
    }
  });
  
  next();
};

// System metrics collection
const updateSystemMetrics = () => {
  metrics.system.uptime = Date.now() - metrics.system.startTime;
  
  // Memory metrics
  const memUsage = process.memoryUsage();
  metrics.system.memory = {
    rss: memUsage.rss,
    heapTotal: memUsage.heapTotal,
    heapUsed: memUsage.heapUsed,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers,
    freeMemory: os.freemem(),
    totalMemory: os.totalmem()
  };
  
  // CPU metrics
  const cpus = os.cpus();
  metrics.system.cpu = {
    count: cpus.length,
    model: cpus[0]?.model || 'Unknown',
    loadAverage: os.loadavg(),
    usage: process.cpuUsage()
  };
};

// Calculate response time statistics
const getResponseTimeStats = () => {
  const times = metrics.requests.responseTime;
  if (times.length === 0) return null;
  
  const sorted = [...times].sort((a, b) => a - b);
  const len = sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[len - 1],
    avg: times.reduce((a, b) => a + b, 0) / len,
    median: len % 2 === 0 
      ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
      : sorted[Math.floor(len / 2)],
    p95: sorted[Math.floor(len * 0.95)],
    p99: sorted[Math.floor(len * 0.99)]
  };
};

// Health check endpoint
const healthCheck = (req, res) => {
  updateSystemMetrics();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: metrics.system.uptime,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    
    // System health
    system: {
      memory: {
        usage: Math.round((metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100),
        free: Math.round((metrics.system.memory.freeMemory / metrics.system.memory.totalMemory) * 100)
      },
      cpu: {
        count: metrics.system.cpu.count,
        loadAverage: metrics.system.cpu.loadAverage
      }
    },
    
    // Request metrics
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      errorRate: metrics.requests.total > 0 
        ? Math.round((metrics.requests.errors / metrics.requests.total) * 100) 
        : 0,
      responseTime: getResponseTimeStats()
    },
    
    // Security metrics
    security: {
      rateLimitHits: metrics.security.rateLimitHits,
      authFailures: metrics.security.authFailures,
      validationErrors: metrics.security.validationErrors
    }
  };
  
  // Determine health status
  const memoryUsage = health.system.memory.usage;
  const errorRate = health.requests.errorRate;
  const avgResponseTime = health.requests.responseTime?.avg || 0;
  
  if (memoryUsage > 90 || errorRate > 50 || avgResponseTime > 10000) {
    health.status = 'unhealthy';
    res.status(503);
  } else if (memoryUsage > 80 || errorRate > 20 || avgResponseTime > 5000) {
    health.status = 'degraded';
    res.status(200);
  }
  
  res.json(health);
};

// Detailed metrics endpoint
const detailedMetrics = (req, res) => {
  updateSystemMetrics();
  
  res.json({
    timestamp: new Date().toISOString(),
    metrics: {
      requests: {
        ...metrics.requests,
        responseTime: getResponseTimeStats()
      },
      system: metrics.system,
      security: metrics.security
    }
  });
};

// Increment security metrics
const incrementSecurityMetric = (type) => {
  if (metrics.security[type] !== undefined) {
    metrics.security[type]++;
  }
};

// Performance monitoring
const performanceMonitor = () => {
  setInterval(() => {
    updateSystemMetrics();
    
    // Log performance metrics every 5 minutes
    const stats = getResponseTimeStats();
    logger.info('Performance metrics', {
      uptime: metrics.system.uptime,
      requests: {
        total: metrics.requests.total,
        errorRate: metrics.requests.total > 0 
          ? Math.round((metrics.requests.errors / metrics.requests.total) * 100) 
          : 0
      },
      responseTime: stats,
      memory: {
        heapUsed: Math.round(metrics.system.memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(metrics.system.memory.heapTotal / 1024 / 1024)
      }
    });
    
    // Alert on high error rate
    const errorRate = metrics.requests.total > 0 
      ? (metrics.requests.errors / metrics.requests.total) * 100 
      : 0;
    
    if (errorRate > 25 && metrics.requests.total > 100) {
      logger.error('High error rate detected', {
        errorRate: Math.round(errorRate),
        totalRequests: metrics.requests.total,
        errors: metrics.requests.errors
      });
    }
    
    // Alert on high memory usage
    const memoryUsage = (metrics.system.memory.heapUsed / metrics.system.memory.heapTotal) * 100;
    if (memoryUsage > 85) {
      logger.warn('High memory usage detected', {
        usage: Math.round(memoryUsage),
        heapUsed: Math.round(metrics.system.memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(metrics.system.memory.heapTotal / 1024 / 1024)
      });
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

// Start performance monitoring
performanceMonitor();

module.exports = {
  requestMetrics,
  healthCheck,
  detailedMetrics,
  incrementSecurityMetric,
  metrics
};