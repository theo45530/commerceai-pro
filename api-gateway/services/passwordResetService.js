const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const EncryptionService = require('./encryptionService');
const logger = require('../utils/logger');

// Schéma pour les tokens de réinitialisation
const passwordResetTokenSchema = new mongoose.Schema({
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
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'admin'],
    default: 'email'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: Date,
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    requestedBy: String,
    reason: String,
    securityLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Index composé pour optimiser les requêtes
passwordResetTokenSchema.index({ userId: 1, used: 1, expiresAt: 1 });
passwordResetTokenSchema.index({ token: 1, used: 1 });

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

// Schéma pour l'historique des mots de passe
const passwordHistorySchema = new mongoose.Schema({
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
  passwordHash: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    resetMethod: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Index pour nettoyer automatiquement l'historique ancien
passwordHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 an
passwordHistorySchema.index({ userId: 1, createdAt: -1 });

const PasswordHistory = mongoose.model('PasswordHistory', passwordHistorySchema);

class PasswordResetService {
  constructor() {
    this.tokenExpiry = 60 * 60 * 1000; // 1 heure
    this.shortTokenExpiry = 15 * 60 * 1000; // 15 minutes pour SMS
    this.maxDailyRequests = 5;
    this.passwordHistoryLimit = 5; // Nombre de mots de passe précédents à retenir
    this.minPasswordStrength = 8;
  }

  /**
   * Initier une demande de réinitialisation de mot de passe
   * @param {string} email - Email de l'utilisateur
   * @param {string} type - Type de réinitialisation (email, sms)
   * @param {object} requestInfo - Informations sur la requête
   * @returns {Promise<object>} Résultat de la demande
   */
  async initiatePasswordReset(email, type = 'email', requestInfo = {}) {
    try {
      // Rechercher l'utilisateur
      const User = mongoose.model('User');
      const user = await User.findOne({ email }).select('+organizationId');
      
      if (!user) {
        // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
        console.log(`Tentative de réinitialisation pour email inexistant: ${email}`);
        return {
          success: true,
          message: 'Si cet email existe, vous recevrez un lien de réinitialisation.'
        };
      }

      // Vérifier les limites quotidiennes
      const dailyCount = await this.getDailyResetCount(user._id);
      if (dailyCount >= this.maxDailyRequests) {
        throw new Error('Limite quotidienne de demandes de réinitialisation atteinte');
      }

      // Invalider les tokens existants
      await this.invalidateExistingTokens(user._id);

      // Générer un nouveau token
      const token = await this.generateResetToken();
      const expiresAt = new Date(Date.now() + (type === 'sms' ? this.shortTokenExpiry : this.tokenExpiry));

      // Sauvegarder le token
      const resetToken = new PasswordResetToken({
        userId: user._id,
        organizationId: user.organizationId,
        token: await this.hashToken(token),
        type,
        expiresAt,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: {
          requestedBy: requestInfo.requestedBy || 'user',
          reason: requestInfo.reason || 'password_reset',
          securityLevel: this.determineSecurityLevel(user, requestInfo)
        }
      });

      await resetToken.save();

      // Envoyer la notification
      await this.sendResetNotification(user, token, type, resetToken.metadata.securityLevel);

      // Audit log
      await AuditService.log({
        action: 'auth.password_reset_requested',
        category: 'security',
        actorId: user._id,
        organizationId: user.organizationId,
        details: {
          email: user.email,
          type,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
          securityLevel: resetToken.metadata.securityLevel
        },
        riskLevel: resetToken.metadata.securityLevel === 'high' ? 'high' : 'medium'
      });

      console.log(`Demande de réinitialisation initiée pour ${email} (${type})`);

      return {
        success: true,
        message: type === 'email' 
          ? 'Un lien de réinitialisation a été envoyé à votre email.'
          : 'Un code de réinitialisation a été envoyé par SMS.',
        tokenId: resetToken._id,
        expiresAt
      };

    } catch (error) {
      console.error('Erreur initiation réinitialisation:', error);
      throw error;
    }
  }

  /**
   * Vérifier un token de réinitialisation
   * @param {string} token - Token à vérifier
   * @param {object} requestInfo - Informations sur la requête
   * @returns {Promise<object>} Résultat de la vérification
   */
  async verifyResetToken(token, requestInfo = {}) {
    try {
      const hashedToken = await this.hashToken(token);
      
      const resetToken = await PasswordResetToken.findOne({
        token: hashedToken,
        used: false,
        expiresAt: { $gt: new Date() }
      }).populate('userId', 'email organizationId');

      if (!resetToken) {
        throw new Error('Token de réinitialisation invalide ou expiré');
      }

      // Vérifier les tentatives
      if (resetToken.attempts >= resetToken.maxAttempts) {
        throw new Error('Trop de tentatives avec ce token');
      }

      // Incrémenter les tentatives
      resetToken.attempts += 1;
      await resetToken.save();

      // Audit log
      await AuditService.log({
        action: 'auth.password_reset_token_verified',
        category: 'security',
        actorId: resetToken.userId._id,
        organizationId: resetToken.organizationId,
        details: {
          tokenId: resetToken._id,
          type: resetToken.type,
          attempts: resetToken.attempts,
          ipAddress: requestInfo.ipAddress
        },
        riskLevel: 'medium'
      });

      return {
        success: true,
        tokenId: resetToken._id,
        userId: resetToken.userId._id,
        email: resetToken.userId.email,
        type: resetToken.type,
        expiresAt: resetToken.expiresAt
      };

    } catch (error) {
      console.error('Erreur vérification token:', error);
      throw error;
    }
  }

  /**
   * Réinitialiser le mot de passe
   * @param {string} token - Token de réinitialisation
   * @param {string} newPassword - Nouveau mot de passe
   * @param {object} requestInfo - Informations sur la requête
   * @returns {Promise<object>} Résultat de la réinitialisation
   */
  async resetPassword(token, newPassword, requestInfo = {}) {
    try {
      // Vérifier le token
      const tokenData = await this.verifyResetToken(token, requestInfo);
      
      if (!tokenData.success) {
        throw new Error('Token invalide');
      }

      const User = mongoose.model('User');
      const user = await User.findById(tokenData.userId);
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Valider la force du mot de passe
      await this.validatePasswordStrength(newPassword);

      // Vérifier l'historique des mots de passe
      await this.checkPasswordHistory(user._id, newPassword);

      // Sauvegarder l'ancien mot de passe dans l'historique
      if (user.password) {
        await this.savePasswordHistory(user._id, user.organizationId, user.password, {
          resetMethod: tokenData.type,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        });
      }

      // Hacher et sauvegarder le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      
      // Révoquer toutes les sessions actives
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      
      await user.save();

      // Marquer le token comme utilisé
      await PasswordResetToken.findByIdAndUpdate(tokenData.tokenId, {
        used: true,
        usedAt: new Date()
      });

      // Invalider tous les autres tokens de réinitialisation
      await this.invalidateExistingTokens(user._id);

      // Audit log
      await AuditService.log({
        action: 'auth.password_reset_completed',
        category: 'security',
        actorId: user._id,
        organizationId: user.organizationId,
        details: {
          resetMethod: tokenData.type,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
          tokenId: tokenData.tokenId
        },
        riskLevel: 'high'
      });

      // Notification de sécurité
      await NotificationService.sendNotification({
        recipientId: user._id,
        type: 'security',
        title: 'Mot de passe modifié',
        message: 'Votre mot de passe a été modifié avec succès. Si ce n\'était pas vous, contactez immédiatement le support.',
        channels: ['email'],
        metadata: {
          ipAddress: requestInfo.ipAddress,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Mot de passe réinitialisé pour l'utilisateur ${user._id}`);

      return {
        success: true,
        message: 'Mot de passe réinitialisé avec succès'
      };

    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      throw error;
    }
  }

  /**
   * Changer le mot de passe (utilisateur connecté)
   * @param {string} userId - ID de l'utilisateur
   * @param {string} currentPassword - Mot de passe actuel
   * @param {string} newPassword - Nouveau mot de passe
   * @param {object} requestInfo - Informations sur la requête
   * @returns {Promise<object>} Résultat du changement
   */
  async changePassword(userId, currentPassword, newPassword, requestInfo = {}) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('+password +organizationId');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier le mot de passe actuel
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Valider la force du nouveau mot de passe
      await this.validatePasswordStrength(newPassword);

      // Vérifier l'historique des mots de passe
      await this.checkPasswordHistory(userId, newPassword);

      // Sauvegarder l'ancien mot de passe dans l'historique
      await this.savePasswordHistory(userId, user.organizationId, user.password, {
        resetMethod: 'user_change',
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent
      });

      // Hacher et sauvegarder le nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      user.passwordChangedAt = new Date();
      
      await user.save();

      // Audit log
      await AuditService.log({
        action: 'auth.password_changed',
        category: 'security',
        actorId: userId,
        organizationId: user.organizationId,
        details: {
          method: 'user_initiated',
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent
        },
        riskLevel: 'medium'
      });

      // Notification de sécurité
      await NotificationService.sendNotification({
        recipientId: userId,
        type: 'security',
        title: 'Mot de passe modifié',
        message: 'Votre mot de passe a été modifié avec succès.',
        channels: ['email']
      });

      console.log(`Mot de passe changé pour l'utilisateur ${userId}`);

      return {
        success: true,
        message: 'Mot de passe modifié avec succès'
      };

    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      throw error;
    }
  }

  // Méthodes utilitaires

  async generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async getDailyResetCount(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return await PasswordResetToken.countDocuments({
      userId,
      createdAt: { $gte: startOfDay }
    });
  }

  async invalidateExistingTokens(userId) {
    await PasswordResetToken.updateMany(
      { userId, used: false },
      { used: true, usedAt: new Date() }
    );
  }

  determineSecurityLevel(user, requestInfo) {
    // Logique pour déterminer le niveau de sécurité
    // Basé sur l'historique de l'utilisateur, l'IP, etc.
    return 'medium'; // Simplifié pour l'exemple
  }

  async sendResetNotification(user, token, type, securityLevel) {
    try {
      if (type === 'email') {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        
        await NotificationService.sendNotification({
          recipientId: user._id,
          type: 'password_reset',
          title: 'Réinitialisation de mot de passe',
          message: `Cliquez sur le lien pour réinitialiser votre mot de passe: ${resetLink}`,
          channels: ['email'],
          metadata: {
            resetLink,
            securityLevel,
            expiresIn: '1 heure'
          }
        });
      } else if (type === 'sms') {
        // Logique d'envoi SMS
        console.log(`SMS de réinitialisation envoyé à l'utilisateur ${user._id}`);
      }
    } catch (error) {
      console.error('Erreur envoi notification réinitialisation:', error);
      throw error;
    }
  }

  async validatePasswordStrength(password) {
    if (password.length < this.minPasswordStrength) {
      throw new Error(`Le mot de passe doit contenir au moins ${this.minPasswordStrength} caractères`);
    }

    // Vérifications supplémentaires
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial');
    }

    // Vérifier contre les mots de passe communs
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Ce mot de passe est trop commun');
    }
  }

  async checkPasswordHistory(userId, newPassword) {
    const recentPasswords = await PasswordHistory
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(this.passwordHistoryLimit)
      .select('passwordHash');

    for (const oldPassword of recentPasswords) {
      const isSame = await bcrypt.compare(newPassword, oldPassword.passwordHash);
      if (isSame) {
        throw new Error('Vous ne pouvez pas réutiliser un de vos derniers mots de passe');
      }
    }
  }

  async savePasswordHistory(userId, organizationId, passwordHash, metadata = {}) {
    const historyEntry = new PasswordHistory({
      userId,
      organizationId,
      passwordHash,
      metadata
    });

    await historyEntry.save();

    // Nettoyer l'historique ancien
    await this.cleanupPasswordHistory(userId);
  }

  async cleanupPasswordHistory(userId) {
    const oldEntries = await PasswordHistory
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(this.passwordHistoryLimit);

    if (oldEntries.length > 0) {
      const idsToDelete = oldEntries.map(entry => entry._id);
      await PasswordHistory.deleteMany({ _id: { $in: idsToDelete } });
    }
  }

  /**
   * Obtenir les statistiques de réinitialisation
   * @param {string} organizationId - ID de l'organisation (optionnel)
   * @returns {Promise<object>} Statistiques
   */
  async getResetStatistics(organizationId = null) {
    try {
      const matchStage = organizationId ? { organizationId: new mongoose.Types.ObjectId(organizationId) } : {};
      
      const stats = await PasswordResetToken.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            successfulResets: { $sum: { $cond: ['$used', 1, 0] } },
            expiredTokens: {
              $sum: {
                $cond: [
                  { $and: [{ $not: '$used' }, { $lt: ['$expiresAt', new Date()] }] },
                  1,
                  0
                ]
              }
            },
            averageAttemptsPerToken: { $avg: '$attempts' }
          }
        }
      ]);

      const result = stats[0] || {
        totalRequests: 0,
        successfulResets: 0,
        expiredTokens: 0,
        averageAttemptsPerToken: 0
      };

      result.successRate = result.totalRequests > 0 
        ? (result.successfulResets / result.totalRequests * 100).toFixed(2)
        : 0;

      return result;

    } catch (error) {
      console.error('Erreur récupération statistiques réinitialisation:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les tokens expirés
   * @returns {Promise<number>} Nombre de tokens supprimés
   */
  async cleanupExpiredTokens() {
    try {
      const result = await PasswordResetToken.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { used: true, usedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // 7 jours
        ]
      });

      console.log(`${result.deletedCount} tokens de réinitialisation nettoyés`);
      return result.deletedCount;

    } catch (error) {
      console.error('Erreur nettoyage tokens:', error);
      throw error;
    }
  }
}

module.exports = new PasswordResetService();