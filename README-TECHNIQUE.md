# CommerceAI Pro - Documentation Technique

## 🏗️ Architecture de la Plateforme

CommerceAI Pro est une plateforme SaaS complète composée de 6 agents IA spécialisés, d'une API Gateway centralisée, et d'un système de connecteurs pour les plateformes externes.

### 📊 Vue d'ensemble de l'Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │ Platform        │
│   (React)       │◄──►│  (Node.js)      │◄──►│ Connectors      │
│   Port: 3001    │    │  Port: 4000     │    │ Port: 4001      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Message Queue     │
                    │   (RabbitMQ)        │
                    │   Port: 5672        │
                    └─────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ Agent SAV       │ │ Agent Publicité │ │ Agent Contenu   │
    │ (Node.js)       │ │ (Python)        │ │ (Python)        │
    │ Port: 5001      │ │ Port: 5002      │ │ Port: 5003      │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ Agent Analyse   │ │ Agent Pages     │ │ Agent Email     │
    │ (Python)        │ │ (Python)        │ │ (Node.js)       │
    │ Port: 5004      │ │ Port: 5005      │ │ Port: 5006      │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Bases de Données  │
                    │   MongoDB + Redis   │
                    │   Ports: 27017/6379 │
                    └─────────────────────┘
```

## 🤖 Agents IA et leurs Capacités

### 1. Agent SAV (Service Après-Vente)
**Port:** 5001 | **Technologie:** Node.js + Express

**Fonctionnalités:**
- Réponses automatiques aux questions clients
- Intégration WhatsApp, Messenger, Email
- Analyse du sentiment client
- Escalade automatique vers support humain
- Base de connaissances dynamique

**Endpoints principaux:**
- `POST /api/customer-service/respond` - Générer une réponse IA
- `POST /api/customer-service/webhook` - Recevoir messages des plateformes
- `GET /api/customer-service/conversations` - Historique des conversations

### 2. Agent Publicité
**Port:** 5002 | **Technologie:** Python + FastAPI

**Fonctionnalités:**
- Création de campagnes publicitaires automatisées
- Optimisation des enchères en temps réel
- Analyse des performances multi-plateformes
- Génération de créatifs publicitaires
- Ciblage intelligent des audiences

**Endpoints principaux:**
- `POST /api/advertising/campaigns` - Créer une campagne
- `GET /api/advertising/performance` - Métriques de performance
- `POST /api/advertising/optimize` - Optimiser les campagnes

### 3. Agent Contenu
**Port:** 5003 | **Technologie:** Python + FastAPI

**Fonctionnalités:**
- Génération de contenu SEO-optimisé
- Articles de blog automatiques
- Descriptions produits
- Posts réseaux sociaux
- Calendrier éditorial intelligent

**Endpoints principaux:**
- `POST /api/content/generate` - Générer du contenu
- `GET /api/content/templates` - Templates disponibles
- `POST /api/content/schedule` - Programmer la publication

### 4. Agent Analyse
**Port:** 5004 | **Technologie:** Python + FastAPI

**Fonctionnalités:**
- Analyse concurrentielle automatisée
- Audit SEO complet
- Analyse des tendances marché
- Recommandations d'optimisation
- Rapports de performance détaillés

**Endpoints principaux:**
- `POST /api/analysis/product` - Analyser un produit
- `POST /api/analysis/competitor` - Analyse concurrentielle
- `POST /api/analysis/website` - Audit de site web

### 5. Agent Pages
**Port:** 5005 | **Technologie:** Python + FastAPI

**Fonctionnalités:**
- Génération de landing pages
- Pages produits optimisées
- Templates responsive
- A/B testing automatique
- Optimisation conversion

**Endpoints principaux:**
- `POST /api/pages/generate` - Générer une page
- `GET /api/pages/templates` - Templates disponibles
- `GET /api/pages/view/{page_id}` - Visualiser une page

### 6. Agent Email
**Port:** 5006 | **Technologie:** Node.js + Express

**Fonctionnalités:**
- Campagnes email automatisées
- Segmentation intelligente
- Templates responsive
- Suivi des performances
- Automation workflows

**Endpoints principaux:**
- `POST /api/email/campaigns` - Créer une campagne
- `POST /api/email/templates` - Créer un template
- `POST /api/email/send` - Envoyer un email

## 🔧 Services Core

### API Gateway (Port: 4000)
**Rôle:** Point d'entrée unique pour toutes les requêtes

**Fonctionnalités:**
- Routage intelligent vers les agents
- Authentification JWT
- Rate limiting
- Monitoring des performances
- Gestion des erreurs centralisée

### Platform Connectors (Port: 4001)
**Rôle:** Interface avec les plateformes externes

**Plateformes supportées:**
- Meta (Facebook/Instagram)
- Google Ads
- Shopify
- TikTok Ads
- LinkedIn
- Twitter
- WhatsApp Business

## 🗄️ Base de Données

### MongoDB (Port: 27017)
**Collections principales:**
- `users` - Données utilisateurs
- `campaigns` - Campagnes publicitaires
- `content` - Contenu généré
- `analytics` - Données d'analyse
- `conversations` - Historique SAV
- `pages` - Pages générées
- `email_campaigns` - Campagnes email

### Redis (Port: 6379)
**Utilisation:**
- Cache des réponses API
- Sessions utilisateurs
- Queue des tâches
- Données temporaires

### RabbitMQ (Port: 5672)
**Queues principales:**
- `content.generation` - Génération de contenu
- `analysis.requests` - Demandes d'analyse
- `email.sending` - Envoi d'emails
- `notifications` - Notifications système

## 🚀 Déploiement

### Développement Local

```bash
# Cloner le repository
git clone <repository-url>
cd commerceai-pro

