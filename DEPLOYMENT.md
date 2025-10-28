# 🚀 Deployment Guide - Pediatric Psychiatry Knowledge Base

## 📋 **Deployment Overview**

This guide provides step-by-step instructions for deploying the Pediatric Psychiatry Knowledge Base system in various environments, from development to production.

---

## 🎯 **Deployment Options**

### **Option 1: Cloudflare Workers (Recommended for Production)**
- **Best for**: Production deployments, global scale
- **Advantages**: Serverless, auto-scaling, global CDN, built-in D1 database
- **Cost**: Pay-per-use, very cost-effective
- **Complexity**: Low to Medium

### **Option 2: Docker Deployment**
- **Best for**: Self-hosted environments, enterprise compliance
- **Advantages**: Containerized, portable, consistent environments
- **Cost**: Infrastructure costs only
- **Complexity**: Medium

### **Option 3: Traditional VPS/Server**
- **Best for**: Full control, custom configurations
- **Advantages**: Complete control, predictable costs
- **Cost**: Fixed server costs
- **Complexity**: Medium to High

---

## 🌐 **Option 1: Cloudflare Workers Deployment**

### **Prerequisites**
- Cloudflare account (free tier available)
- Wrangler CLI installed
- Domain name (optional, can use workers.dev subdomain)

### **Step 1: Environment Setup**

```bash
# 1. Install Wrangler CLI globally
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Verify authentication
wrangler whoami
```

### **Step 2: Database Setup**

```bash
# 1. Create production D1 database
wrangler d1 create pedi-psych-kb-prod

# Output will show database ID - save this!
# Example: database_id = "12345678-1234-1234-1234-123456789abc"

# 2. Create staging database (optional)
wrangler d1 create pedi-psych-kb-staging
```

### **Step 3: Configuration**

1. **Update `wrangler.toml`**:
```toml
name = "pedi-psych-kb-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "pedi-psych-kb-api-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "pedi-psych-kb-prod"
database_id = "YOUR_PRODUCTION_DATABASE_ID"

[env.production.vars]
JWT_SECRET = "your-super-secure-production-jwt-secret"
REGION_DEFAULT = "us-east-1"

[env.staging]
name = "pedi-psych-kb-api-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "pedi-psych-kb-staging"
database_id = "YOUR_STAGING_DATABASE_ID"

[env.staging.vars]
JWT_SECRET = "your-staging-jwt-secret"
REGION_DEFAULT = "us-east-1"
```

2. **Set Environment Secrets**:
```bash
# Production secrets
wrangler secret put JWT_SECRET --env production
# Enter your secure JWT secret when prompted

# Optional: Google OAuth (if using)
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production

# Staging secrets
wrangler secret put JWT_SECRET --env staging
```

### **Step 4: Database Migration**

```bash
# 1. Navigate to API directory
cd apps/app-api

# 2. Run migrations on production database
wrangler d1 execute pedi-psych-kb-prod --file=../../database/schema.sql
wrangler d1 execute pedi-psych-kb-prod --file=../../database/license_schema.sql

# 3. Seed initial data (optional)
wrangler d1 execute pedi-psych-kb-prod --file=../../database/seed.sql

# 4. Create initial admin user
wrangler d1 execute pedi-psych-kb-prod --command="
INSERT INTO users (email, password_hash, name, role, tenant_id, created_at, updated_at)
VALUES (
  'admin@yourorganization.com',
  'password123',
  'System Administrator',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);"
```

### **Step 5: Deploy API**

```bash
# 1. Build and deploy to staging
npm run build
wrangler deploy --env staging

# 2. Test staging deployment
curl https://pedi-psych-kb-api-staging.your-subdomain.workers.dev/api/health

# 3. Deploy to production
wrangler deploy --env production

# 4. Test production deployment
curl https://pedi-psych-kb-api-prod.your-subdomain.workers.dev/api/health
```

