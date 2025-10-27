import { Policy, User } from '@pedi-psych/shared'

export class RBACManager {
  private policies: Map<string, Policy> = new Map()

  constructor() {
    this.initializeDefaultPolicies()
  }

  private initializeDefaultPolicies(): void {
    // Default policies that will be loaded from database
    const defaultPolicies: Policy[] = [
      {
        id: 'admin-full-access',
        name: 'Admin Full Access',
        effect: 'allow',
        actions: ['*'],
        resources: ['*'],
        conditions: { role: 'admin' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'editor-content-access',
        name: 'Editor Content Access',
        effect: 'allow',
        actions: ['read', 'write'],
        resources: ['cards'],
        conditions: { role: 'editor' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'viewer-read-only',
        name: 'Viewer Read Only',
        effect: 'allow',
        actions: ['read'],
        resources: ['cards'],
        conditions: { role: 'viewer' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy)
    })
  }

  /**
   * Load policies from database
   */
  async loadPolicies(policies: Policy[]): Promise<void> {
    this.policies.clear()
    policies.forEach(policy => {
      this.policies.set(policy.id, policy)
    })
  }

  /**
   * Check if a user has permission for a specific resource and action
   */
  evaluatePermission(
    user: User,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Check each policy
    for (const policy of this.policies.values()) {
      if (this.matchesPolicy(user, policy, resource, action, context)) {
        return true
      }
    }
    return false
  }

  /**
   * Check if a user matches a specific policy
   */
  private matchesPolicy(
    user: User,
    policy: Policy,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Check tenant isolation
    if (user.tenant_id !== policy.tenant_id) {
      return false
    }

    // Check resource match (supports wildcards)
    if (!this.matchesResource(policy.resources, resource)) {
      return false
    }

    // Check action match (supports multiple actions)
    if (!this.matchesAction(policy.actions, action)) {
      return false
    }

    // Check conditions
    if (!this.matchesConditions(user, policy.conditions, context)) {
      return false
    }

    return true
  }

  /**
   * Check if resource matches policy resource (supports wildcards)
   */
  private matchesResource(policyResource: string, requestedResource: string): boolean {
    if (policyResource === '*') {
      return true
    }
    
    // Support for resource patterns like "cards:*" or "cards:123"
    if (policyResource.includes('*')) {
      const pattern = policyResource.replace('*', '.*')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(requestedResource)
    }
    
    return policyResource === requestedResource
  }

  /**
   * Check if action matches policy action (supports multiple actions)
   */
  private matchesAction(policyAction: string, requestedAction: string): boolean {
    const allowedActions = policyAction.split(',').map(a => a.trim())
    return allowedActions.includes('*') || allowedActions.includes(requestedAction)
  }

  /**
   * Check if user and context match policy conditions
   */
  private matchesConditions(
    user: User,
    conditions: Record<string, any>,
    context?: Record<string, any>
  ): boolean {
    const evaluationContext = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      },
      ...context
    }

    return this.evaluateConditionExpression(conditions, evaluationContext)
  }

  /**
   * Evaluate condition expressions
   */
  private evaluateConditionExpression(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getNestedValue(context, key)
      
      if (!this.compareValues(actualValue, expectedValue)) {
        return false
      }
    }
    return true
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Compare actual value with expected value (supports arrays and wildcards)
   */
  private compareValues(actualValue: any, expectedValue: any): boolean {
    // Handle array conditions (user role in ["admin", "editor"])
    if (Array.isArray(expectedValue)) {
      return expectedValue.includes(actualValue)
    }
    
    // Handle wildcard conditions
    if (expectedValue === '*') {
      return actualValue !== undefined && actualValue !== null
    }
    
    // Handle dynamic conditions (e.g., "user.tenant_id === resource.tenant_id")
    if (typeof expectedValue === 'string' && expectedValue.startsWith('context.')) {
      const contextKey = expectedValue.replace('context.', '')
      return actualValue === contextKey
    }
    
    return actualValue === expectedValue
  }

  /**
   * Get all policies for a user
   */
  getUserPolicies(user: User): Policy[] {
    return Array.from(this.policies.values()).filter(policy => 
      user.tenantId === policy.tenantId
    )
  }

  /**
   * Add or update a policy
   */
  upsertPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy)
  }

  /**
   * Delete a policy
   */
  deletePolicy(policyId: string): boolean {
    return this.policies.delete(policyId)
  }

  /**
   * Get all policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values())
  }

  /**
   * Create a policy from a simple rule
   */
  createPolicyFromRule(
    name: string,
    resource: string,
    action: string,
    role?: string,
    tenantId?: number,
    createdBy?: number
  ): Policy {
    const conditions: Record<string, any> = {}
    if (role) {
      conditions.role = role
    }

    return {
      id: `policy-${Date.now()}`,
      name,
      resource,
      action,
      conditions,
      tenantId: tenantId || 1,
      createdBy: createdBy || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

// Export singleton instance
export const rbacManager = new RBACManager()