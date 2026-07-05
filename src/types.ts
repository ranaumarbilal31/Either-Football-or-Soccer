/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PositionType = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PlayerStats {
  goals: number;
  assists: number;
  passAccuracy: number;
  defense: number;
  physicality: number;
  stamina: number;
  pace: number;
  dribbling: number;
  xG90: number; // expected goals per 90
  xA90: number; // expected assists per 90
}

export interface Player {
  id: string;
  name: string;
  position: PositionType;
  rating: number;
  price: number; // out of 1000 credit budget
  stats: PlayerStats;
  nationality: string;
  club: string;
  playstyles: string[]; // complementary playstyles, e.g., "Target Man", "High Crossing", "Double Pivot", "Box-to-Box"
  recentForm: number[]; // last 5 match ratings (e.g. [7.2, 6.8, 8.1, 7.5, 7.9])
  image?: string;
}

export type FormationType = '4-3-3' | '3-5-2' | '4-2-3-1' | '4-4-2' | '5-3-2';

export interface Tactics {
  formation: FormationType;
  defensiveLine: number; // 0-100 (Deep vs High)
  tempo: number; // 0-100 (Slow vs Fast)
  pressingIntensity: number; // 0-100 (Passive vs Aggressive)
}

export interface Squad {
  players: Player[];
  tactics: Tactics;
}

export type MatchEventType = 
  | 'GOAL' 
  | 'SHOT' 
  | 'TURNOVER' 
  | 'CARD' 
  | 'STAMINA_WARNING' 
  | 'SUBSTITUTION' 
  | 'KICKOFF' 
  | 'CORNER' 
  | 'HALF_TIME' 
  | 'FULL_TIME' 
  | 'INFO';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: 'HOME' | 'AWAY' | 'NONE';
  description: string;
  xG?: number; // expected goal value for shots
  player?: string; // name of the player involved
}

export interface PlayerMatchRating {
  playerId: string;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  passesCompleted: number;
  passesAttempted: number;
  tackles: number;
  staminaRemaining: number;
  shapValues: {
    stamina: number; // how stamina affected rating
    pressing: number; // how team pressing affected performance
    passing: number; // how passing accuracy affected rating
    defending: number; // how defense rating helped
    attacking: number; // xG/xA impact
    positional?: number; // how positional alignment / tactical role fit affected rating
  };
}

export interface MatchStats {
  possession: number; // home possession %
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  xG: { home: number; away: number };
  passes: { home: number; away: number };
  passAccuracy: { home: number; away: number };
  fouls: { home: number; away: number };
  corners: { home: number; away: number };
}

export interface MatchResult {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  momentum: { minute: number; value: number }[]; // -100 to 100 (away to home)
  playerRatings: {
    home: PlayerMatchRating[];
    away: PlayerMatchRating[];
  };
  aiCoachSummary?: string;
}
