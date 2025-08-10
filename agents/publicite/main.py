import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from openai import OpenAI
import uvicorn
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests
import pandas as pd
import numpy as np
from pymongo import MongoClient
import redis
import pika

# Import platform integration
from platform_integration import PlatformIntegration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/advertising_agent.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("advertising-agent")

# Initialize FastAPI app
app = FastAPI(title="Ekko Advertising AI Agent")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# MongoDB connection
try:
    mongo_client = MongoClient(os.getenv("MONGODB_URI", "mongodb://admin:commerceai2024@mongodb:27017/commerceai?authSource=admin"))
    db = mongo_client.commerceai
    logger.info("Connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    db = None

# Redis connection
try:
    redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    logger.info("Connected to Redis")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    redis_client = None

# RabbitMQ connection
try:
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    rabbitmq_params = pika.URLParameters(rabbitmq_url)
    rabbitmq_connection = pika.BlockingConnection(rabbitmq_params)
    rabbitmq_channel = rabbitmq_connection.channel()
    rabbitmq_channel.exchange_declare(exchange='ekko.advertising', exchange_type='topic', durable=True)
    logger.info("Connected to RabbitMQ")
except Exception as e:
    logger.error(f"Failed to connect to RabbitMQ: {e}")
    rabbitmq_connection = None
    rabbitmq_channel = None

# Initialize platform integration
platform_integration = PlatformIntegration(db, redis_client, rabbitmq_channel)
logger.info("Initialized platform integration")


# Data models
class AdPlatform(BaseModel):
    name: str
    account_id: str
    access_token: Optional[str] = None

class AdCampaign(BaseModel):
    name: str
    objective: str
    budget: float
    start_date: str
    end_date: Optional[str] = None
    target_audience: Dict[str, Any]
    platform: str
    ad_creatives: List[Dict[str, Any]]

class AdPerformance(BaseModel):
    campaign_id: str
    platform: str
    impressions: int
    clicks: int
    conversions: int
    spend: float
    date: str

class AdOptimizationRequest(BaseModel):
    campaign_id: str
    platform: str
    budget_adjustment: Optional[float] = None
    creative_suggestions: bool = False
    audience_expansion: bool = False

class PlatformCredentials(BaseModel):
    platform: str
    credentials: Dict[str, Any]

class PlatformCampaignRequest(BaseModel):
    platform: str
    campaign_data: AdCampaign
    publish_to_platform: bool = False

class PlatformCampaignResponse(BaseModel):
    campaign_id: str
    platform: str
    platform_campaign_id: Optional[str] = None
    status: str
    details: Optional[Dict[str, Any]] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "Ekko Advertising AI Agent",
        "version": "1.0.0",
        "platform_integration": "enabled"
    }

