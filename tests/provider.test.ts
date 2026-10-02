import test from 'node:test';
import assert from 'node:assert/strict';
import { providerWork } from '../server/providerWork';

test('provider work deduplicates concurrent requests, caches success and retries failures', async () => {
  let calls = 0;
  const work = async () => { calls++; return 42; };
  assert.deepEqual(await Promise.all([providerWork('test:cache', {}, work), providerWork('test:cache', {}, work)]), [42, 42]);
  assert.equal(await providerWork('test:cache', {}, work), 42);
  assert.equal(calls, 1);
  await assert.rejects(providerWork('test:failure', {}, async () => { throw new Error('failed'); }));
  assert.equal(await providerWork('test:failure', {}, work), 42);
});
test('zero AI budget prevents paid work', async () => {
  const previous = process.env.AI_DAILY_REQUEST_LIMIT;
  process.env.AI_DAILY_REQUEST_LIMIT = '0';
  let called = false;
  try {
    await assert.rejects(providerWork('ai:disabled', {}, async () => { called = true; }), /daily request limit/);
    assert.equal(called, false);
  } finally {
    if (previous === undefined) delete process.env.AI_DAILY_REQUEST_LIMIT;
    else process.env.AI_DAILY_REQUEST_LIMIT = previous;
  }
});
