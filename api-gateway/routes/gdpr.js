const express = require('express');
const router = express.Router();
const GdprService = require('../services/gdprService');
const { auth: authenticateToken, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting pour les demandes RGPD
const gdprRequestLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 heures
  max: 5, // Maximum 5 demandes par jour
  message: {
    error: 'Trop de demandes RGPD. Veuillez réessayer demain.',
    code: 'GDPR_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware pour vérifier l'accès RGPD
const requireGdprAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  next();
};

// Middleware pour les administrateurs RGPD
const requireGdprAdmin = [authenticateToken, authorize('admin')];

// GESTION DES CONSENTEMENTS

// Enregistrer un consentement
router.post('/consent',
  authenticateToken,
  [
    body('consentType')
      .isIn([
        'data_processing',
        'marketing',
        'analytics',
        'cookies_functional',
        'cookies_analytics',
        'cookies_marketing',
        'third_party_sharing',
        'automated_decision_making',
        'data_transfer_outside_eu'
      ])
      .withMessage('Type de consentement invalide'),
    body('status')
      .isIn(['granted', 'denied'])
      .withMessage('Statut de consentement invalide'),
    body('legalBasis')
      .isIn([
        'consent',
        'contract',
        'legal_obligation',
        'vital_interests',
        'public_task',
        'legitimate_interests'
      ])
      .withMessage('Base légale invalide'),
    body('source')
      .isIn(['registration', 'settings', 'cookie_banner', 'api'])
      .withMessage('Source invalide'),
    body('purpose').optional().isString(),
    body('dataCategories').optional().isArray(),
    body('consentText').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        consentType,
        status,
        legalBasis,
        source,
        purpose,
        dataCategories,
        retentionPeriod,
        consentText
      } = req.body;

      const consent = await GdprService.recordConsent(
        req.user.id,
        req.user.organizationId,
        {
          consentType,
          status,
          source,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          legalBasis,
          purpose,
          dataCategories,
          retentionPeriod,
          consentText
        }
      );

      res.status(201).json({
        success: true,
        data: consent,
        message: 'Consentement enregistré avec succès'
      });

    } catch (error) {
      console.error('Erreur enregistrement consentement:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'enregistrement du consentement',
        details: error.message
      });
    }
  }
);

// Récupérer les consentements
router.get('/consent',
  authenticateToken,
  [
    query('consentType').optional().isString(),
    query('status').optional().isIn(['granted', 'denied', 'withdrawn']),
    query('includeExpired').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { consentType, status, includeExpired } = req.query;
      
      const consents = await GdprService.getConsents(
        req.user.id,
        req.user.organizationId,
        { consentType, status, includeExpired: includeExpired === 'true' }
      );

      res.json({
        success: true,
        data: consents
      });

    } catch (error) {
      console.error('Erreur récupération consentements:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des consentements',
        details: error.message
      });
    }
  }
);

// Retirer un consentement
router.delete('/consent/:consentType',
  authenticateToken,
  [
    param('consentType').isString(),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { consentType } = req.params;
      const { reason } = req.body;

      const result = await GdprService.withdrawConsent(
        req.user.id,
        req.user.organizationId,
        consentType,
        reason
      );

      if (result > 0) {
        res.json({
          success: true,
          message: 'Consentement retiré avec succès'
        });
      } else {
        res.status(404).json({
          error: 'Aucun consentement actif trouvé pour ce type'
        });
      }

    } catch (error) {
      console.error('Erreur retrait consentement:', error);
      res.status(500).json({
        error: 'Erreur lors du retrait du consentement',
        details: error.message
      });
    }
  }
);

// DEMANDES DE DROITS RGPD

// Soumettre une demande RGPD
router.post('/request',
  authenticateToken,
  gdprRequestLimit,
  [
    body('requestType')
      .isIn([
        'access',
        'rectification',
        'erasure',
        'restriction',
        'portability',
        'objection',
        'automated_decision'
      ])
      .withMessage('Type de demande invalide'),
    body('description').isString().isLength({ min: 10, max: 1000 }),
    body('specificData').optional().isArray(),
    body('dateRange').optional().isObject(),
    body('format').optional().isIn(['json', 'csv', 'pdf', 'xml']),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        requestType,
        description,
        specificData,
        dateRange,
        format,
        reason
      } = req.body;

      const request = await GdprService.submitRequest(
        req.user.id,
        req.user.organizationId,
        {
          requestType,
          description,
          specificData,
          dateRange,
          format,
          reason
        }
      );

      res.status(201).json({
        success: true,
        data: {
          requestId: request.requestId,
          status: request.status,
          dueDate: request.dueDate
        },
        message: 'Demande RGPD soumise avec succès'
      });

    } catch (error) {
      console.error('Erreur soumission demande RGPD:', error);
      res.status(500).json({
        error: 'Erreur lors de la soumission de la demande',
        details: error.message
      });
    }
  }
);