# Installer les dépendances
./deploy.sh install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Démarrer en mode développement
npm run dev
```

### Production avec Docker

```bash
# Déploiement complet
./deploy.sh

# Ou étape par étape
docker-compose build
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

### Commandes Utiles

```bash
# Voir les logs
./deploy.sh logs [service_name]

# Redémarrer un service
docker-compose restart [service_name]

# Arrêter tous les services
./deploy.sh stop

# Nettoyer le système
./deploy.sh clean
```

## 🔐 Sécurité

### Authentification
- JWT tokens avec expiration
- Refresh tokens automatiques
- Rate limiting par IP
- Validation des entrées

### Chiffrement
- HTTPS obligatoire en production
- Chiffrement des données sensibles
- Hachage sécurisé des mots de passe
- Rotation automatique des clés

### Monitoring Sécurité
- Logs d'audit détaillés
- Détection d'intrusion
- Alertes en temps réel
- Backup automatique

## 📊 Monitoring et Logs

### Health Monitor (Port: 4002)
**Fonctionnalités:**
- Surveillance de tous les services
- Métriques de performance
- Alertes automatiques
- Dashboard de statut

### Système de Logs
**Structure:**
```
logs/
├── system/
├── api-gateway/
├── platform-connectors/
├── agent-sav/
├── agent-publicite/
├── agent-contenu/
├── agent-analyse/
├── agent-pages/
└── agent-email/
```

**Types de logs:**
- `combined.log` - Tous les logs
- `error.log` - Erreurs uniquement
- `access.log` - Logs d'accès HTTP
- `security.log` - Événements de sécurité

## 🔧 Configuration

### Variables d'Environnement

```bash
# Core
NODE_ENV=production
PORT=4000

# Base de données
MONGODB_URI=mongodb://admin:password@localhost:27017/commerceai
REDIS_URL=redis://:password@localhost:6379
RABBITMQ_URL=amqp://admin:password@localhost:5672

# IA
OPENAI_API_KEY=your_openai_key

# Sécurité
JWT_SECRET=your_jwt_secret

# Plateformes (optionnel pour demo)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# ... autres plateformes
```

## 🧪 Tests

### Tests d'Intégration

```bash
# Exécuter tous les tests
cd tests
node integration-tests.js

# Tests spécifiques
npm test -- --grep "health"
npm test -- --grep "api"
```

### Tests de Performance

```bash
# Test de charge
npm run test:load

# Test de stress
npm run test:stress
```

## 📈 Optimisation des Performances

### Configuration Automatique
- Clustering multi-core
- Cache Redis intelligent
- Pool de connexions DB
- Compression gzip
- CDN pour les assets

### Métriques Surveillées
- Temps de réponse API
- Utilisation mémoire
- Charge CPU
- Débit réseau
- Erreurs par minute

## 🔄 Mise à Jour

### Déploiement Zero-Downtime

```bash
# Mise à jour rolling
./deploy.sh update

# Rollback si nécessaire
./deploy.sh rollback
```

### Migrations Base de Données

```bash
# Exécuter les migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

## 🆘 Dépannage

### Problèmes Courants

1. **Service ne démarre pas**
   ```bash
   docker-compose logs [service_name]
   ```

2. **Erreurs de connexion DB**
   ```bash
   docker-compose restart mongodb redis
   ```

3. **Performance dégradée**
   ```bash
   # Vérifier les métriques
   curl http://localhost:4002/api/health/status
   ```

4. **Erreurs d'authentification**
   ```bash
   # Vérifier les tokens JWT
   # Redémarrer l'API Gateway
   docker-compose restart api-gateway
   ```

### Logs de Debug

```bash
# Activer le mode debug
export LOG_LEVEL=debug

# Suivre les logs en temps réel
docker-compose logs -f
```

## 📞 Support

Pour toute question technique :
1. Consulter les logs dans `/logs/`
2. Vérifier le statut des services sur `http://localhost:4002`
3. Consulter la documentation API sur `http://localhost:4000/docs`

---

**Version:** 1.0.0  
**Dernière mise à jour:** $(date)  
**Statut:** Production Ready 🚀