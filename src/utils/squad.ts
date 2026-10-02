import { Player, FormationType } from '../types';
import { getFormationLayout } from './formations';
import { getPlayerSubRole, getDeployedSubRole, getPositionalDistance } from './positionalCoherence';

export function resolveAssignments(players: Player[], formation: FormationType, previous: Record<string, string> = {}): Record<string, string> {
  const layout = getFormationLayout(formation);
  const assigned: Record<string, string> = {};
  const used = new Set<string>();
  for (const slot of layout) {
    const player = players.find(p => p.id === previous[slot.id]);
    if (player && !used.has(player.id) && (player.position === 'GK') === (slot.positionType === 'GK')) {
      assigned[slot.id] = player.id;
      used.add(player.id);
    }
  }
  for (const nativeOnly of [true, false]) {
    for (const slot of layout) {
      if (assigned[slot.id]) continue;
      const candidates = players.filter(p => !used.has(p.id) && (p.position === 'GK') === (slot.positionType === 'GK') && (!nativeOnly || p.position === slot.positionType));
      candidates.sort((a, b) => getPositionalDistance(getPlayerSubRole(a), getDeployedSubRole(slot.label)) - getPositionalDistance(getPlayerSubRole(b), getDeployedSubRole(slot.label)));
      if (candidates[0]) { assigned[slot.id] = candidates[0].id; used.add(candidates[0].id); }
    }
  }
  return assigned;
}

/** Reserve the cheapest remaining roles before choosing an upgrade. */
export function autofillSquad(current: Player[], catalog: Player[], formation: FormationType, budget: number): Player[] {
  const result = [...current];
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  current.forEach(p => counts[p.position]++);
  const needed = getFormationLayout(formation).filter(slot => {
    if (counts[slot.positionType] > 0) { counts[slot.positionType]--; return false; }
    return true;
  }).map(slot => slot.positionType);
  let spent = result.reduce((n, p) => n + p.price, 0);
  const available = () => catalog.filter(p => !result.some(q => q.id === p.id));
  for (let i = 0; i < needed.length && result.length < 11; i++) {
    const candidates = available().filter(p => p.position === needed[i]).sort((a, b) => b.rating - a.rating || a.price - b.price);
    const chosen = candidates.find(candidate => {
      const pool = available().filter(p => p.id !== candidate.id).sort((a, b) => a.price - b.price);
      let minimum = 0;
      for (const role of needed.slice(i + 1)) {
        const index = pool.findIndex(p => p.position === role);
        if (index < 0) return false;
        minimum += pool.splice(index, 1)[0].price;
      }
      return spent + candidate.price + minimum <= budget;
    });
    if (!chosen) break;
    result.push(chosen);
    spent += chosen.price;
  }
  return result;
}

/**
 * Returns a derived squad array where each player's position is overridden
 * by the positionType of their currently assigned slot on the pitch (DEF, MID, ATT, etc.).
 * Falls back to their natural position if unassigned.
 */
export function getEffectiveSquad(
  players: Player[],
  formation: FormationType,
  slotAssignments: Record<string, string>
): Player[] {
  const layout = getFormationLayout(formation);

  return players.map((player) => {
    // Find the slot assigned to this player
    const slotId = Object.keys(slotAssignments).find((key) => slotAssignments[key] === player.id);
    if (slotId) {
      const slot = layout.find((s) => s.id === slotId);
      if (slot) {
        // Return a copy with overridden position representing their tactical role on the pitch
        return {
          ...player,
          position: slot.positionType,
        };
      }
    }
    // Fallback to natural position
    return player;
  });
}
