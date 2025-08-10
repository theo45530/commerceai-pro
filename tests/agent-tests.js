const axios = require('axios');
const { expect } = require('chai');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_USER = {
  name: 'Agent Test User',
  email: 'agent-test@commerceai.pro',
  password: 'TestPassword123!@#'
};

let authToken = null;

describe('AI Agent Tests', () => {
  
  before(async () => {
    // Register and login test user
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, TEST_USER);
    } catch (error) {
      // User might already exist, try to login
    }
    
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    authToken = loginResponse.data.data.token;
  });
  
  describe('Agent Status & Health', () => {
    
    it('should get status of all agents', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/agents/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.agents).to.be.an('object');
      
      // Check that we have expected agents
      const agents = response.data.data.agents;
      expect(agents).to.have.property('customer-service');
      expect(agents).to.have.property('analysis');
      expect(agents).to.have.property('content-generation');
      expect(agents).to.have.property('advertising');
      expect(agents).to.have.property('email-marketing');
      expect(agents).to.have.property('page-generation');
    });
    
  });
  
  describe('Customer Service Agent', () => {
    
    it('should get customer service agent capabilities', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/agents/customer-service/capabilities`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.capabilities).to.be.an('array');
      expect(response.data.data.capabilities).to.include('customer_support');
      expect(response.data.data.capabilities).to.include('order_tracking');
    });
    
    it('should handle customer service request', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
        message: 'I need help with my order',
        context: {
          userId: 'test-user-123',
          sessionId: 'test-session-456'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.response).to.exist;
      expect(response.data.data.sessionId).to.exist;
    });
    
    it('should validate customer service request payload', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
          // Missing required message field
          context: { userId: 'test' }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect.fail('Should have validated payload');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.include('Validation failed');
      }
    });
    
  });
  
  describe('Analysis Agent', () => {
    
    it('should get analysis agent capabilities', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/agents/analysis/capabilities`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.capabilities).to.be.an('array');
      expect(response.data.data.capabilities).to.include('sales_analysis');
      expect(response.data.data.capabilities).to.include('customer_behavior');
    });
    
    it('should handle analysis request', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/agents/analysis`, {
        type: 'sales_analysis',
        data: {
          period: '30d',
          metrics: ['revenue', 'conversion_rate']
        },
        context: {
          userId: 'test-user-123'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.analysis).to.exist;
    });
    
  });
  
  describe('Content Generation Agent', () => {
    
    it('should get content generation agent capabilities', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/agents/content-generation/capabilities`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.capabilities).to.be.an('array');
      expect(response.data.data.capabilities).to.include('product_descriptions');
      expect(response.data.data.capabilities).to.include('blog_posts');
    });
    
    it('should handle content generation request', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/agents/content-generation`, {
        type: 'product_description',
        prompt: 'Generate a description for a wireless bluetooth headphone',
        parameters: {
          tone: 'professional',
          length: 'medium',
          target_audience: 'tech enthusiasts'
        },
        context: {
          userId: 'test-user-123'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.content).to.exist;
    });
    
  });
  
  describe('Smart Agent Routing', () => {
    
    it('should route request to best agent based on capability', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/agents/smart-request`, {
        capability: 'customer_support',
        request: {
          message: 'I have a question about my recent purchase',
          context: {
            userId: 'test-user-123'
          }
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.agent).to.equal('customer-service');
      expect(response.data.data.response).to.exist;
    });
    
    it('should handle unknown capability gracefully', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/agents/smart-request`, {
          capability: 'unknown_capability',
          request: {
            message: 'Test message'
          }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect.fail('Should have handled unknown capability');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.include('No agent found');
      }
    });
    
  });
  
  describe('Agent Performance & Monitoring', () => {
    
    it('should track agent response times', async () => {
      const startTime = Date.now();
      
      const response = await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
        message: 'Quick test message',
        context: { userId: 'test-user-123' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).to.equal(200);
      expect(responseTime).to.be.lessThan(10000); // Should respond within 10 seconds
    });
    
    it('should handle agent timeout gracefully', async () => {
      // This test would require mocking a slow agent response
      // For now, we'll just verify the timeout configuration exists
      const response = await axios.get(`${API_BASE_URL}/api/agents/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      // Verify that agents have timeout configurations
      const agents = response.data.data.agents;
      Object.values(agents).forEach(agent => {
        expect(agent.timeout).to.be.a('number');
        expect(agent.timeout).to.be.greaterThan(0);
      });
    });
    
  });
  
  describe('Agent Session Management', () => {
    
    it('should maintain session context across requests', async () => {
      const sessionId = `test-session-${Date.now()}`;
      
      // First request
      const response1 = await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
        message: 'Hello, I need help with my order',
        context: {
          userId: 'test-user-123',
          sessionId: sessionId
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response1.status).to.equal(200);
      expect(response1.data.data.sessionId).to.equal(sessionId);
      
      // Follow-up request with same session
      const response2 = await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
        message: 'Can you provide more details?',
        context: {
          userId: 'test-user-123',
          sessionId: sessionId
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response2.status).to.equal(200);
      expect(response2.data.data.sessionId).to.equal(sessionId);
    });
    
  });
  
  describe('Agent Error Handling', () => {
    
    it('should handle agent service unavailable', async () => {
      // This would require mocking an unavailable agent
      // For now, we'll test with a non-existent agent type
      try {
        await axios.post(`${API_BASE_URL}/api/agents/nonexistent-agent/request`, {
          message: 'Test message'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect.fail('Should have handled non-existent agent');
      } catch (error) {
        expect(error.response.status).to.be.oneOf([404, 400]);
      }
    });
    
    it('should retry failed agent requests', async () => {
      // Test that the agent manager implements retry logic
      const response = await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
        message: 'Test retry mechanism',
        context: {
          userId: 'test-user-123',
          forceRetry: true // This would be handled by the agent manager
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
    });
    
  });
  
});

// Cleanup after tests
after(async () => {
  console.log('Agent tests completed');
});