# Create ad campaign endpoint
@app.post("/api/advertising/campaigns")
async def create_campaign(campaign: AdCampaign):
    try:
        logger.info(f"Creating new campaign: {campaign.name} for platform: {campaign.platform}")
        
        # Generate AI-optimized campaign settings
        optimized_campaign = await generate_optimized_campaign(campaign)
        
        # Store in database
        if db:
            result = db.ad_campaigns.insert_one(optimized_campaign.dict())
            campaign_id = str(result.inserted_id)
            logger.info(f"Campaign created with ID: {campaign_id}")
            return {"success": True, "campaign_id": campaign_id, "campaign": optimized_campaign}
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get campaign performance endpoint
@app.get("/api/advertising/campaigns/{campaign_id}/performance")
async def get_campaign_performance(campaign_id: str):
    try:
        if db:
            # Get campaign data
            campaign = db.ad_campaigns.find_one({"_id": campaign_id})
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found")
            
            # Get performance data
            performance_data = list(db.ad_performance.find({"campaign_id": campaign_id}))
            
            # Analyze performance
            analysis = await analyze_campaign_performance(campaign, performance_data)
            
            return {"success": True, "campaign": campaign, "performance": performance_data, "analysis": analysis}
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error getting campaign performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Optimize ad campaign endpoint
@app.post("/api/advertising/campaigns/{campaign_id}/optimize")
async def optimize_campaign(campaign_id: str, request: AdOptimizationRequest):
    try:
        if db:
            # Get campaign data
            campaign = db.ad_campaigns.find_one({"_id": campaign_id})
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found")
            
            # Get performance data
            performance_data = list(db.ad_performance.find({"campaign_id": campaign_id}))
            
            # Generate optimization recommendations
            recommendations = await generate_optimization_recommendations(
                campaign, performance_data, request
            )
            
            # Apply optimizations if requested
            if request.budget_adjustment:
                db.ad_campaigns.update_one(
                    {"_id": campaign_id},
                    {"$set": {"budget": campaign["budget"] + request.budget_adjustment}}
                )
            
            return {"success": True, "recommendations": recommendations}
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error optimizing campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate A/B test endpoint
@app.post("/api/advertising/campaigns/{campaign_id}/ab-test")
async def create_ab_test(campaign_id: str):
    try:
        if db:
            # Get campaign data
            campaign = db.ad_campaigns.find_one({"_id": campaign_id})
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found")
            
            # Generate A/B test variations
            variations = await generate_ab_test_variations(campaign)
            
            # Store variations
            for variation in variations:
                variation["original_campaign_id"] = campaign_id
                db.ad_campaigns.insert_one(variation)
            
            return {"success": True, "variations": variations}
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error creating A/B test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI functions
async def generate_optimized_campaign(campaign: AdCampaign):
    try:
        # Use OpenAI to optimize campaign settings
        prompt = f"""
        Create an optimized advertising campaign for {campaign.platform} with the following details:
        - Campaign name: {campaign.name}
        - Objective: {campaign.objective}
        - Budget: ${campaign.budget}
        - Target audience: {json.dumps(campaign.target_audience)}
        
        Provide optimized campaign settings including:
        1. Refined target audience parameters
        2. Optimal bid strategy
        3. Ad scheduling recommendations
        4. Budget allocation across ad sets
        5. Platform-specific optimizations
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert digital advertising AI that specializes in optimizing ad campaigns across multiple platforms."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        
        optimization_suggestions = response.choices[0].message.content
        
        # Update campaign with AI suggestions
        # This is a simplified implementation - in a real system, you would parse the AI response
        # and apply specific changes to the campaign object
        campaign.name = f"{campaign.name} (AI Optimized)"
        
        return campaign
    except Exception as e:
        logger.error(f"Error generating optimized campaign: {e}")
        raise

async def analyze_campaign_performance(campaign, performance_data):
    try:
        # Convert performance data to DataFrame for analysis
        if not performance_data:
            return {"message": "No performance data available yet"}
        
        df = pd.DataFrame(performance_data)
        
        # Calculate key metrics
        total_impressions = df['impressions'].sum()
        total_clicks = df['clicks'].sum()
        total_conversions = df['conversions'].sum()
        total_spend = df['spend'].sum()
        
        ctr = (total_clicks / total_impressions) if total_impressions > 0 else 0
        conversion_rate = (total_conversions / total_clicks) if total_clicks > 0 else 0
        cpa = (total_spend / total_conversions) if total_conversions > 0 else 0
        roas = (total_conversions * 50 / total_spend) if total_spend > 0 else 0  # Assuming $50 value per conversion
        
        # Use OpenAI to generate insights
        prompt = f"""
        Analyze this advertising campaign performance:
        - Platform: {campaign['platform']}
        - Total Impressions: {total_impressions}
        - Total Clicks: {total_clicks}
        - CTR: {ctr:.2%}
        - Conversions: {total_conversions}
        - Conversion Rate: {conversion_rate:.2%}
        - CPA: ${cpa:.2f}
        - ROAS: {roas:.2f}x
        - Total Spend: ${total_spend:.2f}
        
        Provide 3-5 key insights and recommendations to improve performance.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert digital advertising analyst AI that provides concise, actionable insights."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )
        
        insights = response.choices[0].message.content
        
        return {
            "metrics": {
                "impressions": total_impressions,
                "clicks": total_clicks,
                "ctr": ctr,
                "conversions": total_conversions,
                "conversion_rate": conversion_rate,
                "cpa": cpa,
                "roas": roas,
                "spend": total_spend
            },
            "insights": insights
        }
    except Exception as e:
        logger.error(f"Error analyzing campaign performance: {e}")
        return {"error": str(e)}

