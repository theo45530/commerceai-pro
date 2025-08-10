const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const WebhookService = require('../services/webhookService');
const { auth: requireAuth, requireOrganization: requireOrganizationAccess } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');

// Middleware de permissions
const requireWebhookAccess = permissionMiddleware('webhook:read');
const requireWebhookManage = permissionMiddleware('webhook:manage');
const requireAdminWebhookAccess = permissionMiddleware('system:admin');

// Validation middleware
const validateWebhookEndpoint = [
  body('url')
    .isURL()
    .withMessage('URL valide requise'),
  body('events')
    .isArray({ min: 1 })
    .withMessage('Au moins un événement doit être spécifié'),
  body('events.*')
    .isIn([
      'user.created', 'user.updated', 'user.deleted',
      'organization.created', 'organization.updated', 'organization.deleted',
      'subscription.created', 'subscription.updated', 'subscription.cancelled',
      'payment.succeeded', 'payment.failed',
      'agent.created', 'agent.updated', 'agent.deleted',
      'usage.limit_reached', 'usage.overage',
      'support.ticket_created', 'support.ticket_updated',
      'audit.security_event',
      'system.maintenance'
    ])
    .withMessage('Événement non valide'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description trop longue'),
  body('secret')
    .optional()
    .isLength({ min: 8, max: 100 })
    .withMessage('Secret doit faire entre 8 et 100 caractères')
];

const validateWebhookUpdate = [
  body('url')
    .optional()
    .isURL()
    .withMessage('URL valide requise'),
  body('events')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Au moins un événement doit être spécifié'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description trop longue')
];

// Routes pour les endpoints de webhook

// Créer un endpoint de webhook
router.post('/',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookManage,
  validateWebhookEndpoint,
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

      const { url, events, description, secret } = req.body;
      const organizationId = req.user.organizationId;

      const endpoint = await WebhookService.createEndpoint({
        organizationId,
        url,
        events,
        description,
        secret
      });

      res.status(201).json({
        success: true,
        data: endpoint
      });
    } catch (error) {
      console.error('Erreur création webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du webhook'
      });
    }
  }
);

// Lister les endpoints de webhook
router.get('/',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookAccess,
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;
      const { page = 1, limit = 10, isActive } = req.query;

      const filter = { organizationId };
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      const endpoints = await WebhookService.getEndpoints(filter, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: endpoints
      });
    } catch (error) {
      console.error('Erreur récupération webhooks:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des webhooks'
      });
    }
  }
);

// Obtenir un endpoint spécifique
router.get('/:id',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookAccess,
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID invalide',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const endpoint = await WebhookService.getEndpoint(id, organizationId);
      if (!endpoint) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      res.json({
        success: true,
        data: endpoint
      });
    } catch (error) {
      console.error('Erreur récupération webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du webhook'
      });
    }
  }
);

// Mettre à jour un endpoint
router.put('/:id',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookManage,
  param('id').isMongoId().withMessage('ID invalide'),
  validateWebhookUpdate,
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

      const { id } = req.params;
      const organizationId = req.user.organizationId;
      const updates = req.body;

      const endpoint = await WebhookService.updateEndpoint(id, organizationId, updates);
      if (!endpoint) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      res.json({
        success: true,
        data: endpoint
      });
    } catch (error) {
      console.error('Erreur mise à jour webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du webhook'
      });
    }
  }
);

// Supprimer un endpoint
router.delete('/:id',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookManage,
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID invalide',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const organizationId = req.user.organizationId;

      const success = await WebhookService.deleteEndpoint(id, organizationId);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Webhook supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du webhook'
      });
    }
  }
);

// Tester un endpoint
router.post('/:id/test',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookManage,
  param('id').isMongoId().withMessage('ID invalide'),
  body('event').isIn([
    'user.created', 'user.updated', 'user.deleted',
    'organization.created', 'organization.updated', 'organization.deleted',
    'subscription.created', 'subscription.updated', 'subscription.cancelled',
    'payment.succeeded', 'payment.failed',
    'agent.created', 'agent.updated', 'agent.deleted',
    'usage.limit_reached', 'usage.overage',
    'support.ticket_created', 'support.ticket_updated',
    'audit.security_event',
    'system.maintenance'
  ]).withMessage('Événement non valide'),
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

      const { id } = req.params;
      const { event } = req.body;
      const organizationId = req.user.organizationId;

      const endpoint = await WebhookService.getEndpoint(id, organizationId);
      if (!endpoint) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      // Données de test
      const testData = {
        id: 'test_' + Date.now(),
        type: 'test',
        test: true,
        timestamp: new Date().toISOString()
      };

      await WebhookService.triggerWebhook(organizationId, event, testData);

      res.json({
        success: true,
        message: 'Webhook de test envoyé'
      });
    } catch (error) {
      console.error('Erreur test webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du test du webhook'
      });
    }
  }
);

