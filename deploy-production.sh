#!/bin/bash

# 🚀 Ekko SaaS Platform - Production Deployment Script
# This script deploys the complete Ekko platform with all AI agents

set -e

echo "🚀 Starting Ekko SaaS Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLATFORM_NAME="Ekko"
PLATFORM_VERSION="1.0.0"
DOMAIN=${1:-"localhost"}
ENVIRONMENT=${2:-"production"}

echo -e "${BLUE}Platform:${NC} $PLATFORM_NAME v$PLATFORM_VERSION"
echo -e "${BLUE}Domain:${NC} $DOMAIN"
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"

# Check prerequisites
echo -e "\n${YELLOW}🔍 Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f config.env.example ]; then
        cp config.env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your actual API keys and configuration${NC}"
        echo -e "${YELLOW}⚠️  Press Enter when ready to continue...${NC}"
        read
    else
        echo -e "${RED}❌ config.env.example not found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create necessary directories
echo -e "\n${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p logs
mkdir -p uploads
mkdir -p backups
mkdir -p monitoring/logs

echo -e "${GREEN}✅ Directories created${NC}"

# Set proper permissions
echo -e "\n${YELLOW}🔐 Setting proper permissions...${NC}"
chmod 755 logs
chmod 755 uploads
chmod 755 backups
chmod 755 monitoring/logs

echo -e "${GREEN}✅ Permissions set${NC}"

# Build and start services
echo -e "\n${YELLOW}🏗️  Building and starting services...${NC}"

# Stop any existing containers
echo -e "${BLUE}Stopping existing containers...${NC}"
docker-compose down --remove-orphans

# Build images
echo -e "${BLUE}Building Docker images...${NC}"
docker-compose build --no-cache

# Start services
echo -e "${BLUE}Starting services...${NC}"
docker-compose up -d

echo -e "${GREEN}✅ Services started${NC}"

# Wait for services to be ready
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Health checks
echo -e "\n${YELLOW}🏥 Performing health checks...${NC}"

# Check API Gateway
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway is healthy${NC}"
else
    echo -e "${RED}❌ API Gateway health check failed${NC}"
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Check AI Agents
agents=("5001" "5002" "5003" "5004" "5005" "5006")
for port in "${agents[@]}"; do
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ AI Agent on port $port is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  AI Agent on port $port health check failed${NC}"
    fi
done

# Check Platform Connectors
if curl -f http://localhost:4001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Platform Connectors are healthy${NC}"
else
    echo -e "${RED}❌ Platform Connectors health check failed${NC}"
fi

# Check Monitoring
if curl -f http://localhost:4002 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health Monitor is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Health Monitor health check failed${NC}"
fi

# Show service status
echo -e "\n${YELLOW}📊 Service Status:${NC}"
docker-compose ps

# Show logs summary
echo -e "\n${YELLOW}📋 Recent logs summary:${NC}"
docker-compose logs --tail=10

# Final instructions
echo -e "\n${GREEN}🎉 Ekko SaaS Platform Deployment Complete!${NC}"
echo -e "\n${BLUE}🌐 Access your platform:${NC}"
echo -e "   Frontend: ${GREEN}http://$DOMAIN:3000${NC}"
echo -e "   API Gateway: ${GREEN}http://$DOMAIN:4000${NC}"
echo -e "   Unified Dashboard: ${GREEN}http://$DOMAIN:3000/unified-dashboard${NC}"
echo -e "   Health Monitor: ${GREEN}http://$DOMAIN:4002${NC}"

echo -e "\n${BLUE}🔧 Useful commands:${NC}"
echo -e "   View logs: ${YELLOW}docker-compose logs -f [service-name]${NC}"
echo -e "   Stop services: ${YELLOW}docker-compose down${NC}"
echo -e "   Restart services: ${YELLOW}docker-compose restart${NC}"
echo -e "   Update services: ${YELLOW}docker-compose pull && docker-compose up -d${NC}"

echo -e "\n${BLUE}📚 Next steps:${NC}"
echo -e "   1. Open the frontend and complete the onboarding process"
echo -e "   2. Connect your platforms using the simplified connection system"
echo -e "   3. Configure your AI agents for optimal performance"
echo -e "   4. Monitor performance through the unified dashboard"

echo -e "\n${GREEN}🚀 Welcome to Ekko - Your AI-Powered E-commerce Solution!${NC}"

# Optional: Open browser
if command -v xdg-open &> /dev/null; then
    echo -e "\n${YELLOW}🌐 Opening browser...${NC}"
    xdg-open "http://$DOMAIN:3000" > /dev/null 2>&1
elif command -v open &> /dev/null; then
    echo -e "\n${YELLOW}🌐 Opening browser...${NC}"
    open "http://$DOMAIN:3000" > /dev/null 2>&1
fi
