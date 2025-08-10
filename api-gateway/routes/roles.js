const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const { RoleService } = require('../services/roleService');
const { auth: authMiddleware } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');

const router = express.Router();
const roleService = RoleService;

// Rate limiting
const createRoleLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 créations de rôles par 15 minutes
  message: { error: 'Trop de créations de rôles. Réessayez plus tard.' }
});

const assignRoleLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 assignations par 5 minutes
  message: { error: 'Trop d\'assignations de rôles. Réessayez plus tard.' }
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

// === ROUTES POUR LES PERMISSIONS ===

// GET /api/roles/permissions - Récupérer toutes les permissions
router.get('/permissions',
  authMiddleware,
  permissionMiddleware('roles:read'),
  query('category').optional().isIn(['system', 'organization', 'user', 'billing', 'analytics', 'support', 'api']),
  query('resource').optional().isString().trim(),
  query('action').optional().isIn(['create', 'read', 'update', 'delete', 'manage', 'execute']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const filters = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.resource) filters.resource = req.query.resource;
      if (req.query.action) filters.action = req.query.action;

      const permissions = await roleService.getPermissions(filters);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des permissions',
        message: error.message
      });
    }
  }
);

// POST /api/roles/permissions - Créer une nouvelle permission
router.post('/permissions',
  authMiddleware,
  permissionMiddleware('permissions:create'),
  createRoleLimit,
  [
    body('name').notEmpty().trim().isLength({ min: 3, max: 100 }),
    body('description').notEmpty().trim().isLength({ min: 10, max: 500 }),
    body('category').isIn(['system', 'organization', 'user', 'billing', 'analytics', 'support', 'api']),
    body('resource').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('action').isIn(['create', 'read', 'update', 'delete', 'manage', 'execute']),
    body('conditions').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const permission = await roleService.createPermission(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        data: permission,
        message: 'Permission créée avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la création de la permission',
        message: error.message
      });
    }
  }
);

// PUT /api/roles/permissions/:id - Mettre à jour une permission
router.put('/permissions/:id',
  authMiddleware,
  permissionMiddleware('permissions:update'),
  [
    param('id').isMongoId(),
    body('name').optional().trim().isLength({ min: 3, max: 100 }),
    body('description').optional().trim().isLength({ min: 10, max: 500 }),
    body('category').optional().isIn(['system', 'organization', 'user', 'billing', 'analytics', 'support', 'api']),
    body('resource').optional().trim().isLength({ min: 2, max: 50 }),
    body('action').optional().isIn(['create', 'read', 'update', 'delete', 'manage', 'execute']),
    body('conditions').optional().isObject(),
    body('isActive').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const permission = await roleService.updatePermission(req.params.id, req.body, req.user.id);
      
      res.json({
        success: true,
        data: permission,
        message: 'Permission mise à jour avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la mise à jour de la permission',
        message: error.message
      });
    }
  }
);

// === ROUTES POUR LES RÔLES ===

// GET /api/roles - Récupérer tous les rôles
router.get('/',
  authMiddleware,
  permissionMiddleware('roles:read'),
  [
    query('type').optional().isIn(['system', 'organization', 'custom']),
    query('organizationId').optional().isMongoId(),
    query('level').optional().isInt({ min: 1, max: 100 }),
    query('isActive').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const filters = { isActive: true };
      if (req.query.type) filters.type = req.query.type;
      if (req.query.organizationId) filters.organizationId = req.query.organizationId;
      if (req.query.level) filters.level = parseInt(req.query.level);
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';

      // Si l'utilisateur n'est pas super admin, filtrer par organisation
      if (!await roleService.hasRole(req.user.id, null, 'super_admin')) {
        filters.organizationId = req.user.organizationId;
      }

      const roles = await roleService.getRoles(filters);
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des rôles',
        message: error.message
      });
    }
  }
);

