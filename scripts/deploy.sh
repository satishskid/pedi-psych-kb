#!/bin/bash

# Pediatric Psychology KB Deployment Script
# This script handles deployment of all services to Cloudflare Workers

set -e

echo "🚀 Starting deployment of Pediatric Psychology KB..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

# Deploy shared package first
print_status "Building shared package..."
cd packages/shared
npm install
npm run build
print_success "Shared package built successfully"

# Deploy kb-api (main API)
print_status "Deploying kb-api..."
cd ../../apps/kb-api
npm install
wrangler deploy --name pedi-psych-kb-api
print_success "kb-api deployed successfully"

# Deploy app-api (application API)
print_status "Deploying app-api..."
cd ../app-api
npm install
wrangler deploy --name pedi-psych-app-api
print_success "app-api deployed successfully"

# Deploy ops-api (operations API)
print_status "Deploying ops-api..."
cd ../ops-api
npm install
wrangler deploy --name pedi-psych-ops-api
print_success "ops-api deployed successfully"

# Build frontend
print_status "Building frontend..."
cd ../frontend
npm install
npm run build
print_success "Frontend built successfully"

# Deploy frontend to Cloudflare Pages
print_status "Deploying frontend to Cloudflare Pages..."
wrangler pages deploy dist --project-name pedi-psych-frontend
print_success "Frontend deployed successfully"

# Display deployment information
print_success "🎉 All services deployed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  • kb-api: https://pedi-psych-kb-api.YOUR_SUBDOMAIN.workers.dev"
echo "  • app-api: https://pedi-psych-app-api.YOUR_SUBDOMAIN.workers.dev"
echo "  • ops-api: https://pedi-psych-ops-api.YOUR_SUBDOMAIN.workers.dev"
echo "  • Frontend: https://pedi-psych-frontend.pages.dev"
echo ""
echo "🔧 Next Steps:"
echo "  1. Update your frontend .env file with the deployed API URLs"
echo "  2. Configure your Cloudflare D1 database bindings"
echo "  3. Set up KV namespaces for policy storage"
echo "  4. Configure environment variables in Cloudflare dashboard"
echo ""
echo "💡 For production deployment, make sure to:"
echo "  • Set up proper environment variables"
echo "  • Configure database connections"
echo "  • Set up monitoring and logging"
echo "  • Configure SSL/TLS certificates"

print_success "Deployment completed! 🚀"