const mongoose = require('mongoose');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const EncryptionService = require('./encryptionService');

// Schema pour les consentements RGPD
const GdprConsentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  consentType: {
    type: String,
    enum: [
      'data_processing',
      'marketing',
      'analytics',
      'cookies_functional',
      'cookies_analytics',
      'cookies_marketing',
      'third_party_sharing',
      'automated_decision_making',
      'data_transfer_outside_eu'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['granted', 'denied', 'withdrawn'],
    required: true
  },
  grantedAt: Date,
  withdrawnAt: Date,
  expiresAt: Date,
  source: {
    type: String,
    enum: ['registration', 'settings', 'cookie_banner', 'api', 'admin'],
    required: true
  },
  ipAddress: String,
  userAgent: String,
  legalBasis: {
    type: String,
    enum: [
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ],
    required: true
  },
  purpose: String,
  dataCategories: [{
    type: String,
    enum: [
      'identity',
      'contact',
      'financial',
      'usage',
      'technical',
      'behavioral',
      'preferences',
      'location'
    ]
  }],
  retentionPeriod: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'months', 'years']
    }
  },
  metadata: {
    version: String,
    language: String,
    consentText: String,
    checksum: String
  }
}, {
  timestamps: true
});

// Schema pour les demandes de droits RGPD
const GdprRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  requestType: {
    type: String,
    enum: [
      'access',           // Droit d'accès (Art. 15)
      'rectification',    // Droit de rectification (Art. 16)
      'erasure',          // Droit à l'effacement (Art. 17)
      'restriction',      // Droit à la limitation (Art. 18)
      'portability',      // Droit à la portabilité (Art. 20)
      'objection',        // Droit d'opposition (Art. 21)
      'automated_decision' // Droits relatifs aux décisions automatisées (Art. 22)
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  description: String,
  requestDetails: {
    specificData: [String],
    dateRange: {
      from: Date,
      to: Date
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'pdf', 'xml'],
      default: 'json'
    },
    reason: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  completedAt: Date,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  response: {
    message: String,
    attachments: [{
      filename: String,
      path: String,
      size: Number,
      mimeType: String
    }],
    deliveryMethod: {
      type: String,
      enum: ['email', 'download', 'postal'],
      default: 'email'
    }
  },
  verification: {
    method: {
      type: String,
      enum: ['email', 'phone', 'document', 'in_person']
    },
    verifiedAt: Date,
    verifiedBy: String
  },
  communication: [{
    timestamp: Date,
    type: {
      type: String,
      enum: ['status_update', 'clarification_request', 'response']
    },
    message: String,
    sentBy: String
  }]
}, {
  timestamps: true
});

// Schema pour le registre des traitements
const DataProcessingRecordSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  processingId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  controller: {
    name: String,
    contact: String,
    dpo: String
  },
  processor: {
    name: String,
    contact: String,
    location: String
  },
  legalBasis: {
    type: String,
    enum: [
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ],
    required: true
  },
  purposes: [String],
  dataCategories: [{
    category: String,
    description: String,
    source: String,
    retention: {
      period: Number,
      unit: String,
      criteria: String
    }
  }],
  dataSubjects: [{
    type: String,
    enum: ['customers', 'employees', 'prospects', 'suppliers', 'visitors']
  }],
  recipients: [{
    name: String,
    type: String,
    location: String,
    safeguards: String
  }],
  internationalTransfers: [{
    country: String,
    adequacyDecision: Boolean,
    safeguards: String,
    derogation: String
  }],
  securityMeasures: [String],
  riskAssessment: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    description: String,
    mitigationMeasures: [String],
    lastReview: Date
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'terminated'],
    default: 'active'
  }
}, {
  timestamps: true
});

const GdprConsent = mongoose.model('GdprConsent', GdprConsentSchema);
const GdprRequest = mongoose.model('GdprRequest', GdprRequestSchema);
const DataProcessingRecord = mongoose.model('DataProcessingRecord', DataProcessingRecordSchema);

class GdprService {
  constructor() {
    this.consentExpiryDays = 365; // Les consentements expirent après 1 an
    this.requestDeadlineDays = 30; // Délai légal pour répondre aux demandes
  }

  // Gestion des consentements

