#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
PHONE="998901234567"

echo "=== Resend Password SMS Test ==="
echo ""

# Step 1: Request password reset (Init)
echo "Step 1: Requesting password reset for ${PHONE}..."
curl -X POST "${BASE_URL}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"${PHONE}\"}" \
  -s | jq .
echo ""

# Step 2: Immediately request resend (Should fail)
echo "Step 2: Immediately requesting resend (Should fail with rate limit error)..."
RESPONSE=$(curl -X POST "${BASE_URL}/auth/forgot-password/resend" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"${PHONE}\"}" \
  -s)

echo "$RESPONSE" | jq .
echo ""

# Check if error code is correct (1403 = SMS_RATE_LIMIT_EXCEEDED)
if echo "$RESPONSE" | jq -e '.code == 1403' > /dev/null; then
  echo "✓ Rate limit working correctly!"
else
  echo "✗ Rate limit check failed"
fi
