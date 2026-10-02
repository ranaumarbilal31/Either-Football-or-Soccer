import type { Player, Tactics } from '../types';

export const isRecord = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
export const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
export const isPosition = (v: unknown) => ['GK', 'DEF', 'MID', 'FWD'].includes(v as string);
export const isTactics = (v: unknown): v is Tactics => isRecord(v) &&
  ['4-3-3', '3-5-2', '4-2-3-1', '4-4-2', '5-3-2'].includes(v.formation) &&
  ['defensiveLine', 'tempo', 'pressingIntensity'].every(k => inRange(v[k], 0, 100));
export function isPlayer(v: unknown): v is Player {
  return isRecord(v) && ['id', 'name', 'club', 'nationality'].every(k => isText(v[k])) &&
    isPosition(v.position) && inRange(v.rating, 0, 100) && inRange(v.price, 0, 5000) &&
    isRecord(v.stats) && ['goals', 'assists', 'passAccuracy', 'defense', 'physicality', 'stamina', 'pace', 'dribbling'].every(k => inRange(v.stats[k], 0, 100)) &&
    ['xG90', 'xA90'].every(k => inRange(v.stats[k], 0, 10)) &&
    Array.isArray(v.playstyles) && v.playstyles.length <= 20 && v.playstyles.every(isText) &&
    Array.isArray(v.recentForm) && v.recentForm.length >= 2 && v.recentForm.length <= 20 && v.recentForm.every((n: unknown) => inRange(n, 0, 10));
}
export const isSquad = (v: unknown): v is Player[] => Array.isArray(v) && v.length <= 11 && v.every(isPlayer) && new Set(v.map(p => p.id)).size === v.length;
