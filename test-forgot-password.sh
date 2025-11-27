#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "Testing Forgot Password API..."
echo ""

# Test 1: Forgot Password Init with non-existent user (should return error)
echo "Test 1: Forgot Password Init with non-existent user"
curl -X POST "${BASE_URL}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"998999999999"}' \
  -s | jq .

echo ""
echo "---"
echo ""

# Test 2: Register a test user first
echo "Test 2: Creating a test center and user for testing..."
PHONE="998901234567"
curl -X POST "${BASE_URL}/auth/register-center" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber":"'${PHONE}'",
    "password":"oldPassword123",
    "firstName":"Test",
    "lastName":"User",
    "centerName":"Test Center"
  }' \
  -s | jq .

echo ""
echo "Waiting for SMS code (check console logs)..."
sleep 2
echo ""

# Note: In real scenario, we would get the SMS code from logs
# For now, we'll document the flow
echo "Note: Check server logs for SMS code, then verify and complete registration"
echo ""
