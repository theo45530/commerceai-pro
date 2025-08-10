const cluster = require('cluster');
const os = require('os');
const { getLogger } = require('../logging/logger-config');

const logger = getLogger('performance');

// Configuration d'optimisation pour les différents services
const performanceConfig = {
  // Configuration générale
  general: {
    // Utiliser tous les cœurs CPU disponibles
    enableClustering: process.env.ENABLE_CLUSTERING === 'true',
    maxWorkers: process.env.MAX_WORKERS || os.cpus().length,
    
    // Configuration mémoire
    maxMemoryUsage: process.env.MAX_MEMORY_MB || 512, // MB
    memoryCheckInterval: 30000, // 30 secondes
    
    // Configuration cache
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes
    maxCacheSize: 1000,
    
    // Configuration rate limiting
    rateLimitEnabled: true,
    defaultRateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requêtes par fenêtre
    }
  },
  
  // Configuration spécifique par service
  services: {
    'api-gateway': {
      clustering: true,
      maxWorkers: 2,
      memoryLimit: 256,
      caching: {
        enabled: true,
        ttl: 300,
        routes: ['/api/platforms/status', '/health']
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 200
      },
      compression: true,
      keepAlive: true
    },
    
    'platform-connectors': {
      clustering: false, // Les connexions externes peuvent être sensibles
      maxWorkers: 1,
      memoryLimit: 512,
      caching: {
        enabled: true,
        ttl: 600, // 10 minutes pour les données de plateforme
        keys: ['platform_data', 'auth_tokens']
      },
      connectionPooling: {
        enabled: true,
        maxConnections: 10,
        idleTimeout: 30000
      }
    },
    
    'agent-contenu': {
      clustering: true,
      maxWorkers: 2,
      memoryLimit: 1024, // Plus de mémoire pour l'IA
      caching: {
        enabled: true,
        ttl: 1800, // 30 minutes pour le contenu généré
        keys: ['generated_content', 'templates']
      },
      aiOptimization: {
        batchRequests: true,
        maxBatchSize: 5,
        requestTimeout: 30000
      }
    },
    
    'agent-analyse': {
      clustering: true,
      maxWorkers: 2,
      memoryLimit: 1024,
      caching: {
        enabled: true,
        ttl: 3600, // 1 heure pour les analyses
        keys: ['analysis_results', 'competitor_data']
      },
      dataProcessing: {
        chunkSize: 1000,
        parallelProcessing: true
      }
    },
    
    'agent-publicite': {
      clustering: true,
      maxWorkers: 2,
      memoryLimit: 512,
      caching: {
        enabled: true,
        ttl: 900, // 15 minutes pour les données publicitaires
        keys: ['campaign_data', 'performance_metrics']
      },
      apiOptimization: {
        batchRequests: true,
        requestDelay: 1000 // Délai entre les requêtes API
      }
    },
    
    'agent-pages': {
      clustering: true,
      maxWorkers: 2,
      memoryLimit: 512,
      caching: {
        enabled: true,
        ttl: 7200, // 2 heures pour les pages générées
        keys: ['generated_pages', 'templates']
      },
      staticFiles: {
        compression: true,
        caching: true,
        maxAge: 86400 // 24 heures
      }
    },
    
    'agent-sav': {
      clustering: true,
      maxWorkers: 3, // Plus de workers pour le support client
      memoryLimit: 256,
      caching: {
        enabled: true,
        ttl: 300, // 5 minutes pour les réponses
        keys: ['customer_context', 'common_responses']
      },
      realTime: {
        enabled: true,
        maxConnections: 100
      }
    },
    
    'agent-email': {
      clustering: false, // SMTP peut être sensible au clustering
      maxWorkers: 1,
      memoryLimit: 256,
      caching: {
        enabled: true,
        ttl: 1800, // 30 minutes pour les templates
        keys: ['email_templates', 'campaign_data']
      },
      emailQueue: {
        enabled: true,
        batchSize: 10,
        delay: 1000
      }
    }
  }
};

// Classe pour gérer l'optimisation des performances
class PerformanceOptimizer {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.config = performanceConfig.services[serviceName] || performanceConfig.general;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
    
