const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Créer le répertoire de logs s'il n'existe pas
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration des formats de log
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Format pour la console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${service || 'SYSTEM'}] ${level}: ${message}`;
    
    // Ajouter les métadonnées si présentes
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Configuration des transports par service
const createServiceLogger = (serviceName) => {
  const serviceLogsDir = path.join(logsDir, serviceName);
  if (!fs.existsSync(serviceLogsDir)) {
    fs.mkdirSync(serviceLogsDir, { recursive: true });
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      // Console output
      new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
      }),
      
      // Fichier pour tous les logs
      new winston.transports.File({
        filename: path.join(serviceLogsDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      
      // Fichier pour les erreurs uniquement
      new winston.transports.File({
        filename: path.join(serviceLogsDir, 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      
      // Fichier pour les logs d'accès/requêtes
      new winston.transports.File({
        filename: path.join(serviceLogsDir, 'access.log'),
        level: 'http',
        maxsize: 10485760, // 10MB
        maxFiles: 10,
        tailable: true
      })
    ],
    
    // Gestion des exceptions non capturées
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(serviceLogsDir, 'exceptions.log')
      })
    ],
    
    // Gestion des rejections non capturées
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(serviceLogsDir, 'rejections.log')
      })
    ]
  });
};

// Logger central pour le système
const systemLogger = createServiceLogger('system');

// Middleware Express pour les logs d'accès
const createAccessLogger = (serviceName) => {
  const logger = createServiceLogger(serviceName);
  
  return (req, res, next) => {
    const start = Date.now();
    
    // Capturer la réponse
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - start;
      
      // Log de la requête
      logger.http('HTTP Request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        contentLength: res.get('Content-Length') || 0
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware pour capturer les erreurs
const errorLogger = (serviceName) => {
  const logger = createServiceLogger(serviceName);
  
  return (err, req, res, next) => {
    logger.error('Unhandled Error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next(err);
  };
};

// Fonction pour logger les métriques de performance
const logPerformanceMetrics = (serviceName, metrics) => {
  const logger = createServiceLogger(serviceName);
  
  logger.info('Performance Metrics', {
    ...metrics,
    timestamp: new Date().toISOString()
  });
};

// Fonction pour logger les événements business
const logBusinessEvent = (serviceName, eventType, eventData) => {
  const logger = createServiceLogger(serviceName);
  
  logger.info('Business Event', {
    eventType,
    eventData,
    timestamp: new Date().toISOString()
  });
};

// Fonction pour logger les événements de sécurité
const logSecurityEvent = (serviceName, eventType, details) => {
  const logger = createServiceLogger(serviceName);
  
  logger.warn('Security Event', {
    eventType,
    details,
    timestamp: new Date().toISOString(),
    severity: 'HIGH'
  });
};

// Configuration pour les différents services
const serviceLoggers = {
  'api-gateway': createServiceLogger('api-gateway'),
  'platform-connectors': createServiceLogger('platform-connectors'),
  'agent-sav': createServiceLogger('agent-sav'),
  'agent-publicite': createServiceLogger('agent-publicite'),
  'agent-contenu': createServiceLogger('agent-contenu'),
  'agent-analyse': createServiceLogger('agent-analyse'),
  'agent-pages': createServiceLogger('agent-pages'),
  'agent-email': createServiceLogger('agent-email'),
  'health-monitor': createServiceLogger('health-monitor'),
  'frontend': createServiceLogger('frontend')
};

// Fonction pour obtenir un logger pour un service spécifique
const getLogger = (serviceName) => {
  return serviceLoggers[serviceName] || systemLogger;
};

// Configuration pour les logs agrégés
const aggregatedLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'aggregated.log'),
      maxsize: 50485760, // 50MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Fonction pour nettoyer les anciens logs
const cleanOldLogs = (daysToKeep = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const cleanDirectory = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        systemLogger.info(`Deleted old log file: ${filePath}`);
      }
    });
  };
  
  // Nettoyer tous les répertoires de logs
  Object.keys(serviceLoggers).forEach(service => {
    cleanDirectory(path.join(logsDir, service));
  });
  
  cleanDirectory(logsDir);
};

// Planifier le nettoyage des logs (tous les jours à minuit)
const scheduleLogCleanup = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    cleanOldLogs();
    // Programmer le prochain nettoyage dans 24 heures
    setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
};

// Démarrer le nettoyage automatique
if (process.env.NODE_ENV === 'production') {
  scheduleLogCleanup();
}

module.exports = {
  createServiceLogger,
  getLogger,
  systemLogger,
  aggregatedLogger,
  createAccessLogger,
  errorLogger,
  logPerformanceMetrics,
  logBusinessEvent,
  logSecurityEvent,
  cleanOldLogs,
  serviceLoggers
};