// GET /api/roles/:id - Récupérer un rôle par ID
router.get('/:id',
  authMiddleware,
  permissionMiddleware('roles:read'),
  [
    param('id').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const role = await roleService.getRoleById(req.params.id);
      
      if (!role) {
        return res.status(404).json({
          error: 'Rôle non trouvé'
        });
      }

      // Vérifier les permissions d'accès
      if (role.type === 'organization' && role.organizationId.toString() !== req.user.organizationId) {
        if (!await roleService.hasRole(req.user.id, null, 'super_admin')) {
          return res.status(403).json({
            error: 'Accès refusé à ce rôle'
          });
        }
      }
      
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération du rôle',
        message: error.message
      });
    }
  }
);

// POST /api/roles - Créer un nouveau rôle
router.post('/',
  authMiddleware,
  permissionMiddleware('roles:create'),
  createRoleLimit,
  [
    body('name').notEmpty().trim().isLength({ min: 3, max: 50 }).matches(/^[a-z0-9_]+$/),
    body('displayName').notEmpty().trim().isLength({ min: 3, max: 100 }),
    body('description').notEmpty().trim().isLength({ min: 10, max: 500 }),
    body('level').isInt({ min: 1, max: 100 }),
    body('type').isIn(['organization', 'custom']),
    body('organizationId').optional().isMongoId(),
    body('permissions').optional().isArray(),
    body('permissions.*').optional().isMongoId(),
    body('inheritsFrom').optional().isArray(),
    body('inheritsFrom.*').optional().isMongoId(),
    body('maxUsers').optional().isInt({ min: 1 }),
    body('features').optional().isObject(),
    body('restrictions').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Si pas d'organizationId fourni, utiliser celui de l'utilisateur
      if (!req.body.organizationId) {
        req.body.organizationId = req.user.organizationId;
      }

      // Vérifier que l'utilisateur peut créer des rôles pour cette organisation
      if (req.body.organizationId !== req.user.organizationId) {
        if (!await roleService.hasRole(req.user.id, null, 'super_admin')) {
          return res.status(403).json({
            error: 'Vous ne pouvez créer des rôles que pour votre organisation'
          });
        }
      }

      const role = await roleService.createRole(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        data: role,
        message: 'Rôle créé avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la création du rôle',
        message: error.message
      });
    }
  }
);

// PUT /api/roles/:id - Mettre à jour un rôle
router.put('/:id',
  authMiddleware,
  permissionMiddleware('roles:update'),
  [
    param('id').isMongoId(),
    body('name').optional().trim().isLength({ min: 3, max: 50 }).matches(/^[a-z0-9_]+$/),
    body('displayName').optional().trim().isLength({ min: 3, max: 100 }),
    body('description').optional().trim().isLength({ min: 10, max: 500 }),
    body('level').optional().isInt({ min: 1, max: 100 }),
    body('permissions').optional().isArray(),
    body('permissions.*').optional().isMongoId(),
    body('inheritsFrom').optional().isArray(),
    body('inheritsFrom.*').optional().isMongoId(),
    body('maxUsers').optional().isInt({ min: 1 }),
    body('features').optional().isObject(),
    body('restrictions').optional().isObject(),
    body('isActive').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const role = await roleService.updateRole(req.params.id, req.body, req.user.id);
      
      res.json({
        success: true,
        data: role,
        message: 'Rôle mis à jour avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la mise à jour du rôle',
        message: error.message
      });
    }
  }
);

// DELETE /api/roles/:id - Supprimer un rôle
router.delete('/:id',
  authMiddleware,
  permissionMiddleware('roles:delete'),
  [
    param('id').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await roleService.deleteRole(req.params.id, req.user.id);
      
      res.json({
        success: true,
        message: 'Rôle supprimé avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la suppression du rôle',
        message: error.message
      });
    }
  }
);

// === ROUTES POUR LES ASSIGNATIONS ===

// POST /api/roles/:roleId/assign - Assigner un rôle à un utilisateur
router.post('/:roleId/assign',
  authMiddleware,
  permissionMiddleware('roles:assign'),
  assignRoleLimit,
  [
    param('roleId').isMongoId(),
    body('userId').isMongoId(),
    body('organizationId').optional().isMongoId(),
    body('expiresAt').optional().isISO8601(),
    body('conditions').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organizationId = req.body.organizationId || req.user.organizationId;
      
      const assignment = await roleService.assignRole(
        req.body.userId,
        req.params.roleId,
        organizationId,
        req.user.id,
        {
          expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
          conditions: req.body.conditions,
          metadata: req.body.metadata
        }
      );
      
      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Rôle assigné avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de l\'assignation du rôle',
        message: error.message
      });
    }
  }
);

