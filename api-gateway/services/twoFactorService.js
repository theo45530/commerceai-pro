const mongoose = require('mongoose');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const EncryptionService = require('./encryptionService');
const logger = require('../../logging/logger-config');

// Schema pour les configurations 2FA
const TwoFactorConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  method: {
    type: String,
    enum: ['totp', 'sms', 'email', 'backup_codes'],
    default: 'totp'
  },
  // Configuration TOTP (Google Authenticator, Authy, etc.)
  totp: {
    secret: String, // Chiffré
    backupSecret: String, // Chiffré
    qrCodeUrl: String,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date
  },
  // Configuration SMS
  sms: {
    phoneNumber: String, // Chiffré
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    lastSentAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  // Codes de récupération
  backupCodes: [{
    code: String, // Haché
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date,
    usedFrom: String // IP address
  }],
  // Appareils de confiance
  trustedDevices: [{
    deviceId: String,
    deviceName: String,
    userAgent: String,
    ipAddress: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    lastUsedAt: Date,
    expiresAt: Date
  }],
  // Statistiques et sécurité
  stats: {
    totalVerifications: {
      type: Number,
      default: 0
    },
    failedAttempts: {
      type: Number,
      default: 0
    },
    lastVerificationAt: Date,
    lastFailedAt: Date
  },
  // Configuration de sécurité
  security: {
    maxFailedAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 15 * 60 * 1000 // 15 minutes
    },
    lockedUntil: Date,
    requireForLogin: {
      type: Boolean,
      default: true
    },
    requireForSensitiveActions: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Schema pour les codes de vérification temporaires
const VerificationCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  method: {
    type: String,
    enum: ['sms', 'email'],
    required: true
  },
  purpose: {
    type: String,
    enum: ['setup', 'login', 'verification', 'recovery'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: Date,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

const TwoFactorConfig = mongoose.model('TwoFactorConfig', TwoFactorConfigSchema);
const VerificationCode = mongoose.model('VerificationCode', VerificationCodeSchema);

class TwoFactorService {
  constructor() {
    this.codeLength = 6;
    this.codeExpiry = 5 * 60 * 1000; // 5 minutes
    this.backupCodesCount = 10;
    this.trustedDeviceExpiry = 30 * 24 * 60 * 60 * 1000; // 30 jours
  }

  // Configuration initiale 2FA

  async setupTOTP(userId, organizationId, options = {}) {
    const { serviceName = 'Ekko AI', accountName } = options;

    try {
      // Vérifier si 2FA est déjà configuré
      let config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        config = new TwoFactorConfig({
          userId,
          organizationId,
          method: 'totp'
        });
      }

      // Générer un nouveau secret TOTP
      const secret = speakeasy.generateSecret({
        name: accountName || `${serviceName} (${userId})`,
        issuer: serviceName,
        length: 32
      });

      // Chiffrer le secret
      const encryptedSecret = await EncryptionService.encrypt(secret.base32, 'totp_secret');
      
      // Générer le QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Sauvegarder la configuration
      config.totp = {
        secret: encryptedSecret,
        qrCodeUrl,
        verified: false
      };
      config.isEnabled = false; // Sera activé après vérification

      await config.save();

      // Audit log
      await AuditService.log({
        action: 'auth.2fa_setup_initiated',
        category: 'security',
        actorId: userId,
        organizationId,
        details: {
          method: 'totp'
        },
        riskLevel: 'medium'
      });

      console.log(`Configuration TOTP initiée pour l'utilisateur ${userId}`);
      
      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: await this.generateBackupCodes(config._id)
      };

    } catch (error) {
      console.error('Erreur configuration TOTP:', error);
      throw error;
    }
  }

  /**
   * Generate 2FA secret and QR code for user (legacy method for compatibility)
   * @param {string} userId - User ID
   * @param {string} userEmail - User email
   * @returns {Promise<object>} Secret and QR code data
   */
  async generateSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `CommerceAI Pro (${userEmail})`,
        issuer: 'CommerceAI Pro',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodesLegacy();

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes
      };
    } catch (error) {
      logger.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify 2FA token (legacy method for compatibility)
   * @param {string} secret - User's 2FA secret
   * @param {string} token - Token to verify
   * @param {number} window - Time window for verification (default: 2)
   * @returns {boolean} Verification result
   */
  verifyToken(secret, token, window = 2) {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window
      });
    } catch (error) {
      logger.error('Error verifying 2FA token:', error);
      return false;
    }
  }

  // Vérification 2FA avancée

  async verifyTOTP(userId, token) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config || !config.totp || !config.totp.secret) {
        throw new Error('TOTP non configuré');
      }

      // Vérifier le verrouillage
      if (await this.isLocked(config)) {
        throw new Error('Compte temporairement verrouillé');
      }

      // Déchiffrer le secret
      const secret = await EncryptionService.decrypt(config.totp.secret, 'totp_secret');
      
      // Vérifier le token avec une fenêtre de tolérance
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Permet une tolérance de ±60 secondes
      });

      if (verified) {
        // Réinitialiser les tentatives échouées
        config.stats.totalVerifications += 1;
        config.stats.lastVerificationAt = new Date();
        config.stats.failedAttempts = 0;
        await config.save();

        return true;
      } else {
        // Incrémenter les tentatives échouées
        await this.recordFailedAttempt(config);
        return false;
      }

    } catch (error) {
      console.error('Erreur vérification TOTP:', error);
      throw error;
    }
  }

  async setupSMS(userId, organizationId, phoneNumber) {
    try {
      let config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        config = new TwoFactorConfig({
          userId,
          organizationId,
          method: 'sms'
        });
      }

      // Chiffrer le numéro de téléphone
      const encryptedPhone = await EncryptionService.encrypt(phoneNumber, 'phone_number');
      
      config.sms = {
        phoneNumber: encryptedPhone,
        verified: false,
        attempts: 0
      };
      config.method = 'sms';
      config.isEnabled = false;

      await config.save();

      // Envoyer le code de vérification
      const verificationCode = await this.sendSMSVerification(userId, 'setup');

      // Audit log
      await AuditService.log({
        action: 'auth.2fa_sms_setup_initiated',
        category: 'security',
        actorId: userId,
        organizationId,
        details: {
          method: 'sms',
          phoneNumber: phoneNumber.replace(/.(?=.{4})/g, '*')
        },
        riskLevel: 'medium'
      });

      return {
        message: 'Code de vérification envoyé par SMS',
        maskedPhone: phoneNumber.replace(/.(?=.{4})/g, '*')
      };

    } catch (error) {
      console.error('Erreur configuration SMS:', error);
      throw error;
    }
  }

  async verifySetup(userId, code, method = 'totp') {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        throw new Error('Configuration 2FA non trouvée');
      }

      let isValid = false;

      if (method === 'totp') {
        isValid = await this.verifyTOTP(userId, code);
        if (isValid) {
          config.totp.verified = true;
          config.totp.verifiedAt = new Date();
        }
      } else if (method === 'sms') {
        isValid = await this.verifySMSCode(userId, code, 'setup');
        if (isValid) {
          config.sms.verified = true;
          config.sms.verifiedAt = new Date();
        }
      }

      if (isValid) {
        config.isEnabled = true;
        await config.save();

        // Générer les codes de récupération
        const backupCodes = await this.generateBackupCodes(config._id);

        // Audit log
        await AuditService.log({
          action: 'auth.2fa_enabled',
          category: 'security',
          actorId: userId,
          organizationId: config.organizationId,
          details: {
            method,
            backupCodesGenerated: backupCodes.length
          },
          riskLevel: 'low'
        });

        // Notification
        await NotificationService.sendNotification({
          recipientId: userId,
          type: 'success',
          title: 'Authentification à deux facteurs activée',
          message: 'Votre compte est maintenant protégé par l\'authentification à deux facteurs.',
          channels: ['email']
        });

        console.log(`2FA activé pour l'utilisateur ${userId}`);
        
        return {
          success: true,
          backupCodes
        };
      } else {
        throw new Error('Code de vérification invalide');
      }

    } catch (error) {
      console.error('Erreur vérification configuration:', error);
      throw error;
    }
  }

  /**
   * Enable 2FA for user
   * @param {string} userId - User ID
   * @param {string} secret - 2FA secret
   * @param {string} token - Verification token
   * @param {Array} backupCodes - Backup codes
   * @returns {Promise<boolean>} Success status
   */
  async enableTwoFactor(userId, secret, token, backupCodes) {
    try {
      // Verify the token first
      if (!this.verifyToken(secret, token)) {
        throw new Error('Invalid verification token');
      }

      // Hash backup codes before storing
      const hashedBackupCodes = backupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Update user
      await User.findByIdAndUpdate(userId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: hashedBackupCodes
      });

      logger.info(`2FA enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   * @param {string} userId - User ID
   * @param {string} token - Verification token or backup code
   * @returns {Promise<boolean>} Success status
   */
  async disableTwoFactor(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      // Verify token or backup code
      const isValidToken = this.verifyToken(user.twoFactorSecret, token);
      const isValidBackupCode = this.verifyBackupCode(user.twoFactorBackupCodes, token);

      if (!isValidToken && !isValidBackupCode) {
        throw new Error('Invalid verification token or backup code');
      }

      // Disable 2FA
      await User.findByIdAndUpdate(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: []
      });

      logger.info(`2FA disabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify backup code
   * @param {Array} hashedBackupCodes - User's hashed backup codes
   * @param {string} code - Code to verify
   * @returns {boolean} Verification result
   */
  verifyBackupCode(hashedBackupCodes, code) {
    try {
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      return hashedBackupCodes.includes(hashedCode);
    } catch (error) {
      logger.error('Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Use backup code (remove it after use)
   * @param {string} userId - User ID
   * @param {string} code - Backup code to use
   * @returns {Promise<boolean>} Success status
   */
  async useBackupCode(userId, code) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);

      if (codeIndex === -1) {
        throw new Error('Invalid backup code');
      }

      // Remove the used backup code
      user.twoFactorBackupCodes.splice(codeIndex, 1);
      await user.save();

      logger.info(`Backup code used for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error using backup code:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes (legacy method for compatibility)
   * @param {number} count - Number of codes to generate
   * @returns {Array} Array of backup codes
   */
  generateBackupCodesLegacy(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Gestion des codes de récupération

  async generateBackupCodes(configId) {
    try {
      const codes = [];
      
      for (let i = 0; i < this.backupCodesCount; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
      }

      // Chiffrer et sauvegarder les codes
      const encryptedCodes = [];
      for (const code of codes) {
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
        encryptedCodes.push({
          code: hashedCode,
          used: false,
          createdAt: new Date()
        });
      }

      await TwoFactorConfig.findByIdAndUpdate(configId, {
        backupCodes: encryptedCodes
      });

      return codes; // Retourner les codes en clair pour l'affichage
    } catch (error) {
      console.error('Erreur génération codes de récupération:', error);
      throw error;
    }
  }

  async verifyBackupCode(userId, code) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config || !config.backupCodes) {
        throw new Error('Codes de récupération non configurés');
      }

      // Vérifier le verrouillage
      if (await this.isLocked(config)) {
        throw new Error('Compte temporairement verrouillé');
      }

      // Chercher un code valide
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      
      for (let i = 0; i < config.backupCodes.length; i++) {
        const backupCode = config.backupCodes[i];
        
        if (!backupCode.used && backupCode.code === hashedCode) {
          // Marquer le code comme utilisé
          config.backupCodes[i].used = true;
          config.backupCodes[i].usedAt = new Date();
          
          // Mettre à jour les statistiques
          config.stats.totalVerifications += 1;
          config.stats.lastVerificationAt = new Date();
          config.stats.failedAttempts = 0;
          
          await config.save();

          // Audit log
          await AuditService.log({
            action: 'auth.backup_code_used',
            category: 'security',
            actorId: userId,
            organizationId: config.organizationId,
            details: {
              remainingCodes: config.backupCodes.filter(c => !c.used).length
            },
            riskLevel: 'medium'
          });

          // Notification si peu de codes restants
          const remainingCodes = config.backupCodes.filter(c => !c.used).length;
          if (remainingCodes <= 2) {
            await NotificationService.sendNotification({
              recipientId: userId,
              type: 'warning',
              title: 'Codes de récupération bientôt épuisés',
              message: `Il ne vous reste que ${remainingCodes} codes de récupération. Générez de nouveaux codes.`,
              channels: ['email']
            });
          }

          return true;
        }
      }

      // Aucun code valide trouvé
      await this.recordFailedAttempt(config);
      return false;

    } catch (error) {
      console.error('Erreur vérification code de récupération:', error);
      throw error;
    }
  }

  async regenerateBackupCodes(userId) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        throw new Error('Configuration 2FA non trouvée');
      }

      // Générer de nouveaux codes
      const newCodes = await this.generateBackupCodes(config._id);

      // Audit log
      await AuditService.log({
        action: 'auth.backup_codes_regenerated',
        category: 'security',
        actorId: userId,
        organizationId: config.organizationId,
        details: {
          newCodesCount: newCodes.length
        },
        riskLevel: 'medium'
      });

      return newCodes;

    } catch (error) {
      console.error('Erreur régénération codes de récupération:', error);
      throw error;
    }
  }

  /**
   * Regenerate backup codes for user (legacy method for compatibility)
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @returns {Promise<Array>} New backup codes
   */
  async regenerateBackupCodesLegacy(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
      }

      // Verify token
      if (!this.verifyToken(user.twoFactorSecret, token)) {
        throw new Error('Invalid verification token');
      }

      // Generate new backup codes
      const newBackupCodes = this.generateBackupCodesLegacy();
      const hashedBackupCodes = newBackupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Update user
      await User.findByIdAndUpdate(userId, {
        twoFactorBackupCodes: hashedBackupCodes
      });

      logger.info(`Backup codes regenerated for user ${userId}`);
      return newBackupCodes;
    } catch (error) {
      logger.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  // Gestion SMS

  async sendSMSVerification(userId, purpose = 'login') {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config || !config.sms || !config.sms.phoneNumber) {
        throw new Error('SMS non configuré');
      }

      // Vérifier les limites de tentatives
      if (config.sms.attempts >= 5) {
        throw new Error('Trop de tentatives SMS. Réessayez plus tard.');
      }

      // Générer le code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + this.codeExpiry);

      // Sauvegarder le code de vérification
      const verificationCode = new VerificationCode({
        userId,
        code: crypto.createHash('sha256').update(code).digest('hex'),
        method: 'sms',
        purpose,
        expiresAt
      });
      await verificationCode.save();

      // Déchiffrer le numéro de téléphone
      const phoneNumber = await EncryptionService.decrypt(config.sms.phoneNumber, 'phone_number');

      // Envoyer le SMS (simulation)
      console.log(`SMS envoyé au ${phoneNumber}: Votre code de vérification est ${code}`);
      
      // Incrémenter les tentatives
      config.sms.attempts += 1;
      config.sms.lastSentAt = new Date();
      await config.save();

      // Audit log
      await AuditService.log({
        action: 'auth.sms_verification_sent',
        category: 'security',
        actorId: userId,
        organizationId: config.organizationId,
        details: {
          purpose,
          phoneNumber: phoneNumber.replace(/.(?=.{4})/g, '*')
        },
        riskLevel: 'low'
      });

      return {
        message: 'Code de vérification envoyé',
        expiresAt
      };

    } catch (error) {
      console.error('Erreur envoi SMS:', error);
      throw error;
    }
  }

  async verifySMSCode(userId, code, purpose = 'login') {
    try {
      const verificationCode = await VerificationCode.findOne({
        userId,
        method: 'sms',
        purpose,
        used: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!verificationCode) {
        throw new Error('Code de vérification invalide ou expiré');
      }

      // Vérifier les tentatives
      if (verificationCode.attempts >= verificationCode.maxAttempts) {
        throw new Error('Trop de tentatives pour ce code');
      }

      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      const isValid = verificationCode.code === hashedCode;
      
      if (isValid) {
        // Marquer le code comme utilisé
        verificationCode.used = true;
        verificationCode.usedAt = new Date();
        await verificationCode.save();

        // Réinitialiser les tentatives SMS
        await TwoFactorConfig.findOneAndUpdate(
          { userId },
          { 'sms.attempts': 0 }
        );

        return true;
      } else {
        // Incrémenter les tentatives
        verificationCode.attempts += 1;
        await verificationCode.save();
        return false;
      }

    } catch (error) {
      console.error('Erreur vérification SMS:', error);
      throw error;
    }
  }

  // Gestion des appareils de confiance

  async addTrustedDevice(userId, deviceInfo) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        throw new Error('Configuration 2FA non trouvée');
      }

      const deviceId = crypto.randomUUID();
      const deviceFingerprint = crypto.createHash('sha256')
        .update(JSON.stringify(deviceInfo))
        .digest('hex');

      const trustedDevice = {
        deviceId,
        deviceName: deviceInfo.name || 'Appareil inconnu',
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        addedAt: new Date(),
        expiresAt: new Date(Date.now() + this.trustedDeviceExpiry),
        lastUsedAt: new Date()
      };

      config.trustedDevices.push(trustedDevice);
      await config.save();

      // Audit log
      await AuditService.log({
        action: 'auth.trusted_device_added',
        category: 'security',
        actorId: userId,
        organizationId: config.organizationId,
        details: {
          deviceId,
          deviceName: trustedDevice.deviceName,
          ipAddress: deviceInfo.ipAddress
        },
        riskLevel: 'medium'
      });

      return deviceId;

    } catch (error) {
      console.error('Erreur ajout appareil de confiance:', error);
      throw error;
    }
  }

  async isTrustedDevice(userId, deviceInfo) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config || !config.trustedDevices) {
        return false;
      }

      const deviceFingerprint = crypto.createHash('sha256')
        .update(JSON.stringify(deviceInfo))
        .digest('hex');

      const trustedDevice = config.trustedDevices.find(device => 
        device.userAgent === deviceInfo.userAgent &&
        device.ipAddress === deviceInfo.ipAddress &&
        device.expiresAt > new Date()
      );

      if (trustedDevice) {
        // Mettre à jour la dernière utilisation
        trustedDevice.lastUsedAt = new Date();
        await config.save();
        return true;
      }

      return false;

    } catch (error) {
      console.error('Erreur vérification appareil de confiance:', error);
      return false;
    }
  }

  async removeTrustedDevice(userId, deviceId) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        throw new Error('Configuration 2FA non trouvée');
      }

      const deviceIndex = config.trustedDevices.findIndex(device => device.deviceId === deviceId);
      
      if (deviceIndex === -1) {
        throw new Error('Appareil de confiance non trouvé');
      }

      const removedDevice = config.trustedDevices[deviceIndex];
      config.trustedDevices.splice(deviceIndex, 1);
      await config.save();

      // Audit log
      await AuditService.log({
        action: 'auth.trusted_device_removed',
        category: 'security',
        actorId: userId,
        organizationId: config.organizationId,
        details: {
          deviceId,
          deviceName: removedDevice.deviceName
        },
        riskLevel: 'medium'
      });

      return true;

    } catch (error) {
      console.error('Erreur suppression appareil de confiance:', error);
      throw error;
    }
  }

  // Utilitaires de sécurité

  async recordFailedAttempt(config) {
    try {
      config.stats.failedAttempts += 1;
      config.stats.lastFailedAt = new Date();

      // Verrouiller si trop de tentatives échouées
      if (config.stats.failedAttempts >= config.security.maxFailedAttempts) {
        config.security.lockedUntil = new Date(Date.now() + config.security.lockoutDuration);
        
        // Notification de verrouillage
        await NotificationService.sendNotification({
          recipientId: config.userId,
          type: 'warning',
          title: 'Compte temporairement verrouillé',
          message: 'Trop de tentatives de connexion échouées. Votre compte est temporairement verrouillé.',
          channels: ['email']
        });
      }

      await config.save();

    } catch (error) {
      console.error('Erreur enregistrement tentative échouée:', error);
    }
  }

  async isLocked(config) {
    if (!config.security.lockedUntil) {
      return false;
    }

    if (config.security.lockedUntil > new Date()) {
      return true;
    }

    // Déverrouiller automatiquement
    config.security.lockedUntil = null;
    config.stats.failedAttempts = 0;
    await config.save();

    return false;
  }

  /**
   * Check if user has 2FA enabled
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} 2FA status
   */
  async isTwoFactorEnabled(userId) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      return config ? config.isEnabled : false;
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
      return false;
    }
  }

  /**
   * Get 2FA configuration for user
   * @param {string} userId - User ID
   * @returns {Promise<object>} 2FA configuration
   */
  async getTwoFactorConfig(userId) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config) {
        return null;
      }

      return {
        isEnabled: config.isEnabled,
        method: config.method,
        hasTotp: !!(config.totp && config.totp.verified),
        hasSms: !!(config.sms && config.sms.verified),
        backupCodesCount: config.backupCodes ? config.backupCodes.filter(c => !c.used).length : 0,
        trustedDevicesCount: config.trustedDevices ? config.trustedDevices.filter(d => d.expiresAt > new Date()).length : 0,
        stats: config.stats
      };

    } catch (error) {
      console.error('Erreur récupération configuration 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   * @param {string} userId - User ID
   * @param {string} verificationCode - TOTP code or backup code
   * @returns {Promise<boolean>} Success status
   */
  async disableTwoFactor(userId, verificationCode) {
    try {
      const config = await TwoFactorConfig.findOne({ userId });
      
      if (!config || !config.isEnabled) {
        throw new Error('2FA n\'est pas activé pour cet utilisateur');
      }

      // Vérifier le code (TOTP ou backup code)
      let isValid = false;
      
      if (config.totp && config.totp.verified) {
        isValid = await this.verifyTOTP(userId, verificationCode);
      }
      
      if (!isValid && config.backupCodes) {
        isValid = await this.verifyBackupCode(userId, verificationCode);
      }

      if (!isValid) {
        throw new Error('Code de vérification invalide');
      }

      // Désactiver 2FA
      config.isEnabled = false;
      config.totp = undefined;
      config.sms = undefined;
      config.backupCodes = [];
      config.trustedDevices = [];
      
      await config.save();

      // Audit log
      await AuditService.log({
        action: 'auth.2fa_disabled',
        category: 'security',
        actorId: userId,
        organizationId: config.organizationId,
        details: {
          previousMethod: config.method
        },
        riskLevel: 'high'
      });

      // Notification
      await NotificationService.sendNotification({
        recipientId: userId,
        type: 'warning',
        title: 'Authentification à deux facteurs désactivée',
        message: 'L\'authentification à deux facteurs a été désactivée pour votre compte.',
        channels: ['email']
      });

      console.log(`2FA désactivé pour l'utilisateur ${userId}`);
      
      return true;

    } catch (error) {
      console.error('Erreur désactivation 2FA:', error);
      throw error;
    }
  }
}

module.exports = new TwoFactorService();