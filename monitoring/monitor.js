/**
 * Monitoring Dashboard and Alert System
 * Provides continuous monitoring and alerting for the application
 */

const { checkHealth } = require('./health-check');

// Simple alert configuration
const ALERT_CONFIG = {
  email: {
    enabled: false, // Set to true when you configure email
    recipients: ['satish@skids.health', 'hello@skids.health'],
    smtp: {
      // Configure your SMTP settings here
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
      }
    }
  },
  webhook: {
    enabled: false, // Set to true when you configure webhook
    url: 'https://your-webhook-url.com/alerts'
  },
  thresholds: {
    responseTime: 5000, // 5 seconds
    consecutiveFailures: 3
  }
};

let failureCount = {
  frontend: 0,
  api: 0
};

async function runMonitoring() {
  console.log(`[${new Date().toISOString()}] Running health checks...`);
  
  try {
    const results = await checkHealth();
    console.log('Health Check Results:', JSON.stringify(results, null, 2));
    
    // Check for failures and trigger alerts
    Object.entries(results.checks).forEach(([service, check]) => {
      if (check.status === 'error' || check.status === 'unhealthy') {
        failureCount[service]++;
        console.warn(`⚠️  ${service} is ${check.status} (failure count: ${failureCount[service]})`);
        
        if (failureCount[service] >= ALERT_CONFIG.thresholds.consecutiveFailures) {
          sendAlert(service, check);
          failureCount[service] = 0; // Reset after alert
        }
      } else {
        failureCount[service] = 0; // Reset on success
        console.log(`✅ ${service} is healthy`);
      }
    });
    
  } catch (error) {
    console.error('❌ Monitoring check failed:', error.message);
  }
}

function sendAlert(service, check) {
  const message = `🚨 Alert: ${service} is down!\nStatus: ${check.status}\nError: ${check.error || 'No error details'}\nTime: ${new Date().toISOString()}`;
  
  console.error(message);
  
  // Send email alert (configure SMTP settings first)
  if (ALERT_CONFIG.email.enabled) {
    sendEmailAlert(message);
  }
  
  // Send webhook alert (configure webhook URL first)
  if (ALERT_CONFIG.webhook.enabled) {
    sendWebhookAlert(message);
  }
}

function sendEmailAlert(message) {
  // Implement email sending logic here
  console.log('📧 Email alert would be sent to:', ALERT_CONFIG.email.recipients.join(', '));
}

function sendWebhookAlert(message) {
  // Implement webhook logic here
  console.log('🔗 Webhook alert would be sent to:', ALERT_CONFIG.webhook.url);
}

// Run monitoring check
if (require.main === module) {
  runMonitoring();
  
  // Set up periodic monitoring (every 5 minutes)
  const MONITORING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  setInterval(runMonitoring, MONITORING_INTERVAL);
  
  console.log(`🔄 Monitoring started. Checking every ${MONITORING_INTERVAL / 1000} seconds.`);
}

module.exports = { runMonitoring, ALERT_CONFIG };