### **Step 6: Deploy Frontend**

```bash
# 1. Navigate to frontend directory
cd ../frontend

# 2. Update environment configuration
# Create .env.production file:
echo "VITE_API_URL=https://pedi-psych-kb-api-prod.your-subdomain.workers.dev" > .env.production

# 3. Build frontend
npm run build

# 4. Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name pedi-psych-kb-frontend

# 5. Configure custom domain (optional)
wrangler pages domain add your-domain.com --project-name pedi-psych-kb-frontend
```

### **Step 7: Post-Deployment Setup**

1. **Test Complete System**:
```bash
# Test login
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@yourorganization.com","password":"password123"}' \
  "https://your-domain.com/api/auth/login"

# Test knowledge base
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://your-domain.com/api/content/book-structure"
```

2. **Create Additional Admin Users**:
```bash
# Use the API to create more admins
curl -X POST -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cto@yourorganization.com",
    "name": "CTO Name",
    "role": "admin"
  }' \
  "https://your-domain.com/api/users"
```

---

## 👥 **Admin User Setup**

### **Creating Initial Admin Users**

#### **Method 1: Database Direct Insert**
```sql
-- For SQLite
INSERT INTO users (email, password_hash, name, role, tenant_id, created_at, updated_at)
VALUES (
  'cto@yourorganization.com',
  'secure_password_123',  -- Use proper hashing in production
  'Chief Technology Officer',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);
```

#### **Method 2: API Creation Script**
```bash
#!/bin/bash
# create_admin.sh

API_URL="https://your-domain.com"
ADMIN_JWT="your-existing-admin-jwt-token"

# Create CTO user
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cto@yourorganization.com",
    "name": "Chief Technology Officer",
    "role": "admin"
  }' \
  "$API_URL/api/users"
```

### **Recommended Admin Users for Testing**

```bash
# 1. CTO/Technical Lead
Email: cto@yourorganization.com
Role: admin
Purpose: System oversight, technical decisions

# 2. Clinical Director
Email: clinical.director@yourorganization.com
Role: admin
Purpose: Content oversight, clinical governance

# 3. IT Administrator
Email: it.admin@yourorganization.com
Role: admin
Purpose: Day-to-day system administration
```

---

## 🧪 **Testing Your Deployment**

### **Automated Testing Script**

```bash
#!/bin/bash
# test_deployment.sh

API_URL="https://your-domain.com"
FRONTEND_URL="https://your-domain.com"

echo "Testing Pediatric Psychiatry Knowledge Base Deployment..."

# Test 1: Health Check
echo "1. Testing API health..."
curl -f "$API_URL/api/health" || echo "❌ Health check failed"

# Test 2: Frontend Access
echo "2. Testing frontend access..."
curl -f "$FRONTEND_URL" > /dev/null || echo "❌ Frontend access failed"

# Test 3: Authentication
echo "3. Testing authentication..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@yourorganization.com","password":"password123"}' \
  "$API_URL/api/auth/login")

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ "$JWT_TOKEN" != "null" ]; then
  echo "✅ Authentication successful"
else
  echo "❌ Authentication failed"
  exit 1
fi

# Test 4: Knowledge Base Access
echo "4. Testing knowledge base access..."
curl -f -H "Authorization: Bearer $JWT_TOKEN" \
  "$API_URL/api/content/book-structure" > /dev/null || echo "❌ Knowledge base access failed"

# Test 5: Advanced Search
echo "5. Testing advanced search..."
curl -f -X POST -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"anxiety management","context":{"user_role":"parent","child_age":8},"response_type":"guidance"}' \
  "$API_URL/api/content/advanced-search" > /dev/null || echo "❌ Advanced search failed"

echo "✅ Deployment testing completed!"
```

### **Manual Testing Checklist**

