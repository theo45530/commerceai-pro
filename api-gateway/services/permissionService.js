const User = require('../models/User');
const Organization = require('../models/Organization');
const logger = require('../../logging/logger-config');

// Define all available permissions
const PERMISSIONS = {
  // User Management
  'users.read': 'View users',
  'users.create': 'Create users',
  'users.update': 'Update users',
  'users.delete': 'Delete users',
  'users.invite': 'Invite users',
  'users.manage_roles': 'Manage user roles',

  // Organization Management
  'organization.read': 'View organization details',
  'organization.update': 'Update organization settings',
  'organization.delete': 'Delete organization',
  'organization.billing': 'Manage billing and subscriptions',
  'organization.settings': 'Manage organization settings',

  // AI Agents
  'agents.read': 'View AI agents',
  'agents.create': 'Create AI agents',
  'agents.update': 'Update AI agents',
  'agents.delete': 'Delete AI agents',
  'agents.execute': 'Execute AI agents',
  'agents.configure': 'Configure AI agent settings',

  // Analytics & Reports
  'analytics.read': 'View analytics',
  'analytics.export': 'Export analytics data',
  'analytics.advanced': 'Access advanced analytics',

  // Platform Connections
  'platforms.read': 'View platform connections',
  'platforms.create': 'Create platform connections',
  'platforms.update': 'Update platform connections',
  'platforms.delete': 'Delete platform connections',

  // API Access
  'api.read': 'Read API access',
  'api.write': 'Write API access',
  'api.admin': 'Admin API access',

  // Support & Tickets
  'support.read': 'View support tickets',
  'support.create': 'Create support tickets',
  'support.respond': 'Respond to support tickets',
  'support.admin': 'Admin support access',

  // System Administration
  'system.logs': 'View system logs',
  'system.monitoring': 'Access monitoring tools',
  'system.maintenance': 'Perform system maintenance',
  'system.backup': 'Manage backups'
};

// Define role-based permission sets
const ROLE_PERMISSIONS = {
  // Organization roles
  owner: [
    // Full access to everything in the organization
    ...Object.keys(PERMISSIONS)
  ],
  
  admin: [
    // User management
    'users.read', 'users.create', 'users.update', 'users.invite', 'users.manage_roles',
    // Organization (except delete)
    'organization.read', 'organization.update', 'organization.billing', 'organization.settings',
    // AI Agents
    'agents.read', 'agents.create', 'agents.update', 'agents.delete', 'agents.execute', 'agents.configure',
    // Analytics
    'analytics.read', 'analytics.export', 'analytics.advanced',
    // Platforms
    'platforms.read', 'platforms.create', 'platforms.update', 'platforms.delete',
    // API
    'api.read', 'api.write',
    // Support
    'support.read', 'support.create', 'support.respond'
  ],
  
  member: [
    // Basic user access
    'users.read',
    // Organization read-only
    'organization.read',
    // AI Agents (limited)
    'agents.read', 'agents.execute',
    // Analytics (basic)
    'analytics.read',
    // Platforms (read and own connections)
    'platforms.read', 'platforms.create', 'platforms.update',
    // API (read only)
    'api.read',
    // Support
    'support.read', 'support.create'
  ],
  
  viewer: [
    // Read-only access
    'users.read',
    'organization.read',
    'agents.read',
    'analytics.read',
    'platforms.read',
    'support.read'
  ],

  // System roles
  super_admin: [
    // Full system access
    ...Object.keys(PERMISSIONS)
  ]
};

class PermissionService {
  /**
   * Get all available permissions
   * @returns {object} All permissions with descriptions
   */
  getAllPermissions() {
    return PERMISSIONS;
  }

