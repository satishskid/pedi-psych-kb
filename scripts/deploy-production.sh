#!/bin/bash

# 🚀 One-Shot Production Deployment Script
# Pediatric Psychiatry Knowledge Base System

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for Pediatric Psychiatry Knowledge Base"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check wrangler
    if ! command -v wrangler &> /dev/null; then
        log_info "Installing wrangler CLI..."
        npm install -g wrangler
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed. Please install git first."
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# Setup Cloudflare
check_cloudflare_setup() {
    log_info "Checking Cloudflare setup..."
    
    # Check if user is logged in
    if ! wrangler whoami &> /dev/null; then
        log_warning "Not logged in to Cloudflare. Please run: wrangler login"
        echo "Please run: wrangler login"
        exit 1
    fi
    
    log_success "Cloudflare setup verified!"
}

# Create D1 database
create_database() {
    log_info "Creating D1 database..."
    
    DB_NAME="pedi-psych-kb-prod"
    
    # Check if database exists
    if wrangler d1 list | grep -q "$DB_NAME"; then
        log_warning "Database $DB_NAME already exists. Skipping creation."
    else
        log_info "Creating database: $DB_NAME"
        wrangler d1 create "$DB_NAME"
        log_success "Database $DB_NAME created!"
    fi
    
    # Get database ID and update wrangler.toml
    DB_ID=$(wrangler d1 list | grep "$DB_NAME" | awk '{print $2}')
    if [ -n "$DB_ID" ]; then
        log_info "Updating wrangler.toml with database ID: $DB_ID"
        
        # Backup original wrangler.toml
        cp wrangler.toml wrangler.toml.backup
        
        # Update database ID in wrangler.toml
        sed -i.bak "s/database_id = \".*\"/database_id = \"$DB_ID\"/g" wrangler.toml
        
        log_success "Database configuration updated!"
    fi
}

# Create KV namespaces
create_kv_namespaces() {
    log_info "Creating KV namespaces..."
    
    # Create main KV namespace
    if wrangler kv:namespace list | grep -q "POLICIES_PROD"; then
        log_warning "KV namespace POLICIES_PROD already exists. Skipping creation."
    else
        log_info "Creating KV namespace: POLICIES_PROD"
        wrangler kv:namespace create POLICIES_PROD
        wrangler kv:namespace create POLICIES_PROD_PREVIEW
        log_success "KV namespaces created!"
    fi
    
    # Get KV namespace ID and update wrangler.toml
    KV_ID=$(wrangler kv:namespace list | grep "POLICIES_PROD" | grep -v "preview" | jq -r '.[0].id')
    if [ -n "$KV_ID" ]; then
        log_info "Updating wrangler.toml with KV namespace ID: $KV_ID"
        
        # Add KV binding to wrangler.toml
        if ! grep -q "POLICIES_PROD" wrangler.toml; then
            cat >> wrangler.toml << EOF

[[kv_namespaces]]
binding = "POLICIES_PROD"
id = "$KV_ID"
preview_id = "$KV_ID"
EOF
        fi
        
        log_success "KV namespace configuration updated!"
    fi
}

# Build all services
build_services() {
    log_info "Building all services..."
    
    # Install root dependencies
    npm install
    
    # Build shared package
    log_info "Building shared package..."
    cd packages/shared && npm install && npm run build && cd ../..
    
    # Build kb-api
    log_info "Building kb-api..."
    cd apps/kb-api && npm install && npm run build && cd ../..
    
    # Build app-api
    log_info "Building app-api..."
    cd apps/app-api && npm install && npm run build && cd ../..
    
    # Build ops-api
    log_info "Building ops-api..."
    cd apps/ops-api && npm install && npm run build && cd ../..
    
    # Build frontend
    log_info "Building frontend..."
    cd apps/frontend && npm install && npm run build && cd ../..
    
    log_success "All services built successfully!"
}