- [ ] **System Health**: API health endpoint returns "healthy"
- [ ] **Frontend Access**: Website loads correctly
- [ ] **Authentication**: Admin login works
- [ ] **User Creation**: Can create new users via admin panel
- [ ] **Knowledge Base**: Can browse chapters and content
- [ ] **Basic Search**: Search functionality works
- [ ] **Advanced Search**: AI-powered search returns results
- [ ] **Role-Based Access**: Different roles see appropriate content
- [ ] **BYOK Configuration**: Can configure AI providers (optional)

---

## 🚀 **Go-Live Checklist**

### **Pre-Launch**
- [ ] All tests passing
- [ ] Security hardening completed
- [ ] Admin users created
- [ ] Documentation updated

### **Launch Day**
- [ ] Deploy to production
- [ ] Run deployment tests
- [ ] Verify all endpoints working
- [ ] Test user creation workflow
- [ ] Monitor system performance

### **Post-Launch**
- [ ] Monitor system health for 24-48 hours
- [ ] Address any performance issues
- [ ] Collect user feedback
- [ ] Plan user training sessions

---

**Deployment Guide Complete! 🎉**

*Your Pediatric Psychiatry Knowledge Base is ready to help healthcare professionals and families access critical behavioral health information.*

## 🎯 Deployment Options

### 1. Cloudflare Workers (Serverless) - RECOMMENDED

**Architecture:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare    │    │   Cloudflare    │
│   Workers       │    │   D1 Database   │    │   KV Storage    │
│  (API Services) │    │   (Main DB)     │    │   (Policies)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   Pages         │
                    │  (Frontend)     │
                    └─────────────────┘
```

**Pros:**
- ✅ Zero server management
- ✅ Global CDN automatically
- ✅ Auto-scaling
- ✅ Pay-per-use pricing
- ✅ Built-in DDoS protection
- ✅ 99.99% uptime SLA

**Cons:**
- ⚠️ Vendor lock-in
- ⚠️ Limited runtime (10ms-30s)
- ⚠️ Cold starts possible

**Cost:** $5-50/month depending on usage

**Setup Commands:**
```bash
# Install dependencies
npm install

# Configure Cloudflare
npx wrangler login

# Create D1 database
wrangler d1 create pedi-psych-kb-prod

# Create KV namespaces
wrangler kv:namespace create POLICIES_PROD
wrangler kv:namespace create POLICIES_PROD_PREVIEW

# Update wrangler.toml with IDs
# Deploy all services
npm run deploy:cloudflare
```

### 2. Traditional VPS/Dedicated Server

**Architecture:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx/Apache  │    │   Node.js       │    │   PostgreSQL    │
│   (Load Balancer)│   │   (API Services)│   │   (Main DB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   React App     │
                    │  (Static Files) │
                    └─────────────────┘
```

**Pros:**
- ✅ Full control over environment
- ✅ Predictable costs
- ✅ No vendor lock-in
- ✅ Custom configurations
- ✅ Long-running processes

**Cons:**
- ❌ Manual scaling required
- ❌ Server maintenance overhead
- ❌ No built-in CDN
- ❌ Security management needed

**Cost:** $20-200/month depending on specs

**Setup Commands:**
```bash
# On your VPS
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Clone repository
git clone <repository-url>
cd pedi-psych-kb

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Setup database
npm run db:setup:postgres

# Build and start services
npm run build
npm run start:production
```

### 3. Kubernetes Deployment

**Architecture:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingress       │    │   Services      │    │   StatefulSets  │
│   (Load Balancer)│   │   (API Pods)    │   │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   React App     │
                    │  (Static Files) │
                    └─────────────────┘
```

**Pros:**
- ✅ Highly scalable
- ✅ Self-healing
- ✅ Rolling updates
- ✅ Resource management
- ✅ Multi-cloud support

**Cons:**
- ❌ Complex setup
- ❌ Operational overhead
- ❌ Steep learning curve
- ❌ Higher costs for small deployments

**Cost:** $100-500/month depending on cluster size

**Setup Commands:**
```bash
# Install kubectl and helm
# Create cluster (GKE, EKS, or AKS)

# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/api-services.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n pedi-psych-kb
kubectl get services -n pedi-psych-kb
```

### 4. Hybrid Deployment

**Architecture:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   VPS/Cloud     │    │   Cloud SQL     │
│   CDN/Workers   │    │   (API Layer)   │    │   (PostgreSQL)  │
│   (Edge Cache)  │    │   (Processing)  │    │   (Data Storage)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   S3/Bucket   │
                    │  (Static Files) │
                    └─────────────────┘
```

**Pros:**
- ✅ Best of both worlds
- ✅ Flexible architecture
- ✅ Cost optimization
- ✅ Gradual migration path

**Cons:**
- ❌ Increased complexity
- ❌ Multiple vendors
- ❌ Network latency considerations

**Cost:** $50-300/month depending on configuration

## 🔧 Environment Setup

### Development Environment

```bash
# Create .env file
cp .env.example .env

# Development configuration
cat > .env << EOF
# Database
DATABASE_URL=file:./dev.db
DATABASE_TYPE=sqlite

# JWT
JWT_SECRET=dev-secret-key-change-in-production

# API URLs
API_URL=http://localhost:8787
APP_API_URL=http://localhost:8788
OPS_API_URL=http://localhost:8789

# Frontend
FRONTEND_URL=http://localhost:5173

# Development flags
NODE_ENV=development
DEBUG=true
EOF
```

### Staging Environment

```bash
# Staging configuration
cat > .env.staging << EOF
# Database (Cloudflare D1)
DATABASE_TYPE=d1
DATABASE_NAME=pedi-psych-kb-staging

# JWT
JWT_SECRET=staging-secret-key

# API URLs (Cloudflare Workers)
API_URL=https://kb-api-staging.your-domain.workers.dev
APP_API_URL=https://app-api-staging.your-domain.workers.dev
OPS_API_URL=https://ops-api-staging.your-domain.workers.dev

# Frontend (Cloudflare Pages)
FRONTEND_URL=https://pedi-psych-kb-staging.pages.dev

# Environment
NODE_ENV=staging
DEBUG=false
EOF
```

### Production Environment

```bash
# Production configuration
cat > .env.production << EOF
# Database (Cloudflare D1)
DATABASE_TYPE=d1
DATABASE_NAME=pedi-psych-kb-prod

# JWT (Use strong secret)
JWT_SECRET=your-very-strong-production-secret-key

# API URLs (Custom domain)
API_URL=https://api.your-domain.com
APP_API_URL=https://app.your-domain.com
OPS_API_URL=https://ops.your-domain.com

# Frontend (Custom domain)
FRONTEND_URL=https://your-domain.com

# Environment
NODE_ENV=production
DEBUG=false

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://your-domain.com
EOF
```

## 🗄️ Database Configuration

### Cloudflare D1 Setup

```sql
-- Create database tables
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT,
  access_level TEXT DEFAULT 'public',
  tenant_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_cards_category ON cards(category);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_cards_access ON cards(access_level);
```

### PostgreSQL Setup (VPS/K8s)

