import { Player, FormationType } from '../types';
import { getFormationLayout } from './formations';
import { getPlayerSubRole, getDeployedSubRole, getPositionalDistance } from './positionalCoherence';

/**
 * Calculates Chemistry Stats based on chemistry principles:
 * - National connection: players with same nationality (+6 per additional national connection)
 * - Club connection: players with same club (+10 per additional club connection)
 * - Complementary playstyle: complimentary pairs (e.g. Target Man + High Crossing)
 * - Tactical Structural Integrity: sum the positional distance penalties across the whole XI (non-linear squared penalty), and subtract from composition chemistry.
 */
export function calculateSquadChemistry(
  players: Player[],
  formation: FormationType,
  slotAssignments: Record<string, string>
): number {
  if (players.length === 0) return 0;

  let compositionChem = 0;

  // 1. Club and Nationality maps for the drafted squad
  const clubs: Record<string, number> = {};
  const nationalities: Record<string, number> = {};

  players.forEach((p) => {
    if (p.club) {
      clubs[p.club] = (clubs[p.club] || 0) + 1;
    }
    if (p.nationality) {
      nationalities[p.nationality] = (nationalities[p.nationality] || 0) + 1;
    }
  });

  // National chemistry boosts
  Object.values(nationalities).forEach((count) => {
    if (count >= 2) {
      compositionChem += (count - 1) * 6;
    }
  });

  // Club chemistry boosts
  Object.values(clubs).forEach((count) => {
    if (count >= 2) {
      compositionChem += (count - 1) * 10;
    }
  });

  // 2. Playstyle synergies
  const hasTargetMan = players.some((p) => p.playstyles?.includes('Target Man'));
  const hasHighCrossing = players.some((p) => p.playstyles?.includes('High Crossing'));
  const hasDoublePivot = players.filter((p) => p.playstyles?.includes('Double Pivot')).length >= 2;
  const hasWingBack = players.some((p) => p.playstyles?.includes('Wing Back'));
  const hasBoxToBox = players.some((p) => p.playstyles?.includes('Box-to-Box'));

  if (hasTargetMan && hasHighCrossing) compositionChem += 15;
  if (hasDoublePivot) compositionChem += 10;
  if (hasWingBack && hasBoxToBox) compositionChem += 8;

  // 3. Tactical Structural Integrity Term (Positional Familiarity Matrix):
  // Sum the squared distance penalties across the whole squad, scale, and subtract.
  const layout = getFormationLayout(formation);
  let totalDistancePenalty = 0;

  players.forEach((player) => {
    // Find which slot this player is assigned to
    const slotId = Object.keys(slotAssignments).find((key) => slotAssignments[key] === player.id);
    if (slotId) {
      const slot = layout.find((s) => s.id === slotId);
      if (slot) {
        const nativeSub = getPlayerSubRole(player);
        const deployedSub = getDeployedSubRole(slot.label);
        const dist = getPositionalDistance(nativeSub, deployedSub);
        
        // Quadratic penalty: squared distance
        totalDistancePenalty += dist * dist;
      } else {
        totalDistancePenalty += 25; // default slot missing penalty
      }
    } else {
      // Unassigned player penalty
      totalDistancePenalty += 36;
    }
  });

  // Scale the penalty: each unit of squared distance subtracts 0.4 chemistry points.
  // If we have severe position mismatch, the team chemistry drops dramatically!
  const finalChem = compositionChem - (totalDistancePenalty * 0.4);

  // Ensure chemistry is bounded between 0 and 100
  return Math.max(0, Math.min(100, Math.round(finalChem)));
}
