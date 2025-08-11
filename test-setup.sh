#!/bin/bash

# Script de test pour vérifier que l'API Gateway et la documentation fonctionnent

set -e

echo "🧪 Test de l'installation CommerceAI Pro"
echo "==========================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Vérifier la structure du projet
echo -e "\n${BLUE}📁 Vérification de la structure du projet${NC}"
echo "-------------------------------------------"

required_dirs=(
    "api-gateway"
    "agents"
    "platform-connectors"
    "frontend"
    "monitoring"
    "k8s"
    ".github/workflows"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_status 0 "Répertoire $dir présent"
    else
        print_status 1 "Répertoire $dir manquant"
    fi
done

# Test 2: Vérifier les fichiers de configuration
echo -e "\n${BLUE}📄 Vérification des fichiers de configuration${NC}"
echo "----------------------------------------------"

required_files=(
    "api-gateway/swagger.yaml"
    "api-gateway/swagger-server.js"
    "api-gateway/validate-swagger.js"
    "api-gateway/package.json"
    ".github/workflows/ci-cd.yml"
    ".github/workflows/docs.yml"
    "docker-compose.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "Fichier $file présent"
    else
        print_status 1 "Fichier $file manquant"
    fi
done

# Test 3: Vérifier les dépendances Node.js
echo -e "\n${BLUE}📦 Vérification des dépendances Node.js${NC}"
echo "--------------------------------------------"

cd api-gateway

if [ -f "package.json" ]; then
    print_info "Vérification du package.json..."
    
    # Vérifier que les dépendances importantes sont présentes
    required_deps=(
        "express"
        "swagger-ui-express"
        "yamljs"
        "@apidevtools/swagger-parser"
    )
    
    for dep in "${required_deps[@]}"; do
        if npm list "$dep" &>/dev/null; then
            print_status 0 "Dépendance $dep installée"
        else
            print_status 1 "Dépendance $dep manquante"
        fi
    done
else
    print_status 1 "package.json manquant dans api-gateway"
fi

# Test 4: Validation de la documentation OpenAPI
echo -e "\n${BLUE}📚 Validation de la documentation OpenAPI${NC}"
echo "-------------------------------------------"

if [ -f "swagger.yaml" ]; then
    print_info "Validation de swagger.yaml..."
    
    if npm run docs:validate &>/dev/null; then
        print_status 0 "Spécification OpenAPI valide"
    else
        print_status 1 "Spécification OpenAPI invalide"
        echo "Détails de l'erreur:"
        npm run docs:validate
    fi
else
    print_status 1 "Fichier swagger.yaml manquant"
fi

# Test 5: Test du serveur de documentation
echo -e "\n${BLUE}🌐 Test du serveur de documentation${NC}"
echo "------------------------------------"

print_info "Démarrage du serveur de documentation..."

# Démarrer le serveur en arrière-plan
npm run docs &
SERVER_PID=$!

# Attendre que le serveur démarre
sleep 5

# Tester les endpoints
endpoints=(
    "http://localhost:4001/health"
    "http://localhost:4001/swagger.yaml"
    "http://localhost:4001/swagger.json"
    "http://localhost:4001/api-docs"
)

for endpoint in "${endpoints[@]}"; do
    if curl -f -s "$endpoint" >/dev/null 2>&1; then
        print_status 0 "Endpoint $endpoint accessible"
    else
        print_status 1 "Endpoint $endpoint inaccessible"
    fi
done

# Arrêter le serveur
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

# Test 6: Vérifier les workflows GitHub Actions
echo -e "\n${BLUE}🔄 Vérification des workflows GitHub Actions${NC}"
echo "---------------------------------------------"

cd ..

workflows=(
    ".github/workflows/ci-cd.yml"
    ".github/workflows/docs.yml"
)

for workflow in "${workflows[@]}"; do
    if [ -f "$workflow" ]; then
        print_info "Validation de $workflow..."
        
        # Vérifier la syntaxe YAML basique
        if python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
            print_status 0 "Syntaxe YAML valide pour $workflow"
        else
            print_status 1 "Syntaxe YAML invalide pour $workflow"
        fi
        
        # Vérifier les éléments essentiels
        if grep -q "on:" "$workflow" && grep -q "jobs:" "$workflow"; then
            print_status 0 "Structure workflow valide pour $workflow"
        else
            print_status 1 "Structure workflow invalide pour $workflow"
        fi
    else
        print_status 1 "Workflow $workflow manquant"
    fi
done

# Test 7: Vérifier la configuration Docker
echo -e "\n${BLUE}🐳 Vérification de la configuration Docker${NC}"
echo "--------------------------------------------"

if [ -f "docker-compose.yml" ]; then
    print_info "Validation de docker-compose.yml..."
    
    if docker-compose config >/dev/null 2>&1; then
        print_status 0 "Configuration Docker Compose valide"
    else
        print_status 1 "Configuration Docker Compose invalide"
    fi
else
    print_warning "Fichier docker-compose.yml manquant (optionnel)"
fi

# Résumé final
echo -e "\n${BLUE}📊 Résumé des tests${NC}"
echo "=================="

print_info "Tests terminés !"
print_info "Documentation API disponible : http://localhost:4001/api-docs"
print_info "Pour démarrer le serveur : cd api-gateway && npm run docs"
print_info "Pour valider l'OpenAPI : cd api-gateway && npm run docs:validate"

echo -e "\n${GREEN}🎉 Installation CommerceAI Pro vérifiée avec succès !${NC}"
echo -e "${BLUE}📚 Consultez le README.md pour plus d'informations${NC}"

exit 0