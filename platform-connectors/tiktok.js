const BaseConnector = require('./base');
const axios = require('axios');

class TikTokConnector extends BaseConnector {
  constructor() {
    super();
    this.platform = 'tiktok';
    this.baseUrl = 'https://open-api.tiktok.com';
    this.clientKey = null;
    this.clientSecret = null;
    this.accessToken = null;
    this.openId = null;
    this.id = null;
  }

  /**
   * Initialize the TikTok connector with credentials
   * @param {object} credentials - TikTok API credentials
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      const { clientKey, clientSecret, accessToken, openId } = credentials;
      
      if (!clientKey || !clientSecret || !accessToken || !openId) {
        throw new Error('Missing required TikTok credentials: clientKey, clientSecret, accessToken, openId');
      }
      
      this.clientKey = clientKey;
      this.clientSecret = clientSecret;
      this.accessToken = accessToken;
      this.openId = openId;
      
      // Generate unique ID for this connector instance
      this.id = `tiktok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Test authentication
      await this.authenticate();
      
      return {
        id: this.id,
        platform: this.platform,
        status: 'initialized',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize TikTok connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with TikTok API
   * @returns {Promise<boolean>} Authentication status
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      
      // Test authentication by getting user info
      const response = await axios.post(
        `${this.baseUrl}/oauth/userinfo/`,
        {
          client_key: this.clientKey,
          access_token: this.accessToken
        },
        {
          headers: this.getHeaders()
        }
      );
      
      if (response.data.error_code !== 0) {
        throw new Error(`TikTok authentication failed: ${response.data.description}`);
      }
      
      this.logApiActivity('authenticate', '/oauth/userinfo/', { openId: this.openId });
      this.authenticated = true;
      return true;
    } catch (error) {
      this.handleApiError(error);
      return false;
    }
  }

  /**
   * Get headers for TikTok API requests
   * @returns {object} Request headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Publish content to TikTok
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      // TikTok requires video content
      if (!content.media || content.media.length === 0) {
        throw new Error('TikTok requires video content for publishing');
      }
      
      const videoMedia = content.media.find(m => m.type === 'video');
      if (!videoMedia) {
        throw new Error('TikTok requires video content for publishing');
      }
      
      // Step 1: Initialize video upload
      const initResponse = await this.initializeVideoUpload();
      
      if (initResponse.error_code !== 0) {
        throw new Error(`Failed to initialize video upload: ${initResponse.description}`);
      }
      
      const uploadUrl = initResponse.data.upload_url;
      const publishId = initResponse.data.publish_id;
      
      // Step 2: Upload video
      await this.uploadVideo(uploadUrl, videoMedia.url);
      
      // Step 3: Publish video
      const publishData = {
        client_key: this.clientKey,
        access_token: this.accessToken,
        open_id: this.openId,
        publish_id: publishId,
        text: content.text || '',
        privacy_level: content.privacy || 'MUTUAL_FOLLOW_FRIEND', // PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIEND, FOLLOWER_OF_CREATOR, SELF_ONLY
        disable_duet: content.disable_duet || false,
        disable_comment: content.disable_comment || false,
        disable_stitch: content.disable_stitch || false,
        video_cover_timestamp_ms: content.cover_timestamp || 1000
      };
      
      this.logApiActivity('publishContent', '/share/video/upload/', publishData);
      
      const response = await axios.post(
        `${this.baseUrl}/share/video/upload/`,
        publishData,
        {
          headers: this.getHeaders()
        }
      );
      
      if (response.data.error_code !== 0) {
        throw new Error(`Failed to publish video: ${response.data.description}`);
      }
      
      const shareId = response.data.data.share_id;
      
      return {
        id: shareId,
        url: `https://www.tiktok.com/@${this.openId}/video/${shareId}`,
        platform: 'tiktok',
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
      
      // TikTok API doesn't support native scheduling
      // This would typically require a third-party service or custom scheduling system
      
      throw new Error('TikTok API does not support native content scheduling. Consider using a third-party scheduling service.');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update existing content
   * @param {string} shareId - The ID of the video to update
   * @param {object} content - The updated content
   * @returns {Promise<object>} Updated content result
   */
  async updateContent(shareId, content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateContent');
      
      // TikTok doesn't support editing published videos
      // The only option is to delete and repost
      
      throw new Error('TikTok does not support editing published videos. Consider deleting and reposting.');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from TikTok
   * @param {string} shareId - The ID of the video to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(shareId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      const deleteData = {
        client_key: this.clientKey,
        access_token: this.accessToken,
        open_id: this.openId,
        share_id: shareId
      };
      
      this.logApiActivity('deleteContent', '/share/video/delete/', deleteData);
      
      const response = await axios.post(
        `${this.baseUrl}/share/video/delete/`,
        deleteData,
        {
          headers: this.getHeaders()
        }
      );
      
      if (response.data.error_code !== 0) {
        throw new Error(`Failed to delete video: ${response.data.description}`);
      }
      
      return {
        id: shareId,
        platform: 'tiktok',
        deleted: true,
        deleted_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Initialize video upload
   * @returns {Promise<object>} Upload initialization response
   */
  async initializeVideoUpload() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/share/video/init/`,
        {
          client_key: this.clientKey,
          access_token: this.accessToken,
          open_id: this.openId
        },
        {
          headers: this.getHeaders()
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to initialize video upload: ${error.message}`);
    }
  }