// Récupérer les demandes de l'utilisateur
router.get('/request',
  authenticateToken,
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected', 'cancelled']),
    query('requestType').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { status, requestType, page = 1, limit = 20 } = req.query;
      
      const filter = {
        userId: req.user.id,
        organizationId: req.user.organizationId
      };
      
      if (status) filter.status = status;
      if (requestType) filter.requestType = requestType;

      const GdprRequest = require('mongoose').model('GdprRequest');
      const requests = await GdprRequest.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-response.attachments.path'); // Ne pas exposer les chemins de fichiers

      const total = await GdprRequest.countDocuments(filter);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération demandes:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des demandes',
        details: error.message
      });
    }
  }
);

// Récupérer une demande spécifique
router.get('/request/:requestId',
  authenticateToken,
  [
    param('requestId').isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const GdprRequest = require('mongoose').model('GdprRequest');
      const request = await GdprRequest.findOne({
        requestId,
        userId: req.user.id,
        organizationId: req.user.organizationId
      }).select('-response.attachments.path');

      if (!request) {
        return res.status(404).json({
          error: 'Demande non trouvée'
        });
      }

      res.json({
        success: true,
        data: request
      });

    } catch (error) {
      console.error('Erreur récupération demande:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération de la demande',
        details: error.message
      });
    }
  }
);

// ROUTES ADMINISTRATEUR

// Récupérer toutes les demandes (admin)
router.get('/admin/requests',
  ...requireGdprAdmin,
  [
    query('status').optional().isString(),
    query('requestType').optional().isString(),
    query('organizationId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('overdue').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        status,
        requestType,
        organizationId,
        page = 1,
        limit = 20,
        overdue
      } = req.query;
      
      const filter = {};
      if (status) filter.status = status;
      if (requestType) filter.requestType = requestType;
      if (organizationId) filter.organizationId = organizationId;
      if (overdue === 'true') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $in: ['pending', 'in_progress'] };
      }

      const GdprRequest = require('mongoose').model('GdprRequest');
      const requests = await GdprRequest.find(filter)
        .populate('userId', 'email firstName lastName')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await GdprRequest.countDocuments(filter);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération demandes admin:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des demandes',
        details: error.message
      });
    }
  }
);

// Traiter une demande d'accès (admin)
router.post('/admin/requests/:requestId/process-access',
  ...requireGdprAdmin,
  [
    param('requestId').isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const request = await GdprService.processAccessRequest(requestId);
      
      res.json({
        success: true,
        data: request,
        message: 'Demande d\'accès traitée avec succès'
      });

    } catch (error) {
      console.error('Erreur traitement demande d\'accès:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de la demande d\'accès',
        details: error.message
      });
    }
  }
);

// Traiter une demande d'effacement (admin)
router.post('/admin/requests/:requestId/process-erasure',
  ...requireGdprAdmin,
  [
    param('requestId').isString(),
    body('verifyIdentity').optional().isBoolean(),
    body('keepAuditTrail').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { verifyIdentity = true, keepAuditTrail = true } = req.body;
      
      const request = await GdprService.processErasureRequest(requestId, {
        verifyIdentity,
        keepAuditTrail
      });
      
      res.json({
        success: true,
        data: request,
        message: 'Demande d\'effacement traitée avec succès'
      });

    } catch (error) {
      console.error('Erreur traitement demande d\'effacement:', error);
      res.status(500).json({
        error: 'Erreur lors du traitement de la demande d\'effacement',
        details: error.message
      });
    }
  }
);

// Mettre à jour le statut d'une demande (admin)
router.patch('/admin/requests/:requestId',
  ...requireGdprAdmin,
  [
    param('requestId').isString(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected', 'cancelled']),
    body('assignedTo').optional().isMongoId(),
    body('response').optional().isObject(),
    body('notes').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const updates = req.body;
      
      const GdprRequest = require('mongoose').model('GdprRequest');
      const request = await GdprRequest.findOneAndUpdate(
        { requestId },
        {
          ...updates,
          ...(updates.status === 'completed' && { completedAt: new Date() })
        },
        { new: true }
      ).populate('userId', 'email firstName lastName')
       .populate('organizationId', 'name');

      if (!request) {
        return res.status(404).json({
          error: 'Demande non trouvée'
        });
      }

      res.json({
        success: true,
        data: request,
        message: 'Demande mise à jour avec succès'
      });

    } catch (error) {
      console.error('Erreur mise à jour demande:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de la demande',
        details: error.message
      });
    }
  }
);

