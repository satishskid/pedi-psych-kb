import { describe, it, expect } from 'vitest'
import app from '../apps/app-api/src/index'

class MemoryKV {
  private store = new Map<string, string>()
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
  async list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>{
    const prefix = options?.prefix || ''
    const keys: { name: string }[] = []
    for (const key of this.store.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        keys.push({ name: key })
      }
    }
    return { keys }
  }
}

// Mock database for testing
function createMockDb() {
  return {
    prepare(sql: string) {
      return {
        bind: (...params: any[]) => {
          return {
            first: async () => {
              // Mock admin user for login
              if (sql.includes('FROM users WHERE email = ?') && params[0] === 'admin@example.com') {
                return {
                  id: '1',
                  email: 'admin@example.com',
                  password_hash: '$2b$10$jivahGdaL.t0RaP873Lp6ek2c9Sr6aJFhV/KElqKSRcNJEOuTrpuG', // bcrypt hash for 'admin123'
                  name: 'Admin User',
                  role: 'admin',
                  tenant_id: '1',
                  created_at: '2025-10-28 00:53:10',
                  updated_at: '2025-10-30T11:46:59.314Z'
                };
              }
              // License check
              if (sql.includes('FROM user_licenses ul') && sql.includes('JOIN licenses l') && sql.includes('JOIN license_types lt')) {
                return {
                  status: 'active',
                  license_type_name: 'basic'
                };
              }
              return null;
            },
            run: async () => ({ success: true }),
            all: async () => ({ results: [] })
          };
        },
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true })
      };
    }
  } as any;
}

const env = {
  POLICY_STORE: new MemoryKV(),
  USER_STORE: new MemoryKV(),
  JWT_SECRET: 'test-secret',
  DB: createMockDb()
}

describe('RBAC and permissions', () => {
  it('admin login returns token', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    }, env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBeTypeOf('string')
    expect(json.user.role).toBe('admin')
  })

  it('admin has broad permissions', async () => {
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    }, env)
    const { token } = await loginRes.json()
    
    const permRes = await app.request('/api/user/permissions', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, env)
    expect(permRes.status).toBe(200)
    const perm = await permRes.json()
    expect(perm.permissions.canReadCards).toBe(true)
    expect(perm.permissions.canWriteCards).toBe(true)
    expect(perm.permissions.canExport).toBe(true)
    expect(perm.permissions.canManagePolicies).toBe(true)
    expect(perm.permissions.canManageUsers).toBe(true)

    const evalRes = await app.request('/api/rbac/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'write', resource: 'cards' })
    }, env)
    expect(evalRes.status).toBe(200)
    const evalJson = await evalRes.json()
    expect(evalJson.allowed).toBe(true)
  })
})