  /**
   * Get permissions for a specific role
   * @param {string} role - Role name
   * @returns {Array} Array of permissions
   */
  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if user has specific permission
   * @param {string} userId - User ID
   * @param {string} permission - Permission to check
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<boolean>} Permission status
   */
  async hasPermission(userId, permission, organizationId = null) {
    try {
      const user = await User.findById(userId).populate('organizationId');
      if (!user) {
        return false;
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return true;
      }

      // Check organization-specific permissions
      if (organizationId && user.organizationId) {
        if (user.organizationId._id.toString() !== organizationId) {
          return false; // User not in this organization
        }

        const orgRole = user.organizationRole;
        const rolePermissions = this.getRolePermissions(orgRole);
        return rolePermissions.includes(permission);
      }

      // Check user's custom permissions
      if (user.permissions && user.permissions.includes(permission)) {
        return true;
      }

      // Check role-based permissions
      const rolePermissions = this.getRolePermissions(user.role);
      return rolePermissions.includes(permission);
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   * @param {string} userId - User ID
   * @param {Array} permissions - Array of permissions to check
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<boolean>} Permission status
   */
  async hasAnyPermission(userId, permissions, organizationId = null) {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission, organizationId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all specified permissions
   * @param {string} userId - User ID
   * @param {Array} permissions - Array of permissions to check
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<boolean>} Permission status
   */
  async hasAllPermissions(userId, permissions, organizationId = null) {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission, organizationId))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get user's effective permissions
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (optional)
   * @returns {Promise<Array>} Array of permissions
   */
  async getUserPermissions(userId, organizationId = null) {
    try {
      const user = await User.findById(userId).populate('organizationId');
      if (!user) {
        return [];
      }

      let permissions = new Set();

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return Object.keys(PERMISSIONS);
      }

      // Add role-based permissions
      if (organizationId && user.organizationId && user.organizationId._id.toString() === organizationId) {
        const orgRole = user.organizationRole;
        const rolePermissions = this.getRolePermissions(orgRole);
        rolePermissions.forEach(p => permissions.add(p));
      } else {
        const rolePermissions = this.getRolePermissions(user.role);
        rolePermissions.forEach(p => permissions.add(p));
      }

      // Add custom permissions
      if (user.permissions) {
        user.permissions.forEach(p => permissions.add(p));
      }

      return Array.from(permissions);
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Grant permission to user
   * @param {string} userId - User ID
   * @param {string} permission - Permission to grant
   * @returns {Promise<boolean>} Success status
   */
  async grantPermission(userId, permission) {
    try {
      if (!PERMISSIONS[permission]) {
        throw new Error('Invalid permission');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.permissions) {
        user.permissions = [];
      }

      if (!user.permissions.includes(permission)) {
        user.permissions.push(permission);
        await user.save();
        logger.info(`Permission ${permission} granted to user ${userId}`);
      }

      return true;
    } catch (error) {
      logger.error('Error granting permission:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from user
   * @param {string} userId - User ID
   * @param {string} permission - Permission to revoke
   * @returns {Promise<boolean>} Success status
   */
  async revokePermission(userId, permission) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.permissions && user.permissions.includes(permission)) {
        user.permissions = user.permissions.filter(p => p !== permission);
        await user.save();
        logger.info(`Permission ${permission} revoked from user ${userId}`);
      }

      return true;
    } catch (error) {
      logger.error('Error revoking permission:', error);
      throw error;
    }
  }

  /**
   * Update user role in organization
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {string} newRole - New role
   * @returns {Promise<boolean>} Success status
   */
  async updateUserRole(userId, organizationId, newRole) {
    try {
      if (!ROLE_PERMISSIONS[newRole]) {
        throw new Error('Invalid role');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.organizationId.toString() !== organizationId) {
        throw new Error('User not in this organization');
      }

      user.organizationRole = newRole;
      await user.save();

      logger.info(`User ${userId} role updated to ${newRole} in organization ${organizationId}`);
      return true;
    } catch (error) {
      logger.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Check if user can perform action on resource
   * @param {string} userId - User ID
   * @param {string} action - Action to perform
   * @param {string} resource - Resource type
   * @param {object} resourceData - Resource data (optional)
   * @returns {Promise<boolean>} Permission status
   */
  async canPerformAction(userId, action, resource, resourceData = null) {
    try {
      const permission = `${resource}.${action}`;
      
      // Check basic permission
      const hasBasicPermission = await this.hasPermission(userId, permission, resourceData?.organizationId);
      if (!hasBasicPermission) {
        return false;
      }

      // Additional resource-specific checks
      if (resourceData) {
        const user = await User.findById(userId);
        
        // Users can always manage their own resources
        if (resourceData.ownerId && resourceData.ownerId.toString() === userId) {
          return true;
        }

        // Organization-specific checks
        if (resourceData.organizationId && user.organizationId) {
          if (user.organizationId.toString() !== resourceData.organizationId.toString()) {
            return false; // Cross-organization access denied
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking action permission:', error);
      return false;
    }
  }
}

module.exports = new PermissionService();