  async recordConsent(userId, organizationId, consentData) {
    const {
      consentType,
      status,
      source,
      ipAddress,
      userAgent,
      legalBasis,
      purpose,
      dataCategories,
      retentionPeriod,
      language = 'fr',
      consentText
    } = consentData;

    try {
      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.consentExpiryDays);

      // Générer un checksum du texte de consentement
      const checksum = require('crypto')
        .createHash('sha256')
        .update(consentText || '')
        .digest('hex');

      // Retirer le consentement précédent s'il existe
      await GdprConsent.updateMany(
        { userId, organizationId, consentType },
        { status: 'withdrawn', withdrawnAt: new Date() }
      );

      // Créer le nouveau consentement
      const consent = new GdprConsent({
        userId,
        organizationId,
        consentType,
        status,
        grantedAt: status === 'granted' ? new Date() : null,
        withdrawnAt: status === 'withdrawn' ? new Date() : null,
        expiresAt: status === 'granted' ? expiresAt : null,
        source,
        ipAddress,
        userAgent,
        legalBasis,
        purpose,
        dataCategories,
        retentionPeriod,
        metadata: {
          version: '1.0',
          language,
          consentText,
          checksum
        }
      });

      await consent.save();

      // Audit log
      await AuditService.log({
        action: 'gdpr.consent_recorded',
        category: 'compliance',
        actorId: userId,
        organizationId,
        details: {
          consentType,
          status,
          source,
          legalBasis
        },
        metadata: { ipAddress, userAgent }
      });

      console.log(`Consentement RGPD enregistré: ${consentType} - ${status}`);
      return consent;

    } catch (error) {
      console.error('Erreur enregistrement consentement:', error);
      throw error;
    }
  }

  async getConsents(userId, organizationId, options = {}) {
    const { consentType, status, includeExpired = false } = options;

    try {
      const filter = { userId, organizationId };
      
      if (consentType) {
        filter.consentType = consentType;
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (!includeExpired) {
        filter.$or = [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ];
      }

      const consents = await GdprConsent.find(filter)
        .sort({ createdAt: -1 })
        .populate('userId', 'email firstName lastName')
        .populate('organizationId', 'name');

      return consents;

    } catch (error) {
      console.error('Erreur récupération consentements:', error);
      throw error;
    }
  }

  async withdrawConsent(userId, organizationId, consentType, reason = '') {
    try {
      const result = await GdprConsent.updateMany(
        {
          userId,
          organizationId,
          consentType,
          status: 'granted'
        },
        {
          status: 'withdrawn',
          withdrawnAt: new Date()
        }
      );

      if (result.modifiedCount > 0) {
        // Audit log
        await AuditService.log({
          action: 'gdpr.consent_withdrawn',
          category: 'compliance',
          actorId: userId,
          organizationId,
          details: {
            consentType,
            reason
          }
        });

        console.log(`Consentement retiré: ${consentType}`);
      }

      return result.modifiedCount;

    } catch (error) {
      console.error('Erreur retrait consentement:', error);
      throw error;
    }
  }

  async checkConsentExpiry() {
    try {
      const expiredConsents = await GdprConsent.find({
        status: 'granted',
        expiresAt: { $lte: new Date() }
      });

      for (const consent of expiredConsents) {
        consent.status = 'withdrawn';
        consent.withdrawnAt = new Date();
        await consent.save();

        // Notification à l'utilisateur
        await NotificationService.sendNotification({
          recipientId: consent.userId,
          type: 'info',
          title: 'Consentement expiré',
          message: `Votre consentement pour ${consent.consentType} a expiré et a été automatiquement retiré.`,
          channels: ['email']
        });
      }

      if (expiredConsents.length > 0) {
        console.log(`${expiredConsents.length} consentements expirés traités`);
      }

      return expiredConsents.length;

    } catch (error) {
      console.error('Erreur vérification expiration consentements:', error);
      throw error;
    }
  }

  // Gestion des demandes de droits RGPD

  async submitRequest(userId, organizationId, requestData) {
    const {
      requestType,
      description,
      specificData,
      dateRange,
      format = 'json',
      reason
    } = requestData;

    try {
      const requestId = this.generateRequestId();
      
      // Calculer la date limite de réponse
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + this.requestDeadlineDays);

      const request = new GdprRequest({
        requestId,
        userId,
        organizationId,
        requestType,
        description,
        requestDetails: {
          specificData,
          dateRange,
          format,
          reason
        },
        dueDate
      });

      await request.save();

      // Notification aux administrateurs
      await NotificationService.sendOrganizationNotification({
        organizationId,
        type: 'warning',
        title: 'Nouvelle demande RGPD',
        message: `Nouvelle demande ${requestType} reçue (${requestId})`,
        metadata: {
          requestId,
          requestType,
          dueDate: dueDate.toISOString()
        },
        channels: ['email']
      });

      // Audit log
      await AuditService.log({
        action: 'gdpr.request_submitted',
        category: 'compliance',
        actorId: userId,
        organizationId,
        details: {
          requestId,
          requestType,
          dueDate
        }
      });

      console.log(`Demande RGPD soumise: ${requestId}`);
      return request;

    } catch (error) {
      console.error('Erreur soumission demande RGPD:', error);
      throw error;
    }
  }

  async processAccessRequest(requestId, options = {}) {
    try {
      const request = await GdprRequest.findOne({ requestId })
        .populate('userId')
        .populate('organizationId');

      if (!request || request.requestType !== 'access') {
        throw new Error('Demande d\'accès non trouvée');
      }

      // Collecter toutes les données de l'utilisateur
      const userData = await this.collectUserData(request.userId._id, request.organizationId._id);

      // Générer le rapport
      const report = await this.generateDataReport(userData, request.requestDetails.format);

      // Mettre à jour la demande
      request.status = 'completed';
      request.completedAt = new Date();
      request.response = {
        message: 'Voici toutes les données personnelles que nous détenons sur vous.',
        attachments: [{
          filename: `data_export_${requestId}.${request.requestDetails.format}`,
          path: report.filePath,
          size: report.size,
          mimeType: report.mimeType
        }],
        deliveryMethod: 'email'
      };

      await request.save();

      // Envoyer la réponse
      await this.sendRequestResponse(request);

      return request;

    } catch (error) {
      console.error('Erreur traitement demande d\'accès:', error);
      throw error;
    }
  }

  async processErasureRequest(requestId, options = {}) {
    const { verifyIdentity = true, keepAuditTrail = true } = options;

    try {
      const request = await GdprRequest.findOne({ requestId })
        .populate('userId')
        .populate('organizationId');

      if (!request || request.requestType !== 'erasure') {
        throw new Error('Demande d\'effacement non trouvée');
      }

      const userId = request.userId._id;
      const organizationId = request.organizationId._id;

      // Vérifier s'il y a des obligations légales de conservation
      const retentionObligations = await this.checkRetentionObligations(userId, organizationId);
      
      if (retentionObligations.length > 0) {
        request.status = 'rejected';
        request.response = {
          message: 'Votre demande d\'effacement ne peut être satisfaite en raison d\'obligations légales de conservation.',
          deliveryMethod: 'email'
        };
        await request.save();
        await this.sendRequestResponse(request);
        return request;
      }

      // Effectuer l'effacement
      const deletionResult = await this.performDataErasure(userId, organizationId, {
        keepAuditTrail,
        requestId
      });

      // Mettre à jour la demande
      request.status = 'completed';
      request.completedAt = new Date();
      request.response = {
        message: 'Vos données personnelles ont été supprimées de nos systèmes.',
        deliveryMethod: 'email'
      };

      await request.save();
      await this.sendRequestResponse(request);

      return request;

    } catch (error) {
      console.error('Erreur traitement demande d\'effacement:', error);
      throw error;
    }
  }

  async performDataErasure(userId, organizationId, options = {}) {
    const { keepAuditTrail = true, requestId } = options;

    try {
      const deletionResults = [];

      // Collections à nettoyer
      const collectionsToClean = [
        { model: 'User', field: '_id' },
        { model: 'GdprConsent', field: 'userId' },
        { model: 'Notification', field: 'recipientId' },
        { model: 'SupportTicket', field: 'userId' },
        { model: 'UsageTracking', field: 'userId' },
        { model: 'WebhookDelivery', field: 'userId' }
      ];

      for (const collection of collectionsToClean) {
        try {
          const Model = mongoose.model(collection.model);
          const filter = { [collection.field]: userId };
          
          if (collection.model === 'User') {
            // Pour l'utilisateur, anonymiser plutôt que supprimer
            const result = await Model.updateOne(filter, {
              email: `deleted_${userId}@anonymized.local`,
              firstName: '[SUPPRIMÉ]',
              lastName: '[SUPPRIMÉ]',
              phone: null,
              address: null,
              isDeleted: true,
              deletedAt: new Date(),
              deletionReason: 'gdpr_erasure',
              deletionRequestId: requestId
            });
            deletionResults.push({ collection: collection.model, modified: result.modifiedCount });
          } else {
            // Supprimer les autres données
            const result = await Model.deleteMany(filter);
            deletionResults.push({ collection: collection.model, deleted: result.deletedCount });
          }
        } catch (error) {
          console.error(`Erreur suppression ${collection.model}:`, error);
          deletionResults.push({ collection: collection.model, error: error.message });
        }
      }

      // Audit log (si on garde la trace)
      if (keepAuditTrail) {
        await AuditService.log({
          action: 'gdpr.data_erased',
          category: 'compliance',
          actorId: userId,
          organizationId,
          details: {
            requestId,
            deletionResults,
            erasureDate: new Date()
          },
          riskLevel: 'high'
        });
      }

      console.log(`Données utilisateur ${userId} supprimées`);
      return deletionResults;

    } catch (error) {
      console.error('Erreur effacement données:', error);
      throw error;
    }
  }

  async collectUserData(userId, organizationId) {
    try {
      const userData = {};

      // Données utilisateur
      const User = mongoose.model('User');
      const user = await User.findById(userId).lean();
      if (user) {
        // Déchiffrer les données sensibles
        userData.profile = await EncryptionService.decryptUserData(user);
      }

      // Consentements
      userData.consents = await GdprConsent.find({ userId }).lean();

      // Tickets de support
      const SupportTicket = mongoose.model('SupportTicket');
      userData.supportTickets = await SupportTicket.find({ userId }).lean();

      // Utilisation
      const { UsageTracking } = require('./quotaService');
      userData.usage = await UsageTracking.find({ userId }).lean();

      // Notifications
      const Notification = mongoose.model('Notification');
      userData.notifications = await Notification.find({ recipientId: userId }).lean();

      // Logs d'audit (données non sensibles)
      const auditLogs = await AuditService.getLogs(
        { actorId: userId },
        { limit: 1000, sort: { timestamp: -1 } }
      );
      userData.auditLogs = auditLogs.logs;

      return userData;

    } catch (error) {
      console.error('Erreur collecte données utilisateur:', error);
      throw error;
    }
  }

  async generateDataReport(userData, format = 'json') {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const reportsDir = path.join(process.cwd(), 'temp', 'gdpr_reports');
      await fs.mkdir(reportsDir, { recursive: true });

      const timestamp = Date.now();
      let filename, content, mimeType;

      switch (format) {
        case 'json':
          filename = `data_export_${timestamp}.json`;
          content = JSON.stringify(userData, null, 2);
          mimeType = 'application/json';
          break;

        case 'csv':
          filename = `data_export_${timestamp}.csv`;
          content = this.convertToCSV(userData);
          mimeType = 'text/csv';
          break;

        case 'pdf':
          filename = `data_export_${timestamp}.pdf`;
          content = await this.generatePDF(userData);
          mimeType = 'application/pdf';
          break;

        default:
          throw new Error(`Format non supporté: ${format}`);
      }

      const filePath = path.join(reportsDir, filename);
      await fs.writeFile(filePath, content);

      const stats = await fs.stat(filePath);

      return {
        filePath,
        filename,
        size: stats.size,
        mimeType
      };

    } catch (error) {
      console.error('Erreur génération rapport:', error);
      throw error;
    }
  }

  convertToCSV(userData) {
    // Conversion simplifiée en CSV
    const rows = [];
    
    // En-têtes
    rows.push('Section,Champ,Valeur');
    
    // Parcourir les données
    for (const [section, data] of Object.entries(userData)) {
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          for (const [key, value] of Object.entries(item)) {
            rows.push(`${section}[${index}],${key},"${String(value).replace(/"/g, '""')}"`);;
          }
        });
      } else if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          rows.push(`${section},${key},"${String(value).replace(/"/g, '""')}"`);;
        }
      } else {
        rows.push(`${section},,"${String(data).replace(/"/g, '""')}"`);;
      }
    }
    
    return rows.join('\n');
  }

  async generatePDF(userData) {
    // Implémentation simplifiée - dans un vrai système, utilisez une bibliothèque PDF
    const content = `
      RAPPORT D'EXPORT DES DONNÉES PERSONNELLES
      ==========================================
      
      Date de génération: ${new Date().toLocaleString('fr-FR')}
      
      ${JSON.stringify(userData, null, 2)}
    `;
    
    return Buffer.from(content, 'utf8');
  }

  async sendRequestResponse(request) {
    try {
      await NotificationService.sendNotification({
        recipientId: request.userId,
        type: 'info',
        title: 'Réponse à votre demande RGPD',
        message: request.response.message,
        metadata: {
          requestId: request.requestId,
          requestType: request.requestType
        },
        channels: ['email']
      });

      console.log(`Réponse envoyée pour la demande ${request.requestId}`);

    } catch (error) {
      console.error('Erreur envoi réponse:', error);
    }
  }

  async checkRetentionObligations(userId, organizationId) {
    // Vérifier s'il y a des obligations légales de conservation
    const obligations = [];

    try {
      // Vérifier les obligations comptables (7 ans en France)
      const Invoice = mongoose.model('Invoice');
      const recentInvoices = await Invoice.find({
        userId,
        organizationId,
        createdAt: { $gte: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000) }
      });

      if (recentInvoices.length > 0) {
        obligations.push({
          type: 'accounting',
          description: 'Obligation de conservation comptable (7 ans)',
          expiresAt: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000)
        });
      }

      // Vérifier les litiges en cours
      const SupportTicket = mongoose.model('SupportTicket');
      const openDisputes = await SupportTicket.find({
        userId,
        organizationId,
        status: { $in: ['open', 'in_progress'] },
        category: 'dispute'
      });

      if (openDisputes.length > 0) {
        obligations.push({
          type: 'litigation',
          description: 'Litige en cours',
          expiresAt: null // Jusqu'à résolution
        });
      }

      return obligations;

    } catch (error) {
      console.error('Erreur vérification obligations:', error);
      return [];
    }
  }

  // Registre des traitements

  async createProcessingRecord(organizationId, processingData) {
    try {
      const processingId = this.generateProcessingId();
      
      const record = new DataProcessingRecord({
        organizationId,
        processingId,
        ...processingData
      });

      await record.save();

      // Audit log
      await AuditService.log({
        action: 'gdpr.processing_record_created',
        category: 'compliance',
        organizationId,
        details: {
          processingId,
          name: processingData.name
        }
      });

      return record;

    } catch (error) {
      console.error('Erreur création registre traitement:', error);
      throw error;
    }
  }

  async getProcessingRecords(organizationId, options = {}) {
    try {
      const { status, search, page = 1, limit = 20 } = options;
      
      const filter = { organizationId };
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const records = await DataProcessingRecord.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await DataProcessingRecord.countDocuments(filter);

      return {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Erreur récupération registres:', error);
      throw error;
    }
  }

  // Méthodes utilitaires

  generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `GDPR-${timestamp}-${random}`.toUpperCase();
  }

  generateProcessingId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `PROC-${timestamp}-${random}`.toUpperCase();
  }

  async getComplianceStats(organizationId = null) {
    try {
      const filter = organizationId ? { organizationId } : {};
      
      const stats = {
        consents: await GdprConsent.aggregate([
          { $match: filter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        requests: await GdprRequest.aggregate([
          { $match: filter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        processingRecords: await DataProcessingRecord.countDocuments(filter),
        pendingRequests: await GdprRequest.countDocuments({
          ...filter,
          status: { $in: ['pending', 'in_progress'] },
          dueDate: { $lte: new Date() }
        })
      };

      return stats;

    } catch (error) {
      console.error('Erreur récupération statistiques conformité:', error);
      throw error;
    }
  }

  async scheduleConsentReminders() {
    // Planifier des rappels pour les consentements qui expirent bientôt
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 30); // 30 jours avant expiration

    try {
      const expiringConsents = await GdprConsent.find({
        status: 'granted',
        expiresAt: {
          $gte: new Date(),
          $lte: reminderDate
        }
      }).populate('userId');

      for (const consent of expiringConsents) {
        await NotificationService.sendNotification({
          recipientId: consent.userId._id,
          type: 'info',
          title: 'Renouvellement de consentement requis',
          message: `Votre consentement pour ${consent.consentType} expire bientôt. Veuillez le renouveler.`,
          channels: ['email']
        });
      }

      console.log(`${expiringConsents.length} rappels de consentement envoyés`);
      return expiringConsents.length;

    } catch (error) {
      console.error('Erreur envoi rappels consentement:', error);
      throw error;
    }
  }
}

module.exports = new GdprService();