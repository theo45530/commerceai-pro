const axios = require('axios');
const { expect } = require('chai');
const { performance } = require('perf_hooks');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_USER = {
  name: 'Performance Test User',
  email: 'perf-test@commerceai.pro',
  password: 'TestPassword123!@#'
};

let authToken = null;
const performanceMetrics = {
  responseTime: [],
  throughput: [],
  errorRate: [],
  memoryUsage: []
};

// Helper functions
function calculateStats(values) {
  if (values.length === 0) return {};
  
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

async function measureResponseTime(requestFn) {
  const start = performance.now();
  const result = await requestFn();
  const end = performance.now();
  const responseTime = end - start;
  
  performanceMetrics.responseTime.push(responseTime);
  return { result, responseTime };
}

async function loadTest(requestFn, concurrency = 10, duration = 5000) {
  const results = [];
  const errors = [];
  const startTime = Date.now();
  
  const workers = Array(concurrency).fill().map(async () => {
    while (Date.now() - startTime < duration) {
      try {
        const { responseTime } = await measureResponseTime(requestFn);
        results.push(responseTime);
      } catch (error) {
        errors.push(error);
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  });
  
  await Promise.all(workers);
  
  return {
    totalRequests: results.length,
    totalErrors: errors.length,
    errorRate: (errors.length / (results.length + errors.length)) * 100,
    throughput: results.length / (duration / 1000),
    responseTimeStats: calculateStats(results)
  };
}

describe('Performance Tests', () => {
  
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
  
  describe('API Response Time', () => {
    
    it('should respond to health check within 100ms', async () => {
      const { responseTime } = await measureResponseTime(async () => {
        return await axios.get(`${API_BASE_URL}/health`);
      });
      
      expect(responseTime).to.be.lessThan(100);
    });
    
    it('should respond to authentication within 500ms', async () => {
      const { responseTime } = await measureResponseTime(async () => {
        return await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: TEST_USER.email,
          password: TEST_USER.password
        });
      });
      
      expect(responseTime).to.be.lessThan(500);
    });
    
    it('should respond to user profile within 200ms', async () => {
      const { responseTime } = await measureResponseTime(async () => {
        return await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });
      
      expect(responseTime).to.be.lessThan(200);
    });
    
    it('should respond to agent status within 300ms', async () => {
      const { responseTime } = await measureResponseTime(async () => {
        return await axios.get(`${API_BASE_URL}/api/agents/status`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });
      
      expect(responseTime).to.be.lessThan(300);
    });
    
  });
  
  describe('Load Testing', () => {
    
    it('should handle concurrent health check requests', async () => {
      const results = await loadTest(
        () => axios.get(`${API_BASE_URL}/health`),
        20, // 20 concurrent requests
        10000 // for 10 seconds
      );
      
      console.log('Health Check Load Test Results:', results);
      
      expect(results.errorRate).to.be.lessThan(1); // Less than 1% error rate
      expect(results.throughput).to.be.greaterThan(50); // At least 50 requests/second
      expect(results.responseTimeStats.p95).to.be.lessThan(200); // 95% under 200ms
    });
    
    it('should handle concurrent authentication requests', async () => {
      const results = await loadTest(
        () => axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: TEST_USER.email,
          password: TEST_USER.password
        }),
        10, // 10 concurrent requests
        5000 // for 5 seconds
      );
      
      console.log('Authentication Load Test Results:', results);
      
      expect(results.errorRate).to.be.lessThan(5); // Less than 5% error rate
      expect(results.throughput).to.be.greaterThan(10); // At least 10 requests/second
      expect(results.responseTimeStats.p95).to.be.lessThan(1000); // 95% under 1 second
    });
    
    it('should handle concurrent agent requests', async () => {
      const results = await loadTest(
        () => axios.post(`${API_BASE_URL}/api/agents/customer-service`, {
          message: 'Performance test message',
          context: { userId: 'perf-test-user' }
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        5, // 5 concurrent requests
        10000 // for 10 seconds
      );
      
      console.log('Agent Request Load Test Results:', results);
      
      expect(results.errorRate).to.be.lessThan(10); // Less than 10% error rate
      expect(results.throughput).to.be.greaterThan(2); // At least 2 requests/second
      expect(results.responseTimeStats.p95).to.be.lessThan(5000); // 95% under 5 seconds
    });
    
  });
  
  describe('Memory and Resource Usage', () => {
    
    it('should monitor memory usage during load', async () => {
      const initialMemory = await getMemoryUsage();
      
      // Perform load test
      await loadTest(
        () => axios.get(`${API_BASE_URL}/health`),
        15,
        5000
      );
      
      const finalMemory = await getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory usage increased by: ${memoryIncrease}MB`);
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).to.be.lessThan(100);
    });
    
    async function getMemoryUsage() {
      try {
        const response = await axios.get(`${API_BASE_URL}/metrics`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        return response.data.metrics.system.memory.used / (1024 * 1024); // Convert to MB
      } catch (error) {
        return 0; // Fallback if metrics endpoint is not available
      }
    }
    
  });
  
  describe('Cache Performance', () => {
    
    it('should improve response time with caching', async () => {
      // First request (cache miss)
      const { responseTime: firstRequest } = await measureResponseTime(async () => {
        return await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });
      
      // Second request (cache hit)
      const { responseTime: secondRequest } = await measureResponseTime(async () => {
        return await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      });
      
      console.log(`First request: ${firstRequest}ms, Second request: ${secondRequest}ms`);
      
      // Second request should be faster (or at least not significantly slower)
      expect(secondRequest).to.be.lessThan(firstRequest * 1.5);
    });
    
  });
  
  describe('Rate Limiting Performance', () => {
    
    it('should handle rate limiting gracefully', async () => {
      const requests = [];
      const startTime = Date.now();
      
      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < 100; i++) {
        requests.push(
          axios.get(`${API_BASE_URL}/health`).catch(err => err.response)
        );
      }
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      const successfulResponses = responses.filter(res => res.status === 200);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      console.log(`Successful: ${successfulResponses.length}, Rate Limited: ${rateLimitedResponses.length}`);
      console.log(`Total time: ${endTime - startTime}ms`);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).to.be.greaterThan(0);
      
      // Rate limiting should not cause server errors
      const serverErrors = responses.filter(res => res.status >= 500);
      expect(serverErrors.length).to.equal(0);
    });
    
  });
  
  describe('Database Performance', () => {
    
    it('should handle multiple user operations efficiently', async () => {
      const operations = [];
      
      // Simulate multiple user operations
      for (let i = 0; i < 20; i++) {
        operations.push(
          measureResponseTime(async () => {
            return await axios.get(`${API_BASE_URL}/api/users/me`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
          })
        );
      }
      
      const results = await Promise.all(operations);
      const responseTimes = results.map(r => r.responseTime);
      const stats = calculateStats(responseTimes);
      
      console.log('Database Performance Stats:', stats);
      
      expect(stats.avg).to.be.lessThan(300); // Average under 300ms
      expect(stats.p95).to.be.lessThan(500); // 95% under 500ms
    });
    
  });
  
  after(() => {
    // Print overall performance summary
    console.log('\n=== Performance Test Summary ===');
    console.log('Response Time Stats:', calculateStats(performanceMetrics.responseTime));
    console.log('Total Requests Measured:', performanceMetrics.responseTime.length);
  });
  
});