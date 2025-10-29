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

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const env = {
  POLICY_STORE: new MemoryKV(),
  EXPORT_STORE: new MemoryKV(),
  USER_STORE: new MemoryKV(),
  JWT_SECRET: 'test-secret',
}

describe('PDF export flow', () => {
  it('creates and downloads a PDF export', async () => {
    const cardId = uuid()
    const card = {
      id: cardId,
      title: { en: 'Test Card' },
      description: { en: 'A card for PDF export test' },
      content: { en: 'Some content' },
      category: 'general',
      tags: ['pdf', 'test'],
      target_roles: ['admin'],
      languages: ['en'],
      rtl_languages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Store card in POLICY_STORE as the handler reads from it
    await env.POLICY_STORE.put(`card:${cardId}`, JSON.stringify(card))

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    }, env)
    const { token } = await loginRes.json()

    const createRes = await app.request('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        format: 'pdf',
        language: 'en',
        includeMetadata: false,
        template: 'default',
        cardIds: [cardId]
      })
    }, env)
    expect(createRes.status).toBe(200)
    const createJson = await createRes.json()
    expect(createJson.downloadUrl).toMatch(/\/api\/export\/download\//)

    const downloadRes = await app.request(createJson.downloadUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, env)

    expect(downloadRes.status).toBe(200)
    expect(downloadRes.headers.get('Content-Type')).toBe('application/pdf')
    const bytes = new Uint8Array(await downloadRes.arrayBuffer())
    expect(bytes[0]).toBe(37) // '%'
    expect(bytes[1]).toBe(80) // 'P'
    expect(bytes[2]).toBe(68) // 'D'
    expect(bytes[3]).toBe(70) // 'F'
  })
})

describe('HTML export flow', () => {
  it('creates and downloads an HTML export', async () => {
    const cardId = uuid()
    const card = {
      id: cardId,
      title: { en: 'HTML Card' },
      description: { en: 'A card for HTML export test' },
      content: { en: 'HTML content' },
      category: 'general',
      tags: ['html', 'test'],
      target_roles: ['admin'],
      languages: ['en'],
      rtl_languages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await env.POLICY_STORE.put(`card:${cardId}`, JSON.stringify(card))

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    }, env)
    const { token } = await loginRes.json()

    const createRes = await app.request('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        format: 'html',
        language: 'en',
        includeMetadata: false,
        template: 'default',
        cardIds: [cardId]
      })
    }, env)
    expect(createRes.status).toBe(200)
    const createJson = await createRes.json()
    expect(createJson.downloadUrl).toMatch(/\/api\/export\/download\//)

    const downloadRes = await app.request(createJson.downloadUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, env)

    expect(downloadRes.status).toBe(200)
    expect(downloadRes.headers.get('Content-Type')).toBe('text/html')
    const html = await downloadRes.text()
    expect(html).toMatch(/HTML Card/)
  })
})