// REGISTRE DES TRAITEMENTS

// Créer un enregistrement de traitement
router.post('/admin/processing-records',
  ...requireGdprAdmin,
  [
    body('name').isString().isLength({ min: 1, max: 200 }),
    body('description').optional().isString(),
    body('legalBasis').isIn([
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ]),
    body('purposes').isArray(),
    body('dataCategories').isArray(),
    body('dataSubjects').isArray(),
    body('controller').optional().isObject(),
    body('processor').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const record = await GdprService.createProcessingRecord(
        req.user.organizationId,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: record,
        message: 'Enregistrement de traitement créé avec succès'
      });

    } catch (error) {
      console.error('Erreur création enregistrement traitement:', error);
      res.status(500).json({
        error: 'Erreur lors de la création de l\'enregistrement',
        details: error.message
      });
    }
  }
);

// Récupérer les enregistrements de traitement
router.get('/admin/processing-records',
  ...requireGdprAdmin,
  [
    query('status').optional().isIn(['active', 'suspended', 'terminated']),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await GdprService.getProcessingRecords(
        req.user.organizationId,
        req.query
      );
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Erreur récupération enregistrements:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des enregistrements',
        details: error.message
      });
    }
  }
);

// STATISTIQUES ET CONFORMITÉ

// Récupérer les statistiques de conformité
router.get('/admin/compliance-stats',
  ...requireGdprAdmin,
  async (req, res) => {
    try {
      const stats = await GdprService.getComplianceStats(req.user.organizationId);
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        details: error.message
      });
    }
  }
);

// Vérifier l'expiration des consentements
router.post('/admin/check-consent-expiry',
  ...requireGdprAdmin,
  async (req, res) => {
    try {
      const expiredCount = await GdprService.checkConsentExpiry();
      
      res.json({
        success: true,
        data: {
          expiredConsents: expiredCount
        },
        message: `${expiredCount} consentements expirés traités`
      });

    } catch (error) {
      console.error('Erreur vérification expiration:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification des expirations',
        details: error.message
      });
    }
  }
);

// Envoyer des rappels de consentement
router.post('/admin/send-consent-reminders',
  ...requireGdprAdmin,
  async (req, res) => {
    try {
      const reminderCount = await GdprService.scheduleConsentReminders();
      
      res.json({
        success: true,
        data: {
          remindersSent: reminderCount
        },
        message: `${reminderCount} rappels de consentement envoyés`
      });

    } catch (error) {
      console.error('Erreur envoi rappels:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'envoi des rappels',
        details: error.message
      });
    }
  }
);

// ROUTES PUBLIQUES (pour les widgets de consentement)

// Récupérer les types de consentement disponibles
router.get('/consent-types',
  async (req, res) => {
    try {
      const consentTypes = [
        {
          id: 'data_processing',
          name: 'Traitement des données',
          description: 'Traitement de vos données personnelles pour le fonctionnement du service',
          required: true,
          category: 'essential'
        },
        {
          id: 'marketing',
          name: 'Communications marketing',
          description: 'Réception d\'emails promotionnels et d\'offres spéciales',
          required: false,
          category: 'marketing'
        },
        {
          id: 'analytics',
          name: 'Analyses et statistiques',
          description: 'Collecte de données d\'usage pour améliorer nos services',
          required: false,
          category: 'analytics'
        },
        {
          id: 'cookies_functional',
          name: 'Cookies fonctionnels',
          description: 'Cookies nécessaires au bon fonctionnement du site',
          required: true,
          category: 'essential'
        },
        {
          id: 'cookies_analytics',
          name: 'Cookies analytiques',
          description: 'Cookies pour mesurer l\'audience et améliorer l\'expérience',
          required: false,
          category: 'analytics'
        },
        {
          id: 'cookies_marketing',
          name: 'Cookies marketing',
          description: 'Cookies pour personnaliser la publicité',
          required: false,
          category: 'marketing'
        }
      ];
      
      res.json({
        success: true,
        data: consentTypes
      });

    } catch (error) {
      console.error('Erreur récupération types consentement:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des types de consentement',
        details: error.message
      });
    }
  }
);

module.exports = router;