    this.startMonitoring();
  }
  
  // Démarrer le monitoring des performances
  startMonitoring() {
    // Monitoring mémoire
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
      
      if (this.metrics.memoryUsage > this.config.memoryLimit) {
        logger.warn(`High memory usage detected: ${this.metrics.memoryUsage}MB`, {
          service: this.serviceName,
          limit: this.config.memoryLimit
        });
        
        // Forcer le garbage collection si possible
        if (global.gc) {
          global.gc();
          logger.info('Forced garbage collection', { service: this.serviceName });
        }
      }
    }, performanceConfig.general.memoryCheckInterval);
    
    // Monitoring CPU (simplifié)
    setInterval(() => {
      const usage = process.cpuUsage();
      this.metrics.cpuUsage = Math.round((usage.user + usage.system) / 1000000); // Convertir en millisecondes
    }, 10000);
    
    // Log des métriques toutes les 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 300000);
  }
  
  // Logger les métriques de performance
  logMetrics() {
    logger.info('Performance Metrics', {
      service: this.serviceName,
      metrics: this.metrics,
      config: this.config
    });
  }
  
  // Middleware pour mesurer le temps de réponse
  responseTimeMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.metrics.requestCount++;
        
        // Calculer la moyenne mobile du temps de réponse
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime * 0.9) + (duration * 0.1);
        
        if (res.statusCode >= 400) {
          this.metrics.errorCount++;
        }
        
        // Logger les requêtes lentes
        if (duration > 5000) {
          logger.warn('Slow request detected', {
            service: this.serviceName,
            method: req.method,
            url: req.url,
            duration: `${duration}ms`
          });
        }
      });
      
      next();
    };
  }
  
  // Optimiser les requêtes de base de données
  optimizeDbQueries() {
    return {
      // Utiliser des index appropriés
      ensureIndexes: true,
      
      // Limiter les résultats
      defaultLimit: 100,
      maxLimit: 1000,
      
      // Utiliser la projection pour limiter les champs
      useProjection: true,
      
      // Pool de connexions
      connectionPool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000
      }
    };
  }
  
  // Configuration du cache Redis
  getCacheConfig() {
    if (!this.config.caching?.enabled) return null;
    
    return {
      ttl: this.config.caching.ttl,
      maxSize: performanceConfig.general.maxCacheSize,
      keys: this.config.caching.keys || [],
      compression: true
    };
  }
  
  // Configuration du clustering
  setupClustering() {
    if (!this.config.clustering || !performanceConfig.general.enableClustering) {
      return false;
    }
    
    if (cluster.isMaster) {
      const numWorkers = Math.min(
        this.config.maxWorkers,
        performanceConfig.general.maxWorkers
      );
      
      logger.info(`Starting ${numWorkers} workers for ${this.serviceName}`);
      
      for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
      }
      
      cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died`, {
          service: this.serviceName,
          code,
          signal
        });
        
        // Redémarrer le worker
        cluster.fork();
      });
      
      return true;
    }
    
    return false;
  }
  
  // Optimisation des requêtes AI
  optimizeAIRequests() {
    if (!this.config.aiOptimization) return null;
    
    return {
      batchRequests: this.config.aiOptimization.batchRequests,
      maxBatchSize: this.config.aiOptimization.maxBatchSize,
      requestTimeout: this.config.aiOptimization.requestTimeout,
      
      // Queue pour les requêtes AI
      requestQueue: {
        concurrency: 3,
        delay: 1000
      }
    };
  }
}

// Fonction utilitaire pour créer un optimiseur
const createOptimizer = (serviceName) => {
  return new PerformanceOptimizer(serviceName);
};

// Configuration globale des performances
const globalOptimizations = {
  // Optimisations Node.js
  nodeOptimizations: () => {
    // Augmenter la taille du heap si nécessaire
    if (process.env.NODE_ENV === 'production') {
      process.env.NODE_OPTIONS = '--max-old-space-size=2048';
    }
    
    // Optimiser le garbage collector
    process.env.NODE_OPTIONS += ' --optimize-for-size';
    
    // Désactiver les warnings de dépréciation en production
    if (process.env.NODE_ENV === 'production') {
      process.env.NODE_NO_WARNINGS = '1';
    }
  },
  
  // Optimisations Express
  expressOptimizations: (app) => {
    // Désactiver x-powered-by
    app.disable('x-powered-by');
    
    // Optimiser les vues
    app.set('view cache', process.env.NODE_ENV === 'production');
    
    // Configuration de trust proxy
    app.set('trust proxy', 1);
  }
};

module.exports = {
  performanceConfig,
  PerformanceOptimizer,
  createOptimizer,
  globalOptimizations
};