// DELETE /api/roles/:roleId/revoke - Révoquer un rôle d'un utilisateur
router.delete('/:roleId/revoke',
  authMiddleware,
  permissionMiddleware('roles:revoke'),
  [
    param('roleId').isMongoId(),
    body('userId').isMongoId(),
    body('organizationId').optional().isMongoId(),
    body('reason').optional().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organizationId = req.body.organizationId || req.user.organizationId;
      
      await roleService.revokeRole(
        req.body.userId,
        req.params.roleId,
        organizationId,
        req.user.id,
        req.body.reason
      );
      
      res.json({
        success: true,
        message: 'Rôle révoqué avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de la révocation du rôle',
        message: error.message
      });
    }
  }
);

// GET /api/roles/user/:userId - Récupérer les rôles d'un utilisateur
router.get('/user/:userId',
  authMiddleware,
  permissionMiddleware('users:read'),
  [
    param('userId').isMongoId(),
    query('organizationId').optional().isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organizationId = req.query.organizationId || req.user.organizationId;
      
      // Vérifier que l'utilisateur peut voir les rôles de cet utilisateur
      if (req.params.userId !== req.user.id) {
        if (!await roleService.hasPermission(req.user.id, organizationId, 'users:read')) {
          return res.status(403).json({
            error: 'Accès refusé'
          });
        }
      }
      
      const roles = await roleService.getUserRoles(req.params.userId, organizationId);
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des rôles utilisateur',
        message: error.message
      });
    }
  }
);

// GET /api/roles/user/:userId/permissions - Récupérer les permissions d'un utilisateur
router.get('/user/:userId/permissions',
  authMiddleware,
  [
    param('userId').isMongoId(),
    query('organizationId').optional().isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const organizationId = req.query.organizationId || req.user.organizationId;
      
      // Vérifier que l'utilisateur peut voir les permissions de cet utilisateur
      if (req.params.userId !== req.user.id) {
        if (!await roleService.hasPermission(req.user.id, organizationId, 'users:read')) {
          return res.status(403).json({
            error: 'Accès refusé'
          });
        }
      }
      
      const permissions = await roleService.getUserPermissions(req.params.userId, organizationId);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la récupération des permissions utilisateur',
        message: error.message
      });
    }
  }
);

// POST /api/roles/check-permission - Vérifier une permission
router.post('/check-permission',
  authMiddleware,
  [
    body('permission').notEmpty().trim(),
    body('resource').optional().trim(),
    body('userId').optional().isMongoId(),
    body('organizationId').optional().isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.body.userId || req.user.id;
      const organizationId = req.body.organizationId || req.user.organizationId;
      
      const hasPermission = await roleService.hasPermission(
        userId,
        organizationId,
        req.body.permission,
        req.body.resource
      );
      
      res.json({
        success: true,
        data: {
          hasPermission,
          permission: req.body.permission,
          resource: req.body.resource,
          userId,
          organizationId
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erreur lors de la vérification de permission',
        message: error.message
      });
    }
  }
);

// === ROUTES ADMINISTRATIVES ===

// GET /api/roles/admin/stats - Statistiques des rôles
router.get('/admin/stats',
  authMiddleware,
  permissionMiddleware('system:admin'),
  [
    query('organizationId').optional().isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const stats = await roleService.getRoleStatistics(req.query.organizationId);
      
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

// POST /api/roles/admin/initialize-defaults - Initialiser les rôles par défaut
router.post('/admin/initialize-defaults',
  authMiddleware,
  permissionMiddleware('system:admin'),
  [
    body('organizationId').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const roles = await roleService.initializeDefaultRoles(req.body.organizationId, req.user.id);
      
      res.json({
        success: true,
        data: roles,
        message: 'Rôles par défaut initialisés avec succès'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Erreur lors de l\'initialisation des rôles',
        message: error.message
      });
    }
  }
);

module.exports = router;