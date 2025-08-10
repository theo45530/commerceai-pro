const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Token is not valid' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }
    
    // Check if user is verified (if email verification is required)
    if (!user.isVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      return res.status(401).json({ error: 'Email not verified' });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token is not valid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Organization membership check
const requireOrganization = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const user = await User.findById(req.user.id).populate('organization');
    
    if (!user.organization) {
      return res.status(403).json({ error: 'No organization membership found' });
    }
    
    req.organization = user.organization;
    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Check if user is organization owner
const requireOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const user = await User.findById(req.user.id).populate('organization');
    
    if (!user.organization) {
      return res.status(403).json({ error: 'No organization found' });
    }
    
    if (user.organization.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only organization owner can perform this action' });
    }
    
    req.organization = user.organization;
    next();
  } catch (error) {
    console.error('Owner middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    }
    
    // Check rate limit
    const userRequests = requests.get(userId) || [];
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current request
    userRequests.push(now);
    requests.set(userId, userRequests);
    
    next();
  };
};

module.exports = {
  auth,
  optionalAuth,
  authorize,
  requireOrganization,
  requireOwner,
  userRateLimit
};