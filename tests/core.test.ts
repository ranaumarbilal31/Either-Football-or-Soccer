import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayersWithDynamicPrices, DEFAULT_PRICING_WEIGHTS, pricePlayer } from '../src/data/players';
import { autofillSquad, resolveAssignments } from '../src/utils/squad';
import { getFormationLayout } from '../src/utils/formations';
import { calculateSquadChemistry } from '../src/utils/chemistry';
import { OPPOSITION_TEAMS, simulateMatch } from '../src/utils/simulation';
import { isPlayer, isSquad, isTactics } from '../src/utils/validation';
import { readStored, writeStored } from '../src/utils/storage';
import type { FormationType } from '../src/types';

const catalog = getPlayersWithDynamicPrices();
const formations: FormationType[] = ['4-3-3', '3-5-2', '4-2-3-1', '4-4-2', '5-3-2'];
test('all catalog players are valid, unique and consistently priced', () => {
  assert.ok(catalog.every(isPlayer));
  assert.equal(new Set(catalog.map(p => p.id)).size, catalog.length);
  for (const p of catalog) assert.equal(pricePlayer(p).price, p.price);
  const zeroWeights = { ...DEFAULT_PRICING_WEIGHTS, ratingWeight: 0, goalsWeight: 0, assistsWeight: 0, xG90Weight: 0, xA90Weight: 0, defendingWeight: 0, staminaWeight: 0 };
  assert.ok(getPlayersWithDynamicPrices(zeroWeights).every(p => p.price === 45));
});
for (const formation of formations) {
  test(`${formation}: autofill respects budget and formation; swapping changes chemistry without changing natural roles`, () => {
    const squad = autofillSquad([], catalog, formation, 1000);
    assert.equal(squad.length, 11);
    assert.ok(squad.reduce((n, p) => n + p.price, 0) <= 1000);
    assert.ok(isSquad(squad));
    const assigned = resolveAssignments(squad, formation);
    for (const slot of getFormationLayout(formation)) assert.equal(squad.find(p => p.id === assigned[slot.id])?.position, slot.positionType);
    const swapped = { ...assigned, 'gk-1': assigned['fwd-1'], 'fwd-1': assigned['gk-1'] };
    assert.ok(calculateSquadChemistry(squad, formation, swapped) <= calculateSquadChemistry(squad, formation, assigned));
    const repaired = resolveAssignments(squad, formation, swapped);
    assert.equal(squad.find(p => p.id === repaired['gk-1'])?.position, 'GK');
  });
  test(`${formation}: match events and totals agree, including reserve squads`, () => {
    for (const players of [[], autofillSquad([], catalog, formation, 1000)]) {
      const tactics = { formation, defensiveLine: 50, tempo: 50, pressingIntensity: 50 };
      const result = simulateMatch(players, tactics, OPPOSITION_TEAMS[0], 50, resolveAssignments(players, formation));
      assert.equal(result.playerRatings.home.length, 11);
      for (const [side, team] of [['home', 'HOME'], ['away', 'AWAY']] as const) {
        const shots = result.events.filter(e => e.team === team && ['SHOT', 'GOAL'].includes(e.type));
        const goals = shots.filter(e => e.type === 'GOAL').length;
        assert.equal(result.stats.shots[side], shots.length);
        assert.equal(side === 'home' ? result.homeScore : result.awayScore, goals);
        assert.ok(result.stats.shotsOnTarget[side] >= goals);
        assert.ok(result.stats.shotsOnTarget[side] <= shots.length);
        assert.ok(shots.every(e => typeof e.xG === 'number'));
        assert.ok(Math.abs(shots.reduce((n, e) => n + e.xG!, 0) - result.stats.xG[side]) < 0.001);
      }
      assert.ok(result.playerRatings.home.every(p => p.passesCompleted <= p.passesAttempted));
      assert.equal(result.playerRatings.home.reduce((sum, p) => sum + p.passesAttempted, 0), result.stats.passes.home);
      assert.equal(result.events[0].type, 'KICKOFF');
      assert.equal(result.events.at(-1)?.type, 'FULL_TIME');
    }
  });
}
test('invalid stored state and unavailable storage recover safely', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  values.set('bad', '{');
  assert.deepEqual(readStored('bad', [], isSquad), []);
  values.set('bad', '[{}]');
  assert.deepEqual(readStored('bad', [], isSquad), []);
  const squad = autofillSquad([], catalog, '4-3-3', 1000);
  writeStored('squad', squad);
  assert.deepEqual(readStored('squad', [], isSquad), squad);
  assert.equal(isTactics({ formation: 'invalid' }), false);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
  assert.doesNotThrow(() => writeStored('squad', squad));
  assert.deepEqual(readStored('squad', [], isSquad), []);
  Reflect.deleteProperty(globalThis, 'localStorage');
});
