#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api/v1"
PHONE_NUMBER="998901234567"
PASSWORD="admin123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting Group Activation Flow Test..."

# 1. Login
echo -e "\n1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$PHONE_NUMBER\", \"password\": \"$PASSWORD\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo $LOGIN_RESPONSE
  exit 1
fi
echo -e "${GREEN}✅ Login successful!${NC}"

# 2. Create Group
echo -e "\n2. Creating a new group..."
COURSE_START=$(date -v+10d +%Y-%m-%d)
COURSE_END=$(date -v+4m +%Y-%m-%d)

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/groups" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Activation Group $(date +%s)\",
    \"monthlyPrice\": 500000,
    \"courseStartDate\": \"$COURSE_START\",
    \"courseEndDate\": \"$COURSE_END\",
    \"paymentType\": \"MONTHLY_SAME_DATE\",
    \"teachers\": [{\"teacherId\": 1, \"isPrimary\": true}],
    \"lessonSchedules\": [{\"dayOfWeek\": 1, \"startTime\": \"10:00\", \"endTime\": \"12:00\"}]
  }")

GROUP_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
CONNECT_TOKEN=$(echo $CREATE_RESPONSE | grep -o '"connectToken":"[^"]*' | cut -d'"' -f4)
STATUS=$(echo $CREATE_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ -z "$GROUP_ID" ]; then
  echo -e "${RED}❌ Group creation failed!${NC}"
  echo $CREATE_RESPONSE
  exit 1
fi

echo -e "${GREEN}✅ Group created! ID: $GROUP_ID${NC}"
echo "Status: $STATUS"
echo "Connect Token: $CONNECT_TOKEN"

if [ "$STATUS" != "PENDING" ]; then
  echo -e "${RED}❌ Error: Status should be PENDING${NC}"
else
  echo -e "${GREEN}✅ Status is PENDING${NC}"
fi

if [ -z "$CONNECT_TOKEN" ]; then
  echo -e "${RED}❌ Error: Connect token missing${NC}"
else
  echo -e "${GREEN}✅ Connect token present${NC}"
fi

# 3. Get Connection Status
echo -e "\n3. Checking connection status..."
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/groups/$GROUP_ID/connection-status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

IS_CONNECTED=$(echo $STATUS_RESPONSE | grep -o '"isConnected":[^,]*' | cut -d':' -f2)

if [ "$IS_CONNECTED" == "false" ]; then
  echo -e "${GREEN}✅ isConnected is false (Correct)${NC}"
else
  echo -e "${RED}❌ Error: isConnected should be false${NC}"
  echo $STATUS_RESPONSE
fi

# 4. Regenerate Token
echo -e "\n4. Regenerating token..."
REGEN_RESPONSE=$(curl -s -X POST "$API_URL/groups/$GROUP_ID/regenerate-token" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

NEW_TOKEN=$(echo $REGEN_RESPONSE | grep -o '"connectToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$NEW_TOKEN" ]; then
  echo -e "${RED}❌ Token regeneration failed!${NC}"
  echo $REGEN_RESPONSE
  exit 1
fi

if [ "$NEW_TOKEN" != "$CONNECT_TOKEN" ]; then
  echo -e "${GREEN}✅ Token regenerated successfully!${NC}"
  echo "Old Token: $CONNECT_TOKEN"
  echo "New Token: $NEW_TOKEN"
else
  echo -e "${RED}❌ Error: Token did not change${NC}"
fi

echo -e "\n🎉 Test completed successfully!"
