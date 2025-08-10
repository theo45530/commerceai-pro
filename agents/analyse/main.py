import os
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from openai import OpenAI
import uvicorn
from fastapi import FastAPI, HTTPException, Body, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import requests
import pandas as pd
import numpy as np
from pymongo import MongoClient
import redis
import pika
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/analysis_agent.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("analysis-agent")

# Initialize FastAPI app
app = FastAPI(title="Ekko Analysis AI Agent")

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
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://admin:commerceai2024@mongodb:27017/commerceai?authSource=admin")
    mongo_client = MongoClient(mongodb_uri)
    db = mongo_client.commerceai
    # Test connection
    mongo_client.admin.command('ping')
    logger.info("Connected to MongoDB successfully")
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
    rabbitmq_channel.exchange_declare(exchange='ekko.analysis', exchange_type='topic', durable=True)
    logger.info("Connected to RabbitMQ")
except Exception as e:
    logger.error(f"Failed to connect to RabbitMQ: {e}")
    rabbitmq_connection = None
    rabbitmq_channel = None

# Data models
class ProductInfo(BaseModel):
    product_id: str
    name: str
    description: str
    price: float
    images: List[str]
    category: str
    tags: List[str] = []
    url: Optional[str] = None

class ProductAnalysisRequest(BaseModel):
    product: ProductInfo
    store_url: Optional[str] = None
    competitor_urls: List[str] = []
    detailed_analysis: bool = False

class CheckoutAnalysisRequest(BaseModel):
    checkout_url: str
    payment_methods: List[str]
    shipping_options: List[str]
    has_guest_checkout: bool
    has_account_creation: bool
    has_social_login: bool
    steps_count: int

class AnalysisResult(BaseModel):
    score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    details: Optional[Dict[str, Any]] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "Ekko Analysis AI Agent",
        "version": "1.0.0"
    }

