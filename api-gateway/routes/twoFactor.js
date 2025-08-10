const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const TwoFactorService = require('../services/twoFactorService');
const { auth: authenticateToken } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');
const AuditService = require('../services/auditService');
const router = express.Router();

// Rate limiting pour les opérations 2FA
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives par fenêtre
  message: {
    error: 'Trop de tentatives. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 tentatives par fenêtre
  message: {
    error: 'Trop de tentatives de vérification. Réessayez dans 5 minutes.',
    code: 'VERIFICATION_RATE_LIMIT'
  }
});

// Middleware de validation
const validateTotpSetup = [
  body('organizationId').isMongoId().withMessage('ID organisation invalide')
];

const validateSmsSetup = [
  body('phoneNumber')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Numéro de téléphone invalide'),
  body('organizationId').isMongoId().withMessage('ID organisation invalide')
];

const validateVerification = [
  body('code')
    .isLength({ min: 6, max: 8 })
    .withMessage('Code de vérification invalide'),
  body('method')
    .isIn(['totp', 'sms', 'backup'])
    .withMessage('Méthode de vérification invalide')
];

const validateDeviceInfo = [
  body('deviceInfo.name').optional().isString().withMessage('Nom d\'appareil invalide'),
  body('deviceInfo.userAgent').isString().withMessage('User agent requis'),
  body('deviceInfo.ipAddress').isIP().withMessage('Adresse IP invalide')
];

// Routes pour la configuration TOTP

/**
 * @route POST /api/2fa/totp/setup
 * @desc Configurer TOTP pour l'utilisateur
 * @access Private
 */
router.post('/totp/setup', 
  authenticateToken,
  twoFactorLimiter,
  validateTotpSetup,
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

      const { organizationId } = req.body;
      const userId = req.user.id;

      const result = await TwoFactorService.setupTOTP(userId, organizationId);

      res.json({
        success: true,
        message: 'Configuration TOTP initiée',
        data: result
      });

    } catch (error) {
      console.error('Erreur configuration TOTP:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la configuration TOTP'
      });
    }
  }
);

/**
 * @route POST /api/2fa/sms/setup
 * @desc Configurer SMS pour l'utilisateur
 * @access Private
 */
router.post('/sms/setup',
  authenticateToken,
  twoFactorLimiter,
  validateSmsSetup,
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

      const { phoneNumber, organizationId } = req.body;
      const userId = req.user.id;

      const result = await TwoFactorService.setupSMS(userId, organizationId, phoneNumber);

      res.json({
        success: true,
        message: 'Configuration SMS initiée',
        data: result
      });

    } catch (error) {
      console.error('Erreur configuration SMS:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la configuration SMS'
      });
    }
  }
);

/**
 * @route POST /api/2fa/verify-setup
 * @desc Vérifier et activer la configuration 2FA
 * @access Private
 */
router.post('/verify-setup',
  authenticateToken,
  verificationLimiter,
  validateVerification,
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

      const { code, method } = req.body;
      const userId = req.user.id;

      const result = await TwoFactorService.verifySetup(userId, code, method);

      res.json({
        success: true,
        message: 'Authentification à deux facteurs activée',
        data: result
      });

    } catch (error) {
      console.error('Erreur vérification configuration:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification'
      });
    }
  }
);

// Routes pour la vérification

/**
 * @route POST /api/2fa/verify
 * @desc Vérifier un code 2FA
 * @access Private
 */
router.post('/verify',
  authenticateToken,
  verificationLimiter,
  validateVerification,
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

      const { code, method } = req.body;
      const userId = req.user.id;

      let isValid = false;

      switch (method) {
        case 'totp':
          isValid = await TwoFactorService.verifyTOTP(userId, code);
          break;
        case 'sms':
          isValid = await TwoFactorService.verifySMSCode(userId, code, 'login');
          break;
        case 'backup':
          isValid = await TwoFactorService.verifyBackupCode(userId, code);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Méthode de vérification non supportée'
          });
      }

      if (isValid) {
        res.json({
          success: true,
          message: 'Code vérifié avec succès'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Code de vérification invalide'
        });
      }

    } catch (error) {
      console.error('Erreur vérification 2FA:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification'
      });
    }
  }
);

/**
 * @route POST /api/2fa/sms/send
 * @desc Envoyer un code SMS
 * @access Private
 */
router.post('/sms/send',
  authenticateToken,
  verificationLimiter,
  async (req, res) => {
    try {
      const { purpose = 'login' } = req.body;
      const userId = req.user.id;

      const result = await TwoFactorService.sendSMSVerification(userId, purpose);

      res.json({
        success: true,
        message: 'Code SMS envoyé',
        data: result
      });

    } catch (error) {
      console.error('Erreur envoi SMS:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'envoi du SMS'
      });
    }
  }
);

