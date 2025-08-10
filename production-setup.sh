#!/bin/bash

# CommerceAI Pro - Script de mise en production
# Ce script configure automatiquement l'environnement de production

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
PROJECT_NAME="commerceai-pro"
DOMAIN="${DOMAIN:-localhost}"
SSL_EMAIL="${SSL_EMAIL:-admin@example.com}"
BACKUP_RETENTION_DAYS=30

# Fonctions utilitaires
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

# Vérifier les privilèges root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Ce script ne doit pas être exécuté en tant que root pour des raisons de sécurité."
        log_info "Utilisez sudo uniquement quand nécessaire."
    fi
}

# Vérifier l'OS
check_os() {
    log_step "Vérification du système d'exploitation..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_info "Système détecté: macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log_info "Système détecté: Linux"
    else
        log_error "Système d'exploitation non supporté: $OSTYPE"
        exit 1
    fi
}

# Installer les dépendances système
install_system_dependencies() {
    log_step "Installation des dépendances système..."
    
    if [[ "$OS" == "macos" ]]; then
        # Vérifier Homebrew
        if ! command -v brew &> /dev/null; then
            log_info "Installation de Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Installer les dépendances
        brew update
        brew install node python3 docker docker-compose nginx certbot
        
    elif [[ "$OS" == "linux" ]]; then
        # Détecter la distribution
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y curl wget gnupg2 software-properties-common
            
            # Node.js
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            
            # Python
            sudo apt-get install -y python3 python3-pip python3-venv
            
            # Docker
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            
            # Docker Compose
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            
            # Nginx et Certbot
            sudo apt-get install -y nginx certbot python3-certbot-nginx
            
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            sudo yum update -y
            sudo yum install -y curl wget
            
            # Node.js
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
            
            # Python
            sudo yum install -y python3 python3-pip
            
            # Docker
            sudo yum install -y docker
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            
            # Docker Compose
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            
            # Nginx
            sudo yum install -y nginx
            sudo systemctl enable nginx
        fi
    fi
    
    log_success "Dépendances système installées."
}

# Configurer le firewall
setup_firewall() {
    log_step "Configuration du firewall..."
    
    if [[ "$OS" == "linux" ]]; then
        if command -v ufw &> /dev/null; then
            # Ubuntu/Debian avec UFW
            sudo ufw --force enable
            sudo ufw default deny incoming
            sudo ufw default allow outgoing
            
            # Ports nécessaires
            sudo ufw allow ssh
            sudo ufw allow 80/tcp
            sudo ufw allow 443/tcp
            sudo ufw allow 3000/tcp  # Frontend dev
            sudo ufw allow 4000/tcp  # API Gateway
            sudo ufw allow 4001/tcp  # Platform Connectors
            sudo ufw allow 4002/tcp  # Health Monitor
            
            log_success "Firewall UFW configuré."
            
        elif command -v firewall-cmd &> /dev/null; then
            # CentOS/RHEL avec firewalld
            sudo systemctl start firewalld
            sudo systemctl enable firewalld
            
            sudo firewall-cmd --permanent --add-service=ssh
            sudo firewall-cmd --permanent --add-service=http
            sudo firewall-cmd --permanent --add-service=https
            sudo firewall-cmd --permanent --add-port=3000/tcp
            sudo firewall-cmd --permanent --add-port=4000/tcp
            sudo firewall-cmd --permanent --add-port=4001/tcp
            sudo firewall-cmd --permanent --add-port=4002/tcp
            
            sudo firewall-cmd --reload
            
            log_success "Firewall firewalld configuré."
        fi
    elif [[ "$OS" == "macos" ]]; then
        log_info "Configuration du firewall macOS (manuel requis)."
    fi
}

# Configurer SSL avec Let's Encrypt
setup_ssl() {
    if [[ "$DOMAIN" != "localhost" ]]; then
        log_step "Configuration SSL avec Let's Encrypt..."
        
        if [[ "$OS" == "linux" ]]; then
            # Arrêter nginx temporairement
            sudo systemctl stop nginx 2>/dev/null || true
            
            # Obtenir le certificat
            sudo certbot certonly --standalone \
                --email "$SSL_EMAIL" \
                --agree-tos \
                --no-eff-email \
                -d "$DOMAIN" \
                -d "api.$DOMAIN" \
                -d "monitor.$DOMAIN"
            
            # Configurer le renouvellement automatique
            echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
            
            log_success "SSL configuré pour $DOMAIN."
        fi
    else
        log_info "SSL ignoré pour localhost."
    fi
}

