const mongoose = require('mongoose');
const crypto = require('crypto');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const EncryptionService = require('./encryptionService');
const { RoleService } = require('./roleService');
const Organization = require('../models/Organization');



// Schéma pour les invitations d'organisation
const OrganizationInvitationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  acceptedAt: Date,
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour éviter les invitations en double
OrganizationInvitationSchema.index({ organizationId: 1, email: 1, status: 1 });

// Modèles
const OrganizationInvitation = mongoose.model('OrganizationInvitation', OrganizationInvitationSchema);

class OrganizationService {
  constructor() {
    this.auditService = AuditService;
    this.notificationService = NotificationService;
    this.encryptionService = EncryptionService;
    this.roleService = new RoleService();
  }

  // === GESTION DES ORGANISATIONS ===

  async createOrganization(organizationData, createdBy) {
    try {
      // Générer un slug unique
      const slug = await this.generateUniqueSlug(organizationData.name);
      
      // Créer l'organisation
      const organization = new Organization({
        ...organizationData,
        slug,
        createdBy,
        verificationToken: crypto.randomBytes(32).toString('hex'),
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      });

      await organization.save();

      // Initialiser les rôles par défaut
      await this.roleService.initializeDefaultRoles(organization._id, createdBy);

      // Assigner le rôle d'admin à l'utilisateur créateur
      const adminRole = await this.roleService.getRoles({
        name: 'org_admin',
        organizationId: organization._id
      });

      if (adminRole.length > 0) {
        await this.roleService.assignRole(
          createdBy,
          adminRole[0]._id,
          organization._id,
          createdBy,
          {
            metadata: {
              source: 'organization_creation',
              reason: 'Créateur de l\'organisation'
            }
          }
        );
      }

      await this.auditService.log({
        action: 'organization_created',
        userId: createdBy,
        organizationId: organization._id,
        details: {
          name: organization.name,
          slug: organization.slug,
          plan: organization.subscription.plan
        }
      });

      // Envoyer email de vérification
      await this.sendVerificationEmail(organization);

      return organization;
    } catch (error) {
      throw new Error(`Erreur lors de la création de l'organisation: ${error.message}`);
    }
  }

  async getOrganizations(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        populate = []
      } = options;

      const query = Organization.find(filters)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      if (populate.length > 0) {
        populate.forEach(field => query.populate(field));
      }

      const organizations = await query.exec();
      const total = await Organization.countDocuments(filters);

