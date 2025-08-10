const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const SSOService = require('../services/ssoService');
const { auth: authMiddleware } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting pour SSO
const ssoAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives par IP
  message: {
    error: 'Trop de tentatives d\'authentification SSO. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const ssoConfigLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 modifications de config par IP par heure
  message: {
    error: 'Trop de modifications de configuration SSO. Réessayez dans 1 heure.',
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
 * @route GET /api/sso/auth/:provider
 * @desc Initier l'authentification SSO
 * @access Public
 */
router.get('/auth/:provider',
  ssoAuthLimiter,
  [
    param('provider')
      .isIn(['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'])
      .withMessage('Fournisseur SSO non supporté'),
    query('organizationId')
      .isMongoId()
      .withMessage('ID d\'organisation invalide'),
    query('returnUrl')
      .optional()
      .isURL()
      .withMessage('URL de retour invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { organizationId, returnUrl } = req.query;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const authData = await SSOService.generateAuthUrl(organizationId, provider, {
        returnUrl,
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        data: {
          authUrl: authData.authUrl,
          state: authData.state,
          expiresAt: authData.expiresAt,
          provider
        }
      });

    } catch (error) {
      console.error('Erreur initiation auth SSO:', error);
      
      const statusCode = error.message.includes('non configuré') || 
                        error.message.includes('désactivé') ? 404 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 404 ? 'SSO_NOT_CONFIGURED' : 'AUTH_INIT_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/sso/callback/:provider
 * @desc Traiter le callback d'authentification SSO
 * @access Public
 */
router.post('/callback/:provider',
  ssoAuthLimiter,
  [
    param('provider')
      .isIn(['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'])
      .withMessage('Fournisseur SSO non supporté'),
    body('code')
      .isLength({ min: 1 })
      .withMessage('Code d\'autorisation requis'),
    body('state')
      .isLength({ min: 1 })
      .withMessage('État de sécurité requis'),
    body('error')
      .optional()
      .isString()
      .withMessage('Erreur doit être une chaîne')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state, error } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Vérifier s'il y a une erreur du fournisseur
      if (error) {
        return res.status(400).json({
          error: `Erreur du fournisseur SSO: ${error}`,
          code: 'SSO_PROVIDER_ERROR'
        });
      }

      const result = await SSOService.handleCallback(code, state, {
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        message: 'Authentification SSO réussie',
        data: {
          user: result.user,
          token: result.token,
          session: result.session
        }
      });

    } catch (error) {
      console.error('Erreur callback SSO:', error);
      
      const statusCode = error.message.includes('invalide') || 
                        error.message.includes('expiré') ? 400 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 400 ? 'INVALID_CALLBACK' : 'CALLBACK_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/sso/providers/:organizationId
 * @desc Obtenir les fournisseurs SSO disponibles pour une organisation
 * @access Public
 */
router.get('/providers/:organizationId',
  [
    param('organizationId')
      .isMongoId()
      .withMessage('ID d\'organisation invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      const SSOConfig = require('mongoose').model('SSOConfig');
      const providers = await SSOConfig.find({
        organizationId,
        isEnabled: true
      }).select('provider configuration.clientId domainRestrictions');

      const availableProviders = providers.map(config => ({
        provider: config.provider,
        clientId: config.configuration.clientId,
        domainRestrictions: config.domainRestrictions
      }));

      res.json({
        success: true,
        data: {
          providers: availableProviders,
          count: availableProviders.length
        }
      });

    } catch (error) {
      console.error('Erreur récupération fournisseurs SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des fournisseurs',
        code: 'PROVIDERS_ERROR'
      });
    }
  }
);

// Routes authentifiées

/**
 * @route POST /api/sso/link/:provider
 * @desc Lier un compte SSO à l'utilisateur connecté
 * @access Private
 */
router.post('/link/:provider',
  authMiddleware,
  ssoAuthLimiter,
  [
    param('provider')
      .isIn(['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'])
      .withMessage('Fournisseur SSO non supporté'),
    body('code')
      .isLength({ min: 1 })
      .withMessage('Code d\'autorisation requis'),
    body('state')
      .isLength({ min: 1 })
      .withMessage('État de sécurité requis')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state } = req.body;
      const userId = req.user.id;

      const result = await SSOService.linkAccount(userId, provider, code, state);

      res.json({
        success: true,
        message: result.message,
        data: result.link
      });

    } catch (error) {
      console.error('Erreur liaison compte SSO:', error);
      
      const statusCode = error.message.includes('non trouvé') ? 404 :
                        error.message.includes('déjà lié') ? 409 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 404 ? 'USER_NOT_FOUND' :
              statusCode === 409 ? 'ACCOUNT_ALREADY_LINKED' : 'LINK_ERROR'
      });
    }
  }
);

