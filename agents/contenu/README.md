# Content Creator Agent

## Overview
The Content Creator agent is a FastAPI-based service that generates various types of content using AI and can publish or schedule this content to multiple platforms through platform connectors.

## Features
- **Content Generation**: Create blog posts, product descriptions, social media posts, and email content
- **Platform Integration**: Publish and schedule content to various platforms:
  - Meta (Facebook, Instagram)
  - Twitter/X
  - LinkedIn
  - TikTok
  - Shopify
- **Content Management**: View, update, delete, and synchronize content across platforms
- **Analytics**: Retrieve platform analytics and content performance metrics

## API Endpoints

### Health Check
- `GET /health`: Check service health and enabled features

### Content Generation
- `POST /api/content/blog`: Generate blog post content
- `POST /api/content/product-description`: Generate product description content
- `POST /api/content/social`: Generate social media content with optional publishing/scheduling
- `POST /api/content/email`: Generate email content

### Platform Integration
- `POST /api/content/platforms/credentials`: Set platform authentication credentials
- `POST /api/content/platforms/{platform}/publish`: Publish content to a platform
- `POST /api/content/platforms/{platform}/schedule`: Schedule content for publication
- `GET /api/content/platforms/{platform}/content/{content_id}/insights`: Get content insights
- `POST /api/content/platforms/{platform}/content/{content_id}/sync`: Synchronize content with a platform
- `GET /api/content/platforms/{platform}/content`: List all content for a platform
- `DELETE /api/content/platforms/{platform}/content/{content_id}`: Delete content from a platform
- `GET /api/content/platforms/{platform}/analytics`: Get platform analytics
- `GET /api/content/platforms/{platform}/content/{content_id}/performance`: Get content performance metrics

## Setup

### Prerequisites
- Python 3.11+
- MongoDB
- Redis
- RabbitMQ
- API Gateway for platform connectors

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

### Docker
```bash
# Build the Docker image
docker build -t content-creator-agent .

# Run the container
docker run -p 5003:5003 content-creator-agent
```

## Environment Variables
Create a `.env` file with the following variables:
```
MONGODB_URI=mongodb://username:password@host:port/database
REDIS_HOST=redis_host
REDIS_PORT=6379
RABBITMQ_HOST=rabbitmq_host
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
OPENAI_API_KEY=your_openai_api_key
API_GATEWAY_URL=http://api-gateway:8000
```

## Platform Integration
The Content Creator agent integrates with various platforms through an API Gateway. To publish or schedule content to a platform:

1. Set platform credentials using the `/api/content/platforms/credentials` endpoint
2. Generate content or retrieve existing content
3. Publish or schedule the content using the appropriate endpoint

The agent handles content transformation for each platform, ensuring optimal format and compliance with platform requirements.