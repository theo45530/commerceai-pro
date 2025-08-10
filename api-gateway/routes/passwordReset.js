const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const PasswordResetService = require('../services/passwordResetService');
const { auth: authenticateToken, optionalAuth } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');
const router = express.Router();

// Rate limiting pour les demandes de réinitialisation
const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 demandes par heure par IP
  message: {
    error: 'Trop de demandes de réinitialisation. Réessayez dans 1 heure.',
    code: 'RESET_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Limiter par IP et email si fourni
    return req.ip + (req.body.email || '');
  }
});

// Rate limiting pour la vérification de tokens
const tokenVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives par fenêtre
  message: {
    error: 'Trop de tentatives de vérification. Réessayez dans 15 minutes.',
    code: 'TOKEN_VERIFICATION_RATE_LIMIT'
  }
});

// Rate limiting pour le changement de mot de passe
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 changements par heure
  message: {
    error: 'Trop de changements de mot de passe. Réessayez dans 1 heure.',
    code: 'PASSWORD_CHANGE_RATE_LIMIT'
  }
});

// Middleware de validation
const validateResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('type')
    .optional()
    .isIn(['email', 'sms'])
    .withMessage('Type de réinitialisation invalide')
];

const validateTokenVerification = [
  body('token')
    .isLength({ min: 32, max: 128 })
    .withMessage('Token invalide')
];

const validatePasswordReset = [
  body('token')
    .isLength({ min: 32, max: 128 })
    .withMessage('Token invalide'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
];

// Utilitaire pour extraire les informations de la requête
function getRequestInfo(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    requestedBy: req.user ? req.user.id : 'anonymous'
  };
}

/**
 * @route POST /api/password-reset/request
 * @desc Initier une demande de réinitialisation de mot de passe
 * @access Public
 */
router.post('/request',
  resetRequestLimiter,
  validateResetRequest,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { email, type = 'email' } = req.body;
      const requestInfo = getRequestInfo(req);

      const result = await PasswordResetService.initiatePasswordReset(
        email,
        type,
        requestInfo
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          type,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Erreur demande réinitialisation:', error);
      
      // Ne pas révéler d'informations sensibles
      if (error.message.includes('Limite quotidienne')) {
        return res.status(429).json({
          success: false,
          message: 'Trop de demandes de réinitialisation aujourd\'hui. Réessayez demain.',
          code: 'DAILY_LIMIT_EXCEEDED'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de la demande de réinitialisation'
      });
    }
  }
);

/**
 * @route POST /api/password-reset/verify-token
 * @desc Vérifier un token de réinitialisation
 * @access Public
 */
router.post('/verify-token',
  tokenVerificationLimiter,
  validateTokenVerification,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Token invalide',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const requestInfo = getRequestInfo(req);

      const result = await PasswordResetService.verifyResetToken(token, requestInfo);

      res.json({
        success: true,
        message: 'Token valide',
        data: {
          email: result.email,
          type: result.type,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Erreur vérification token:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Token invalide ou expiré'
      });
    }
  }
);

/**
 * @route POST /api/password-reset/reset
 * @desc Réinitialiser le mot de passe avec un token
 * @access Public
 */
router.post('/reset',
  passwordChangeLimiter,
  validatePasswordReset,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { token, newPassword } = req.body;
      const requestInfo = getRequestInfo(req);

      const result = await PasswordResetService.resetPassword(
        token,
        newPassword,
        requestInfo
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la réinitialisation du mot de passe'
      });
    }
  }
);

/**
 * @route POST /api/password-reset/change
 * @desc Changer le mot de passe (utilisateur connecté)
 * @access Private
 */
router.post('/change',
  authenticateToken,
  passwordChangeLimiter,
  validatePasswordChange,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const requestInfo = getRequestInfo(req);

      const result = await PasswordResetService.changePassword(
        userId,
        currentPassword,
        newPassword,
        requestInfo
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors du changement de mot de passe'
      });
    }
  }
);

