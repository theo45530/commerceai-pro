const crypto = require('crypto');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');
const EncryptionService = require('./encryptionService');
const logger = require('../utils/logger');

// Schéma pour les configurations SSO
const ssoConfigSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'],
    required: true
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  configuration: {
    clientId: {
      type: String,
      required: true
    },
    clientSecret: {
      type: String,
      required: true // Sera chiffré
    },
    redirectUri: {
      type: String,
      required: true
    },
    scopes: [{
      type: String
    }],
    additionalParams: {
      type: Map,
      of: String
    }
  },
  domainRestrictions: [{
    type: String, // Domaines autorisés (ex: @company.com)
    lowercase: true
  }],
  userMapping: {
    emailField: {
      type: String,
      default: 'email'
    },
    nameField: {
      type: String,
      default: 'name'
    },
    firstNameField: String,
    lastNameField: String,
    avatarField: String,
    customFields: {
      type: Map,
      of: String
    }
  },
  autoProvision: {
    enabled: {
      type: Boolean,
      default: true
    },
    defaultRole: {
      type: String,
      default: 'user'
    },
    defaultPermissions: [{
      type: String
    }]
  },
  security: {
    requireEmailVerification: {
      type: Boolean,
      default: false
    },
    allowedIPs: [{
      type: String
    }],
    sessionTimeout: {
      type: Number,
      default: 24 * 60 * 60 * 1000 // 24 heures
    }
  },
  statistics: {
    totalLogins: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    failedAttempts: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index composé pour optimiser les requêtes
ssoConfigSchema.index({ organizationId: 1, provider: 1 }, { unique: true });
ssoConfigSchema.index({ 'configuration.clientId': 1 });

const SSOConfig = mongoose.model('SSOConfig', ssoConfigSchema);

// Schéma pour les sessions SSO
const ssoSessionSchema = new mongoose.Schema({
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
  provider: {
    type: String,
    enum: ['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'],
    required: true
  },
  providerUserId: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true // Sera chiffré
  },
  refreshToken: {
    type: String // Sera chiffré
  },
  tokenExpiresAt: Date,
  scopes: [{
    type: String
  }],
  userInfo: {
    email: String,
    name: String,
    avatar: String,
    profile: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  ipAddress: String,
  userAgent: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
ssoSessionSchema.index({ userId: 1, provider: 1 });
ssoSessionSchema.index({ sessionId: 1, isActive: 1 });
ssoSessionSchema.index({ providerUserId: 1, provider: 1 });

const SSOSession = mongoose.model('SSOSession', ssoSessionSchema);

// Schéma pour les liens de comptes
const accountLinkSchema = new mongoose.Schema({
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
  provider: {
    type: String,
    enum: ['google', 'microsoft', 'github', 'azure', 'okta', 'auth0'],
    required: true
  },
  providerUserId: {
    type: String,
    required: true
  },
  providerEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  providerProfile: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  linkedAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date,
  metadata: {
    linkMethod: {
      type: String,
      enum: ['registration', 'manual_link', 'admin_link'],
      default: 'registration'
    },
    verificationMethod: String
  }
}, {
  timestamps: true
});

// Index composé pour éviter les doublons
accountLinkSchema.index({ userId: 1, provider: 1 }, { unique: true });
accountLinkSchema.index({ providerUserId: 1, provider: 1 }, { unique: true });
accountLinkSchema.index({ providerEmail: 1, provider: 1 });

const AccountLink = mongoose.model('AccountLink', accountLinkSchema);

class SSOService {
  constructor() {
    this.providers = {
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile']
      },
      microsoft: {
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'email', 'profile', 'User.Read']
      },
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['user:email']
      }
    };
    
    this.stateExpiry = 10 * 60 * 1000; // 10 minutes
    this.sessionExpiry = 24 * 60 * 60 * 1000; // 24 heures
  }

  /**
   * Configurer un fournisseur SSO pour une organisation
   * @param {string} organizationId - ID de l'organisation
   * @param {string} provider - Fournisseur SSO
   * @param {object} config - Configuration du fournisseur
   * @returns {Promise<object>} Configuration créée
   */
  async configureSSOProvider(organizationId, provider, config) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Fournisseur SSO non supporté: ${provider}`);
      }

      // Chiffrer le client secret
      const encryptedSecret = await EncryptionService.encrypt(
        config.clientSecret,
        'sso_config',
        { organizationId, provider }
      );

      // Vérifier si une configuration existe déjà
      let ssoConfig = await SSOConfig.findOne({ organizationId, provider });
      
      if (ssoConfig) {
        // Mettre à jour la configuration existante
        ssoConfig.configuration = {
          ...config,
          clientSecret: encryptedSecret
        };
        ssoConfig.isEnabled = config.isEnabled !== undefined ? config.isEnabled : true;
        ssoConfig.domainRestrictions = config.domainRestrictions || [];
        ssoConfig.userMapping = { ...ssoConfig.userMapping, ...config.userMapping };
        ssoConfig.autoProvision = { ...ssoConfig.autoProvision, ...config.autoProvision };
        ssoConfig.security = { ...ssoConfig.security, ...config.security };
      } else {
        // Créer une nouvelle configuration
        ssoConfig = new SSOConfig({
          organizationId,
          provider,
          isEnabled: config.isEnabled !== undefined ? config.isEnabled : true,
          configuration: {
            ...config,
            clientSecret: encryptedSecret,
            scopes: config.scopes || this.providers[provider].scopes
          },
          domainRestrictions: config.domainRestrictions || [],
          userMapping: {
            emailField: 'email',
            nameField: 'name',
            ...config.userMapping
          },
          autoProvision: {
            enabled: true,
            defaultRole: 'user',
            ...config.autoProvision
          },
          security: {
            requireEmailVerification: false,
            sessionTimeout: this.sessionExpiry,
            ...config.security
          }
        });
      }

      await ssoConfig.save();

      // Audit log
      await AuditService.log({
        action: 'sso.provider_configured',
        category: 'security',
        organizationId,
        details: {
          provider,
          clientId: config.clientId,
          isEnabled: ssoConfig.isEnabled,
          autoProvision: ssoConfig.autoProvision.enabled
        },
        riskLevel: 'medium'
      });

      console.log(`Configuration SSO ${provider} mise à jour pour l'organisation ${organizationId}`);

      // Retourner la configuration sans le secret
      const result = ssoConfig.toObject();
      delete result.configuration.clientSecret;
      
      return result;

    } catch (error) {
      console.error('Erreur configuration SSO:', error);
      throw error;
    }
  }

  /**
   * Générer une URL d'authentification SSO
   * @param {string} organizationId - ID de l'organisation
   * @param {string} provider - Fournisseur SSO
   * @param {object} options - Options supplémentaires
   * @returns {Promise<object>} URL d'authentification et état
   */
  async generateAuthUrl(organizationId, provider, options = {}) {
    try {
      const ssoConfig = await this.getSSOConfig(organizationId, provider);
      
      if (!ssoConfig || !ssoConfig.isEnabled) {
        throw new Error(`SSO ${provider} non configuré ou désactivé`);
      }

      const providerConfig = this.providers[provider];
      const state = await this.generateState(organizationId, provider, options);
      
      const params = new URLSearchParams({
        client_id: ssoConfig.configuration.clientId,
        redirect_uri: ssoConfig.configuration.redirectUri,
        response_type: 'code',
        scope: ssoConfig.configuration.scopes.join(' '),
        state,
        ...ssoConfig.configuration.additionalParams
      });

      // Paramètres spécifiques par fournisseur
      if (provider === 'microsoft') {
        params.set('response_mode', 'query');
      } else if (provider === 'github') {
        params.set('allow_signup', 'false');
      }

      const authUrl = `${providerConfig.authUrl}?${params.toString()}`;

      console.log(`URL d'authentification SSO générée pour ${provider}`);

      return {
        authUrl,
        state,
        expiresAt: new Date(Date.now() + this.stateExpiry)
      };

    } catch (error) {
      console.error('Erreur génération URL auth SSO:', error);
      throw error;
    }
  }

  /**
   * Traiter le callback d'authentification SSO
   * @param {string} code - Code d'autorisation
   * @param {string} state - État de sécurité
   * @param {object} options - Options supplémentaires
   * @returns {Promise<object>} Résultat de l'authentification
   */
  async handleCallback(code, state, options = {}) {
    try {
      // Vérifier et décoder l'état
      const stateData = await this.verifyState(state);
      const { organizationId, provider } = stateData;

      const ssoConfig = await this.getSSOConfig(organizationId, provider);
      if (!ssoConfig || !ssoConfig.isEnabled) {
        throw new Error(`SSO ${provider} non configuré ou désactivé`);
      }

      // Échanger le code contre un token
      const tokenData = await this.exchangeCodeForToken(code, ssoConfig, provider);
      
      // Récupérer les informations utilisateur
      const userInfo = await this.getUserInfo(tokenData.access_token, provider);
      
      // Vérifier les restrictions de domaine
      await this.validateDomainRestrictions(userInfo.email, ssoConfig);
      
      // Trouver ou créer l'utilisateur
      const user = await this.findOrCreateUser(userInfo, ssoConfig, provider, options);
      
      // Créer la session SSO
      const session = await this.createSSOSession(user, tokenData, userInfo, provider, options);
      
      // Générer le JWT pour l'application
      const appToken = await this.generateAppToken(user, session);

      // Audit log
      await AuditService.log({
        action: 'auth.sso_login',
        category: 'security',
        actorId: user._id,
        organizationId,
        details: {
          provider,
          providerUserId: userInfo.id,
          email: userInfo.email,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        },
        riskLevel: 'low'
      });

      console.log(`Connexion SSO réussie pour l'utilisateur ${user._id} via ${provider}`);

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        },
        token: appToken,
        session: {
          id: session.sessionId,
          provider,
          expiresAt: session.expiresAt
        }
      };

    } catch (error) {
      console.error('Erreur callback SSO:', error);
      throw error;
    }
  }

  /**
   * Lier un compte SSO à un utilisateur existant
   * @param {string} userId - ID de l'utilisateur
   * @param {string} provider - Fournisseur SSO
   * @param {string} code - Code d'autorisation
   * @param {string} state - État de sécurité
   * @returns {Promise<object>} Résultat du lien
   */
  async linkAccount(userId, provider, code, state) {
    try {
      const stateData = await this.verifyState(state);
      const { organizationId } = stateData;

      const User = mongoose.model('User');
      const user = await User.findById(userId).select('organizationId email');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.organizationId.toString() !== organizationId) {
        throw new Error('Organisation non autorisée');
      }

      const ssoConfig = await this.getSSOConfig(organizationId, provider);
      if (!ssoConfig) {
        throw new Error(`SSO ${provider} non configuré`);
      }

      // Échanger le code contre un token
      const tokenData = await this.exchangeCodeForToken(code, ssoConfig, provider);
      
      // Récupérer les informations utilisateur
      const userInfo = await this.getUserInfo(tokenData.access_token, provider);
      
      // Vérifier si ce compte n'est pas déjà lié
      const existingLink = await AccountLink.findOne({
        $or: [
          { userId, provider },
          { providerUserId: userInfo.id, provider }
        ]
      });

      if (existingLink) {
        throw new Error('Ce compte est déjà lié');
      }

      // Créer le lien de compte
      const accountLink = new AccountLink({
        userId,
        organizationId,
        provider,
        providerUserId: userInfo.id,
        providerEmail: userInfo.email,
        providerProfile: userInfo,
        isVerified: true,
        metadata: {
          linkMethod: 'manual_link'
        }
      });

      await accountLink.save();

      // Audit log
      await AuditService.log({
        action: 'auth.account_linked',
        category: 'security',
        actorId: userId,
        organizationId,
        details: {
          provider,
          providerUserId: userInfo.id,
          providerEmail: userInfo.email
        },
        riskLevel: 'low'
      });

      console.log(`Compte ${provider} lié à l'utilisateur ${userId}`);

      return {
        success: true,
        message: 'Compte lié avec succès',
        link: {
          provider,
          providerEmail: userInfo.email,
          linkedAt: accountLink.linkedAt
        }
      };

    } catch (error) {
      console.error('Erreur liaison compte SSO:', error);
      throw error;
    }
  }

  // Méthodes utilitaires

  async getSSOConfig(organizationId, provider) {
    const config = await SSOConfig.findOne({ organizationId, provider });
    if (config && config.configuration.clientSecret) {
      // Déchiffrer le secret
      config.configuration.clientSecret = await EncryptionService.decrypt(
        config.configuration.clientSecret,
        'sso_config'
      );
    }
    return config;
  }

  async generateState(organizationId, provider, options = {}) {
    const stateData = {
      organizationId,
      provider,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
      ...options
    };

    const stateString = JSON.stringify(stateData);
    const state = Buffer.from(stateString).toString('base64url');
    
    return state;
  }

  async verifyState(state) {
    try {
      const stateString = Buffer.from(state, 'base64url').toString('utf8');
      const stateData = JSON.parse(stateString);
      
      // Vérifier l'expiration
      if (Date.now() - stateData.timestamp > this.stateExpiry) {
        throw new Error('État expiré');
      }
      
      return stateData;
    } catch (error) {
      throw new Error('État invalide');
    }
  }

  async exchangeCodeForToken(code, ssoConfig, provider) {
    try {
      const providerConfig = this.providers[provider];
      
      const tokenParams = {
        client_id: ssoConfig.configuration.clientId,
        client_secret: ssoConfig.configuration.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: ssoConfig.configuration.redirectUri
      };

      const response = await axios.post(providerConfig.tokenUrl, tokenParams, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.data.access_token) {
        throw new Error('Token d\'accès non reçu');
      }

      return response.data;

    } catch (error) {
      console.error('Erreur échange code/token:', error);
      throw new Error('Échec de l\'échange code/token');
    }
  }

  async getUserInfo(accessToken, provider) {
    try {
      const providerConfig = this.providers[provider];
      
      const response = await axios.get(providerConfig.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const userInfo = response.data;
      
      // Normaliser les données selon le fournisseur
      return this.normalizeUserInfo(userInfo, provider);

    } catch (error) {
      console.error('Erreur récupération info utilisateur:', error);
      throw new Error('Échec de la récupération des informations utilisateur');
    }
  }

  normalizeUserInfo(userInfo, provider) {
    const normalized = {
      id: userInfo.id || userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture || userInfo.avatar_url,
      raw: userInfo
    };

    switch (provider) {
      case 'google':
        normalized.firstName = userInfo.given_name;
        normalized.lastName = userInfo.family_name;
        break;
      case 'microsoft':
        normalized.firstName = userInfo.givenName;
        normalized.lastName = userInfo.surname;
        normalized.name = userInfo.displayName;
        break;
      case 'github':
        normalized.name = userInfo.name || userInfo.login;
        normalized.username = userInfo.login;
        break;
    }

    return normalized;
  }

  async validateDomainRestrictions(email, ssoConfig) {
    if (!ssoConfig.domainRestrictions || ssoConfig.domainRestrictions.length === 0) {
      return; // Pas de restrictions
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    const isAllowed = ssoConfig.domainRestrictions.some(domain => {
      if (domain.startsWith('@')) {
        return emailDomain === domain.substring(1);
      }
      return emailDomain === domain;
    });

    if (!isAllowed) {
      throw new Error(`Domaine email non autorisé: ${emailDomain}`);
    }
  }

  async findOrCreateUser(userInfo, ssoConfig, provider, options = {}) {
    try {
      const User = mongoose.model('User');
      
      // Chercher un utilisateur existant par email
      let user = await User.findOne({ 
        email: userInfo.email,
        organizationId: ssoConfig.organizationId
      });

      if (user) {
        // Utilisateur existant - créer/mettre à jour le lien de compte
        await this.updateAccountLink(user._id, userInfo, provider, ssoConfig.organizationId);
        return user;
      }

      // Vérifier si l'auto-provisioning est activé
      if (!ssoConfig.autoProvision.enabled) {
        throw new Error('Auto-provisioning désactivé. Contactez votre administrateur.');
      }

      // Créer un nouvel utilisateur
      user = new User({
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        avatar: userInfo.avatar,
        organizationId: ssoConfig.organizationId,
        emailVerified: !ssoConfig.security.requireEmailVerification,
        emailVerifiedAt: !ssoConfig.security.requireEmailVerification ? new Date() : undefined,
        role: ssoConfig.autoProvision.defaultRole,
        permissions: ssoConfig.autoProvision.defaultPermissions || [],
        authMethod: 'sso',
        ssoProvider: provider,
        isActive: true,
        metadata: {
          registrationSource: 'sso',
          ssoProvider: provider,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        }
      });

      await user.save();

      // Créer le lien de compte
      await this.createAccountLink(user._id, userInfo, provider, ssoConfig.organizationId, 'registration');

      console.log(`Nouvel utilisateur créé via SSO ${provider}: ${user._id}`);
      
      return user;

    } catch (error) {
      console.error('Erreur création/recherche utilisateur SSO:', error);
      throw error;
    }
  }

  async createAccountLink(userId, userInfo, provider, organizationId, linkMethod = 'registration') {
    const accountLink = new AccountLink({
      userId,
      organizationId,
      provider,
      providerUserId: userInfo.id,
      providerEmail: userInfo.email,
      providerProfile: userInfo.raw,
      isVerified: true,
      isPrimary: true,
      metadata: {
        linkMethod
      }
    });

    await accountLink.save();
    return accountLink;
  }

  async updateAccountLink(userId, userInfo, provider, organizationId) {
    let accountLink = await AccountLink.findOne({ userId, provider });
    
    if (accountLink) {
      accountLink.providerProfile = userInfo.raw;
      accountLink.lastUsed = new Date();
      await accountLink.save();
    } else {
      accountLink = await this.createAccountLink(userId, userInfo, provider, organizationId, 'manual_link');
    }
    
    return accountLink;
  }

  async createSSOSession(user, tokenData, userInfo, provider, options = {}) {
    try {
      // Chiffrer les tokens
      const encryptedAccessToken = await EncryptionService.encrypt(
        tokenData.access_token,
        'sso_token',
        { userId: user._id, provider }
      );
      
      const encryptedRefreshToken = tokenData.refresh_token ? 
        await EncryptionService.encrypt(
          tokenData.refresh_token,
          'sso_token',
          { userId: user._id, provider }
        ) : null;

      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + this.sessionExpiry);

      const session = new SSOSession({
        userId: user._id,
        organizationId: user.organizationId,
        provider,
        providerUserId: userInfo.id,
        sessionId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokenData.expires_in ? 
          new Date(Date.now() + tokenData.expires_in * 1000) : null,
        scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
        userInfo: {
          email: userInfo.email,
          name: userInfo.name,
          avatar: userInfo.avatar,
          profile: userInfo.raw
        },
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        expiresAt
      });

      await session.save();

      // Mettre à jour les statistiques
      await SSOConfig.findOneAndUpdate(
        { organizationId: user.organizationId, provider },
        {
          $inc: { 'statistics.totalLogins': 1 },
          $set: { 'statistics.lastUsed': new Date() }
        }
      );

      return session;

    } catch (error) {
      console.error('Erreur création session SSO:', error);
      throw error;
    }
  }

  async generateAppToken(user, session) {
    const payload = {
      userId: user._id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      permissions: user.permissions,
      sessionId: session.sessionId,
      authMethod: 'sso',
      provider: session.provider
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'commerceai-sso',
      audience: 'commerceai-app'
    });
  }

  /**
   * Déconnecter une session SSO
   * @param {string} sessionId - ID de la session
   * @returns {Promise<boolean>} Succès de la déconnexion
   */
  async logout(sessionId) {
    try {
      const session = await SSOSession.findOne({ sessionId, isActive: true });
      
      if (session) {
        session.isActive = false;
        await session.save();
        
        console.log(`Session SSO ${sessionId} déconnectée`);
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('Erreur déconnexion SSO:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques SSO
   * @param {string} organizationId - ID de l'organisation
   * @returns {Promise<object>} Statistiques SSO
   */
  async getSSOStatistics(organizationId) {
    try {
      const [configs, sessions, links] = await Promise.all([
        SSOConfig.find({ organizationId }),
        SSOSession.aggregate([
          { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
          {
            $group: {
              _id: '$provider',
              totalSessions: { $sum: 1 },
              activeSessions: { $sum: { $cond: ['$isActive', 1, 0] } },
              lastActivity: { $max: '$lastActivity' }
            }
          }
        ]),
        AccountLink.aggregate([
          { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
          {
            $group: {
              _id: '$provider',
              totalLinks: { $sum: 1 },
              verifiedLinks: { $sum: { $cond: ['$isVerified', 1, 0] } }
            }
          }
        ])
      ]);

      const statistics = {
        providers: {},
        totals: {
          configuredProviders: configs.length,
          enabledProviders: configs.filter(c => c.isEnabled).length,
          totalLogins: 0,
          totalUsers: 0
        }
      };

      // Compiler les statistiques par fournisseur
      configs.forEach(config => {
        const provider = config.provider;
        const sessionStats = sessions.find(s => s._id === provider) || {};
        const linkStats = links.find(l => l._id === provider) || {};

        statistics.providers[provider] = {
          isEnabled: config.isEnabled,
          totalLogins: config.statistics.totalLogins,
          lastUsed: config.statistics.lastUsed,
          activeSessions: sessionStats.activeSessions || 0,
          totalSessions: sessionStats.totalSessions || 0,
          linkedAccounts: linkStats.totalLinks || 0,
          verifiedAccounts: linkStats.verifiedLinks || 0
        };

        statistics.totals.totalLogins += config.statistics.totalLogins;
        statistics.totals.totalUsers += linkStats.totalLinks || 0;
      });

      return statistics;

    } catch (error) {
      console.error('Erreur récupération statistiques SSO:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les sessions expirées
   * @returns {Promise<number>} Nombre de sessions supprimées
   */
  async cleanupExpiredSessions() {
    try {
      const result = await SSOSession.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
      });

      console.log(`${result.deletedCount} sessions SSO expirées supprimées`);
      return result.deletedCount;

    } catch (error) {
      console.error('Erreur nettoyage sessions SSO:', error);
      throw error;
    }
  }
}

module.exports = new SSOService();