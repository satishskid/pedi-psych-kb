import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../index';

// Helper function to get database instance
function getDatabase(c: any) {
  console.log('getDatabase - c.env:', c.env);
  console.log('getDatabase - c.env.DB:', c.env?.DB);
  console.log('getDatabase - c.env.DB_PROD:', c.env?.DB_PROD);
  
  if (c.env?.DB) {
    return c.env.DB;
  } else if (c.env?.DB_PROD) {
    return c.env.DB_PROD;
  }
  throw new HTTPException(500, { message: 'Database not available' });
}

/**
 * API Usage Tracking Middleware
 * Tracks API usage for analytics and rate limiting
 */
export function apiUsageMiddleware() {
  return async (c: Context<any>, next: Next) => {
    // Temporarily disabled to test if this is causing the issue
    await next();
  };
}

/**
 * Get API usage statistics for a user
 */
export async function getUserApiUsage(
  db: D1Database,
  userId: number,
  month?: string // YYYY-MM format
): Promise<{
  totalCalls: number;
  avgResponseTime: number;
  callsByEndpoint: Record<string, number>;
  callsByStatus: Record<string, number>;
}> {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  
  // Get total calls and average response time
  const totalStats = await db.prepare(`
    SELECT COUNT(*) as total_calls, AVG(response_time_ms) as avg_response_time
    FROM api_usage
    WHERE user_id = ? AND strftime('%Y-%m', usage_date) = ?
  `).bind(userId, targetMonth).first();
  
  // Get calls by endpoint
  const endpointStats = await db.prepare(`
    SELECT endpoint, COUNT(*) as count
    FROM api_usage
    WHERE user_id = ? AND strftime('%Y-%m', usage_date) = ?
    GROUP BY endpoint
  `).bind(userId, targetMonth).all();
  
  // Get calls by status code
  const statusStats = await db.prepare(`
    SELECT status_code, COUNT(*) as count
    FROM api_usage
    WHERE user_id = ? AND strftime('%Y-%m', usage_date) = ?
    GROUP BY status_code
  `).bind(userId, targetMonth).all();
  
  const callsByEndpoint: Record<string, number> = {};
  const callsByStatus: Record<string, number> = {};
  
  endpointStats.results.forEach((row: any) => {
    callsByEndpoint[row.endpoint] = row.count;
  });
  
  statusStats.results.forEach((row: any) => {
    callsByStatus[row.status_code.toString()] = row.count;
  });
  
  return {
    totalCalls: totalStats?.total_calls as number || 0,
    avgResponseTime: Math.round(totalStats?.avg_response_time as number || 0),
    callsByEndpoint,
    callsByStatus
  };
}