/**
 * @route DELETE /api/sso/unlink/:provider
 * @desc Délier un compte SSO
 * @access Private
 */
router.delete('/unlink/:provider',
  authMiddleware,
  [
    param('provider')
      .isIn(['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'])
      .withMessage('Fournisseur SSO non supporté')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const userId = req.user.id;

      const AccountLink = require('mongoose').model('AccountLink');
      const link = await AccountLink.findOne({ userId, provider });
      
      if (!link) {
        return res.status(404).json({
          error: 'Compte non lié à ce fournisseur',
          code: 'ACCOUNT_NOT_LINKED'
        });
      }

      await AccountLink.deleteOne({ userId, provider });

      // Audit log
      const AuditService = require('../services/auditService');
      await AuditService.log({
        action: 'auth.account_unlinked',
        category: 'security',
        actorId: userId,
        organizationId: req.user.organizationId,
        details: {
          provider,
          providerUserId: link.providerUserId,
          providerEmail: link.providerEmail
        },
        riskLevel: 'low'
      });

      res.json({
        success: true,
        message: 'Compte délié avec succès'
      });

    } catch (error) {
      console.error('Erreur déliaison compte SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la déliaison du compte',
        code: 'UNLINK_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/sso/linked-accounts
 * @desc Obtenir les comptes SSO liés de l'utilisateur
 * @access Private
 */
router.get('/linked-accounts',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      const AccountLink = require('mongoose').model('AccountLink');
      const linkedAccounts = await AccountLink.find({ userId })
        .select('provider providerEmail isVerified isPrimary linkedAt lastUsed')
        .sort({ linkedAt: -1 });

      res.json({
        success: true,
        data: {
          linkedAccounts,
          count: linkedAccounts.length
        }
      });

    } catch (error) {
      console.error('Erreur récupération comptes liés:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des comptes liés',
        code: 'LINKED_ACCOUNTS_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/sso/logout
 * @desc Déconnecter la session SSO
 * @access Private
 */
router.post('/logout',
  authMiddleware,
  async (req, res) => {
    try {
      const sessionId = req.user.sessionId;
      
      if (sessionId) {
        await SSOService.logout(sessionId);
      }

      res.json({
        success: true,
        message: 'Déconnexion SSO réussie'
      });

    } catch (error) {
      console.error('Erreur déconnexion SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la déconnexion',
        code: 'LOGOUT_ERROR'
      });
    }
  }
);

// Routes administrateur

/**
 * @route POST /api/sso/admin/configure
 * @desc Configurer un fournisseur SSO
 * @access Private (Admin)
 */
router.post('/admin/configure',
  authMiddleware,
  permissionMiddleware(['system:admin', 'sso:admin']),
  ssoConfigLimiter,
  [
    body('provider')
      .isIn(['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'])
      .withMessage('Fournisseur SSO non supporté'),
    body('organizationId')
      .isMongoId()
      .withMessage('ID d\'organisation invalide'),
    body('configuration.clientId')
      .isLength({ min: 1 })
      .withMessage('Client ID requis'),
    body('configuration.clientSecret')
      .isLength({ min: 1 })
      .withMessage('Client Secret requis'),
    body('configuration.redirectUri')
      .isURL()
      .withMessage('URI de redirection invalide'),
    body('isEnabled')
      .optional()
      .isBoolean()
      .withMessage('isEnabled doit être un booléen'),
    body('domainRestrictions')
      .optional()
      .isArray()
      .withMessage('Restrictions de domaine doivent être un tableau'),
    body('domainRestrictions.*')
      .optional()
      .matches(/^@?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      .withMessage('Format de domaine invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider, organizationId, ...config } = req.body;
      
      const result = await SSOService.configureSSOProvider(organizationId, provider, config);

      res.json({
        success: true,
        message: 'Configuration SSO mise à jour',
        data: result
      });

    } catch (error) {
      console.error('Erreur configuration SSO:', error);
      
      const statusCode = error.message.includes('non supporté') ? 400 : 500;
      
      res.status(statusCode).json({
        error: error.message,
        code: statusCode === 400 ? 'UNSUPPORTED_PROVIDER' : 'CONFIG_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/sso/admin/configurations
 * @desc Obtenir les configurations SSO
 * @access Private (Admin)
 */
router.get('/admin/configurations',
  authMiddleware,
  permissionMiddleware(['system:admin', 'sso:admin']),
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
      
      const SSOConfig = require('mongoose').model('SSOConfig');
      const query = organizationId ? { organizationId } : {};
      
      const configurations = await SSOConfig.find(query)
        .select('-configuration.clientSecret') // Ne pas exposer les secrets
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: {
          configurations,
          count: configurations.length
        }
      });

    } catch (error) {
      console.error('Erreur récupération configurations SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des configurations',
        code: 'CONFIGURATIONS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/sso/admin/stats
 * @desc Obtenir les statistiques SSO
 * @access Private (Admin)
 */
router.get('/admin/stats',
  authMiddleware,
  permissionMiddleware(['system:admin', 'sso:admin']),
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
      
      const stats = await SSOService.getSSOStatistics(organizationId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération statistiques SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        code: 'STATS_ERROR'
      });
    }
  }
);

/**
 * @route POST /api/sso/admin/cleanup
 * @desc Nettoyer les sessions SSO expirées
 * @access Private (Admin)
 */
router.post('/admin/cleanup',
  authMiddleware,
  permissionMiddleware(['system:admin']),
  async (req, res) => {
    try {
      const deletedCount = await SSOService.cleanupExpiredSessions();

      res.json({
        success: true,
        message: `${deletedCount} sessions expirées supprimées`,
        data: {
          deletedCount
        }
      });

    } catch (error) {
      console.error('Erreur nettoyage sessions SSO:', error);
      res.status(500).json({
        error: 'Erreur lors du nettoyage',
        code: 'CLEANUP_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/sso/admin/sessions
 * @desc Obtenir les sessions SSO actives
 * @access Private (Admin)
 */
router.get('/admin/sessions',
  authMiddleware,
  permissionMiddleware(['system:admin', 'sso:admin']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page doit être un entier positif'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite doit être entre 1 et 100'),
    query('provider')
      .optional()
      .isIn(['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'])
      .withMessage('Fournisseur SSO non supporté'),
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
      const { provider, organizationId } = req.query;
      const skip = (page - 1) * limit;

      const SSOSession = require('mongoose').model('SSOSession');
      
      const matchStage = {
        isActive: true,
        expiresAt: { $gt: new Date() }
      };
      
      if (provider) {
        matchStage.provider = provider;
      }
      
      if (organizationId) {
        matchStage.organizationId = require('mongoose').Types.ObjectId(organizationId);
      }

      const [sessions, total] = await Promise.all([
        SSOSession.find(matchStage)
          .populate('userId', 'email name')
          .select('-accessToken -refreshToken') // Ne pas exposer les tokens
          .sort({ lastActivity: -1 })
          .skip(skip)
          .limit(limit),
        SSOSession.countDocuments(matchStage)
      ]);

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération sessions SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des sessions',
        code: 'SESSIONS_ERROR'
      });
    }
  }
);

/**
 * @route DELETE /api/sso/admin/sessions/:sessionId
 * @desc Terminer une session SSO spécifique
 * @access Private (Admin)
 */
router.delete('/admin/sessions/:sessionId',
  authMiddleware,
  permissionMiddleware(['system:admin']),
  [
    param('sessionId')
      .isUUID()
      .withMessage('ID de session invalide')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const success = await SSOService.logout(sessionId);
      
      if (!success) {
        return res.status(404).json({
          error: 'Session non trouvée',
          code: 'SESSION_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        message: 'Session terminée avec succès'
      });

    } catch (error) {
      console.error('Erreur terminaison session SSO:', error);
      res.status(500).json({
        error: 'Erreur lors de la terminaison de la session',
        code: 'SESSION_TERMINATION_ERROR'
      });
    }
  }
);

module.exports = router;