const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const BackupService = require('../services/backupService');
const { auth: requireAuth } = require('../middleware/auth');
const { permissionMiddleware } = require('../middleware/permissions');

// Middleware pour vérifier l'accès aux backups
const requireBackupAccess = permissionMiddleware('system:backup');
const requireBackupManage = permissionMiddleware('system:admin');

// Validation middleware
const validateBackupCreation = [
  body('type')
    .isIn(['full', 'incremental'])
    .withMessage('Type de backup invalide'),
  body('manual')
    .optional()
    .isBoolean()
    .withMessage('Manual doit être un booléen')
];

const validateBackupRestore = [
  param('backupId')
    .notEmpty()
    .withMessage('ID de backup requis'),
  body('restoreDatabase')
    .optional()
    .isBoolean()
    .withMessage('restoreDatabase doit être un booléen'),
  body('restoreConfig')
    .optional()
    .isBoolean()
    .withMessage('restoreConfig doit être un booléen')
];

const validateConfigUpdate = [
  body('retention.daily')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Rétention quotidienne invalide (1-30)'),
  body('retention.weekly')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Rétention hebdomadaire invalide (1-12)'),
  body('retention.monthly')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Rétention mensuelle invalide (1-24)'),
  body('compression')
    .optional()
    .isBoolean()
    .withMessage('Compression doit être un booléen'),
  body('storage.local')
    .optional()
    .isBoolean()
    .withMessage('Stockage local doit être un booléen'),
  body('storage.s3')
    .optional()
    .isBoolean()
    .withMessage('Stockage S3 doit être un booléen')
];

// Routes pour la gestion des backups

// Obtenir le statut du service de backup
router.get('/status',
  requireAuth,
  requireBackupAccess,
  async (req, res) => {
    try {
      const status = BackupService.getStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Erreur récupération statut backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du statut'
      });
    }
  }
);

// Créer un backup manuel
router.post('/create',
  requireAuth,
  requireBackupManage,
  validateBackupCreation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { type = 'full', manual = true } = req.body;
      
      // Vérifier qu'aucun backup n'est en cours
      const status = BackupService.getStatus();
      if (status.isRunning) {
        return res.status(409).json({
          success: false,
          message: 'Un backup est déjà en cours'
        });
      }

      // Démarrer le backup de manière asynchrone
      BackupService.createBackup(type, { manual, userId: req.user.id })
        .catch(error => {
          console.error('Erreur backup asynchrone:', error);
        });

      res.status(202).json({
        success: true,
        message: `Backup ${type} démarré`,
        data: {
          type,
          manual,
          startedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erreur création backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du backup'
      });
    }
  }
);

// Lister les backups
router.get('/list',
  requireAuth,
  requireBackupAccess,
  query('type').optional().isIn(['full', 'incremental']).withMessage('Type invalide'),
  query('status').optional().isIn(['pending', 'running', 'completed', 'failed']).withMessage('Statut invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres invalides',
          errors: errors.array()
        });
      }

      const { type, status, startDate, endDate, limit } = req.query;
      
      const options = {
        type,
        status,
        startDate,
        endDate,
        limit: parseInt(limit) || 20
      };

      const backups = await BackupService.getBackupList(options);

      res.json({
        success: true,
        data: backups
      });
    } catch (error) {
      console.error('Erreur récupération liste backups:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des backups'
      });
    }
  }
);

// Obtenir les statistiques des backups
router.get('/stats',
  requireAuth,
  requireBackupAccess,
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Nombre de jours invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Paramètres invalides',
          errors: errors.array()
        });
      }

      const days = parseInt(req.query.days) || 30;
      const stats = await BackupService.getBackupStats(days);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur récupération statistiques backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }
);

// Restaurer un backup
router.post('/restore/:backupId',
  requireAuth,
  requireBackupManage,
  validateBackupRestore,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { backupId } = req.params;
      const { restoreDatabase = true, restoreConfig = false } = req.body;
      
      // Vérifier qu'aucun backup/restauration n'est en cours
      const status = BackupService.getStatus();
      if (status.isRunning) {
        return res.status(409).json({
          success: false,
          message: 'Une opération de backup/restauration est déjà en cours'
        });
      }

      // Démarrer la restauration de manière asynchrone
      BackupService.restoreBackup(backupId, {
        restoreDatabase,
        restoreConfig,
        userId: req.user.id
      })
        .then(() => {
          console.log(`Restauration ${backupId} terminée`);
        })
        .catch(error => {
          console.error('Erreur restauration asynchrone:', error);
        });

      res.status(202).json({
        success: true,
        message: `Restauration du backup ${backupId} démarrée`,
        data: {
          backupId,
          restoreDatabase,
          restoreConfig,
          startedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erreur restauration backup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la restauration du backup'
      });
    }
  }
);

// Nettoyer les anciens backups
router.post('/cleanup',
  requireAuth,
  requireBackupManage,
  async (req, res) => {
    try {
      const result = await BackupService.cleanupOldBackups();

      res.json({
        success: true,
        message: 'Nettoyage terminé',
        data: result
      });
    } catch (error) {
      console.error('Erreur nettoyage backups:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du nettoyage des backups'
      });
    }
  }
);

