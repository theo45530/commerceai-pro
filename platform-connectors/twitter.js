const BaseConnector = require('./base');
const axios = require('axios');

class TwitterConnector extends BaseConnector {
  constructor() {
    super();
    this.platform = 'twitter';
    this.baseUrl = 'https://api.twitter.com/2';
    this.uploadUrl = 'https://upload.twitter.com/1.1';
    this.apiKey = null;
    this.apiSecret = null;
    this.accessToken = null;
    this.accessTokenSecret = null;
    this.bearerToken = null;
    this.id = null;
  }

  /**
   * Initialize the Twitter connector with credentials
   * @param {object} credentials - Twitter API credentials
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      const { apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken } = credentials;
      
      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        throw new Error('Missing required Twitter credentials: apiKey, apiSecret, accessToken, accessTokenSecret');
      }
      
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
      this.accessToken = accessToken;
      this.accessTokenSecret = accessTokenSecret;
      this.bearerToken = bearerToken;
      
      // Generate unique ID for this connector instance
      this.id = `twitter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Test authentication
      await this.authenticate();
      
      return {
        id: this.id,
        platform: this.platform,
        status: 'initialized',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize Twitter connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with Twitter API
   * @returns {Promise<boolean>} Authentication status
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      
      // Test authentication by getting user info
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: this.getHeaders()
      });
      
      this.logApiActivity('authenticate', '/users/me', { userId: response.data.data.id });
      this.authenticated = true;
      return true;
    } catch (error) {
      this.handleApiError(error);
      return false;
    }
  }

  /**
   * Get headers for Twitter API requests
   * @returns {object} Request headers
   */
  getHeaders() {
    if (!this.bearerToken) {
      throw new Error('Bearer token is required for Twitter API v2');
    }
    
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Publish content to Twitter
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      let tweetData = {
        text: content.text
      };
      
      // Handle media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = [];
        
        for (const media of content.media.slice(0, 4)) { // Twitter allows max 4 media items
          const mediaId = await this.uploadMedia(media.url, media.type);
          mediaIds.push(mediaId);
        }
        
        if (mediaIds.length > 0) {
          tweetData.media = {
            media_ids: mediaIds
          };
        }
      }
      
      this.logApiActivity('publishContent', '/tweets', tweetData);
      
      const response = await axios.post(
        `${this.baseUrl}/tweets`,
        tweetData,
        {
          headers: this.getHeaders()
        }
      );
      
      const tweetId = response.data.data.id;
      
      return {
        id: tweetId,
        url: `https://twitter.com/i/status/${tweetId}`,
        platform: 'twitter',
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
      
      // Twitter API v2 doesn't support native scheduling
      // This would typically require a third-party service or custom scheduling system
      
      throw new Error('Twitter API v2 does not support native content scheduling. Consider using Twitter Ads API or a third-party scheduling service.');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update existing content
   * @param {string} tweetId - The ID of the tweet to update
   * @param {object} content - The updated content
   * @returns {Promise<object>} Updated content result
   */
  async updateContent(tweetId, content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateContent');
      
      // Twitter doesn't support editing tweets
      // The only option is to delete and repost
      
      throw new Error('Twitter does not support editing tweets. Consider deleting and reposting.');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from Twitter
   * @param {string} tweetId - The ID of the tweet to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(tweetId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      this.logApiActivity('deleteContent', `/tweets/${tweetId}`, { tweetId });
      
      const response = await axios.delete(
        `${this.baseUrl}/tweets/${tweetId}`,
        {
          headers: this.getHeaders()
        }
      );
      
      return {
        id: tweetId,
        platform: 'twitter',
        deleted: response.data.data.deleted,
        deleted_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Upload media to Twitter
   * @param {string} mediaUrl - URL of the media to upload
   * @param {string} mediaType - Type of media (image, video)
   * @returns {Promise<string>} Media ID
   */
  async uploadMedia(mediaUrl, mediaType) {
    try {
      // Download media from URL
      const mediaResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer'
      });
      
      const mediaBuffer = Buffer.from(mediaResponse.data);
      
      // Upload to Twitter
      const uploadResponse = await axios.post(
        `${this.uploadUrl}/media/upload.json`,
        {
          media_data: mediaBuffer.toString('base64'),
          media_category: mediaType === 'video' ? 'tweet_video' : 'tweet_image'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return uploadResponse.data.media_id_string;
    } catch (error) {
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }

  /**
   * Get tweet by ID
   * @param {string} tweetId - The tweet ID
   * @returns {Promise<object>} Tweet data
   */
  async getTweet(tweetId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getTweet');
      
      const response = await axios.get(
        `${this.baseUrl}/tweets/${tweetId}`,
        {
          headers: this.getHeaders(),
          params: {
            'tweet.fields': 'created_at,public_metrics,context_annotations'
          }
        }
      );
      
      this.logApiActivity('getTweet', `/tweets/${tweetId}`, { tweetId });
      
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get user timeline
   * @param {string} userId - The user ID
   * @param {number} maxResults - Maximum number of tweets to return
   * @returns {Promise<array>} Array of tweets
   */
  async getUserTimeline(userId, maxResults = 10) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getUserTimeline');
      
      const response = await axios.get(
        `${this.baseUrl}/users/${userId}/tweets`,
        {
          headers: this.getHeaders(),
          params: {
            max_results: Math.min(maxResults, 100),
            'tweet.fields': 'created_at,public_metrics'
          }
        }
      );
      
      this.logApiActivity('getUserTimeline', `/users/${userId}/tweets`, { userId, maxResults });
      
      return response.data.data || [];
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = TwitterConnector;