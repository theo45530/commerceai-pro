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
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import requests
from jinja2 import Environment, FileSystemLoader, select_autoescape
import aiofiles
from pymongo import MongoClient
import redis
import pika
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/page_generator.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("page-generator")

# Initialize FastAPI app
app = FastAPI(title="Ekko Page Generator AI Agent")

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
os.makedirs("templates", exist_ok=True)
os.makedirs("static", exist_ok=True)
os.makedirs("generated_pages", exist_ok=True)

# Initialize Jinja2 templates
templates = Environment(
    loader=FileSystemLoader("templates"),
    autoescape=select_autoescape(['html', 'xml'])
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/generated", StaticFiles(directory="generated_pages"), name="generated")

# Initialize OpenAI
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
    rabbitmq_channel.exchange_declare(exchange='ekko.pages', exchange_type='topic', durable=True)
    logger.info("Connected to RabbitMQ")
except Exception as e:
    logger.error(f"Failed to connect to RabbitMQ: {e}")
    rabbitmq_connection = None
    rabbitmq_channel = None

# Data models
class PageTemplate(BaseModel):
    name: str
    description: str
    type: str = Field(..., description="Type of page: landing, product, category, about, contact, etc.")
    html_template: str
    css_template: Optional[str] = None
    js_template: Optional[str] = None
    preview_image: Optional[str] = None

class PageGenerationRequest(BaseModel):
    business_name: str
    business_description: str
    page_type: str = Field(..., description="Type of page to generate: landing, product, category, about, contact, etc.")
    template_id: Optional[str] = None
    color_scheme: Optional[str] = None
    style_preferences: Optional[str] = None
    key_features: Optional[List[str]] = None
    target_audience: Optional[str] = None
    call_to_action: Optional[str] = None
    logo_url: Optional[str] = None
    images: Optional[List[str]] = None
    custom_sections: Optional[List[Dict[str, Any]]] = None

class LandingPageRequest(PageGenerationRequest):
    headline: Optional[str] = None
    subheadline: Optional[str] = None
    benefits: Optional[List[str]] = None
    testimonials: Optional[List[Dict[str, str]]] = None

class ProductPageRequest(PageGenerationRequest):
    product_name: str
    product_description: str
    price: float
    features: List[str]
    specifications: Optional[Dict[str, str]] = None
    related_products: Optional[List[Dict[str, Any]]] = None

class GeneratedPage(BaseModel):
    id: str
    business_name: str
    page_type: str
    template_id: Optional[str] = None
    html_content: str
    css_content: Optional[str] = None
    js_content: Optional[str] = None
    preview_url: str
    created_at: datetime
    updated_at: Optional[datetime] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "Ekko Page Generator AI Agent",
        "version": "1.0.0"
    }

