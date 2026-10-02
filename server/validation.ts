import type { RequestHandler } from 'express';
import { inRange, isRecord, isTactics, isText } from '../src/utils/validation';

// This is a public API, not user authentication. Keep credentials server-side.
const requests = new Map<string, number>();
let windowStart = Date.now();
let globalRequests = 0;
export const apiSecurityMiddleware: RequestHandler = (req, res, next) => {
  if (req.get('sec-fetch-site') === 'cross-site') return void res.status(403).json({ error: 'Cross-site requests are not allowed' });
  const origin = req.get('origin');
  if (origin) {
    try {
      const expectedOrigin = process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
      if (new URL(origin).origin !== new URL(expectedOrigin).origin) return void res.status(403).json({ error: 'Cross-origin requests are not allowed' });
    } catch { return void res.status(403).json({ error: 'Invalid origin' }); }
  }
  const now = Date.now();
  if (now - windowStart >= 60000) { windowStart = now; globalRequests = 0; requests.clear(); }
  const key = req.ip || 'unknown';
  const count = (requests.get(key) || 0) + 1;
  if (globalRequests >= 300 || count > 30) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((windowStart + 60000 - now) / 1000))));
    return void res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
  globalRequests++;
  requests.set(key, count);
  next();
};

export function validateCoachRequest(body: unknown): boolean {
  if (!isRecord(body) || !isTactics(body.tactics) || !inRange(body.chemistry, 0, 100)) return false;
  const match = body.matchResult;
  if (!isRecord(match) || !isText(match.awayTeamName) || ![match.homeScore, match.awayScore].every(v => inRange(v, 0, 100) && Number.isInteger(v))) return false;
  if (!Array.isArray(match.events) || match.events.length > 500 || !match.events.every((e: unknown) => isRecord(e) && inRange(e.minute, 0, 130) && typeof e.type === 'string' && typeof e.description === 'string' && e.description.length <= 2000)) return false;
  if (!isRecord(match.stats) || !inRange(match.stats.possession, 0, 100)) return false;
  return ['shots', 'shotsOnTarget', 'xG', 'passes', 'passAccuracy'].every(key => {
    const pair = match.stats[key];
    return isRecord(pair) && ['home', 'away'].every(side => inRange(pair[side], 0, key === 'passAccuracy' ? 100 : 10000));
  });
}
