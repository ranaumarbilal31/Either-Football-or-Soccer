import { createHash } from 'node:crypto';

// Bounds both parallel provider work and repeated paid requests. Per process;
// provider-side spending quotas remain the final limit across restarts/replicas.
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
let day = new Date().toISOString().slice(0, 10);
let aiRequests = 0;
export async function providerWork<T>(scope: string, input: unknown, work: () => Promise<T>): Promise<T> {
  const key = scope + createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
  const cached = cache.get(key);
  if (cached) return cached.value as T;
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  if (pending.size >= 4) throw new Error('Provider concurrency limit reached');
  const today = new Date().toISOString().slice(0, 10);
  if (day !== today) { day = today; aiRequests = 0; }
  const limit = Number(process.env.AI_DAILY_REQUEST_LIMIT || 200);
  if (scope.startsWith('ai:') && (!Number.isInteger(limit) || limit < 0 || aiRequests >= limit)) throw new Error('AI daily request limit reached');
  if (scope.startsWith('ai:')) aiRequests++;
  const task = Promise.resolve().then(work).then(value => {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + 5 * 60_000 });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