# List available templates
@app.get("/api/templates", response_model=List[Dict[str, Any]])
async def list_templates():
    try:
        if db:
            templates = list(db.page_templates.find({}, {"_id": 0}))
            return templates
        else:
            # Return some default templates if DB is not available
            return [
                {
                    "id": "default-landing",
                    "name": "Modern Landing Page",
                    "description": "A clean, modern landing page template with hero section, features, and CTA.",
                    "type": "landing",
                    "preview_image": "/static/templates/default-landing.jpg"
                },
                {
                    "id": "default-product",
                    "name": "Product Showcase",
                    "description": "A product page template with image gallery, description, and purchase options.",
                    "type": "product",
                    "preview_image": "/static/templates/default-product.jpg"
                }
            ]
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get template by ID
@app.get("/api/templates/{template_id}")
async def get_template(template_id: str):
    try:
        if db:
            template = db.page_templates.find_one({"id": template_id}, {"_id": 0})
            if not template:
                raise HTTPException(status_code=404, detail="Template not found")
            return template
        else:
            # Return a default template if DB is not available
            if template_id == "default-landing":
                return {
                    "id": "default-landing",
                    "name": "Modern Landing Page",
                    "description": "A clean, modern landing page template with hero section, features, and CTA.",
                    "type": "landing",
                    "html_template": "<!-- Default landing page template -->\n<div class='hero'>\n  <h1>{{business_name}}</h1>\n  <p>{{business_description}}</p>\n  <a href='#' class='cta-button'>{{call_to_action or 'Get Started'}}</a>\n</div>",
                    "css_template": "/* Default CSS */\nbody { font-family: 'Arial', sans-serif; }\n.hero { text-align: center; padding: 4rem 2rem; }\n.cta-button { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; }",
                    "preview_image": "/static/templates/default-landing.jpg"
                }
            elif template_id == "default-product":
                return {
                    "id": "default-product",
                    "name": "Product Showcase",
                    "description": "A product page template with image gallery, description, and purchase options.",
                    "type": "product",
                    "html_template": "<!-- Default product page template -->\n<div class='product'>\n  <div class='product-image'>\n    <img src='{{images[0] if images else \"/static/placeholder.jpg\"}}' alt='{{product_name}}'>\n  </div>\n  <div class='product-info'>\n    <h1>{{product_name}}</h1>\n    <p class='price'>${{price}}</p>\n    <p>{{product_description}}</p>\n    <button class='buy-button'>{{call_to_action or 'Buy Now'}}</button>\n  </div>\n</div>",
                    "css_template": "/* Default CSS */\n.product { display: flex; max-width: 1200px; margin: 0 auto; padding: 2rem; }\n.product-image { flex: 1; }\n.product-image img { max-width: 100%; }\n.product-info { flex: 1; padding-left: 2rem; }\n.price { font-size: 1.5rem; font-weight: bold; color: #0066cc; }\n.buy-button { padding: 12px 24px; background-color: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }",
                    "preview_image": "/static/templates/default-product.jpg"
                }
            else:
                raise HTTPException(status_code=404, detail="Template not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate a page based on business info and template
@app.post("/api/generate", response_model=Dict[str, Any])
async def generate_page(request: Union[PageGenerationRequest, LandingPageRequest, ProductPageRequest]):
    try:
        logger.info(f"Generating {request.page_type} page for {request.business_name}")
        
        # Generate a unique ID for the page
        page_id = str(uuid.uuid4())
        
        # Get template if specified
        template_data = None
        if request.template_id:
            try:
                template_data = await get_template(request.template_id)
            except HTTPException:
                # If template not found, we'll generate from scratch
                pass
        
        # Generate page content using AI
        generated_content = await generate_page_content(request, template_data)
        
        # Save the generated page
        html_file_path = f"generated_pages/{page_id}.html"
        css_file_path = f"generated_pages/{page_id}.css"
        js_file_path = f"generated_pages/{page_id}.js"
        
        async with aiofiles.open(html_file_path, 'w') as f:
            await f.write(generated_content["html"])
            
        if generated_content.get("css"):
            async with aiofiles.open(css_file_path, 'w') as f:
                await f.write(generated_content["css"])
                
        if generated_content.get("js"):
            async with aiofiles.open(js_file_path, 'w') as f:
                await f.write(generated_content["js"])
        
        # Create record in database
        page_record = {
            "id": page_id,
            "business_name": request.business_name,
            "page_type": request.page_type,
            "template_id": request.template_id,
            "html_content": generated_content["html"],
            "css_content": generated_content.get("css"),
            "js_content": generated_content.get("js"),
            "preview_url": f"/generated/{page_id}.html",
            "created_at": datetime.now(),
        }
        
        if db:
            db.generated_pages.insert_one(page_record)
        
        return {
            "success": True,
            "page_id": page_id,
            "preview_url": f"/generated/{page_id}.html",
            "download_url": f"/api/pages/{page_id}/download"
        }
    except Exception as e:
        logger.error(f"Error generating page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get a generated page by ID
@app.get("/api/pages/{page_id}")
async def get_page(page_id: str):
    try:
        if db:
            page = db.generated_pages.find_one({"id": page_id}, {"_id": 0})
            if not page:
                raise HTTPException(status_code=404, detail="Page not found")
            return page
        else:
            # Check if the page files exist
            html_file_path = f"generated_pages/{page_id}.html"
            if not os.path.exists(html_file_path):
                raise HTTPException(status_code=404, detail="Page not found")
                
            # Read the HTML file
            async with aiofiles.open(html_file_path, 'r') as f:
                html_content = await f.read()
                
            # Try to read CSS and JS if they exist
            css_content = None
            js_content = None
            
            css_file_path = f"generated_pages/{page_id}.css"
            if os.path.exists(css_file_path):
                async with aiofiles.open(css_file_path, 'r') as f:
                    css_content = await f.read()
                    
            js_file_path = f"generated_pages/{page_id}.js"
            if os.path.exists(js_file_path):
                async with aiofiles.open(js_file_path, 'r') as f:
                    js_content = await f.read()
            
            return {
                "id": page_id,
                "html_content": html_content,
                "css_content": css_content,
                "js_content": js_content,
                "preview_url": f"/generated/{page_id}.html",
                "created_at": datetime.now().isoformat()
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# View a generated page
@app.get("/api/pages/{page_id}/view", response_class=HTMLResponse)
async def view_page(page_id: str):
    try:
        page = await get_page(page_id)
        return page["html_content"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error viewing page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Download a generated page as a ZIP file
@app.get("/api/pages/{page_id}/download")
async def download_page(page_id: str):
    try:
        # This would be implemented to create a ZIP file with HTML, CSS, JS, and assets
        # For now, we'll just return the HTML file
        html_file_path = f"generated_pages/{page_id}.html"
        if not os.path.exists(html_file_path):
            raise HTTPException(status_code=404, detail="Page not found")
            
        return FileResponse(
            path=html_file_path,
            filename=f"{page_id}.html",
            media_type="text/html"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI generation functions
async def generate_page_content(request: Union[PageGenerationRequest, LandingPageRequest, ProductPageRequest], template_data: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    try:
        # Prepare the prompt for OpenAI based on the page type
        if request.page_type == "landing":
            prompt = generate_landing_page_prompt(request, template_data)
        elif request.page_type == "product":
            prompt = generate_product_page_prompt(request, template_data)
        else:
            prompt = generate_generic_page_prompt(request, template_data)
        
        # Call OpenAI to generate the page content
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert web developer and designer specializing in creating beautiful, responsive web pages. You write clean, semantic HTML5, modern CSS3 (including flexbox and grid), and efficient JavaScript. Your code should be responsive, accessible, and follow best practices."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=4000,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        # Parse the response to extract HTML, CSS, and JS
        html_content = ""
        css_content = ""
        js_content = ""
        
        # Simple parsing - in a real implementation, this would be more robust
        if "```html" in content and "```" in content.split("```html", 1)[1]:
            html_content = content.split("```html", 1)[1].split("```", 1)[0].strip()
        
        if "```css" in content and "```" in content.split("```css", 1)[1]:
            css_content = content.split("```css", 1)[1].split("```", 1)[0].strip()
        
        if "```javascript" in content and "```" in content.split("```javascript", 1)[1]:
            js_content = content.split("```javascript", 1)[1].split("```", 1)[0].strip()
        elif "```js" in content and "```" in content.split("```js", 1)[1]:
            js_content = content.split("```js", 1)[1].split("```", 1)[0].strip()
        
        # If we couldn't parse the content properly, use the entire response as HTML
        if not html_content:
            html_content = content
        
        # Combine HTML, CSS, and JS into a single HTML file if needed
        if css_content and "<style>" not in html_content:
            html_content = f"<style>\n{css_content}\n</style>\n{html_content}"
        
        if js_content and "<script>" not in html_content:
            html_content = f"{html_content}\n<script>\n{js_content}\n</script>"
        
        # Add doctype and basic HTML structure if not present
        if "<!DOCTYPE html>" not in html_content:
            html_content = f"<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>{request.business_name} - {request.page_type.capitalize()} Page</title>\n</head>\n<body>\n{html_content}\n</body>\n</html>"
        
        return {
            "html": html_content,
            "css": css_content,
            "js": js_content
        }
    except Exception as e:
        logger.error(f"Error generating page content: {e}")
        raise

def generate_landing_page_prompt(request: Union[PageGenerationRequest, LandingPageRequest], template_data: Optional[Dict[str, Any]] = None) -> str:
    # Cast to LandingPageRequest if possible to access specific fields
    landing_request = request
    if isinstance(request, PageGenerationRequest) and not isinstance(request, LandingPageRequest):
        landing_request = LandingPageRequest(**request.dict())
    
    headline = getattr(landing_request, 'headline', None) or f"Welcome to {request.business_name}"
    subheadline = getattr(landing_request, 'subheadline', None) or request.business_description
    benefits = getattr(landing_request, 'benefits', None) or []
    testimonials = getattr(landing_request, 'testimonials', None) or []
    
    prompt = f"""
    Create a modern, responsive landing page for {request.business_name}.
    
    Business Description: {request.business_description}
    
    Main Headline: {headline}
    Subheadline: {subheadline}
    
    Color Scheme: {request.color_scheme or 'Use a professional, modern color scheme that fits the brand'}
    Style Preferences: {request.style_preferences or 'Clean, modern design with good whitespace'}
    
    Key Features/Benefits to highlight:
    {', '.join(request.key_features or benefits or ['Feature 1', 'Feature 2', 'Feature 3'])}
    
    Target Audience: {request.target_audience or 'General audience'}
    
    Call to Action: {request.call_to_action or 'Get Started'}
    
    Logo URL: {request.logo_url or 'No logo provided, use text-based logo'}
    
    Images: {', '.join(request.images or ['No specific images provided'])}
    """
    
    if testimonials:
        prompt += "\n\nTestimonials to include:\n"
        for testimonial in testimonials:
            prompt += f"- {testimonial.get('text', '')} - {testimonial.get('author', '')}\n"
    
    if request.custom_sections:
        prompt += "\n\nCustom Sections to include:\n"
        for section in request.custom_sections:
            prompt += f"- {section.get('title', '')}: {section.get('content', '')}\n"
    
    if template_data and template_data.get("html_template"):
        prompt += f"\n\nBase your design on this template, but feel free to improve it:\n{template_data.get('html_template')}\n"
        if template_data.get("css_template"):
            prompt += f"\nCSS Template:\n{template_data.get('css_template')}\n"
    
    prompt += """
    Please provide the complete HTML, CSS, and JavaScript code for this landing page. The page should be:
    1. Fully responsive (mobile, tablet, desktop)
    2. Modern and visually appealing
    3. Fast-loading and optimized
    4. Accessible (following WCAG guidelines)
    5. SEO-friendly with appropriate meta tags
    
    Return your code in the following format:
    ```html
    <!-- Your HTML code here -->
    ```
    
    ```css
    /* Your CSS code here */
    ```
    
    ```javascript
    // Your JavaScript code here (if needed)
    ```
    """
    
    return prompt

def generate_product_page_prompt(request: Union[PageGenerationRequest, ProductPageRequest], template_data: Optional[Dict[str, Any]] = None) -> str:
    # Cast to ProductPageRequest if possible to access specific fields
    product_request = request
    if isinstance(request, PageGenerationRequest) and not isinstance(request, ProductPageRequest):
        # If it's a generic request, we don't have product-specific fields
        # This is a simplified approach - in a real implementation, you'd handle this differently
        prompt = f"""
        Create a modern, responsive product page for {request.business_name}.
        
        Business Description: {request.business_description}
        
        Color Scheme: {request.color_scheme or 'Use a professional, modern color scheme that fits the brand'}
        Style Preferences: {request.style_preferences or 'Clean, modern design with good whitespace'}
        
        Key Features to highlight:
        {', '.join(request.key_features or ['Feature 1', 'Feature 2', 'Feature 3'])}
        
        Target Audience: {request.target_audience or 'General audience'}
        
        Call to Action: {request.call_to_action or 'Buy Now'}
        
        Logo URL: {request.logo_url or 'No logo provided, use text-based logo'}
        
        Images: {', '.join(request.images or ['No specific images provided'])}
        """
    else:
        # We have a proper ProductPageRequest with all fields
        prompt = f"""
        Create a modern, responsive product page for {product_request.product_name} by {request.business_name}.
        
        Business Description: {request.business_description}
        Product Description: {product_request.product_description}
        Price: ${product_request.price}
        
        Color Scheme: {request.color_scheme or 'Use a professional, modern color scheme that fits the brand'}
        Style Preferences: {request.style_preferences or 'Clean, modern design with good whitespace'}
        
        Product Features:
        {', '.join(product_request.features)}
        
        Target Audience: {request.target_audience or 'General audience'}
        
        Call to Action: {request.call_to_action or 'Buy Now'}
        
        Logo URL: {request.logo_url or 'No logo provided, use text-based logo'}
        
        Images: {', '.join(request.images or ['No specific images provided'])}
        """
        
        if product_request.specifications:
            prompt += "\n\nProduct Specifications:\n"
            for key, value in product_request.specifications.items():
                prompt += f"- {key}: {value}\n"
        
        if product_request.related_products:
            prompt += "\n\nRelated Products to show:\n"
            for product in product_request.related_products:
                prompt += f"- {product.get('name', '')}: ${product.get('price', '')}\n"
    
    if request.custom_sections:
        prompt += "\n\nCustom Sections to include:\n"
        for section in request.custom_sections:
            prompt += f"- {section.get('title', '')}: {section.get('content', '')}\n"
    
    if template_data and template_data.get("html_template"):
        prompt += f"\n\nBase your design on this template, but feel free to improve it:\n{template_data.get('html_template')}\n"
        if template_data.get("css_template"):
            prompt += f"\nCSS Template:\n{template_data.get('css_template')}\n"
    
    prompt += """
    Please provide the complete HTML, CSS, and JavaScript code for this product page. The page should be:
    1. Fully responsive (mobile, tablet, desktop)
    2. Modern and visually appealing
    3. Fast-loading and optimized
    4. Accessible (following WCAG guidelines)
    5. SEO-friendly with appropriate meta tags
    6. Include product image gallery (if multiple images)
    7. Clear call-to-action for purchasing
    8. Product details clearly presented
    
    Return your code in the following format:
    ```html
    <!-- Your HTML code here -->
    ```
    
    ```css
    /* Your CSS code here */
    ```
    
    ```javascript
    // Your JavaScript code here (if needed)
    ```
    """
    
    return prompt

def generate_generic_page_prompt(request: PageGenerationRequest, template_data: Optional[Dict[str, Any]] = None) -> str:
    prompt = f"""
    Create a modern, responsive {request.page_type} page for {request.business_name}.
    
    Business Description: {request.business_description}
    
    Color Scheme: {request.color_scheme or 'Use a professional, modern color scheme that fits the brand'}
    Style Preferences: {request.style_preferences or 'Clean, modern design with good whitespace'}
    
    Key Content to include:
    {', '.join(request.key_features or ['Content 1', 'Content 2', 'Content 3'])}
    
    Target Audience: {request.target_audience or 'General audience'}
    
    Call to Action: {request.call_to_action or 'Contact Us'}
    
    Logo URL: {request.logo_url or 'No logo provided, use text-based logo'}
    
    Images: {', '.join(request.images or ['No specific images provided'])}
    """
    
    if request.custom_sections:
        prompt += "\n\nCustom Sections to include:\n"
        for section in request.custom_sections:
            prompt += f"- {section.get('title', '')}: {section.get('content', '')}\n"
    
    if template_data and template_data.get("html_template"):
        prompt += f"\n\nBase your design on this template, but feel free to improve it:\n{template_data.get('html_template')}\n"
        if template_data.get("css_template"):
            prompt += f"\nCSS Template:\n{template_data.get('css_template')}\n"
    
    prompt += """
    Please provide the complete HTML, CSS, and JavaScript code for this page. The page should be:
    1. Fully responsive (mobile, tablet, desktop)
    2. Modern and visually appealing
    3. Fast-loading and optimized
    4. Accessible (following WCAG guidelines)
    5. SEO-friendly with appropriate meta tags
    
    Return your code in the following format:
    ```html
    <!-- Your HTML code here -->
    ```
    
    ```css
    /* Your CSS code here */
    ```
    
    ```javascript
    // Your JavaScript code here (if needed)
    ```
    """
    
    return prompt

# Start the server
if __name__ == "__main__":
    # Start the FastAPI server
    uvicorn.run("main:app", host="0.0.0.0", port=5005, reload=True)