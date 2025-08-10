const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const EncryptionService = require('./encryptionService');

// Schéma pour les permissions
const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['system', 'organization', 'user', 'billing', 'analytics', 'support', 'api']
  },
  resource: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'manage', 'execute']
  },
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Schéma pour les rôles
const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['system', 'organization', 'custom']
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: function() {
      return this.type === 'organization' || this.type === 'custom';
    }
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  inheritsFrom: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUsers: {
    type: Number,
    default: null
  },
  features: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  restrictions: {
    ipWhitelist: [String],
    timeRestrictions: {
      allowedHours: {
        start: String,
        end: String
      },
      allowedDays: [Number],
      timezone: String
    },
    sessionTimeout: Number,
    mfaRequired: Boolean
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Schéma pour les assignations de rôles
const RoleAssignmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    reason: String,
    notes: String,
    source: {
      type: String,
      enum: ['manual', 'automatic', 'invitation', 'migration'],
      default: 'manual'
    }
  }
});

// Index composé pour éviter les doublons
RoleAssignmentSchema.index({ userId: 1, roleId: 1, organizationId: 1 }, { unique: true });

// Modèles
const Permission = mongoose.model('Permission', PermissionSchema);
const Role = mongoose.model('Role', RoleSchema);
const RoleAssignment = mongoose.model('RoleAssignment', RoleAssignmentSchema);

class RoleService {
  constructor() {
    this.auditService = AuditService;
    this.notificationService = NotificationService;
    this.encryptionService = EncryptionService;
  }

  // === GESTION DES PERMISSIONS ===

  async createPermission(permissionData, createdBy) {
    try {
      const permission = new Permission({
        ...permissionData,
        createdBy
      });

      await permission.save();

      await this.auditService.log({
        action: 'permission_created',
        userId: createdBy,
        details: {
          permissionId: permission._id,
          name: permission.name,
          category: permission.category
        }
      });

      return permission;
    } catch (error) {
      throw new Error(`Erreur lors de la création de la permission: ${error.message}`);
    }
  }