```sql
-- Create database and user
CREATE DATABASE pedi_psych_kb;
CREATE USER pedi_psych_user WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE pedi_psych_kb TO pedi_psych_user;

-- Switch to the database
\c pedi_psych_kb;

-- Create tables with PostgreSQL syntax
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  tenant_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags TEXT,
  access_level VARCHAR(50) DEFAULT 'public',
  tenant_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_cards_category ON cards(category);
CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_cards_access ON cards(access_level);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔒 Security Configuration

### JWT Configuration

```typescript
// Strong JWT secret generation
const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET:', jwtSecret);
```

### CORS Configuration

```typescript
// CORS setup for production
const corsConfig = {
  origin: process.env.CORS_ORIGIN || 'https://your-domain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};
```

### Rate Limiting

```typescript
// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};
```

### Security Headers

```typescript
// Security headers for production
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```

## 📊 Monitoring & Logging

### Health Check Endpoints

```bash
# Check service health
curl -X GET https://api.your-domain.com/health
curl -X GET https://app.your-domain.com/health
curl -X GET https://ops.your-domain.com/health

# Expected response
{"status":"healthy","timestamp":"2024-01-01T00:00:00.000Z","version":"1.0.0"}
```

### Application Monitoring

```typescript
// Add to your API services
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.header('X-Response-Time', `${ms}ms`);
  
  // Log request
  console.log(`${c.req.method} ${c.req.url} - ${ms}ms`);
});
```

### Database Monitoring

```sql
-- Monitor database performance
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

## ⚡ Performance Optimization

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM cards WHERE tenant_id = 1 AND category = 'medical';

-- Create composite indexes
CREATE INDEX idx_cards_tenant_category ON cards(tenant_id, category);
CREATE INDEX idx_cards_created_at ON cards(created_at DESC);

-- Vacuum and analyze for PostgreSQL
VACUUM ANALYZE;
```

### Caching Strategy

```typescript
// Implement caching for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### CDN Configuration

```bash
# Cloudflare CDN settings (via dashboard or API)
# Cache level: Cache everything
# Browser cache TTL: 4 hours
# Always online: On
# Development mode: Off (production)
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
wrangler d1 list
wrangler d1 info pedi-psych-kb-prod

# Test connection
npx wrangler d1 execute pedi-psych-kb-prod --command "SELECT 1"
```

#### 2. CORS Issues

```bash
# Check CORS headers
curl -I -X OPTIONS https://api.your-domain.com/cards
# Should include: Access-Control-Allow-Origin: https://your-domain.com
```

#### 3. JWT Authentication Issues

```bash
# Test JWT token
curl -X GET https://api.your-domain.com/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check token expiration
node -e "console.log(JSON.parse(Buffer.from('JWT_PAYLOAD_PART', 'base64').toString()))"
```

#### 4. Deployment Failures

```bash
# Check deployment logs
wrangler tail

# Verify configuration
wrangler config list

# Test build locally
npm run build
```

### Performance Issues

#### Database Slow Queries

```sql
-- Find slow queries (PostgreSQL)
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### Memory Usage

```bash
# Monitor memory usage
free -h
top -p $(pgrep node)

# Check Node.js memory
node -e "console.log(process.memoryUsage())"
```

### Security Issues

#### SSL Certificate Issues

```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Test HTTPS redirect
curl -I http://your-domain.com
# Should redirect to https://your-domain.com
```

#### Rate Limiting

```bash
# Test rate limiting
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.your-domain.com/health
done
# Should return 429 after limit exceeded
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check application logs
   - Monitor database performance
   - Review security headers
   - Check SSL certificate expiration

2. **Monthly:**
   - Update dependencies
   - Review access logs
   - Backup database
   - Performance audit

3. **Quarterly:**
   - Security audit
   - Capacity planning
   - Disaster recovery test
   - Cost optimization review

### Emergency Procedures

#### Database Recovery

```bash
# Backup database
wrangler d1 export pedi-psych-kb-prod --output backup.sql

# Restore from backup
wrangler d1 execute pedi-psych-kb-prod --file backup.sql
```

#### Rollback Deployment

```bash
# Rollback to previous version
git checkout <previous-commit-hash>
npm run deploy:production
```

### Contact Information

- **Technical Support:** support@your-domain.com
- **Emergency Hotline:** +1-XXX-XXX-XXXX
- **Documentation:** https://docs.your-domain.com
- **Status Page:** https://status.your-domain.com

---

**🎯 Choose your deployment option and follow the guide above. For questions or issues, refer to the troubleshooting section or contact support.**