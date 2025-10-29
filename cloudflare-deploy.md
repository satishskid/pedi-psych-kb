# TinyVibes Cloudflare Deployment Guide

## Prerequisites
1. Cloudflare account with Pages and Workers enabled
2. GitHub repository: https://github.com/satishskid/pedi-psych-kb.git
3. Wrangler CLI installed and authenticated

## Deployment Steps

### 1. Deploy Frontend to Cloudflare Pages

#### Via Cloudflare Dashboard:
1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project" > "Connect to Git"
3. Select GitHub repository: `satishskid/pedi-psych-kb`
4. Configure build settings:
   - Framework preset: `Vite`
   - Build command: `cd apps/frontend && npm install && npm run build`
   - Build output directory: `apps/frontend/dist`
   - Root directory: `/`
   - Node.js version: `18`

#### Environment Variables for Pages:
```
VITE_API_URL=https://pedi-app-prod.your-subdomain.workers.dev
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here
```

### 2. Deploy API to Cloudflare Workers

#### Database Setup:
```bash
# Create production database
wrangler d1 create pedi-psych-kb-prod

# Run migrations
wrangler d1 migrations apply pedi-psych-kb-prod --env production
```

#### Deploy Workers:
```bash
cd apps/app-api
wrangler deploy --env production
```

#### Environment Variables for Workers:
```
JWT_SECRET=your-secure-jwt-secret-key-here
REGION_DEFAULT=us-east-1
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
```

### 3. Production URLs
- Frontend: `https://tinyvibes.pages.dev`
- API: `https://pedi-app-prod.your-subdomain.workers.dev`

### 4. Admin User Setup
After deployment, create admin user via API:
```bash
curl -X POST https://pedi-app-prod.your-subdomain.workers.dev/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tinyvibes.com",
    "name": "TinyVibes Admin",
    "role": "admin"
  }'
```

### 5. Demo User Setup
```bash
curl -X POST https://pedi-app-prod.your-subdomain.workers.dev/api/auth/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@tinyvibes.com",
    "name": "Demo User",
    "role": "parent"
  }'
```