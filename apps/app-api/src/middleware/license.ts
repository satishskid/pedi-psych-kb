import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { LicenseStatus, LicenseFeatures, LicenseValidationResult } from '@pedi-psych/shared';
import type { Env } from '../index';
import type { LicenseFeature } from '@pedi-psych/shared';

export interface LicenseMiddlewareOptions {
  requiredFeatures?: LicenseFeature[];
  requiredRoles?: string[];
  checkUsage?: boolean;
  checkExpiry?: boolean;
}

// Helper function to track API usage
export async function trackAPIUsage(
  db: D1Database,
  userId: number,
  endpoint: string,
  method: string,
  statusCode: number = 200,
  responseTimeMs: number = 0
): Promise<void> {
  // Simplified API usage tracking - no complex validation
  try {
    const usageDate = new Date().toISOString().slice(0, 10);
    
    await db.prepare(`
      INSERT INTO api_usage (
        user_id, endpoint, method, status_code, response_time_ms, usage_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId || 0, // Handle undefined userId
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      usageDate
    ).run();
  } catch (error) {
    // Don't throw errors for API tracking - just log
    console.error('API usage tracking failed (non-blocking):', error);
  }
}

/**
 * Simplified license validation middleware
 * Focus on role-based access with minimal complexity
 */
export function licenseMiddleware(options: LicenseMiddlewareOptions = {}) {
  return async (c: Context<any>, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' });
    }

    // Simple role-based access - no complex license validation
    console.log('User role:', user.role, 'Required roles:', options.requiredRoles);
    
    // Check role requirements if specified
    if (options.requiredRoles && !options.requiredRoles.includes(user.role)) {
      throw new HTTPException(403, { 
        message: 'Insufficient role permissions'
      });
    }

    // Create a simple license object for compatibility
    const simpleLicense = {
      is_valid: true,
      status: 'active',
      features: ['BASIC_ACCESS'], // All users get basic access
      usage_stats: {
        current_usage: 0,
        max_usage: 1000,
        remaining_usage: 1000,
        api_calls_this_month: 0,
        max_api_calls: 1000,
      },
      errors: []
    };

    // Store license info in context for compatibility
    c.set('license', simpleLicense);
    
    // Continue to next middleware/handler
    await next();
  };
}

/**
 * Validate user license and return validation result
 */
export async function validateUserLicense(
  db: D1Database,
  userId: string,
  options: LicenseMiddlewareOptions = {}
): Promise<LicenseValidationResult> {
  try {
    // Get user's active license
    const licenseResult = await db.prepare(`
      SELECT l.*, lt.name as license_type_name, lt.features, lt.max_api_calls_per_month,
             lt.has_personalization, lt.has_byok_support, lt.max_users
      FROM user_licenses ul
      JOIN licenses l ON ul.license_id = l.id
      JOIN license_types lt ON l.license_type_id = lt.id
      WHERE ul.user_id = ? AND l.status = ? AND l.expires_at > datetime('now')
      ORDER BY ul.is_primary DESC, l.created_at DESC
      LIMIT 1
    `).bind(userId, LicenseStatus.ACTIVE).first();

    if (!licenseResult) {
      return {
        is_valid: false,
        status: LicenseStatus.EXPIRED,
        features: [],
        usage_stats: {
          current_usage: 0,
          max_usage: 0,
          remaining_usage: 0,
          api_calls_this_month: 0,
          max_api_calls: 0,
        },
        errors: ['No active license found']
      };
    }

    const license = licenseResult as any;
    const features = JSON.parse(license.features || '[]') as LicenseFeature[];
    
    // Check license expiry
    if (new Date(license.expires_at) < new Date()) {
      return {
        is_valid: false,
        status: LicenseStatus.EXPIRED,
        features: features as LicenseFeature[],
        usage_stats: {
          current_usage: license.usage_count || 0,
          max_usage: license.max_usage_count || 0,
          remaining_usage: 0,
          api_calls_this_month: 0,
          max_api_calls: license.max_api_calls_per_month || 0,
        },
        errors: ['License has expired']
      };
    }

    // Check usage limits if required
    if (options.checkUsage && license.max_usage_count) {
      if (license.usage_count >= license.max_usage_count) {
        return {
          is_valid: false,
          status: license.status as LicenseStatus,
          features: features as LicenseFeature[],
          usage_stats: {
            current_usage: license.usage_count,
            max_usage: license.max_usage_count,
            remaining_usage: 0,
            api_calls_this_month: 0,
            max_api_calls: license.max_api_calls_per_month || 0,
          },
          errors: ['Usage limit exceeded']
        };
      }
    }

    // Check API usage this month if required
    let apiCallsThisMonth = 0;
    if (options.checkUsage && license.max_api_calls_per_month) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const usageResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM api_usage
        WHERE user_id = ? AND strftime('%Y-%m', usage_date) = ?
      `).bind(userId, currentMonth).first();
      
      apiCallsThisMonth = Number(usageResult?.count) || 0;
      
      if (apiCallsThisMonth >= license.max_api_calls_per_month) {
        return {
          is_valid: false,
          status: license.status as LicenseStatus,
          features: features as LicenseFeature[],
          usage_stats: {
            current_usage: license.usage_count,
            max_usage: license.max_usage_count || 0,
            remaining_usage: (license.max_usage_count || 0) - license.usage_count,
            api_calls_this_month: apiCallsThisMonth,
            max_api_calls: license.max_api_calls_per_month,
          },
          errors: ['Monthly API call limit exceeded']
        };
      }
    }

    return {
      is_valid: true,
      status: license.status as LicenseStatus,
      license_type: {
        id: license.license_type_id,
        name: license.license_type_name,
        description: license.description,
        features,
        max_users: license.max_users,
        max_api_calls_per_month: license.max_api_calls_per_month,
        has_personalization: license.has_personalization,
        has_byok_support: license.has_byok_support,
        is_active: license.is_active,
        created_at: license.created_at,
        updated_at: license.updated_at,
      },
      expires_at: license.expires_at,
      features: features as LicenseFeature[],
      usage_stats: {
        current_usage: license.usage_count,
        max_usage: license.max_usage_count || 0,
        remaining_usage: (license.max_usage_count || 0) - license.usage_count,
        api_calls_this_month: apiCallsThisMonth,
        max_api_calls: license.max_api_calls_per_month || 0,
      },
      errors: []
    };
    
  } catch (error) {
    console.error('License validation error:', error);
    return {
      is_valid: false,
      status: LicenseStatus.EXPIRED,
      features: [],
      usage_stats: {
        current_usage: 0,
        max_usage: 0,
        remaining_usage: 0,
        api_calls_this_month: 0,
        max_api_calls: 0,
      },
      errors: ['License validation system error']
    };
  }
}



/**
 * Check if user has specific license feature
 */
export function hasLicenseFeature(
  c: Context<any>,
  feature: LicenseFeature
): boolean {
  const license = c.get('license') as LicenseValidationResult;
  return license?.features.includes(feature) || false;
}

/**
 * Get remaining license usage
 */
export function getRemainingLicenseUsage(
  c: Context<any>
): { usage: number; remaining: number; total: number } {
  const license = c.get('license') as LicenseValidationResult;
  if (!license) {
    return { usage: 0, remaining: 0, total: 0 };
  }
  
  return {
    usage: license.usage_stats.current_usage,
    remaining: license.usage_stats.remaining_usage,
    total: license.usage_stats.max_usage
  };
}