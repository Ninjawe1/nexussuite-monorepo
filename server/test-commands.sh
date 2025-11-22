#!/bin/bash

# Better Auth with Firestore - Test Commands
# This script provides curl commands to test all authentication endpoints

BASE_URL="http://localhost:3001/api/betauth"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Better Auth with Firestore - Test Commands${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

# Function to print test command
print_test() {
    echo -e "${GREEN}🔍 $1${NC}"
    echo -e "${YELLOW}$2${NC}"
    echo ""
}

# 1. Health Check
print_test "Health Check" "curl -X GET $BASE_URL/health"

# 2. Register New User with New Organization
print_test "Register New User + Create Organization" "curl -X POST $BASE_URL/register \\
  -H 'Content-Type: application/json' \\
  -d '{
    \"email\": \"admin@example.com\",
    \"password\": \"SecurePass123!\",
    \"orgName\": \"Acme Corp\"
  }'"

# 3. Register New User to Existing Organization
print_test "Register User to Existing Org" "curl -X POST $BASE_URL/register \\
  -H 'Content-Type: application/json' \\
  -d '{
    \"email\": \"member@example.com\",
    \"password\": \"SecurePass123!\",
    \"orgId\": \"your-existing-org-id\"
  }'"

# 4. Login User
print_test "Login User" "curl -X POST $BASE_URL/login \\
  -H 'Content-Type: application/json' \\
  -d '{
    \"email\": \"admin@example.com\",
    \"password\": \"SecurePass123!\"
  }'"

# 5. Get Current User (requires auth token)
print_test "Get Current User" "curl -X GET $BASE_URL/me \\
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN'"

# 6. Get Current User with Cookie
print_test "Get Current User (Cookie)" "curl -X GET $BASE_URL/me \\
  -H 'Cookie: authToken=YOUR_AUTH_TOKEN'"

# 7. Create Organization (Admin Only)
print_test "Create Organization (Admin)" "curl -X POST $BASE_URL/org \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ADMIN_AUTH_TOKEN' \\
  -d '{
    \"name\": \"New Organization\"
  }'"

# 8. Logout User
print_test "Logout User" "curl -X POST $BASE_URL/logout \\
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN'"

# 9. Better Auth Built-in Endpoints
print_test "Better Auth - Get Session" "curl -X GET $BASE_URL/session"

print_test "Better Auth - Get Providers" "curl -X GET $BASE_URL/providers"

# 10. OAuth Examples (if configured)
if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
    print_test "Google OAuth Login" "curl -X GET $BASE_URL/signin/google"
fi

if [ ! -z "$DISCORD_CLIENT_ID" ]; then
    print_test "Discord OAuth Login" "curl -X GET $BASE_URL/signin/discord"
fi

echo -e "${YELLOW}📋 Test Data Examples${NC}"
echo "========================"
echo ""
echo "Valid Email Formats:"
echo "  - admin@example.com"
echo "  - user@company.com"
echo "  - member@org.com"
echo ""
echo "Valid Password Requirements:"
echo "  - Minimum 8 characters"
echo "  - At least one uppercase letter"
echo "  - At least one lowercase letter"
echo "  - At least one number"
echo "  - Example: SecurePass123!"
echo ""
echo "Organization Names:"
echo "  - Acme Corporation"
echo "  - Tech Solutions Inc"
echo "  - Global Services Ltd"
echo ""

echo -e "${YELLOW}🔄 Complete Test Flow${NC}"
echo "========================="
echo ""
echo "1. Register first user (creates organization):"
echo "   curl -X POST $BASE_URL/register -H 'Content-Type: application/json' -d '{\"email\": \"admin@test.com\", \"password\": \"TestPass123!\", \"orgName\": \"Test Corp\"}'"
echo ""
echo "2. Login to get auth token:"
echo "   curl -X POST $BASE_URL/login -H 'Content-Type: application/json' -d '{\"email\": \"admin@test.com\", \"password\": \"TestPass123!\"}'"
echo ""
echo "3. Use token in subsequent requests:"
echo "   curl -X GET $BASE_URL/me -H 'Authorization: Bearer YOUR_TOKEN_HERE'"
echo ""
echo "4. Register additional users to existing org:"
echo "   curl -X POST $BASE_URL/register -H 'Content-Type: application/json' -d '{\"email\": \"member@test.com\", \"password\": \"TestPass123!\", \"orgId\": \"YOUR_ORG_ID\"}'"
echo ""

echo -e "${YELLOW}⚠️  Important Notes${NC}"
echo "===================="
echo ""
echo "• Replace YOUR_AUTH_TOKEN with actual token from login/register response"
echo "• Replace YOUR_ORG_ID with actual organization ID from user data"
echo "• Admin users can create organizations and manage users"
echo "• Members have read/write access within their organization"
echo "• Viewers have read-only access within their organization"
echo "• All endpoints support both Bearer token and cookie authentication"
echo "• Better Auth handles password hashing internally"
echo "• JWT tokens are automatically managed by Better Auth"
echo ""
echo -e "${GREEN}✅ Ready to test!${NC}"
echo "Start your server with: npm run dev"
echo "Then run these curl commands to test the authentication system."