# Configurer Nginx
setup_nginx() {
    log_step "Configuration de Nginx..."
    
    # Créer la configuration Nginx
    sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    
    cat > /tmp/commerceai-nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirection HTTPS si SSL activé
    $(if [[ "$DOMAIN" != "localhost" ]]; then echo "return 301 https://\$server_name\$request_uri;"; fi)
    
    # Configuration pour localhost
    $(if [[ "$DOMAIN" == "localhost" ]]; then cat << 'LOCALHOST'
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
LOCALHOST
fi)
}

$(if [[ "$DOMAIN" != "localhost" ]]; then cat << 'HTTPS'
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Sous-domaine API
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Sous-domaine Monitoring
server {
    listen 443 ssl http2;
    server_name monitor.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
HTTPS
fi)
EOF
    
    # Installer la configuration
    sudo mv /tmp/commerceai-nginx.conf /etc/nginx/sites-available/commerceai
    sudo ln -sf /etc/nginx/sites-available/commerceai /etc/nginx/sites-enabled/
    
    # Supprimer la configuration par défaut
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Tester et redémarrer Nginx
    sudo nginx -t
    
    if [[ "$OS" == "linux" ]]; then
        sudo systemctl restart nginx
        sudo systemctl enable nginx
    fi
    
    log_success "Nginx configuré."
}

# Configurer les sauvegardes automatiques
setup_backups() {
    log_step "Configuration des sauvegardes automatiques..."
    
    # Créer le répertoire de sauvegarde
    sudo mkdir -p /var/backups/commerceai
    
    # Script de sauvegarde
    cat > /tmp/backup-commerceai.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/commerceai"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Créer le répertoire de sauvegarde du jour
mkdir -p "$BACKUP_DIR/$DATE"

# Sauvegarder MongoDB
docker exec commerceai-mongodb mongodump --out "/tmp/backup_$DATE"
docker cp "commerceai-mongodb:/tmp/backup_$DATE" "$BACKUP_DIR/$DATE/mongodb"
docker exec commerceai-mongodb rm -rf "/tmp/backup_$DATE"

# Sauvegarder Redis
docker exec commerceai-redis redis-cli BGSAVE
sleep 10
docker cp "commerceai-redis:/data/dump.rdb" "$BACKUP_DIR/$DATE/redis_dump.rdb"

# Sauvegarder les logs
cp -r "$(pwd)/logs" "$BACKUP_DIR/$DATE/"

# Sauvegarder la configuration
cp docker-compose.yml "$BACKUP_DIR/$DATE/"
cp .env "$BACKUP_DIR/$DATE/env.backup"

# Compresser la sauvegarde
tar -czf "$BACKUP_DIR/commerceai_backup_$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Nettoyer les anciennes sauvegardes
find "$BACKUP_DIR" -name "commerceai_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Sauvegarde terminée: commerceai_backup_$DATE.tar.gz"
EOF
    
    sudo mv /tmp/backup-commerceai.sh /usr/local/bin/backup-commerceai.sh
    sudo chmod +x /usr/local/bin/backup-commerceai.sh
    
    # Programmer la sauvegarde quotidienne à 2h du matin
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-commerceai.sh") | crontab -
    
    log_success "Sauvegardes automatiques configurées."
}

# Configurer le monitoring système
setup_system_monitoring() {
    log_step "Configuration du monitoring système..."
    
    # Script de monitoring
    cat > /tmp/system-monitor.sh << 'EOF'
#!/bin/bash

# Vérifier l'utilisation disque
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERTE: Utilisation disque élevée: ${DISK_USAGE}%" | logger -t commerceai-monitor
fi

# Vérifier la mémoire
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "ALERTE: Utilisation mémoire élevée: ${MEM_USAGE}%" | logger -t commerceai-monitor
fi

# Vérifier les services Docker
if ! docker-compose ps | grep -q "Up"; then
    echo "ALERTE: Certains services Docker sont arrêtés" | logger -t commerceai-monitor
fi
EOF
    
    sudo mv /tmp/system-monitor.sh /usr/local/bin/system-monitor.sh
    sudo chmod +x /usr/local/bin/system-monitor.sh
    
    # Exécuter toutes les 5 minutes
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/system-monitor.sh") | crontab -
    
    log_success "Monitoring système configuré."
}

