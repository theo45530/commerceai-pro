const { RoleService } = require('../services/roleService');
const AuditService = require('../services/auditService');

const roleService = new RoleService();
const auditService = AuditService;

/**
 * Middleware de vérification des permissions
 * @param {string|string[]} requiredPermissions - Permission(s) requise(s)
 * @param {Object} options - Options supplémentaires
 * @param {string} options.resource - Ressource spécifique
 * @param {boolean} options.requireAll - Toutes les permissions sont requises (AND) vs au moins une (OR)
 * @param {Function} options.customCheck - Fonction de vérification personnalisée
 */
function permissionMiddleware(requiredPermissions, options = {}) {
  return async (req, res, next) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      // Normaliser les permissions en tableau
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      const {
        resource = null,
        requireAll = false,
        customCheck = null,
        organizationId = req.user.organizationId
      } = options;

      // Super admin a tous les droits
      const isSuperAdmin = await roleService.hasRole(req.user.id, null, 'super_admin');
      if (isSuperAdmin) {
        return next();
      }

      // Vérification personnalisée
      if (customCheck && typeof customCheck === 'function') {
        const customResult = await customCheck(req, res, req.user);
        if (customResult === false) {
          await logAccessDenied(req, permissions, 'custom_check_failed');
          return res.status(403).json({
            error: 'Accès refusé - Vérification personnalisée échouée',
            code: 'CUSTOM_CHECK_FAILED'
          });
        }
        if (customResult === true) {
          return next();
        }
        // Si customResult n'est ni true ni false, continuer avec la vérification normale
      }

      // Vérifier les permissions
      const hasPermissions = await checkPermissions(
        req.user.id,
        organizationId,
        permissions,
        resource,
        requireAll
      );

      if (!hasPermissions.allowed) {
        await logAccessDenied(req, permissions, hasPermissions.reason);
        return res.status(403).json({
          error: 'Permissions insuffisantes',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissions,
          missing: hasPermissions.missing || []
        });
      }

      // Ajouter les informations de permissions à la requête
      req.permissions = {
        checked: permissions,
        granted: hasPermissions.granted,
        organizationId
      };

      next();
    } catch (error) {
      console.error('Erreur dans le middleware de permissions:', error);
      await logAccessDenied(req, requiredPermissions, 'middleware_error');
      
      res.status(500).json({
        error: 'Erreur lors de la vérification des permissions',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Vérifier les permissions d'un utilisateur
 */
async function checkPermissions(userId, organizationId, permissions, resource, requireAll) {
  try {
    const results = [];
    const granted = [];
    const missing = [];

    for (const permission of permissions) {
      const hasPermission = await roleService.hasPermission(
        userId,
        organizationId,
        permission,
        resource
      );

      results.push(hasPermission);
      
      if (hasPermission) {
        granted.push(permission);
      } else {
        missing.push(permission);
      }
    }

    // Logique AND vs OR
    const allowed = requireAll 
      ? results.every(result => result === true)
      : results.some(result => result === true);

    return {
      allowed,
      granted,
      missing,
      reason: allowed ? null : (requireAll ? 'missing_required_permissions' : 'no_permissions_found')
    };
  } catch (error) {
    throw new Error(`Erreur lors de la vérification des permissions: ${error.message}`);
  }
}

/**
 * Logger les accès refusés pour audit
 */
async function logAccessDenied(req, permissions, reason) {
  try {
    await auditService.log({
      action: 'access_denied',
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      details: {
        path: req.path,
        method: req.method,
        requiredPermissions: permissions,
        reason,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      },
      severity: 'warning'
    });
  } catch (error) {
    console.error('Erreur lors du logging d\'accès refusé:', error);
  }
}

/**
 * Middleware pour vérifier l'appartenance à une organisation
 */
function organizationMiddleware(options = {}) {
  return async (req, res, next) => {
    try {
      const {
        paramName = 'organizationId',
        allowSuperAdmin = true,
        allowSameUser = false
      } = options;

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      // Super admin peut accéder à toutes les organisations
      if (allowSuperAdmin) {
        const isSuperAdmin = await roleService.hasRole(req.user.id, null, 'super_admin');
        if (isSuperAdmin) {
          return next();
        }
      }

      // Récupérer l'ID de l'organisation depuis les paramètres ou le body
      const targetOrganizationId = req.params[paramName] || req.body[paramName];
      
      if (!targetOrganizationId) {
        return res.status(400).json({
          error: 'ID d\'organisation manquant',
          code: 'ORGANIZATION_ID_MISSING'
        });
      }

      // Vérifier que l'utilisateur appartient à cette organisation
      if (targetOrganizationId !== req.user.organizationId) {
        // Exception pour les actions sur soi-même
        if (allowSameUser && req.params.userId === req.user.id) {
          return next();
        }

        await logAccessDenied(req, ['organization_access'], 'wrong_organization');
        return res.status(403).json({
          error: 'Accès refusé à cette organisation',
          code: 'WRONG_ORGANIZATION'
        });
      }

      next();
    } catch (error) {
      console.error('Erreur dans le middleware d\'organisation:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification d\'organisation',
        code: 'ORGANIZATION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware pour vérifier le niveau de rôle minimum
 */
function roleLevel(minimumLevel) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRoles = await roleService.getUserRoles(req.user.id, req.user.organizationId);
      
      // Trouver le niveau maximum de l'utilisateur
      const maxLevel = userRoles.reduce((max, role) => {
        return Math.max(max, role.level || 0);
      }, 0);

      if (maxLevel < minimumLevel) {
        await logAccessDenied(req, [`level_${minimumLevel}`], 'insufficient_role_level');
        return res.status(403).json({
          error: 'Niveau de rôle insuffisant',
          code: 'INSUFFICIENT_ROLE_LEVEL',
          required: minimumLevel,
          current: maxLevel
        });
      }

      req.roleLevel = maxLevel;
      next();
    } catch (error) {
      console.error('Erreur dans le middleware de niveau de rôle:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification du niveau de rôle',
        code: 'ROLE_LEVEL_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware pour vérifier qu'un utilisateur a un rôle spécifique
 */
function requireRole(roleName, organizationId = null) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      const targetOrgId = organizationId || req.user.organizationId;
      const hasRole = await roleService.hasRole(req.user.id, targetOrgId, roleName);

      if (!hasRole) {
        await logAccessDenied(req, [roleName], 'missing_required_role');
        return res.status(403).json({
          error: `Rôle '${roleName}' requis`,
          code: 'MISSING_REQUIRED_ROLE',
          required: roleName
        });
      }

      next();
    } catch (error) {
      console.error('Erreur dans le middleware de rôle requis:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification du rôle',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware pour vérifier les restrictions temporelles
 */
function timeRestriction() {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRoles = await roleService.getUserRoles(req.user.id, req.user.organizationId);
      
      // Vérifier les restrictions temporelles de tous les rôles
      for (const role of userRoles) {
        if (role.restrictions && role.restrictions.timeRestrictions) {
          const restrictions = role.restrictions.timeRestrictions;
          const now = new Date();
          
          // Vérifier les jours autorisés
          if (restrictions.allowedDays && restrictions.allowedDays.length > 0) {
            const currentDay = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
            if (!restrictions.allowedDays.includes(currentDay)) {
              await logAccessDenied(req, ['time_restriction'], 'day_not_allowed');
              return res.status(403).json({
                error: 'Accès non autorisé ce jour',
                code: 'DAY_NOT_ALLOWED'
              });
            }
          }

          // Vérifier les heures autorisées
          if (restrictions.allowedHours) {
            const currentHour = now.getHours();
            const startHour = parseInt(restrictions.allowedHours.start);
            const endHour = parseInt(restrictions.allowedHours.end);
            
            if (currentHour < startHour || currentHour >= endHour) {
              await logAccessDenied(req, ['time_restriction'], 'hour_not_allowed');
              return res.status(403).json({
                error: 'Accès non autorisé à cette heure',
                code: 'HOUR_NOT_ALLOWED',
                allowedHours: restrictions.allowedHours
              });
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error('Erreur dans le middleware de restriction temporelle:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification des restrictions temporelles',
        code: 'TIME_RESTRICTION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware pour vérifier les restrictions IP
 */
function ipRestriction() {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRoles = await roleService.getUserRoles(req.user.id, req.user.organizationId);
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Vérifier les restrictions IP de tous les rôles
      for (const role of userRoles) {
        if (role.restrictions && role.restrictions.ipWhitelist && role.restrictions.ipWhitelist.length > 0) {
          const isAllowed = role.restrictions.ipWhitelist.some(allowedIP => {
            // Support pour les CIDR et les IP exactes
            if (allowedIP.includes('/')) {
              // TODO: Implémenter la vérification CIDR
              return false;
            }
            return clientIP === allowedIP;
          });

          if (!isAllowed) {
            await logAccessDenied(req, ['ip_restriction'], 'ip_not_allowed');
            return res.status(403).json({
              error: 'Accès non autorisé depuis cette adresse IP',
              code: 'IP_NOT_ALLOWED'
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Erreur dans le middleware de restriction IP:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification des restrictions IP',
        code: 'IP_RESTRICTION_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware combiné pour toutes les vérifications
 */
function fullPermissionCheck(requiredPermissions, options = {}) {
  const middlewares = [];

  // Ajouter les middlewares selon les options
  if (options.checkOrganization) {
    middlewares.push(organizationMiddleware(options.organizationOptions));
  }

  if (options.minimumLevel) {
    middlewares.push(roleLevel(options.minimumLevel));
  }

  if (options.requiredRole) {
    middlewares.push(requireRole(options.requiredRole, options.roleOrganizationId));
  }

  if (options.checkTimeRestrictions) {
    middlewares.push(timeRestriction());
  }

  if (options.checkIPRestrictions) {
    middlewares.push(ipRestriction());
  }

  // Ajouter la vérification des permissions
  middlewares.push(permissionMiddleware(requiredPermissions, options));

  // Retourner un middleware qui exécute tous les middlewares en séquence
  return (req, res, next) => {
    let index = 0;

    function runNext() {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

module.exports = {
  permissionMiddleware,
  organizationMiddleware,
  roleLevel,
  requireRole,
  timeRestriction,
  ipRestriction,
  fullPermissionCheck,
  // Alias pour compatibilité
  permission: permissionMiddleware,
  organization: organizationMiddleware,
  role: requireRole,
  level: roleLevel
};