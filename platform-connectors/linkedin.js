const BaseConnector = require('./base');
const axios = require('axios');

class LinkedInConnector extends BaseConnector {
  constructor() {
    super();
    this.platform = 'linkedin';
    this.baseUrl = 'https://api.linkedin.com/v2';
    this.clientId = null;
    this.clientSecret = null;
    this.accessToken = null;
    this.personId = null;
    this.organizationId = null;
    this.id = null;
  }

  /**
   * Initialize the LinkedIn connector with credentials
   * @param {object} credentials - LinkedIn API credentials
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      const { clientId, clientSecret, accessToken, personId, organizationId } = credentials;
      
      if (!clientId || !clientSecret || !accessToken) {
        throw new Error('Missing required LinkedIn credentials: clientId, clientSecret, accessToken');
      }
      
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      this.accessToken = accessToken;
      this.personId = personId;
      this.organizationId = organizationId;
      
      // Generate unique ID for this connector instance
      this.id = `linkedin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Test authentication
      await this.authenticate();
      
      return {
        id: this.id,
        platform: this.platform,
        status: 'initialized',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize LinkedIn connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with LinkedIn API
   * @returns {Promise<boolean>} Authentication status
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      
      // Test authentication by getting user profile
      const response = await axios.get(`${this.baseUrl}/people/~`, {
        headers: this.getHeaders()
      });
      
      this.logApiActivity('authenticate', '/people/~', { personId: response.data.id });
      this.authenticated = true;
      return true;
    } catch (error) {
      this.handleApiError(error);
      return false;
    }
  }

  /**
   * Get headers for LinkedIn API requests
   * @returns {object} Request headers
   */
  getHeaders() {
    if (!this.accessToken) {
      throw new Error('Access token is required for LinkedIn API');
    }
    
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    };
  }

  /**
   * Publish content to LinkedIn
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      // Determine the author (person or organization)
      const author = this.organizationId 
        ? `urn:li:organization:${this.organizationId}`
        : `urn:li:person:${this.personId}`;
      
      let postData = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
      
      // Handle media if present
      if (content.media && content.media.length > 0) {
        const media = content.media[0]; // LinkedIn typically supports one media item per post
        
        if (media.type === 'image') {
          // Upload image first
          const uploadedAsset = await this.uploadImage(media.url, author);
          
          postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            description: {
              text: media.caption || content.text
            },
            media: uploadedAsset,
            title: {
              text: media.title || 'Shared Image'
            }
          }];
        } else if (media.type === 'article' && media.url) {
          // Share article/link
          postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
          postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            description: {
              text: media.description || content.text
            },
            originalUrl: media.url,
            title: {
              text: media.title || 'Shared Article'
            }
          }];
        }
      }
      
      this.logApiActivity('publishContent', '/ugcPosts', postData);
      
      const response = await axios.post(
        `${this.baseUrl}/ugcPosts`,
        postData,
        {
          headers: this.getHeaders()
        }
      );
      
      const postId = response.data.id;
      
      return {
        id: postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
        platform: 'linkedin',
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
      
      // LinkedIn API doesn't support native scheduling for organic posts
      // This would typically require a third-party service or custom scheduling system
      
      throw new Error('LinkedIn API does not support native content scheduling for organic posts. Consider using LinkedIn Campaign Manager API for sponsored content or a third-party scheduling service.');
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
      
      // LinkedIn doesn't support editing published posts
      // The only option is to delete and repost
      
      throw new Error('LinkedIn does not support editing published posts. Consider deleting and reposting.');
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from LinkedIn
   * @param {string} postId - The ID of the post to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(postId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      this.logApiActivity('deleteContent', `/ugcPosts/${encodeURIComponent(postId)}`, { postId });
      
      await axios.delete(
        `${this.baseUrl}/ugcPosts/${encodeURIComponent(postId)}`,
        {
          headers: this.getHeaders()
        }
      );
      
      return {
        id: postId,
        platform: 'linkedin',
        deleted: true,
        deleted_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Upload image to LinkedIn
   * @param {string} imageUrl - URL of the image to upload
   * @param {string} author - Author URN
   * @returns {Promise<string>} Asset URN
   */
  async uploadImage(imageUrl, author) {
    try {
      // Step 1: Register upload
      const registerResponse = await axios.post(
        `${this.baseUrl}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: author,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        },
        {
          headers: this.getHeaders()
        }
      );
      
      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;
      
      // Step 2: Download image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      
      // Step 3: Upload image
      await axios.post(uploadUrl, imageResponse.data, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
      
      return asset;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Get post by ID
   * @param {string} postId - The post ID
   * @returns {Promise<object>} Post data
   */
  async getPost(postId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getPost');
      
      const response = await axios.get(
        `${this.baseUrl}/ugcPosts/${encodeURIComponent(postId)}`,
        {
          headers: this.getHeaders()
        }
      );
      
      this.logApiActivity('getPost', `/ugcPosts/${encodeURIComponent(postId)}`, { postId });
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get user profile
   * @returns {Promise<object>} User profile data
   */
  async getUserProfile() {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getUserProfile');
      
      const response = await axios.get(
        `${this.baseUrl}/people/~:(id,firstName,lastName,profilePicture)`,
        {
          headers: this.getHeaders()
        }
      );
      
      this.logApiActivity('getUserProfile', '/people/~', {});
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get organization info
   * @param {string} organizationId - The organization ID
   * @returns {Promise<object>} Organization data
   */
  async getOrganization(organizationId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getOrganization');
      
      const response = await axios.get(
        `${this.baseUrl}/organizations/${organizationId}`,
        {
          headers: this.getHeaders()
        }
      );
      
      this.logApiActivity('getOrganization', `/organizations/${organizationId}`, { organizationId });
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = LinkedInConnector;