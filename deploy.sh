#!/bin/bash

# CommerceAI Pro - Script de déploiement automatisé
# Ce script configure et déploie l'ensemble de la plateforme CommerceAI Pro

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé. Veuillez installer Docker Desktop."
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé."
        exit 1
    fi
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé."
        exit 1
    fi
    
    # Vérifier Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 n'est pas installé."
        exit 1
    fi
    
    log_success "Tous les prérequis sont satisfaits."
}

# Créer les répertoires nécessaires
create_directories() {
    log_info "Création des répertoires nécessaires..."
    
    mkdir -p logs
    mkdir -p docker/mongodb/init
    mkdir -p docker/nginx
    mkdir -p agents/pages/templates
    mkdir -p agents/pages/static
    mkdir -p agents/pages/generated
    mkdir -p agents/email/templates
    
    log_success "Répertoires créés avec succès."
}

# Créer le fichier .env s'il n'existe pas
create_env_file() {
    if [ ! -f .env ]; then
        log_info "Création du fichier .env..."
        
        cat > .env << EOF
# Configuration CommerceAI Pro
NODE_ENV=production

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
MONGODB_URI=mongodb://admin:commerceai2024@localhost:27017/commerceai?authSource=admin
REDIS_URL=redis://:commerceai2024@localhost:6379
RABBITMQ_URL=amqp://admin:commerceai2024@localhost:5672

# Security
JWT_SECRET=ekko-commerce-ai-secret-key-2024

# Email Configuration (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Platform API Keys (à configurer selon vos besoins)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
EOF
        
        log_success "Fichier .env créé. Veuillez le configurer avec vos clés API."
        log_warning "IMPORTANT: Configurez vos clés API dans le fichier .env avant de continuer."
    else
        log_info "Fichier .env existant trouvé."
    fi
}

# Installer les dépendances
install_dependencies() {
    log_info "Installation des dépendances..."
    
    # API Gateway
    if [ -d "api-gateway" ]; then
        log_info "Installation des dépendances pour API Gateway..."
        cd api-gateway && npm install && cd ..
    fi
    
    # Platform Connectors
    if [ -d "platform-connectors" ]; then
        log_info "Installation des dépendances pour Platform Connectors..."
        cd platform-connectors && npm install && cd ..
    fi
    
    # Frontend
    if [ -d "frontend" ]; then
        log_info "Installation des dépendances pour Frontend..."
        cd frontend && npm install && cd ..
    fi
    
    # Agents Node.js
    for agent in sav email; do
        if [ -d "agents/$agent" ]; then
            log_info "Installation des dépendances pour l'agent $agent..."
            cd "agents/$agent" && npm install && cd ../..
        fi
    done
    
    # Agents Python
    for agent in publicite contenu analyse pages; do
        if [ -d "agents/$agent" ] && [ -f "agents/$agent/requirements.txt" ]; then
            log_info "Installation des dépendances Python pour l'agent $agent..."
            cd "agents/$agent" && pip3 install -r requirements.txt && cd ../..
        fi
    done
    
    # Monitoring
    if [ -d "monitoring" ]; then
        log_info "Installation des dépendances pour le monitoring..."
        cd monitoring && npm install && cd ..
    fi
    
    # Tests
    if [ -d "tests" ]; then
        log_info "Installation des dépendances pour les tests..."
        cd tests && npm install && cd ..
    fi
    
    log_success "Toutes les dépendances ont été installées."
}

