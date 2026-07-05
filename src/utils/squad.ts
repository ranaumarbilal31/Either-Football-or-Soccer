import { Player, FormationType } from '../types';
import { getFormationLayout } from './formations';

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