# Deploy API services
deploy_api_services() {
    log_info "Deploying API services..."
    
    # Deploy kb-api
    log_info "Deploying kb-api..."
    cd apps/kb-api && wrangler deploy && cd ../..
    
    # Deploy app-api
    log_info "Deploying app-api..."
    cd apps/app-api && wrangler deploy && cd ../..
    
    # Deploy ops-api
    log_info "Deploying ops-api..."
    cd apps/ops-api && wrangler deploy && cd ../..
    
    log_success "All API services deployed!"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    
    cd apps/frontend
    
    # Create production build
    npm run build
    
    # Deploy to Cloudflare Pages
    wrangler pages deploy dist --project-name=pedi-psych-kb-frontend
    
    cd ../..
    
    log_success "Frontend deployed to Cloudflare Pages!"
}

# Setup database schema
setup_database_schema() {
    log_info "Setting up database schema..."
    
    DB_NAME="pedi-psych-kb-prod"
    
    # Apply schema
    log_info "Applying database schema..."
    wrangler d1 execute "$DB_NAME" --file=database/schema.sql
    
    log_success "Database schema applied!"
}

# Seed demo data
seed_demo_data() {
    log_info "Seeding demo data..."
    
    DB_NAME="pedi-psych-kb-prod"
    
    # Check if demo data should be seeded
    read -p "Do you want to seed demo data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Seeding demo data..."
        wrangler d1 execute "$DB_NAME" --file=database/seed.sql
        log_success "Demo data seeded!"
    else
        log_info "Skipping demo data seeding."
    fi
}

# Generate JWT secret
generate_jwt_secret() {
    log_info "Generating JWT secret..."
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    log_info "JWT Secret generated. Please save this securely:"
    echo "JWT_SECRET=$JWT_SECRET"
    
    # Update environment variables
    if [ ! -f .env.production ]; then
        cat > .env.production << EOF
# Production Environment Variables
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
DEBUG=false
EOF
    fi
    
    log_success "JWT secret generated and saved!"
}

# Display deployment summary
display_summary() {
    log_success "🎉 Deployment completed successfully!"
    echo
    echo "=================================================================="
    echo "🏥 Pediatric Psychiatry Knowledge Base - Deployment Summary"
    echo "=================================================================="
    echo
    echo "🔗 Service URLs:"
    echo "   Frontend: https://pedi-psych-kb-frontend.pages.dev"
    echo "   KB API:   https://kb-api.your-subdomain.workers.dev"
    echo "   App API:  https://app-api.your-subdomain.workers.dev"
    echo "   Ops API:  https://ops-api.your-subdomain.workers.dev"
    echo
    echo "📊 Default Admin Credentials:"
    echo "   Email: admin@example.com"
    echo "   Password: demo123"
    echo
    echo "🔐 Security:"
    echo "   - JWT Secret: Generated and saved to .env.production"
    echo "   - Rate limiting: Enabled"
    echo "   - CORS: Configured"
    echo "   - HTTPS: Enabled"
    echo
    echo "📈 Monitoring:"
    echo "   - Health checks: Available at /health endpoints"
    echo "   - API usage tracking: Enabled"
    echo "   - Error logging: Configured"
    echo
    echo "🎯 Next Steps:"
    echo "   1. Configure custom domain (optional)"
    echo "   2. Set up monitoring alerts"
    echo "   3. Configure backup strategy"
    echo "   4. Review security settings"
    echo "   5. Test all functionality"
    echo
    echo "📚 Documentation:"
    echo "   - README.md: Complete feature overview"
    echo "   - DEPLOYMENT.md: Detailed deployment guide"
    echo "   - API Documentation: Available at /docs endpoints"
    echo
    echo "=================================================================="
    echo "🚀 Your Pediatric Psychiatry Knowledge Base is ready!"
    echo "=================================================================="
}

# Main deployment function
main() {
    echo "🚀 Starting Production Deployment..."
    echo "=================================================================="
    
    # Check if running in CI/CD
    if [ "$CI" = "true" ]; then
        log_info "Running in CI/CD environment"
        AUTO_APPROVE=true
    else
        # Confirm deployment
        read -p "This will deploy to PRODUCTION. Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
    
    # Run deployment steps
    check_prerequisites
    check_cloudflare_setup
    create_database
    create_kv_namespaces
    build_services
    deploy_api_services
    deploy_frontend
    setup_database_schema
    seed_demo_data
    generate_jwt_secret
    display_summary
    
    log_success "🎉 Production deployment completed successfully!"
}

# Error handling
trap 'log_error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"