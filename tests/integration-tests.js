const axios = require('axios');
const { expect } = require('chai');
const winston = require('winston');

// Configure test logger
const testLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'integration-tests' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/tests.log' })
  ],
});

// Test configuration
const config = {
  timeout: 30000,
  baseUrls: {
    apiGateway: 'http://localhost:4000',
    platformConnectors: 'http://localhost:4001',
    frontend: 'http://localhost:3001',
    sav: 'http://localhost:5001',
    publicite: 'http://localhost:5002',
    contenu: 'http://localhost:5003',
    analyse: 'http://localhost:5004',
    pages: 'http://localhost:5005'
  }
};

// Test utilities
class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runTest(testName, testFunction) {
    this.results.total++;
    const startTime = Date.now();
    
    try {
      testLogger.info(`Running test: ${testName}`);
      await testFunction();
      
      const duration = Date.now() - startTime;
      this.results.passed++;
      this.results.details.push({
        name: testName,
        status: 'PASSED',
        duration,
        timestamp: new Date()
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.details.push({
        name: testName,
        status: 'FAILED',
        duration,
        error: error.message,
        timestamp: new Date()
      });
      
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      testLogger.error(`Test failed: ${testName}`, { error: error.message });
    }
  }

  async makeRequest(url, options = {}) {
    const defaultOptions = {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    return await axios({ url, ...defaultOptions, ...options });
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    console.log('='.repeat(50));
    
    if (this.results.failed > 0) {
      console.log('\nFAILED TESTS:');
      this.results.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`- ${test.name}: ${test.error}`);
        });
    }
  }
}

// Health check tests
const healthTests = {
  async testApiGatewayHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.apiGateway}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  },

  async testPlatformConnectorsHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.platformConnectors}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  },

  async testSavAgentHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.sav}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  },

  async testPubliciteAgentHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.publicite}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  },

  async testContenuAgentHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.contenu}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  },

  async testAnalyseAgentHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.analyse}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  },

  async testPagesAgentHealth(runner) {
    const response = await runner.makeRequest(`${config.baseUrls.pages}/health`);
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('status', 'OK');
  }
};

// API functionality tests
const apiTests = {
  async testOAuthEndpoints(runner) {
    const platforms = ['instagram', 'meta', 'shopify'];
    
    for (const platform of platforms) {
      const response = await runner.makeRequest(
        `${config.baseUrls.apiGateway}/api/auth/oauth/${platform}`
      );
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data).to.have.property('authUrl');
    }
  },

  async testPlatformStatus(runner) {
    const response = await runner.makeRequest(
      `${config.baseUrls.apiGateway}/api/platforms/status`
    );
    expect(response.status).to.equal(200);
    expect(response.data).to.be.an('array');
  },

  async testContentGeneration(runner) {
    const testData = {
      type: 'blog_post',
      topic: 'Test Topic',
      keywords: ['test', 'demo'],
      tone: 'professional'
    };
    
    const response = await runner.makeRequest(
      `${config.baseUrls.contenu}/api/content/generate`,
      {
        method: 'POST',
        data: testData
      }
    );
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('content');
  },

  async testProductAnalysis(runner) {
    const testData = {
      product_url: 'https://example.com/product',
      analysis_type: 'basic'
    };
    
    const response = await runner.makeRequest(
      `${config.baseUrls.analyse}/api/analysis/product`,
      {
        method: 'POST',
        data: testData
      }
    );
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('analysis');
  },

  async testCustomerServiceResponse(runner) {
    const testData = {
      message: 'Hello, I need help with my order',
      platform: 'demo',
      context: {
        customer_id: 'test_customer',
        order_id: 'test_order'
      }
    };
    
    const response = await runner.makeRequest(
      `${config.baseUrls.sav}/api/customer-service/respond`,
      {
        method: 'POST',
        data: testData
      }
    );
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('response');
  },

  async testPageGeneration(runner) {
    const testData = {
      type: 'landing_page',
      title: 'Test Landing Page',
      description: 'A test landing page',
      style: 'modern'
    };
    
    const response = await runner.makeRequest(
      `${config.baseUrls.pages}/api/pages/generate`,
      {
        method: 'POST',
        data: testData
      }
    );
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('page_id');
  }
};

// Performance tests
const performanceTests = {
  async testResponseTimes(runner) {
    const endpoints = [
      `${config.baseUrls.apiGateway}/health`,
      `${config.baseUrls.platformConnectors}/health`,
      `${config.baseUrls.apiGateway}/api/platforms/status`
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await runner.makeRequest(endpoint);
      const responseTime = Date.now() - startTime;
      
      expect(response.status).to.equal(200);
      expect(responseTime).to.be.below(5000); // Should respond within 5 seconds
      
      testLogger.info(`Response time for ${endpoint}: ${responseTime}ms`);
    }
  },

  async testConcurrentRequests(runner) {
    const endpoint = `${config.baseUrls.apiGateway}/health`;
    const concurrentRequests = 10;
    
    const promises = Array(concurrentRequests).fill().map(() => 
      runner.makeRequest(endpoint)
    );
    
    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status).to.equal(200);
    });
  }
};

// Main test runner
async function runAllTests() {
  const runner = new TestRunner();
  
  console.log('🚀 Starting CommerceAI Pro Integration Tests\n');
  
  // Health check tests
  console.log('📋 Running Health Check Tests...');
  await runner.runTest('API Gateway Health', () => healthTests.testApiGatewayHealth(runner));
  await runner.runTest('Platform Connectors Health', () => healthTests.testPlatformConnectorsHealth(runner));
  await runner.runTest('SAV Agent Health', () => healthTests.testSavAgentHealth(runner));
  await runner.runTest('Publicité Agent Health', () => healthTests.testPubliciteAgentHealth(runner));
  await runner.runTest('Contenu Agent Health', () => healthTests.testContenuAgentHealth(runner));
  await runner.runTest('Analyse Agent Health', () => healthTests.testAnalyseAgentHealth(runner));
  await runner.runTest('Pages Agent Health', () => healthTests.testPagesAgentHealth(runner));
  
  // API functionality tests
  console.log('\n🔧 Running API Functionality Tests...');
  await runner.runTest('OAuth Endpoints', () => apiTests.testOAuthEndpoints(runner));
  await runner.runTest('Platform Status', () => apiTests.testPlatformStatus(runner));
  await runner.runTest('Content Generation', () => apiTests.testContentGeneration(runner));
  await runner.runTest('Product Analysis', () => apiTests.testProductAnalysis(runner));
  await runner.runTest('Customer Service Response', () => apiTests.testCustomerServiceResponse(runner));
  await runner.runTest('Page Generation', () => apiTests.testPageGeneration(runner));
  
  // Performance tests
  console.log('\n⚡ Running Performance Tests...');
  await runner.runTest('Response Times', () => performanceTests.testResponseTimes(runner));
  await runner.runTest('Concurrent Requests', () => performanceTests.testConcurrentRequests(runner));
  
  runner.printSummary();
  
  // Save results to file
  const fs = require('fs');
  fs.writeFileSync(
    'test-results.json',
    JSON.stringify(runner.results, null, 2)
  );
  
  return runner.results;
}

// Export for use in other modules
module.exports = {
  TestRunner,
  runAllTests,
  healthTests,
  apiTests,
  performanceTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}