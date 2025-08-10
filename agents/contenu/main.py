import os
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import uuid

from openai import OpenAI
import uvicorn
from fastapi import FastAPI, HTTPException, Body, Depends, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import requests
from pymongo import MongoClient
import redis
import pika
from slugify import slugify

# Import platform integration
from platform_integration import PlatformIntegration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/content_creator.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("content-creator")

# Initialize FastAPI app
app = FastAPI(title="Ekko Content Creator AI Agent")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
os.makedirs("logs", exist_ok=True)
os.makedirs("generated_content", exist_ok=True)

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
    rabbitmq_channel.exchange_declare(exchange='ekko.content', exchange_type='topic', durable=True)
    logger.info("Connected to RabbitMQ")
except Exception as e:
    logger.error(f"Failed to connect to RabbitMQ: {e}")
    rabbitmq_connection = None
    rabbitmq_channel = None

# Initialize platform integration
platform_integration = PlatformIntegration(db, redis_client, rabbitmq_channel)

# Data models
class ContentRequest(BaseModel):
    business_name: str
    business_description: str
    content_type: str = Field(..., description="Type of content: blog_post, product_description, social_media, email, etc.")
    topic: str
    target_audience: Optional[str] = None
    tone: Optional[str] = None
    keywords: Optional[List[str]] = None
    length: Optional[str] = None
    format: Optional[str] = None
    additional_instructions: Optional[str] = None
    reference_urls: Optional[List[str]] = None

class BlogPostRequest(ContentRequest):
    title: Optional[str] = None
    sections: Optional[List[str]] = None
    include_images: Optional[bool] = False
    include_meta_description: Optional[bool] = True

class ProductDescriptionRequest(ContentRequest):
    product_name: str
    product_features: List[str]
    price: Optional[float] = None
    benefits: Optional[List[str]] = None
    specifications: Optional[Dict[str, str]] = None

class SocialMediaRequest(ContentRequest):
    platform: str = Field(..., description="Social media platform: facebook, instagram, twitter, linkedin, etc.")
    post_type: Optional[str] = None
    include_hashtags: Optional[bool] = True
    include_emoji: Optional[bool] = True
    include_call_to_action: Optional[bool] = True
    publish_to_platform: Optional[bool] = False
    schedule_time: Optional[str] = None

class EmailContentRequest(ContentRequest):
    email_type: str = Field(..., description="Type of email: newsletter, promotional, welcome, abandoned_cart, etc.")
    subject_line: Optional[str] = None
    include_button: Optional[bool] = True
    button_text: Optional[str] = None
    personalization: Optional[bool] = True

class GeneratedContent(BaseModel):
    id: str
    business_name: str
    content_type: str
    topic: str
    title: Optional[str] = None
    content: str
    meta_description: Optional[str] = None
    keywords: Optional[List[str]] = None
    created_at: datetime
    slug: Optional[str] = None

# Platform credentials model
class PlatformCredentials(BaseModel):
    platform: str
    credentials: Dict[str, Any]

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "Ekko Content Creator AI Agent",
        "version": "1.0.0",
        "platform_integration": "enabled"
    }

