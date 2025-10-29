import { describe, it, expect } from 'vitest'
import app from '../apps/ops-api/src/index'

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

const env = {
  POLICY_STORE: new MemoryKV(),
  USER_STORE: new MemoryKV(),
  JWT_SECRET: 'test-secret',
}

describe('RBAC and permissions', () => {
  it('admin login returns token', async () => {
    const res = await app.request('/auth/login', {
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
    const loginRes = await app.request('/auth/login', {
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