// Routes pour les codes de récupération

/**
 * @route POST /api/2fa/backup-codes/regenerate
 * @desc Régénérer les codes de récupération
 * @access Private
 */
router.post('/backup-codes/regenerate',
  authenticateToken,
  twoFactorLimiter,
  body('verificationCode').isLength({ min: 6, max: 8 }).withMessage('Code de vérification requis'),
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

      const { verificationCode } = req.body;
      const userId = req.user.id;

      // Vérifier le code TOTP avant de régénérer
      const isValid = await TwoFactorService.verifyTOTP(userId, verificationCode);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Code de vérification invalide'
        });
      }

      const newCodes = await TwoFactorService.regenerateBackupCodes(userId);

      res.json({
        success: true,
        message: 'Codes de récupération régénérés',
        data: { backupCodes: newCodes }
      });

    } catch (error) {
      console.error('Erreur régénération codes:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la régénération des codes'
      });
    }
  }
);

// Routes pour les appareils de confiance

/**
 * @route POST /api/2fa/trusted-devices
 * @desc Ajouter un appareil de confiance
 * @access Private
 */
router.post('/trusted-devices',
  authenticateToken,
  validateDeviceInfo,
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

      const { deviceInfo } = req.body;
      const userId = req.user.id;

      const deviceId = await TwoFactorService.addTrustedDevice(userId, deviceInfo);

      res.json({
        success: true,
        message: 'Appareil ajouté aux appareils de confiance',
        data: { deviceId }
      });

    } catch (error) {
      console.error('Erreur ajout appareil de confiance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'ajout de l\'appareil'
      });
    }
  }
);

/**
 * @route DELETE /api/2fa/trusted-devices/:deviceId
 * @desc Supprimer un appareil de confiance
 * @access Private
 */
router.delete('/trusted-devices/:deviceId',
  authenticateToken,
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      await TwoFactorService.removeTrustedDevice(userId, deviceId);

      res.json({
        success: true,
        message: 'Appareil supprimé des appareils de confiance'
      });

    } catch (error) {
      console.error('Erreur suppression appareil:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la suppression de l\'appareil'
      });
    }
  }
);

/**
 * @route POST /api/2fa/trusted-devices/check
 * @desc Vérifier si un appareil est de confiance
 * @access Private
 */
router.post('/trusted-devices/check',
  authenticateToken,
  validateDeviceInfo,
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

      const { deviceInfo } = req.body;
      const userId = req.user.id;

      const isTrusted = await TwoFactorService.isTrustedDevice(userId, deviceInfo);

      res.json({
        success: true,
        data: { isTrusted }
      });

    } catch (error) {
      console.error('Erreur vérification appareil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification de l\'appareil'
      });
    }
  }
);

// Routes de gestion

/**
 * @route GET /api/2fa/status
 * @desc Obtenir le statut 2FA de l'utilisateur
 * @access Private
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const config = await TwoFactorService.getTwoFactorConfig(userId);

      res.json({
        success: true,
        data: config || {
          isEnabled: false,
          method: null,
          hasTotp: false,
          hasSms: false,
          backupCodesCount: 0,
          trustedDevicesCount: 0
        }
      });

    } catch (error) {
      console.error('Erreur récupération statut 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du statut'
      });
    }
  }
);

/**
 * @route POST /api/2fa/disable
 * @desc Désactiver l'authentification à deux facteurs
 * @access Private
 */
router.post('/disable',
  authenticateToken,
  twoFactorLimiter,
  body('verificationCode').isLength({ min: 6, max: 8 }).withMessage('Code de vérification requis'),
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

      const { verificationCode } = req.body;
      const userId = req.user.id;

      await TwoFactorService.disableTwoFactor(userId, verificationCode);

      res.json({
        success: true,
        message: 'Authentification à deux facteurs désactivée'
      });

    } catch (error) {
      console.error('Erreur désactivation 2FA:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la désactivation'
      });
    }
  }
);

// Routes d'administration

/**
 * @route GET /api/2fa/admin/stats
 * @desc Obtenir les statistiques 2FA globales
 * @access Admin
 */
router.get('/admin/stats',
  authenticateToken,
  permissionMiddleware('system:admin'),
  async (req, res) => {
    try {
      // Implémenter les statistiques globales 2FA
      const stats = {
        totalUsers: 0,
        enabledUsers: 0,
        totpUsers: 0,
        smsUsers: 0,
        averageVerifications: 0
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération statistiques 2FA:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }
);

module.exports = router;