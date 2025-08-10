const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const { OrganizationService } = require('../services/organizationService');
const { auth: authMiddleware } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');

const router = express.Router();
const organizationService = new OrganizationService();

// Rate limiting
const createOrgLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 créations d'organisations par heure
  message: { error: 'Trop de créations d\'organisations. Réessayez plus tard.' }
});

const inviteLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 invitations par 15 minutes
  message: { error: 'Trop d\'invitations envoyées. Réessayez plus tard.' }
});

const verificationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 tentatives de vérification par 5 minutes
  message: { error: 'Trop de tentatives de vérification. Réessayez plus tard.' }
});

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Données invalides',
      details: errors.array()
    });
  }
  next();
};

// === ROUTES PUBLIQUES ===

// POST /api/organizations - Créer une nouvelle organisation
router.post('/',
  createOrgLimit,
  [
    body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('displayName').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('domain').optional().trim().isEmail().normalizeEmail(),
    body('settings.timezone').optional().isString(),
    body('settings.language').optional().isIn(['fr', 'en', 'es', 'de', 'it']),
    body('settings.currency').optional().isIn(['EUR', 'USD', 'GBP', 'CAD']),
    body('subscription.plan').optional().isIn(['free', 'starter', 'professional', 'enterprise']),
    body('billing.address').optional().isObject(),
    body('contacts.primary').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Pour la création publique, on doit avoir un utilisateur authentifié
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentification requise pour créer une organisation'
        });
      }

      const organization = await organizationService.createOrganization(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        data: organization,
        message: 'Organisation créée avec succès. Un email de vérification a été envoyé.'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la création de l\'organisation',
        message: error.message
      });
    }
  }
);

// GET /api/organizations/verify/:token - Vérifier une organisation
router.get('/verify/:token',
  verificationLimit,
  [
    param('token').isLength({ min: 32, max: 64 }).isAlphanumeric()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organization = await organizationService.verifyOrganization(req.params.token);
      
      res.json({
        success: true,
        data: {
          organizationId: organization._id,
          name: organization.name,
          slug: organization.slug
        },
        message: 'Organisation vérifiée avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la vérification',
        message: error.message
      });
    }
  }
);

// GET /api/organizations/slug/:slug - Récupérer une organisation par slug (public)
router.get('/slug/:slug',
  [
    param('slug').isSlug()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organization = await organizationService.getOrganizationBySlug(req.params.slug);
      
      if (!organization) {
        return res.status(404).json({
          error: 'Organisation non trouvée'
        });
      }

      // Retourner seulement les informations publiques
      res.json({
        success: true,
        data: {
          id: organization._id,
          name: organization.name,
          displayName: organization.displayName,
          description: organization.description,
          logo: organization.logo,
          isVerified: organization.isVerified,
          settings: {
            language: organization.settings.language,
            features: {
              customBranding: organization.settings.features.customBranding
            }
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'organisation',
        message: error.message
      });
    }
  }
);

// === ROUTES AUTHENTIFIÉES ===

// GET /api/organizations - Récupérer les organisations (avec filtres)
router.get('/',
  authMiddleware,
  permissionMiddleware('organizations:read'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'suspended', 'pending', 'archived']),
    query('plan').optional().isIn(['free', 'starter', 'professional', 'enterprise']),
    query('search').optional().trim().isLength({ min: 2 }),
    query('sort').optional().isIn(['name', 'createdAt', 'lastActivityAt', '-name', '-createdAt', '-lastActivityAt'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const filters = {};
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: {},
        populate: ['createdBy']
      };

      // Filtres
      if (req.query.status) filters.status = req.query.status;
      if (req.query.plan) filters['subscription.plan'] = req.query.plan;
      if (req.query.search) {
        filters.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { displayName: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      // Tri
      if (req.query.sort) {
        const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
        const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
        options.sort[sortField] = sortOrder;
      } else {
        options.sort.createdAt = -1;
      }

      const result = await organizationService.getOrganizations(filters, options);
      
      res.json({
        success: true,
        data: result.organizations,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des organisations',
        message: error.message
      });
    }
  }
);

// GET /api/organizations/:id - Récupérer une organisation par ID
router.get('/:id',
  authMiddleware,
  permissionMiddleware('organizations:read'),
  [
    param('id').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organization = await organizationService.getOrganizationById(req.params.id);
      
      if (!organization) {
        return res.status(404).json({
          error: 'Organisation non trouvée'
        });
      }

      // Vérifier les permissions d'accès
      if (organization._id.toString() !== req.user.organizationId) {
        const hasSystemAccess = await req.user.hasPermission('system:admin');
        if (!hasSystemAccess) {
          return res.status(403).json({
            error: 'Accès refusé à cette organisation'
          });
        }
      }
      
      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération de l\'organisation',
        message: error.message
      });
    }
  }
);

// PUT /api/organizations/:id - Mettre à jour une organisation
router.put('/:id',
  authMiddleware,
  permissionMiddleware('organizations:update'),
  [
    param('id').isMongoId(),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('domain').optional().trim().isEmail().normalizeEmail(),
    body('logo').optional().isObject(),
    body('settings').optional().isObject(),
    body('billing').optional().isObject(),
    body('contacts').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organization = await organizationService.updateOrganization(
        req.params.id,
        req.body,
        req.user.id
      );
      
      res.json({
        success: true,
        data: organization,
        message: 'Organisation mise à jour avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la mise à jour de l\'organisation',
        message: error.message
      });
    }
  }
);

