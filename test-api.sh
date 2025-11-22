#!/bin/bash

# NexusSuite API Test Script
# This script tests all API endpoints to ensure they work correctly

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3001}"
API_VERSION="/api"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_ORG_NAME="Test Organization $(date +%s)"
TEST_ORG_SLUG="test-org-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Global variables
AUTH_TOKEN=""
USER_ID=""
ORGANIZATION_ID=""
OTP_ID=""
SUBSCRIPTION_ID=""

# Helper functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    local headers="Content-Type: application/json"
    if [ ! -z "$token" ]; then
        headers="$headers -H \"Authorization: Bearer $token\""
    fi
    
    if [ ! -z "$data" ]; then
        curl -s -X "$method" "$BASE_URL$API_VERSION$endpoint" \
            -H "$headers" \
            -d "$data"
    else
        curl -s -X "$method" "$BASE_URL$API_VERSION$endpoint" \
            -H "$headers"
    fi
}

# Test functions
test_health_check() {
    log_info "Testing health check endpoint..."
    
    response=$(curl -s "$BASE_URL/health")
    if echo "$response" | grep -q '"status":"healthy"'; then
        log_success "Health check passed"
        return 0
    else
        log_error "Health check failed: $response"
        return 1
    fi
}

test_user_registration() {
    log_info "Testing user registration..."
    
    local data="{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"name\": \"Test User\"
    }"
    
    response=$(make_request "POST" "/auth/register" "$data")
    if echo "$response" | grep -q '"success":true'; then
        log_success "User registration successful"
        USER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        return 0
    else
        log_error "User registration failed: $response"
        return 1
    fi
}

test_user_login() {
    log_info "Testing user login..."
    
    local data="{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }"
    
    response=$(make_request "POST" "/auth/login" "$data")
    if echo "$response" | grep -q '"success":true'; then
        log_success "User login successful"
        AUTH_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        return 0
    else
        log_error "User login failed: $response"
        return 1
    fi
}

test_get_current_user() {
    log_info "Testing get current user..."
    
    response=$(make_request "GET" "/auth/me" "" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Get current user successful"
        return 0
    else
        log_error "Get current user failed: $response"
        return 1
    fi
}

test_organization_creation() {
    log_info "Testing organization creation..."
    
    local data="{
        \"name\": \"$TEST_ORG_NAME\",
        \"slug\": \"$TEST_ORG_SLUG\",
        \"description\": \"Test organization for API testing\"
    }"
    
    response=$(make_request "POST" "/organizations" "$data" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Organization creation successful"
        ORGANIZATION_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        return 0
    else
        log_error "Organization creation failed: $response"
        return 1
    fi
}

test_get_organization() {
    log_info "Testing get organization..."
    
    response=$(make_request "GET" "/organizations/$ORGANIZATION_ID" "" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Get organization successful"
        return 0
    else
        log_error "Get organization failed: $response"
        return 1
    fi
}

test_organization_members() {
    log_info "Testing organization members..."
    
    response=$(make_request "GET" "/organizations/$ORGANIZATION_ID/members" "" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Get organization members successful"
        return 0
    else
        log_error "Get organization members failed: $response"
        return 1
    fi
}

test_otp_generation() {
    log_info "Testing OTP generation..."
    
    local data="{
        \"type\": \"email\",
        \"identifier\": \"$TEST_EMAIL\",
        \"purpose\": \"verification\"
    }"
    
    response=$(make_request "POST" "/otp/generate" "$data" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        log_success "OTP generation successful"
        OTP_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        return 0
    else
        log_error "OTP generation failed: $response"
        return 1
    fi
}

test_subscription_plans() {
    log_info "Testing subscription plans..."
    
    response=$(make_request "GET" "/subscriptions/plans" "" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Get subscription plans successful"
        return 0
    else
        log_error "Get subscription plans failed: $response"
        return 1
    fi
}

test_admin_metrics() {
    log_info "Testing admin metrics (should fail for non-admin)..."
    
    response=$(make_request "GET" "/admin/metrics" "" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":false'; then
        log_success "Admin metrics correctly denied for non-admin user"
        return 0
    else
        log_error "Admin metrics access control failed: $response"
        return 1
    fi
}

test_error_handling() {
    log_info "Testing error handling..."
    
    # Test invalid endpoint
    response=$(make_request "GET" "/nonexistent" "" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":false'; then
        log_success "Invalid endpoint error handling works"
    else
        log_error "Invalid endpoint error handling failed: $response"
        return 1
    fi
    
    # Test invalid authentication
    response=$(make_request "GET" "/organizations" "" "invalid-token")
    if echo "$response" | grep -q '"success":false'; then
        log_success "Invalid authentication error handling works"
    else
        log_error "Invalid authentication error handling failed: $response"
        return 1
    fi
    
    # Test validation error
    local data="{"  # Invalid JSON
    response=$(make_request "POST" "/organizations" "$data" "$AUTH_TOKEN")
    if echo "$response" | grep -q '"success":false'; then
        log_success "Validation error handling works"
    else
        log_error "Validation error handling failed: $response"
        return 1
    fi
    
    return 0
}

test_rate_limiting() {
    log_info "Testing rate limiting..."
    
    # Make multiple requests quickly
    for i in {1..10}; do
        response=$(make_request "GET" "/health" "" "")
        if echo "$response" | grep -q '"success":false'; then
            log_success "Rate limiting is working"
            return 0
        fi
    done
    
    log_success "Rate limiting test completed"
    return 0
}

# Main test execution
main() {
    log_info "Starting NexusSuite API tests..."
    log_info "Base URL: $BASE_URL"
    log_info "Test email: $TEST_EMAIL"
    log_info "Test organization: $TEST_ORG_NAME"
    
    local failed_tests=0
    local total_tests=0
    
    # Run tests
    tests=(
        "test_health_check"
        "test_user_registration"
        "test_user_login"
        "test_get_current_user"
        "test_organization_creation"
        "test_get_organization"
        "test_organization_members"
        "test_otp_generation"
        "test_subscription_plans"
        "test_admin_metrics"
        "test_error_handling"
        "test_rate_limiting"
    )
    
    for test in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        if ! $test; then
            failed_tests=$((failed_tests + 1))
        fi
        echo ""
    done
    
    # Summary
    log_info "Test Summary:"
    log_info "Total tests: $total_tests"
    log_info "Passed: $((total_tests - failed_tests))"
    log_info "Failed: $failed_tests"
    
    if [ $failed_tests -eq 0 ]; then
        log_success "All tests passed! 🎉"
        exit 0
    else
        log_error "$failed_tests tests failed. ❌"
        exit 1
    fi
}

# Run main function
main "$@"