async def generate_optimization_recommendations(campaign, performance_data, request):
    try:
        # Similar to analyze_campaign_performance but focused on specific optimization areas
        analysis = await analyze_campaign_performance(campaign, performance_data)
        
        optimization_areas = []
        if request.budget_adjustment is not None:
            optimization_areas.append("budget adjustment")
        if request.creative_suggestions:
            optimization_areas.append("creative improvements")
        if request.audience_expansion:
            optimization_areas.append("audience targeting expansion")
        
        prompt = f"""
        Based on this campaign performance analysis:
        {json.dumps(analysis['metrics'])}
        
        Generate specific optimization recommendations for: {', '.join(optimization_areas)}
        For the {campaign['platform']} platform.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert digital advertising optimization AI that provides specific, actionable recommendations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800
        )
        
        recommendations = response.choices[0].message.content
        
        return {
            "analysis": analysis,
            "recommendations": recommendations,
            "optimization_areas": optimization_areas
        }
    except Exception as e:
        logger.error(f"Error generating optimization recommendations: {e}")
        return {"error": str(e)}

async def generate_ab_test_variations(campaign):
    try:
        prompt = f"""
        Create A/B test variations for this {campaign['platform']} ad campaign:
        {json.dumps(campaign)}
        
        Generate 2 variations with different:
        1. Ad copy approaches
        2. Call-to-action phrases
        3. Visual creative concepts
        
        Provide complete specifications for each variation.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in creating effective A/B tests for digital advertising campaigns."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        
        # This is simplified - in a real implementation, you would parse the AI response
        # into structured variation objects
        variations_text = response.choices[0].message.content
        
        # Create two simple variation objects for demonstration
        variations = [
            {
                "name": f"{campaign['name']} - Variation A",
                "description": "A/B test variation A",
                "variation_type": "A"
            },
            {
                "name": f"{campaign['name']} - Variation B",
                "description": "A/B test variation B",
                "variation_type": "B"
            }
        ]
        
        return variations
    except Exception as e:
        logger.error(f"Error generating A/B test variations: {e}")
        raise

# Platform integration endpoints
@app.post("/api/advertising/platforms/credentials")
async def set_platform_credentials(credentials: PlatformCredentials):
    try:
        logger.info(f"Setting credentials for platform: {credentials.platform}")
        
        # Store credentials in database
        if db:
            # Check if credentials already exist
            existing = db.platform_credentials.find_one({"platform": credentials.platform})
            
            if existing:
                # Update existing credentials
                db.platform_credentials.update_one(
                    {"platform": credentials.platform},
                    {"$set": {"credentials": credentials.credentials}}
                )
            else:
                # Insert new credentials
                db.platform_credentials.insert_one({
                    "platform": credentials.platform,
                    "credentials": credentials.credentials,
                    "created_at": datetime.now().isoformat()
                })
            
            # Initialize connector
            connector_id = await platform_integration.initialize_connector(
                credentials.platform, credentials.credentials
            )
            
            if connector_id:
                return {"success": True, "message": f"Credentials set for {credentials.platform}", "connector_id": connector_id}
            else:
                raise HTTPException(status_code=500, detail=f"Failed to initialize connector for {credentials.platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error setting platform credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/advertising/platforms/campaigns", response_model=PlatformCampaignResponse)
