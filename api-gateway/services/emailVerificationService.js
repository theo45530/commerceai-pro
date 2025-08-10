const crypto = require('crypto');
const mongoose = require('mongoose');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const logger = require('../utils/logger');

// Schéma pour les tokens de vérification d'email
const emailVerificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['registration', 'email_change', 'reactivation'],
    default: 'registration'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    previousEmail: String, // Pour les changements d'email
    source: String, // registration, admin, user_request
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    }
  }
}, {
  timestamps: true
});

// Index composé pour optimiser les requêtes
emailVerificationTokenSchema.index({ userId: 1, verified: 1, expiresAt: 1 });
emailVerificationTokenSchema.index({ email: 1, verified: 1 });
emailVerificationTokenSchema.index({ token: 1, verified: 1 });

const EmailVerificationToken = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);

// Schéma pour l'historique des emails
const emailHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  oldEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  newEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  changeReason: {
    type: String,
    enum: ['user_request', 'admin_change', 'security_update', 'data_correction'],
    default: 'user_request'
  },
  verificationMethod: {
    type: String,
    enum: ['email_token', 'admin_override', 'support_ticket'],
    default: 'email_token'
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

emailHistorySchema.index({ userId: 1, createdAt: -1 });
emailHistorySchema.index({ oldEmail: 1 });
emailHistorySchema.index({ newEmail: 1 });

const EmailHistory = mongoose.model('EmailHistory', emailHistorySchema);

class EmailVerificationService {
  constructor() {
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 heures
    this.shortTokenExpiry = 60 * 60 * 1000; // 1 heure pour les changements d'email
    this.maxDailyVerifications = 10;
    this.resendCooldown = 5 * 60 * 1000; // 5 minutes entre les renvois
  }

  /**
   * Envoyer un email de vérification
   * @param {string} userId - ID de l'utilisateur
   * @param {string} email - Email à vérifier
   * @param {string} type - Type de vérification
   * @param {object} options - Options supplémentaires
   * @returns {Promise<object>} Résultat de l'envoi
   */
  async sendVerificationEmail(userId, email, type = 'registration', options = {}) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('organizationId email emailVerified');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier les limites quotidiennes
      const dailyCount = await this.getDailyVerificationCount(userId);
      if (dailyCount >= this.maxDailyVerifications) {
        throw new Error('Limite quotidienne de vérifications atteinte');
      }

      // Vérifier le cooldown pour les renvois
      if (await this.isInCooldown(userId, email)) {
        throw new Error('Veuillez attendre avant de demander un nouveau code');
      }

      // Invalider les tokens existants pour cet email
      await this.invalidateExistingTokens(userId, email);

      // Générer un nouveau token
      const token = await this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + 
        (type === 'email_change' ? this.shortTokenExpiry : this.tokenExpiry)
      );

      // Créer le token de vérification
      const verificationToken = new EmailVerificationToken({
        userId,
        organizationId: user.organizationId,
        email: email.toLowerCase(),
        token: await this.hashToken(token),
        type,
        expiresAt,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: {
          previousEmail: type === 'email_change' ? user.email : undefined,
          source: options.source || 'user_request',
          priority: options.priority || 'normal'
        }
      });

      await verificationToken.save();

      // Envoyer l'email de vérification
      await this.sendVerificationNotification(user, email, token, type, options);

      // Audit log
      await AuditService.log({
        action: 'auth.email_verification_sent',
        category: 'security',
        actorId: userId,
        organizationId: user.organizationId,
        details: {
          email,
          type,
          source: options.source,
          ipAddress: options.ipAddress
        },
        riskLevel: type === 'email_change' ? 'medium' : 'low'
      });

      console.log(`Email de vérification envoyé à ${email} pour l'utilisateur ${userId}`);

      return {
        success: true,
        message: 'Email de vérification envoyé',
        tokenId: verificationToken._id,
        expiresAt,
        type
      };

    } catch (error) {
      console.error('Erreur envoi email de vérification:', error);
      throw error;
    }
  }

  /**
   * Vérifier un token d'email
   * @param {string} token - Token à vérifier
   * @param {object} options - Options de vérification
   * @returns {Promise<object>} Résultat de la vérification
   */
  async verifyEmailToken(token, options = {}) {
    try {
      const hashedToken = await this.hashToken(token);
      
      const verificationToken = await EmailVerificationToken.findOne({
        token: hashedToken,
        verified: false,
        expiresAt: { $gt: new Date() }
      }).populate('userId', 'email emailVerified organizationId');

      if (!verificationToken) {
        throw new Error('Token de vérification invalide ou expiré');
      }

      // Vérifier les tentatives
      if (verificationToken.attempts >= verificationToken.maxAttempts) {
        throw new Error('Trop de tentatives avec ce token');
      }

      // Incrémenter les tentatives
      verificationToken.attempts += 1;
      await verificationToken.save();

      // Marquer comme vérifié
      verificationToken.verified = true;
      verificationToken.verifiedAt = new Date();
      await verificationToken.save();

      // Mettre à jour l'utilisateur
      const User = mongoose.model('User');
      const updateData = {};

      if (verificationToken.type === 'registration' || verificationToken.type === 'reactivation') {
        updateData.emailVerified = true;
        updateData.emailVerifiedAt = new Date();
      } else if (verificationToken.type === 'email_change') {
        // Sauvegarder l'historique du changement d'email
        await this.saveEmailHistory(
          verificationToken.userId._id,
          verificationToken.organizationId,
          verificationToken.metadata.previousEmail,
          verificationToken.email,
          'user_request',
          'email_token',
          verificationToken.userId._id,
          options
        );

        updateData.email = verificationToken.email;
        updateData.emailVerified = true;
        updateData.emailVerifiedAt = new Date();
      }

      await User.findByIdAndUpdate(verificationToken.userId._id, updateData);

      // Invalider les autres tokens pour cet utilisateur
      await this.invalidateExistingTokens(verificationToken.userId._id, verificationToken.email);

      // Audit log
      await AuditService.log({
        action: 'auth.email_verified',
        category: 'security',
        actorId: verificationToken.userId._id,
        organizationId: verificationToken.organizationId,
        details: {
          email: verificationToken.email,
          type: verificationToken.type,
          tokenId: verificationToken._id,
          attempts: verificationToken.attempts,
          ipAddress: options.ipAddress
        },
        riskLevel: 'low'
      });

      // Notification de succès
      await NotificationService.sendNotification({
        recipientId: verificationToken.userId._id,
        type: 'success',
        title: 'Email vérifié',
        message: verificationToken.type === 'email_change' 
          ? 'Votre nouvel email a été vérifié avec succès.'
          : 'Votre email a été vérifié avec succès.',
        channels: ['email'],
        metadata: {
          verificationDate: new Date().toISOString()
        }
      });

      console.log(`Email vérifié pour l'utilisateur ${verificationToken.userId._id}`);

      return {
        success: true,
        message: 'Email vérifié avec succès',
        userId: verificationToken.userId._id,
        email: verificationToken.email,
        type: verificationToken.type
      };

    } catch (error) {
      console.error('Erreur vérification email:', error);
      throw error;
    }
  }

  /**
   * Renvoyer un email de vérification
   * @param {string} userId - ID de l'utilisateur
   * @param {object} options - Options de renvoi
   * @returns {Promise<object>} Résultat du renvoi
   */
  async resendVerificationEmail(userId, options = {}) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('email emailVerified');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.emailVerified) {
        throw new Error('Email déjà vérifié');
      }

      // Vérifier le cooldown
      if (await this.isInCooldown(userId, user.email)) {
        throw new Error('Veuillez attendre avant de demander un nouveau code');
      }

      return await this.sendVerificationEmail(userId, user.email, 'registration', {
        ...options,
        source: 'resend_request'
      });

    } catch (error) {
      console.error('Erreur renvoi email de vérification:', error);
      throw error;
    }
  }

  /**
   * Initier un changement d'email
   * @param {string} userId - ID de l'utilisateur
   * @param {string} newEmail - Nouvel email
   * @param {object} options - Options du changement
   * @returns {Promise<object>} Résultat de l'initiation
   */
  async initiateEmailChange(userId, newEmail, options = {}) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('email organizationId');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.email === newEmail.toLowerCase()) {
        throw new Error('Le nouvel email est identique à l\'actuel');
      }

      // Vérifier si le nouvel email est déjà utilisé
      const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
      if (existingUser) {
        throw new Error('Cet email est déjà utilisé par un autre compte');
      }

      return await this.sendVerificationEmail(userId, newEmail, 'email_change', {
        ...options,
        source: 'email_change_request',
        priority: 'high'
      });

    } catch (error) {
      console.error('Erreur initiation changement email:', error);
      throw error;
    }
  }

  /**
   * Vérifier le statut de vérification d'un email
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<object>} Statut de vérification
   */
  async getVerificationStatus(userId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('email emailVerified emailVerifiedAt');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Chercher les tokens en attente
      const pendingTokens = await EmailVerificationToken.find({
        userId,
        verified: false,
        expiresAt: { $gt: new Date() }
      }).select('email type expiresAt createdAt');

      return {
        email: user.email,
        isVerified: user.emailVerified,
        verifiedAt: user.emailVerifiedAt,
        pendingVerifications: pendingTokens.map(token => ({
          email: token.email,
          type: token.type,
          expiresAt: token.expiresAt,
          sentAt: token.createdAt
        }))
      };

    } catch (error) {
      console.error('Erreur récupération statut vérification:', error);
      throw error;
    }
  }

  // Méthodes utilitaires

  async generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async getDailyVerificationCount(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return await EmailVerificationToken.countDocuments({
      userId,
      createdAt: { $gte: startOfDay }
    });
  }

  async isInCooldown(userId, email) {
    const cooldownTime = new Date(Date.now() - this.resendCooldown);
    
    const recentToken = await EmailVerificationToken.findOne({
      userId,
      email,
      createdAt: { $gt: cooldownTime }
    });

    return !!recentToken;
  }

  async invalidateExistingTokens(userId, email) {
    await EmailVerificationToken.updateMany(
      { 
        userId, 
        email: email.toLowerCase(),
        verified: false 
      },
      { 
        verified: true, 
        verifiedAt: new Date(),
        metadata: { invalidatedReason: 'new_token_generated' }
      }
    );
  }

  async sendVerificationNotification(user, email, token, type, options = {}) {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      let title, message;
      
      switch (type) {
        case 'registration':
          title = 'Vérifiez votre email';
          message = `Bienvenue ! Cliquez sur le lien pour vérifier votre email: ${verificationLink}`;
          break;
        case 'email_change':
          title = 'Vérifiez votre nouvel email';
          message = `Cliquez sur le lien pour confirmer votre nouvel email: ${verificationLink}`;
          break;
        case 'reactivation':
          title = 'Réactivez votre compte';
          message = `Cliquez sur le lien pour réactiver votre compte: ${verificationLink}`;
          break;
        default:
          title = 'Vérification d\'email';
          message = `Cliquez sur le lien pour vérifier votre email: ${verificationLink}`;
      }

      await NotificationService.sendNotification({
        recipientId: user._id,
        type: 'email_verification',
        title,
        message,
        channels: ['email'],
        metadata: {
          verificationLink,
          verificationType: type,
          targetEmail: email,
          expiresIn: type === 'email_change' ? '1 heure' : '24 heures'
        }
      });

    } catch (error) {
      console.error('Erreur envoi notification vérification:', error);
      throw error;
    }
  }

  async saveEmailHistory(userId, organizationId, oldEmail, newEmail, changeReason, verificationMethod, changedBy, options = {}) {
    try {
      const historyEntry = new EmailHistory({
        userId,
        organizationId,
        oldEmail,
        newEmail,
        changeReason,
        verificationMethod,
        changedBy,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      });

      await historyEntry.save();
      console.log(`Historique email sauvegardé pour l'utilisateur ${userId}`);

    } catch (error) {
      console.error('Erreur sauvegarde historique email:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des changements d'email
   * @param {string} userId - ID de l'utilisateur
   * @param {number} limit - Limite de résultats
   * @returns {Promise<Array>} Historique des changements
   */
  async getEmailHistory(userId, limit = 10) {
    try {
      const history = await EmailHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('changedBy', 'email name')
        .select('-__v');

      return history;

    } catch (error) {
      console.error('Erreur récupération historique email:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de vérification
   * @param {string} organizationId - ID de l'organisation (optionnel)
   * @returns {Promise<object>} Statistiques
   */
  async getVerificationStatistics(organizationId = null) {
    try {
      const matchStage = organizationId ? { organizationId: new mongoose.Types.ObjectId(organizationId) } : {};
      
      const stats = await EmailVerificationToken.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTokens: { $sum: 1 },
            verifiedTokens: { $sum: { $cond: ['$verified', 1, 0] } },
            expiredTokens: {
              $sum: {
                $cond: [
                  { $and: [{ $not: '$verified' }, { $lt: ['$expiresAt', new Date()] }] },
                  1,
                  0
                ]
              }
            },
            averageAttempts: { $avg: '$attempts' }
          }
        }
      ]);

      const result = stats[0] || {
        totalTokens: 0,
        verifiedTokens: 0,
        expiredTokens: 0,
        averageAttempts: 0
      };

      result.verificationRate = result.totalTokens > 0 
        ? (result.verifiedTokens / result.totalTokens * 100).toFixed(2)
        : 0;

      return result;

    } catch (error) {
      console.error('Erreur récupération statistiques vérification:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les tokens expirés
   * @returns {Promise<number>} Nombre de tokens supprimés
   */
  async cleanupExpiredTokens() {
    try {
      const result = await EmailVerificationToken.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { verified: true, verifiedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 jours
        ]
      });

      console.log(`${result.deletedCount} tokens de vérification email nettoyés`);
      return result.deletedCount;

    } catch (error) {
      console.error('Erreur nettoyage tokens email:', error);
      throw error;
    }
  }

  /**
   * Forcer la vérification d'un email (admin)
   * @param {string} userId - ID de l'utilisateur
   * @param {string} adminId - ID de l'administrateur
   * @param {string} reason - Raison de la vérification forcée
   * @returns {Promise<object>} Résultat de la vérification
   */
  async forceEmailVerification(userId, adminId, reason) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('email organizationId emailVerified');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.emailVerified) {
        throw new Error('Email déjà vérifié');
      }

      // Mettre à jour l'utilisateur
      await User.findByIdAndUpdate(userId, {
        emailVerified: true,
        emailVerifiedAt: new Date()
      });

      // Invalider tous les tokens en attente
      await EmailVerificationToken.updateMany(
        { userId, verified: false },
        { 
          verified: true, 
          verifiedAt: new Date(),
          metadata: { 
            verificationMethod: 'admin_override',
            adminId,
            reason
          }
        }
      );

      // Audit log
      await AuditService.log({
        action: 'auth.email_verification_forced',
        category: 'security',
        actorId: adminId,
        targetId: userId,
        organizationId: user.organizationId,
        details: {
          email: user.email,
          reason,
          method: 'admin_override'
        },
        riskLevel: 'medium'
      });

      console.log(`Email vérifié de force pour l'utilisateur ${userId} par l'admin ${adminId}`);

      return {
        success: true,
        message: 'Email vérifié avec succès'
      };

    } catch (error) {
      console.error('Erreur vérification forcée email:', error);
      throw error;
    }
  }
}

module.exports = new EmailVerificationService();