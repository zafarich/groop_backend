#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
PHONE="998901234567"

echo "=== Complete Forgot Password Flow Test ==="
echo ""

# Step 1: Request password reset
echo "Step 1: Requesting password reset for ${PHONE}..."
RESPONSE=$(curl -X POST "${BASE_URL}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\":\"${PHONE}\"}" \
  -s)

echo "$RESPONSE" | jq .
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✓ SMS code sent successfully!"
  echo "Check server logs for the SMS code..."
  echo ""
  
  # Wait a bit and show instructions
  sleep 2
  
  echo "---"
  echo ""
  echo "Step 2: To verify the code, run:"
  echo "curl -X POST '${BASE_URL}/auth/verify-forgot-password' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"phoneNumber\":\"${PHONE}\",\"code\":\"YOUR_CODE_HERE\"}' | jq ."
  echo ""
  echo "Step 3: To reset password, run:"
  echo "curl -X POST '${BASE_URL}/auth/reset-password' \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -d '{\"phoneNumber\":\"${PHONE}\",\"code\":\"YOUR_CODE_HERE\",\"newPassword\":\"newPassword123\"}' | jq ."
  echo ""
else
  echo "✗ Failed to send SMS code"
  echo "Error: $(echo "$RESPONSE" | jq -r '.message')"
fi