// DELETE /api/organizations/:id - Supprimer/Archiver une organisation
router.delete('/:id',
  authMiddleware,
  permissionMiddleware('organizations:delete'),
  [
    param('id').isMongoId(),
    body('reason').optional().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await organizationService.deleteOrganization(
        req.params.id,
        req.user.id,
        req.body.reason
      );
      
      res.json({
        success: true,
        message: 'Organisation archivée avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la suppression de l\'organisation',
        message: error.message
      });
    }
  }
);

// GET /api/organizations/:id/stats - Statistiques d'une organisation
router.get('/:id/stats',
  authMiddleware,
  permissionMiddleware('organizations:read'),
  [
    param('id').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const stats = await organizationService.getOrganizationStats(req.params.id);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        message: error.message
      });
    }
  }
);

// === GESTION DES INVITATIONS ===

// POST /api/organizations/:id/invite - Inviter un utilisateur
router.post('/:id/invite',
  authMiddleware,
  permissionMiddleware('users:invite'),
  inviteLimit,
  [
    param('id').isMongoId(),
    body('email').isEmail().normalizeEmail(),
    body('roleId').isMongoId(),
    body('message').optional().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const invitation = await organizationService.inviteUser(
        req.params.id,
        req.body.email,
        req.body.roleId,
        req.user.id,
        req.body.message
      );
      
      res.status(201).json({
        success: true,
        data: {
          invitationId: invitation._id,
          email: invitation.email,
          expiresAt: invitation.expiresAt
        },
        message: 'Invitation envoyée avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de l\'envoi de l\'invitation',
        message: error.message
      });
    }
  }
);

// GET /api/organizations/:id/invitations - Récupérer les invitations d'une organisation
router.get('/:id/invitations',
  authMiddleware,
  permissionMiddleware('users:read'),
  [
    param('id').isMongoId(),
    query('status').optional().isIn(['pending', 'accepted', 'declined', 'expired']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const filters = { organizationId: req.params.id };
      if (req.query.status) filters.status = req.query.status;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const invitations = await mongoose.model('OrganizationInvitation')
        .find(filters)
        .populate('roleId', 'name displayName')
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await mongoose.model('OrganizationInvitation').countDocuments(filters);
      
      res.json({
        success: true,
        data: invitations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des invitations',
        message: error.message
      });
    }
  }
);

// POST /api/organizations/accept-invitation/:token - Accepter une invitation
router.post('/accept-invitation/:token',
  authMiddleware,
  [
    param('token').isLength({ min: 32, max: 64 }).isAlphanumeric()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await organizationService.acceptInvitation(req.params.token, req.user.id);
      
      res.json({
        success: true,
        data: result,
        message: 'Invitation acceptée avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de l\'acceptation de l\'invitation',
        message: error.message
      });
    }
  }
);

// POST /api/organizations/decline-invitation/:token - Refuser une invitation
router.post('/decline-invitation/:token',
  [
    param('token').isLength({ min: 32, max: 64 }).isAlphanumeric(),
    body('reason').optional().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await organizationService.declineInvitation(req.params.token, req.body.reason);
      
      res.json({
        success: true,
        message: 'Invitation refusée'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors du refus de l\'invitation',
        message: error.message
      });
    }
  }
);

// === GESTION DES LIMITES ===

// GET /api/organizations/:id/limits - Vérifier les limites d'une organisation
router.get('/:id/limits',
  authMiddleware,
  permissionMiddleware('organizations:read'),
  [
    param('id').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organization = await organizationService.getOrganizationById(req.params.id);
      
      if (!organization) {
        return res.status(404).json({
          error: 'Organisation non trouvée'
        });
      }
      
      res.json({
        success: true,
        data: {
          limits: organization.limits,
          subscription: organization.subscription
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des limites',
        message: error.message
      });
    }
  }
);

// POST /api/organizations/:id/check-limit - Vérifier une limite spécifique
router.post('/:id/check-limit',
  authMiddleware,
  permissionMiddleware('organizations:read'),
  [
    param('id').isMongoId(),
    body('limitType').isIn(['users', 'storage', 'apiCalls', 'agents', 'integrations']),
    body('increment').optional().isInt({ min: 1 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await organizationService.checkLimit(
        req.params.id,
        req.body.limitType,
        req.body.increment || 1
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la vérification de limite',
        message: error.message
      });
    }
  }
);

// === ROUTES ADMINISTRATIVES ===

// GET /api/organizations/admin/stats - Statistiques globales des organisations
router.get('/admin/stats',
  authMiddleware,
  permissionMiddleware('system:admin'),
  async (req, res) => {
    try {
      const stats = await mongoose.model('Organization').aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const planStats = await mongoose.model('Organization').aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalOrganizations = await mongoose.model('Organization').countDocuments();
      const verifiedOrganizations = await mongoose.model('Organization').countDocuments({ isVerified: true });
      
      res.json({
        success: true,
        data: {
          total: totalOrganizations,
          verified: verifiedOrganizations,
          byStatus: stats,
          byPlan: planStats
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des statistiques',
        message: error.message
      });
    }
  }
);

// POST /api/organizations/admin/cleanup-invitations - Nettoyer les invitations expirées
router.post('/admin/cleanup-invitations',
  authMiddleware,
  permissionMiddleware('system:admin'),
  async (req, res) => {
    try {
      const cleanedCount = await organizationService.cleanupExpiredInvitations();
      
      res.json({
        success: true,
        data: {
          cleanedCount
        },
        message: `${cleanedCount} invitations expirées nettoyées`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors du nettoyage des invitations',
        message: error.message
      });
    }
  }
);

module.exports = router;