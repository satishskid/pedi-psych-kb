import { expect, test } from 'vitest';

async function getJson(url: string) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  expect(res.status).toBe(200);
  const json = await res.json();
  return json as { status: string; database?: string };
}

test('default worker health is healthy', async () => {
  const json = await getJson('https://pedi-psych-app.devadmin-27f.workers.dev/api/health');
  expect(json.status).toBe('healthy');
  expect(json.database).toBe('connected');
});

test('production worker health is healthy', async () => {
  const json = await getJson('https://pedi-app-prod.devadmin-27f.workers.dev/api/health');
  expect(json.status).toBe('healthy');
  expect(json.database).toBe('connected');
});