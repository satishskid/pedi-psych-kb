#!/bin/bash

# Pediatric Psychology KB Development Setup Script
# This script sets up the development environment

set -e

echo "🛠️  Setting up Pediatric Psychology KB development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check Node.js version
print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $NODE_VERSION"
    exit 1
fi

print_success "Node.js version $NODE_VERSION detected"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm."
    exit 1
fi

# Install wrangler CLI globally if not present
print_status "Checking wrangler CLI..."
if ! command -v wrangler &> /dev/null; then
    print_status "Installing wrangler CLI globally..."
    npm install -g wrangler
fi

print_success "wrangler CLI is available"

# Setup shared package
print_status "Setting up shared package..."
cd packages/shared
npm install
npm run build
print_success "Shared package ready"

# Setup kb-api
print_status "Setting up kb-api..."
cd ../../apps/kb-api
npm install
print_success "kb-api ready"

# Setup app-api
print_status "Setting up app-api..."
cd ../app-api
npm install
print_success "app-api ready"

# Setup ops-api
print_status "Setting up ops-api..."
cd ../ops-api
npm install
print_success "ops-api ready"

# Setup frontend
print_status "Setting up frontend..."
cd ../frontend
npm install
print_success "Frontend ready"

# Setup database (if SQLite is available)
print_status "Setting up database..."
cd ../../database
if command -v sqlite3 &> /dev/null; then
    print_status "Creating and seeding database..."
    node seed.js
    print_success "Database seeded successfully"
else
    print_warning "SQLite not found. Database setup skipped."
    print_warning "To setup database manually, run: node seed.js"
fi

# Create .env files if they don't exist
print_status "Creating environment configuration files..."

# Frontend .env
cd ../apps/frontend
if [ ! -f .env ]; then
    cat > .env << EOF
VITE_API_URL=http://localhost:8787
VITE_APP_API_URL=http://localhost:8788
VITE_OPS_API_URL=http://localhost:8789
EOF
    print_success "Frontend .env file created"
fi

# Create development scripts
cd ../../
if [ ! -f dev-start.sh ]; then
    cat > dev-start.sh << 'EOF'
#!/bin/bash

# Start all services in development mode

echo "🚀 Starting development servers..."

# Start kb-api
echo "Starting kb-api..."
cd apps/kb-api && npm run dev &
KB_PID=$!

# Start app-api
echo "Starting app-api..."
cd ../app-api && npm run dev &
APP_PID=$!

# Start ops-api
echo "Starting ops-api..."
cd ../ops-api && npm run dev &
OPS_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "All services started!"
echo "  • kb-api: http://localhost:8787"
echo "  • app-api: http://localhost:8788"
echo "  • ops-api: http://localhost:8789"
echo "  • Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $KB_PID $APP_PID $OPS_PID $FRONTEND_PID; exit" INT
wait
EOF
    chmod +x dev-start.sh
    print_success "Development start script created"
fi

print_success "🎉 Development environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "  ./dev-start.sh     - Start all development servers"
echo "  ./scripts/deploy.sh - Deploy to production"
echo ""
echo "🔧 Development URLs:"
echo "  • kb-api: http://localhost:8787"
echo "  • app-api: http://localhost:8788"
echo "  • ops-api: http://localhost:8789"
echo "  • Frontend: http://localhost:3000"
echo ""
echo "💡 Next steps:"
echo "  1. Run ./dev-start.sh to start development servers"
echo "  2. Login to Cloudflare: wrangler login"
echo "  3. Configure your wrangler.toml files"
echo "  4. Start developing!"

print_success "Setup completed! 🚀"