async def create_platform_campaign(request: PlatformCampaignRequest):
    try:
        logger.info(f"Creating campaign on platform: {request.platform}")
        
        # Generate AI-optimized campaign settings
        optimized_campaign = await generate_optimized_campaign(request.campaign_data)
        
        # Transform to platform-specific format
        platform_campaign = await platform_integration.transform_internal_to_platform_format(
            request.platform, optimized_campaign.dict()
        )
        
        # Store in database
        if db:
            result = db.ad_campaigns.insert_one({
                **optimized_campaign.dict(),
                "platform_specific_data": platform_campaign,
                "created_at": datetime.now().isoformat()
            })
            campaign_id = str(result.inserted_id)
            
            # Publish to platform if requested
            platform_campaign_id = None
            if request.publish_to_platform:
                platform_response = await platform_integration.create_campaign(
                    request.platform, platform_campaign
                )
                if platform_response:
                    platform_campaign_id = platform_response.get("id")
                    # Update database with platform campaign ID
                    db.ad_campaigns.update_one(
                        {"_id": result.inserted_id},
                        {"$set": {"platform_campaign_id": platform_campaign_id}}
                    )
            
            return PlatformCampaignResponse(
                campaign_id=campaign_id,
                platform=request.platform,
                platform_campaign_id=platform_campaign_id,
                status="published" if platform_campaign_id else "draft",
                details=platform_campaign
            )
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error creating platform campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/advertising/platforms/{platform}/campaigns/{campaign_id}/insights")
async def get_platform_campaign_insights(platform: str, campaign_id: str):
    try:
        logger.info(f"Getting insights for campaign {campaign_id} on platform: {platform}")
        
        # Get campaign from database
        if db:
            campaign = db.ad_campaigns.find_one({"platform_campaign_id": campaign_id})
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found")
            
            # Get insights from platform
            insights = await platform_integration.get_campaign_insights(platform, campaign_id)
            
            if insights:
                # Store insights in database
                db.ad_performance.insert_one({
                    "campaign_id": str(campaign["_id"]),
                    "platform": platform,
                    "platform_campaign_id": campaign_id,
                    "impressions": insights.get("impressions", 0),
                    "clicks": insights.get("clicks", 0),
                    "conversions": insights.get("conversions", 0),
                    "spend": insights.get("spend", 0),
                    "ctr": insights.get("ctr", 0),
                    "cpc": insights.get("cpc", 0),
                    "cpa": insights.get("cpa", 0),
                    "date": datetime.now().isoformat()
                })
                
                return {"success": True, "campaign_id": str(campaign["_id"]), "insights": insights}
            else:
                raise HTTPException(status_code=404, detail="No insights available for this campaign")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error getting platform campaign insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/advertising/platforms/{platform}/campaigns/{campaign_id}/sync")
async def sync_platform_campaign(platform: str, campaign_id: str):
    try:
        logger.info(f"Syncing campaign {campaign_id} with platform: {platform}")
        
        # Get campaign from database
        if db:
            campaign = db.ad_campaigns.find_one({"_id": campaign_id})
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found")
            
            # Check if campaign is already published to platform
            if "platform_campaign_id" in campaign:
                # Update existing campaign on platform
                update_response = await platform_integration.update_campaign(
                    platform, campaign["platform_campaign_id"], campaign["platform_specific_data"]
                )
                
                return {"success": True, "message": "Campaign updated on platform", "details": update_response}
            else:
                # Create new campaign on platform
                platform_response = await platform_integration.create_campaign(
                    platform, campaign["platform_specific_data"]
                )
                
                if platform_response:
                    platform_campaign_id = platform_response.get("id")
                    # Update database with platform campaign ID
                    db.ad_campaigns.update_one(
                        {"_id": campaign_id},
                        {"$set": {"platform_campaign_id": platform_campaign_id}}
                    )
                    
                    return {"success": True, "message": "Campaign published to platform", "platform_campaign_id": platform_campaign_id}
                else:
                    raise HTTPException(status_code=500, detail="Failed to publish campaign to platform")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error syncing platform campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Start the server
if __name__ == "__main__":
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port=5002, reload=True)