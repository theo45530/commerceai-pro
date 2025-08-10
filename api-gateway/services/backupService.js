const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const cron = require('node-cron');
const AWS = require('aws-sdk');
const archiver = require('archiver');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');

// Configuration AWS S3 (optionnel)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

// Schema pour les métadonnées de backup
const BackupMetadataSchema = new mongoose.Schema({
  backupId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['full', 'incremental', 'differential'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  duration: Number, // en secondes
  size: Number, // en bytes
  collections: [{
    name: String,
    documentCount: Number,
    size: Number
  }],
  location: {
    local: String,
    s3: String,
    gcs: String // Google Cloud Storage
  },
  checksum: String,
  compression: {
    type: String,
    enum: ['none', 'gzip', 'bzip2'],
    default: 'gzip'
  },
  encryption: {
    enabled: Boolean,
    algorithm: String
  },
  retentionPolicy: {
    keepDays: Number,
    keepWeeks: Number,
    keepMonths: Number
  },
  error: {
    message: String,
    stack: String
  },
  metadata: {
    mongoVersion: String,
    nodeVersion: String,
    appVersion: String,
    environment: String
  }
}, {
  timestamps: true
});

const BackupMetadata = mongoose.model('BackupMetadata', BackupMetadataSchema);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.isRunning = false;
    this.currentBackup = null;
    
    // Configuration par défaut
    this.config = {
      retention: {
        daily: 7,    // Garder 7 backups quotidiens
        weekly: 4,   // Garder 4 backups hebdomadaires
        monthly: 12  // Garder 12 backups mensuels
      },
      compression: true,
      encryption: {
        enabled: process.env.BACKUP_ENCRYPTION === 'true',
        key: process.env.BACKUP_ENCRYPTION_KEY
      },
      storage: {
        local: true,
        s3: process.env.AWS_S3_BACKUP_BUCKET ? true : false,
        gcs: process.env.GCS_BACKUP_BUCKET ? true : false
      },
      schedule: {
        full: '0 2 * * 0',      // Dimanche à 2h
        incremental: '0 2 * * 1-6' // Lundi à Samedi à 2h
      }
    };
    
    this.initializeBackupDirectory();
    this.scheduleBackups();
  }

  async initializeBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`Répertoire de backup initialisé: ${this.backupDir}`);
    } catch (error) {
      console.error('Erreur initialisation répertoire backup:', error);
    }
  }

  scheduleBackups() {
    if (process.env.NODE_ENV === 'production') {
      // Backup complet hebdomadaire
      cron.schedule(this.config.schedule.full, () => {
        this.createBackup('full');
      });

      // Backup incrémental quotidien
      cron.schedule(this.config.schedule.incremental, () => {
        this.createBackup('incremental');
      });

      // Nettoyage des anciens backups
      cron.schedule('0 3 * * *', () => {
        this.cleanupOldBackups();
      });

      console.log('Planification des backups activée');
    }
  }

  async createBackup(type = 'full', options = {}) {
    if (this.isRunning) {
      throw new Error('Un backup est déjà en cours');
    }

    const backupId = this.generateBackupId(type);
    const startTime = new Date();

    try {
      this.isRunning = true;
      this.currentBackup = backupId;

      // Créer les métadonnées de backup
      const metadata = new BackupMetadata({
        backupId,
        type,
        startTime,
        status: 'running',
        metadata: {
          mongoVersion: await this.getMongoVersion(),
          nodeVersion: process.version,
          appVersion: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });
      await metadata.save();

      console.log(`Démarrage du backup ${type}: ${backupId}`);

      // Effectuer le backup selon le type
      let backupPath;
      if (type === 'full') {
        backupPath = await this.createFullBackup(backupId, options);
      } else if (type === 'incremental') {
        backupPath = await this.createIncrementalBackup(backupId, options);
      } else {
        throw new Error(`Type de backup non supporté: ${type}`);
      }

      // Calculer la taille et le checksum
      const stats = await fs.stat(backupPath);
      const checksum = await this.calculateChecksum(backupPath);

      // Uploader vers le cloud si configuré
      const cloudLocations = await this.uploadToCloud(backupPath, backupId);

      // Mettre à jour les métadonnées
      const endTime = new Date();
      metadata.status = 'completed';
      metadata.endTime = endTime;
      metadata.duration = Math.round((endTime - startTime) / 1000);
      metadata.size = stats.size;
      metadata.checksum = checksum;
      metadata.location = {
        local: backupPath,
        ...cloudLocations
      };
      metadata.collections = await this.getCollectionStats();
      await metadata.save();

      // Audit log
      await AuditService.log({
        action: 'backup.created',
        category: 'system',
        details: {
          backupId,
          type,
          size: stats.size,
          duration: metadata.duration
        },
        metadata: { automated: !options.manual }
      });

      // Notification
      await NotificationService.sendSystemNotification({
        type: 'info',
        title: 'Backup Complété',
        message: `Backup ${type} ${backupId} terminé avec succès`,
        metadata: {
          backupId,
          size: this.formatBytes(stats.size),
          duration: `${metadata.duration}s`
        }
      });

      console.log(`Backup ${backupId} terminé avec succès`);
      return metadata;

    } catch (error) {
      console.error(`Erreur backup ${backupId}:`, error);

      // Mettre à jour les métadonnées avec l'erreur
      try {
        const metadata = await BackupMetadata.findOne({ backupId });
        if (metadata) {
          metadata.status = 'failed';
          metadata.endTime = new Date();
          metadata.error = {
            message: error.message,
            stack: error.stack
          };
          await metadata.save();
        }
      } catch (updateError) {
        console.error('Erreur mise à jour métadonnées:', updateError);
      }

      // Notification d'erreur
      await NotificationService.sendSystemNotification({
        type: 'error',
        title: 'Échec du Backup',
        message: `Backup ${type} ${backupId} a échoué: ${error.message}`,
        metadata: { backupId, error: error.message }
      });

      throw error;
    } finally {
      this.isRunning = false;
      this.currentBackup = null;
    }
  }

  async createFullBackup(backupId, options = {}) {
    const backupPath = path.join(this.backupDir, `${backupId}.archive`);
    const tempDir = path.join(this.backupDir, `temp_${backupId}`);

    try {
      // Créer le répertoire temporaire
      await fs.mkdir(tempDir, { recursive: true });

      // Dump MongoDB
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/commerceai';
      const dumpPath = path.join(tempDir, 'mongodb');
      
      await execAsync(`mongodump --uri="${mongoUri}" --out="${dumpPath}"`);

      // Sauvegarder les fichiers de configuration
      await this.backupConfigFiles(tempDir);

      // Sauvegarder les logs récents
      await this.backupLogs(tempDir);

      // Créer l'archive
      await this.createArchive(tempDir, backupPath);

      // Nettoyer le répertoire temporaire
      await this.removeDirectory(tempDir);

      return backupPath;
    } catch (error) {
      // Nettoyer en cas d'erreur
      try {
        await this.removeDirectory(tempDir);
      } catch (cleanupError) {
        console.error('Erreur nettoyage:', cleanupError);
      }
      throw error;
    }
  }

  async createIncrementalBackup(backupId, options = {}) {
    // Pour un backup incrémental, on sauvegarde seulement les changements
    // depuis le dernier backup
    const lastBackup = await BackupMetadata.findOne({
      status: 'completed',
      type: { $in: ['full', 'incremental'] }
    }).sort({ createdAt: -1 });

    if (!lastBackup) {
      console.log('Aucun backup précédent trouvé, création d\'un backup complet');
      return this.createFullBackup(backupId, options);
    }

    const backupPath = path.join(this.backupDir, `${backupId}.archive`);
    const tempDir = path.join(this.backupDir, `temp_${backupId}`);
    const sinceDate = lastBackup.startTime;

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Dump incrémental MongoDB (collections modifiées depuis la dernière sauvegarde)
      await this.createIncrementalMongoDump(tempDir, sinceDate);

      // Sauvegarder les logs depuis la dernière sauvegarde
      await this.backupLogsSince(tempDir, sinceDate);

      // Créer l'archive
      await this.createArchive(tempDir, backupPath);

      // Nettoyer
      await this.removeDirectory(tempDir);

      return backupPath;
    } catch (error) {
      try {
        await this.removeDirectory(tempDir);
      } catch (cleanupError) {
        console.error('Erreur nettoyage:', cleanupError);
      }
      throw error;
    }
  }

  async createIncrementalMongoDump(tempDir, sinceDate) {
    // Pour MongoDB, on peut utiliser les oplog pour les changements incrémentaux
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/commerceai';
    const dumpPath = path.join(tempDir, 'mongodb_incremental');
    
    // Dump des oplogs depuis la date spécifiée
    const timestamp = Math.floor(sinceDate.getTime() / 1000);
    await execAsync(`mongodump --uri="${mongoUri}" --collection=oplog.rs --query="{ts:{\$gte:Timestamp(${timestamp},0)}}" --out="${dumpPath}"`);
  }

  async backupConfigFiles(tempDir) {
    const configDir = path.join(tempDir, 'config');
    await fs.mkdir(configDir, { recursive: true });

    // Sauvegarder les fichiers de configuration importants
    const configFiles = [
      '.env',
      'package.json',
      'package-lock.json',
      'docker-compose.yml',
      'Dockerfile'
    ];

    for (const file of configFiles) {
      try {
        const sourcePath = path.join(process.cwd(), file);
        const destPath = path.join(configDir, file);
        await fs.copyFile(sourcePath, destPath);
      } catch (error) {
        // Fichier optionnel, continuer
        console.log(`Fichier ${file} non trouvé, ignoré`);
      }
    }
  }

  async backupLogs(tempDir) {
    const logsDir = path.join(tempDir, 'logs');
    await fs.mkdir(logsDir, { recursive: true });

    // Sauvegarder les logs des 7 derniers jours
    const logSources = [
      path.join(process.cwd(), 'logs'),
      '/var/log/commerceai',
      path.join(process.cwd(), 'api-gateway/logs')
    ];

    for (const logSource of logSources) {
      try {
        const stats = await fs.stat(logSource);
        if (stats.isDirectory()) {
          await this.copyDirectory(logSource, path.join(logsDir, path.basename(logSource)));
        }
      } catch (error) {
        // Répertoire optionnel
        console.log(`Répertoire de logs ${logSource} non trouvé`);
      }
    }
  }

  async backupLogsSince(tempDir, sinceDate) {
    const logsDir = path.join(tempDir, 'logs_incremental');
    await fs.mkdir(logsDir, { recursive: true });

    // Sauvegarder seulement les logs modifiés depuis la date
    // Implementation simplifiée - dans un vrai système, on filtrerait par date de modification
    await this.backupLogs(tempDir);
  }

  async createArchive(sourceDir, archivePath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(archivePath);
      const archive = archiver('tar', {
        gzip: this.config.compression
      });

      output.on('close', () => {
        console.log(`Archive créée: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async uploadToCloud(localPath, backupId) {
    const locations = {};

    // Upload vers S3
    if (this.config.storage.s3 && process.env.AWS_S3_BACKUP_BUCKET) {
      try {
        const fileContent = await fs.readFile(localPath);
        const s3Key = `backups/${new Date().getFullYear()}/${backupId}.archive`;
        
        await s3.upload({
          Bucket: process.env.AWS_S3_BACKUP_BUCKET,
          Key: s3Key,
          Body: fileContent,
          ServerSideEncryption: 'AES256'
        }).promise();
        
        locations.s3 = `s3://${process.env.AWS_S3_BACKUP_BUCKET}/${s3Key}`;
        console.log(`Backup uploadé vers S3: ${locations.s3}`);
      } catch (error) {
        console.error('Erreur upload S3:', error);
      }
    }

    // Upload vers Google Cloud Storage (à implémenter si nécessaire)
    if (this.config.storage.gcs && process.env.GCS_BACKUP_BUCKET) {
      // Implementation GCS
    }

    return locations;
  }

  async restoreBackup(backupId, options = {}) {
    const metadata = await BackupMetadata.findOne({ backupId });
    if (!metadata) {
      throw new Error(`Backup ${backupId} non trouvé`);
    }

    if (metadata.status !== 'completed') {
      throw new Error(`Backup ${backupId} n'est pas dans un état valide pour la restauration`);
    }

    console.log(`Démarrage de la restauration du backup ${backupId}`);

    try {
      // Vérifier l'intégrité du backup
      await this.verifyBackupIntegrity(metadata);

      // Télécharger depuis le cloud si nécessaire
      let backupPath = metadata.location.local;
      if (!await this.fileExists(backupPath) && metadata.location.s3) {
        backupPath = await this.downloadFromS3(metadata.location.s3, backupId);
      }

      // Extraire l'archive
      const extractDir = path.join(this.backupDir, `restore_${backupId}`);
      await this.extractArchive(backupPath, extractDir);

      // Restaurer MongoDB
      if (options.restoreDatabase !== false) {
        await this.restoreMongoDatabase(extractDir, metadata.type);
      }

      // Restaurer les fichiers de configuration
      if (options.restoreConfig) {
        await this.restoreConfigFiles(extractDir);
      }

      // Nettoyer
      await this.removeDirectory(extractDir);

      // Audit log
      await AuditService.log({
        action: 'backup.restored',
        category: 'system',
        details: {
          backupId,
          type: metadata.type,
          restoredBy: options.userId || 'system'
        }
      });

      console.log(`Restauration du backup ${backupId} terminée`);
      return true;

    } catch (error) {
      console.error(`Erreur restauration backup ${backupId}:`, error);
      throw error;
    }
  }

  async verifyBackupIntegrity(metadata) {
    if (!metadata.location.local || !await this.fileExists(metadata.location.local)) {
      throw new Error('Fichier de backup local non trouvé');
    }

    // Vérifier le checksum
    if (metadata.checksum) {
      const currentChecksum = await this.calculateChecksum(metadata.location.local);
      if (currentChecksum !== metadata.checksum) {
        throw new Error('Checksum du backup invalide - fichier corrompu');
      }
    }

    return true;
  }

  async getBackupList(options = {}) {
    const filter = {};
    if (options.type) filter.type = options.type;
    if (options.status) filter.status = options.status;
    if (options.startDate) filter.startTime = { $gte: new Date(options.startDate) };
    if (options.endDate) {
      filter.startTime = filter.startTime || {};
      filter.startTime.$lte = new Date(options.endDate);
    }

    const backups = await BackupMetadata.find(filter)
      .sort({ startTime: -1 })
      .limit(options.limit || 50);

    return backups;
  }

  async getBackupStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await BackupMetadata.aggregate([
      {
        $match: {
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const totalBackups = await BackupMetadata.countDocuments({
      startTime: { $gte: startDate }
    });

    const latestBackup = await BackupMetadata.findOne({
      status: 'completed'
    }).sort({ startTime: -1 });

    return {
      period: `${days} derniers jours`,
      totalBackups,
      stats,
      latestBackup,
      storageUsed: await this.calculateStorageUsage()
    };
  }

  async cleanupOldBackups() {
    console.log('Démarrage du nettoyage des anciens backups');

    try {
      const now = new Date();
      const retention = this.config.retention;

      // Supprimer les backups quotidiens de plus de X jours
      const dailyCutoff = new Date(now.getTime() - (retention.daily * 24 * 60 * 60 * 1000));
      const oldDailyBackups = await BackupMetadata.find({
        type: 'incremental',
        startTime: { $lt: dailyCutoff }
      });

      // Supprimer les backups hebdomadaires de plus de X semaines
      const weeklyCutoff = new Date(now.getTime() - (retention.weekly * 7 * 24 * 60 * 60 * 1000));
      const oldWeeklyBackups = await BackupMetadata.find({
        type: 'full',
        startTime: { $lt: weeklyCutoff }
      });

      const backupsToDelete = [...oldDailyBackups, ...oldWeeklyBackups];
      let deletedCount = 0;
      let freedSpace = 0;

      for (const backup of backupsToDelete) {
        try {
          // Supprimer le fichier local
          if (backup.location.local && await this.fileExists(backup.location.local)) {
            await fs.unlink(backup.location.local);
            freedSpace += backup.size || 0;
          }

          // Supprimer de S3
          if (backup.location.s3) {
            await this.deleteFromS3(backup.location.s3);
          }

          // Supprimer les métadonnées
          await BackupMetadata.deleteOne({ _id: backup._id });
          deletedCount++;

        } catch (error) {
          console.error(`Erreur suppression backup ${backup.backupId}:`, error);
        }
      }

      console.log(`Nettoyage terminé: ${deletedCount} backups supprimés, ${this.formatBytes(freedSpace)} libérés`);

      // Audit log
      await AuditService.log({
        action: 'backup.cleanup',
        category: 'system',
        details: {
          deletedCount,
          freedSpace
        }
      });

      return { deletedCount, freedSpace };

    } catch (error) {
      console.error('Erreur nettoyage backups:', error);
      throw error;
    }
  }

  // Méthodes utilitaires

  generateBackupId(type) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getMongoVersion() {
    try {
      const admin = mongoose.connection.db.admin();
      const result = await admin.buildInfo();
      return result.version;
    } catch (error) {
      return 'unknown';
    }
  }

  async getCollectionStats() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const stats = [];

      for (const collection of collections) {
        const collStats = await mongoose.connection.db.collection(collection.name).stats();
        stats.push({
          name: collection.name,
          documentCount: collStats.count,
          size: collStats.size
        });
      }

      return stats;
    } catch (error) {
      console.error('Erreur récupération stats collections:', error);
      return [];
    }
  }

  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  async calculateStorageUsage() {
    try {
      const files = await fs.readdir(this.backupDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async removeDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Erreur suppression répertoire ${dirPath}:`, error);
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async deleteFromS3(s3Url) {
    try {
      const url = new URL(s3Url.replace('s3://', 'https://'));
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1);

      await s3.deleteObject({
        Bucket: bucket,
        Key: key
      }).promise();

      console.log(`Backup supprimé de S3: ${s3Url}`);
    } catch (error) {
      console.error('Erreur suppression S3:', error);
    }
  }

  async downloadFromS3(s3Url, backupId) {
    try {
      const url = new URL(s3Url.replace('s3://', 'https://'));
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1);

      const localPath = path.join(this.backupDir, `${backupId}_downloaded.archive`);
      
      const data = await s3.getObject({
        Bucket: bucket,
        Key: key
      }).promise();

      await fs.writeFile(localPath, data.Body);
      console.log(`Backup téléchargé depuis S3: ${localPath}`);
      
      return localPath;
    } catch (error) {
      console.error('Erreur téléchargement S3:', error);
      throw error;
    }
  }

  async extractArchive(archivePath, extractDir) {
    await fs.mkdir(extractDir, { recursive: true });
    await execAsync(`tar -xzf "${archivePath}" -C "${extractDir}"`);
  }

  async restoreMongoDatabase(extractDir, backupType) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/commerceai';
    
    if (backupType === 'full') {
      const dumpPath = path.join(extractDir, 'mongodb');
      await execAsync(`mongorestore --uri="${mongoUri}" --drop "${dumpPath}"`);
    } else if (backupType === 'incremental') {
      // Restauration incrémentale via oplog
      const dumpPath = path.join(extractDir, 'mongodb_incremental');
      await execAsync(`mongorestore --uri="${mongoUri}" --oplogReplay "${dumpPath}"`);
    }
  }

  async restoreConfigFiles(extractDir) {
    const configDir = path.join(extractDir, 'config');
    if (await this.fileExists(configDir)) {
      const files = await fs.readdir(configDir);
      for (const file of files) {
        const sourcePath = path.join(configDir, file);
        const destPath = path.join(process.cwd(), file);
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  // Méthodes publiques pour l'API

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentBackup: this.currentBackup,
      config: this.config,
      backupDir: this.backupDir
    };
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Audit log
    await AuditService.log({
      action: 'backup.config_updated',
      category: 'system',
      details: { newConfig }
    });

    return this.config;
  }
}

module.exports = new BackupService();