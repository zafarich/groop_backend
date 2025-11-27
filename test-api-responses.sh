#!/bin/bash

# Test script for standardized API response structure
# Base URL
BASE_URL="http://localhost:3000/api/v1"

echo "========================================="
echo "Testing Standardized API Response Format"
echo "========================================="
echo ""

# Test 1: Error Response - Missing fields (Validation Error)
echo "Test 1: Validation Error (Missing required fields)"
echo "Request: POST /auth/login with empty body"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -s | jq '.'
echo ""
echo "Expected: success=false, code=1100 (VALIDATION_ERROR)"
echo "========================================="
echo ""

# Test 2: Error Response - Invalid credentials
echo "Test 2: Invalid Credentials Error"
echo "Request: POST /auth/login with wrong credentials"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+998901234567", "password": "wrongpassword"}' \
  -s | jq '.'
echo ""
echo "Expected: success=false, code=1001 (INVALID_CREDENTIALS)"
echo "========================================="
echo ""

# Test 3: Error Response - Invalid SMS code
echo "Test 3: Invalid SMS Code Error"
echo "Request: POST /auth/verify-center with wrong code"
curl -X POST "$BASE_URL/auth/verify-center" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+998901234567", "code": "0000"}' \
  -s | jq '.'
echo ""
echo "Expected: success=false, code=1002 (INVALID_SMS_CODE) or 1205 (VERIFICATION_SESSION_NOT_FOUND)"
echo "========================================="
echo ""

# Test 4: Error Response - Resource not found
echo "Test 4: Resource Not Found Error"
echo "Request: GET /users/99999 (non-existent user)"
curl -X GET "$BASE_URL/users/99999" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo ""
echo "Expected: success=false, code=1006 (UNAUTHORIZED) or 1200 (RESOURCE_NOT_FOUND)"
echo "========================================="
echo ""

echo "All tests completed!"
echo ""
echo "Response Structure Validation:"
echo "✓ All responses should have: success, code, data, message"
echo "✓ Success responses: success=true, code=0"
echo "✓ Error responses: success=false, code>0, data=null"
