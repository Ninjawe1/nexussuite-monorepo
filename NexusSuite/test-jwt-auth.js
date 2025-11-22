import jwt from 'jsonwebtoken'
import { generateUserToken, verifyUserToken } from './server/auth.ts'

// Test JWT token generation and verification
console.log('Testing JWT Authentication System...');

// Mock user data
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  organizations: [
    { orgId: 'org-123', role: 'admin' },
    { orgId: 'org-456', role: 'marcom' }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

// Set JWT secret for testing
process.env.JWT_SECRET = 'test-secret-key';

try {
  // Test token generation
  console.log('1. Testing token generation...');
  const token = generateUserToken(mockUser);
  console.log('✓ Token generated successfully:', token.substring(0, 50) + '...');
  
  // Test token verification
  console.log('2. Testing token verification...');
  const decoded = verifyUserToken(token);
  console.log('✓ Token verified successfully');
  console.log('  - User ID:', decoded.userId);
  console.log('  - Email:', decoded.email);
  console.log('  - Organizations:', decoded.organizations);
  
  // Test token expiration
  console.log('3. Testing token expiration...');
  const expiredToken = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET, { 
    expiresIn: '-1h',
    issuer: 'nexussuite'
  });
  
  try {
    verifyUserToken(expiredToken);
    console.log('✗ Should have thrown error for expired token');
  } catch (error) {
    console.log('✓ Correctly rejected expired token');
  }
  
  // Test invalid token
  console.log('4. Testing invalid token...');
  try {
    verifyUserToken('invalid-token');
    console.log('✗ Should have thrown error for invalid token');
  } catch (error) {
    console.log('✓ Correctly rejected invalid token');
  }
  
  console.log('\n✅ All JWT authentication tests passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}