import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app } from '../server';
import { simulateMatch, OPPOSITION_TEAMS } from '../src/utils/simulation';

test('API fallback, validation, origin checks, JSON errors and throttling', async () => {
  const previous = process.env.GEMINI_API_KEY;
  const previousRapid = process.env.RAPIDAPI_KEY;
  process.env.GEMINI_API_KEY = '';
  process.env.RAPIDAPI_KEY = '';
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-powered-by'), null);
    assert.equal((await fetch(base + '/api/missing')).status, 404);
    const response = await fetch(base + '/api/search-players?search=Messi');
    const search = await response.json();
    assert.equal(search.source, 'demo');
    assert.ok(search.players[0].id);
    assert.equal((await fetch(base + '/api/search-players?search[x]=a')).status, 400);
    assert.equal((await post('/api/enrich-player', { name: 'x', position: 'invalid' })).status, 400);
    assert.equal((await post('/api/coach-summary', { matchResult: {} })).status, 400);
    assert.equal((await post('/api/coach-summary', null)).status, 400);
    const enriched = await (await post('/api/enrich-player', search.players[0])).json();
    assert.equal(enriched.position, 'FWD');
    assert.equal(enriched.source, 'demo');
    const tactics = { formation: '4-3-3' as const, defensiveLine: 0, tempo: 0, pressingIntensity: 0 };
    const matchResult = simulateMatch([], tactics, OPPOSITION_TEAMS[0], 0, {});
    const coach = await (await post('/api/coach-summary', { matchResult, tactics, chemistry: 0 })).json();
    assert.equal(coach.source, 'local');
    assert.match(coach.summary, /D-Line: 0\/100/);
    assert.equal((await fetch(base + '/api/search-players?search=x', { headers: { Origin: 'https://other.example' } })).status, 403);
    assert.equal((await fetch(base + '/api/search-players?search=x', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.equal((await fetch(base + '/api/enrich-player', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    let last: Response | undefined;
    for (let i = 0; i < 32; i++) last = await fetch(base + '/api/search-players?search=x');
    assert.equal(last?.status, 429);
    assert.ok(last?.headers.get('retry-after'));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous;
    if (previousRapid === undefined) delete process.env.RAPIDAPI_KEY; else process.env.RAPIDAPI_KEY = previousRapid;
  }
});
