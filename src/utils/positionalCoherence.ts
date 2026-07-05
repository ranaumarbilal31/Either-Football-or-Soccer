/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, PositionType } from '../types';

export type DeployedSubRole = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'Winger' | 'CF';

/**
 * Classifies a player's native sub-role based on their main position, playstyles, and stats.
 */
export function getPlayerSubRole(player: Player): DeployedSubRole {
  if (player.position === 'GK') return 'GK';

  if (player.position === 'DEF') {
    const isFullback = 
      player.playstyles.includes('Wing Back') || 
      player.playstyles.includes('High Crossing') || 
      player.playstyles.includes('Infiltrator') || 
      player.stats.pace >= 78;
    return isFullback ? 'FB' : 'CB';
  }

  if (player.position === 'MID') {
    const isDM = 
      player.playstyles.includes('Double Pivot') || 
      player.playstyles.includes('Midfield Anchor') || 
      player.stats.defense >= 75;
    return isDM ? 'DM' : 'CM';
  }

  // Default: FWD
  const isCF = 
    player.playstyles.includes('Target Man') || 
    player.playstyles.includes('Acrobatic Finisher') || 
    player.stats.physicality >= 78 || 
    player.stats.pace < 83;
  return isCF ? 'CF' : 'Winger';
}

/**
 * Classifies a pitch slot label into a deployed sub-role.
 */
export function getDeployedSubRole(label: string): DeployedSubRole {
  const cleanLabel = label.toUpperCase();
  if (cleanLabel === 'GK') return 'GK';

  if (['LB', 'RB', 'LWB', 'RWB'].includes(cleanLabel)) return 'FB';
  if (['CB', 'LCB', 'RCB'].includes(cleanLabel)) return 'CB';
  if (['DM', 'LDM', 'RDM'].includes(cleanLabel)) return 'DM';
  if (['LW', 'RW'].includes(cleanLabel)) return 'Winger';
  if (['ST', 'LS', 'RS'].includes(cleanLabel)) return 'CF';
  
  // Midfield labels like LCM, RCM, AM, LAM, RAM, LM, RM
  return 'CM';
}

/**
 * Computes positional distance (0 to 10) between native sub-role and deployed slot role.
 */
export function getPositionalDistance(nativeSub: DeployedSubRole, deployedSub: DeployedSubRole): number {
  if (nativeSub === deployedSub) return 0;

  // 0 = Perfect, larger = worse
  const distances: Record<DeployedSubRole, Record<DeployedSubRole, number>> = {
    GK: { GK: 0, CB: 10, FB: 10, DM: 10, CM: 10, Winger: 10, CF: 10 },
    CB: { GK: 10, CB: 0, FB: 3, DM: 2, CM: 4, Winger: 6, CF: 6 },
    FB: { GK: 10, CB: 2, FB: 0, DM: 3, CM: 3, Winger: 3, CF: 5 },
    DM: { GK: 10, CB: 2, FB: 3, DM: 0, CM: 1, Winger: 4, CF: 5 },
    CM: { GK: 10, CB: 4, FB: 3, DM: 1, CM: 0, Winger: 2, CF: 4 },
    Winger: { GK: 10, CB: 6, FB: 3, DM: 4, CM: 2, Winger: 0, CF: 3 },
    CF: { GK: 10, CB: 6, FB: 5, DM: 5, CM: 3, Winger: 2, CF: 0 }
  };

  return distances[nativeSub]?.[deployedSub] ?? 5;
}

export interface AttributeMultipliers {
  pace: number;
  dribbling: number;
  passing: number;
  defending: number;
  finishing: number;
  physicality: number;
  stamina: number;
}

/**
 * Generates per-attribute multipliers based on role swap distances.
 */