  /**
   * Upload video to TikTok
   * @param {string} uploadUrl - The upload URL from initialization
   * @param {string} videoUrl - URL of the video to upload
   * @returns {Promise<void>}
   */
  async uploadVideo(uploadUrl, videoUrl) {
    try {
      // Download video from URL
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream'
      });
      
      // Upload to TikTok
      await axios.put(uploadUrl, videoResponse.data, {
        headers: {
          'Content-Type': 'video/mp4'
        }
      });
    } catch (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Get video info
   * @param {string} shareId - The video share ID
   * @returns {Promise<object>} Video data
   */
  async getVideoInfo(shareId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getVideoInfo');
      
      const response = await axios.post(
        `${this.baseUrl}/share/video/query/`,
        {
          client_key: this.clientKey,
          access_token: this.accessToken,
          open_id: this.openId,
          share_id: shareId
        },
        {
          headers: this.getHeaders()
        }
      );
      
      this.logApiActivity('getVideoInfo', '/share/video/query/', { shareId });
      
      if (response.data.error_code !== 0) {
        throw new Error(`Failed to get video info: ${response.data.description}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get user videos
   * @param {number} cursor - Pagination cursor
   * @param {number} maxCount - Maximum number of videos to return
   * @returns {Promise<object>} User videos data
   */
  async getUserVideos(cursor = 0, maxCount = 20) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getUserVideos');
      
      const response = await axios.post(
        `${this.baseUrl}/share/video/list/`,
        {
          client_key: this.clientKey,
          access_token: this.accessToken,
          open_id: this.openId,
          cursor: cursor,
          max_count: Math.min(maxCount, 20)
        },
        {
          headers: this.getHeaders()
        }
      );
      
      this.logApiActivity('getUserVideos', '/share/video/list/', { cursor, maxCount });
      
      if (response.data.error_code !== 0) {
        throw new Error(`Failed to get user videos: ${response.data.description}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get user info
   * @returns {Promise<object>} User info data
   */
  async getUserInfo() {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getUserInfo');
      
      const response = await axios.post(
        `${this.baseUrl}/oauth/userinfo/`,
        {
          client_key: this.clientKey,
          access_token: this.accessToken
        },
        {
          headers: this.getHeaders()
        }
      );
      
      this.logApiActivity('getUserInfo', '/oauth/userinfo/', {});
      
      if (response.data.error_code !== 0) {
        throw new Error(`Failed to get user info: ${response.data.description}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = TikTokConnector;