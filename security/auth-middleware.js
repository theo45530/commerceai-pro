const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const winston = require('winston');

// Configure security logger
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/security.log' })
  ],
});

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('⚠️  WARNING: JWT_SECRET not set in environment variables! Using fallback.');
  return 'CHANGE_THIS_SECRET_IN_PRODUCTION_' + Math.random().toString(36).substring(2, 15);
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      securityLogger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
      res.status(429).json({ error: message });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests, please try again later'),
  
  // Auth endpoints (more restrictive)
  auth: createRateLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts'),
  
  // AI generation endpoints (very restrictive)
  aiGeneration: createRateLimiter(60 * 1000, 5, 'Too many AI generation requests'),
  
  // Platform connections
  platformAuth: createRateLimiter(5 * 60 * 1000, 3, 'Too many platform connection attempts')
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'http://localhost:*', 'https://api.openai.com']
    }
  },
  crossOriginEmbedderPolicy: false
});

// Input validation middleware
const validateInput = {
  // Validate email format
  email: (req, res, next) => {
    const { email } = req.body;
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    next();
  },
  
  // Validate required fields
  required: (fields) => (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing 
      });
    }
    next();
  },
  
  // Sanitize input to prevent XSS
  sanitize: (req, res, next) => {
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        return validator.escape(value);
      }
      if (typeof value === 'object' && value !== null) {
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };
    
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    next();
  }
};

// JWT token generation
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    securityLogger.warn('Invalid token attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error.message
    });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Optional token verification (for demo mode)
const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // In demo mode, continue without authentication
      securityLogger.info('Demo mode: Invalid token ignored', {
        ip: req.ip,
        error: error.message
      });
    }
  }
  
  next();
};

// Password hashing utilities
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// API key validation for platform integrations
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // In production, validate against database
  // For now, accept any non-empty API key
  if (apiKey.length < 10) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  
  req.apiKey = apiKey;
  next();
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      securityLogger.warn('CORS blocked request', { origin, ip: req?.ip });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

// Security audit logging
const auditLog = (action) => (req, res, next) => {
  securityLogger.info('Security audit', {
    action,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    method: req.method,
    user: req.user?.id || 'anonymous',
    timestamp: new Date()
  });
  next();
};

module.exports = {
  rateLimiters,
  securityHeaders,
  validateInput,
  generateToken,
  verifyToken,
  optionalVerifyToken,
  hashPassword,
  comparePassword,
  validateApiKey,
  corsOptions,
  auditLog,
  securityLogger
};