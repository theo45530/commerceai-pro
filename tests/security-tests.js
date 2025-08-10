const axios = require('axios');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_USER = {
  name: 'Test User',
  email: 'test@commerceai.pro',
  password: 'TestPassword123!@#'
};

let authToken = null;
let testUserId = null;

describe('Security Tests', () => {
  
  describe('Authentication & Authorization', () => {
    
    it('should reject requests without authentication token', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/users/me`);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(401);
        expect(error.response.data.error).to.include('token');
      }
    });
    
    it('should validate password strength during registration', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          name: 'Test User',
          email: 'weak@test.com',
          password: '123' // Weak password
        });
        expect.fail('Should have rejected weak password');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.include('Validation failed');
      }
    });
    
    it('should register user with strong password', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, TEST_USER);
      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data.token).to.exist;
      
      authToken = response.data.data.token;
      testUserId = response.data.data.user.id;
    });
    
    it('should login with valid credentials', async () => {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.token).to.exist;
    });
    
    it('should reject login with invalid credentials', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: TEST_USER.email,
          password: 'wrongpassword'
        });
        expect.fail('Should have rejected invalid credentials');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });
    
    it('should validate JWT token structure', () => {
      const decoded = jwt.decode(authToken);
      expect(decoded).to.have.property('id');
      expect(decoded).to.have.property('email');
      expect(decoded).to.have.property('iat');
      expect(decoded).to.have.property('exp');
    });
    
  });
  
  describe('Rate Limiting', () => {
    
    it('should enforce rate limits on auth endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.post(`${API_BASE_URL}/api/auth/login`, {
            email: 'nonexistent@test.com',
            password: 'wrongpassword'
          }).catch(err => err.response)
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
    });
    
  });
  
  describe('Input Validation & Sanitization', () => {
    
    it('should sanitize XSS attempts', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          name: '<script>alert("xss")</script>',
          email: 'xss@test.com',
          password: 'ValidPassword123!'
        });
        expect.fail('Should have sanitized XSS input');
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });
    
    it('should validate email format', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          name: 'Test User',
          email: 'invalid-email',
          password: 'ValidPassword123!'
        });
        expect.fail('Should have rejected invalid email');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.include('Validation failed');
      }
    });
    
    it('should validate required fields', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          email: 'test@example.com'
          // Missing name and password
        });
        expect.fail('Should have rejected missing fields');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.include('Validation failed');
      }
    });
    
  });
  
  describe('Security Headers', () => {
    
    it('should include security headers', async () => {
      const response = await axios.get(`${API_BASE_URL}/health`);
      
      expect(response.headers).to.have.property('x-content-type-options');
      expect(response.headers).to.have.property('x-frame-options');
      expect(response.headers).to.have.property('x-xss-protection');
      expect(response.headers).to.have.property('strict-transport-security');
    });
    
  });
  
  describe('Agent Security', () => {
    
    it('should require authentication for agent requests', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
          message: 'Test message'
        });
        expect.fail('Should have required authentication');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });
    
    it('should validate agent request payload', async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
          // Missing required message field
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        expect.fail('Should have validated payload');
      } catch (error) {
        expect(error.response.status).to.equal(400);
      }
    });
    
    it('should enforce rate limits on agent requests', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 70; i++) {
        requests.push(
          axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
            message: `Test message ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).catch(err => err.response)
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
    });
    
  });
  
  describe('Cache Security', () => {
    
    it('should not cache sensitive data', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      // Check that sensitive endpoints don't have cache headers
      expect(response.headers['x-cache']).to.not.equal('HIT');
    });
    
  });
  
  describe('Error Handling', () => {
    
    it('should not leak sensitive information in errors', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/nonexistent-endpoint`);
        expect.fail('Should have returned 404');
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.error).to.not.include('stack');
        expect(error.response.data.error).to.not.include('password');
        expect(error.response.data.error).to.not.include('secret');
      }
    });
    
  });
  
  describe('Monitoring & Logging', () => {
    
    it('should provide health check endpoint', async () => {
      const response = await axios.get(`${API_BASE_URL}/health`);
      expect(response.status).to.equal(200);
      expect(response.data.status).to.exist;
      expect(response.data.timestamp).to.exist;
    });
    
    it('should provide metrics endpoint for authenticated users', async () => {
      const response = await axios.get(`${API_BASE_URL}/metrics`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).to.equal(200);
      expect(response.data.metrics).to.exist;
    });
    
    it('should deny metrics access to unauthenticated users', async () => {
      try {
        await axios.get(`${API_BASE_URL}/metrics`);
        expect.fail('Should have required authentication');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });
    
  });
  
});

// Cleanup after tests
after(async () => {
  // Clean up test data if needed
  console.log('Security tests completed');
});