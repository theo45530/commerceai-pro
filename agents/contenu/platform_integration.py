import os
import json
import logging
from typing import Dict, List, Optional, Any, Union
import requests
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/platform_integration.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("platform-integration")

class PlatformIntegration:
    def __init__(self, db=None, redis_client=None, rabbitmq_channel=None):
        self.db = db
        self.redis_client = redis_client
        self.rabbitmq_channel = rabbitmq_channel
        self.api_gateway_url = os.getenv("API_GATEWAY_URL", "http://api-gateway:5000")
        self.connectors = {}
    
    async def initialize_connector(self, platform: str, credentials: Dict[str, Any]) -> Optional[str]:
        """
        Initialize a platform connector with credentials
        """
        try:
            logger.info(f"Initializing connector for platform: {platform}")
            
            # Request connector initialization from API Gateway
            response = await self._make_api_request(
                "post",
                f"{self.api_gateway_url}/api/integrations/{platform}/initialize",
                {"credentials": credentials}
            )
            
            if response and response.get("connector_id"):
                self.connectors[platform] = {
                    "id": response.get("connector_id"),
                    "initialized": True,
                    "credentials": credentials
                }
                
                logger.info(f"Successfully initialized {platform} connector with ID: {response.get('connector_id')}")
                return response.get("connector_id")
            else:
                logger.error(f"Failed to initialize {platform} connector: No connector ID returned")
                return None
        except Exception as e:
            logger.error(f"Error initializing {platform} connector: {e}")
            return None
    
    async def publish_content(self, platform: str, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publish content to a specific platform
        """
        try:
            logger.info(f"Publishing content to platform: {platform}")
            
            if not self.connectors.get(platform, {}).get("initialized", False):
                logger.error(f"Connector for {platform} not initialized")
                raise Exception(f"Connector for {platform} not initialized")
            
            # Transform content to platform-specific format
            platform_content = await self.transform_content_for_platform(platform, content_data)
            
            # Request content publishing from API Gateway
            response = await self._make_api_request(
                "post",
                f"{self.api_gateway_url}/api/integrations/{platform}/publish-content",
                {
                    "connector_id": self.connectors[platform]["id"],
                    "content": platform_content
                }
            )
            
            if response:
                logger.info(f"Successfully published content to {platform}")
                return response
            else:
                logger.error(f"Failed to publish content to {platform}")
                raise Exception(f"Failed to publish content to {platform}")
        except Exception as e:
            logger.error(f"Error publishing content to {platform}: {e}")
            raise
    
    async def schedule_content(self, platform: str, content_data: Dict[str, Any], schedule_time: str) -> Dict[str, Any]:
        """
        Schedule content for publishing at a specific time
        """
        try:
            logger.info(f"Scheduling content for platform: {platform} at {schedule_time}")
            
            if not self.connectors.get(platform, {}).get("initialized", False):
                logger.error(f"Connector for {platform} not initialized")
                raise Exception(f"Connector for {platform} not initialized")
            
            # Transform content to platform-specific format
            platform_content = await self.transform_content_for_platform(platform, content_data)
            
            # Request content scheduling from API Gateway
            response = await self._make_api_request(
                "post",
                f"{self.api_gateway_url}/api/integrations/{platform}/schedule-content",
                {
                    "connector_id": self.connectors[platform]["id"],
                    "content": platform_content,
                    "schedule_time": schedule_time
                }
            )
            
            if response:
                logger.info(f"Successfully scheduled content for {platform} at {schedule_time}")
                return response
            else:
                logger.error(f"Failed to schedule content for {platform}")
                raise Exception(f"Failed to schedule content for {platform}")
        except Exception as e:
            logger.error(f"Error scheduling content for {platform}: {e}")
            raise
    
    async def transform_content_for_platform(self, platform: str, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content to platform-specific format
        """
        try:
            logger.info(f"Transforming content for platform: {platform}")
            
            if platform.lower() in ["facebook", "instagram", "meta"]:
                return self._transform_for_meta(platform.lower(), content_data)
            elif platform.lower() == "twitter" or platform.lower() == "x":
                return self._transform_for_twitter(content_data)
            elif platform.lower() == "linkedin":
                return self._transform_for_linkedin(content_data)
            elif platform.lower() == "tiktok":
                return self._transform_for_tiktok(content_data)
            elif platform.lower() == "shopify":
                return self._transform_for_shopify(content_data)
            else:
                # Default transformation (minimal)
                return {
                    "text": content_data.get("content", ""),
                    "title": content_data.get("title", ""),
                    "original_data": content_data
                }
        except Exception as e:
            logger.error(f"Error transforming content for {platform}: {e}")
            # Return original content if transformation fails
            return content_data
    
    def _transform_for_meta(self, specific_platform: str, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content for Meta platforms (Facebook, Instagram)
        """
        result = {
            "message": content_data.get("content", ""),
            "platform": specific_platform
        }
        
        # Add hashtags if available
        if content_data.get("hashtags"):
            result["message"] += "\n\n" + " ".join(content_data["hashtags"])
        
        # Add link if available
        if content_data.get("link"):
            result["link"] = content_data["link"]
        
        # Add media if available
        if content_data.get("media_urls"):
            result["media"] = content_data["media_urls"]
        
        return result
    
    def _transform_for_twitter(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content for Twitter/X
        """
        # Twitter has character limits, so we need to truncate if necessary
        content = content_data.get("content", "")
        hashtags = " ".join(content_data.get("hashtags", []))
        
        # Check if content + hashtags exceeds 280 characters
        if len(content) + len(hashtags) + 2 > 280:  # +2 for the newline characters
            # Truncate content to fit hashtags
            max_content_length = 280 - len(hashtags) - 5  # -5 for "... " and newline
            content = content[:max_content_length] + "..."
        
        result = {
            "text": content
        }
        
        # Add hashtags if available and if there's room
        if hashtags:
            result["text"] += "\n" + hashtags
        
        # Add media if available
        if content_data.get("media_urls"):
            result["media"] = content_data["media_urls"]
        
        return result
    
    def _transform_for_linkedin(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content for LinkedIn
        """
        result = {
            "text": content_data.get("content", ""),
            "visibility": "PUBLIC"
        }
        
        # Add hashtags if available
        if content_data.get("hashtags"):
            result["text"] += "\n\n" + " ".join(content_data["hashtags"])
        
        # Add article link if available
        if content_data.get("link"):
            result["article_link"] = {
                "url": content_data["link"],
                "title": content_data.get("title", ""),
                "description": content_data.get("meta_description", "")
            }
        
        # Add media if available
        if content_data.get("media_urls"):
            result["media"] = content_data["media_urls"]
        
        return result
    
    def _transform_for_tiktok(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content for TikTok
        """
        result = {
            "caption": content_data.get("content", "")
        }
        
        # Add hashtags if available
        if content_data.get("hashtags"):
            result["caption"] += "\n" + " ".join(content_data["hashtags"])
        
        # TikTok requires video
        if content_data.get("video_url"):
            result["video_url"] = content_data["video_url"]
        
        return result
    
    def _transform_for_shopify(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content for Shopify
        """
        # Determine content type
        content_type = content_data.get("content_type", "")
        
        if content_type == "product_description":
            return {
                "product": {
                    "title": content_data.get("title", ""),
                    "body_html": content_data.get("content", ""),
                    "vendor": content_data.get("business_name", ""),
                    "product_type": content_data.get("topic", ""),
                    "tags": content_data.get("keywords", [])
                }
            }
        elif content_type == "blog_post":
            return {
                "article": {
                    "title": content_data.get("title", ""),
                    "body_html": content_data.get("content", ""),
                    "author": content_data.get("business_name", ""),
                    "tags": content_data.get("keywords", []),
                    "summary_html": content_data.get("meta_description", "")
                }
            }
        else:
            # Default transformation
            return {
                "content": content_data.get("content", ""),
                "title": content_data.get("title", ""),
                "original_data": content_data
            }
    
    async def get_platform_analytics(self, platform: str, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """
        Retrieve analytics and metrics from a specific platform
        """
        try:
            logger.info(f"Retrieving analytics from platform: {platform} for period {start_date} to {end_date}")
            
            if not self.connectors.get(platform, {}).get("initialized", False):
                logger.error(f"Connector for {platform} not initialized")
                raise Exception(f"Connector for {platform} not initialized")
            
            # Set default date range if not provided
            if not start_date:
                # Default to last 30 days
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            # Request analytics from API Gateway
            response = await self._make_api_request(
                "get",
                f"{self.api_gateway_url}/api/integrations/{platform}/analytics",
                {
                    "connector_id": self.connectors[platform]["id"],
                    "start_date": start_date,
                    "end_date": end_date
                }
            )
            
            if response:
                logger.info(f"Successfully retrieved analytics from {platform}")
                return response
            else:
                logger.error(f"Failed to retrieve analytics from {platform}")
                raise Exception(f"Failed to retrieve analytics from {platform}")
        except Exception as e:
            logger.error(f"Error retrieving analytics from {platform}: {e}")
            raise
    
    async def get_content_performance(self, platform: str, post_id: str) -> Dict[str, Any]:
        """
        Retrieve performance metrics for a specific content post
        """
        try:
            logger.info(f"Retrieving performance metrics for post {post_id} from platform: {platform}")
            
            if not self.connectors.get(platform, {}).get("initialized", False):
                logger.error(f"Connector for {platform} not initialized")
                raise Exception(f"Connector for {platform} not initialized")
            
            # Request performance metrics from API Gateway
            response = await self._make_api_request(
                "get",
                f"{self.api_gateway_url}/api/integrations/{platform}/content-performance",
                {
                    "connector_id": self.connectors[platform]["id"],
                    "post_id": post_id
                }
            )
            
            if response:
                logger.info(f"Successfully retrieved performance metrics for post {post_id} from {platform}")
                return response
            else:
                logger.error(f"Failed to retrieve performance metrics for post {post_id} from {platform}")
                raise Exception(f"Failed to retrieve performance metrics for post {post_id} from {platform}")
        except Exception as e:
            logger.error(f"Error retrieving performance metrics from {platform}: {e}")
            raise
    
    async def delete_content(self, platform: str, post_id: str) -> Dict[str, Any]:
        """
        Delete content from a specific platform
        """
        try:
            logger.info(f"Deleting content post {post_id} from platform: {platform}")
            
            if not self.connectors.get(platform, {}).get("initialized", False):
                logger.error(f"Connector for {platform} not initialized")
                raise Exception(f"Connector for {platform} not initialized")
            
            # Request content deletion from API Gateway
            response = await self._make_api_request(
                "delete",
                f"{self.api_gateway_url}/api/integrations/{platform}/content",
                {
                    "connector_id": self.connectors[platform]["id"],
                    "post_id": post_id
                }
            )
            
            if response:
                logger.info(f"Successfully deleted content post {post_id} from {platform}")
                return response
            else:
                logger.error(f"Failed to delete content post {post_id} from {platform}")
                raise Exception(f"Failed to delete content post {post_id} from {platform}")
        except Exception as e:
            logger.error(f"Error deleting content from {platform}: {e}")
            raise
            
    async def sync_content(self, platform: str, content_id: str, content_data: Dict[str, Any], post_id: str = None) -> Dict[str, Any]:
        """
        Synchronize content with a platform - update if exists, publish if not
        
        Args:
            platform: The platform to synchronize with
            content_id: The internal content ID
            content_data: The content data to synchronize
            post_id: The platform-specific post ID (if already published)
            
        Returns:
            Dict containing synchronization status and details
        """
        try:
            logger.info(f"Synchronizing content {content_id} with platform: {platform}")
            
            if not self.connectors.get(platform, {}).get("initialized", False):
                logger.error(f"Connector for {platform} not initialized")
                raise Exception(f"Connector for {platform} not initialized")
                
            # Transform content for the platform
            transformed_content = await self.transform_content_for_platform(platform, content_data)
            
            # Determine if this is an update or new publish
            if post_id:
                # Update existing content
                endpoint = f"{self.api_gateway_url}/api/integrations/{platform}/content/{post_id}"
                method = "put"
                logger.info(f"Updating existing content on {platform} with post ID: {post_id}")
            else:
                # Publish new content
                endpoint = f"{self.api_gateway_url}/api/integrations/{platform}/content"
                method = "post"
                logger.info(f"Publishing new content to {platform}")
            
            # Make the API request
            payload = {
                "connector_id": self.connectors[platform]["id"],
                "content": transformed_content
            }
            
            if post_id:
                payload["post_id"] = post_id
                
            response = await self._make_api_request(method, endpoint, payload)
            
            if response:
                action = "updated" if post_id else "published"
                logger.info(f"Successfully {action} content {content_id} on {platform}")
                return response
            else:
                action = "update" if post_id else "publish"
                logger.error(f"Failed to {action} content {content_id} on {platform}")
                raise Exception(f"Failed to {action} content {content_id} on {platform}")
        except Exception as e:
            logger.error(f"Error synchronizing content with {platform}: {e}")
            raise
    
    async def _make_api_request(self, method: str, url: str, data: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """
        Make an API request to the specified URL
        """
        try:
            if method.lower() == "get":
                response = requests.get(url, params=data)
            elif method.lower() == "post":
                response = requests.post(url, json=data)
            elif method.lower() == "put":
                response = requests.put(url, json=data)
            elif method.lower() == "delete":
                response = requests.delete(url, json=data)
            else:
                logger.error(f"Unsupported HTTP method: {method}")
                return None
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {e}")
            return None