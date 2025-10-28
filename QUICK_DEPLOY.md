# Quick Deployment Guide 🚀

## One-Shot Production Deployment

Deploy your entire pediatric psychiatry knowledge base system in one command:

```bash
npm run deploy:production
```

## Deployment Options

### 1. **One-Shot Deployment** (Recommended)
```bash
# Production
npm run deploy:production

# Staging
npm run deploy:staging

# Development
npm run deploy:development
```

### 2. **Staged Deployment** (For more control)
```bash
# Step 1: Build everything
npm run build

# Step 2: Setup Cloudflare resources
npm run setup:cloudflare

# Step 3: Deploy backend services
npm run deploy:backend

# Step 4: Deploy frontend
npm run deploy:frontend
```

### 3. **Manual Deployment** (For fine-grained control)
```bash
# Deploy individual services
npm run deploy:kb-api
npm run deploy:app-api
npm run deploy:ops-api
npm run deploy:frontend
```

## Prerequisites

1. **Node.js** (v18+)
2. **npm** (v9+)
3. **Cloudflare account** with Wrangler CLI
4. **Git** configured

## Setup Cloudflare

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create required resources
npm run setup:cloudflare
```

## Database Management

```bash
# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed with demo data
npm run db:seed

# Reset everything (⚠️ Destructive)
npm run db:reset

# Backup database
npm run db:backup

# Restore from backup
npm run db:restore
```

## Health Checks & Monitoring

```bash
# Check service health
npm run health:check

# View logs
npm run logs:tail

# Security audit
npm run security:audit

# Fix security issues
npm run security:fix
```

## CI/CD Integration

```bash
# Complete CI build and deploy
npm run ci:deploy

# Just build and test
npm run ci:build
```

## Environment Variables

Create a `.env` file in your project root:

```env
# JWT Secret (auto-generated during deployment)
JWT_SECRET=your-secret-key

# Database bindings (auto-configured)
DB=pedi-psych-kb-prod

# KV Namespaces (auto-configured)
POLICIES_KV=POLICIES_PROD

# Environment
NODE_ENV=production
```

## Post-Deployment

1. **Access your application**: Check the deployment URLs provided
2. **Create admin user**: Use the demo credentials or create a new admin
3. **Configure licenses**: Set up your license types and features
4. **Seed knowledge base**: Run knowledge base seeding scripts
5. **Set up monitoring**: Configure alerts and monitoring

## Troubleshooting

### Common Issues

1. **Wrangler not found**: Install globally with `npm install -g wrangler`
2. **Database creation fails**: Check Cloudflare account permissions
3. **Build failures**: Ensure all dependencies are installed
4. **Deployment timeouts**: Check your Cloudflare account limits

### Getting Help

- Check the detailed [DEPLOYMENT.md](DEPLOYMENT.md) guide
- Review logs with `npm run logs:tail`
- Check service health with `npm run health:check`
- Run security audit with `npm run security:audit`

## Quick Start Demo

```bash
# Clone and setup
git clone <your-repo>
cd pedi-psych-kb
npm install

# One-shot deployment
npm run deploy:production

# Access your application
# Frontend: https://your-frontend.pages.dev
# APIs: https://your-worker.workers.dev
```

🎉 **Your pediatric psychiatry knowledge base is now live!**