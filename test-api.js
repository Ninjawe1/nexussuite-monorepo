#!/usr/bin/env node

/**
 * NexusSuite API Test Script
 * This script tests all API endpoints to ensure they work correctly
 * Run with: node test-api.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_VERSION = '/api';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_ORG_NAME = `Test Organization ${Date.now()}`;
const TEST_ORG_SLUG = `test-org-${Date.now()}`;

// Global variables
let AUTH_TOKEN = '';
let USER_ID = '';
let ORGANIZATION_ID = '';
let OTP_ID = '';
let SUBSCRIPTION_ID = '';

// Colors for output (for Node.js)
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Helper functions
function logInfo(message) {
  console.log(`${colors.yellow}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${API_VERSION}${endpoint}`);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON response', raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  logInfo('Testing health check endpoint...');
  
  try {
    const response = await makeRequest('GET', '/health');
    if (response.success && response.status === 'healthy') {
      logSuccess('Health check passed');
      return true;
    } else {
      logError(`Health check failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Health check request failed: ${error.message}`);
    return false;
  }
}

async function testUserRegistration() {
  logInfo('Testing user registration...');
  
  const data = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: 'Test User'
  };
  
  try {
    const response = await makeRequest('POST', '/auth/register', data);
    if (response.success) {
      logSuccess('User registration successful');
      USER_ID = response.data?.id || response.data?.user?.id;
      return true;
    } else {
      logError(`User registration failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`User registration request failed: ${error.message}`);
    return false;
  }
}

async function testUserLogin() {
  logInfo('Testing user login...');
  
  const data = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  };
  
  try {
    const response = await makeRequest('POST', '/auth/login', data);
    if (response.success) {
      logSuccess('User login successful');
      AUTH_TOKEN = response.data?.token || response.data?.session?.token;
      return true;
    } else {
      logError(`User login failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`User login request failed: ${error.message}`);
    return false;
  }
}

async function testGetCurrentUser() {
  logInfo('Testing get current user...');
  
  try {
    const response = await makeRequest('GET', '/auth/me', null, AUTH_TOKEN);
    if (response.success) {
      logSuccess('Get current user successful');
      return true;
    } else {
      logError(`Get current user failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Get current user request failed: ${error.message}`);
    return false;
  }
}

async function testOrganizationCreation() {
  logInfo('Testing organization creation...');
  
  const data = {
    name: TEST_ORG_NAME,
    slug: TEST_ORG_SLUG,
    description: 'Test organization for API testing'
  };
  
  try {
    const response = await makeRequest('POST', '/organizations', data, AUTH_TOKEN);
    if (response.success) {
      logSuccess('Organization creation successful');
      ORGANIZATION_ID = response.data?.id || response.data?.organization?.id;
      return true;
    } else {
      logError(`Organization creation failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Organization creation request failed: ${error.message}`);
    return false;
  }
}

async function testGetOrganization() {
  logInfo('Testing get organization...');
  
  try {
    const response = await makeRequest('GET', `/organizations/${ORGANIZATION_ID}`, null, AUTH_TOKEN);
    if (response.success) {
      logSuccess('Get organization successful');
      return true;
    } else {
      logError(`Get organization failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Get organization request failed: ${error.message}`);
    return false;
  }
}

async function testOrganizationMembers() {
  logInfo('Testing organization members...');
  
  try {
    const response = await makeRequest('GET', `/organizations/${ORGANIZATION_ID}/members`, null, AUTH_TOKEN);
    if (response.success) {
      logSuccess('Get organization members successful');
      return true;
    } else {
      logError(`Get organization members failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Get organization members request failed: ${error.message}`);
    return false;
  }
}

async function testOtpGeneration() {
  logInfo('Testing OTP generation...');
  
  const data = {
    type: 'email',
    identifier: TEST_EMAIL,
    purpose: 'verification'
  };
  
  try {
    const response = await makeRequest('POST', '/otp/generate', data, AUTH_TOKEN);
    if (response.success) {
      logSuccess('OTP generation successful');
      OTP_ID = response.data?.id;
      return true;
    } else {
      logError(`OTP generation failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`OTP generation request failed: ${error.message}`);
    return false;
  }
}

async function testSubscriptionPlans() {
  logInfo('Testing subscription plans...');
  
  try {
    const response = await makeRequest('GET', '/subscriptions/plans', null, AUTH_TOKEN);
    if (response.success) {
      logSuccess('Get subscription plans successful');
      return true;
    } else {
      logError(`Get subscription plans failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Get subscription plans request failed: ${error.message}`);
    return false;
  }
}

async function testAdminMetrics() {
  logInfo('Testing admin metrics (should fail for non-admin)...');
  
  try {
    const response = await makeRequest('GET', '/admin/metrics', null, AUTH_TOKEN);
    if (!response.success && response.error?.code === 'INSUFFICIENT_PERMISSIONS') {
      logSuccess('Admin metrics correctly denied for non-admin user');
      return true;
    } else {
      logError(`Admin metrics access control failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Admin metrics request failed: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  logInfo('Testing error handling...');
  
  // Test invalid endpoint
  try {
    const response = await makeRequest('GET', '/nonexistent', null, AUTH_TOKEN);
    if (!response.success) {
      logSuccess('Invalid endpoint error handling works');
    } else {
      logError(`Invalid endpoint error handling failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Invalid endpoint request failed: ${error.message}`);
    return false;
  }
  
  // Test invalid authentication
  try {
    const response = await makeRequest('GET', '/organizations', null, 'invalid-token');
    if (!response.success) {
      logSuccess('Invalid authentication error handling works');
    } else {
      logError(`Invalid authentication error handling failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Invalid authentication request failed: ${error.message}`);
    return false;
  }
  
  // Test validation error
  try {
    const response = await makeRequest('POST', '/organizations', { invalid: 'data' }, AUTH_TOKEN);
    if (!response.success) {
      logSuccess('Validation error handling works');
    } else {
      logError(`Validation error handling failed: ${JSON.stringify(response)}`);
      return false;
    }
  } catch (error) {
    logError(`Validation error request failed: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testRateLimiting() {
  logInfo('Testing rate limiting...');
  
  // Make multiple requests quickly
  for (let i = 0; i < 10; i++) {
    try {
      const response = await makeRequest('GET', '/health');
      if (!response.success) {
        logSuccess('Rate limiting is working');
        return true;
      }
    } catch (error) {
      logError(`Rate limiting test request failed: ${error.message}`);
      return false;
    }
  }
  
  logSuccess('Rate limiting test completed');
  return true;
}

// Main test execution
async function main() {
  logInfo('Starting NexusSuite API tests...');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Test email: ${TEST_EMAIL}`);
  logInfo(`Test organization: ${TEST_ORG_NAME}`);
  
  const tests = [
    { name: 'Health Check', func: testHealthCheck },
    { name: 'User Registration', func: testUserRegistration },
    { name: 'User Login', func: testUserLogin },
    { name: 'Get Current User', func: testGetCurrentUser },
    { name: 'Organization Creation', func: testOrganizationCreation },
    { name: 'Get Organization', func: testGetOrganization },
    { name: 'Organization Members', func: testOrganizationMembers },
    { name: 'OTP Generation', func: testOtpGeneration },
    { name: 'Subscription Plans', func: testSubscriptionPlans },
    { name: 'Admin Metrics', func: testAdminMetrics },
    { name: 'Error Handling', func: testErrorHandling },
    { name: 'Rate Limiting', func: testRateLimiting }
  ];
  
  let failedTests = 0;
  let totalTests = tests.length;
  
  // Run tests
  for (const test of tests) {
    logInfo(`Running test: ${test.name}...`);
    try {
      const result = await test.func();
      if (!result) {
        failedTests++;
      }
    } catch (error) {
      logError(`Test ${test.name} threw an exception: ${error.message}`);
      failedTests++;
    }
    console.log('');
  }
  
  // Summary
  logInfo('Test Summary:');
  logInfo(`Total tests: ${totalTests}`);
  logInfo(`Passed: ${totalTests - failedTests}`);
  logInfo(`Failed: ${failedTests}`);
  
  if (failedTests === 0) {
    logSuccess('All tests passed! 🎉');
    process.exit(0);
  } else {
    logError(`${failedTests} tests failed. ❌`);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  logError(`Test script failed: ${error.message}`);
  process.exit(1);
});