export function getCoherenceMultipliers(nativeSub: DeployedSubRole, deployedSub: DeployedSubRole): AttributeMultipliers {
  if (nativeSub === deployedSub) {
    return { pace: 1.0, dribbling: 1.0, passing: 1.0, defending: 1.0, finishing: 1.0, physicality: 1.0, stamina: 1.0 };
  }

  const distance = getPositionalDistance(nativeSub, deployedSub);
  const defaultMult = Math.max(0.1, 1 - Math.pow(distance / 11, 2)); // quadratic decay

  const mults: AttributeMultipliers = {
    pace: defaultMult,
    dribbling: defaultMult,
    passing: defaultMult,
    defending: defaultMult,
    finishing: defaultMult,
    physicality: defaultMult,
    stamina: Math.max(0.5, 1 - (distance * 0.04)) // stamina capacity scales linearly but retains base capacity
  };

  // Explicit overrides for critical combinations:
  
  // 1. GK -> Outfield (catastrophic)
  if (nativeSub === 'GK') {
    return {
      pace: 0.25,
      dribbling: 0.15,
      passing: 0.20,
      defending: 0.15,
      finishing: 0.05, // 95% suppression
      physicality: 0.40,
      stamina: 0.50
    };
  }

  // 2. Outfield -> GK (catastrophic)
  if (deployedSub === 'GK') {
    return {
      pace: 0.30,
      dribbling: 0.20,
      passing: 0.30,
      defending: 0.05, // 95% suppression of GK reflexes
      finishing: 0.01,
      physicality: 0.50,
      stamina: 0.60
    };
  }

  // 3. CB -> CF (emergency target man)
  if (nativeSub === 'CB' && deployedSub === 'CF') {
    return {
      pace: 0.30,      // heavily discounted
      dribbling: 0.25,  // heavily discounted
      passing: 0.40,
      defending: 0.60,
      finishing: 0.35,  // blunt striker
      physicality: 0.90, // preserve physical aerial strength
      stamina: 0.80
    };
  }

  // 4. FB <-> Winger (mild)
  if ((nativeSub === 'FB' && deployedSub === 'Winger') || (nativeSub === 'Winger' && deployedSub === 'FB')) {
    return {
      pace: 0.95,
      dribbling: 0.85,
      passing: 0.85,
      defending: 0.80,
      finishing: 0.80,
      physicality: 0.90,
      stamina: 0.95
    };
  }

  // 5. DM -> CB (mild)
  if (nativeSub === 'DM' && deployedSub === 'CB') {
    return {
      pace: 0.90,
      dribbling: 0.80,
      passing: 0.90,
      defending: 0.95, // highly compatible defending
      finishing: 0.50, // lower attacking threat
      physicality: 0.90,
      stamina: 0.95
    };
  }

  // 6. CM -> CF (false nine)
  if (nativeSub === 'CM' && deployedSub === 'CF') {
    return {
      pace: 0.80,
      dribbling: 0.90,
      passing: 0.90,
      defending: 0.40,
      finishing: 0.70, // moderate penalty
      physicality: 0.75,
      stamina: 0.85
    };
  }

  return mults;
}

/**
 * Calculates a player's individual degraded stats based on their deployed slot on the pitch.
 */
export function getDegradedPlayerStats(player: Player, slotLabel: string) {
  const nativeSub = getPlayerSubRole(player);
  const deployedSub = getDeployedSubRole(slotLabel);
  const mults = getCoherenceMultipliers(nativeSub, deployedSub);

  return {
    ...player,
    stats: {
      goals: player.stats.goals * mults.finishing,
      assists: player.stats.assists * mults.passing,
      passAccuracy: player.stats.passAccuracy * mults.passing,
      defense: player.stats.defense * mults.defending,
      physicality: player.stats.physicality * mults.physicality,
      stamina: player.stats.stamina * mults.stamina,
      pace: player.stats.pace * mults.pace,
      dribbling: player.stats.dribbling * mults.dribbling,
      xG90: player.stats.xG90 * mults.finishing,
      xA90: player.stats.xA90 * mults.passing,
    },
    distance: getPositionalDistance(nativeSub, deployedSub)
  };
}
