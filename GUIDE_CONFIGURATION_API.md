# Guide de Configuration des APIs

Ce guide explique comment configurer chaque plateforme API pour CommerceAI Pro.

## 🔧 Plateformes Entièrement Configurées

### ✅ Meta Ads (Facebook/Instagram)
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/meta-ads.js`
- **API**: Facebook Graph API v18.0
- **Fonctionnalités**: Campagnes publicitaires, audiences, pixel de conversion

**Configuration requise**:
1. Créer une app Facebook Developer
2. Obtenir l'Access Token
3. Configurer l'Ad Account ID
4. Ajouter le Pixel ID (optionnel)

### ✅ WhatsApp Business
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/whatsapp.js`
- **API**: WhatsApp Business API via Facebook Graph
- **Fonctionnalités**: Messages automatiques, templates, médias

**Configuration requise**:
1. Compte WhatsApp Business
2. Access Token Facebook
3. Phone Number ID
4. Business Account ID

### ✅ TikTok Ads
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/tiktok.js`
- **API**: TikTok Open API
- **Fonctionnalités**: Publication de contenu, upload vidéos

**Configuration requise**:
1. TikTok Developer Account
2. Client Key et Client Secret
3. Access Token
4. Open ID

### ✅ Google Ads
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/google-ads.js`
- **API**: Google Ads API v14
- **Fonctionnalités**: Campagnes Google Ads, YouTube Ads

**Configuration requise**:
1. Google Cloud Project
2. Google Ads Developer Token
3. Client ID et Client Secret
4. Refresh Token
5. Customer ID

### ✅ LinkedIn
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/linkedin.js`
- **API**: LinkedIn API v2
- **Fonctionnalités**: Publication de contenu, upload d'images

**Configuration requise**:
1. LinkedIn Developer App
2. Client ID et Client Secret
3. Access Token
4. Person ID ou Organization ID

### ✅ Twitter
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/twitter.js`
- **API**: Twitter API v2
- **Fonctionnalités**: Publication de tweets, médias

**Configuration requise**:
1. Twitter Developer Account
2. API Key et API Secret
3. Access Token et Access Token Secret
4. Bearer Token (optionnel)

### ✅ Shopify
**Status**: Prêt à utiliser
- **Connecteur**: `platform-connectors/shopify.js`
- **API**: Shopify Admin API
- **Fonctionnalités**: Synchronisation produits, commandes, inventaire

**Configuration requise**:
1. Boutique Shopify
2. App privée ou publique
3. Access Token
4. Shop Domain

### ✅ Gmail (Nouveau)
**Status**: Nouvellement ajouté
- **Connecteur**: `platform-connectors/gmail.js`
- **API**: Gmail API via Google APIs
- **Fonctionnalités**: Envoi d'emails, templates, newsletters

**Configuration requise**:
1. Google Cloud Project
2. Gmail API activée
3. Client ID et Client Secret
4. Refresh Token

## 🚀 Comment Configurer Gmail

### Étape 1: Google Cloud Console
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un existant
3. Activer l'API Gmail
4. Créer des credentials OAuth 2.0

### Étape 2: Configuration OAuth
```bash
# URLs de redirection autorisées
http://localhost:4000/api/auth/gmail/callback
https://votre-domaine.com/api/auth/gmail/callback
```

### Étape 3: Obtenir le Refresh Token
```javascript
// Utiliser Google OAuth Playground ou votre propre flow
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  scope=https://www.googleapis.com/auth/gmail.send&
  response_type=code&
  access_type=offline&
  prompt=consent`;
```

## 📋 Ce qu'il faut faire pour chaque plateforme

### Actions requises de votre côté:

1. **Créer les comptes développeur** pour chaque plateforme
2. **Configurer les applications** avec les bonnes permissions
3. **Obtenir les credentials** (tokens, secrets, IDs)
4. **Configurer les webhooks** si nécessaire
5. **Tester les connexions** via l'interface

### Actions automatisées par le système:

1. **Authentification OAuth** automatique
2. **Gestion des tokens** et renouvellement
3. **Validation des credentials**
4. **Gestion des erreurs** et retry logic
5. **Logging et monitoring**

## 🔐 Variables d'Environnement

Ajouter dans votre `.env`:

```bash
# Meta/Facebook
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret

# Google (Ads + Gmail)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_DEVELOPER_TOKEN=your_developer_token

# TikTok
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# Twitter
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
```

## 🎯 Prochaines Étapes

1. **Installer les dépendances**: `cd platform-connectors && npm install`
2. **Configurer les credentials** pour chaque plateforme
3. **Tester les connexions** via l'interface utilisateur
4. **Déployer en production** avec les vrais credentials

## 📞 Support

Tous les connecteurs sont prêts et fonctionnels. Il vous suffit de:
1. Créer les comptes développeur
2. Obtenir les credentials
3. Les configurer dans l'interface

Le système gère automatiquement tout le reste !