// Obtenir la configuration du service de backup
router.get('/config',
  requireAuth,
  requireBackupAccess,
  async (req, res) => {
    try {
      const status = BackupService.getStatus();
      
      res.json({
        success: true,
        data: {
          config: status.config,
          backupDir: status.backupDir
        }
      });
    } catch (error) {
      console.error('Erreur récupération config backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la configuration'
      });
    }
  }
);

// Mettre à jour la configuration du service de backup
router.put('/config',
  requireAuth,
  requireBackupManage,
  validateConfigUpdate,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Configuration invalide',
          errors: errors.array()
        });
      }

      const newConfig = req.body;
      const updatedConfig = await BackupService.updateConfig(newConfig);

      res.json({
        success: true,
        message: 'Configuration mise à jour',
        data: updatedConfig
      });
    } catch (error) {
      console.error('Erreur mise à jour config backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la configuration'
      });
    }
  }
);

// Vérifier l'intégrité d'un backup
router.post('/verify/:backupId',
  requireAuth,
  requireBackupAccess,
  param('backupId').notEmpty().withMessage('ID de backup requis'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID de backup invalide',
          errors: errors.array()
        });
      }

      const { backupId } = req.params;
      
      // Récupérer les métadonnées du backup
      const backups = await BackupService.getBackupList({ limit: 1000 });
      const backup = backups.find(b => b.backupId === backupId);
      
      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup non trouvé'
        });
      }

      // Vérifier l'intégrité
      const isValid = await BackupService.verifyBackupIntegrity(backup);

      res.json({
        success: true,
        data: {
          backupId,
          isValid,
          verifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erreur vérification backup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification du backup'
      });
    }
  }
);

// Télécharger un backup
router.get('/download/:backupId',
  requireAuth,
  requireBackupManage,
  param('backupId').notEmpty().withMessage('ID de backup requis'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID de backup invalide',
          errors: errors.array()
        });
      }

      const { backupId } = req.params;
      
      // Récupérer les métadonnées du backup
      const backups = await BackupService.getBackupList({ limit: 1000 });
      const backup = backups.find(b => b.backupId === backupId);
      
      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup non trouvé'
        });
      }

      if (backup.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Le backup n\'est pas dans un état valide pour le téléchargement'
        });
      }

      // Vérifier que le fichier existe
      const fs = require('fs').promises;
      try {
        await fs.access(backup.location.local);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Fichier de backup non trouvé sur le serveur'
        });
      }

      // Définir les headers pour le téléchargement
      res.setHeader('Content-Disposition', `attachment; filename="${backupId}.archive"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Streamer le fichier
      const fs_stream = require('fs');
      const fileStream = fs_stream.createReadStream(backup.location.local);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Erreur téléchargement backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du téléchargement du backup'
      });
    }
  }
);

// Supprimer un backup
router.delete('/:backupId',
  requireAuth,
  requireBackupManage,
  param('backupId').notEmpty().withMessage('ID de backup requis'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID de backup invalide',
          errors: errors.array()
        });
      }

      const { backupId } = req.params;
      
      // Récupérer les métadonnées du backup
      const backups = await BackupService.getBackupList({ limit: 1000 });
      const backup = backups.find(b => b.backupId === backupId);
      
      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup non trouvé'
        });
      }

      // Supprimer le fichier local
      const fs = require('fs').promises;
      try {
        if (backup.location.local) {
          await fs.unlink(backup.location.local);
        }
      } catch (error) {
        console.log('Fichier local déjà supprimé ou non trouvé');
      }

      // Supprimer de S3 si applicable
      if (backup.location.s3) {
        try {
          await BackupService.deleteFromS3(backup.location.s3);
        } catch (error) {
          console.error('Erreur suppression S3:', error);
        }
      }

      // Supprimer les métadonnées
      const BackupMetadata = require('mongoose').model('BackupMetadata');
      await BackupMetadata.deleteOne({ backupId });

      res.json({
        success: true,
        message: 'Backup supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du backup'
      });
    }
  }
);

// Obtenir les logs d'un backup spécifique
router.get('/:backupId/logs',
  requireAuth,
  requireBackupAccess,
  param('backupId').notEmpty().withMessage('ID de backup requis'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'ID de backup invalide',
          errors: errors.array()
        });
      }

      const { backupId } = req.params;
      
      // Récupérer les métadonnées du backup
      const backups = await BackupService.getBackupList({ limit: 1000 });
      const backup = backups.find(b => b.backupId === backupId);
      
      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup non trouvé'
        });
      }

      // Récupérer les logs d'audit liés à ce backup
      const AuditService = require('../services/auditService');
      const logs = await AuditService.getLogs({
        action: { $regex: 'backup' },
        'details.backupId': backupId
      }, {
        page: 1,
        limit: 100,
        sort: { timestamp: -1 }
      });

      res.json({
        success: true,
        data: {
          backup,
          logs: logs.logs
        }
      });
    } catch (error) {
      console.error('Erreur récupération logs backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des logs'
      });
    }
  }
);

module.exports = router;