# Optimiser les performances système
optimize_system() {
    log_step "Optimisation des performances système..."
    
    if [[ "$OS" == "linux" ]]; then
        # Optimisations kernel
        cat > /tmp/commerceai-sysctl.conf << 'EOF'
# Optimisations CommerceAI Pro
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
fs.file-max = 2097152
EOF
        
        sudo mv /tmp/commerceai-sysctl.conf /etc/sysctl.d/99-commerceai.conf
        sudo sysctl -p /etc/sysctl.d/99-commerceai.conf
        
        # Limites de fichiers
        cat > /tmp/commerceai-limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF
        
        sudo mv /tmp/commerceai-limits.conf /etc/security/limits.d/99-commerceai.conf
        
        log_success "Optimisations système appliquées."
    fi
}

# Déployer l'application
deploy_application() {
    log_step "Déploiement de l'application..."
    
    # S'assurer que nous sommes dans le bon répertoire
    cd "$(dirname "$0")"
    
    # Exécuter le script de déploiement
    ./deploy.sh
    
    # Attendre que les services démarrent
    sleep 30
    
    # Vérifier que les services sont en cours d'exécution
    if docker-compose ps | grep -q "Up"; then
        log_success "Application déployée avec succès."
    else
        log_error "Échec du déploiement de l'application."
        docker-compose logs
        exit 1
    fi
}

# Configurer les services système
setup_systemd_services() {
    if [[ "$OS" == "linux" ]]; then
        log_step "Configuration des services systemd..."
        
        # Service pour CommerceAI Pro
        cat > /tmp/commerceai.service << EOF
[Unit]
Description=CommerceAI Pro Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
        
        sudo mv /tmp/commerceai.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable commerceai.service
        
        log_success "Services systemd configurés."
    fi
}

# Afficher le résumé final
show_final_summary() {
    echo
    echo "======================================"
    echo "  CommerceAI Pro - Production Ready! 🚀"
    echo "======================================"
    echo
    echo "🌐 URLs d'accès:"
    if [[ "$DOMAIN" != "localhost" ]]; then
        echo "   Application:    https://$DOMAIN"
        echo "   API:            https://api.$DOMAIN"
        echo "   Monitoring:     https://monitor.$DOMAIN"
    else
        echo "   Application:    http://localhost:3000"
        echo "   API Gateway:    http://localhost:4000"
        echo "   Monitoring:     http://localhost:4002"
    fi
    echo
    echo "🔧 Services configurés:"
    echo "   ✅ Docker & Docker Compose"
    echo "   ✅ Nginx (reverse proxy)"
    echo "   ✅ SSL/TLS (Let's Encrypt)" $(if [[ "$DOMAIN" == "localhost" ]]; then echo "(ignoré pour localhost)"; fi)
    echo "   ✅ Firewall"
    echo "   ✅ Sauvegardes automatiques"
    echo "   ✅ Monitoring système"
    echo "   ✅ Optimisations performances"
    echo
    echo "📊 Commandes utiles:"
    echo "   docker-compose ps              # Statut des services"
    echo "   docker-compose logs -f         # Logs en temps réel"
    echo "   sudo systemctl status nginx    # Statut Nginx"
    echo "   /usr/local/bin/backup-commerceai.sh  # Sauvegarde manuelle"
    echo
    echo "🔐 Sécurité:"
    echo "   ✅ Firewall configuré"
    echo "   ✅ SSL/TLS activé"
    echo "   ✅ Headers de sécurité"
    echo "   ✅ Rate limiting"
    echo
    echo "📈 Monitoring:"
    echo "   ✅ Health checks automatiques"
    echo "   ✅ Logs centralisés"
    echo "   ✅ Métriques de performance"
    echo "   ✅ Alertes système"
    echo
    echo "💾 Sauvegardes:"
    echo "   📁 Répertoire: /var/backups/commerceai"
    echo "   ⏰ Fréquence: Quotidienne (2h00)"
    echo "   🗂️  Rétention: $BACKUP_RETENTION_DAYS jours"
    echo
    log_success "Production setup terminé! Votre plateforme CommerceAI Pro est prête."
}

# Fonction principale
main() {
    echo "🚀 Configuration de production pour CommerceAI Pro"
    echo "================================================="
    echo
    
    check_root
    check_os
    install_system_dependencies
    setup_firewall
    setup_ssl
    setup_nginx
    setup_backups
    setup_system_monitoring
    optimize_system
    setup_systemd_services
    deploy_application
    show_final_summary
}

# Gestion des arguments
case "${1:-}" in
    "ssl")
        setup_ssl
        ;;
    "nginx")
        setup_nginx
        ;;
    "backup")
        setup_backups
        ;;
    "monitor")
        setup_system_monitoring
        ;;
    "optimize")
        optimize_system
        ;;
    "deploy")
        deploy_application
        ;;
    *)
        main
        ;;
esac