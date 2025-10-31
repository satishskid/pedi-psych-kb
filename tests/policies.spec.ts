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

describe('Policy CRUD', () => {
  it('creates, lists, gets, and deletes a policy', async () => {
    // Login as admin
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    }, env)
    expect(loginRes.status).toBe(200)
    const { token } = await loginRes.json()

    // Create policy
    const createRes = await app.request('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Test Policy',
        description: 'Allows reading cards',
        effect: 'allow',
        actions: ['read'],
        resources: ['cards'],
        conditions: { tenant_id: 'default' },
      })
    }, env)
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created.id).toBeTypeOf('string')

    // List policies
    const listRes = await app.request('/api/policies', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, env)
    expect(listRes.status).toBe(200)
    const list = await listRes.json()
    expect(Array.isArray(list)).toBe(true)
    expect(list.some((p: any) => p.id === created.id)).toBe(true)

    // Get policy by id
    const getRes = await app.request(`/api/policies/${created.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, env)
    expect(getRes.status).toBe(200)
    const fetched = await getRes.json()
    expect(fetched.id).toBe(created.id)

    // Delete policy
    const delRes = await app.request(`/api/policies/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }, env)
    expect(delRes.status).toBe(200)

    // Confirm deletion
    const getResAfter = await app.request(`/api/policies/${created.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, env)
    expect(getResAfter.status).toBe(404)
  })
})