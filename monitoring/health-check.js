/**
 * Health Check Monitoring Script
 * Run this periodically to check application health
 */

const HEALTH_CHECK_ENDPOINTS = {
  frontend: 'https://d29ad10a.pedi-psych-kb-frontend.pages.dev',
  api: 'https://pedi-app-prod.devadmin-27f.workers.dev/api/kb/search?q=test&language=en&role=parent&limit=1'
};

async function checkHealth() {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check Frontend
  try {
    const frontendResponse = await fetch(HEALTH_CHECK_ENDPOINTS.frontend);
    results.checks.frontend = {
      status: frontendResponse.ok ? 'healthy' : 'unhealthy',
      statusCode: frontendResponse.status,
      responseTime: Date.now()
    };
  } catch (error) {
    results.checks.frontend = {
      status: 'error',
      error: error.message,
      responseTime: Date.now()
    };
  }

  // Check API (will likely return 401 due to auth, but that's expected)
  try {
    const apiResponse = await fetch(HEALTH_CHECK_ENDPOINTS.api);
    results.checks.api = {
      status: apiResponse.status < 500 ? 'healthy' : 'unhealthy',
      statusCode: apiResponse.status,
      responseTime: Date.now()
    };
  } catch (error) {
    results.checks.api = {
      status: 'error',
      error: error.message,
      responseTime: Date.now()
    };
  }

  return results;
}

// If running as a script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkHealth };
}

// Example usage:
// checkHealth().then(results => console.log(JSON.stringify(results, null, 2)));