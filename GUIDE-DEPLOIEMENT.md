# 🚀 Guide de Déploiement - CommerceAI Pro

Ce guide vous accompagne dans le déploiement complet de votre plateforme CommerceAI Pro, de l'environnement de développement à la production.

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration Rapide](#configuration-rapide)
3. [Configuration des API](#configuration-des-api)
4. [Déploiement Local](#déploiement-local)
5. [Déploiement Production](#déploiement-production)
6. [Vérification et Tests](#vérification-et-tests)
7. [Maintenance](#maintenance)
8. [Dépannage](#dépannage)

## 🔧 Prérequis

### Système
- **OS**: macOS, Linux (Ubuntu 20.04+, CentOS 8+)
- **RAM**: 8GB minimum, 16GB recommandé
- **Stockage**: 50GB minimum
- **CPU**: 4 cœurs minimum

### Logiciels
- **Node.js**: v18.0+
- **Python**: v3.9+
- **Docker**: v20.0+
- **Docker Compose**: v2.0+
- **Git**: v2.30+

### Comptes Requis
- OpenAI (GPT-4)
- Meta Developer (Facebook/Instagram)
- Google Cloud Platform
- Shopify Partner
- TikTok for Business
- WhatsApp Business API

## ⚡ Configuration Rapide

### 1. Cloner et Préparer

```bash
# Si pas encore fait
git clone <votre-repo>
cd commerceai-pro

# Rendre les scripts exécutables
chmod +x deploy.sh
chmod +x production-setup.sh
```

### 2. Configuration Environnement

```bash
# Copier le template de configuration
cp .env.production .env

# Éditer avec vos vraies clés API
nano .env
```

### 3. Déploiement Express

```bash
# Déploiement local complet
./deploy.sh

# OU déploiement production
./production-setup.sh
```

## 🔑 Configuration des API

### OpenAI (Obligatoire)

1. Aller sur [OpenAI Platform](https://platform.openai.com/)
2. Créer une clé API
3. Ajouter dans `.env`:
   ```
   OPENAI_API_KEY=sk-votre-clé-ici
   ```

### Meta/Facebook Ads

1. Aller sur [Meta for Developers](https://developers.facebook.com/)
2. Créer une application
3. Configurer Facebook Login et Marketing API
4. Ajouter dans `.env`:
   ```
   META_APP_ID=votre-app-id
   META_APP_SECRET=votre-app-secret
   META_ACCESS_TOKEN=votre-access-token
   ```

### Google Ads

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer Google Ads API
3. Créer des identifiants OAuth 2.0
4. Ajouter dans `.env`:
   ```
   GOOGLE_ADS_CLIENT_ID=votre-client-id
   GOOGLE_ADS_CLIENT_SECRET=votre-client-secret
   GOOGLE_ADS_DEVELOPER_TOKEN=votre-developer-token
   ```

### Shopify

1. Aller sur [Shopify Partners](https://partners.shopify.com/)
2. Créer une application
3. Configurer les webhooks
4. Ajouter dans `.env`:
   ```
   SHOPIFY_API_KEY=votre-api-key
   SHOPIFY_API_SECRET=votre-api-secret
   SHOPIFY_SHOP_DOMAIN=votre-shop.myshopify.com
   ```

### TikTok Ads

1. Aller sur [TikTok for Business](https://ads.tiktok.com/)
2. Créer une application développeur
3. Obtenir les clés API
4. Ajouter dans `.env`:
   ```
   TIKTOK_APP_ID=votre-app-id
   TIKTOK_SECRET=votre-secret
   ```

### WhatsApp Business

1. Aller sur [Meta for Developers](https://developers.facebook.com/)
2. Configurer WhatsApp Business API
3. Obtenir le token et phone number ID
4. Ajouter dans `.env`:
   ```
   WHATSAPP_TOKEN=votre-token
   WHATSAPP_PHONE_NUMBER_ID=votre-phone-id
   ```

## 🏠 Déploiement Local

### Méthode 1: Script Automatique

```bash
# Déploiement complet
./deploy.sh

# Ou étape par étape
./deploy.sh install    # Installation des dépendances
./deploy.sh build      # Construction des images
./deploy.sh start      # Démarrage des services
```

### Méthode 2: Manuel

```bash
# 1. Installer les dépendances
npm install
cd frontend && npm install && cd ..
cd monitoring && npm install && cd ..
cd tests && npm install && cd ..

# 2. Installer les dépendances Python
pip install -r agents/pages/requirements.txt
pip install -r agents/analyse/requirements.txt

# 3. Démarrer avec Docker
docker-compose up -d

# 4. Vérifier les services
docker-compose ps
```

### Accès aux Services

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **Platform Connectors**: http://localhost:4001
- **Monitoring**: http://localhost:4002
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **RabbitMQ**: http://localhost:15672 (guest/guest)

## 🌐 Déploiement Production

### Méthode Automatique (Recommandée)

```bash
# Configuration complète de production
sudo ./production-setup.sh
```

Ce script configure automatiquement:
- ✅ Nginx avec SSL (Let's Encrypt)
- ✅ Firewall et sécurité
- ✅ Sauvegardes automatiques
- ✅ Monitoring système
- ✅ Optimisations performances
- ✅ Services systemd

### Configuration Manuelle

#### 1. Préparer le Serveur

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose nginx certbot

# CentOS/RHEL
sudo yum update -y
sudo yum install -y docker docker-compose nginx
```

#### 2. Configurer le Domaine

```bash
# Modifier la configuration
export DOMAIN="votre-domaine.com"
export SSL_EMAIL="admin@votre-domaine.com"

# Obtenir le certificat SSL
sudo certbot --nginx -d $DOMAIN -d api.$DOMAIN
```

#### 3. Configurer Nginx

```bash
# Copier la configuration
sudo cp nginx/commerceai.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/commerceai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 4. Déployer l'Application

```bash
# Variables d'environnement production
export NODE_ENV=production
export DOMAIN="votre-domaine.com"

# Démarrer les services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## ✅ Vérification et Tests

### Tests Automatiques

```bash
# Lancer tous les tests
cd tests
npm test

# Tests spécifiques
npm run test:health      # Tests de santé
npm run test:api         # Tests API
npm run test:performance # Tests de performance
```

### Vérifications Manuelles

```bash
# Statut des services
docker-compose ps

# Logs des services
docker-compose logs -f

# Health checks
curl http://localhost:4000/health
curl http://localhost:4001/health
curl http://localhost:4002/health

# Test des agents AI
curl -X POST http://localhost:4000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"post","topic":"test"}'
```

### Monitoring

```bash
# Accéder au dashboard de monitoring
open http://localhost:4002

# Vérifier les métriques
curl http://localhost:4002/api/metrics

# Statut des agents
curl http://localhost:4002/api/agents/status
```

## 🔧 Maintenance

### Sauvegardes

```bash
# Sauvegarde manuelle
/usr/local/bin/backup-commerceai.sh

# Vérifier les sauvegardes
ls -la /var/backups/commerceai/

# Restaurer une sauvegarde
tar -xzf /var/backups/commerceai/commerceai_backup_YYYYMMDD_HHMMSS.tar.gz
```

### Mises à Jour

```bash
# Arrêter les services
docker-compose down

# Mettre à jour le code
git pull origin main

# Reconstruire et redémarrer
docker-compose build
docker-compose up -d

# Vérifier le déploiement
./tests/integration-tests.js
```

### Logs

```bash
# Logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f api-gateway

# Logs système
sudo journalctl -u commerceai -f

# Nettoyer les logs
docker system prune -f
```

## 🚨 Dépannage

### Problèmes Courants

#### Services qui ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'espace disque
df -h

# Vérifier la mémoire
free -h

# Redémarrer les services
docker-compose restart
```

#### Erreurs de connexion API

```bash
# Vérifier les variables d'environnement
docker-compose exec api-gateway env | grep API

# Tester les connexions
docker-compose exec api-gateway curl https://api.openai.com/v1/models
```

#### Problèmes de performance

```bash
# Vérifier l'utilisation des ressources
docker stats

# Optimiser la mémoire
docker-compose exec api-gateway node --max-old-space-size=4096 server.js

# Nettoyer le cache
docker-compose exec redis redis-cli FLUSHALL
```

### Commandes de Diagnostic

```bash
# Statut complet du système
./deploy.sh status

# Tests de connectivité
./tests/integration-tests.js

# Vérification de la configuration
./deploy.sh check

# Nettoyage complet
./deploy.sh clean
```

### Support

- **Logs**: Consultez `/var/log/commerceai/`
- **Monitoring**: http://localhost:4002
- **Documentation**: `README-TECHNIQUE.md`
- **Tests**: `npm test` dans le dossier `tests/`

## 📊 Métriques de Performance

### Objectifs de Performance

- **Temps de réponse API**: < 500ms
- **Génération de contenu**: < 10s
- **Uptime**: > 99.9%
- **Utilisation mémoire**: < 80%
- **Utilisation CPU**: < 70%

### Monitoring Continu

```bash
# Dashboard de monitoring
open http://localhost:4002/dashboard

# Métriques en temps réel
watch -n 5 'curl -s http://localhost:4002/api/metrics | jq .'

# Alertes système
tail -f /var/log/commerceai/alerts.log
```

---

## 🎉 Félicitations!

Votre plateforme CommerceAI Pro est maintenant déployée et opérationnelle!

### Prochaines Étapes

1. **Configurer vos vraies clés API** dans le fichier `.env`
2. **Tester chaque agent AI** via l'interface web
3. **Configurer vos comptes publicitaires** (Meta, Google, TikTok)
4. **Connecter votre boutique Shopify**
5. **Paramétrer WhatsApp Business** pour le support client
6. **Personnaliser les templates** de contenu et d'emails

### Ressources Utiles

- 📚 **Documentation technique**: `README-TECHNIQUE.md`
- 🔧 **Configuration avancée**: `.env.production`
- 🧪 **Tests automatiques**: `tests/`
- 📊 **Monitoring**: http://localhost:4002
- 🚀 **Scripts de déploiement**: `deploy.sh`, `production-setup.sh`

**Votre plateforme CommerceAI Pro est prête à révolutionner votre e-commerce! 🚀**