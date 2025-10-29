#!/bin/bash

# TinyVibes Production Deployment Script
# Made by GreyBrain.ai

set -e

echo "🚀 Starting TinyVibes production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI is not installed. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Wrangler
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Please login to Wrangler first:${NC}"
    echo "wrangler login"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install root dependencies
npm install

# Install frontend dependencies
cd apps/frontend
npm install
cd ../..

# Install API dependencies
cd apps/app-api
npm install
cd ../..

echo -e "${BLUE}🗄️ Setting up production database...${NC}"

# Deploy database migrations
cd apps/app-api
wrangler d1 migrations apply pedi-psych-kb-prod --env production
cd ../..

echo -e "${BLUE}⚙️ Deploying API to Cloudflare Workers...${NC}"

# Deploy API
cd apps/app-api
wrangler deploy --env production
cd ../..

echo -e "${BLUE}🌐 Building frontend for production...${NC}"

# Build frontend
cd apps/frontend
npm run build
cd ../..

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Set up Cloudflare Pages:"
echo "   - Go to Cloudflare Dashboard > Pages"
echo "   - Connect GitHub repository: satishskid/pedi-psych-kb"
echo "   - Use build command: cd apps/frontend && npm install && npm run build"
echo "   - Set build output directory: apps/frontend/dist"
echo ""
echo "2. Configure environment variables in Cloudflare Pages:"
echo "   - VITE_API_URL=https://pedi-app-prod.your-subdomain.workers.dev"
echo "   - VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key"
echo ""
echo "3. Create admin and demo users using the API endpoints"
echo ""
echo -e "${GREEN}🎉 TinyVibes is ready for production!${NC}"