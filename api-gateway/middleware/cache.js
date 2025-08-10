const redis = require('redis');
const { logger } = require('./security');

// Redis client setup
let redisClient = null;
let isRedisConnected = false;

const initializeRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
    
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
      isRedisConnected = false;
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
      isRedisConnected = true;
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
      isRedisConnected = true;
    });
    
    redisClient.on('end', () => {
      logger.warn('Redis Client Disconnected');
      isRedisConnected = false;
    });
    
    await redisClient.connect();
    logger.info('Redis cache system initialized');
    
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    isRedisConnected = false;
  }
};

// Cache middleware factory
const createCacheMiddleware = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = () => true,
    skipCache = (req) => false
  } = options;
  
  return async (req, res, next) => {
    // Skip cache if Redis is not connected or condition not met
    if (!isRedisConnected || !condition(req) || skipCache(req)) {
      return next();
    }
    
    try {
      const cacheKey = keyGenerator(req);
      
      // Try to get from cache
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        logger.info('Cache hit', { key: cacheKey });
        const data = JSON.parse(cachedData);
        
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        return res.status(data.statusCode || 200).json(data.body);
      }
      
      // Cache miss - intercept response
      const originalSend = res.json;
      const originalStatus = res.status;
      let statusCode = 200;
      
      res.status = function(code) {
        statusCode = code;
        return originalStatus.call(this, code);
      };
      
      res.json = function(body) {
        // Only cache successful responses
        if (statusCode >= 200 && statusCode < 300) {
          const dataToCache = {
            statusCode,
            body,
            timestamp: Date.now()
          };
          
          // Cache asynchronously
          redisClient.setEx(cacheKey, ttl, JSON.stringify(dataToCache))
            .then(() => {
              logger.info('Data cached', { key: cacheKey, ttl });
            })
            .catch((err) => {
              logger.error('Cache set error', { key: cacheKey, error: err.message });
            });
        }
        
        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });
        
        return originalSend.call(this, body);
      };
      
      next();
      
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Specific cache configurations
const dashboardCache = createCacheMiddleware({
  ttl: 60, // 1 minute for dashboard data
  keyGenerator: (req) => `dashboard:${req.user?.id || 'anonymous'}`,
  condition: (req) => req.method === 'GET'
});

const platformsCache = createCacheMiddleware({
  ttl: 300, // 5 minutes for platform data
  keyGenerator: (req) => `platforms:${req.user?.id || 'anonymous'}`,
  condition: (req) => req.method === 'GET'
});

const healthCache = createCacheMiddleware({
  ttl: 30, // 30 seconds for health checks
  keyGenerator: () => 'health:status',
  condition: (req) => req.method === 'GET'
});

const userProfileCache = createCacheMiddleware({
  ttl: 600, // 10 minutes for user profiles
  keyGenerator: (req) => `user:${req.user?.id || 'anonymous'}:profile`,
  condition: (req) => req.method === 'GET'
});

// Cache invalidation helpers
const invalidateUserCache = async (userId) => {
  if (!isRedisConnected) return;
  
  try {
    const patterns = [
      `dashboard:${userId}`,
      `platforms:${userId}`,
      `user:${userId}:*`
    ];
    
    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('Cache invalidated', { pattern, keys: keys.length });
      }
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

const invalidateAllCache = async () => {
  if (!isRedisConnected) return;
  
  try {
    await redisClient.flushAll();
    logger.info('All cache invalidated');
  } catch (error) {
    logger.error('Cache flush error:', error);
  }
};

// Session storage helpers
const storeSession = async (sessionId, data, ttl = 86400) => {
  if (!isRedisConnected) return false;
  
  try {
    await redisClient.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error('Session store error:', error);
    return false;
  }
};

const getSession = async (sessionId) => {
  if (!isRedisConnected) return null;
  
  try {
    const data = await redisClient.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Session get error:', error);
    return null;
  }
};

const deleteSession = async (sessionId) => {
  if (!isRedisConnected) return false;
  
  try {
    await redisClient.del(`session:${sessionId}`);
    return true;
  } catch (error) {
    logger.error('Session delete error:', error);
    return false;
  }
};

// Rate limiting storage
const incrementRateLimit = async (key, windowMs) => {
  if (!isRedisConnected) return { count: 1, resetTime: Date.now() + windowMs };
  
  try {
    const multi = redisClient.multi();
    multi.incr(key);
    multi.expire(key, Math.ceil(windowMs / 1000));
    multi.ttl(key);
    
    const results = await multi.exec();
    const count = results[0];
    const ttl = results[2];
    
    return {
      count,
      resetTime: Date.now() + (ttl * 1000)
    };
  } catch (error) {
    logger.error('Rate limit increment error:', error);
    return { count: 1, resetTime: Date.now() + windowMs };
  }
};

// Cache statistics
const getCacheStats = async () => {
  if (!isRedisConnected) {
    return { connected: false, error: 'Redis not connected' };
  }
  
  try {
    const info = await redisClient.info('memory');
    const keyspace = await redisClient.info('keyspace');
    
    return {
      connected: true,
      memory: info,
      keyspace,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Cache stats error:', error);
    return { connected: false, error: error.message };
  }
};

// Initialize Redis on module load
initializeRedis();

module.exports = {
  redisClient,
  isRedisConnected: () => isRedisConnected,
  createCacheMiddleware,
  dashboardCache,
  platformsCache,
  healthCache,
  userProfileCache,
  invalidateUserCache,
  invalidateAllCache,
  storeSession,
  getSession,
  deleteSession,
  incrementRateLimit,
  getCacheStats
};