  async getPermissions(filters = {}) {
    try {
      const query = { isActive: true, ...filters };
      return await Permission.find(query).sort({ category: 1, name: 1 });
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des permissions: ${error.message}`);
    }
  }

  async updatePermission(permissionId, updateData, updatedBy) {
    try {
      const permission = await Permission.findByIdAndUpdate(
        permissionId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );

      if (!permission) {
        throw new Error('Permission non trouvée');
      }

      await this.auditService.log({
        action: 'permission_updated',
        userId: updatedBy,
        details: {
          permissionId,
          changes: updateData
        }
      });

      return permission;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de la permission: ${error.message}`);
    }
  }

  // === GESTION DES RÔLES ===

  async createRole(roleData, createdBy) {
    try {
      // Vérifier les permissions
      if (roleData.permissions && roleData.permissions.length > 0) {
        const validPermissions = await Permission.find({
          _id: { $in: roleData.permissions },
          isActive: true
        });

        if (validPermissions.length !== roleData.permissions.length) {
          throw new Error('Certaines permissions sont invalides');
        }
      }

      const role = new Role({
        ...roleData,
        createdBy
      });

      await role.save();

      await this.auditService.log({
        action: 'role_created',
        userId: createdBy,
        organizationId: roleData.organizationId,
        details: {
          roleId: role._id,
          name: role.name,
          type: role.type,
          permissionsCount: roleData.permissions?.length || 0
        }
      });

      return role;
    } catch (error) {
      throw new Error(`Erreur lors de la création du rôle: ${error.message}`);
    }
  }

  async getRoles(filters = {}) {
    try {
      const query = { isActive: true, ...filters };
      return await Role.find(query)
        .populate('permissions')
        .populate('inheritsFrom')
        .populate('createdBy', 'name email')
        .sort({ level: 1, name: 1 });
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des rôles: ${error.message}`);
    }
  }

  async getRoleById(roleId) {
    try {
      return await Role.findById(roleId)
        .populate('permissions')
        .populate('inheritsFrom')
        .populate('createdBy', 'name email');
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du rôle: ${error.message}`);
    }
  }

  async updateRole(roleId, updateData, updatedBy) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('Rôle non trouvé');
      }

      // Vérifier les permissions si mises à jour
      if (updateData.permissions) {
        const validPermissions = await Permission.find({
          _id: { $in: updateData.permissions },
          isActive: true
        });

        if (validPermissions.length !== updateData.permissions.length) {
          throw new Error('Certaines permissions sont invalides');
        }
      }

      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).populate('permissions');

      await this.auditService.log({
        action: 'role_updated',
        userId: updatedBy,
        organizationId: role.organizationId,
        details: {
          roleId,
          changes: updateData
        }
      });

      return updatedRole;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du rôle: ${error.message}`);
    }
  }

  async deleteRole(roleId, deletedBy) {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new Error('Rôle non trouvé');
      }

      // Vérifier s'il y a des utilisateurs assignés
      const assignmentsCount = await RoleAssignment.countDocuments({
        roleId,
        isActive: true
      });

      if (assignmentsCount > 0) {
        throw new Error('Impossible de supprimer un rôle assigné à des utilisateurs');
      }

      await Role.findByIdAndUpdate(roleId, {
        isActive: false,
        updatedAt: new Date()
      });

      await this.auditService.log({
        action: 'role_deleted',
        userId: deletedBy,
        organizationId: role.organizationId,
        details: {
          roleId,
          roleName: role.name
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du rôle: ${error.message}`);
    }
  }

  // === ASSIGNATION DES RÔLES ===

  async assignRole(userId, roleId, organizationId, assignedBy, options = {}) {
    try {
      // Vérifier que le rôle existe et est actif
      const role = await Role.findOne({ _id: roleId, isActive: true });
      if (!role) {
        throw new Error('Rôle non trouvé ou inactif');
      }

      // Vérifier si l'assignation existe déjà
      const existingAssignment = await RoleAssignment.findOne({
        userId,
        roleId,
        organizationId,
        isActive: true
      });

      if (existingAssignment) {
        throw new Error('Rôle déjà assigné à cet utilisateur');
      }

      const assignment = new RoleAssignment({
        userId,
        roleId,
        organizationId,
        assignedBy,
        expiresAt: options.expiresAt,
        conditions: options.conditions,
        metadata: options.metadata
      });

      await assignment.save();

      await this.auditService.log({
        action: 'role_assigned',
        userId: assignedBy,
        targetUserId: userId,
        organizationId,
        details: {
          roleId,
          roleName: role.name,
          expiresAt: options.expiresAt
        }
      });

      // Notification à l'utilisateur
      await this.notificationService.send({
        userId,
        type: 'role_assigned',
        title: 'Nouveau rôle assigné',
        message: `Le rôle "${role.displayName}" vous a été assigné`,
        data: {
          roleId,
          roleName: role.name,
          organizationId
        }
      });

      return assignment;
    } catch (error) {
      throw new Error(`Erreur lors de l'assignation du rôle: ${error.message}`);
    }
  }

  async revokeRole(userId, roleId, organizationId, revokedBy, reason = '') {
    try {
      const assignment = await RoleAssignment.findOne({
        userId,
        roleId,
        organizationId,
        isActive: true
      });

      if (!assignment) {
        throw new Error('Assignation de rôle non trouvée');
      }

      await RoleAssignment.findByIdAndUpdate(assignment._id, {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        'metadata.revokeReason': reason
      });

      const role = await Role.findById(roleId);

      await this.auditService.log({
        action: 'role_revoked',
        userId: revokedBy,
        targetUserId: userId,
        organizationId,
        details: {
          roleId,
          roleName: role?.name,
          reason
        }
      });

      // Notification à l'utilisateur
      await this.notificationService.send({
        userId,
        type: 'role_revoked',
        title: 'Rôle révoqué',
        message: `Le rôle "${role?.displayName}" vous a été retiré`,
        data: {
          roleId,
          roleName: role?.name,
          reason,
          organizationId
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la révocation du rôle: ${error.message}`);
    }
  }

  async getUserRoles(userId, organizationId) {
    try {
      const assignments = await RoleAssignment.find({
        userId,
        organizationId,
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }).populate({
        path: 'roleId',
        populate: {
          path: 'permissions'
        }
      });

      return assignments.map(assignment => assignment.roleId);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des rôles utilisateur: ${error.message}`);
    }
  }

  async getUserPermissions(userId, organizationId) {
    try {
      const roles = await this.getUserRoles(userId, organizationId);
      const permissions = new Set();

      for (const role of roles) {
        if (role.permissions) {
          role.permissions.forEach(permission => {
            if (permission.isActive) {
              permissions.add(permission.name);
            }
          });
        }

        // Hériter des permissions des rôles parents
        if (role.inheritsFrom && role.inheritsFrom.length > 0) {
          for (const parentRoleId of role.inheritsFrom) {
            const parentRole = await Role.findById(parentRoleId).populate('permissions');
            if (parentRole && parentRole.permissions) {
              parentRole.permissions.forEach(permission => {
                if (permission.isActive) {
                  permissions.add(permission.name);
                }
              });
            }
          }
        }
      }

      return Array.from(permissions);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des permissions utilisateur: ${error.message}`);
    }
  }

  // === VÉRIFICATION DES PERMISSIONS ===

  async hasPermission(userId, organizationId, permission, resource = null) {
    try {
      const userPermissions = await this.getUserPermissions(userId, organizationId);
      
      // Vérification directe de la permission
      if (userPermissions.includes(permission)) {
        return true;
      }

      // Vérification avec ressource spécifique
      if (resource) {
        const resourcePermission = `${permission}:${resource}`;
        if (userPermissions.includes(resourcePermission)) {
          return true;
        }
      }

      // Vérification des permissions wildcard
      const wildcardPermission = permission.split(':')[0] + ':*';
      if (userPermissions.includes(wildcardPermission)) {
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Erreur lors de la vérification de permission: ${error.message}`);
    }
  }

  async hasRole(userId, organizationId, roleName) {
    try {
      const roles = await this.getUserRoles(userId, organizationId);
      return roles.some(role => role.name === roleName);
    } catch (error) {
      throw new Error(`Erreur lors de la vérification du rôle: ${error.message}`);
    }
  }

  // === RÔLES PAR DÉFAUT ===

  async initializeDefaultRoles(organizationId, createdBy) {
    try {
      const defaultRoles = [
        {
          name: 'super_admin',
          displayName: 'Super Administrateur',
          description: 'Accès complet à toutes les fonctionnalités système',
          level: 100,
          type: 'system',
          permissions: await this.getAllPermissionIds()
        },
        {
          name: 'org_admin',
          displayName: 'Administrateur Organisation',
          description: 'Gestion complète de l\'organisation',
          level: 90,
          type: 'organization',
          organizationId,
          permissions: await this.getOrganizationPermissionIds()
        },
        {
          name: 'manager',
          displayName: 'Manager',
          description: 'Gestion des équipes et projets',
          level: 70,
          type: 'organization',
          organizationId,
          permissions: await this.getManagerPermissionIds()
        },
        {
          name: 'user',
          displayName: 'Utilisateur',
          description: 'Accès standard aux fonctionnalités',
          level: 50,
          type: 'organization',
          organizationId,
          isDefault: true,
          permissions: await this.getUserPermissionIds()
        },
        {
          name: 'viewer',
          displayName: 'Observateur',
          description: 'Accès en lecture seule',
          level: 30,
          type: 'organization',
          organizationId,
          permissions: await this.getViewerPermissionIds()
        }
      ];

      const createdRoles = [];
      for (const roleData of defaultRoles) {
        const existingRole = await Role.findOne({
          name: roleData.name,
          organizationId: roleData.organizationId || null
        });

        if (!existingRole) {
          const role = await this.createRole(roleData, createdBy);
          createdRoles.push(role);
        }
      }

      return createdRoles;
    } catch (error) {
      throw new Error(`Erreur lors de l'initialisation des rôles par défaut: ${error.message}`);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  async getAllPermissionIds() {
    const permissions = await Permission.find({ isActive: true });
    return permissions.map(p => p._id);
  }

  async getOrganizationPermissionIds() {
    const permissions = await Permission.find({
      isActive: true,
      category: { $in: ['organization', 'user', 'billing', 'analytics'] }
    });
    return permissions.map(p => p._id);
  }

  async getManagerPermissionIds() {
    const permissions = await Permission.find({
      isActive: true,
      category: { $in: ['organization', 'user'] },
      action: { $in: ['read', 'update', 'manage'] }
    });
    return permissions.map(p => p._id);
  }

  async getUserPermissionIds() {
    const permissions = await Permission.find({
      isActive: true,
      category: { $in: ['user'] },
      action: { $in: ['read', 'update'] }
    });
    return permissions.map(p => p._id);
  }

  async getViewerPermissionIds() {
    const permissions = await Permission.find({
      isActive: true,
      action: 'read'
    });
    return permissions.map(p => p._id);
  }

  // === STATISTIQUES ===

  async getRoleStatistics(organizationId = null) {
    try {
      const matchStage = organizationId ? { organizationId } : {};
      
      const stats = await Role.aggregate([
        { $match: { isActive: true, ...matchStage } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            roles: { $push: { name: '$name', displayName: '$displayName' } }
          }
        }
      ]);

      const assignmentStats = await RoleAssignment.aggregate([
        { $match: { isActive: true, ...matchStage } },
        {
          $group: {
            _id: '$roleId',
            userCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'roles',
            localField: '_id',
            foreignField: '_id',
            as: 'role'
          }
        },
        {
          $unwind: '$role'
        },
        {
          $project: {
            roleName: '$role.name',
            roleDisplayName: '$role.displayName',
            userCount: 1
          }
        }
      ]);

      return {
        rolesByType: stats,
        roleAssignments: assignmentStats,
        totalRoles: await Role.countDocuments({ isActive: true, ...matchStage }),
        totalAssignments: await RoleAssignment.countDocuments({ isActive: true, ...matchStage })
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }
}

module.exports = {
  RoleService,
  Permission,
  Role,
  RoleAssignment
};