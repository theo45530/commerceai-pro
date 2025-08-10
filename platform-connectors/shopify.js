/**
 * Shopify Connector
 * Handles integration with Shopify e-commerce platform
 */

const BaseConnector = require('./base');
const axios = require('axios');

class ShopifyConnector extends BaseConnector {
  constructor(config) {
    super(config);
    this.shopName = config.shopName;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2023-10';
    this.baseUrl = `https://${this.shopName}.myshopify.com/admin/api/${this.apiVersion}`;
    this.id = null; // Connector ID for validation
  }
  
  /**
   * Initialize the connector with credentials
   * @param {object} credentials - The credentials for Shopify API
   * @returns {Promise<object>} Initialization result
   */
  async initialize(credentials) {
    try {
      this.shopName = credentials.shopName;
      this.apiKey = credentials.apiKey;
      this.apiSecret = credentials.apiSecret;
      this.accessToken = credentials.accessToken;
      this.apiVersion = credentials.apiVersion || '2023-10';
      this.baseUrl = `https://${this.shopName}.myshopify.com/admin/api/${this.apiVersion}`;
      
      // Generate a unique ID for this connector instance
      this.id = `shopify_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Authenticate to verify credentials
      const authResult = await this.authenticate();
      
      return {
        id: this.id,
        name: authResult.name || 'Shopify Store',
        platform: 'shopify',
        authenticated: true
      };
    } catch (error) {
      throw new Error(`Failed to initialize Shopify connector: ${error.message}`);
    }
  }

  /**
   * Authenticate with Shopify API
   * @returns {Promise<object>} Shop info if authentication successful
   */
  async authenticate() {
    try {
      await this.applyRateLimit('authenticate');
      this.logApiActivity('authenticate', 'shop', {});
      
      const response = await axios.get(`${this.baseUrl}/shop.json`, {
        headers: this.getHeaders()
      });
      
      this.isAuthenticated = true;
      return response.data.shop;
    } catch (error) {
      this.isAuthenticated = false;
      this.handleApiError(error);
    }
  }

  /**
   * Get headers for Shopify API requests
   * @returns {object} Headers object
   */
  getHeaders() {
    return {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get products from Shopify store
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of products
   */
  async getProducts(options = {}) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getProducts');
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.ids) queryParams.append('ids', options.ids.join(','));
      if (options.since_id) queryParams.append('since_id', options.since_id);
      if (options.collection_id) queryParams.append('collection_id', options.collection_id);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      this.logApiActivity('getProducts', `products.json${queryString}`, {});
      
      const response = await axios.get(`${this.baseUrl}/products.json${queryString}`, {
        headers: this.getHeaders()
      });
      
      return response.data.products;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get a specific product by ID
   * @param {string} productId - The product ID
   * @returns {Promise<object>} Product data
   */
  async getProduct(productId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getProduct');
      
      this.logApiActivity('getProduct', `products/${productId}.json`, {});
      
      const response = await axios.get(`${this.baseUrl}/products/${productId}.json`, {
        headers: this.getHeaders()
      });
      
      return response.data.product;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create a product in Shopify store
   * @param {object} productData - Product data
   * @returns {Promise<object>} Created product data
   */
  async createProduct(productData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createProduct');
      
      this.logApiActivity('createProduct', 'products.json', productData);
      
      const response = await axios.post(
        `${this.baseUrl}/products.json`,
        { product: productData },
        { headers: this.getHeaders() }
      );
      
      return response.data.product;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update a product in Shopify store
   * @param {string} productId - The product ID
   * @param {object} productData - Updated product data
   * @returns {Promise<object>} Updated product data
   */
  async updateProduct(productId, productData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateProduct');
      
      this.logApiActivity('updateProduct', `products/${productId}.json`, productData);
      
      const response = await axios.put(
        `${this.baseUrl}/products/${productId}.json`,
        { product: productData },
        { headers: this.getHeaders() }
      );
      
      return response.data.product;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete a product from Shopify store
   * @param {string} productId - The product ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProduct(productId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteProduct');
      
      this.logApiActivity('deleteProduct', `products/${productId}.json`, {});
      
      await axios.delete(`${this.baseUrl}/products/${productId}.json`, {
        headers: this.getHeaders()
      });
      
      return true;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get orders from Shopify store
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of orders
   */
  async getOrders(options = {}) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getOrders');
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.status) queryParams.append('status', options.status);
      if (options.financial_status) queryParams.append('financial_status', options.financial_status);
      if (options.fulfillment_status) queryParams.append('fulfillment_status', options.fulfillment_status);
      if (options.created_at_min) queryParams.append('created_at_min', options.created_at_min);
      if (options.created_at_max) queryParams.append('created_at_max', options.created_at_max);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      this.logApiActivity('getOrders', `orders.json${queryString}`, {});
      
      const response = await axios.get(`${this.baseUrl}/orders.json${queryString}`, {
        headers: this.getHeaders()
      });
      
      return response.data.orders;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get a specific order by ID
   * @param {string} orderId - The order ID
   * @returns {Promise<object>} Order data
   */
  async getOrder(orderId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getOrder');
      
      this.logApiActivity('getOrder', `orders/${orderId}.json`, {});
      
      const response = await axios.get(`${this.baseUrl}/orders/${orderId}.json`, {
        headers: this.getHeaders()
      });
      
      return response.data.order;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get customers from Shopify store
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of customers
   */
  async getCustomers(options = {}) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getCustomers');
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.since_id) queryParams.append('since_id', options.since_id);
      if (options.created_at_min) queryParams.append('created_at_min', options.created_at_min);
      if (options.created_at_max) queryParams.append('created_at_max', options.created_at_max);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      this.logApiActivity('getCustomers', `customers.json${queryString}`, {});
      
      const response = await axios.get(`${this.baseUrl}/customers.json${queryString}`, {
        headers: this.getHeaders()
      });
      
      return response.data.customers;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get a specific customer by ID
   * @param {string} customerId - The customer ID
   * @returns {Promise<object>} Customer data
   */
  async getCustomer(customerId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getCustomer');
      
      this.logApiActivity('getCustomer', `customers/${customerId}.json`, {});
      
      const response = await axios.get(`${this.baseUrl}/customers/${customerId}.json`, {
        headers: this.getHeaders()
      });
      
      return response.data.customer;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create a customer in Shopify store
   * @param {object} customerData - Customer data
   * @returns {Promise<object>} Created customer data
   */
  async createCustomer(customerData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createCustomer');
      
      this.logApiActivity('createCustomer', 'customers.json', customerData);
      
      const response = await axios.post(
        `${this.baseUrl}/customers.json`,
        { customer: customerData },
        { headers: this.getHeaders() }
      );
      
      return response.data.customer;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get abandoned checkouts from Shopify store
   * @param {object} options - Query options
   * @returns {Promise<Array>} List of abandoned checkouts
   */
  async getAbandonedCheckouts(options = {}) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getAbandonedCheckouts');
      
      const queryParams = new URLSearchParams();
      queryParams.append('status', 'open');
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.since_id) queryParams.append('since_id', options.since_id);
      if (options.created_at_min) queryParams.append('created_at_min', options.created_at_min);
      if (options.created_at_max) queryParams.append('created_at_max', options.created_at_max);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      this.logApiActivity('getAbandonedCheckouts', `checkouts.json${queryString}`, {});
      
      const response = await axios.get(`${this.baseUrl}/checkouts.json${queryString}`, {
        headers: this.getHeaders()
      });
      
      return response.data.checkouts;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Create a webhook subscription
   * @param {object} webhookData - Webhook subscription data
   * @returns {Promise<object>} Created webhook data
   */
  async createWebhook(webhookData) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('createWebhook');
      
      this.logApiActivity('createWebhook', 'webhooks.json', webhookData);
      
      const response = await axios.post(
        `${this.baseUrl}/webhooks.json`,
        { webhook: webhookData },
        { headers: this.getHeaders() }
      );
      
      return response.data.webhook;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Get all webhooks
   * @returns {Promise<Array>} List of webhooks
   */
  async getWebhooks() {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('getWebhooks');
      
      this.logApiActivity('getWebhooks', 'webhooks.json', {});
      
      const response = await axios.get(`${this.baseUrl}/webhooks.json`, {
        headers: this.getHeaders()
      });
      
      return response.data.webhooks;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete a webhook
   * @param {string} webhookId - The webhook ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteWebhook(webhookId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteWebhook');
      
      this.logApiActivity('deleteWebhook', `webhooks/${webhookId}.json`, {});
      
      await axios.delete(`${this.baseUrl}/webhooks/${webhookId}.json`, {
        headers: this.getHeaders()
      });
      
      return true;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Publish content to Shopify platform
   * @param {object} content - The content to publish
   * @returns {Promise<object>} Published content result
   */
  async publishContent(content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('publishContent');
      
      // For Shopify, publishing content means creating a blog post or product
      // We'll implement blog post creation as an example
      
      // First, get the first blog ID
      const blogsResponse = await axios.get(`${this.baseUrl}/blogs.json`, {
        headers: this.getHeaders()
      });
      
      if (!blogsResponse.data.blogs || blogsResponse.data.blogs.length === 0) {
        throw new Error('No blogs found in the Shopify store. Please create a blog first.');
      }
      
      const blogId = blogsResponse.data.blogs[0].id;
      
      // Create the blog article
      const articleData = {
        article: {
          title: content.title || 'New Article',
          author: content.author || 'Content Creator Agent',
          body_html: content.text,
          published: true,
          tags: content.tags ? content.tags.join(', ') : ''
        }
      };
      
      if (content.media && content.media.length > 0 && content.media[0].type === 'image') {
        articleData.article.image = {
          src: content.media[0].url
        };
      }
      
      this.logApiActivity('publishContent', `blogs/${blogId}/articles.json`, articleData);
      
      const response = await axios.post(
        `${this.baseUrl}/blogs/${blogId}/articles.json`,
        articleData,
        { headers: this.getHeaders() }
      );
      
      return {
        id: response.data.article.id.toString(),
        url: `https://${this.shopName}.myshopify.com/blogs/${blogId}/articles/${response.data.article.id}`,
        platform: 'shopify',
        published_at: response.data.article.published_at
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
      
      // Get the first blog ID
      const blogsResponse = await axios.get(`${this.baseUrl}/blogs.json`, {
        headers: this.getHeaders()
      });
      
      if (!blogsResponse.data.blogs || blogsResponse.data.blogs.length === 0) {
        throw new Error('No blogs found in the Shopify store. Please create a blog first.');
      }
      
      const blogId = blogsResponse.data.blogs[0].id;
      
      // Create the blog article with scheduled publish date
      const articleData = {
        article: {
          title: content.title || 'New Article',
          author: content.author || 'Content Creator Agent',
          body_html: content.text,
          published: false,
          published_at: scheduleTime.toISOString(),
          tags: content.tags ? content.tags.join(', ') : ''
        }
      };
      
      if (content.media && content.media.length > 0 && content.media[0].type === 'image') {
        articleData.article.image = {
          src: content.media[0].url
        };
      }
      
      this.logApiActivity('scheduleContent', `blogs/${blogId}/articles.json`, articleData);
      
      const response = await axios.post(
        `${this.baseUrl}/blogs/${blogId}/articles.json`,
        articleData,
        { headers: this.getHeaders() }
      );
      
      return {
        id: response.data.article.id.toString(),
        url: `https://${this.shopName}.myshopify.com/blogs/${blogId}/articles/${response.data.article.id}`,
        platform: 'shopify',
        scheduled_time: scheduleTime.toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Update existing content
   * @param {string} articleId - The ID of the article to update
   * @param {object} content - The updated content
   * @returns {Promise<object>} Updated content result
   */
  async updateContent(articleId, content) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('updateContent');
      
      // First, find which blog the article belongs to
      const blogsResponse = await axios.get(`${this.baseUrl}/blogs.json`, {
        headers: this.getHeaders()
      });
      
      if (!blogsResponse.data.blogs || blogsResponse.data.blogs.length === 0) {
        throw new Error('No blogs found in the Shopify store.');
      }
      
      // Search for the article in each blog
      let blogId = null;
      let articleData = null;
      
      for (const blog of blogsResponse.data.blogs) {
        try {
          const articleResponse = await axios.get(
            `${this.baseUrl}/blogs/${blog.id}/articles/${articleId}.json`,
            { headers: this.getHeaders() }
          );
          
          if (articleResponse.data.article) {
            blogId = blog.id;
            articleData = articleResponse.data.article;
            break;
          }
        } catch (error) {
          // Article not found in this blog, continue to the next one
          continue;
        }
      }
      
      if (!blogId || !articleData) {
        throw new Error(`Article with ID ${articleId} not found.`);
      }
      
      // Update the article
      const updateData = {
        article: {
          id: articleId,
          title: content.title || articleData.title,
          author: content.author || articleData.author,
          body_html: content.text || articleData.body_html,
          tags: content.tags ? content.tags.join(', ') : articleData.tags
        }
      };
      
      if (content.media && content.media.length > 0 && content.media[0].type === 'image') {
        updateData.article.image = {
          src: content.media[0].url
        };
      }
      
      this.logApiActivity('updateContent', `blogs/${blogId}/articles/${articleId}.json`, updateData);
      
      const response = await axios.put(
        `${this.baseUrl}/blogs/${blogId}/articles/${articleId}.json`,
        updateData,
        { headers: this.getHeaders() }
      );
      
      return {
        id: response.data.article.id.toString(),
        url: `https://${this.shopName}.myshopify.com/blogs/${blogId}/articles/${response.data.article.id}`,
        platform: 'shopify',
        updated_at: response.data.article.updated_at
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Delete content from the platform
   * @param {string} articleId - The ID of the article to delete
   * @returns {Promise<object>} Deletion result
   */
  async deleteContent(articleId) {
    this.ensureAuthenticated();
    
    try {
      await this.applyRateLimit('deleteContent');
      
      // First, find which blog the article belongs to
      const blogsResponse = await axios.get(`${this.baseUrl}/blogs.json`, {
        headers: this.getHeaders()
      });
      
      if (!blogsResponse.data.blogs || blogsResponse.data.blogs.length === 0) {
        throw new Error('No blogs found in the Shopify store.');
      }
      
      // Search for the article in each blog
      let blogId = null;
      
      for (const blog of blogsResponse.data.blogs) {
        try {
          const articleResponse = await axios.get(
            `${this.baseUrl}/blogs/${blog.id}/articles/${articleId}.json`,
            { headers: this.getHeaders() }
          );
          
          if (articleResponse.data.article) {
            blogId = blog.id;
            break;
          }
        } catch (error) {
          // Article not found in this blog, continue to the next one
          continue;
        }
      }
      
      if (!blogId) {
        throw new Error(`Article with ID ${articleId} not found.`);
      }
      
      this.logApiActivity('deleteContent', `blogs/${blogId}/articles/${articleId}.json`, {});
      
      await axios.delete(
        `${this.baseUrl}/blogs/${blogId}/articles/${articleId}.json`,
        { headers: this.getHeaders() }
      );
      
      return {
        id: articleId,
        platform: 'shopify',
        deleted: true,
        deleted_at: new Date().toISOString()
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }
}

module.exports = ShopifyConnector;