      return {
        organizations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des organisations: ${error.message}`);
    }
  }

  async getOrganizationById(organizationId) {
    try {
      return await Organization.findById(organizationId)
        .populate('createdBy', 'name email')
        .exec();
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'organisation: ${error.message}`);
    }
  }

  async getOrganizationBySlug(slug) {
    try {
      return await Organization.findOne({ slug, status: 'active' })
        .populate('createdBy', 'name email')
        .exec();
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'organisation: ${error.message}`);
    }
  }

  async updateOrganization(organizationId, updateData, updatedBy) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      // Si le nom change, régénérer le slug
      if (updateData.name && updateData.name !== organization.name) {
        updateData.slug = await this.generateUniqueSlug(updateData.name);
      }

      const updatedOrganization = await Organization.findByIdAndUpdate(
        organizationId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      await this.auditService.log({
        action: 'organization_updated',
        userId: updatedBy,
        organizationId,
        details: {
          changes: updateData
        }
      });

      return updatedOrganization;
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de l'organisation: ${error.message}`);
    }
  }

  async deleteOrganization(organizationId, deletedBy, reason = '') {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      // Archiver au lieu de supprimer
      await Organization.findByIdAndUpdate(organizationId, {
        status: 'archived',
        updatedAt: new Date(),
        'metadata.archiveReason': reason,
        'metadata.archivedBy': deletedBy,
        'metadata.archivedAt': new Date()
      });

      await this.auditService.log({
        action: 'organization_archived',
        userId: deletedBy,
        organizationId,
        details: {
          reason,
          organizationName: organization.name
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'organisation: ${error.message}`);
    }
  }

  // === VÉRIFICATION D'ORGANISATION ===

  async verifyOrganization(token) {
    try {
      const organization = await Organization.findOne({
        verificationToken: token,
        verificationExpires: { $gt: new Date() },
        isVerified: false
      });

      if (!organization) {
        throw new Error('Token de vérification invalide ou expiré');
      }

      await Organization.findByIdAndUpdate(organization._id, {
        isVerified: true,
        status: 'active',
        verificationToken: undefined,
        verificationExpires: undefined,
        updatedAt: new Date()
      });

      await this.auditService.log({
        action: 'organization_verified',
        organizationId: organization._id,
        details: {
          organizationName: organization.name
        }
      });

      return organization;
    } catch (error) {
      throw new Error(`Erreur lors de la vérification: ${error.message}`);
    }
  }

  async sendVerificationEmail(organization) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-organization/${organization.verificationToken}`;
      
      await this.notificationService.sendEmail({
        to: organization.contacts?.primary?.email || organization.createdBy.email,
        subject: 'Vérifiez votre organisation',
        template: 'organization-verification',
        data: {
          organizationName: organization.name,
          verificationUrl,
          expiresAt: organization.verificationExpires
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Erreur lors de l'envoi de l'email de vérification: ${error.message}`);
    }
  }

  // === GESTION DES INVITATIONS ===

  async inviteUser(organizationId, email, roleId, invitedBy, message = '') {
    try {
      // Vérifier que l'organisation existe
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      // Vérifier que le rôle existe
      const role = await this.roleService.getRoleById(roleId);
      if (!role) {
        throw new Error('Rôle non trouvé');
      }

      // Vérifier s'il y a déjà une invitation en attente
      const existingInvitation = await OrganizationInvitation.findOne({
        organizationId,
        email,
        status: 'pending'
      });

      if (existingInvitation) {
        throw new Error('Une invitation est déjà en attente pour cet email');
      }

      // Créer l'invitation
      const invitation = new OrganizationInvitation({
        organizationId,
        email,
        roleId,
        invitedBy,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        message
      });

      await invitation.save();

      // Envoyer l'email d'invitation
      await this.sendInvitationEmail(invitation, organization, role);

      await this.auditService.log({
        action: 'user_invited',
        userId: invitedBy,
        organizationId,
        details: {
          email,
          roleName: role.name,
          invitationId: invitation._id
        }
      });

      return invitation;
    } catch (error) {
      throw new Error(`Erreur lors de l'invitation: ${error.message}`);
    }
  }

  async acceptInvitation(token, userId) {
    try {
      const invitation = await OrganizationInvitation.findOne({
        token,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }).populate('organizationId').populate('roleId');

      if (!invitation) {
        throw new Error('Invitation invalide ou expirée');
      }

      // Assigner le rôle à l'utilisateur
      await this.roleService.assignRole(
        userId,
        invitation.roleId._id,
        invitation.organizationId._id,
        invitation.invitedBy,
        {
          metadata: {
            source: 'invitation',
            invitationId: invitation._id
          }
        }
      );

      // Marquer l'invitation comme acceptée
      await OrganizationInvitation.findByIdAndUpdate(invitation._id, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: userId
      });

      await this.auditService.log({
        action: 'invitation_accepted',
        userId,
        organizationId: invitation.organizationId._id,
        details: {
          invitationId: invitation._id,
          roleName: invitation.roleId.name
        }
      });

      return {
        organization: invitation.organizationId,
        role: invitation.roleId
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'acceptation de l'invitation: ${error.message}`);
    }
  }

  async declineInvitation(token, reason = '') {
    try {
      const invitation = await OrganizationInvitation.findOne({
        token,
        status: 'pending'
      });

      if (!invitation) {
        throw new Error('Invitation non trouvée');
      }

      await OrganizationInvitation.findByIdAndUpdate(invitation._id, {
        status: 'declined',
        'metadata.declineReason': reason,
        'metadata.declinedAt': new Date()
      });

      await this.auditService.log({
        action: 'invitation_declined',
        organizationId: invitation.organizationId,
        details: {
          invitationId: invitation._id,
          email: invitation.email,
          reason
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Erreur lors du refus de l'invitation: ${error.message}`);
    }
  }

  async sendInvitationEmail(invitation, organization, role) {
    try {
      const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation/${invitation.token}`;
      
      await this.notificationService.sendEmail({
        to: invitation.email,
        subject: `Invitation à rejoindre ${organization.name}`,
        template: 'organization-invitation',
        data: {
          organizationName: organization.name,
          roleName: role.displayName,
          invitationUrl,
          message: invitation.message,
          expiresAt: invitation.expiresAt
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Erreur lors de l'envoi de l'invitation: ${error.message}`);
    }
  }

  // === GESTION DES LIMITES ===

  async checkLimit(organizationId, limitType, increment = 1) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const limit = organization.limits[limitType];
      if (!limit) {
        throw new Error('Type de limite invalide');
      }

      const newCurrent = limit.current + increment;
      if (newCurrent > limit.max) {
        return {
          allowed: false,
          current: limit.current,
          max: limit.max,
          remaining: limit.max - limit.current
        };
      }

      return {
        allowed: true,
        current: limit.current,
        max: limit.max,
        remaining: limit.max - newCurrent
      };
    } catch (error) {
      throw new Error(`Erreur lors de la vérification des limites: ${error.message}`);
    }
  }

  async updateLimit(organizationId, limitType, increment = 1) {
    try {
      const updateQuery = {};
      updateQuery[`limits.${limitType}.current`] = increment;

      const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { $inc: updateQuery },
        { new: true }
      );

      return organization.limits[limitType];
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour des limites: ${error.message}`);
    }
  }

  // === MÉTHODES UTILITAIRES ===

  async generateUniqueSlug(name) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async getOrganizationStats(organizationId) {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      // Compter les utilisateurs
      const userCount = await mongoose.model('RoleAssignment').countDocuments({
        organizationId,
        isActive: true
      });

      // Compter les rôles
      const roleCount = await mongoose.model('Role').countDocuments({
        organizationId,
        isActive: true
      });

      // Compter les invitations en attente
      const pendingInvitations = await OrganizationInvitation.countDocuments({
        organizationId,
        status: 'pending'
      });

      return {
        organization,
        stats: {
          users: {
            total: userCount,
            limit: organization.limits.users.max,
            remaining: organization.limits.users.max - userCount
          },
          roles: {
            total: roleCount
          },
          invitations: {
            pending: pendingInvitations
          },
          storage: {
            used: organization.limits.storage.current,
            limit: organization.limits.storage.max,
            remaining: organization.limits.storage.max - organization.limits.storage.current
          },
          apiCalls: {
            used: organization.limits.apiCalls.current,
            limit: organization.limits.apiCalls.max,
            remaining: organization.limits.apiCalls.max - organization.limits.apiCalls.current,
            resetDate: organization.limits.apiCalls.resetDate
          }
        }
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  // === NETTOYAGE ===

  async cleanupExpiredInvitations() {
    try {
      const result = await OrganizationInvitation.updateMany(
        {
          status: 'pending',
          expiresAt: { $lt: new Date() }
        },
        {
          status: 'expired'
        }
      );

      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Erreur lors du nettoyage des invitations: ${error.message}`);
    }
  }
}

module.exports = {
  OrganizationService,
  Organization,
  OrganizationInvitation
};