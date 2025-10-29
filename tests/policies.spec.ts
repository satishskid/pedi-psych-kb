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

describe('Policy CRUD', () => {
  it('creates, lists, gets, and deletes a policy', async () => {
    // Login as admin
    const loginRes = await app.request('/auth/login', {
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