/**
 * @route GET /api/password-reset/check-strength
 * @desc Vérifier la force d'un mot de passe
 * @access Public
 */
router.post('/check-strength',
  body('password').notEmpty().withMessage('Mot de passe requis'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe requis',
          errors: errors.array()
        });
      }

      const { password } = req.body;
      
      // Analyser la force du mot de passe
      const analysis = {
        length: password.length,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        isCommon: ['password', '123456', 'qwerty', 'admin', 'letmein'].includes(password.toLowerCase())
      };

      // Calculer le score de force
      let score = 0;
      if (analysis.length >= 8) score += 20;
      if (analysis.length >= 12) score += 10;
      if (analysis.hasUpperCase) score += 15;
      if (analysis.hasLowerCase) score += 15;
      if (analysis.hasNumbers) score += 15;
      if (analysis.hasSpecialChar) score += 15;
      if (!analysis.isCommon) score += 10;

      let strength = 'Très faible';
      if (score >= 80) strength = 'Très forte';
      else if (score >= 60) strength = 'Forte';
      else if (score >= 40) strength = 'Moyenne';
      else if (score >= 20) strength = 'Faible';

      // Suggestions d'amélioration
      const suggestions = [];
      if (analysis.length < 8) suggestions.push('Utilisez au moins 8 caractères');
      if (!analysis.hasUpperCase) suggestions.push('Ajoutez des lettres majuscules');
      if (!analysis.hasLowerCase) suggestions.push('Ajoutez des lettres minuscules');
      if (!analysis.hasNumbers) suggestions.push('Ajoutez des chiffres');
      if (!analysis.hasSpecialChar) suggestions.push('Ajoutez des caractères spéciaux');
      if (analysis.isCommon) suggestions.push('Évitez les mots de passe communs');

      res.json({
        success: true,
        data: {
          score,
          strength,
          analysis,
          suggestions,
          isValid: score >= 60
        }
      });

    } catch (error) {
      console.error('Erreur vérification force mot de passe:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification'
      });
    }
  }
);

// Routes d'administration

/**
 * @route GET /api/password-reset/admin/stats
 * @desc Obtenir les statistiques de réinitialisation
 * @access Admin
 */
router.get('/admin/stats',
  authenticateToken,
  permissionMiddleware('system:admin'),
  async (req, res) => {
    try {
      const { organizationId } = req.query;
      
      const stats = await PasswordResetService.getResetStatistics(organizationId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }
);

/**
 * @route POST /api/password-reset/admin/cleanup
 * @desc Nettoyer les tokens expirés
 * @access Admin
 */
router.post('/admin/cleanup',
  authenticateToken,
  permissionMiddleware('system:admin'),
  async (req, res) => {
    try {
      const deletedCount = await PasswordResetService.cleanupExpiredTokens();

      res.json({
        success: true,
        message: `${deletedCount} tokens nettoyés`,
        data: { deletedCount }
      });

    } catch (error) {
      console.error('Erreur nettoyage tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du nettoyage'
      });
    }
  }
);

/**
 * @route POST /api/password-reset/admin/force-reset
 * @desc Forcer la réinitialisation d'un mot de passe (admin)
 * @access Admin
 */
router.post('/admin/force-reset',
  authenticateToken,
  permissionMiddleware('user:manage'),
  body('userId').isMongoId().withMessage('ID utilisateur invalide'),
  body('reason').notEmpty().withMessage('Raison requise'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { userId, reason } = req.body;
      const requestInfo = {
        ...getRequestInfo(req),
        requestedBy: req.user.id,
        reason: `Admin force reset: ${reason}`
      };

      // Récupérer l'email de l'utilisateur
      const User = require('../models/User');
      const user = await User.findById(userId).select('email');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const result = await PasswordResetService.initiatePasswordReset(
        user.email,
        'email',
        requestInfo
      );

      res.json({
        success: true,
        message: 'Réinitialisation forcée initiée',
        data: {
          email: user.email,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Erreur réinitialisation forcée:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la réinitialisation forcée'
      });
    }
  }
);

module.exports = router;