# Product listing analysis endpoint
@app.post("/api/analysis/product", response_model=AnalysisResult)
async def analyze_product(request: ProductAnalysisRequest):
    try:
        logger.info(f"Analyzing product: {request.product.name}")
        
        # Analyze product listing
        analysis = await analyze_product_listing(request.product, request.detailed_analysis)
        
        # If competitor URLs are provided, analyze competitors
        if request.competitor_urls and len(request.competitor_urls) > 0:
            competitor_analysis = await analyze_competitors(request.product, request.competitor_urls)
            analysis["competitor_analysis"] = competitor_analysis
        
        # Store analysis in database
        if db:
            db.product_analyses.insert_one({
                "product_id": request.product.product_id,
                "analysis": analysis,
                "created_at": datetime.now()
            })
        
        return AnalysisResult(
            score=analysis["score"],
            strengths=analysis["strengths"],
            weaknesses=analysis["weaknesses"],
            recommendations=analysis["recommendations"],
            details=analysis.get("details")
        )
    except Exception as e:
        logger.error(f"Error analyzing product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Checkout page analysis endpoint
@app.post("/api/analysis/checkout", response_model=AnalysisResult)
async def analyze_checkout(request: CheckoutAnalysisRequest):
    try:
        logger.info(f"Analyzing checkout process for URL: {request.checkout_url}")
        
        # Analyze checkout process
        analysis = await analyze_checkout_process(request)
        
        # Store analysis in database
        if db:
            db.checkout_analyses.insert_one({
                "checkout_url": request.checkout_url,
                "analysis": analysis,
                "created_at": datetime.now()
            })
        
        return AnalysisResult(
            score=analysis["score"],
            strengths=analysis["strengths"],
            weaknesses=analysis["weaknesses"],
            recommendations=analysis["recommendations"],
            details=analysis.get("details")
        )
    except Exception as e:
        logger.error(f"Error analyzing checkout: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Website analysis endpoint
@app.post("/api/analysis/website")
async def analyze_website(website_url: str = Body(..., embed=True)):
    try:
        logger.info(f"Analyzing website: {website_url}")
        
        # Analyze website
        analysis = await analyze_ecommerce_website(website_url)
        
        # Store analysis in database
        if db:
            db.website_analyses.insert_one({
                "website_url": website_url,
                "analysis": analysis,
                "created_at": datetime.now()
            })
        
        return {
            "success": True,
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error analyzing website: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI analysis functions
async def analyze_product_listing(product: ProductInfo, detailed: bool = False) -> Dict[str, Any]:
    try:
        # Prepare the prompt for OpenAI
        prompt = f"""
        Analyze this e-commerce product listing and provide detailed feedback on how to improve it for better conversions:
        
        Product Name: {product.name}
        Description: {product.description}
        Price: ${product.price}
        Category: {product.category}
        Tags: {', '.join(product.tags)}
        Number of Images: {len(product.images)}
        
        Please analyze the following aspects:
        1. Product Title - Is it descriptive, keyword-rich, and compelling?
        2. Product Description - Is it detailed, benefit-focused, and persuasive?
        3. Pricing Strategy - Is the price competitive and presented effectively?
        4. Images - Are there enough high-quality images from multiple angles?
        5. SEO Elements - Are the category and tags optimized for search?
        
        Provide a conversion score from 0-100, list key strengths, weaknesses, and specific recommendations for improvement.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert e-commerce conversion rate optimization specialist with deep knowledge of product listing best practices."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        
        analysis_text = response.choices[0].message.content
        
        # Parse the analysis text to extract structured data
        # This is a simplified implementation - in a real system, you would use more robust parsing
        
        # Extract score (assuming the AI includes a score in its response)
        score_match = analysis_text.lower().find("score")
        score_text = analysis_text[score_match:score_match+30]
        score = float(next((s for s in score_text.split() if s.replace('.', '').isdigit()), 70))
        
        # Extract strengths, weaknesses, and recommendations
        sections = analysis_text.split("\n\n")
        strengths = [s.strip() for s in sections[1].split("\n") if s.strip() and not s.strip().lower().startswith("strength")]
        weaknesses = [s.strip() for s in sections[2].split("\n") if s.strip() and not s.strip().lower().startswith("weakness")]
        recommendations = [s.strip() for s in sections[3].split("\n") if s.strip() and not s.strip().lower().startswith("recommendation")]
        
        # Prepare the analysis result
        analysis = {
            "score": min(max(score, 0), 100),  # Ensure score is between 0-100
            "strengths": strengths[:3],  # Limit to top 3
            "weaknesses": weaknesses[:3],  # Limit to top 3
            "recommendations": recommendations[:5],  # Limit to top 5
        }
        
        if detailed:
            # Add more detailed analysis
            detailed_prompt = f"""
            Based on the product information provided, give detailed suggestions for:
            
            1. A/B testing opportunities for this product listing
            2. Specific copywriting improvements with before/after examples
            3. Cross-selling and upselling opportunities
            4. Social proof elements that could be added
            5. Mobile optimization considerations
            
            Product: {product.name}
            Description: {product.description}
            Price: ${product.price}
            Category: {product.category}
            """
            
            detailed_response = openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert e-commerce conversion rate optimization specialist."},
                    {"role": "user", "content": detailed_prompt}
                ],
                max_tokens=1000
            )
            
            detailed_analysis = detailed_response.choices[0].message.content
            analysis["details"] = {
                "advanced_suggestions": detailed_analysis,
                "analyzed_at": datetime.now().isoformat()
            }
        
        return analysis
    except Exception as e:
        logger.error(f"Error in product listing analysis: {e}")
        raise

async def analyze_competitors(product: ProductInfo, competitor_urls: List[str]) -> Dict[str, Any]:
    try:
        # In a real implementation, you would scrape competitor product pages
        # For this example, we'll simulate competitor analysis
        
        competitor_summary = f"Analyzed {len(competitor_urls)} competitor products similar to {product.name}."
        
        prompt = f"""
        I'm analyzing a product against its competitors. Here's my product:
        
        My Product: {product.name}
        Description: {product.description}
        Price: ${product.price}
        Category: {product.category}
        
        I've analyzed {len(competitor_urls)} competitor products in the same category.
        
        Please provide:
        1. Likely competitive advantages my product might have
        2. Likely disadvantages compared to competitors
        3. Pricing strategy recommendations based on the market
        4. Unique selling proposition suggestions to differentiate my product
        5. Content and feature recommendations based on industry standards
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert in competitive analysis for e-commerce products."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800
        )
        
        analysis = response.choices[0].message.content
        
        return {
            "summary": competitor_summary,
            "analysis": analysis,
            "competitor_count": len(competitor_urls)
        }
    except Exception as e:
        logger.error(f"Error in competitor analysis: {e}")
        return {"error": str(e)}

async def analyze_checkout_process(request: CheckoutAnalysisRequest) -> Dict[str, Any]:
    try:
        # Prepare the prompt for OpenAI
        prompt = f"""
        Analyze this e-commerce checkout process and provide detailed feedback on how to improve it for better conversions:
        
        Checkout URL: {request.checkout_url}
        Payment Methods Available: {', '.join(request.payment_methods)}
        Shipping Options: {', '.join(request.shipping_options)}
        Guest Checkout Available: {'Yes' if request.has_guest_checkout else 'No'}
        Account Creation Available: {'Yes' if request.has_account_creation else 'No'}
        Social Login Available: {'Yes' if request.has_social_login else 'No'}
        Number of Checkout Steps: {request.steps_count}
        
        Please analyze the following aspects:
        1. Checkout Flow - Is it streamlined and user-friendly?
        2. Payment Options - Are there enough payment methods to satisfy most customers?
        3. Account Creation - Is the balance between guest checkout and account creation optimal?
        4. Mobile Friendliness - Based on the number of steps, is it likely mobile-friendly?
        5. Trust Signals - What trust elements should be added to the checkout?
        
        Provide a conversion score from 0-100, list key strengths, weaknesses, and specific recommendations for improvement.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert e-commerce checkout optimization specialist with deep knowledge of reducing cart abandonment."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000
        )
        
        analysis_text = response.choices[0].message.content
        
        # Parse the analysis text (simplified implementation)
        score_match = analysis_text.lower().find("score")
        score_text = analysis_text[score_match:score_match+30]
        score = float(next((s for s in score_text.split() if s.replace('.', '').isdigit()), 65))
        
        sections = analysis_text.split("\n\n")
        strengths = [s.strip() for s in sections[1].split("\n") if s.strip() and not s.strip().lower().startswith("strength")]
        weaknesses = [s.strip() for s in sections[2].split("\n") if s.strip() and not s.strip().lower().startswith("weakness")]
        recommendations = [s.strip() for s in sections[3].split("\n") if s.strip() and not s.strip().lower().startswith("recommendation")]
        
        return {
            "score": min(max(score, 0), 100),
            "strengths": strengths[:3],
            "weaknesses": weaknesses[:3],
            "recommendations": recommendations[:5],
            "details": {
                "payment_methods_analysis": f"Analyzed {len(request.payment_methods)} payment methods",
                "shipping_options_analysis": f"Analyzed {len(request.shipping_options)} shipping options",
                "checkout_steps_analysis": f"Checkout has {request.steps_count} steps"
            }
        }
    except Exception as e:
        logger.error(f"Error in checkout analysis: {e}")
        raise

async def analyze_ecommerce_website(website_url: str) -> Dict[str, Any]:
    try:
        # In a real implementation, you would scrape the website
        # For this example, we'll simulate website analysis
        
        prompt = f"""
        Perform a comprehensive analysis of this e-commerce website: {website_url}
        
        Please analyze the following aspects:
        1. Overall User Experience
        2. Navigation and Site Structure
        3. Product Presentation
        4. Search Functionality
        5. Mobile Responsiveness
        6. Page Load Speed Considerations
        7. Trust Elements and Social Proof
        8. Call-to-Action Effectiveness
        
        For each aspect, provide a score from 0-10, key observations, and specific recommendations for improvement.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert e-commerce website analyst specializing in conversion rate optimization."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500
        )
        
        analysis = response.choices[0].message.content
        
        # Extract overall score (simplified implementation)
        scores = []
        for line in analysis.split("\n"):
            if "score" in line.lower() and "/10" in line:
                try:
                    score_text = line.split("/10")[0].split(":")[-1].strip()
                    score = float(score_text)
                    scores.append(score)
                except:
                    pass
        
        overall_score = sum(scores) / len(scores) if scores else 7.0
        
        return {
            "overall_score": overall_score,
            "detailed_analysis": analysis,
            "analyzed_url": website_url,
            "analyzed_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error in website analysis: {e}")
        raise

# Start the server
if __name__ == "__main__":
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port=5004, reload=True)