// Obtenir les livraisons d'un endpoint
router.get('/:id/deliveries',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookAccess,
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID invalide',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      const organizationId = req.user.organizationId;

      const endpoint = await WebhookService.getEndpoint(id, organizationId);
      if (!endpoint) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      const filter = { endpointId: id };
      if (status) {
        filter.status = status;
      }

      const deliveries = await WebhookService.getDeliveries(filter, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: deliveries
      });
    } catch (error) {
      console.error('Erreur récupération livraisons:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des livraisons'
      });
    }
  }
);

// Obtenir les statistiques d'un endpoint
router.get('/:id/stats',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookAccess,
  param('id').isMongoId().withMessage('ID invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID invalide',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { days = 30 } = req.query;
      const organizationId = req.user.organizationId;

      const endpoint = await WebhookService.getEndpoint(id, organizationId);
      if (!endpoint) {
        return res.status(404).json({
          success: false,
          message: 'Webhook non trouvé'
        });
      }

      const stats = await WebhookService.getEndpointStats(id, parseInt(days));

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

// Lister les événements disponibles
router.get('/events/available',
  requireAuth,
  requireOrganizationAccess,
  requireWebhookAccess,
  async (req, res) => {
    try {
      const events = [
        {
          category: 'Utilisateurs',
          events: [
            { name: 'user.created', description: 'Utilisateur créé' },
            { name: 'user.updated', description: 'Utilisateur mis à jour' },
            { name: 'user.deleted', description: 'Utilisateur supprimé' }
          ]
        },
        {
          category: 'Organisations',
          events: [
            { name: 'organization.created', description: 'Organisation créée' },
            { name: 'organization.updated', description: 'Organisation mise à jour' },
            { name: 'organization.deleted', description: 'Organisation supprimée' }
          ]
        },
        {
          category: 'Abonnements',
          events: [
            { name: 'subscription.created', description: 'Abonnement créé' },
            { name: 'subscription.updated', description: 'Abonnement mis à jour' },
            { name: 'subscription.cancelled', description: 'Abonnement annulé' }
          ]
        },
        {
          category: 'Paiements',
          events: [
            { name: 'payment.succeeded', description: 'Paiement réussi' },
            { name: 'payment.failed', description: 'Paiement échoué' }
          ]
        },
        {
          category: 'Agents IA',
          events: [
            { name: 'agent.created', description: 'Agent créé' },
            { name: 'agent.updated', description: 'Agent mis à jour' },
            { name: 'agent.deleted', description: 'Agent supprimé' }
          ]
        },
        {
          category: 'Utilisation',
          events: [
            { name: 'usage.limit_reached', description: 'Limite d\'utilisation atteinte' },
            { name: 'usage.overage', description: 'Dépassement de limite' }
          ]
        },
        {
          category: 'Support',
          events: [
            { name: 'support.ticket_created', description: 'Ticket de support créé' },
            { name: 'support.ticket_updated', description: 'Ticket de support mis à jour' }
          ]
        },
        {
          category: 'Sécurité',
          events: [
            { name: 'audit.security_event', description: 'Événement de sécurité' }
          ]
        },
        {
          category: 'Système',
          events: [
            { name: 'system.maintenance', description: 'Maintenance système' }
          ]
        }
      ];

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Erreur récupération événements:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des événements'
      });
    }
  }
);

// Routes admin

// Lister tous les endpoints (admin)
router.get('/admin/endpoints',
  requireAuth,
  requireAdminWebhookAccess,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, organizationId, isActive } = req.query;

      const filter = {};
      if (organizationId) {
        filter.organizationId = organizationId;
      }
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      const endpoints = await WebhookService.getEndpoints(filter, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: endpoints
      });
    } catch (error) {
      console.error('Erreur récupération webhooks admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des webhooks'
      });
    }
  }
);

// Statistiques globales (admin)
router.get('/admin/stats',
  requireAuth,
  requireAdminWebhookAccess,
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const stats = await WebhookService.getGlobalStats(parseInt(days));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur récupération statistiques globales:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }
);

// Nettoyer les anciennes livraisons (admin)
router.post('/admin/cleanup',
  requireAuth,
  requireAdminWebhookAccess,
  body('days')
    .isInt({ min: 1, max: 365 })
    .withMessage('Nombre de jours invalide (1-365)'),
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

      const { days } = req.body;
      const deletedCount = await WebhookService.cleanupOldDeliveries(days);

      res.json({
        success: true,
        message: `${deletedCount} livraisons supprimées`
      });
    } catch (error) {
      console.error('Erreur nettoyage webhooks:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du nettoyage'
      });
    }
  }
);

module.exports = router;