# Créer les Dockerfiles manquants
create_dockerfiles() {
    log_info "Création des Dockerfiles..."
    
    # Dockerfile pour les agents Python
    for agent in publicite contenu analyse pages; do
        if [ -d "agents/$agent" ] && [ ! -f "agents/$agent/Dockerfile" ]; then
            cat > "agents/$agent/Dockerfile" << EOF
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 500${agent: -1}

CMD ["python", "main.py"]
EOF
        fi
    done
    
    # Dockerfile pour les agents Node.js
    for agent in sav email; do
        if [ -d "agents/$agent" ] && [ ! -f "agents/$agent/Dockerfile" ]; then
            cat > "agents/$agent/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 500${agent: -1}

CMD ["node", "server.js"]
EOF
        fi
    done
    
    # Dockerfile pour API Gateway
    if [ -d "api-gateway" ] && [ ! -f "api-gateway/Dockerfile" ]; then
        cat > "api-gateway/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
EOF
    fi
    
    # Dockerfile pour Platform Connectors
    if [ -d "platform-connectors" ] && [ ! -f "platform-connectors/Dockerfile" ]; then
        cat > "platform-connectors/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4001

CMD ["node", "index.js"]
EOF
    fi
    
    # Dockerfile pour Frontend
    if [ -d "frontend" ] && [ ! -f "frontend/Dockerfile" ]; then
        cat > "frontend/Dockerfile" << EOF
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
    fi
    
    # Dockerfile pour Monitoring
    if [ -d "monitoring" ] && [ ! -f "monitoring/Dockerfile" ]; then
        cat > "monitoring/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4002

CMD ["node", "health-monitor.js"]
EOF
    fi
    
    log_success "Dockerfiles créés avec succès."
}

# Construire et démarrer les services
deploy_services() {
    log_info "Construction et démarrage des services..."
    
    # Arrêter les services existants
    docker-compose down
    
    # Construire les images
    log_info "Construction des images Docker..."
    docker-compose build
    
    # Démarrer les services
    log_info "Démarrage des services..."
    docker-compose up -d
    
    log_success "Services déployés avec succès."
}

# Vérifier le statut des services
check_services() {
    log_info "Vérification du statut des services..."
    
    sleep 10  # Attendre que les services démarrent
    
    # Vérifier les services
    services=("mongodb:27017" "redis:6379" "rabbitmq:15672" "api-gateway:4000" "platform-connectors:4001")
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if curl -f -s "http://localhost:$port" > /dev/null 2>&1 || nc -z localhost "$port" 2>/dev/null; then
            log_success "Service $name est accessible sur le port $port"
        else
            log_warning "Service $name n'est pas encore accessible sur le port $port"
        fi
    done
}

# Afficher les informations de déploiement
show_deployment_info() {
    echo
    echo "======================================"
    echo "  CommerceAI Pro - Déploiement Terminé"
    echo "======================================"
    echo
    echo "🌐 URLs d'accès:"
    echo "   Frontend:              http://localhost:3000"
    echo "   API Gateway:           http://localhost:4000"
    echo "   Platform Connectors:   http://localhost:4001"
    echo "   Health Monitor:        http://localhost:4002"
    echo "   RabbitMQ Management:   http://localhost:15672"
    echo
    echo "🔧 Agents IA:"
    echo "   SAV Agent:             http://localhost:5001"
    echo "   Publicité Agent:       http://localhost:5002"
    echo "   Contenu Agent:         http://localhost:5003"
    echo "   Analyse Agent:         http://localhost:5004"
    echo "   Pages Agent:           http://localhost:5005"
    echo "   Email Agent:           http://localhost:5006"
    echo
    echo "📊 Monitoring:"
    echo "   docker-compose logs -f [service_name]"
    echo "   docker-compose ps"
    echo
    echo "🔑 Identifiants par défaut:"
    echo "   MongoDB: admin / commerceai2024"
    echo "   Redis: commerceai2024"
    echo "   RabbitMQ: admin / commerceai2024"
    echo
    echo "⚠️  N'oubliez pas de configurer vos clés API dans le fichier .env"
    echo
}

# Fonction principale
main() {
    echo "🚀 Démarrage du déploiement de CommerceAI Pro..."
    echo
    
    check_prerequisites
    create_directories
    create_env_file
    install_dependencies
    create_dockerfiles
    deploy_services
    check_services
    show_deployment_info
    
    log_success "Déploiement terminé avec succès!"
}

# Gestion des arguments
case "${1:-}" in
    "install")
        install_dependencies
        ;;
    "build")
        docker-compose build
        ;;
    "start")
        docker-compose up -d
        ;;
    "stop")
        docker-compose down
        ;;
    "restart")
        docker-compose restart
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "status")
        docker-compose ps
        ;;
    "clean")
        docker-compose down -v
        docker system prune -f
        ;;
    *)
        main
        ;;
esac