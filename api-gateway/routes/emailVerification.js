const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const EmailVerificationService = require('../services/emailVerificationService');
const { auth: authMiddleware } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting pour les vérifications d'email
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par IP
  message: {
    error: 'Trop de tentatives de vérification. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const resendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 renvois par IP
  message: {
    error: 'Trop de demandes de renvoi. Réessayez dans 5 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const emailChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 changements d'email par IP par heure
  message: {
    error: 'Trop de demandes de changement d\'email. Réessayez dans 1 heure.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Données invalides',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Routes publiques

/**
 * @route POST /api/email-verification/verify
 * @desc Vérifier un token d'email
 * @access Public
 */
router.post('/verify',
  verificationLimiter,
  [
    body('token')
      .isLength({ min: 32, max: 128 })
      .withMessage('Token invalide')
      .matches(/^[a-f0-9]+$/i)
      .withMessage('Format de token invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await EmailVerificationService.verifyEmailToken(token, {
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
          email: result.email,
          type: result.type
        }
      });

    } catch (error) {
      console.error('Erreur vérification token email:', error);
      
      const statusCode = error.message.includes('invalide') || 
                        error.message.includes('expiré') ||
                        error.message.includes('tentatives') ? 400 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 400 ? 'INVALID_TOKEN' : 'VERIFICATION_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/email-verification/status/:token
 * @desc Vérifier le statut d'un token sans le consommer
 * @access Public
 */
router.get('/status/:token',
  [
    param('token')
      .isLength({ min: 32, max: 128 })
      .withMessage('Token invalide')
      .matches(/^[a-f0-9]+$/i)
      .withMessage('Format de token invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.params;
      
      // Cette méthode vérifie juste l'existence et la validité sans consommer le token
      const crypto = require('crypto');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const EmailVerificationToken = require('mongoose').model('EmailVerificationToken');
      const verificationToken = await EmailVerificationToken.findOne({
        token: hashedToken,
        verified: false,
        expiresAt: { $gt: new Date() }
      }).select('email type expiresAt attempts maxAttempts');

      if (!verificationToken) {
        return res.status(404).json({
          error: 'Token non trouvé ou expiré',
          code: 'TOKEN_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          email: verificationToken.email,
          type: verificationToken.type,
          expiresAt: verificationToken.expiresAt,
          attemptsRemaining: verificationToken.maxAttempts - verificationToken.attempts,
          isValid: true
        }
      });

    } catch (error) {
      console.error('Erreur vérification statut token:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification du statut',
        code: 'STATUS_CHECK_ERROR'
      });
    }
  }
);

// Routes authentifiées

/**
 * @route POST /api/email-verification/send
 * @desc Envoyer un email de vérification
 * @access Private
 */
router.post('/send',
  authMiddleware,
  resendLimiter,
  [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email invalide'),
    body('type')
      .optional()
      .isIn(['registration', 'email_change', 'reactivation'])
      .withMessage('Type de vérification invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, type = 'registration' } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Si pas d'email fourni, utiliser l'email de l'utilisateur connecté
      const targetEmail = email || req.user.email;

      const result = await EmailVerificationService.sendVerificationEmail(userId, targetEmail, type, {
        ipAddress,
        userAgent,
        source: 'user_request'
      });

      res.json({
        success: true,
        message: result.message,
        data: {
          email: targetEmail,
          type: result.type,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Erreur envoi email de vérification:', error);
      
      const statusCode = error.message.includes('limite') || 
                        error.message.includes('attendre') ? 429 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'SEND_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/email-verification/resend
 * @desc Renvoyer un email de vérification
 * @access Private
 */
router.post('/resend',
  authMiddleware,
  resendLimiter,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await EmailVerificationService.resendVerificationEmail(userId, {
        ipAddress,
        userAgent,
        source: 'resend_request'
      });

      res.json({
        success: true,
        message: result.message,
        data: {
          email: req.user.email,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Erreur renvoi email de vérification:', error);
      
      const statusCode = error.message.includes('vérifié') ? 400 :
                        error.message.includes('attendre') ? 429 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 400 ? 'ALREADY_VERIFIED' :
              statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'RESEND_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/email-verification/change-email
 * @desc Initier un changement d'email
 * @access Private
 */
router.post('/change-email',
  authMiddleware,
  emailChangeLimiter,
  [
    body('newEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Nouvel email invalide'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Mot de passe requis pour changer l\'email')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { newEmail, password } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Vérifier le mot de passe avant de procéder
      const bcrypt = require('bcrypt');
      const User = require('mongoose').model('User');
      const user = await User.findById(userId).select('password');
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({
          error: 'Mot de passe incorrect',
          code: 'INVALID_PASSWORD'
        });
      }

      const result = await EmailVerificationService.initiateEmailChange(userId, newEmail, {
        ipAddress,
        userAgent,
        source: 'email_change_request'
      });

      res.json({
        success: true,
        message: 'Email de vérification envoyé pour le changement d\'adresse',
        data: {
          newEmail,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Erreur changement email:', error);
      
      const statusCode = error.message.includes('utilisé') || 
                        error.message.includes('identique') ? 400 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 400 ? 'EMAIL_CONFLICT' : 'CHANGE_EMAIL_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/email-verification/status
 * @desc Obtenir le statut de vérification de l'utilisateur connecté
 * @access Private
 */
router.get('/status',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const status = await EmailVerificationService.getVerificationStatus(userId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Erreur récupération statut vérification:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération du statut',
        code: 'STATUS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/email-verification/history
 * @desc Obtenir l'historique des changements d'email
 * @access Private
 */
router.get('/history',
  authMiddleware,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limite doit être entre 1 et 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      
      const history = await EmailVerificationService.getEmailHistory(userId, limit);

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Erreur récupération historique email:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'historique',
        code: 'HISTORY_ERROR'
      });
    }
  }
);

// Routes administrateur

/**
 * @route GET /api/email-verification/admin/stats
 * @desc Obtenir les statistiques de vérification d'email
 * @access Private (Admin)
 */
router.get('/admin/stats',
  authMiddleware,
  permissionMiddleware(['system:admin', 'user:admin']),
  [
    query('organizationId')
      .optional()
      .isMongoId()
      .withMessage('ID d\'organisation invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { organizationId } = req.query;
      const stats = await EmailVerificationService.getVerificationStatistics(organizationId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération statistiques vérification:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        code: 'STATS_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/email-verification/admin/force-verify
 * @desc Forcer la vérification d'un email (admin)
 * @access Private (Admin)
 */
router.post('/admin/force-verify',
  authMiddleware,
  permissionMiddleware(['system:admin']),
  [
    body('userId')
      .isMongoId()
      .withMessage('ID utilisateur invalide'),
    body('reason')
      .isLength({ min: 10, max: 500 })
      .withMessage('Raison requise (10-500 caractères)')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, reason } = req.body;
      const adminId = req.user.id;

      const result = await EmailVerificationService.forceEmailVerification(userId, adminId, reason);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erreur vérification forcée email:', error);
      
      const statusCode = error.message.includes('non trouvé') ? 404 :
                        error.message.includes('vérifié') ? 400 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 404 ? 'USER_NOT_FOUND' :
              statusCode === 400 ? 'ALREADY_VERIFIED' : 'FORCE_VERIFY_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/email-verification/admin/cleanup
 * @desc Nettoyer les tokens expirés
 * @access Private (Admin)
 */
router.post('/admin/cleanup',
  authMiddleware,
  permissionMiddleware(['system:admin']),
  async (req, res) => {
    try {
      const deletedCount = await EmailVerificationService.cleanupExpiredTokens();

      res.json({
        success: true,
        message: `${deletedCount} tokens expirés supprimés`,
        data: {
          deletedCount
        }
      });

    } catch (error) {
      console.error('Erreur nettoyage tokens email:', error);
      res.status(500).json({
        error: 'Erreur lors du nettoyage',
        code: 'CLEANUP_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/email-verification/admin/pending
 * @desc Obtenir les vérifications en attente
 * @access Private (Admin)
 */
router.get('/admin/pending',
  authMiddleware,
  permissionMiddleware(['system:admin', 'user:admin']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page doit être un entier positif'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite doit être entre 1 et 100'),
    query('organizationId')
      .optional()
      .isMongoId()
      .withMessage('ID d\'organisation invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const { organizationId } = req.query;
      const skip = (page - 1) * limit;

      const EmailVerificationToken = require('mongoose').model('EmailVerificationToken');
      
      const matchStage = {
        verified: false,
        expiresAt: { $gt: new Date() }
      };
      
      if (organizationId) {
        matchStage.organizationId = require('mongoose').Types.ObjectId(organizationId);
      }

      const [tokens, total] = await Promise.all([
        EmailVerificationToken.find(matchStage)
          .populate('userId', 'email name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-token'), // Ne pas exposer le token
        EmailVerificationToken.countDocuments(matchStage)
      ]);

      res.json({
        success: true,
        data: {
          tokens,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération tokens en attente:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des tokens en attente',
        code: 'PENDING_TOKENS_ERROR'
      });
    }
  }
);

module.exports = router;