# Generate blog post
@app.post("/api/content/blog", response_model=Dict[str, Any])
async def generate_blog_post(request: BlogPostRequest):
    try:
        logger.info(f"Generating blog post about {request.topic} for {request.business_name}")
        
        # Generate a unique ID for the content
        content_id = str(uuid.uuid4())
        
        # Generate blog post content using AI
        generated_content = await generate_blog_content(request)
        
        # Create slug from title
        title = generated_content.get("title", request.title or request.topic)
        slug = slugify(title)
        
        # Save the generated content to file
        file_path = f"generated_content/{content_id}.md"
        with open(file_path, 'w') as f:
            f.write(f"# {title}\n\n")
            if generated_content.get("meta_description"):
                f.write(f"*{generated_content.get('meta_description')}*\n\n")
            f.write(generated_content.get("content", ""))
        
        # Create record in database
        content_record = {
            "id": content_id,
            "business_name": request.business_name,
            "content_type": "blog_post",
            "topic": request.topic,
            "title": title,
            "content": generated_content.get("content", ""),
            "meta_description": generated_content.get("meta_description"),
            "keywords": generated_content.get("keywords", request.keywords),
            "created_at": datetime.now(),
            "slug": slug
        }
        
        if db:
            db.generated_content.insert_one(content_record)
        
        return {
            "success": True,
            "content_id": content_id,
            "title": title,
            "meta_description": generated_content.get("meta_description"),
            "content": generated_content.get("content"),
            "keywords": generated_content.get("keywords", request.keywords),
            "slug": slug,
            "file_path": file_path
        }
    except Exception as e:
        logger.error(f"Error generating blog post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate product description
@app.post("/api/content/product", response_model=Dict[str, Any])
async def generate_product_description(request: ProductDescriptionRequest):
    try:
        logger.info(f"Generating product description for {request.product_name}")
        
        # Generate a unique ID for the content
        content_id = str(uuid.uuid4())
        
        # Generate product description using AI
        generated_content = await generate_product_content(request)
        
        # Create slug from product name
        slug = slugify(request.product_name)
        
        # Save the generated content to file
        file_path = f"generated_content/{content_id}.md"
        with open(file_path, 'w') as f:
            f.write(f"# {request.product_name}\n\n")
            f.write(generated_content.get("content", ""))
        
        # Create record in database
        content_record = {
            "id": content_id,
            "business_name": request.business_name,
            "content_type": "product_description",
            "topic": request.topic,
            "title": request.product_name,
            "content": generated_content.get("content", ""),
            "keywords": generated_content.get("keywords", request.keywords),
            "created_at": datetime.now(),
            "slug": slug
        }
        
        if db:
            db.generated_content.insert_one(content_record)
        
        return {
            "success": True,
            "content_id": content_id,
            "title": request.product_name,
            "content": generated_content.get("content"),
            "keywords": generated_content.get("keywords", request.keywords),
            "slug": slug,
            "file_path": file_path
        }
    except Exception as e:
        logger.error(f"Error generating product description: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate social media post
@app.post("/api/content/social", response_model=Dict[str, Any])
async def generate_social_media_post(request: SocialMediaRequest):
    try:
        logger.info(f"Generating {request.platform} post about {request.topic} for {request.business_name}")
        
        # Generate a unique ID for the content
        content_id = str(uuid.uuid4())
        
        # Generate social media content using AI
        generated_content = await generate_social_content(request)
        
        # Save the generated content to file
        file_path = f"generated_content/{content_id}.md"
        with open(file_path, 'w') as f:
            f.write(f"# {request.platform.capitalize()} Post: {request.topic}\n\n")
            f.write(generated_content.get("content", ""))
        
        # Create record in database
        content_record = {
            "id": content_id,
            "business_name": request.business_name,
            "content_type": f"social_media_{request.platform}",
            "topic": request.topic,
            "title": f"{request.platform.capitalize()} Post: {request.topic}",
            "content": generated_content.get("content", ""),
            "keywords": generated_content.get("keywords", request.keywords),
            "hashtags": generated_content.get("hashtags", []),
            "created_at": datetime.now()
        }
        
        if db:
            db.generated_content.insert_one(content_record)
        
        # Publish to platform if requested
        platform_post_id = None
        platform_post_url = None
        if request.publish_to_platform:
            try:
                # Prepare content data for platform
                platform_content_data = {
                    "content": generated_content.get("content", ""),
                    "hashtags": generated_content.get("hashtags", []),
                    "title": f"{request.platform.capitalize()} Post: {request.topic}",
                    "content_type": f"social_media_{request.platform}",
                    "business_name": request.business_name
                }
                
                # Publish or schedule based on request
                if request.schedule_time:
                    platform_response = await platform_integration.schedule_content(
                        request.platform, platform_content_data, request.schedule_time
                    )
                    logger.info(f"Scheduled content for {request.platform} at {request.schedule_time}")
                else:
                    platform_response = await platform_integration.publish_content(
                        request.platform, platform_content_data
                    )
                    logger.info(f"Published content to {request.platform}")
                
                # Extract platform-specific details
                if platform_response:
                    platform_post_id = platform_response.get("id")
                    platform_post_url = platform_response.get("post_url")
                    
                    # Update database record with platform details
                    if db and platform_post_id:
                        db.generated_content.update_one(
                            {"id": content_id},
                            {"$set": {
                                "platform_post_id": platform_post_id,
                                "platform_post_url": platform_post_url,
                                "published_to_platform": True,
                                "scheduled_time": request.schedule_time
                            }}
                        )
            except Exception as platform_error:
                logger.error(f"Error publishing to {request.platform}: {platform_error}")
                # Continue with response even if platform publishing fails
        
        return {
            "success": True,
            "content_id": content_id,
            "platform": request.platform,
            "content": generated_content.get("content"),
            "hashtags": generated_content.get("hashtags", []),
            "file_path": file_path,
            "published_to_platform": bool(platform_post_id),
            "platform_post_id": platform_post_id,
            "platform_post_url": platform_post_url,
            "scheduled_time": request.schedule_time
        }
    except Exception as e:
        logger.error(f"Error generating social media post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate email content
@app.post("/api/content/email", response_model=Dict[str, Any])
async def generate_email_content(request: EmailContentRequest):
    try:
        logger.info(f"Generating {request.email_type} email about {request.topic} for {request.business_name}")
        
        # Generate a unique ID for the content
        content_id = str(uuid.uuid4())
        
        # Generate email content using AI
        generated_content = await generate_email_content_ai(request)
        
        # Save the generated content to file
        file_path = f"generated_content/{content_id}.md"
        with open(file_path, 'w') as f:
            f.write(f"# Email: {generated_content.get('subject', request.topic)}\n\n")
            f.write(generated_content.get("content", ""))
        
        # Create record in database
        content_record = {
            "id": content_id,
            "business_name": request.business_name,
            "content_type": f"email_{request.email_type}",
            "topic": request.topic,
            "title": generated_content.get("subject", request.topic),
            "content": generated_content.get("content", ""),
            "created_at": datetime.now()
        }
        
        if db:
            db.generated_content.insert_one(content_record)
        
        return {
            "success": True,
            "content_id": content_id,
            "subject": generated_content.get("subject"),
            "content": generated_content.get("content"),
            "file_path": file_path
        }
    except Exception as e:
        logger.error(f"Error generating email content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get content by ID
@app.get("/api/content/{content_id}")
async def get_content(content_id: str):
    try:
        if db:
            content = db.generated_content.find_one({"id": content_id}, {"_id": 0})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            return content
        else:
            # Check if the content file exists
            file_path = f"generated_content/{content_id}.md"
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail="Content not found")
                
            # Read the file
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Parse the title from the first line (assuming it starts with # )
            lines = content.split('\n')
            title = lines[0].replace('# ', '') if lines[0].startswith('# ') else "Untitled"
            
            # Remove the title line from content
            content_text = '\n'.join(lines[1:]).strip()
            
            return {
                "id": content_id,
                "title": title,
                "content": content_text,
                "file_path": file_path,
                "created_at": datetime.now().isoformat()
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI generation functions
async def generate_blog_content(request: BlogPostRequest) -> Dict[str, Any]:
    try:
        # Prepare the prompt for OpenAI
        title = request.title or f"Blog post about {request.topic}"
        
        prompt = f"""
        Write a high-quality blog post for {request.business_name}.
        
        Business Description: {request.business_description}
        
        Topic: {request.topic}
        {'Title: ' + title if request.title else 'Please generate an engaging title.'}
        
        Target Audience: {request.target_audience or 'General audience interested in this topic'}
        Tone: {request.tone or 'Professional and informative'}
        
        Keywords to include: {', '.join(request.keywords or [''])}
        
        Length: {request.length or 'Around 800-1200 words'}
        
        {'Suggested sections: ' + ', '.join(request.sections) if request.sections else 'Structure the post with appropriate headings and subheadings.'}
        
        Additional Instructions: {request.additional_instructions or 'Make the content engaging, informative, and valuable to readers.'}
        
        {'Reference URLs to incorporate information from: ' + ', '.join(request.reference_urls) if request.reference_urls else ''}
        
        {request.include_meta_description and 'Please include a meta description of about 150-160 characters.' or ''}
        """
        
        # Call OpenAI to generate the blog content
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert content writer specializing in creating high-quality, engaging blog posts. You write in a clear, concise style that resonates with the target audience while incorporating SEO best practices."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=3000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Parse the response to extract title, meta description, and content
        title_match = None
        meta_description = None
        keywords = request.keywords or []
        
        # Extract title if not provided
        if not request.title:
            lines = content.split('\n')
            for line in lines:
                if line.strip() and not line.startswith('#'):
                    title_match = line.strip()
                    break
        
        # Extract meta description if requested
        if request.include_meta_description:
            meta_start = content.lower().find("meta description")
            if meta_start != -1:
                meta_end = content.find('\n\n', meta_start)
                if meta_end == -1:
                    meta_end = len(content)
                meta_text = content[meta_start:meta_end]
                meta_description = meta_text.split(':', 1)[1].strip() if ':' in meta_text else meta_text
                # Remove this section from the content
                content = content[:meta_start] + content[meta_end:]
        
        # Clean up the content
        # Remove any "Title:" or similar prefixes
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            if not (line.lower().startswith("title:") or 
                    line.lower().startswith("meta description:") or 
                    line.lower().startswith("keywords:")):
                cleaned_lines.append(line)
        
        cleaned_content = '\n'.join(cleaned_lines).strip()
        
        # If we still don't have a title, use the first heading or the topic
        if not title_match and not request.title:
            for line in lines:
                if line.startswith('# '):
                    title_match = line.replace('# ', '').strip()
                    break
            
            if not title_match:
                title_match = f"Blog Post About {request.topic}"
        
        return {
            "title": request.title or title_match,
            "content": cleaned_content,
            "meta_description": meta_description,
            "keywords": keywords
        }
    except Exception as e:
        logger.error(f"Error generating blog content: {e}")
        raise

async def generate_product_content(request: ProductDescriptionRequest) -> Dict[str, Any]:
    try:
        # Prepare the prompt for OpenAI
        prompt = f"""
        Write a compelling product description for {request.product_name} by {request.business_name}.
        
        Business Description: {request.business_description}
        
        Product Features:
        {', '.join(request.product_features)}
        
        {'Price: $' + str(request.price) if request.price else ''}
        
        {'Key Benefits:\n' + '\n'.join(['- ' + b for b in request.benefits]) if request.benefits else ''}
        
        {'Product Specifications:\n' + '\n'.join(['- ' + k + ': ' + v for k, v in request.specifications.items()]) if request.specifications else ''}
        
        Target Audience: {request.target_audience or 'Potential customers interested in this product'}
        Tone: {request.tone or 'Persuasive and informative'}
        
        Keywords to include: {', '.join(request.keywords or [''])}
        
        Length: {request.length or 'Around 300-500 words'}
        
        Additional Instructions: {request.additional_instructions or 'Focus on benefits, not just features. Use persuasive language that encourages purchase.'}
        """
        
        # Call OpenAI to generate the product description
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert copywriter specializing in creating compelling product descriptions that convert browsers into buyers. You highlight benefits, create desire, and use persuasive language that resonates with the target audience."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Extract keywords if not provided
        keywords = request.keywords or []
        if not keywords:
            # Try to extract keywords from the content
            keyword_start = content.lower().find("keywords")
            if keyword_start != -1:
                keyword_end = content.find('\n\n', keyword_start)
                if keyword_end == -1:
                    keyword_end = len(content)
                keyword_text = content[keyword_start:keyword_end]
                keyword_list = keyword_text.split(':', 1)[1].strip() if ':' in keyword_text else keyword_text
                keywords = [k.strip() for k in keyword_list.split(',')]
                # Remove this section from the content
                content = content[:keyword_start] + content[keyword_end:]
        
        # Clean up the content
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            if not (line.lower().startswith("product name:") or 
                    line.lower().startswith("keywords:")):
                cleaned_lines.append(line)
        
        cleaned_content = '\n'.join(cleaned_lines).strip()
        
        return {
            "content": cleaned_content,
            "keywords": keywords
        }
    except Exception as e:
        logger.error(f"Error generating product content: {e}")
        raise

async def generate_social_content(request: SocialMediaRequest) -> Dict[str, Any]:
    try:
        # Prepare the prompt for OpenAI
        prompt = f"""
        Write a {request.platform} post for {request.business_name} about {request.topic}.
        
        Business Description: {request.business_description}
        
        Post Type: {request.post_type or 'Standard post'}
        
        Target Audience: {request.target_audience or 'Followers and potential customers'}
        Tone: {request.tone or 'Conversational and engaging'}
        
        {'Include relevant hashtags.' if request.include_hashtags else 'Do not include hashtags.'}
        {'Use appropriate emojis to enhance engagement.' if request.include_emoji else 'Do not use emojis.'}
        {'Include a clear call-to-action.' if request.include_call_to_action else 'No call-to-action needed.'}
        
        Platform-specific guidelines:
        {get_platform_guidelines(request.platform)}
        
        Additional Instructions: {request.additional_instructions or 'Make the post engaging and shareable.'}
        """
        
        # Call OpenAI to generate the social media content
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert social media manager who creates engaging, platform-optimized content that drives engagement and conversions. You understand the nuances of different social platforms and create content that performs well on each."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Extract hashtags if included
        hashtags = []
        if request.include_hashtags:
            # Look for hashtags in the content
            words = content.split()
            hashtags = [word for word in words if word.startswith('#')]
        
        return {
            "content": content,
            "hashtags": hashtags
        }
    except Exception as e:
        logger.error(f"Error generating social media content: {e}")
        raise

async def generate_email_content_ai(request: EmailContentRequest) -> Dict[str, Any]:
    try:
        # Prepare the prompt for OpenAI
        prompt = f"""
        Write a {request.email_type} email for {request.business_name} about {request.topic}.
        
        Business Description: {request.business_description}
        
        {'Subject Line: ' + request.subject_line if request.subject_line else 'Please generate an attention-grabbing subject line.'}
        
        Target Audience: {request.target_audience or 'Email subscribers and customers'}
        Tone: {request.tone or 'Professional and friendly'}
        
        {'Include a clear call-to-action button with text: ' + request.button_text if request.include_button and request.button_text else 'Include a clear call-to-action button with appropriate text.' if request.include_button else 'No call-to-action button needed.'}
        
        {'Include personalization elements like [First Name].' if request.personalization else 'No personalization needed.'}
        
        Email Type Guidelines:
        {get_email_type_guidelines(request.email_type)}
        
        Length: {request.length or 'Appropriate length for this type of email'}
        
        Additional Instructions: {request.additional_instructions or 'Make the email engaging and compelling.'}
        """
        
        # Call OpenAI to generate the email content
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert email marketer who creates high-converting email content that engages readers and drives action. You understand email marketing best practices and create content that avoids spam triggers while maximizing open and click-through rates."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Extract subject line if not provided
        subject = request.subject_line
        if not subject:
            subject_start = content.lower().find("subject")
            if subject_start != -1:
                subject_end = content.find('\n', subject_start)
                if subject_end == -1:
                    subject_end = len(content)
                subject_text = content[subject_start:subject_end]
                subject = subject_text.split(':', 1)[1].strip() if ':' in subject_text else subject_text
                # Remove this section from the content
                content = content[:subject_start] + content[subject_end+1:]
        
        # Clean up the content
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            if not line.lower().startswith("subject:"):
                cleaned_lines.append(line)
        
        cleaned_content = '\n'.join(cleaned_lines).strip()
        
        return {
            "subject": subject or f"{request.email_type.capitalize()} Email: {request.topic}",
            "content": cleaned_content
        }
    except Exception as e:
        logger.error(f"Error generating email content: {e}")
        raise

# Helper functions
def get_platform_guidelines(platform: str) -> str:
    """Return platform-specific guidelines for social media content"""
    guidelines = {
        "facebook": "- Ideal length: 1-2 short paragraphs\n- Can include links, images, and videos\n- Hashtags are useful but use sparingly (1-2)\n- Questions and calls-to-action perform well",
        
        "instagram": "- Visual-first platform, so content should complement an image\n- Can be longer than other platforms\n- Hashtags are important (use 5-15 relevant ones)\n- Emojis perform well\n- Include a call-to-action",
        
        "twitter": "- Keep under 280 characters\n- Hashtags are important (use 1-2 relevant ones)\n- Questions, polls, and timely content perform well\n- Include links or media when relevant",
        
        "linkedin": "- Professional tone\n- Can be longer form (several paragraphs)\n- Industry insights and thought leadership perform well\n- Limited use of hashtags (3-5)\n- Include a question or call-to-action"
    }
    
    return guidelines.get(platform.lower(), "Follow general best practices for this platform.")

def get_email_type_guidelines(email_type: str) -> str:
    """Return email type-specific guidelines"""
    guidelines = {
        "newsletter": "- Clear, scannable format with sections\n- Mix of valuable content (80%) and promotional content (20%)\n- Consistent branding and voice\n- Regular sending schedule",
        
        "promotional": "- Clear value proposition\n- Strong, benefit-focused headline\n- Sense of urgency or scarcity\n- Clear call-to-action\n- Focus on benefits, not features",
        
        "welcome": "- Warm, friendly tone\n- Thank the subscriber for joining\n- Set expectations for future emails\n- Introduce your brand briefly\n- Optional: special offer for new subscribers",
        
        "abandoned_cart": "- Reminder of items left in cart\n- Create urgency (limited time, limited stock)\n- Address common objections\n- Make it easy to return to cart\n- Consider offering an incentive"
    }
    
    return guidelines.get(email_type.lower(), "Follow general best practices for this type of email.")

# Platform integration endpoints
@app.post("/api/content/platforms/credentials")
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

@app.post("/api/content/platforms/{platform}/publish")
async def publish_content_to_platform(platform: str, content_id: str = Body(...)):
    try:
        logger.info(f"Publishing content {content_id} to platform: {platform}")
        
        # Get content from database
        if db:
            content = db.generated_content.find_one({"id": content_id})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            # Prepare content data for platform
            platform_content_data = {
                "content": content.get("content", ""),
                "hashtags": content.get("hashtags", []),
                "title": content.get("title", ""),
                "content_type": content.get("content_type", ""),
                "business_name": content.get("business_name", ""),
                "keywords": content.get("keywords", [])
            }
            
            # Publish content to platform
            platform_response = await platform_integration.publish_content(
                platform, platform_content_data
            )
            
            if platform_response:
                platform_post_id = platform_response.get("id")
                platform_post_url = platform_response.get("post_url")
                
                # Update database record with platform details
                db.generated_content.update_one(
                    {"id": content_id},
                    {"$set": {
                        "platform_post_id": platform_post_id,
                        "platform_post_url": platform_post_url,
                        "published_to_platform": True,
                        "published_at": datetime.now().isoformat()
                    }}
                )
                
                return {
                    "success": True,
                    "message": f"Content published to {platform}",
                    "platform_post_id": platform_post_id,
                    "platform_post_url": platform_post_url
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to publish content to {platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error publishing content to {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/content/platforms/{platform}/schedule")
async def schedule_content_on_platform(platform: str, content_id: str = Body(...), schedule_time: str = Body(...)):
    try:
        logger.info(f"Scheduling content {content_id} on platform: {platform} at {schedule_time}")
        
        # Get content from database
        if db:
            content = db.generated_content.find_one({"id": content_id})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            # Prepare content data for platform
            platform_content_data = {
                "content": content.get("content", ""),
                "hashtags": content.get("hashtags", []),
                "title": content.get("title", ""),
                "content_type": content.get("content_type", ""),
                "business_name": content.get("business_name", ""),
                "keywords": content.get("keywords", [])
            }
            
            # Schedule content on platform
            platform_response = await platform_integration.schedule_content(
                platform, platform_content_data, schedule_time
            )
            
            if platform_response:
                platform_post_id = platform_response.get("id")
                
                # Update database record with platform details
                db.generated_content.update_one(
                    {"id": content_id},
                    {"$set": {
                        "platform_post_id": platform_post_id,
                        "scheduled_for_platform": True,
                        "scheduled_time": schedule_time
                    }}
                )
                
                return {
                    "success": True,
                    "message": f"Content scheduled on {platform} at {schedule_time}",
                    "platform_post_id": platform_post_id,
                    "scheduled_time": schedule_time
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to schedule content on {platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error scheduling content on {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/content/platforms/{platform}/content/{content_id}/insights")
async def get_content_insights(platform: str, content_id: str):
    try:
        logger.info(f"Getting insights for content {content_id} from platform: {platform}")
        
        # Check if content exists in database
        if db:
            content = db.generated_content.find_one({"id": content_id})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            # Check if content has been published to the platform
            if not content.get("published_to_platform") and not content.get("scheduled_for_platform"):
                raise HTTPException(status_code=400, detail="Content has not been published or scheduled on this platform")
            
            platform_post_id = content.get("platform_post_id")
            if not platform_post_id:
                raise HTTPException(status_code=400, detail="No platform post ID found for this content")
            
            # Request insights from API Gateway
            response = await platform_integration._make_api_request(
                "get",
                f"{platform_integration.api_gateway_url}/api/integrations/{platform}/content-insights",
                {
                    "connector_id": platform_integration.connectors.get(platform, {}).get("id"),
                    "post_id": platform_post_id
                }
            )
            
            if response:
                # Store insights in database
                insights_data = {
                    "content_id": content_id,
                    "platform": platform,
                    "platform_post_id": platform_post_id,
                    "insights": response,
                    "retrieved_at": datetime.now().isoformat()
                }
                
                # Check if insights already exist
                existing_insights = db.content_insights.find_one({
                    "content_id": content_id,
                    "platform": platform
                })
                
                if existing_insights:
                    # Update existing insights
                    db.content_insights.update_one(
                        {"content_id": content_id, "platform": platform},
                        {"$set": insights_data}
                    )
                else:
                    # Insert new insights
                    db.content_insights.insert_one(insights_data)
                
                return {
                    "success": True,
                    "content_id": content_id,
                    "platform": platform,
                    "insights": response
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to retrieve insights from {platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error getting content insights from {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/content/platforms/{platform}/content/{content_id}/sync")
async def sync_content_with_platform(platform: str, content_id: str):
    try:
        logger.info(f"Syncing content {content_id} with platform: {platform}")
        
        # Check if content exists in database
        if db:
            content = db.generated_content.find_one({"id": content_id})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            # Prepare content data for platform
            platform_content_data = {
                "content": content.get("content", ""),
                "hashtags": content.get("hashtags", []),
                "title": content.get("title", ""),
                "content_type": content.get("content_type", ""),
                "business_name": content.get("business_name", ""),
                "keywords": content.get("keywords", [])
            }
            
            # Check if content has already been published to the platform
            if content.get("published_to_platform") and content.get("platform_post_id"):
                # Update existing content on platform
                platform_content_data["post_id"] = content.get("platform_post_id")
                
                # Request content update from API Gateway
                response = await platform_integration._make_api_request(
                    "put",
                    f"{platform_integration.api_gateway_url}/api/integrations/{platform}/update-content",
                    {
                        "connector_id": platform_integration.connectors.get(platform, {}).get("id"),
                        "content": platform_content_data
                    }
                )
                
                if response:
                    # Update database record with updated platform details
                    db.generated_content.update_one(
                        {"id": content_id},
                        {"$set": {
                            "synced_with_platform": True,
                            "last_synced_at": datetime.now().isoformat()
                        }}
                    )
                    
                    return {
                        "success": True,
                        "message": f"Content updated on {platform}",
                        "platform_post_id": content.get("platform_post_id"),
                        "platform_post_url": content.get("platform_post_url")
                    }
                else:
                    raise HTTPException(status_code=500, detail=f"Failed to update content on {platform}")
            else:
                # Publish new content to platform
                platform_response = await platform_integration.publish_content(
                    platform, platform_content_data
                )
                
                if platform_response:
                    platform_post_id = platform_response.get("id")
                    platform_post_url = platform_response.get("post_url")
                    
                    # Update database record with platform details
                    db.generated_content.update_one(
                        {"id": content_id},
                        {"$set": {
                            "platform_post_id": platform_post_id,
                            "platform_post_url": platform_post_url,
                            "published_to_platform": True,
                            "published_at": datetime.now().isoformat(),
                            "synced_with_platform": True,
                            "last_synced_at": datetime.now().isoformat()
                        }}
                    )
                    
                    return {
                        "success": True,
                        "message": f"Content published to {platform}",
                        "platform_post_id": platform_post_id,
                        "platform_post_url": platform_post_url
                    }
                else:
                    raise HTTPException(status_code=500, detail=f"Failed to publish content to {platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error syncing content with {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/content/platforms/{platform}/content")
async def get_platform_content(platform: str, limit: int = 10, skip: int = 0):
    try:
        logger.info(f"Retrieving content published to platform: {platform}")
        
        if db:
            # Find all content published to the specified platform
            query = {
                "$or": [
                    {"published_to_platform": True, "platform": platform},
                    {"scheduled_for_platform": True, "platform": platform}
                ]
            }
            
            # Get total count for pagination
            total_count = db.generated_content.count_documents(query)
            
            # Get content with pagination
            content_cursor = db.generated_content.find(query).sort("published_at", -1).skip(skip).limit(limit)
            content_list = []
            
            for content in content_cursor:
                # Remove MongoDB _id field which is not JSON serializable
                if "_id" in content:
                    del content["_id"]
                content_list.append(content)
            
            return {
                "success": True,
                "platform": platform,
                "total_count": total_count,
                "content": content_list,
                "pagination": {
                    "limit": limit,
                    "skip": skip,
                    "has_more": (skip + limit) < total_count
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error retrieving content from {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/content/platforms/{platform}/content/{content_id}")
async def delete_content_from_platform(platform: str, content_id: str):
    try:
        logger.info(f"Deleting content {content_id} from platform: {platform}")
        
        if db:
            # Check if content exists in database
            content = db.generated_content.find_one({"id": content_id})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            # Check if content has been published to the platform
            if not content.get("published_to_platform") and not content.get("scheduled_for_platform"):
                raise HTTPException(status_code=400, detail="Content has not been published or scheduled on this platform")
            
            platform_post_id = content.get("platform_post_id")
            if not platform_post_id:
                raise HTTPException(status_code=400, detail="No platform post ID found for this content")
            
            # Request content deletion from API Gateway
            response = await platform_integration._make_api_request(
                "delete",
                f"{platform_integration.api_gateway_url}/api/integrations/{platform}/delete-content",
                {
                    "connector_id": platform_integration.connectors.get(platform, {}).get("id"),
                    "post_id": platform_post_id
                }
            )
            
            if response and response.get("success"):
                # Update database record to reflect deletion
                db.generated_content.update_one(
                    {"id": content_id},
                    {"$set": {
                        "published_to_platform": False,
                        "scheduled_for_platform": False,
                        "deleted_from_platform": True,
                        "deleted_at": datetime.now().isoformat()
                    }}
                )
                
                return {
                    "success": True,
                    "message": f"Content deleted from {platform}",
                    "content_id": content_id
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to delete content from {platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error deleting content from {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/content/platforms/{platform}/analytics")
async def get_platform_analytics(platform: str, start_date: str = None, end_date: str = None):
    try:
        logger.info(f"Getting analytics for platform: {platform} from {start_date} to {end_date}")
        
        # Check if platform connector is initialized
        if not platform_integration.connectors.get(platform, {}).get("initialized", False):
            raise HTTPException(status_code=400, detail=f"Connector for {platform} not initialized")
        
        # Get analytics from platform
        analytics = await platform_integration.get_platform_analytics(platform, start_date, end_date)
        
        if analytics:
            # Store analytics in database if available
            if db:
                analytics_data = {
                    "platform": platform,
                    "start_date": start_date,
                    "end_date": end_date,
                    "analytics": analytics,
                    "retrieved_at": datetime.now().isoformat()
                }
                
                # Check if analytics already exist for this period
                existing_analytics = db.platform_analytics.find_one({
                    "platform": platform,
                    "start_date": start_date,
                    "end_date": end_date
                })
                
                if existing_analytics:
                    # Update existing analytics
                    db.platform_analytics.update_one(
                        {"platform": platform, "start_date": start_date, "end_date": end_date},
                        {"$set": analytics_data}
                    )
                else:
                    # Insert new analytics
                    db.platform_analytics.insert_one(analytics_data)
            
            return {
                "success": True,
                "platform": platform,
                "start_date": start_date,
                "end_date": end_date,
                "analytics": analytics
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to retrieve analytics from {platform}")
    except Exception as e:
        logger.error(f"Error getting analytics from {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/content/platforms/{platform}/content/{content_id}/performance")
async def get_content_performance(platform: str, content_id: str):
    try:
        logger.info(f"Getting performance metrics for content {content_id} on platform: {platform}")
        
        # Check if content exists in database
        if db:
            content = db.generated_content.find_one({"id": content_id})
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            # Check if content has been published to the platform
            if not content.get("published_to_platform") and not content.get("scheduled_for_platform"):
                raise HTTPException(status_code=400, detail="Content has not been published or scheduled on this platform")
            
            platform_post_id = content.get("platform_post_id")
            if not platform_post_id:
                raise HTTPException(status_code=400, detail="No platform post ID found for this content")
            
            # Get performance metrics from platform
            performance = await platform_integration.get_content_performance(platform, platform_post_id)
            
            if performance:
                # Store performance metrics in database
                performance_data = {
                    "content_id": content_id,
                    "platform": platform,
                    "platform_post_id": platform_post_id,
                    "performance": performance,
                    "retrieved_at": datetime.now().isoformat()
                }
                
                # Check if performance metrics already exist
                existing_performance = db.content_performance.find_one({
                    "content_id": content_id,
                    "platform": platform
                })
                
                if existing_performance:
                    # Update existing performance metrics
                    db.content_performance.update_one(
                        {"content_id": content_id, "platform": platform},
                        {"$set": performance_data}
                    )
                else:
                    # Insert new performance metrics
                    db.content_performance.insert_one(performance_data)
                
                return {
                    "success": True,
                    "content_id": content_id,
                    "platform": platform,
                    "performance": performance
                }
            else:
                raise HTTPException(status_code=500, detail=f"Failed to retrieve performance metrics from {platform}")
        else:
            raise HTTPException(status_code=500, detail="Database connection not available")
    except Exception as e:
        logger.error(f"Error getting performance metrics from {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Start the server
if __name__ == "__main__":
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port=5003, reload=True)