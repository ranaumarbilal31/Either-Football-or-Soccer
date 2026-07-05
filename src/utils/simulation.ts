/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, Tactics, MatchEvent, MatchResult, MatchStats, PlayerMatchRating, PositionType } from '../types';
import { getFormationLayout } from './formations';
import { getPlayerSubRole, getDeployedSubRole, getPositionalDistance, getCoherenceMultipliers } from './positionalCoherence';

export interface OppositionSquad {
  name: string;
  rating: number;
  tactics: Tactics;
  keyPlayers: string[];
  type: 'CLUB' | 'INTERNATIONAL';
}

export const OPPOSITION_TEAMS: OppositionSquad[] = [
  // --- CLUBS ---
  {
    name: 'Real Madrid',
    rating: 92,
    type: 'CLUB',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 65,
      tempo: 75,
      pressingIntensity: 60,
    },
    keyPlayers: ['Kylian Mbappé', 'Vinícius Júnior', 'Jude Bellingham'],
  },
  {
    name: 'Manchester City',
    rating: 92,
    type: 'CLUB',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 80,
      tempo: 45,
      pressingIntensity: 85,
    },
    keyPlayers: ['Erling Haaland', 'Kevin De Bruyne', 'Rodri'],
  },
  {
    name: 'Arsenal',
    rating: 89,
    type: 'CLUB',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 75,
      tempo: 60,
      pressingIntensity: 80,
    },
    keyPlayers: ['Bukayo Saka', 'Martin Ødegaard', 'Declan Rice'],
  },
  {
    name: 'Bayern Munich',
    rating: 88,
    type: 'CLUB',
    tactics: {
      formation: '4-2-3-1',
      defensiveLine: 70,
      tempo: 65,
      pressingIntensity: 75,
    },
    keyPlayers: ['Harry Kane', 'Jamal Musiala', 'Leroy Sané'],
  },
  {
    name: 'Barcelona',
    rating: 88,
    type: 'CLUB',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 85,
      tempo: 70,
      pressingIntensity: 90,
    },
    keyPlayers: ['Robert Lewandowski', 'Lamine Yamal', 'Pedri'],
  },
  {
    name: 'Liverpool',
    rating: 89,
    type: 'CLUB',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 70,
      tempo: 70,
      pressingIntensity: 80,
    },
    keyPlayers: ['Mohamed Salah', 'Virgil van Dijk', 'Alexis Mac Allister'],
  },
  {
    name: 'Inter Milan',
    rating: 87,
    type: 'CLUB',
    tactics: {
      formation: '3-5-2',
      defensiveLine: 50,
      tempo: 55,
      pressingIntensity: 65,
    },
    keyPlayers: ['Lautaro Martínez', 'Nicolò Barella', 'Hakan Çalhanoğlu'],
  },
  {
    name: 'Bayer Leverkusen',
    rating: 86,
    type: 'CLUB',
    tactics: {
      formation: '3-5-2',
      defensiveLine: 60,
      tempo: 60,
      pressingIntensity: 70,
    },
    keyPlayers: ['Florian Wirtz', 'Alejandro Grimaldo', 'Granit Xhaka'],
  },

  // --- INTERNATIONALS ---
  {
    name: 'Argentina',
    rating: 91,
    type: 'INTERNATIONAL',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 55,
      tempo: 55,
      pressingIntensity: 70,
    },
    keyPlayers: ['Lionel Messi', 'Lautaro Martínez', 'Alexis Mac Allister'],
  },
  {
    name: 'France',
    rating: 90,
    type: 'INTERNATIONAL',
    tactics: {
      formation: '4-2-3-1',
      defensiveLine: 60,
      tempo: 75,
      pressingIntensity: 55,
    },
    keyPlayers: ['Kylian Mbappé', 'Antoine Griezmann', 'Aurélien Tchouaméni'],
  },
  {
    name: 'Spain',
    rating: 89,
    type: 'INTERNATIONAL',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 75,
      tempo: 65,
      pressingIntensity: 85,
    },
    keyPlayers: ['Lamine Yamal', 'Nico Williams', 'Rodri'],
  },
  {
    name: 'England',
    rating: 89,
    type: 'INTERNATIONAL',
    tactics: {
      formation: '4-2-3-1',
      defensiveLine: 55,
      tempo: 50,
      pressingIntensity: 60,
    },
    keyPlayers: ['Harry Kane', 'Jude Bellingham', 'Bukayo Saka'],
  },
  {
    name: 'Brazil',
    rating: 88,
    type: 'INTERNATIONAL',
    tactics: {
      formation: '4-3-3',
      defensiveLine: 65,
      tempo: 70,
      pressingIntensity: 65,
    },
    keyPlayers: ['Vinícius Júnior', 'Rodrygo', 'Bruno Guimarães'],
  },
  {
    name: 'Germany',
    rating: 88,
    type: 'INTERNATIONAL',
    tactics: {
      formation: '4-2-3-1',
      defensiveLine: 70,
      tempo: 60,
      pressingIntensity: 80,
    },
    keyPlayers: ['Florian Wirtz', 'Jamal Musiala', 'Kai Havertz'],
  },
];

