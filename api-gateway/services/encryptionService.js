const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const AuditService = require('./auditService');

// Schema pour les clés de chiffrement
const EncryptionKeySchema = new mongoose.Schema({
  keyId: {
    type: String,
    required: true,
    unique: true
  },
  algorithm: {
    type: String,
    enum: ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305'],
    default: 'aes-256-gcm'
  },
  purpose: {
    type: String,
    enum: ['data', 'backup', 'communication', 'pii', 'financial'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'rotating', 'deprecated', 'revoked'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  rotatedAt: Date,
  expiresAt: Date,
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  metadata: {
    createdBy: String,
    rotationPolicy: {
      enabled: Boolean,
      intervalDays: Number
    },
    usage: {
      encryptCount: { type: Number, default: 0 },
      decryptCount: { type: Number, default: 0 },
      lastUsed: Date
    }
  }
}, {
  timestamps: true
});

const EncryptionKey = mongoose.model('EncryptionKey', EncryptionKeySchema);

class EncryptionService {
  constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY || this.generateMasterKey();
    this.keyCache = new Map();
    this.algorithms = {
      'aes-256-gcm': {
        keyLength: 32,
        ivLength: 16,
        tagLength: 16
      },
      'aes-256-cbc': {
        keyLength: 32,
        ivLength: 16,
        tagLength: 0
      },
      'chacha20-poly1305': {
        keyLength: 32,
        ivLength: 12,
        tagLength: 16
      }
    };
    
    this.initializeDefaultKeys();
    this.scheduleKeyRotation();
  }

  generateMasterKey() {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('ATTENTION: Clé maître générée automatiquement. Définissez MASTER_ENCRYPTION_KEY en production!');
    return key;
  }

  async initializeDefaultKeys() {
    try {
      // Vérifier si les clés par défaut existent
      const defaultKeys = [
        { keyId: 'default-data', purpose: 'data' },
        { keyId: 'default-pii', purpose: 'pii' },
        { keyId: 'default-backup', purpose: 'backup' }
      ];

      for (const keyConfig of defaultKeys) {
        const existingKey = await EncryptionKey.findOne({ keyId: keyConfig.keyId });
        if (!existingKey) {
          await this.createEncryptionKey(keyConfig.purpose, {
            keyId: keyConfig.keyId,
            organizationId: null // Clé système
          });
        }
      }
    } catch (error) {
      console.error('Erreur initialisation clés par défaut:', error);
    }
  }

  scheduleKeyRotation() {
    // Vérifier la rotation des clés toutes les heures
    setInterval(async () => {
      try {
        await this.checkAndRotateKeys();
      } catch (error) {
        console.error('Erreur rotation automatique des clés:', error);
      }
    }, 60 * 60 * 1000); // 1 heure
  }

  async createEncryptionKey(purpose, options = {}) {
    const {
      keyId = this.generateKeyId(purpose),
      algorithm = 'aes-256-gcm',
      organizationId = null,
      rotationPolicy = { enabled: true, intervalDays: 90 },
      createdBy = 'system'
    } = options;

    try {
      // Générer la clé de chiffrement
      const keyLength = this.algorithms[algorithm].keyLength;
      const encryptionKey = crypto.randomBytes(keyLength);
      
      // Chiffrer la clé avec la clé maître
      const encryptedKey = this.encryptWithMasterKey(encryptionKey);

      // Calculer la date d'expiration
      const expiresAt = rotationPolicy.enabled 
        ? new Date(Date.now() + (rotationPolicy.intervalDays * 24 * 60 * 60 * 1000))
        : null;

      // Sauvegarder en base
      const keyRecord = new EncryptionKey({
        keyId,
        algorithm,
        purpose,
        organizationId,
        expiresAt,
        metadata: {
          createdBy,
          rotationPolicy
        }
      });

      await keyRecord.save();

      // Stocker la clé déchiffrée en cache
      this.keyCache.set(keyId, {
        key: encryptionKey,
        algorithm,
        createdAt: new Date()
      });

      // Audit log
      await AuditService.log({
        action: 'encryption.key_created',
        category: 'security',
        details: {
          keyId,
          purpose,
          algorithm,
          organizationId
        },
        metadata: { createdBy }
      });

      console.log(`Clé de chiffrement créée: ${keyId}`);
      return keyRecord;

    } catch (error) {
      console.error('Erreur création clé de chiffrement:', error);
      throw error;
    }
  }

  async getEncryptionKey(keyId) {
    // Vérifier le cache d'abord
    if (this.keyCache.has(keyId)) {
      const cached = this.keyCache.get(keyId);
      // Vérifier que la clé en cache n'est pas trop ancienne (1 heure)
      if (Date.now() - cached.createdAt.getTime() < 60 * 60 * 1000) {
        return cached;
      }
      this.keyCache.delete(keyId);
    }

    try {
      // Récupérer depuis la base de données
      const keyRecord = await EncryptionKey.findOne({ 
        keyId, 
        status: { $in: ['active', 'rotating'] }
      });

      if (!keyRecord) {
        throw new Error(`Clé de chiffrement non trouvée: ${keyId}`);
      }

      // Vérifier l'expiration
      if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        throw new Error(`Clé de chiffrement expirée: ${keyId}`);
      }

      // Déchiffrer la clé avec la clé maître
      const encryptedKey = await this.getStoredEncryptedKey(keyId);
      const decryptedKey = this.decryptWithMasterKey(encryptedKey);

      // Mettre en cache
      const keyData = {
        key: decryptedKey,
        algorithm: keyRecord.algorithm,
        createdAt: new Date()
      };
      this.keyCache.set(keyId, keyData);

      // Mettre à jour les statistiques d'utilisation
      await this.updateKeyUsage(keyId, 'access');

      return keyData;

    } catch (error) {
      console.error(`Erreur récupération clé ${keyId}:`, error);
      throw error;
    }
  }

  async encrypt(data, purpose = 'data', options = {}) {
    const {
      keyId = `default-${purpose}`,
      encoding = 'base64',
      organizationId = null
    } = options;

    try {
      // Récupérer la clé de chiffrement
      const keyData = await this.getEncryptionKey(keyId);
      const { key, algorithm } = keyData;
      const algorithmConfig = this.algorithms[algorithm];

      // Générer l'IV
      const iv = crypto.randomBytes(algorithmConfig.ivLength);
      
      let encrypted, tag;
      
      if (algorithm === 'aes-256-gcm') {
        const cipher = crypto.createCipher('aes-256-gcm', key);
        cipher.setAAD(Buffer.from(keyId)); // Données d'authentification additionnelles
        
        encrypted = Buffer.concat([
          cipher.update(data, 'utf8'),
          cipher.final()
        ]);
        
        tag = cipher.getAuthTag();
        
      } else if (algorithm === 'aes-256-cbc') {
        const cipher = crypto.createCipher('aes-256-cbc', key);
        encrypted = Buffer.concat([
          cipher.update(data, 'utf8'),
          cipher.final()
        ]);
        
      } else if (algorithm === 'chacha20-poly1305') {
        const cipher = crypto.createCipher('chacha20-poly1305', key, { iv });
        encrypted = Buffer.concat([
          cipher.update(data, 'utf8'),
          cipher.final()
        ]);
        tag = cipher.getAuthTag();
      }

      // Construire le résultat
      const result = {
        keyId,
        algorithm,
        iv: iv.toString('base64'),
        data: encrypted.toString(encoding)
      };

      if (tag) {
        result.tag = tag.toString('base64');
      }

      // Mettre à jour les statistiques
      await this.updateKeyUsage(keyId, 'encrypt');

      return result;

    } catch (error) {
      console.error('Erreur chiffrement:', error);
      throw error;
    }
  }

  async decrypt(encryptedData, options = {}) {
    const { encoding = 'base64' } = options;

    try {
      const { keyId, algorithm, iv, data, tag } = encryptedData;
      
      // Récupérer la clé de chiffrement
      const keyData = await this.getEncryptionKey(keyId);
      const { key } = keyData;
      
      const ivBuffer = Buffer.from(iv, 'base64');
      const dataBuffer = Buffer.from(data, encoding);
      const tagBuffer = tag ? Buffer.from(tag, 'base64') : null;
      
      let decrypted;
      
      if (algorithm === 'aes-256-gcm') {
        const decipher = crypto.createDecipher('aes-256-gcm', key);
        decipher.setAAD(Buffer.from(keyId));
        if (tagBuffer) {
          decipher.setAuthTag(tagBuffer);
        }
        
        decrypted = Buffer.concat([
          decipher.update(dataBuffer),
          decipher.final()
        ]);
        
      } else if (algorithm === 'aes-256-cbc') {
        const decipher = crypto.createDecipher('aes-256-cbc', key);
        decrypted = Buffer.concat([
          decipher.update(dataBuffer),
          decipher.final()
        ]);
        
      } else if (algorithm === 'chacha20-poly1305') {
        const decipher = crypto.createDecipher('chacha20-poly1305', key, { iv: ivBuffer });
        if (tagBuffer) {
          decipher.setAuthTag(tagBuffer);
        }
        
        decrypted = Buffer.concat([
          decipher.update(dataBuffer),
          decipher.final()
        ]);
      }

      // Mettre à jour les statistiques
      await this.updateKeyUsage(keyId, 'decrypt');

      return decrypted.toString('utf8');

    } catch (error) {
      console.error('Erreur déchiffrement:', error);
      throw error;
    }
  }

  async encryptPII(data, organizationId = null) {
    // Chiffrement spécialisé pour les données personnelles identifiables
    return this.encrypt(data, 'pii', { 
      keyId: organizationId ? `pii-${organizationId}` : 'default-pii',
      organizationId 
    });
  }

  async decryptPII(encryptedData) {
    return this.decrypt(encryptedData);
  }

  async encryptFinancial(data, organizationId = null) {
    // Chiffrement spécialisé pour les données financières
    return this.encrypt(data, 'financial', { 
      keyId: organizationId ? `financial-${organizationId}` : 'default-financial',
      organizationId 
    });
  }

  async decryptFinancial(encryptedData) {
    return this.decrypt(encryptedData);
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  async rotateKey(keyId, options = {}) {
    const { createdBy = 'system' } = options;

    try {
      // Récupérer la clé actuelle
      const currentKey = await EncryptionKey.findOne({ keyId });
      if (!currentKey) {
        throw new Error(`Clé non trouvée: ${keyId}`);
      }

      // Marquer la clé actuelle comme en rotation
      currentKey.status = 'rotating';
      currentKey.rotatedAt = new Date();
      await currentKey.save();

      // Créer une nouvelle clé
      const newKeyId = `${keyId}-${Date.now()}`;
      const newKey = await this.createEncryptionKey(currentKey.purpose, {
        keyId: newKeyId,
        algorithm: currentKey.algorithm,
        organizationId: currentKey.organizationId,
        rotationPolicy: currentKey.metadata.rotationPolicy,
        createdBy
      });

      // Mettre à jour les références (cette partie dépend de votre implémentation)
      // Vous devrez implémenter la logique pour re-chiffrer les données existantes
      
      // Marquer l'ancienne clé comme dépréciée après un délai
      setTimeout(async () => {
        try {
          currentKey.status = 'deprecated';
          await currentKey.save();
          
          // Supprimer du cache
          this.keyCache.delete(keyId);
          
          console.log(`Clé ${keyId} marquée comme dépréciée`);
        } catch (error) {
          console.error('Erreur dépréciation clé:', error);
        }
      }, 24 * 60 * 60 * 1000); // 24 heures

      // Audit log
      await AuditService.log({
        action: 'encryption.key_rotated',
        category: 'security',
        details: {
          oldKeyId: keyId,
          newKeyId,
          purpose: currentKey.purpose
        },
        metadata: { createdBy }
      });

      console.log(`Clé ${keyId} rotée vers ${newKeyId}`);
      return newKey;

    } catch (error) {
      console.error(`Erreur rotation clé ${keyId}:`, error);
      throw error;
    }
  }

  async checkAndRotateKeys() {
    try {
      const now = new Date();
      
      // Trouver les clés qui doivent être rotées
      const keysToRotate = await EncryptionKey.find({
        status: 'active',
        'metadata.rotationPolicy.enabled': true,
        $or: [
          { expiresAt: { $lte: now } },
          { 
            expiresAt: { 
              $lte: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 jours avant expiration
            }
          }
        ]
      });

      for (const key of keysToRotate) {
        try {
          await this.rotateKey(key.keyId, { createdBy: 'auto-rotation' });
        } catch (error) {
          console.error(`Erreur rotation automatique ${key.keyId}:`, error);
        }
      }

      if (keysToRotate.length > 0) {
        console.log(`${keysToRotate.length} clés rotées automatiquement`);
      }

    } catch (error) {
      console.error('Erreur vérification rotation clés:', error);
    }
  }

  async revokeKey(keyId, reason = 'manual', options = {}) {
    const { createdBy = 'system' } = options;

    try {
      const key = await EncryptionKey.findOne({ keyId });
      if (!key) {
        throw new Error(`Clé non trouvée: ${keyId}`);
      }

      // Marquer comme révoquée
      key.status = 'revoked';
      key.metadata.revokedAt = new Date();
      key.metadata.revokedBy = createdBy;
      key.metadata.revokedReason = reason;
      await key.save();

      // Supprimer du cache
      this.keyCache.delete(keyId);

      // Audit log
      await AuditService.log({
        action: 'encryption.key_revoked',
        category: 'security',
        details: {
          keyId,
          reason,
          purpose: key.purpose
        },
        metadata: { createdBy },
        riskLevel: 'high'
      });

      console.log(`Clé ${keyId} révoquée: ${reason}`);
      return true;

    } catch (error) {
      console.error(`Erreur révocation clé ${keyId}:`, error);
      throw error;
    }
  }

  async getKeyStats(organizationId = null) {
    try {
      const filter = organizationId ? { organizationId } : {};
      
      const stats = await EncryptionKey.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            purposes: { $addToSet: '$purpose' }
          }
        }
      ]);

      const totalUsage = await EncryptionKey.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEncryptions: { $sum: '$metadata.usage.encryptCount' },
            totalDecryptions: { $sum: '$metadata.usage.decryptCount' }
          }
        }
      ]);

      const expiringKeys = await EncryptionKey.countDocuments({
        ...filter,
        status: 'active',
        expiresAt: {
          $lte: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 jours
        }
      });

      return {
        keysByStatus: stats,
        usage: totalUsage[0] || { totalEncryptions: 0, totalDecryptions: 0 },
        expiringKeys,
        cacheSize: this.keyCache.size
      };

    } catch (error) {
      console.error('Erreur récupération statistiques clés:', error);
      throw error;
    }
  }

  // Méthodes utilitaires privées

  encryptWithMasterKey(data) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.masterKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    return {
      algorithm,
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      tag: tag.toString('base64')
    };
  }

  decryptWithMasterKey(encryptedData) {
    const { algorithm, iv, data, tag } = encryptedData;
    const key = Buffer.from(this.masterKey, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final()
    ]);
    
    return decrypted;
  }

  async getStoredEncryptedKey(keyId) {
    // Dans un vrai système, vous stockeriez les clés chiffrées dans un HSM ou un service de gestion de clés
    // Pour cette implémentation, nous simulons le stockage
    const keyRecord = await EncryptionKey.findOne({ keyId });
    if (!keyRecord) {
      throw new Error(`Clé non trouvée: ${keyId}`);
    }
    
    // Simulation - dans la réalité, vous récupéreriez la clé chiffrée depuis un stockage sécurisé
    return {
      algorithm: 'aes-256-gcm',
      iv: 'simulated-iv',
      data: 'simulated-encrypted-key',
      tag: 'simulated-tag'
    };
  }

  async updateKeyUsage(keyId, operation) {
    try {
      const updateField = operation === 'encrypt' ? 'metadata.usage.encryptCount' : 
                         operation === 'decrypt' ? 'metadata.usage.decryptCount' : null;
      
      if (updateField) {
        await EncryptionKey.updateOne(
          { keyId },
          { 
            $inc: { [updateField]: 1 },
            $set: { 'metadata.usage.lastUsed': new Date() }
          }
        );
      }
    } catch (error) {
      // Ne pas faire échouer l'opération principale pour les statistiques
      console.error('Erreur mise à jour usage clé:', error);
    }
  }

  generateKeyId(purpose) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${purpose}-${timestamp}-${random}`;
  }

  // Méthodes pour l'intégration avec d'autres services

  async encryptUserData(userData, organizationId) {
    const encryptedData = {};
    
    // Champs sensibles à chiffrer
    const sensitiveFields = ['email', 'phone', 'address', 'taxId', 'bankAccount'];
    
    for (const [key, value] of Object.entries(userData)) {
      if (sensitiveFields.includes(key) && value) {
        encryptedData[key] = await this.encryptPII(value, organizationId);
      } else {
        encryptedData[key] = value;
      }
    }
    
    return encryptedData;
  }

  async decryptUserData(encryptedUserData) {
    const decryptedData = {};
    
    for (const [key, value] of Object.entries(encryptedUserData)) {
      if (value && typeof value === 'object' && value.keyId) {
        // C'est une donnée chiffrée
        try {
          decryptedData[key] = await this.decryptPII(value);
        } catch (error) {
          console.error(`Erreur déchiffrement ${key}:`, error);
          decryptedData[key] = '[ENCRYPTED]';
        }
      } else {
        decryptedData[key] = value;
      }
    }
    
    return decryptedData;
  }
}

module.exports = new EncryptionService();