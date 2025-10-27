import { Hono, Context as HonoContext } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Policy, User, SearchQuery, Card, ExportRequest } from '@pedi-psych/shared'
import { policySchema, exportRequestSchema } from '@pedi-psych/shared'
import { rbacManager } from './rbac'
import { exportService } from './export'

export interface Env {
  POLICY_STORE: KVNamespace
  USER_STORE: KVNamespace
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

// Login endpoint (no JWT required) - place before JWT middleware
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

app.post('/auth/login', zValidator('json', LoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')
    
    // For demo purposes, accept hardcoded admin credentials
    if (email === 'admin@example.com' && password === 'admin123') {
      const token = await jwt.sign({
        userId: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        tenantId: 'default',
        createdAt: new Date().toISOString()
      }, c.env.JWT_SECRET)
      
      return c.json({
        token,
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          tenant_id: 'default'
        }
      })
    }
    
    // Check against stored users (for non-admin users)
    const userData = await c.env.POLICY_STORE.get(`user:${email}`)
    if (userData) {
      const user = JSON.parse(userData)
      // In a real app, verify password hash
      if (password === 'demo123') { // Demo password
        const token = await jwt.sign({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          createdAt: user.created_at
        }, c.env.JWT_SECRET)
        
        return c.json({
          token,
          user: user
        })
      }
    }
    
    return c.json({ error: 'Invalid credentials' }, 401)
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Apply JWT middleware to all /api/* routes EXCEPT /api/auth/login
app.use('/api/*', async (c, next) => {
  // Skip JWT for login endpoint
  if (c.req.path === '/api/auth/login') {
    return next()
  }
  
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  })
  return jwtMiddleware(c, next)
})

// Helper function to get user from JWT token
function getUserFromContext(c: HonoContext): User {
  const payload = c.get('jwtPayload')
  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tenant_id: payload.tenantId,
    created_at: payload.createdAt || new Date().toISOString(),
    updated_at: payload.updatedAt || new Date().toISOString()
  }
}

// Policy management endpoints
const CreatePolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  effect: z.enum(['allow', 'deny']),
  actions: z.array(z.string().min(1)),
  resources: z.array(z.string().min(1)),
  conditions: z.record(z.any()).optional()
})

app.post('/api/policies', zValidator('json', CreatePolicySchema), async (c) => {
  try {
    const user = getUserFromContext(c)
    const data = c.req.valid('json')

    // Check if user has admin permissions
    if (!rbacManager.evaluatePermission(user, 'policies', 'write')) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const policy: Policy = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      effect: data.effect,
      actions: data.actions,
      resources: data.resources,
      conditions: data.conditions || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store in KV
    await c.env.POLICY_STORE.put(`policy:${policy.id}`, JSON.stringify(policy))
    
    // Update RBAC manager
    rbacManager.upsertPolicy(policy)
    
    return c.json(policy, 201)
  } catch (error) {
    console.error('Error creating policy:', error)
    return c.json({ error: 'Failed to create policy' }, 500)
  }
})

app.get('/api/policies', async (c) => {
  try {
    const user = getUserFromContext(c)

    // Check if user has permission to read policies
    if (!rbacManager.evaluatePermission(user, 'policies', 'read')) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const list = await c.env.POLICY_STORE.list({ prefix: 'policy:' })
    const policies: Policy[] = []
    
    for (const key of list.keys) {
      const policyData = await c.env.POLICY_STORE.get(key.name)
      if (policyData) {
        const policy = JSON.parse(policyData)
        // Only return policies for user's tenant
        if (policy.tenant_id === user.tenant_id) {
          policies.push(policy)
        }
      }
    }
    
    return c.json(policies)
  } catch (error) {
    console.error('Error fetching policies:', error)
    return c.json({ error: 'Failed to fetch policies' }, 500)
  }
})

app.get('/api/policies/:id', async (c) => {
  try {
    const user = getUserFromContext(c)
    const policyId = c.req.param('id')

    // Check if user has permission to read policies
    if (!rbacManager.evaluatePermission(user, 'policies', 'read')) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const policyData = await c.env.POLICY_STORE.get(`policy:${policyId}`)
    if (!policyData) {
      return c.json({ error: 'Policy not found' }, 404)
    }

    const policy = JSON.parse(policyData)
    
    // Check tenant isolation
    if (policy.tenant_id !== user.tenant_id) {
      return c.json({ error: 'Access denied' }, 403)
    }

    return c.json(policy)
  } catch (error) {
    console.error('Error fetching policy:', error)
    return c.json({ error: 'Failed to fetch policy' }, 500)
  }
})

app.delete('/api/policies/:id', async (c) => {
  try {
    const user = getUserFromContext(c)
    const policyId = c.req.param('id')

    // Check if user has admin permissions
    if (!rbacManager.evaluatePermission(user, 'policies', 'delete')) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const policyData = await c.env.POLICY_STORE.get(`policy:${policyId}`)
    if (!policyData) {
      return c.json({ error: 'Policy not found' }, 404)
    }

    const policy = JSON.parse(policyData)
    
    // Check tenant isolation
    if (policy.tenant_id !== user.tenant_id) {
      return c.json({ error: 'Access denied' }, 403)
    }

    await c.env.POLICY_STORE.delete(`policy:${policyId}`)
    rbacManager.deletePolicy(policyId)
    
    return c.json({ message: 'Policy deleted successfully' })
  } catch (error) {
    console.error('Error deleting policy:', error)
    return c.json({ error: 'Failed to delete policy' }, 500)
  }
})

// RBAC evaluation endpoint
const RBACEvaluateSchema = z.object({
  action: z.string().min(1),
  resource: z.string().min(1),
  context: z.record(z.any()).optional()
})

app.post('/api/rbac/evaluate', zValidator('json', RBACEvaluateSchema), async (c) => {
  try {
    const user = getUserFromContext(c)
    const data = c.req.valid('json')

    const isAllowed = rbacManager.evaluatePermission(
      user,
      data.resource,
      data.action,
      data.context
    )
    
    return c.json({ 
      allowed: isAllowed,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id
      },
      action: data.action,
      resource: data.resource
    })
  } catch (error) {
    console.error('Error evaluating RBAC:', error)
    return c.json({ error: 'RBAC evaluation failed' }, 500)
  }
})

// Export endpoints
app.post('/api/export', zValidator('json', exportRequestSchema), async (c) => {
  try {
    const user = getUserFromContext(c)
    const data = c.req.valid('json')

    // Check if user has export permission
    if (!rbacManager.evaluatePermission(user, 'export', 'create')) {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Validate export options
    const options = exportService.validateExportOptions({
      format: data.format,
      language: data.language,
      includeMetadata: data.includeMetadata || false,
      template: data.template || 'default'
    })

    // Fetch cards from storage (this would be from your card storage)
    const cards: Card[] = []
    for (const cardId of data.cardIds) {
      const cardData = await c.env.POLICY_STORE.get(`card:${cardId}`)
      if (cardData) {
        const card = JSON.parse(cardData)
        // Check tenant isolation for cards
        if (card.tenantId === user.tenantId) {
          cards.push(card)
        }
      }
    }

    if (cards.length === 0) {
      return c.json({ error: 'No cards found or access denied' }, 404)
    }

    let result: Buffer | string

    switch (options.format) {
      case 'html':
        result = await exportService.exportToHTML(cards, user, options)
        break
      case 'pdf':
        // For now, generate HTML and return as string
        // In production, you would convert to PDF
        result = await exportService.exportToHTML(cards, user, options)
        break
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }

    // Store export request for tracking
    const exportRequest = {
      id: crypto.randomUUID(),
      userId: user.id,
      cardIds: data.cardIds,
      format: options.format,
      status: 'completed',
      resultUrl: `export:${crypto.randomUUID()}`,
      tenantId: user.tenant_id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await c.env.POLICY_STORE.put(`export:${exportRequest.id}`, JSON.stringify(exportRequest))
    
    // Store the actual export result
    await c.env.POLICY_STORE.put(exportRequest.resultUrl, typeof result === 'string' ? result : result.toString())

    return c.json({
      exportId: exportRequest.id,
      format: options.format,
      cardCount: cards.length,
      downloadUrl: `/api/export/download/${exportRequest.id}`
    })
  } catch (error) {
    console.error('Error creating export:', error)
    if (error instanceof Error && error.message.includes('Invalid')) {
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Export failed' }, 500)
  }
})

app.get('/api/export/download/:id', async (c) => {
  try {
    const user = getUserFromContext(c)
    const exportId = c.req.param('id')

    const exportData = await c.env.POLICY_STORE.get(`export:${exportId}`)
    if (!exportData) {
      return c.json({ error: 'Export not found' }, 404)
    }

    const exportRequest: ExportRequest = JSON.parse(exportData)
    
    // Check tenant isolation
    if (exportRequest.userId !== user.id && exportRequest.tenantId !== user.tenantId) {
      return c.json({ error: 'Access denied' }, 403)
    }

    if (!exportRequest.resultUrl) {
      return c.json({ error: 'Export result not available' }, 404)
    }

    const resultData = await c.env.POLICY_STORE.get(exportRequest.resultUrl)
    if (!resultData) {
      return c.json({ error: 'Export data not found' }, 404)
    }

    // Set appropriate headers for file download
    const filename = `export-${exportId}.${exportRequest.format}`
    const contentType = exportRequest.format === 'html' ? 'text/html' : 'application/octet-stream'

    return new Response(resultData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error downloading export:', error)
    return c.json({ error: 'Download failed' }, 500)
  }
})

// User permissions endpoint
app.get('/api/user/permissions', async (c) => {
  try {
    const user = getUserFromContext(c)
    
    // Get user's policies
    const userPolicies = rbacManager.getUserPolicies(user)
    
    // Test common permissions
    const permissions = {
      canReadCards: rbacManager.evaluatePermission(user, 'cards', 'read'),
      canWriteCards: rbacManager.evaluatePermission(user, 'cards', 'write'),
      canExport: rbacManager.evaluatePermission(user, 'export', 'create'),
      canManagePolicies: rbacManager.evaluatePermission(user, 'policies', 'write'),
      canManageUsers: rbacManager.evaluatePermission(user, 'users', 'write')
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id
      },
      permissions,
      policies: userPolicies.map(p => ({
        id: p.id,
        name: p.name,
        resources: p.resources,
        actions: p.actions
      }))
    })
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return c.json({ error: 'Failed to get permissions' }, 500)
  }
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    service: 'ops-api',
    timestamp: new Date().toISOString()
  })
})

export default app