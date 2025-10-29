#!/bin/bash

# TinyVibes User Creation Script
# Made by GreyBrain.ai

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default API URL (can be overridden)
API_URL=${1:-"https://pedi-app-prod.devadmin-27f.workers.dev"}

echo -e "${BLUE}👥 Creating TinyVibes users...${NC}"
echo "API URL: $API_URL"
echo ""

# Function to create user
create_user() {
    local email=$1
    local name=$2
    local role=$3
    local description=$4
    
    echo -e "${YELLOW}Creating $description...${NC}"
    
    http_code=$(curl -s -o /tmp/tinyvibes_create_user_resp.json -w "%{http_code}" -X POST "$API_URL/api/test/create-user" \
        -H "Content-Type: application/json" \
        -d "{\n            \"email\": \"$email\",\n            \"name\": \"$name\",\n            \"role\": \"$role\"\n        }")
    body=$(cat /tmp/tinyvibes_create_user_resp.json)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✅ $description created successfully${NC}"
        echo "   Email: $email"
        echo "   Role: $role"
        echo ""
    else
        echo -e "${RED}❌ Failed to create $description${NC}"
        echo "   HTTP Code: $http_code"
        echo "   Response: $body"
        echo ""
    fi
}

# Create Admin User
create_user "admin@tinyvibes.com" "TinyVibes Admin" "admin" "Admin User"

# Create Demo Users for different roles
create_user "demo@tinyvibes.com" "Demo Parent" "parent" "Demo Parent User"
create_user "demo-clinician@tinyvibes.com" "Demo Clinician" "doctor" "Demo Clinician User"
create_user "demo-educator@tinyvibes.com" "Demo Educator" "educator" "Demo Educator User"
create_user "demo-therapist@tinyvibes.com" "Demo Therapist" "therapist" "Demo Therapist User"

echo -e "${GREEN}🎉 User creation completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Login Credentials:${NC}"
echo "Admin User:"
echo "  Email: admin@tinyvibes.com"
echo "  Role: admin (full access)"
echo ""
echo "Demo Users:"
echo "  Parent: demo@tinyvibes.com"
echo "  Clinician: demo-clinician@tinyvibes.com (role: doctor)"
echo "  Educator: demo-educator@tinyvibes.com"
echo "  Therapist: demo-therapist@tinyvibes.com"
echo ""
echo -e "${BLUE}ℹ️  Note: Users will need to complete authentication via Clerk${NC}"