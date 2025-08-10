/**
 * Meta Ads Connector
 * Handles integration with Facebook/Instagram advertising platforms
 */

const BaseConnector = require('./base');
const axios = require('axios');

class MetaAdsConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
    this.id = null; // Connector ID for validation
  }

  /**
   * Initialize the connector with credentials
   * @param {object} credentials - The credentials for Meta Ads API
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      this.accessToken = credentials.accessToken;
      this.accountId = credentials.accountId;
      this.pageId = credentials.pageId;
      
      // Generate a unique ID for this connector instance
      this.id = `meta_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Authenticate to verify credentials
      const authResult = await this.authenticate();
      
      return {
        id: this.id,
        name: authResult.name,
        platform: 'meta',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize Meta connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with Meta Ads API
   * @returns {Promise<object>} User info if authentication successful
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      this.logApiActivity('authenticate', 'me', {});
      
      const response = await axios.get(`${this.baseUrl}/me`, {
        params: { access_token: this.accessToken }
      });
      
      this.isAuthenticated = true;
      return response.data;
    } catch (error) {
      this.isAuthenticated = false;
      this.handleApiError(error);
    }
  }

  /**
   * Create a campaign on Meta Ads
   * @param {object} campaignData - Campaign data in internal format
   * @returns {Promise<object>} Created campaign data
   */
  async createCampaign(campaignData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createCampaign');
      const transformedData = this.transformCampaignData(campaignData);
      
      this.logApiActivity('createCampaign', `act_${this.accountId}/campaigns`, transformedData);
      
      const response = await axios.post(
        `${this.baseUrl}/act_${this.accountId}/campaigns`,
        transformedData,
        { params: { access_token: this.accessToken } }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create an ad set within a campaign
   * @param {string} campaignId - The campaign ID
   * @param {object} adSetData - Ad set data in internal format
   * @returns {Promise<object>} Created ad set data
   */
  async createAdSet(campaignId, adSetData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createAdSet');
      const transformedData = this.transformAdSetData(campaignId, adSetData);
      
      this.logApiActivity('createAdSet', `act_${this.accountId}/adsets`, transformedData);
      
      const response = await axios.post(
        `${this.baseUrl}/act_${this.accountId}/adsets`,
        transformedData,
        { params: { access_token: this.accessToken } }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create an ad within an ad set
   * @param {string} adSetId - The ad set ID
   * @param {object} adData - Ad data in internal format
   * @returns {Promise<object>} Created ad data
   */
  async createAd(adSetId, adData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createAd');
      const transformedData = this.transformAdData(adSetId, adData);
      
      this.logApiActivity('createAd', `act_${this.accountId}/ads`, transformedData);
      
      const response = await axios.post(
        `${this.baseUrl}/act_${this.accountId}/ads`,
        transformedData,
        { params: { access_token: this.accessToken } }
      );
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get campaign performance metrics
   * @param {string} campaignId - The campaign ID
   * @returns {Promise<object>} Campaign performance data
   */
  async getCampaignInsights(campaignId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getCampaignInsights');
      
      this.logApiActivity('getCampaignInsights', `${campaignId}/insights`, {});
      
      const response = await axios.get(
        `${this.baseUrl}/${campaignId}/insights`,
        {
          params: {
            access_token: this.accessToken,
            fields: 'impressions,clicks,spend,actions,cost_per_action_type',
            date_preset: 'last_30_days',
            level: 'campaign'
          }
        }
      );
      
      return this.transformInsightsData(response.data);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Transform campaign data from internal format to Meta Ads format
   * @param {object} internalData - Campaign data in internal format
   * @returns {object} Transformed data for Meta Ads API
   */
  transformCampaignData(internalData) {
    return {
      name: internalData.name,
      objective: this.mapObjective(internalData.objective),
      status: 'PAUSED', // Start paused for safety
      special_ad_categories: [],
      daily_budget: Math.round(internalData.budget * 100) // Convert to cents
    };
  }

  /**
   * Transform ad set data from internal format to Meta Ads format
   * @param {string} campaignId - The campaign ID
   * @param {object} internalData - Ad set data in internal format
   * @returns {object} Transformed data for Meta Ads API
   */
  transformAdSetData(campaignId, internalData) {
    return {
      name: internalData.name,
      campaign_id: campaignId,
      targeting: this.buildTargeting(internalData.target_audience),
      optimization_goal: this.mapOptimizationGoal(internalData.objective),
      billing_event: 'IMPRESSIONS',
      bid_amount: internalData.bid_amount || 1000, // Default bid amount in cents
      status: 'PAUSED'
    };
  }

  /**
   * Transform ad data from internal format to Meta Ads format
   * @param {string} adSetId - The ad set ID
   * @param {object} internalData - Ad data in internal format
   * @returns {object} Transformed data for Meta Ads API
   */
  transformAdData(adSetId, internalData) {
    return {
      name: internalData.name,
      adset_id: adSetId,
      creative: internalData.creative_id,
      status: 'PAUSED'
    };
  }

  /**
   * Transform insights data from Meta Ads format to internal format
   * @param {object} insightsData - Insights data from Meta Ads API
   * @returns {object} Transformed insights data
   */
  transformInsightsData(insightsData) {
    if (!insightsData.data || insightsData.data.length === 0) {
      return {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0
      };
    }

    const data = insightsData.data[0];
    const impressions = parseInt(data.impressions || 0, 10);
    const clicks = parseInt(data.clicks || 0, 10);
    const spend = parseFloat(data.spend || 0);
    
    // Extract conversions from actions
    let conversions = 0;
    if (data.actions) {
      const conversionActions = data.actions.filter(action => 
        action.action_type === 'purchase' || 
        action.action_type === 'lead' ||
        action.action_type === 'complete_registration'
      );
      
      conversions = conversionActions.reduce((sum, action) => 
        sum + parseInt(action.value, 10), 0);
    }
    
    // Calculate metrics
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    
    return {
      impressions,
      clicks,
      spend,
      conversions,
      ctr,
      cpc,
      cpa
    };
  }

  /**
   * Map internal objective to Meta Ads objective
   * @param {string} internalObjective - Internal objective name
   * @returns {string} Meta Ads objective
   */
  mapObjective(internalObjective) {
    const objectiveMap = {
      'awareness': 'BRAND_AWARENESS',
      'traffic': 'TRAFFIC',
      'engagement': 'ENGAGEMENT',
      'leads': 'LEAD_GENERATION',
      'conversions': 'CONVERSIONS',
      'sales': 'SALES',
      'app_installs': 'APP_INSTALLS'
    };
    
    return objectiveMap[internalObjective.toLowerCase()] || 'CONVERSIONS';
  }

  /**
   * Map internal objective to Meta Ads optimization goal
   * @param {string} internalObjective - Internal objective name
   * @returns {string} Meta Ads optimization goal
   */
  mapOptimizationGoal(internalObjective) {
    const goalMap = {
      'awareness': 'AD_RECALL_LIFT',
      'traffic': 'LINK_CLICKS',
      'engagement': 'POST_ENGAGEMENT',
      'leads': 'LEAD_GENERATION',
      'conversions': 'OFFSITE_CONVERSIONS',
      'sales': 'VALUE',
      'app_installs': 'APP_INSTALLS'
    };
    
    return goalMap[internalObjective.toLowerCase()] || 'OFFSITE_CONVERSIONS';
  }

  /**
   * Build targeting specification from internal audience data
   * @param {object} audience - Internal audience specification
   * @returns {object} Meta Ads targeting specification
   */
  buildTargeting(audience) {
    const targeting = {};
    
    // Age targeting
    if (audience.age_min) targeting.age_min = audience.age_min;
    if (audience.age_max) targeting.age_max = audience.age_max;
    
    // Gender targeting
    if (audience.gender) {
      targeting.genders = [];
      if (audience.gender === 'male' || audience.gender === 'all') targeting.genders.push(1);
      if (audience.gender === 'female' || audience.gender === 'all') targeting.genders.push(2);
    }
    
    // Location targeting
    if (audience.locations) {
      targeting.geo_locations = {};
      
      if (audience.locations.countries) {
        targeting.geo_locations.countries = audience.locations.countries;
      }
      
      if (audience.locations.cities) {
        targeting.geo_locations.cities = audience.locations.cities.map(city => ({
          key: city.key || city.name,
          radius: city.radius || 10,
          distance_unit: 'mile'
        }));
      }
    }
    
    // Interest targeting
    if (audience.interests && audience.interests.length > 0) {
      targeting.interests = audience.interests.map(interest => ({
        id: interest.id,
        name: interest.name
      }));
    }
    
    // Behavior targeting
    if (audience.behaviors && audience.behaviors.length > 0) {
      targeting.behaviors = audience.behaviors.map(behavior => ({
        id: behavior.id,
        name: behavior.name
      }));
    }
    
    return targeting;
  }

  /**
   * Publish content to Meta platforms (Facebook/Instagram)
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      // Transform content to Meta format
      const postData = {
        message: content.text,
        access_token: this.accessToken
      };
      
      // Add media if available
      if (content.media && content.media.length > 0) {
        if (content.media[0].type === 'image') {
          postData.url = content.media[0].url;
        } else if (content.media[0].type === 'video') {
          postData.file_url = content.media[0].url;
          postData.description = content.text;
        }
      }
      
      this.logApiActivity('publishContent', `${this.pageId}/feed`, postData);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.pageId}/feed`,
        postData
      );
      
      return {
        id: response.data.id,
        url: `https://facebook.com/${response.data.id}`,
        platform: 'meta',
        published_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Schedule content for future publication
   * @param {object} content - The content to schedule
   * @param {Date} scheduleTime - When to publish the content
   * @returns {Promise<object>} Scheduled content result
   */
  async scheduleContent(content, scheduleTime) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('scheduleContent');
      
      // Transform content to Meta format
      const postData = {
        message: content.text,
        published: false,
        scheduled_publish_time: Math.floor(scheduleTime.getTime() / 1000), // Convert to Unix timestamp
        access_token: this.accessToken
      };
      
      // Add media if available
      if (content.media && content.media.length > 0) {
        if (content.media[0].type === 'image') {
          postData.url = content.media[0].url;
        } else if (content.media[0].type === 'video') {
          postData.file_url = content.media[0].url;
          postData.description = content.text;
        }
      }
      
      this.logApiActivity('scheduleContent', `${this.pageId}/feed`, postData);
      
      const response = await axios.post(
        `${this.baseUrl}/${this.pageId}/feed`,
        postData
      );
      
      return {
        id: response.data.id,
        url: `https://facebook.com/${response.data.id}`,
        platform: 'meta',
        scheduled_time: scheduleTime.toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update existing content
   * @param {string} postId - The ID of the post to update
   * @param {object} content - The updated content
   * @returns {Promise<object>} Updated content result
   */
  async updateContent(postId, content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateContent');
      
      const updateData = {
        message: content.text,
        access_token: this.accessToken
      };
      
      this.logApiActivity('updateContent', postId, updateData);
      
      const response = await axios.post(
        `${this.baseUrl}/${postId}`,
        updateData
      );
      
      return {
        id: postId,
        url: `https://facebook.com/${postId}`,
        platform: 'meta',
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from the platform
   * @param {string} postId - The ID of the post to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(postId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      this.logApiActivity('deleteContent', postId, {});
      
      await axios.delete(`${this.baseUrl}/${postId}`, {
        params: { access_token: this.accessToken }
      });
      
      return {
        id: postId,
        platform: 'meta',
        deleted: true,
        deleted_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = MetaAdsConnector;