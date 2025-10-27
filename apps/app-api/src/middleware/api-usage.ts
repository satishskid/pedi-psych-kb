import { Context, Next } from 'hono';
import { Env } from '../index';

/**
 * API Usage Tracking Middleware
 * Tracks API usage for analytics and rate limiting
 */
export function apiUsageMiddleware() {
  return async (c: Context<Env>, next: Next) => {
    const startTime = Date.now();
    
    // Add a response header to indicate middleware was called
    c.res.headers.set('X-API-Usage-Tracked', 'false');
    
    // Let the request proceed
    await next();
    
    // Track usage after response
    const responseTime = Date.now() - startTime;
    const user = c.get('user');
    
    if (user) {
      try {
        // Insert API usage record
        await c.env.DB.prepare(`
          INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms, usage_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          user.id,
          c.req.path,
          c.req.method,
          c.res.status,
          responseTime,
          new Date().toISOString().slice(0, 10) // YYYY-MM-DD format
        ).run();
        c.res.headers.set('X-API-Usage-Tracked', 'true');
      } catch (error) {
        console.error('Failed to track API usage:', error);
        // Don't fail the request if tracking fails
      }
    }
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