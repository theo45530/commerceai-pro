import os
import json
import logging
from typing import Dict, List, Optional, Any

import requests
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger("advertising-platform-integration")

class PlatformIntegration:
    """
    Class to handle integration with advertising platforms via the platform-connectors library
    """
    
    def __init__(self, db=None, redis_client=None, rabbitmq_channel=None):
        self.db = db
        self.redis_client = redis_client
        self.rabbitmq_channel = rabbitmq_channel
        self.api_gateway_url = os.getenv("API_GATEWAY_URL", "http://api-gateway:5000")
        self.connectors = {}
    
    async def initialize_connector(self, platform: str, credentials: Dict[str, Any]):
        """
        Initialize a platform connector with the provided credentials
        """
        try:
            # Call the API Gateway to initialize the connector
            response = requests.post(
                f"{self.api_gateway_url}/api/integrations/{platform}/initialize",
                json=credentials
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to initialize {platform} connector: {response.text}")
                return None
            
            connector_id = response.json().get("connector_id")
            self.connectors[platform] = connector_id
            
            return connector_id
        except Exception as e:
            logger.error(f"Error initializing {platform} connector: {e}")
            return None
    
    async def create_campaign(self, platform: str, campaign_data: Dict[str, Any]):
        """
        Create a campaign on the specified platform
        """
        try:
            connector_id = self.connectors.get(platform)
            if not connector_id:
                # Try to get credentials from database
                if self.db:
                    platform_config = self.db.platform_credentials.find_one({"platform": platform})
                    if platform_config:
                        connector_id = await self.initialize_connector(platform, platform_config["credentials"])
            
            if not connector_id:
                raise HTTPException(status_code=400, detail=f"No connector initialized for {platform}")
            
            # Call the API Gateway to create the campaign
            response = requests.post(
                f"{self.api_gateway_url}/api/integrations/{platform}/campaigns",
                json={
                    "connector_id": connector_id,
                    "campaign_data": campaign_data
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to create campaign on {platform}: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
        except Exception as e:
            logger.error(f"Error creating campaign on {platform}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_campaign_insights(self, platform: str, campaign_id: str):
        """
        Get insights for a campaign on the specified platform
        """
        try:
            connector_id = self.connectors.get(platform)
            if not connector_id:
                # Try to get credentials from database
                if self.db:
                    platform_config = self.db.platform_credentials.find_one({"platform": platform})
                    if platform_config:
                        connector_id = await self.initialize_connector(platform, platform_config["credentials"])
            
            if not connector_id:
                raise HTTPException(status_code=400, detail=f"No connector initialized for {platform}")
            
            # Call the API Gateway to get campaign insights
            response = requests.get(
                f"{self.api_gateway_url}/api/integrations/{platform}/campaigns/{campaign_id}/insights",
                params={"connector_id": connector_id}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get campaign insights from {platform}: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
        except Exception as e:
            logger.error(f"Error getting campaign insights from {platform}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def update_campaign(self, platform: str, campaign_id: str, update_data: Dict[str, Any]):
        """
        Update a campaign on the specified platform
        """
        try:
            connector_id = self.connectors.get(platform)
            if not connector_id:
                # Try to get credentials from database
                if self.db:
                    platform_config = self.db.platform_credentials.find_one({"platform": platform})
                    if platform_config:
                        connector_id = await self.initialize_connector(platform, platform_config["credentials"])
            
            if not connector_id:
                raise HTTPException(status_code=400, detail=f"No connector initialized for {platform}")
            
            # Call the API Gateway to update the campaign
            response = requests.put(
                f"{self.api_gateway_url}/api/integrations/{platform}/campaigns/{campaign_id}",
                json={
                    "connector_id": connector_id,
                    "update_data": update_data
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to update campaign on {platform}: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
        except Exception as e:
            logger.error(f"Error updating campaign on {platform}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def create_ad(self, platform: str, campaign_id: str, ad_group_id: str, ad_data: Dict[str, Any]):
        """
        Create an ad within an ad group on the specified platform
        """
        try:
            connector_id = self.connectors.get(platform)
            if not connector_id:
                # Try to get credentials from database
                if self.db:
                    platform_config = self.db.platform_credentials.find_one({"platform": platform})
                    if platform_config:
                        connector_id = await self.initialize_connector(platform, platform_config["credentials"])
            
            if not connector_id:
                raise HTTPException(status_code=400, detail=f"No connector initialized for {platform}")
            
            # Call the API Gateway to create the ad
            response = requests.post(
                f"{self.api_gateway_url}/api/integrations/{platform}/campaigns/{campaign_id}/adgroups/{ad_group_id}/ads",
                json={
                    "connector_id": connector_id,
                    "ad_data": ad_data
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to create ad on {platform}: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
        except Exception as e:
            logger.error(f"Error creating ad on {platform}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def transform_internal_to_platform_format(self, platform: str, campaign_data: Dict[str, Any]):
        """
        Transform internal campaign data format to platform-specific format
        """
        if platform.lower() == "meta" or platform.lower() == "facebook":
            return self._transform_to_meta_format(campaign_data)
        elif platform.lower() == "google":
            return self._transform_to_google_format(campaign_data)
        else:
            # Return original data for unsupported platforms
            return campaign_data
    
    def _transform_to_meta_format(self, campaign_data: Dict[str, Any]):
        """
        Transform internal campaign data to Meta Ads format
        """
        # Map internal objective to Meta objective
        objective_map = {
            "awareness": "BRAND_AWARENESS",
            "traffic": "TRAFFIC",
            "engagement": "ENGAGEMENT",
            "leads": "LEAD_GENERATION",
            "conversions": "CONVERSIONS",
            "sales": "SALES"
        }
        
        # Extract target audience
        target_audience = campaign_data.get("target_audience", {})
        
        # Build Meta Ads campaign structure
        meta_campaign = {
            "name": campaign_data.get("name"),
            "objective": objective_map.get(campaign_data.get("objective", "").lower(), "CONVERSIONS"),
            "status": "PAUSED",  # Start as paused for safety
            "daily_budget": int(campaign_data.get("budget", 0) * 100),  # Convert to cents
            "targeting": {
                "age_min": target_audience.get("age_min", 18),
                "age_max": target_audience.get("age_max", 65),
                "genders": self._map_gender(target_audience.get("gender")),
                "geo_locations": self._map_locations(target_audience.get("locations", {})),
                "interests": target_audience.get("interests", [])
            }
        }
        
        return meta_campaign
    
    def _transform_to_google_format(self, campaign_data: Dict[str, Any]):
        """
        Transform internal campaign data to Google Ads format
        """
        # Map internal objective to Google Ads objective
        objective_map = {
            "awareness": "DISPLAY",
            "traffic": "SEARCH",
            "engagement": "DISPLAY",
            "leads": "SEARCH",
            "conversions": "SEARCH",
            "sales": "SHOPPING"
        }
        
        # Extract target audience
        target_audience = campaign_data.get("target_audience", {})
        
        # Build Google Ads campaign structure
        google_campaign = {
            "name": campaign_data.get("name"),
            "advertising_channel_type": objective_map.get(campaign_data.get("objective", "").lower(), "DISPLAY"),
            "status": "PAUSED",  # Start as paused for safety
            "campaign_budget": {
                "amount_micros": int(campaign_data.get("budget", 0) * 1000000)  # Convert to micros
            },
            # Additional Google Ads specific settings would go here
        }
        
        return google_campaign
    
    def _map_gender(self, gender):
        """
        Map internal gender format to Meta Ads gender format
        """
        if not gender or gender == "all":
            return [1, 2]  # Both male and female
        elif gender == "male":
            return [1]
        elif gender == "female":
            return [2]
        else:
            return [1, 2]  # Default to both
    
    def _map_locations(self, locations):
        """
        Map internal locations format to Meta Ads locations format
        """
        geo_locations = {}
        
        if "countries" in locations:
            geo_locations["countries"] = locations["countries"]
        
        if "cities" in locations:
            geo_locations["cities"] = [{
                "key": city.get("key", city.get("name")),
                "radius": city.get("radius", 10),
                "distance_unit": "mile"
            } for city in locations["cities"]]
        
        return geo_locations