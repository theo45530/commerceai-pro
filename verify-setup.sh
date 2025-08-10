#!/bin/bash

# CommerceAI Pro - Script de Vérification Finale
# Ce script vérifie que tous les composants sont correctement configurés

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Compteurs
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Fonctions utilitaires
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; ((PASSED_CHECKS++)); }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; ((WARNING_CHECKS++)); }
log_error() { echo -e "${RED}[✗]${NC} $1"; ((FAILED_CHECKS++)); }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

check_item() {
    ((TOTAL_CHECKS++))
    if eval "$2" &>/dev/null; then
        log_success "$1"
        return 0
    else
        log_error "$1"
        return 1
    fi
}

check_warning() {
    ((TOTAL_CHECKS++))
    if eval "$2" &>/dev/null; then
        log_success "$1"
        return 0
    else
        log_warning "$1"
        return 1
    fi
}

# Vérifications système
check_system() {
    log_step "Vérification du système..."
    
    check_item "Node.js installé" "command -v node"
    check_item "Python installé" "command -v python3"
    check_item "Docker installé" "command -v docker"
    check_item "Docker Compose installé" "command -v docker-compose"
    check_item "Git installé" "command -v git"
    
    # Vérifier les versions
    if command -v node &>/dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log_success "Version Node.js >= 18 ($(node --version))"
            ((PASSED_CHECKS++))
        else
            log_error "Version Node.js < 18 ($(node --version))"
            ((FAILED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    fi
    
    if command -v python3 &>/dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
        if python3 -c "import sys; exit(0 if sys.version_info >= (3, 9) else 1)"; then
            log_success "Version Python >= 3.9 ($PYTHON_VERSION)"
            ((PASSED_CHECKS++))
        else
            log_error "Version Python < 3.9 ($PYTHON_VERSION)"
            ((FAILED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    fi
}

# Vérifications des fichiers
check_files() {
    log_step "Vérification des fichiers..."
    
    # Fichiers principaux
    check_item "docker-compose.yml existe" "[ -f docker-compose.yml ]"
    check_item "deploy.sh existe" "[ -f deploy.sh ]"
    check_item "production-setup.sh existe" "[ -f production-setup.sh ]"
    check_item "package.json existe" "[ -f package.json ]"
    
    # Scripts exécutables
    check_item "deploy.sh est exécutable" "[ -x deploy.sh ]"
    check_item "production-setup.sh est exécutable" "[ -x production-setup.sh ]"
    
    # Configuration
    check_warning "Fichier .env existe" "[ -f .env ]"
    check_item "Template .env.production existe" "[ -f .env.production ]"
    
    # Agents
    check_item "Agent SAV existe" "[ -f agents/sav/server.js ]"
    check_item "Agent Publicité existe" "[ -f agents/publicite/server.js ]"
    check_item "Agent Contenu existe" "[ -f agents/contenu/server.js ]"
    check_item "Agent Analyse existe" "[ -f agents/analyse/main.py ]"
    check_item "Agent Pages existe" "[ -f agents/pages/main.py ]"
    check_item "Agent Email existe" "[ -f agents/email/server.js ]"
    
    # API Gateway et Platform Connectors
    check_item "API Gateway existe" "[ -f api-gateway/server.js ]"
    check_item "Platform Connectors existe" "[ -f platform-connectors/index.js ]"
    
    # Frontend
    check_item "Frontend existe" "[ -d frontend ]"
    check_item "Frontend package.json" "[ -f frontend/package.json ]"
    
    # Monitoring et Tests
    check_item "Monitoring existe" "[ -f monitoring/health-monitor.js ]"
    check_item "Tests existent" "[ -f tests/integration-tests.js ]"
    
    # Documentation
    check_item "README technique" "[ -f README-TECHNIQUE.md ]"
    check_item "Guide de déploiement" "[ -f GUIDE-DEPLOIEMENT.md ]"
}

# Vérifications des dépendances
check_dependencies() {
    log_step "Vérification des dépendances..."
    
    # Node.js dependencies
    check_item "node_modules API Gateway" "[ -d api-gateway/node_modules ]"
    check_item "node_modules Platform Connectors" "[ -d platform-connectors/node_modules ]"
    check_item "node_modules Frontend" "[ -d frontend/node_modules ]"
    check_item "node_modules Agents SAV" "[ -d agents/sav/node_modules ]"
    check_item "node_modules Agents Publicité" "[ -d agents/publicite/node_modules ]"
    check_item "node_modules Agents Contenu" "[ -d agents/contenu/node_modules ]"
    check_item "node_modules Agents Email" "[ -d agents/email/node_modules ]"
    check_warning "node_modules Monitoring" "[ -d monitoring/node_modules ]"
    check_warning "node_modules Tests" "[ -d tests/node_modules ]"
    
    # Python dependencies
    if command -v python3 &>/dev/null; then
        check_warning "FastAPI installé" "python3 -c 'import fastapi'"
        check_warning "OpenAI Python installé" "python3 -c 'import openai'"
        check_warning "Pandas installé" "python3 -c 'import pandas'"
    fi
}

# Vérifications de configuration
check_configuration() {
    log_step "Vérification de la configuration..."
    
    if [ -f .env ]; then
        # Vérifier les variables critiques
        check_warning "OPENAI_API_KEY configuré" "grep -q 'OPENAI_API_KEY=sk-' .env"
        check_warning "JWT_SECRET configuré" "grep -q 'JWT_SECRET=' .env && ! grep -q 'your-super-secret' .env"
        check_warning "MONGODB_URI configuré" "grep -q 'MONGODB_URI=' .env"
        check_warning "REDIS_URL configuré" "grep -q 'REDIS_URL=' .env"
        check_warning "RABBITMQ_URL configuré" "grep -q 'RABBITMQ_URL=' .env"
        
        # Vérifier les plateformes
        check_warning "Meta API configuré" "grep -q 'META_APP_ID=' .env && ! grep -q 'your-meta-app-id' .env"
        check_warning "Google Ads configuré" "grep -q 'GOOGLE_ADS_CLIENT_ID=' .env && ! grep -q 'your-google-client-id' .env"
        check_warning "Shopify configuré" "grep -q 'SHOPIFY_API_KEY=' .env && ! grep -q 'your-shopify-api-key' .env"
        check_warning "WhatsApp configuré" "grep -q 'WHATSAPP_TOKEN=' .env && ! grep -q 'your-whatsapp-token' .env"
    else
        log_warning "Fichier .env non trouvé - utilisez .env.production comme template"
        ((WARNING_CHECKS += 9))
        ((TOTAL_CHECKS += 9))
    fi
}

# Vérifications Docker
check_docker() {
    log_step "Vérification Docker..."
    
    if command -v docker &>/dev/null; then
        check_item "Docker daemon actif" "docker info"
        check_item "Docker Compose fonctionnel" "docker-compose --version"
        
        # Vérifier si les services sont en cours d'exécution
        if docker-compose ps &>/dev/null; then
            RUNNING_SERVICES=$(docker-compose ps --services --filter "status=running" | wc -l)
            TOTAL_SERVICES=$(docker-compose ps --services | wc -l)
            
            if [ "$RUNNING_SERVICES" -gt 0 ]; then
                log_success "Services Docker en cours d'exécution ($RUNNING_SERVICES/$TOTAL_SERVICES)"
                ((PASSED_CHECKS++))
            else
                log_warning "Aucun service Docker en cours d'exécution"
                ((WARNING_CHECKS++))
            fi
            ((TOTAL_CHECKS++))
        else
            log_warning "Docker Compose non initialisé"
            ((WARNING_CHECKS++))
            ((TOTAL_CHECKS++))
        fi
    fi
}

# Vérifications réseau
check_network() {
    log_step "Vérification réseau..."
    
    # Vérifier les ports
    check_warning "Port 3000 disponible (Frontend)" "! lsof -i :3000 || docker-compose ps | grep -q frontend"
    check_warning "Port 4000 disponible (API Gateway)" "! lsof -i :4000 || docker-compose ps | grep -q api-gateway"
    check_warning "Port 4001 disponible (Platform Connectors)" "! lsof -i :4001 || docker-compose ps | grep -q platform-connectors"
    check_warning "Port 4002 disponible (Monitoring)" "! lsof -i :4002 || docker-compose ps | grep -q monitoring"
    
    # Vérifier la connectivité internet
    check_item "Connectivité Internet" "ping -c 1 google.com"
    check_item "Accès à OpenAI" "curl -s --connect-timeout 5 https://api.openai.com"
    check_item "Accès à GitHub" "curl -s --connect-timeout 5 https://api.github.com"
}

# Vérifications de sécurité
check_security() {
    log_step "Vérification de la sécurité..."
    
    # Vérifier les permissions
    check_item "Permissions deploy.sh" "[ -x deploy.sh ]"
    check_item "Permissions production-setup.sh" "[ -x production-setup.sh ]"
    
    if [ -f .env ]; then
        # Vérifier que .env n'est pas trop permissif
        ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null || echo "unknown")
        if [[ "$ENV_PERMS" =~ ^[0-7][0-7][0-4]$ ]] || [[ "$ENV_PERMS" =~ ^[0-7][0-6][0-0]$ ]]; then
            log_success "Permissions .env sécurisées ($ENV_PERMS)"
            ((PASSED_CHECKS++))
        else
            log_warning "Permissions .env trop permissives ($ENV_PERMS)"
            ((WARNING_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
        
        # Vérifier qu'il n'y a pas de clés par défaut
        if grep -q "your-.*-key\|your-.*-secret\|your-.*-token" .env; then
            log_warning "Clés API par défaut détectées dans .env"
            ((WARNING_CHECKS++))
        else
            log_success "Pas de clés par défaut dans .env"
            ((PASSED_CHECKS++))
        fi
        ((TOTAL_CHECKS++))
    fi
}

# Test de fonctionnalité basique
check_functionality() {
    log_step "Test de fonctionnalité basique..."
    
    # Vérifier si les services répondent
    if docker-compose ps | grep -q "Up"; then
        # Attendre un peu que les services démarrent
        sleep 5
        
        check_warning "API Gateway répond" "curl -s --connect-timeout 5 http://localhost:4000/health"
        check_warning "Platform Connectors répond" "curl -s --connect-timeout 5 http://localhost:4001/health"
        check_warning "Monitoring répond" "curl -s --connect-timeout 5 http://localhost:4002/health"
        check_warning "Frontend accessible" "curl -s --connect-timeout 5 http://localhost:3000"
    else
        log_warning "Services Docker non démarrés - impossible de tester la fonctionnalité"
        ((WARNING_CHECKS += 4))
        ((TOTAL_CHECKS += 4))
    fi
}

# Recommandations
show_recommendations() {
    echo
    log_step "Recommandations..."
    
    if [ ! -f .env ]; then
        echo "📝 Créez votre fichier .env:"
        echo "   cp .env.production .env"
        echo "   nano .env"
        echo
    fi
    
    if [ -f .env ] && grep -q "your-.*-key\|your-.*-secret\|your-.*-token" .env; then
        echo "🔑 Configurez vos vraies clés API dans .env:"
        echo "   - OpenAI API Key (obligatoire)"
        echo "   - Meta/Facebook API"
        echo "   - Google Ads API"
        echo "   - Shopify API"
        echo "   - WhatsApp Business API"
        echo
    fi
    
    if ! docker-compose ps | grep -q "Up"; then
        echo "🚀 Démarrez les services:"
        echo "   ./deploy.sh start"
        echo "   # ou"
        echo "   docker-compose up -d"
        echo
    fi
    
    echo "📚 Consultez la documentation:"
    echo "   - README-TECHNIQUE.md (documentation technique)"
    echo "   - GUIDE-DEPLOIEMENT.md (guide de déploiement)"
    echo
    
    echo "🧪 Lancez les tests:"
    echo "   cd tests && npm test"
    echo
    
    echo "📊 Accédez au monitoring:"
    echo "   http://localhost:4002"
    echo
}

# Résumé final
show_summary() {
    echo
    echo "======================================"
    echo "  Résumé de la Vérification"
    echo "======================================"
    echo
    echo "📊 Statistiques:"
    echo "   Total des vérifications: $TOTAL_CHECKS"
    echo "   ✅ Réussies: $PASSED_CHECKS"
    echo "   ⚠️  Avertissements: $WARNING_CHECKS"
    echo "   ❌ Échecs: $FAILED_CHECKS"
    echo
    
    # Calculer le pourcentage de réussite
    if [ $TOTAL_CHECKS -gt 0 ]; then
        SUCCESS_RATE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
        echo "📈 Taux de réussite: $SUCCESS_RATE%"
        echo
        
        if [ $SUCCESS_RATE -ge 90 ]; then
            echo "🎉 Excellent! Votre installation est prête."
        elif [ $SUCCESS_RATE -ge 70 ]; then
            echo "👍 Bien! Quelques ajustements recommandés."
        elif [ $SUCCESS_RATE -ge 50 ]; then
            echo "⚠️  Attention! Plusieurs problèmes à résoudre."
        else
            echo "❌ Critique! Installation incomplète."
        fi
    fi
    
    echo
    
    if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
        echo "🚀 Votre plateforme CommerceAI Pro est parfaitement configurée!"
    elif [ $FAILED_CHECKS -eq 0 ]; then
        echo "✅ Installation fonctionnelle avec quelques optimisations possibles."
    else
        echo "🔧 Veuillez résoudre les problèmes critiques avant de continuer."
    fi
    
    echo
}

# Fonction principale
main() {
    echo "🔍 Vérification de l'installation CommerceAI Pro"
    echo "==============================================="
    echo
    
    check_system
    echo
    check_files
    echo
    check_dependencies
    echo
    check_configuration
    echo
    check_docker
    echo
    check_network
    echo
    check_security
    echo
    check_functionality
    echo
    
    show_recommendations
    show_summary
}

# Gestion des arguments
case "${1:-}" in
    "system")
        check_system
        ;;
    "files")
        check_files
        ;;
    "deps")
        check_dependencies
        ;;
    "config")
        check_configuration
        ;;
    "docker")
        check_docker
        ;;
    "network")
        check_network
        ;;
    "security")
        check_security
        ;;
    "function")
        check_functionality
        ;;
    "quick")
        check_system
        check_files
        check_docker
        show_summary
        ;;
    *)
        main
        ;;
esac