type SimulationState = 'KICKOFF' | 'MIDFIELD' | 'ATTACK' | 'DEFENSE' | 'TURNOVER' | 'SHOT_HOME' | 'SHOT_AWAY';

/**
 * Simulates a full probabilistic 90-minute match based on:
 * - User squad roster stats, positions, chemistry
 * - User tactical configurator sliders
 * - Chosen Opposition squad
 */
export function simulateMatch(
  userPlayers: Player[],
  userTactics: Tactics,
  opposition: OppositionSquad,
  chemistry: number,
  slotAssignments: Record<string, string>
): MatchResult {
  // Ensure we have 11 players for simulation. If not, generate fill-ins
  const homeSquad = [...userPlayers];
  while (homeSquad.length < 11) {
    const fillerId = `filler-${homeSquad.length}`;
    homeSquad.push({
      id: fillerId,
      name: `Reserve Player ${homeSquad.length + 1}`,
      position: 'MID',
      rating: 70,
      price: 50,
      stats: { goals: 0, assists: 0, passAccuracy: 75, defense: 60, physicality: 65, stamina: 70, pace: 65, dribbling: 65, xG90: 0.1, xA90: 0.1 },
      nationality: 'Unknown',
      club: 'Reserve Team',
      playstyles: [],
      recentForm: [6.5, 6.7, 6.2, 6.5, 6.4]
    });
  }

  // Tactical variables
  const homePressing = userTactics.pressingIntensity;
  const homeDefLine = userTactics.defensiveLine;
  const homeTempo = userTactics.tempo;

  const awayPressing = opposition.tactics.pressingIntensity;
  const awayDefLine = opposition.tactics.defensiveLine;
  const awayTempo = opposition.tactics.tempo;

  // Resolve positional slots for every player in the home squad
  const layout = getFormationLayout(userTactics.formation);
  const homeSquadWithSlots = homeSquad.map((player) => {
    const slotId = Object.keys(slotAssignments).find((key) => slotAssignments[key] === player.id);
    const slot = slotId ? layout.find((s) => s.id === slotId) : null;
    return {
      player,
      slotLabel: slot ? slot.label : player.position,
    };
  });

  // Calculate total positional distance
  let totalDistance = 0;
  homeSquadWithSlots.forEach(({ player, slotLabel }) => {
    const nativeSub = getPlayerSubRole(player);
    const deployedSub = getDeployedSubRole(slotLabel);
    totalDistance += getPositionalDistance(nativeSub, deployedSub);
  });

  // Coherence factor determines both chance volume and shot quality
  const coherenceFactor = Math.max(0.15, 1 - (totalDistance / 42));

  // Compute team performance modifiers
  const homeAvgRating = homeSquad.reduce((acc, p) => acc + p.rating, 0) / 11;
  const homeQuality = homeAvgRating + chemistry / 10; // boost based on chemistry
  const awayQuality = opposition.rating;

  // Track match outcomes
  let homeScore = 0;
  let awayScore = 0;
  const events: MatchEvent[] = [];
  const momentum: { minute: number; value: number }[] = [];

  // Match statistics initial state
  const stats: MatchStats = {
    possession: 50,
    shots: { home: 0, away: 0 },
    shotsOnTarget: { home: 0, away: 0 },
    xG: { home: 0, away: 0 },
    passes: { home: 0, away: 0 },
    passAccuracy: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
  };

  // Keep track of minute-by-minute stamina for home players (0 to 100)
  const homeStaminaMap: Record<string, number> = {};
  homeSquad.forEach((p) => {
    homeStaminaMap[p.id] = p.stats.stamina;
  });

  // Keep track of match performance stats for ratings
  const playerStatsMap: Record<string, {
    goals: number;
    assists: number;
    shots: number;
    passesAttempted: number;
    passesCompleted: number;
    tackles: number;
  }> = {};

  homeSquad.forEach((p) => {
    playerStatsMap[p.id] = {
      goals: 0,
      assists: 0,
      shots: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      tackles: 0,
    };
  });

  events.push({
    minute: 0,
    type: 'KICKOFF',
    team: 'NONE',
    description: `Kickoff! The match between Home Squad and ${opposition.name} has officially started.`,
  });

  // 1. Determine shot counts using Poisson distribution
  // Chance creation rates (expected shots per 90 mins)
  const tempoChanceMultiplier = 0.75 + (homeTempo / 100) * 0.5; // 0.8 to 1.25
  const chemistryMultiplier = 0.6 + (chemistry / 100) * 0.5; // 0.6 to 1.1

  // Lambda home is suppressed heavily by poor coherence and chemistry!
  const lambda_home = Math.max(2.0, Math.min(18.0, (homeQuality / awayQuality) * 5.8 * tempoChanceMultiplier * chemistryMultiplier * coherenceFactor));
  
  // Lambda away depends on opposition quality vs user defense
  const homeDefenders = homeSquad.filter(p => p.position === 'DEF');
  const homeDefRating = homeDefenders.reduce((acc, p) => acc + p.rating, 0) / Math.max(1, homeDefenders.length);
  const lambda_away = Math.max(2.0, Math.min(18.0, (awayQuality / (homeDefRating + (chemistry / 12))) * 5.8 * (1 + (homeDefLine - 50) / 200)));

  function poissonRandom(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L && k < 30);
    return k - 1;
  }

  const homeShotsCount = Math.max(1, poissonRandom(lambda_home));
  const awayShotsCount = Math.max(1, poissonRandom(lambda_away));

  // Distribute shots on minutes
  const homeShotMinutes = new Set<number>();
  while (homeShotMinutes.size < homeShotsCount) {
    homeShotMinutes.add(Math.floor(Math.random() * 88) + 1);
  }

  const awayShotMinutes = new Set<number>();
  while (awayShotMinutes.size < awayShotsCount) {
    const min = Math.floor(Math.random() * 88) + 1;
    if (!homeShotMinutes.has(min)) {
      awayShotMinutes.add(min);
    }
  }

  // Running minute simulation
  for (let min = 1; min <= 90; min++) {
    // 1. Stamina depletion
    homeSquad.forEach((p) => {
      const rate = 0.4 + (homePressing / 120); 
      homeStaminaMap[p.id] = Math.max(homeStaminaMap[p.id] - rate, 5);
    });

    if (min === 60) {
      const fatiguedPlayers = homeSquad.filter((p) => homeStaminaMap[p.id] < 50);
      if (fatiguedPlayers.length > 0) {
        events.push({
          minute: 60,
          type: 'STAMINA_WARNING',
          team: 'HOME',
          description: `Fatigue warning: ${fatiguedPlayers.slice(0, 2).map((p) => p.name).join(' & ')} are showing signs of heavy fatigue due to high pressing.`,
        });
      }
    }

    // Determine current minute momentum
    let minMomentum = (homeQuality - awayQuality) * 4;
    minMomentum += (homeDefLine - awayDefLine) * 0.15;
    minMomentum += (homeTempo - awayTempo) * 0.1;
    minMomentum += (Math.random() * 60 - 30);
    minMomentum = Math.max(-100, Math.min(100, minMomentum));
    momentum.push({ minute: min, value: Math.round(minMomentum) });

    // Simulate passive/passing stats during non-shot minutes
    if (!homeShotMinutes.has(min) && !awayShotMinutes.has(min)) {
      if (Math.random() < 0.25) {
        // Add random tackles/passes
        const midfielder = homeSquad[Math.floor(Math.random() * homeSquad.length)];
        playerStatsMap[midfielder.id].passesAttempted += 1;
        if (Math.random() < midfielder.stats.passAccuracy / 100) {
          playerStatsMap[midfielder.id].passesCompleted += 1;
        }
      }
      if (Math.random() < 0.15) {
        const defender = homeSquad.filter(p => p.position === 'DEF')[Math.floor(Math.random() * homeDefenders.length)] || homeSquad[0];
        playerStatsMap[defender.id].tackles += 1;
      }
    }

    // 2. Resolve Shot Events
    if (homeShotMinutes.has(min)) {
      stats.shots.home += 1;

      // Weighted shooter selection (FWD: 10x, MID: 4x, DEF: 1x)
      const shooterWeights = homeSquadWithSlots.map((item) => {
        let weight = 1.0;
        if (item.player.position === 'FWD') weight = 10.0;
        else if (item.player.position === 'MID') weight = 4.0;
        return { item, weight };
      });
      const totalWeight = shooterWeights.reduce((acc, w) => acc + w.weight, 0);
      let rand = Math.random() * totalWeight;
      let chosen = shooterWeights[0].item;
      for (const sw of shooterWeights) {
        rand -= sw.weight;
        if (rand <= 0) {
          chosen = sw.item;
          break;
        }
      }

      playerStatsMap[chosen.player.id].shots += 1;

      // 2D SVG Plotting coordinates (Home attacks Left to Right -> X is between 70 and 96, Y between 20 and 80)
      const shotX = parseFloat((72 + Math.random() * 24).toFixed(1));
      const shotY = parseFloat((18 + Math.random() * 64).toFixed(1));

      // Calculate base xG depending on goal proximity (Goal center is at (98, 50))
      const distToGoal = Math.sqrt(Math.pow(98 - shotX, 2) + Math.pow(50 - shotY, 2));
      let baseShotXG = Math.max(0.05, 0.68 - (distToGoal * 0.016));

      // Degrade attributes based on positional coherence
      const nativeSub = getPlayerSubRole(chosen.player);
      const deployedSub = getDeployedSubRole(chosen.slotLabel);
      const mults = getCoherenceMultipliers(nativeSub, deployedSub);

      const staminaFactor = homeStaminaMap[chosen.player.id] / 100;
      
      // Crucial: degraded finishing multiplier squashes the shot's xG!
      let finalShotXG = baseShotXG * mults.finishing * (0.8 + staminaFactor * 0.2);
      finalShotXG = Math.max(0.02, Math.min(0.88, parseFloat((finalShotXG + (Math.random() * 0.06 - 0.03)).toFixed(2))));

      stats.xG.home += finalShotXG;

      // Determine if on target based on degraded attribute
      const rawShooting = chosen.player.stats.goals * 10 || chosen.player.rating;
      const degradedShooting = rawShooting * mults.finishing;
      const onTargetChance = 0.25 + (degradedShooting / 220) + (Math.random() * 0.1 - 0.05);
      const isShotOnTarget = Math.random() < Math.max(0.1, Math.min(0.9, onTargetChance));

      if (isShotOnTarget) {
        stats.shotsOnTarget.home += 1;

        // Opposition GK reflexes
        const oppGkRating = opposition.rating;
        const saveChance = Math.max(0.08, Math.min(0.96, 1.0 - finalShotXG + (oppGkRating - 80) * 0.006));
        const isSaved = Math.random() < saveChance;

        if (!isSaved) {
          // GOAL!
          homeScore += 1;
          playerStatsMap[chosen.player.id].goals += 1;

          // Select helper/assister (any other outfielder)
          const assistList = homeSquad.filter(p => p.id !== chosen.player.id && p.position !== 'GK');
          const midfielder = assistList[Math.floor(Math.random() * assistList.length)] || chosen.player;
          if (midfielder.id !== chosen.player.id) {
            playerStatsMap[midfielder.id].assists += 1;
          }

          events.push({
            minute: min,
            type: 'GOAL',
            team: 'HOME',
            player: chosen.player.name,
            xG: finalShotXG,
            description: `${min}' - GOAL FOR HOME SQUAD! ${chosen.player.name} fires a blistering strike into the bottom corner from (${shotX}, ${shotY}), assisted beautifully by ${midfielder.name}. (xG: ${finalShotXG.toFixed(2)}, Position Fit: ${deployedSub})`,
          });
        } else {
          events.push({
            minute: min,
            type: 'SHOT',
            team: 'HOME',
            player: chosen.player.name,
            xG: finalShotXG,
            description: `${min}' - Shot saved! ${chosen.player.name} cuts inside and shoots from (${shotX}, ${shotY}), but the opposition goalkeeper makes a stunning reflex stop. (xG: ${finalShotXG.toFixed(2)}, Position Fit: ${deployedSub})`,
          });
        }
      } else {
        events.push({
          minute: min,
          type: 'SHOT',
          team: 'HOME',
          player: chosen.player.name,
          xG: finalShotXG,
          description: `${min}' - Shot wide! ${chosen.player.name} finds space at (${shotX}, ${shotY}), but their curling effort whistles just past the post. (xG: ${finalShotXG.toFixed(2)})`,
        });
      }
    } else if (awayShotMinutes.has(min)) {
      stats.shots.away += 1;

      // Away attacks Left (X between 4 and 28, Y between 20 and 80)
      const shotX = parseFloat((4 + Math.random() * 24).toFixed(1));
      const shotY = parseFloat((18 + Math.random() * 64).toFixed(1));

      // Calculate base xG relative to Home Goal center at (2, 50)
      const distToGoal = Math.sqrt(Math.pow(shotX - 2, 2) + Math.pow(shotY - 50, 2));
      let baseAwayXG = Math.max(0.05, 0.68 - (distToGoal * 0.016));

      // High lines expose space, increasing shot quality
      let finalAwayXG = baseAwayXG * (1 + (homeDefLine - 50) / 200);
      finalAwayXG = Math.max(0.02, Math.min(0.88, parseFloat((finalAwayXG + (Math.random() * 0.06 - 0.03)).toFixed(2))));

      stats.xG.away += finalAwayXG;

      const isAwayOnTarget = Math.random() < (0.3 + (opposition.rating / 250));

      if (isAwayOnTarget) {
        stats.shotsOnTarget.away += 1;

        // Resolve against Home GK reflexes (which degrade if out of position!)
        const homeGKItem = homeSquadWithSlots.find(item => item.slotLabel === 'GK') || homeSquadWithSlots.find(item => item.player.position === 'GK') || homeSquadWithSlots[0];
        const nativeGkSub = getPlayerSubRole(homeGKItem.player);
        const deployedGkSub = getDeployedSubRole(homeGKItem.slotLabel);
        const gkMults = getCoherenceMultipliers(nativeGkSub, deployedGkSub);

        // Crucial: GK's actual degraded reflexes stat is evaluated!
        const degradedGkReflexes = homeGKItem.player.stats.defense * gkMults.defending;
        
        // Save chance drops drastically if GK reflexes are degraded (e.g. striker playing in goal)
        const saveChance = Math.max(0.04, Math.min(0.96, 1.0 - finalAwayXG + (degradedGkReflexes - 80) * 0.012));
        const isSaved = Math.random() < saveChance;

        if (!isSaved) {
          awayScore += 1;
          const shooter = opposition.keyPlayers[Math.floor(Math.random() * opposition.keyPlayers.length)];
          events.push({
            minute: min,
            type: 'GOAL',
            team: 'AWAY',
            player: shooter,
            xG: finalAwayXG,
            description: `${min}' - GOAL FOR ${opposition.name}! ${shooter} breaks through a high defensive line and slots it home clinically from (${shotX}, ${shotY}). (xG: ${finalAwayXG.toFixed(2)})`,
          });
        } else {
          events.push({
            minute: min,
            type: 'SHOT',
            team: 'AWAY',
            description: `${min}' - Outstanding save by ${homeGKItem.player.name}! They get a strong hand to tip an opposition shot from (${shotX}, ${shotY}) over the bar. (xG: ${finalAwayXG.toFixed(2)})`,
          });
        }
      } else {
        events.push({
          minute: min,
          type: 'SHOT',
          team: 'AWAY',
          description: `${min}' - Big chance missed! Opposition forward skies their shot high into the stands from close range. (xG: ${finalAwayXG.toFixed(2)})`,
        });
      }
    }

    if (min === 45) {
      events.push({
        minute: 45,
        type: 'HALF_TIME',
        team: 'NONE',
        description: `Half Time. The score is HOME ${homeScore} - ${awayScore} ${opposition.name}. Managers regroup in the locker room.`,
      });
    }
  }

  // Final whistle
  events.push({
    minute: 90,
    type: 'FULL_TIME',
    team: 'NONE',
    description: `Full Time whistle! Final score: HOME ${homeScore} - ${awayScore} ${opposition.name}.`,
  });

  // Calculate final summarized match statistics
  let finalHomePossession = 50 + (homeAvgRating - opposition.rating) * 1.5 + (chemistry - 50) * 0.1;
  if (userTactics.tempo < 40) finalHomePossession += 5;
  if (opposition.tactics.tempo < 40) finalHomePossession -= 5;
  stats.possession = Math.max(30, Math.min(70, Math.round(finalHomePossession)));

  stats.passes.home = Math.round(300 + (stats.possession * 6) - userTactics.tempo * 1.5);
  stats.passes.away = Math.round(300 + ((100 - stats.possession) * 6) - opposition.tactics.tempo * 1.5);

  let avgStamina = homeSquad.reduce((acc, p) => acc + homeStaminaMap[p.id], 0) / 11;
  stats.passAccuracy.home = Math.round(
    homeSquad.reduce((acc, p) => acc + p.stats.passAccuracy, 0) / 11 - (userTactics.tempo / 8) - (100 - avgStamina) / 10
  );
  stats.passAccuracy.away = Math.round(83 - opposition.tactics.tempo / 8);

  stats.fouls.home = Math.round(4 + homePressing / 12 + Math.random() * 4);
  stats.fouls.away = Math.round(4 + awayPressing / 12 + Math.random() * 4);

  stats.corners.home = Math.round(stats.shots.home / 3.5 + Math.random() * 3);
  stats.corners.away = Math.round(stats.shots.away / 3.5 + Math.random() * 3);

  // --- POST MATCH EXPLAINABLE AI (SHAP ENGINE) WITH POSITIONAL ALIGNMENT ---
  const homePlayerRatings: PlayerMatchRating[] = homeSquadWithSlots.map(({ player: p, slotLabel }) => {
    const pStats = playerStatsMap[p.id];
    const staminaLeft = Math.round(homeStaminaMap[p.id]);

    const nativeSub = getPlayerSubRole(p);
    const deployedSub = getDeployedSubRole(slotLabel);
    const dist = getPositionalDistance(nativeSub, deployedSub);

    // Baseline match rating
    let matchRating = 6.0;

    // SHAP Contribution Values
    let staminaContribution = -((100 - staminaLeft) / 45); 
    let pressingContribution = (homePressing - 50) / 150; 
    let passingContribution = (pStats.passesCompleted - (pStats.passesAttempted * 0.2)) * 0.15;
    let defendingContribution = pStats.tackles * 0.45;
    let attackingContribution = (pStats.goals * 1.8) + (pStats.assists * 1.2) + (pStats.shots * 0.2);

    // Positional SHAP contribution: perfect role fit gets up to +0.8, catastrophic fit penalizes up to -2.0
    let positionalContribution = 0.8 - (dist * dist * 0.028);

    if (p.playstyles.includes('Press Leader') && homePressing > 70) {
      pressingContribution += 0.4;
    }
    if (p.playstyles.includes('Stamina Engine')) {
      staminaContribution += 0.35;
    }
    if (p.playstyles.includes('Double Pivot') && p.position === 'MID') {
      passingContribution += 0.2;
    }

    matchRating += staminaContribution + pressingContribution + passingContribution + defendingContribution + attackingContribution + positionalContribution;
    matchRating = Math.max(3.5, Math.min(10.0, matchRating));

    return {
      playerId: p.id,
      rating: parseFloat(matchRating.toFixed(1)),
      goals: pStats.goals,
      assists: pStats.assists,
      shots: pStats.shots,
      passesCompleted: pStats.passesCompleted || Math.round(stats.passes.home / 11 * 0.8),
      passesAttempted: pStats.passesAttempted || Math.round(stats.passes.home / 11),
      tackles: pStats.tackles || Math.round(stats.fouls.home / 6),
      staminaRemaining: staminaLeft,
      shapValues: {
        stamina: parseFloat(staminaContribution.toFixed(2)),
        pressing: parseFloat(pressingContribution.toFixed(2)),
        passing: parseFloat(passingContribution.toFixed(2)),
        defending: parseFloat(defendingContribution.toFixed(2)),
        attacking: parseFloat(attackingContribution.toFixed(2)),
        positional: parseFloat(positionalContribution.toFixed(2)),
      },
    };
  });

  return {
    id: `match-${Date.now()}`,
    homeTeamName: 'Home Squad',
    awayTeamName: opposition.name,
    homeScore,
    awayScore,
    events,
    stats,
    momentum,
    playerRatings: {
      home: homePlayerRatings,
      away: [],
    },
  };
}
