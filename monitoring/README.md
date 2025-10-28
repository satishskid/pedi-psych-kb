# Pediatric Psychiatry Knowledge Base - Monitoring

This directory contains monitoring and alerting tools for your deployed application.

## Quick Start

```bash
# Install dependencies
npm install

# Run a single health check
npm run health-check

# Start continuous monitoring
npm run monitor
```

## Health Check Endpoints

- **Frontend**: https://d29ad10a.pedi-psych-kb-frontend.pages.dev
- **API**: https://pedi-app-prod.devadmin-27f.workers.dev

## Monitoring Features

### 1. Health Checks
- Frontend availability monitoring
- API endpoint monitoring
- Response time tracking
- Error detection

### 2. Alerting
- Email alerts (configure SMTP settings)
- Webhook alerts (configure webhook URL)
- Configurable failure thresholds
- Consecutive failure counting

### 3. Configuration

Edit `monitor.js` to configure:
- Email recipients: `ALERT_CONFIG.email.recipients`
- SMTP settings: `ALERT_CONFIG.email.smtp`
- Webhook URL: `ALERT_CONFIG.webhook.url`
- Response time threshold: `ALERT_CONFIG.thresholds.responseTime`
- Failure threshold: `ALERT_CONFIG.thresholds.consecutiveFailures`

## Setting Up Email Alerts

1. Get an app password from your email provider (Gmail, Outlook, etc.)
2. Update the SMTP configuration in `monitor.js`
3. Set `ALERT_CONFIG.email.enabled = true`
4. Add recipient emails to `ALERT_CONFIG.email.recipients`

## Setting Up Webhook Alerts

1. Create a webhook endpoint that accepts POST requests
2. Update the webhook URL in `monitor.js`
3. Set `ALERT_CONFIG.webhook.enabled = true`

## Running in Production

For production monitoring, consider:
- Running on a separate server/service
- Using a process manager like PM2
- Setting up log rotation
- Configuring proper email/webhook endpoints

## Current Status

✅ **All services deployed successfully:**
- Frontend: https://d29ad10a.pedi-psych-kb-frontend.pages.dev
- API Services: https://pedi-app-prod.devadmin-27f.workers.dev

✅ **Environment configured with:**
- Admin emails: satish@skids.health, hello@skids.health
- Production KV namespaces and D1 databases
- JWT authentication enabled

## Next Steps

1. Set up custom domains (when ready)
2. Configure email/webhook alerts
3. Set up log monitoring
4. Configure backup strategies
5. Set up performance monitoring