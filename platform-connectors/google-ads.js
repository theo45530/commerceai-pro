/**
 * Google Ads Connector
 * Handles integration with Google Ads advertising platform
 */

const BaseConnector = require('./base');
const { GoogleAdsApi } = require('google-ads-api');

class GoogleAdsConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.client = null;
    this.customerId = config.customerId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.developerToken = config.developerToken;
    this.refreshToken = config.refreshToken;
    this.id = null; // Connector ID for validation
  }
  
  /**
   * Initialize the connector with credentials
   * @param {object} credentials - The credentials for Google Ads API
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      this.clientId = credentials.clientId;
      this.clientSecret = credentials.clientSecret;
      this.developerToken = credentials.developerToken;
      this.refreshToken = credentials.refreshToken;
      this.customerId = credentials.customerId;
      
      // Generate a unique ID for this connector instance
      this.id = `google_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Authenticate to verify credentials
      const authResult = await this.authenticate();
      
      return {
        id: this.id,
        name: authResult.customerInfo?.customer?.descriptive_name || 'Google Ads Account',
        platform: 'google',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize Google Ads connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with Google Ads API
   * @returns {Promise<object>} Client info if authentication successful
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      this.logApiActivity('authenticate', 'GoogleAdsApi', {});
      
      this.client = new GoogleAdsApi({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        developer_token: this.developerToken,
        refresh_token: this.refreshToken
      });
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      // Test the connection by getting account info
      const accessibleCustomers = await customer.query(`
        SELECT customer.id, customer.descriptive_name
        FROM customer
        WHERE customer.id = ${this.customerId}
      `);
      
      this.isAuthenticated = true;
      return { customerId: this.customerId, customerInfo: accessibleCustomers[0] };
    } catch (error) {
      this.isAuthenticated = false;
      this.handleApiError(error);
    }
  }

  /**
   * Create a campaign on Google Ads
   * @param {object} campaignData - Campaign data in internal format
   * @returns {Promise<object>} Created campaign data
   */
  async createCampaign(campaignData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createCampaign');
      const transformedData = this.transformCampaignData(campaignData);
      
      this.logApiActivity('createCampaign', 'campaigns.create', transformedData);
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      const operation = customer.campaigns.create(transformedData);
      const response = await operation;
      
      return {
        id: response.results[0].resource_name,
        name: transformedData.name,
        status: transformedData.status
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create an ad group within a campaign
   * @param {string} campaignId - The campaign ID
   * @param {object} adGroupData - Ad group data in internal format
   * @returns {Promise<object>} Created ad group data
   */
  async createAdGroup(campaignId, adGroupData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createAdGroup');
      const transformedData = this.transformAdGroupData(campaignId, adGroupData);
      
      this.logApiActivity('createAdGroup', 'adGroups.create', transformedData);
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      const operation = customer.adGroups.create(transformedData);
      const response = await operation;
      
      return {
        id: response.results[0].resource_name,
        name: transformedData.name,
        status: transformedData.status
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create an ad within an ad group
   * @param {string} adGroupId - The ad group ID
   * @param {object} adData - Ad data in internal format
   * @returns {Promise<object>} Created ad data
   */
  async createAd(adGroupId, adData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createAd');
      const transformedData = this.transformAdData(adGroupId, adData);
      
      this.logApiActivity('createAd', 'ads.create', transformedData);
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      // For responsive display ads
      const operation = customer.responsiveDisplayAds.create(transformedData);
      const response = await operation;
      
      return {
        id: response.results[0].resource_name,
        adGroupId: adGroupId,
        status: 'PAUSED'
      };
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
      
      this.logApiActivity('getCampaignInsights', 'query', { campaignId });
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      const results = await customer.query(`
        SELECT 
          campaign.id, 
          campaign.name,
          metrics.impressions, 
          metrics.clicks, 
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.resource_name = '${campaignId}'
        LIMIT 1
      `);
      
      return this.transformInsightsData(results[0]);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Transform campaign data from internal format to Google Ads format
   * @param {object} internalData - Campaign data in internal format
   * @returns {object} Transformed data for Google Ads API
   */
  transformCampaignData(internalData) {
    return {
      name: internalData.name,
      status: 'PAUSED', // Start paused for safety
      campaign_budget: {
        amount_micros: Math.round(internalData.budget * 1000000) // Convert to micros
      },
      advertising_channel_type: this.mapChannelType(internalData.objective),
      target_spend: {
        cpc_bid_ceiling_micros: 1000000 // Default $1 max CPC
      },
      // Set other campaign settings based on objective
      ...this.getCampaignSettingsByObjective(internalData.objective)
    };
  }

  /**
   * Transform ad group data from internal format to Google Ads format
   * @param {string} campaignId - The campaign ID
   * @param {object} internalData - Ad group data in internal format
   * @returns {object} Transformed data for Google Ads API
   */
  transformAdGroupData(campaignId, internalData) {
    return {
      name: internalData.name,
      campaign: campaignId,
      status: 'PAUSED',
      type: 'DISPLAY_STANDARD',
      cpc_bid_micros: internalData.bid_amount ? Math.round(internalData.bid_amount * 1000000) : 1000000
    };
  }

  /**
   * Transform ad data from internal format to Google Ads format
   * @param {string} adGroupId - The ad group ID
   * @param {object} internalData - Ad data in internal format
   * @returns {object} Transformed data for Google Ads API
   */
  transformAdData(adGroupId, adData) {
    return {
      ad_group: adGroupId,
      headlines: this.formatHeadlines(adData.headlines),
      descriptions: this.formatDescriptions(adData.descriptions),
      marketing_images: adData.images ? [{
        asset: {
          image_asset: {
            data: adData.images[0].data
          }
        }
      }] : [],
      call_to_action_text: adData.call_to_action || 'LEARN_MORE',
      long_headline: {
        text: adData.long_headline || adData.headlines[0]
      }
    };
  }

  /**
   * Format headlines for responsive display ads
   * @param {Array<string>} headlines - Array of headline texts
   * @returns {Array<object>} Formatted headlines
   */
  formatHeadlines(headlines) {
    return headlines.map(headline => ({
      text: headline
    }));
  }

  /**
   * Format descriptions for responsive display ads
   * @param {Array<string>} descriptions - Array of description texts
   * @returns {Array<object>} Formatted descriptions
   */
  formatDescriptions(descriptions) {
    return descriptions.map(description => ({
      text: description
    }));
  }

  /**
   * Transform insights data from Google Ads format to internal format
   * @param {object} insightsData - Insights data from Google Ads API
   * @returns {object} Transformed insights data
   */
  transformInsightsData(insightsData) {
    if (!insightsData) {
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

    const impressions = parseInt(insightsData.metrics.impressions || 0, 10);
    const clicks = parseInt(insightsData.metrics.clicks || 0, 10);
    const spend = parseFloat(insightsData.metrics.cost_micros || 0) / 1000000; // Convert from micros
    const conversions = parseFloat(insightsData.metrics.conversions || 0);
    
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
   * Map internal objective to Google Ads channel type
   * @param {string} internalObjective - Internal objective name
   * @returns {string} Google Ads channel type
   */
  mapChannelType(internalObjective) {
    const channelMap = {
      'awareness': 'DISPLAY',
      'traffic': 'SEARCH',
      'engagement': 'DISPLAY',
      'leads': 'SEARCH',
      'conversions': 'SEARCH',
      'sales': 'SHOPPING',
      'app_installs': 'MULTI_CHANNEL'
    };
    
    return channelMap[internalObjective.toLowerCase()] || 'DISPLAY';
  }

  /**
   * Get campaign settings based on objective
   * @param {string} objective - Campaign objective
   * @returns {object} Campaign settings
   */
  getCampaignSettingsByObjective(objective) {
    const objectiveLower = objective.toLowerCase();
    
    switch (objectiveLower) {
      case 'awareness':
      case 'engagement':
        return {
          target_cpm: {}
        };
      
      case 'traffic':
      case 'leads':
      case 'conversions':
        return {
          target_cpa: {}
        };
      
      case 'sales':
        return {
          target_roas: {}
        };
      
      case 'app_installs':
        return {
          target_cpi: {}
        };
      
      default:
        return {};
    }
  }

  /**
   * Publish content to Google Ads platform
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      // For Google Ads, publishing content means creating an ad
      // We'll create a responsive search ad as an example
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      // First, we need a campaign and ad group to place the ad in
      // For simplicity, we'll use the first active campaign and ad group
      // In a real implementation, you'd want to specify these or create new ones
      
      const campaigns = await customer.query(`
        SELECT campaign.id, campaign.name
        FROM campaign
        WHERE campaign.status = 'ENABLED'
        LIMIT 1
      `);
      
      if (!campaigns || campaigns.length === 0) {
        throw new Error('No active campaigns found. Please create a campaign first.');
      }
      
      const campaignId = campaigns[0].campaign.id;
      
      const adGroups = await customer.query(`
        SELECT ad_group.id, ad_group.name
        FROM ad_group
        WHERE ad_group.campaign = '${campaignId}'
        AND ad_group.status = 'ENABLED'
        LIMIT 1
      `);
      
      if (!adGroups || adGroups.length === 0) {
        throw new Error('No active ad groups found. Please create an ad group first.');
      }
      
      const adGroupId = adGroups[0].ad_group.id;
      
      // Create the ad
      const adOperation = customer.ads.create({
        ad_group: adGroupId,
        ad: {
          responsive_search_ad: {
            headlines: [
              { text: content.title || 'Advertisement' },
              { text: content.subtitle || 'Learn More' },
              { text: content.callToAction || 'Click Now' }
            ],
            descriptions: [
              { text: content.text.substring(0, 90) }, // Google Ads has character limits
              { text: content.text.substring(90, 180) || content.text.substring(0, 90) }
            ],
            path1: content.path1 || 'path1',
            path2: content.path2 || 'path2'
          },
          final_urls: [content.url || 'https://example.com']
        }
      });
      
      const adResponse = await adOperation;
      
      this.logApiActivity('publishContent', 'ads.create', { adGroupId, content });
      
      return {
        id: adResponse.results[0].resource_name,
        url: content.url || 'https://example.com',
        platform: 'google',
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
      
      // Google Ads doesn't have a direct API for scheduling ads to start at a future time
      // Instead, we'll create the ad with a future start date
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      // Find an active campaign to place the ad in
      const campaigns = await customer.query(`
        SELECT campaign.id, campaign.name
        FROM campaign
        WHERE campaign.status = 'ENABLED'
        LIMIT 1
      `);
      
      if (!campaigns || campaigns.length === 0) {
        throw new Error('No active campaigns found. Please create a campaign first.');
      }
      
      const campaignId = campaigns[0].campaign.id;
      
      // Find an active ad group
      const adGroups = await customer.query(`
        SELECT ad_group.id, ad_group.name
        FROM ad_group
        WHERE ad_group.campaign = '${campaignId}'
        AND ad_group.status = 'ENABLED'
        LIMIT 1
      `);
      
      if (!adGroups || adGroups.length === 0) {
        throw new Error('No active ad groups found. Please create an ad group first.');
      }
      
      const adGroupId = adGroups[0].ad_group.id;
      
      // Create the ad
      const adOperation = customer.ads.create({
        ad_group: adGroupId,
        ad: {
          responsive_search_ad: {
            headlines: [
              { text: content.title || 'Advertisement' },
              { text: content.subtitle || 'Learn More' },
              { text: content.callToAction || 'Click Now' }
            ],
            descriptions: [
              { text: content.text.substring(0, 90) },
              { text: content.text.substring(90, 180) || content.text.substring(0, 90) }
            ],
            path1: content.path1 || 'path1',
            path2: content.path2 || 'path2'
          },
          final_urls: [content.url || 'https://example.com'],
          start_date: scheduleTime.toISOString().split('T')[0].replace(/-/g, '') // Format: YYYYMMDD
        }
      });
      
      const adResponse = await adOperation;
      
      this.logApiActivity('scheduleContent', 'ads.create', { adGroupId, content, scheduleTime });
      
      return {
        id: adResponse.results[0].resource_name,
        url: content.url || 'https://example.com',
        platform: 'google',
        scheduled_time: scheduleTime.toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update existing content
   * @param {string} adId - The ID of the ad to update
   * @param {object} content - The updated content
   * @returns {Promise<object>} Updated content result
   */
  async updateContent(adId, content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateContent');
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      // Get the current ad to update
      const ads = await customer.query(`
        SELECT ad_group_ad.ad.id, ad_group_ad.ad.responsive_search_ad
        FROM ad_group_ad
        WHERE ad_group_ad.ad.id = ${adId.split('/').pop()}
      `);
      
      if (!ads || ads.length === 0) {
        throw new Error(`Ad with ID ${adId} not found.`);
      }
      
      // Update the ad
      const adOperation = customer.ads.update({
        resource_name: adId,
        ad: {
          responsive_search_ad: {
            headlines: [
              { text: content.title || 'Advertisement' },
              { text: content.subtitle || 'Learn More' },
              { text: content.callToAction || 'Click Now' }
            ],
            descriptions: [
              { text: content.text.substring(0, 90) },
              { text: content.text.substring(90, 180) || content.text.substring(0, 90) }
            ],
            path1: content.path1 || 'path1',
            path2: content.path2 || 'path2'
          },
          final_urls: [content.url || 'https://example.com']
        }
      });
      
      const adResponse = await adOperation;
      
      this.logApiActivity('updateContent', 'ads.update', { adId, content });
      
      return {
        id: adId,
        url: content.url || 'https://example.com',
        platform: 'google',
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from the platform
   * @param {string} adId - The ID of the ad to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(adId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      const customer = this.client.Customer({
        customer_id: this.customerId
      });
      
      // In Google Ads, you don't actually delete ads, you set them to REMOVED status
      const adOperation = customer.adGroupAds.update({
        resource_name: adId,
        status: 'REMOVED'
      });
      
      await adOperation;
      
      this.logApiActivity('deleteContent', 'adGroupAds.update', { adId, status: 'REMOVED' });
      
      return {
        id: adId,
        platform: 'google',
        deleted: true,
        deleted_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = GoogleAdsConnector;