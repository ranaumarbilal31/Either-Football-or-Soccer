/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, PositionType, PlayerStats } from '../types';

export interface RawPlayer {
  id: string;
  name: string;
  position: PositionType;
  rating: number;
  stats: PlayerStats;
  nationality: string;
  club: string;
  playstyles: string[];
  recentForm: number[];
  image?: string;
}

// Baseline positional averages for Scout Radar Comparison
export const PositionAverages: Record<PositionType, PlayerStats> = {
  GK: {
    goals: 0.0,
    assists: 0.02,
    passAccuracy: 78.5,
    defense: 82.0, // Used as GK saving/reflexes rating here
    physicality: 72.0,
    stamina: 65.0,
    pace: 52.0,
    dribbling: 45.0,
    xG90: 0.0,
    xA90: 0.01,
  },
  DEF: {
    goals: 0.05,
    assists: 0.08,
    passAccuracy: 84.0,
    defense: 80.5,
    physicality: 78.0,
    stamina: 82.0,
    pace: 74.0,
    dribbling: 66.0,
    xG90: 0.04,
    xA90: 0.06,
  },
  MID: {
    goals: 0.15,
    assists: 0.22,
    passAccuracy: 88.0,
    defense: 64.0,
    physicality: 70.0,
    stamina: 88.0,
    pace: 76.0,
    dribbling: 81.0,
    xG90: 0.12,
    xA90: 0.20,
  },
  FWD: {
    goals: 0.52,
    assists: 0.18,
    passAccuracy: 76.5,
    defense: 35.0,
    physicality: 74.0,
    stamina: 78.0,
    pace: 85.0,
    dribbling: 82.0,
    xG90: 0.48,
    xA90: 0.15,
  },
};

// Compact seed list of 500 top-flight active players across the requested 6 leagues.
// Famous players are detailed with specific custom metrics/ratings, while the rest are
// synthesized deterministically to maintain balanced game metrics and 100% stable stats.
const COMPACT_PLAYERS: {
  name: string;
  pos: PositionType;
  rat: number;
  club: string;
  nat: string;
  styles?: string[];
  form?: number[];
  stats?: Partial<PlayerStats>;
}[] = [
  // ==========================================
  // --- PREMIER LEAGUE (ENGLAND) ---
  // ==========================================
  { name: 'Erling Haaland', pos: 'FWD', rat: 91, club: 'Manchester City', nat: 'Norway', styles: ['Target Man', 'Infiltrator', 'Acrobatic Finisher'], form: [8.1, 9.5, 7.2, 8.8, 9.2], stats: { goals: 35, assists: 5, passAccuracy: 74, defense: 38, physicality: 88, stamina: 80, pace: 89, dribbling: 78, xG90: 0.95, xA90: 0.10 } },
  { name: 'Kevin De Bruyne', pos: 'MID', rat: 91, club: 'Manchester City', nat: 'Belgium', styles: ['Deadball Specialist', 'High Crossing', 'Pass Master'], form: [8.5, 8.2, 7.8, 9.1, 8.0], stats: { goals: 6, assists: 15, passAccuracy: 93, defense: 62, physicality: 74, stamina: 82, pace: 74, dribbling: 87, xG90: 0.18, xA90: 0.45 } },
  { name: 'Rodri', pos: 'MID', rat: 92, club: 'Manchester City', nat: 'Spain', styles: ['Double Pivot', 'Midfield Anchor', 'Long Shot Specialist'], form: [8.6, 8.9, 8.4, 8.5, 9.0], stats: { goals: 8, assists: 7, passAccuracy: 95, defense: 91, physicality: 89, stamina: 94, pace: 72, dribbling: 82, xG90: 0.10, xA90: 0.15 } },
  { name: 'Phil Foden', pos: 'MID', rat: 89, club: 'Manchester City', nat: 'England', styles: ['Dribble Wizard', 'Infiltrator'], form: [8.3, 7.9, 8.4, 8.0, 8.2] },
  { name: 'Bernardo Silva', pos: 'MID', rat: 88, club: 'Manchester City', nat: 'Portugal', styles: ['Dribble Wizard', 'Press Leader'] },
  { name: 'Ruben Dias', pos: 'DEF', rat: 89, club: 'Manchester City', nat: 'Portugal', styles: ['Block Master', 'Bruiser DEF', 'Leader Instinct'], form: [7.5, 7.8, 8.2, 7.4, 8.0], stats: { goals: 1, assists: 0, passAccuracy: 93, defense: 90, physicality: 87, stamina: 86, pace: 70, dribbling: 68, xG90: 0.02, xA90: 0.01 } },
  { name: 'Ederson Moraes', pos: 'GK', rat: 87, club: 'Manchester City', nat: 'Brazil', styles: ['Sweeper Keeper', 'Launchpad Kicker', 'Ball-Playing GK'], form: [7.1, 7.3, 7.5, 7.0, 7.8], stats: { goals: 0, assists: 1, passAccuracy: 93, defense: 84, physicality: 78, stamina: 70, pace: 64, dribbling: 68, xG90: 0, xA90: 0.08 } },
  { name: 'Josko Gvardiol', pos: 'DEF', rat: 85, club: 'Manchester City', nat: 'Croatia' },
  { name: 'John Stones', pos: 'DEF', rat: 86, club: 'Manchester City', nat: 'England' },
  { name: 'Jack Grealish', pos: 'FWD', rat: 84, club: 'Manchester City', nat: 'England' },
  { name: 'Jeremy Doku', pos: 'FWD', rat: 83, club: 'Manchester City', nat: 'Belgium' },
  { name: 'Mateo Kovacic', pos: 'MID', rat: 83, club: 'Manchester City', nat: 'Croatia' },
  { name: 'Savinho', pos: 'FWD', rat: 82, club: 'Manchester City', nat: 'Brazil' },
  { name: 'Manuel Akanji', pos: 'DEF', rat: 84, club: 'Manchester City', nat: 'Switzerland' },
  { name: 'Rico Lewis', pos: 'DEF', rat: 79, club: 'Manchester City', nat: 'England' },
  { name: 'Nathan Ake', pos: 'DEF', rat: 83, club: 'Manchester City', nat: 'Netherlands' },
  { name: 'Matheus Nunes', pos: 'MID', rat: 79, club: 'Manchester City', nat: 'Portugal' },
  { name: 'Stefan Ortega', pos: 'GK', rat: 80, club: 'Manchester City', nat: 'Germany' },
  
  { name: 'Martin Ødegaard', pos: 'MID', rat: 88, club: 'Arsenal', nat: 'Norway', styles: ['Pass Master', 'Dribble Wizard', 'Press Leader'], form: [8.2, 8.0, 8.5, 7.6, 8.4], stats: { goals: 10, assists: 11, passAccuracy: 91, defense: 66, physicality: 68, stamina: 93, pace: 78, dribbling: 88, xG90: 0.22, xA90: 0.35 } },
  { name: 'Bukayo Saka', pos: 'FWD', rat: 88, club: 'Arsenal', nat: 'England', styles: ['Inverted Winger', 'Finesse Shot', 'High Overlap'], form: [8.2, 7.8, 8.4, 8.1, 8.3], stats: { goals: 16, assists: 12, passAccuracy: 84, defense: 58, physicality: 74, stamina: 89, pace: 86, dribbling: 87, xG90: 0.45, xA90: 0.32 } },
  { name: 'Declan Rice', pos: 'MID', rat: 87, club: 'Arsenal', nat: 'England', styles: ['Box-to-Box', 'Midfield Anchor', 'Interception King'], form: [7.8, 8.2, 8.0, 7.5, 8.3], stats: { goals: 7, assists: 8, passAccuracy: 90, defense: 86, physicality: 84, stamina: 95, pace: 80, dribbling: 81, xG90: 0.12, xA90: 0.18 } },
  { name: 'William Saliba', pos: 'DEF', rat: 88, club: 'Arsenal', nat: 'France', styles: ['Jockey Expert', 'Ball Playing Defender', 'Slide Tackler'], form: [7.8, 8.1, 7.5, 8.0, 7.9], stats: { goals: 2, assists: 1, passAccuracy: 92, defense: 89, physicality: 84, stamina: 88, pace: 82, dribbling: 74, xG90: 0.03, xA90: 0.02 } },
  { name: 'Gabriel Magalhaes', pos: 'DEF', rat: 86, club: 'Arsenal', nat: 'Brazil' },
  { name: 'David Raya', pos: 'GK', rat: 84, club: 'Arsenal', nat: 'Spain', styles: ['Sweeper Keeper', 'Cross Claimer', 'Quick Restart'], form: [7.5, 6.8, 7.9, 8.0, 7.2], stats: { goals: 0, assists: 0, passAccuracy: 88, defense: 83, physicality: 72, stamina: 66, pace: 60, dribbling: 58, xG90: 0, xA90: 0.03 } },
  { name: 'Kai Havertz', pos: 'FWD', rat: 84, club: 'Arsenal', nat: 'Germany' },
  { name: 'Ben White', pos: 'DEF', rat: 84, club: 'Arsenal', nat: 'England' },
  { name: 'Leandro Trossard', pos: 'FWD', rat: 83, club: 'Arsenal', nat: 'Belgium' },
  { name: 'Gabriel Martinelli', pos: 'FWD', rat: 83, club: 'Arsenal', nat: 'Brazil' },
  { name: 'Jurrien Timber', pos: 'DEF', rat: 81, club: 'Arsenal', nat: 'Netherlands' },
  { name: 'Riccardo Calafiori', pos: 'DEF', rat: 82, club: 'Arsenal', nat: 'Italy' },
  { name: 'Mikel Merino', pos: 'MID', rat: 82, club: 'Arsenal', nat: 'Spain' },
  { name: 'Thomas Partey', pos: 'MID', rat: 82, club: 'Arsenal', nat: 'Ghana' },
  { name: 'Jorginho Frello', pos: 'MID', rat: 80, club: 'Arsenal', nat: 'Italy' },
  { name: 'Oleksandr Zinchenko', pos: 'DEF', rat: 80, club: 'Arsenal', nat: 'Ukraine' },
  { name: 'Jakub Kiwior', pos: 'DEF', rat: 78, club: 'Arsenal', nat: 'Poland' },
  { name: 'Neto Murara', pos: 'GK', rat: 79, club: 'Arsenal', nat: 'Brazil' },

  { name: 'Mohamed Salah', pos: 'FWD', rat: 89, club: 'Liverpool', nat: 'Egypt', styles: ['Sprint Machine', 'Inverted Winger', 'Finesse Shot'], form: [8.0, 8.5, 7.8, 8.3, 8.7], stats: { goals: 22, assists: 13, passAccuracy: 82, defense: 45, physicality: 76, stamina: 86, pace: 89, dribbling: 88, xG90: 0.65, xA90: 0.34 } },
  { name: 'Virgil van Dijk', pos: 'DEF', rat: 91, club: 'Liverpool', nat: 'Netherlands', styles: ['Aerial Commander', 'Block Master', 'Ball Playing Defender'], form: [8.2, 7.9, 8.5, 8.0, 8.3], stats: { goals: 4, assists: 1, passAccuracy: 90, defense: 92, physicality: 89, stamina: 85, pace: 78, dribbling: 72, xG90: 0.06, xA90: 0.03 } },
  { name: 'Alisson Becker', pos: 'GK', rat: 89, club: 'Liverpool', nat: 'Brazil', styles: ['Sweeper Keeper', '1v1 Specialist', 'Long Thrower'], form: [7.4, 7.8, 6.9, 8.2, 7.5], stats: { goals: 0, assists: 0, passAccuracy: 85, defense: 90, physicality: 84, stamina: 68, pace: 58, dribbling: 55, xG90: 0, xA90: 0.02 } },
  { name: 'Trent Alexander-Arnold', pos: 'DEF', rat: 86, club: 'Liverpool', nat: 'England', styles: ['High Crossing', 'Deadball Specialist', 'Inverted Fullback'], form: [7.2, 8.4, 6.8, 7.9, 8.5], stats: { goals: 3, assists: 9, passAccuracy: 89, defense: 74, physicality: 72, stamina: 84, pace: 79, dribbling: 80, xG90: 0.08, xA90: 0.32 } },
  { name: 'Alexis Mac Allister', pos: 'MID', rat: 86, club: 'Liverpool', nat: 'Argentina' },
  { name: 'Luis Diaz', pos: 'FWD', rat: 84, club: 'Liverpool', nat: 'Colombia' },
  { name: 'Diogo Jota', pos: 'FWD', rat: 85, club: 'Liverpool', nat: 'Portugal' },
  { name: 'Darwin Nunez', pos: 'FWD', rat: 82, club: 'Liverpool', nat: 'Uruguay' },
  { name: 'Dominik Szoboszlai', pos: 'MID', rat: 83, club: 'Liverpool', nat: 'Hungary' },
  { name: 'Cody Gakpo', pos: 'FWD', rat: 83, club: 'Liverpool', nat: 'Netherlands' },
  { name: 'Ryan Gravenberch', pos: 'MID', rat: 81, club: 'Liverpool', nat: 'Netherlands' },
  { name: 'Andrew Robertson', pos: 'DEF', rat: 84, club: 'Liverpool', nat: 'Scotland' },
  { name: 'Ibrahima Konate', pos: 'DEF', rat: 83, club: 'Liverpool', nat: 'France' },
  { name: 'Curtis Jones', pos: 'MID', rat: 80, club: 'Liverpool', nat: 'England' },
  { name: 'Harvey Elliott', pos: 'MID', rat: 79, club: 'Liverpool', nat: 'England' },
  { name: 'Caoimhin Kelleher', pos: 'GK', rat: 80, club: 'Liverpool', nat: 'Ireland' },
  { name: 'Conor Bradley', pos: 'DEF', rat: 77, club: 'Liverpool', nat: 'Northern Ireland' },
  { name: 'Wataru Endo', pos: 'MID', rat: 80, club: 'Liverpool', nat: 'Japan' },
  { name: 'Jarell Quansah', pos: 'DEF', rat: 78, club: 'Liverpool', nat: 'England' },

  { name: 'Son Heung-min', pos: 'FWD', rat: 87, club: 'Tottenham', nat: 'South Korea' },
  { name: 'James Maddison', pos: 'MID', rat: 85, club: 'Tottenham', nat: 'England' },
  { name: 'Micky van de Ven', pos: 'DEF', rat: 82, club: 'Tottenham', nat: 'Netherlands', styles: ['Sprint Machine', 'Recovery Tackler'], form: [7.2, 7.5, 6.8, 8.1, 7.4], stats: { goals: 1, assists: 1, passAccuracy: 88, defense: 81, physicality: 80, stamina: 80, pace: 95, dribbling: 70, xG90: 0.02, xA90: 0.04 } },
  { name: 'Guglielmo Vicario', pos: 'GK', rat: 82, club: 'Tottenham', nat: 'Italy', styles: ['Reflex Wall', 'Acrobatic Saver'], form: [6.8, 7.2, 7.5, 6.5, 7.3], stats: { goals: 0, assists: 0, passAccuracy: 78, defense: 82, physicality: 74, stamina: 64, pace: 56, dribbling: 44, xG90: 0, xA90: 0.01 } },
  { name: 'Cristian Romero', pos: 'DEF', rat: 85, club: 'Tottenham', nat: 'Argentina' },
  { name: 'Dejan Kulusevski', pos: 'MID', rat: 82, club: 'Tottenham', nat: 'Sweden' },
  { name: 'Dominic Solanke', pos: 'FWD', rat: 82, club: 'Tottenham', nat: 'England' },
  { name: 'Pedro Porro', pos: 'DEF', rat: 83, club: 'Tottenham', nat: 'Spain' },
  { name: 'Destiny Udogie', pos: 'DEF', rat: 82, club: 'Tottenham', nat: 'Italy' },
  { name: 'Rodrigo Bentancur', pos: 'MID', rat: 82, club: 'Tottenham', nat: 'Uruguay' },
  { name: 'Pape Matar Sarr', pos: 'MID', rat: 79, club: 'Tottenham', nat: 'Senegal' },
  { name: 'Brennan Johnson', pos: 'FWD', rat: 80, club: 'Tottenham', nat: 'Wales' },
  { name: 'Radu Dragusin', pos: 'DEF', rat: 78, club: 'Tottenham', nat: 'Romania' },
  { name: 'Richarlison Andrade', pos: 'FWD', rat: 81, club: 'Tottenham', nat: 'Brazil' },
  { name: 'Yves Bissouma', pos: 'MID', rat: 81, club: 'Tottenham', nat: 'Mali' },

  { name: 'Cole Palmer', pos: 'MID', rat: 87, club: 'Chelsea', nat: 'England' },
  { name: 'Enzo Fernandez', pos: 'MID', rat: 84, club: 'Chelsea', nat: 'Argentina' },
  { name: 'Moises Caicedo', pos: 'MID', rat: 84, club: 'Chelsea', nat: 'Ecuador' },
  { name: 'Nicolas Jackson', pos: 'FWD', rat: 82, club: 'Chelsea', nat: 'Senegal' },
  { name: 'Christopher Nkunku', pos: 'FWD', rat: 84, club: 'Chelsea', nat: 'France' },
  { name: 'Noni Madueke', pos: 'FWD', rat: 80, club: 'Chelsea', nat: 'England' },
  { name: 'Pedro Neto', pos: 'FWD', rat: 82, club: 'Chelsea', nat: 'Portugal' },
  { name: 'Reece James', pos: 'DEF', rat: 83, club: 'Chelsea', nat: 'England' },
  { name: 'Levi Colwill', pos: 'DEF', rat: 80, club: 'Chelsea', nat: 'England' },
  { name: 'Malo Gusto', pos: 'DEF', rat: 81, club: 'Chelsea', nat: 'France' },
  { name: 'Joao Felix', pos: 'FWD', rat: 81, club: 'Chelsea', nat: 'Portugal' },
  { name: 'Marc Cucurella', pos: 'DEF', rat: 81, club: 'Chelsea', nat: 'Spain' },
  { name: 'Robert Sanchez', pos: 'GK', rat: 80, club: 'Chelsea', nat: 'Spain' },
  { name: 'Jadon Sancho', pos: 'FWD', rat: 81, club: 'Chelsea', nat: 'England' },
  { name: 'Romeo Lavia', pos: 'MID', rat: 78, club: 'Chelsea', nat: 'Belgium' },
  { name: 'Axel Disasi', pos: 'DEF', rat: 79, club: 'Chelsea', nat: 'France' },
  { name: 'Mykhailo Mudryk', pos: 'FWD', rat: 78, club: 'Chelsea', nat: 'Ukraine' },

  { name: 'Bruno Fernandes', pos: 'MID', rat: 87, club: 'Manchester United', nat: 'Portugal' },
  { name: 'Marcus Rashford', pos: 'FWD', rat: 82, club: 'Manchester United', nat: 'England' },
  { name: 'Alejandro Garnacho', pos: 'FWD', rat: 81, club: 'Manchester United', nat: 'Argentina' },
  { name: 'Kobbie Mainoo', pos: 'MID', rat: 79, club: 'Manchester United', nat: 'England', styles: ['Agile Turn', 'Calm Passer'], form: [7.3, 7.5, 7.0, 7.8, 7.4], stats: { goals: 3, assists: 2, passAccuracy: 89, defense: 72, physicality: 74, stamina: 82, pace: 76, dribbling: 84, xG90: 0.08, xA90: 0.10 } },
  { name: 'Rasmus Højlund', pos: 'FWD', rat: 79, club: 'Manchester United', nat: 'Denmark', styles: ['Infiltrator', 'Target Man'], form: [7.1, 6.5, 7.4, 7.2, 7.0], stats: { goals: 10, assists: 2, passAccuracy: 72, defense: 35, physicality: 80, stamina: 76, pace: 87, dribbling: 77, xG90: 0.38, xA90: 0.06 } },
  { name: 'Matthijs de Ligt', pos: 'DEF', rat: 84, club: 'Manchester United', nat: 'Netherlands' },
  { name: 'Casemiro Henrique', pos: 'MID', rat: 83, club: 'Manchester United', nat: 'Brazil' },
  { name: 'Lisandro Martinez', pos: 'DEF', rat: 84, club: 'Manchester United', nat: 'Argentina' },
  { name: 'Joshua Zirkzee', pos: 'FWD', rat: 79, club: 'Manchester United', nat: 'Netherlands' },
  { name: 'Andre Onana', pos: 'GK', rat: 84, club: 'Manchester United', nat: 'Cameroon' },
  { name: 'Diogo Dalot', pos: 'DEF', rat: 81, club: 'Manchester United', nat: 'Portugal' },
  { name: 'Noussair Mazraoui', pos: 'DEF', rat: 81, club: 'Manchester United', nat: 'Morocco' },
  { name: 'Harry Maguire', pos: 'DEF', rat: 79, club: 'Manchester United', nat: 'England' },
  { name: 'Amad Diallo', pos: 'FWD', rat: 78, club: 'Manchester United', nat: 'Ivory Coast' },
  { name: 'Christian Eriksen', pos: 'MID', rat: 80, club: 'Manchester United', nat: 'Denmark' },
  { name: 'Manuel Ugarte', pos: 'MID', rat: 81, club: 'Manchester United', nat: 'Uruguay' },
  { name: 'Luke Shaw', pos: 'DEF', rat: 80, club: 'Manchester United', nat: 'England' },
  { name: 'Mason Mount', pos: 'MID', rat: 79, club: 'Manchester United', nat: 'England' },

  { name: 'Alexander Isak', pos: 'FWD', rat: 86, club: 'Newcastle', nat: 'Sweden' },
  { name: 'Bruno Guimaraes', pos: 'MID', rat: 85, club: 'Newcastle', nat: 'Brazil' },
  { name: 'Anthony Gordon', pos: 'FWD', rat: 83, club: 'Newcastle', nat: 'England' },
  { name: 'Sandro Tonali', pos: 'MID', rat: 83, club: 'Newcastle', nat: 'Italy' },
  { name: 'Kieran Trippier', pos: 'DEF', rat: 82, club: 'Newcastle', nat: 'England' },
  { name: 'Nick Pope', pos: 'GK', rat: 82, club: 'Newcastle', nat: 'England' },
  { name: 'Sven Botman', pos: 'DEF', rat: 82, club: 'Newcastle', nat: 'Netherlands' },
  { name: 'Harvey Barnes', pos: 'FWD', rat: 80, club: 'Newcastle', nat: 'England' },
  { name: 'Joelinton Cássio', pos: 'MID', rat: 81, club: 'Newcastle', nat: 'Brazil' },
  { name: 'Dan Burn', pos: 'DEF', rat: 79, club: 'Newcastle', nat: 'England' },
  { name: 'Tino Livramento', pos: 'DEF', rat: 79, club: 'Newcastle', nat: 'England' },
  { name: 'Lewis Hall', pos: 'DEF', rat: 78, club: 'Newcastle', nat: 'England' },
  { name: 'Fabian Schär', pos: 'DEF', rat: 81, club: 'Newcastle', nat: 'Switzerland' },

  { name: 'Ollie Watkins', pos: 'FWD', rat: 84, club: 'Aston Villa', nat: 'England', styles: ['Infiltrator', 'Stamina Engine'], form: [7.5, 7.8, 8.2, 7.0, 7.9], stats: { goals: 19, assists: 13, passAccuracy: 78, defense: 42, physicality: 78, stamina: 88, pace: 86, dribbling: 81, xG90: 0.52, xA90: 0.20 } },
  { name: 'Emiliano Martinez', pos: 'GK', rat: 86, club: 'Aston Villa', nat: 'Argentina' },
  { name: 'Leon Bailey', pos: 'FWD', rat: 82, club: 'Aston Villa', nat: 'Jamaica' },
  { name: 'John McGinn', pos: 'MID', rat: 82, club: 'Aston Villa', nat: 'Scotland' },
  { name: 'Youri Tielemans', pos: 'MID', rat: 81, club: 'Aston Villa', nat: 'Belgium' },
  { name: 'Morgan Rogers', pos: 'MID', rat: 80, club: 'Aston Villa', nat: 'England' },
  { name: 'Jhon Duran', pos: 'FWD', rat: 79, club: 'Aston Villa', nat: 'Colombia' },
  { name: 'Lucas Digne', pos: 'DEF', rat: 80, club: 'Aston Villa', nat: 'France' },
  { name: 'Ezri Konsa', pos: 'DEF', rat: 81, club: 'Aston Villa', nat: 'England' },
  { name: 'Pau Torres', pos: 'DEF', rat: 82, club: 'Aston Villa', nat: 'Spain' },
  { name: 'Amadou Onana', pos: 'MID', rat: 81, club: 'Aston Villa', nat: 'Belgium' },
  { name: 'Ian Maatsen', pos: 'DEF', rat: 80, club: 'Aston Villa', nat: 'Netherlands' },

  { name: 'Jarrod Bowen', pos: 'FWD', rat: 83, club: 'West Ham', nat: 'England' },
  { name: 'Mohammed Kudus', pos: 'MID', rat: 83, club: 'West Ham', nat: 'Ghana' },
  { name: 'Lucas Paqueta', pos: 'MID', rat: 83, club: 'West Ham', nat: 'Brazil' },
  { name: 'Edson Alvarez', pos: 'MID', rat: 80, club: 'West Ham', nat: 'Mexico' },
  { name: 'Niclas Fullkrug', pos: 'FWD', rat: 80, club: 'West Ham', nat: 'Germany' },
  { name: 'Jean-Clair Todibo', pos: 'DEF', rat: 80, club: 'West Ham', nat: 'France' },
  { name: 'Max Kilman', pos: 'DEF', rat: 80, club: 'West Ham', nat: 'England' },
  { name: 'Alphonse Areola', pos: 'GK', rat: 81, club: 'West Ham', nat: 'France' },
  { name: 'Aaron Wan-Bissaka', pos: 'DEF', rat: 79, club: 'West Ham', nat: 'England' },
  { name: 'Crysencio Summerville', pos: 'FWD', rat: 79, club: 'West Ham', nat: 'Netherlands' },

  { name: 'Kaoru Mitoma', pos: 'FWD', rat: 83, club: 'Brighton', nat: 'Japan' },
  { name: 'Joao Pedro', pos: 'FWD', rat: 81, club: 'Brighton', nat: 'Brazil' },
  { name: 'Danny Welbeck', pos: 'FWD', rat: 78, club: 'Brighton', nat: 'England' },
  { name: 'Lewis Dunk', pos: 'DEF', rat: 80, club: 'Brighton', nat: 'England' },
  { name: 'Bart Verbruggen', pos: 'GK', rat: 79, club: 'Brighton', nat: 'Netherlands' },
  { name: 'Pervis Estupinan', pos: 'DEF', rat: 80, club: 'Brighton', nat: 'Ecuador' },
  { name: 'Yankuba Minteh', pos: 'FWD', rat: 78, club: 'Brighton', nat: 'Gambia' },
  { name: 'Carlos Baleba', pos: 'MID', rat: 77, club: 'Brighton', nat: 'Cameroon' },

  { name: 'Jordan Pickford', pos: 'GK', rat: 83, club: 'Everton', nat: 'England' },
  { name: 'Jarrad Branthwaite', pos: 'DEF', rat: 81, club: 'Everton', nat: 'England' },
  { name: 'James Tarkowski', pos: 'DEF', rat: 79, club: 'Everton', nat: 'England' },
  { name: 'Dominic Calvert-Lewin', pos: 'FWD', rat: 79, club: 'Everton', nat: 'England' },
  { name: 'Dwight McNeil', pos: 'MID', rat: 79, club: 'Everton', nat: 'England' },

  { name: 'Antonee Robinson', pos: 'DEF', rat: 79, club: 'Fulham', nat: 'USA' },
  { name: 'Bernd Leno', pos: 'GK', rat: 82, club: 'Fulham', nat: 'Germany' },
  { name: 'Andreas Pereira', pos: 'MID', rat: 79, club: 'Fulham', nat: 'Brazil' },
  { name: 'Joachim Andersen', pos: 'DEF', rat: 80, club: 'Fulham', nat: 'Denmark' },
  { name: 'Alex Iwobi', pos: 'MID', rat: 77, club: 'Fulham', nat: 'Nigeria' },
  { name: 'Emile Smith Rowe', pos: 'MID', rat: 78, club: 'Fulham', nat: 'England' },

  { name: 'Morgan Gibbs-White', pos: 'MID', rat: 81, club: 'Nottingham Forest', nat: 'England' },
  { name: 'Murillo Santiago', pos: 'DEF', rat: 79, club: 'Nottingham Forest', nat: 'Brazil' },
  { name: 'Chris Wood', pos: 'FWD', rat: 78, club: 'Nottingham Forest', nat: 'New Zealand' },
  { name: 'Matz Sels', pos: 'GK', rat: 79, club: 'Nottingham Forest', nat: 'Belgium' },
  { name: 'Taiwo Awoniyi', pos: 'FWD', rat: 78, club: 'Nottingham Forest', nat: 'Nigeria' },
  { name: 'Neco Williams', pos: 'DEF', rat: 76, club: 'Nottingham Forest', nat: 'Wales' },

  { name: 'Matheus Cunha', pos: 'FWD', rat: 81, club: 'Wolves', nat: 'Brazil' },
  { name: 'Hwang Hee-chan', pos: 'FWD', rat: 79, club: 'Wolves', nat: 'South Korea' },
  { name: 'Mario Lemina', pos: 'MID', rat: 78, club: 'Wolves', nat: 'Gabon' },
  { name: 'Nelson Semedo', pos: 'DEF', rat: 78, club: 'Wolves', nat: 'Portugal' },
  { name: 'Jose Sa', pos: 'GK', rat: 79, club: 'Wolves', nat: 'Portugal' },

  { name: 'Thomas Kaminski', pos: 'GK', rat: 76, club: 'Luton Town', nat: 'Belgium' },
  { name: 'Carlton Morris', pos: 'FWD', rat: 76, club: 'Luton Town', nat: 'England' },
  { name: 'Alfie Doughty', pos: 'DEF', rat: 75, club: 'Luton Town', nat: 'England' },
  { name: 'Ross Barkley', pos: 'MID', rat: 78, club: 'Aston Villa', nat: 'England' },

  { name: 'James Trafford', pos: 'GK', rat: 75, club: 'Burnley', nat: 'England' },
  { name: 'Josh Brownhill', pos: 'MID', rat: 76, club: 'Burnley', nat: 'England' },
  { name: 'Sander Berge', pos: 'MID', rat: 78, club: 'Fulham', nat: 'Norway' },

  { name: 'Gustavo Hamer', pos: 'MID', rat: 77, club: 'Sheffield United', nat: 'Netherlands' },
  { name: 'Anel Ahmedhodzic', pos: 'DEF', rat: 75, club: 'Sheffield United', nat: 'Bosnia' },

  { name: 'Dominic Solanke', pos: 'FWD', rat: 82, club: 'Tottenham', nat: 'England' },
  { name: 'Illan Meslier', pos: 'GK', rat: 76, club: 'Leeds United', nat: 'France' },
  { name: 'Pascal Struijk', pos: 'DEF', rat: 75, club: 'Leeds United', nat: 'Netherlands' },

  // ==========================================
  // --- LA LIGA (SPAIN) ---
  // ==========================================
  { name: 'Kylian Mbappé', pos: 'FWD', rat: 91, club: 'Real Madrid', nat: 'France', styles: ['Sprint Machine', 'Dribble Wizard', 'Infiltrator'], form: [8.8, 7.9, 8.4, 9.0, 8.1], stats: { goals: 30, assists: 9, passAccuracy: 82, defense: 36, physicality: 78, stamina: 82, pace: 97, dribbling: 92, xG90: 0.82, xA90: 0.24 } },
  { name: 'Jude Bellingham', pos: 'MID', rat: 90, club: 'Real Madrid', nat: 'England', styles: ['Box-to-Box', 'Infiltrator', 'Bruiser DEF'], form: [7.9, 8.4, 7.5, 8.8, 8.2], stats: { goals: 18, assists: 6, passAccuracy: 88, defense: 78, physicality: 85, stamina: 92, pace: 83, dribbling: 88, xG90: 0.35, xA90: 0.18 } },
  { name: 'Vinícius Júnior', pos: 'FWD', rat: 90, club: 'Real Madrid', nat: 'Brazil', styles: ['Dribble Wizard', 'Sprint Machine', 'Trickster'], form: [8.4, 8.9, 7.5, 9.2, 8.6], stats: { goals: 19, assists: 11, passAccuracy: 81, defense: 40, physicality: 75, stamina: 85, pace: 95, dribbling: 94, xG90: 0.55, xA90: 0.28 } },
  { name: 'Thibaut Courtois', pos: 'GK', rat: 90, club: 'Real Madrid', nat: 'Belgium', styles: ['Aerial Commander', 'Reflex Wall', 'Penalty Stopper'], form: [8.0, 7.9, 8.4, 7.2, 8.1], stats: { goals: 0, assists: 0, passAccuracy: 72, defense: 92, physicality: 88, stamina: 60, pace: 46, dribbling: 42, xG90: 0, xA90: 0.00 } },
  { name: 'Federico Valverde', pos: 'MID', rat: 88, club: 'Real Madrid', nat: 'Uruguay', styles: ['Stamina Engine', 'Box-to-Box'] },
  { name: 'Rodrygo Goes', pos: 'FWD', rat: 86, club: 'Real Madrid', nat: 'Brazil' },
  { name: 'Aurelien Tchouameni', pos: 'MID', rat: 85, club: 'Real Madrid', nat: 'France' },
  { name: 'Eduardo Camavinga', pos: 'MID', rat: 84, club: 'Real Madrid', nat: 'France' },
  { name: 'Antonio Rüdiger', pos: 'DEF', rat: 87, club: 'Real Madrid', nat: 'Germany' },
  { name: 'Dani Carvajal', pos: 'DEF', rat: 86, club: 'Real Madrid', nat: 'Spain' },
  { name: 'Luka Modric', pos: 'MID', rat: 86, club: 'Real Madrid', nat: 'Croatia' },
  { name: 'Eder Militao', pos: 'DEF', rat: 85, club: 'Real Madrid', nat: 'Brazil' },
  { name: 'Arda Güler', pos: 'MID', rat: 79, club: 'Real Madrid', nat: 'Turkey' },
  { name: 'Endrick Felipe', pos: 'FWD', rat: 78, club: 'Real Madrid', nat: 'Brazil' },
  { name: 'Brahim Díaz', pos: 'MID', rat: 82, club: 'Real Madrid', nat: 'Morocco' },
  { name: 'David Alaba', pos: 'DEF', rat: 84, club: 'Real Madrid', nat: 'Austria' },
  { name: 'Ferland Mendy', pos: 'DEF', rat: 82, club: 'Real Madrid', nat: 'France' },
  { name: 'Lucas Vázquez', pos: 'DEF', rat: 80, club: 'Real Madrid', nat: 'Spain' },
  { name: 'Andriy Lunin', pos: 'GK', rat: 81, club: 'Real Madrid', nat: 'Ukraine' },
  { name: 'Dani Ceballos', pos: 'MID', rat: 79, club: 'Real Madrid', nat: 'Spain' },
  { name: 'Fran García', pos: 'DEF', rat: 78, club: 'Real Madrid', nat: 'Spain' },

  { name: 'Robert Lewandowski', pos: 'FWD', rat: 89, club: 'Barcelona', nat: 'Poland' },
  { name: 'Lamine Yamal', pos: 'FWD', rat: 84, club: 'Barcelona', nat: 'Spain' },
  { name: 'Pedri González', pos: 'MID', rat: 86, club: 'Barcelona', nat: 'Spain' },
  { name: 'Gavi Paez', pos: 'MID', rat: 83, club: 'Barcelona', nat: 'Spain' },
  { name: 'Raphinha Dias', pos: 'FWD', rat: 85, club: 'Barcelona', nat: 'Brazil' },
  { name: 'Frenkie de Jong', pos: 'MID', rat: 87, club: 'Barcelona', nat: 'Netherlands' },
  { name: 'Dani Olmo', pos: 'MID', rat: 84, club: 'Barcelona', nat: 'Spain' },
  { name: 'Ronald Araujo', pos: 'DEF', rat: 86, club: 'Barcelona', nat: 'Uruguay' },
  { name: 'Jules Kounde', pos: 'DEF', rat: 85, club: 'Barcelona', nat: 'France' },
  { name: 'Marc-André ter Stegen', pos: 'GK', rat: 89, club: 'Barcelona', nat: 'Germany' },
  { name: 'Alejandro Balde', pos: 'DEF', rat: 81, club: 'Barcelona', nat: 'Spain' },
  { name: 'Pau Cubarsí', pos: 'DEF', rat: 79, club: 'Barcelona', nat: 'Spain', styles: ['Ball Playing Defender', 'Calm Passer'], form: [7.6, 7.4, 7.8, 7.2, 7.5], stats: { goals: 0, assists: 1, passAccuracy: 94, defense: 79, physicality: 70, stamina: 78, pace: 72, dribbling: 76, xG90: 0.01, xA90: 0.05 } },
  { name: 'Andreas Christensen', pos: 'DEF', rat: 83, club: 'Barcelona', nat: 'Denmark' },
  { name: 'Ferran Torres', pos: 'FWD', rat: 80, club: 'Barcelona', nat: 'Spain' },
  { name: 'Fermín López', pos: 'MID', rat: 80, club: 'Barcelona', nat: 'Spain' },
  { name: 'Inigo Martinez', pos: 'DEF', rat: 81, club: 'Barcelona', nat: 'Spain' },
  { name: 'Marc Casadó', pos: 'MID', rat: 77, club: 'Barcelona', nat: 'Spain' },
  { name: 'Ansu Fati', pos: 'FWD', rat: 78, club: 'Barcelona', nat: 'Spain' },
  { name: 'Inaki Pena', pos: 'GK', rat: 77, club: 'Barcelona', nat: 'Spain' },
  { name: 'Eric Garcia', pos: 'DEF', rat: 78, club: 'Barcelona', nat: 'Spain' },

  { name: 'Antoine Griezmann', pos: 'FWD', rat: 88, club: 'Atletico Madrid', nat: 'France' },
  { name: 'Julian Alvarez', pos: 'FWD', rat: 84, club: 'Atletico Madrid', nat: 'Argentina' },
  { name: 'Conor Gallagher', pos: 'MID', rat: 81, club: 'Atletico Madrid', nat: 'England', styles: ['Press Leader', 'Box-to-Box', 'Stamina Engine'], form: [7.4, 7.0, 7.5, 7.8, 7.2], stats: { goals: 5, assists: 7, passAccuracy: 81, defense: 75, physicality: 78, stamina: 96, pace: 78, dribbling: 76, xG90: 0.14, xA90: 0.16 } },
  { name: 'Jan Oblak', pos: 'GK', rat: 86, club: 'Atletico Madrid', nat: 'Slovenia' },
  { name: 'Rodrigo De Paul', pos: 'MID', rat: 84, club: 'Atletico Madrid', nat: 'Argentina' },
  { name: 'Marcos Llorente', pos: 'MID', rat: 83, club: 'Atletico Madrid', nat: 'Spain' },
  { name: 'Alexander Sørloth', pos: 'FWD', rat: 82, club: 'Atletico Madrid', nat: 'Norway' },
  { name: 'Koke Resurreccion', pos: 'MID', rat: 83, club: 'Atletico Madrid', nat: 'Spain' },
  { name: 'Jose Maria Gimenez', pos: 'DEF', rat: 83, club: 'Atletico Madrid', nat: 'Uruguay' },
  { name: 'Robin Le Normand', pos: 'DEF', rat: 82, club: 'Atletico Madrid', nat: 'Spain' },
  { name: 'Samuel Lino', pos: 'FWD', rat: 81, club: 'Atletico Madrid', nat: 'Brazil' },
  { name: 'Angel Correa', pos: 'FWD', rat: 82, club: 'Atletico Madrid', nat: 'Argentina' },
  { name: 'Rodrigo Riquelme', pos: 'MID', rat: 78, club: 'Atletico Madrid', nat: 'Spain' },
  { name: 'Axel Witsel', pos: 'DEF', rat: 79, club: 'Atletico Madrid', nat: 'Belgium' },
  { name: 'Cesar Azpilicueta', pos: 'DEF', rat: 78, club: 'Atletico Madrid', nat: 'Spain' },

  { name: 'Nico Williams', pos: 'FWD', rat: 85, club: 'Athletic Bilbao', nat: 'Spain' },
  { name: 'Inaki Williams', pos: 'FWD', rat: 82, club: 'Athletic Bilbao', nat: 'Ghana' },
  { name: 'Oihan Sancet', pos: 'MID', rat: 81, club: 'Athletic Bilbao', nat: 'Spain' },
  { name: 'Daniel Vivian', pos: 'DEF', rat: 81, club: 'Athletic Bilbao', nat: 'Spain' },
  { name: 'Unai Simón', pos: 'GK', rat: 85, club: 'Athletic Bilbao', nat: 'Spain' },
  { name: 'Gorka Guruzeta', pos: 'FWD', rat: 79, club: 'Athletic Bilbao', nat: 'Spain' },
  { name: 'Alex Berenguer', pos: 'FWD', rat: 78, club: 'Athletic Bilbao', nat: 'Spain' },
  { name: 'Yuri Berchiche', pos: 'DEF', rat: 79, club: 'Athletic Bilbao', nat: 'Spain' },

  { name: 'Martin Zubimendi', pos: 'MID', rat: 84, club: 'Real Sociedad', nat: 'Spain' },
  { name: 'Takefusa Kubo', pos: 'FWD', rat: 83, club: 'Real Sociedad', nat: 'Japan' },
  { name: 'Mikel Oyarzabal', pos: 'FWD', rat: 82, club: 'Real Sociedad', nat: 'Spain' },
  { name: 'Alex Remiro', pos: 'GK', rat: 83, club: 'Real Sociedad', nat: 'Spain' },
  { name: 'Brais Méndez', pos: 'MID', rat: 81, club: 'Real Sociedad', nat: 'Spain' },
  { name: 'Nayef Aguerd', pos: 'DEF', rat: 80, club: 'Real Sociedad', nat: 'Morocco' },
  { name: 'Igor Zubeldia', pos: 'DEF', rat: 80, club: 'Real Sociedad', nat: 'Spain' },

  { name: 'Viktor Tsygankov', pos: 'FWD', rat: 81, club: 'Girona', nat: 'Ukraine' },
  { name: 'Yangel Herrera', pos: 'MID', rat: 80, club: 'Girona', nat: 'Venezuela' },
  { name: 'Daley Blind', pos: 'DEF', rat: 79, club: 'Girona', nat: 'Netherlands' },
  { name: 'Miguel Gutiérrez', pos: 'DEF', rat: 80, club: 'Girona', nat: 'Spain' },
  { name: 'Paulo Gazzaniga', pos: 'GK', rat: 79, club: 'Girona', nat: 'Argentina' },
  { name: 'Arnau Martínez', pos: 'DEF', rat: 77, club: 'Girona', nat: 'Spain' },
  { name: 'Cristhian Stuani', pos: 'FWD', rat: 76, club: 'Girona', nat: 'Uruguay' },

  { name: 'Isco Alarcon', pos: 'MID', rat: 83, club: 'Real Betis', nat: 'Spain' },
  { name: 'Giovani Lo Celso', pos: 'MID', rat: 81, club: 'Real Betis', nat: 'Argentina' },
  { name: 'Pablo Fornals', pos: 'MID', rat: 79, club: 'Real Betis', nat: 'Spain' },
  { name: 'Marc Roca', pos: 'MID', rat: 78, club: 'Real Betis', nat: 'Spain' },
  { name: 'Hector Bellerin', pos: 'DEF', rat: 77, club: 'Real Betis', nat: 'Spain' },
  { name: 'Marc Bartra', pos: 'DEF', rat: 76, club: 'Real Betis', nat: 'Spain' },
  { name: 'Rui Silva', pos: 'GK', rat: 79, club: 'Real Betis', nat: 'Portugal' },
  { name: 'Chimy Ávila', pos: 'FWD', rat: 77, club: 'Real Betis', nat: 'Argentina' },

  { name: 'Lucas Ocampos', pos: 'FWD', rat: 80, club: 'Sevilla', nat: 'Argentina' },
  { name: 'Loic Badé', pos: 'DEF', rat: 79, club: 'Sevilla', nat: 'France' },
  { name: 'Dodi Lukebakio', pos: 'FWD', rat: 78, club: 'Sevilla', nat: 'Belgium' },
  { name: 'Saul Niguez', pos: 'MID', rat: 77, club: 'Sevilla', nat: 'Spain' },
  { name: 'Nemanja Gudelj', pos: 'DEF', rat: 77, club: 'Sevilla', nat: 'Serbia' },
  { name: 'Jesus Navas', pos: 'DEF', rat: 77, club: 'Sevilla', nat: 'Spain' },
  { name: 'Orjan Nyland', pos: 'GK', rat: 78, club: 'Sevilla', nat: 'Norway' },

  { name: 'Gerard Moreno', pos: 'FWD', rat: 82, club: 'Villarreal', nat: 'Spain' },
  { name: 'Alex Baena', pos: 'MID', rat: 81, club: 'Villarreal', nat: 'Spain' },
  { name: 'Yeremy Pino', pos: 'FWD', rat: 79, club: 'Villarreal', nat: 'Spain' },
  { name: 'Dani Parejo', pos: 'MID', rat: 80, club: 'Villarreal', nat: 'Spain' },
  { name: 'Raul Albiol', pos: 'DEF', rat: 77, club: 'Villarreal', nat: 'Spain' },
  { name: 'Ayoze Pérez', pos: 'FWD', rat: 79, club: 'Villarreal', nat: 'Spain' },
  { name: 'Diego Conde', pos: 'GK', rat: 76, club: 'Villarreal', nat: 'Spain' },

  { name: 'Giorgi Mamardashvili', pos: 'GK', rat: 84, club: 'Valencia', nat: 'Georgia' },
  { name: 'Jose Gaya', pos: 'DEF', rat: 81, club: 'Valencia', nat: 'Spain' },
  { name: 'Pepelu Garcia', pos: 'MID', rat: 79, club: 'Valencia', nat: 'Spain' },
  { name: 'Cristhian Mosquera', pos: 'DEF', rat: 77, club: 'Valencia', nat: 'Spain' },
  { name: 'Hugo Duro', pos: 'FWD', rat: 78, club: 'Valencia', nat: 'Spain' },

  { name: 'Borja Mayoral', pos: 'FWD', rat: 79, club: 'Getafe', nat: 'Spain' },
  { name: 'David Soria', pos: 'GK', rat: 79, club: 'Getafe', nat: 'Spain' },
  { name: 'Mauro Arambarri', pos: 'MID', rat: 77, club: 'Getafe', nat: 'Uruguay' },
  { name: 'Djene Dakonam', pos: 'DEF', rat: 78, club: 'Getafe', nat: 'Togo' },

  { name: 'Ante Budimir', pos: 'FWD', rat: 79, club: 'Osasuna', nat: 'Croatia' },
  { name: 'Jon Moncayola', pos: 'MID', rat: 77, club: 'Osasuna', nat: 'Spain' },
  { name: 'Sergio Herrera', pos: 'GK', rat: 78, club: 'Osasuna', nat: 'Spain' },
  { name: 'Alejandro Catena', pos: 'DEF', rat: 77, club: 'Osasuna', nat: 'Spain' },

  // ==========================================
  // --- SERIE A (ITALY) ---
  // ==========================================
  { name: 'Lautaro Martínez', pos: 'FWD', rat: 89, club: 'Inter Milan', nat: 'Argentina' },
  { name: 'Marcus Thuram', pos: 'FWD', rat: 84, club: 'Inter Milan', nat: 'France' },
  { name: 'Hakan Calhanoglu', pos: 'MID', rat: 86, club: 'Inter Milan', nat: 'Turkey' },
  { name: 'Nicolo Barella', pos: 'MID', rat: 87, club: 'Inter Milan', nat: 'Italy' },
  { name: 'Federico Dimarco', pos: 'DEF', rat: 84, club: 'Inter Milan', nat: 'Italy' },
  { name: 'Alessandro Bastoni', pos: 'DEF', rat: 86, club: 'Inter Milan', nat: 'Italy' },
  { name: 'Benjamin Pavard', pos: 'DEF', rat: 84, club: 'Inter Milan', nat: 'France' },
  { name: 'Yann Sommer', pos: 'GK', rat: 84, club: 'Inter Milan', nat: 'Switzerland' },
  { name: 'Denzel Dumfries', pos: 'DEF', rat: 81, club: 'Inter Milan', nat: 'Netherlands' },
  { name: 'Francesco Acerbi', pos: 'DEF', rat: 81, club: 'Inter Milan', nat: 'Italy' },
  { name: 'Stefan de Vrij', pos: 'DEF', rat: 80, club: 'Inter Milan', nat: 'Netherlands' },
  { name: 'Davide Frattesi', pos: 'MID', rat: 81, club: 'Inter Milan', nat: 'Italy' },
  { name: 'Piotr Zielinski', pos: 'MID', rat: 82, club: 'Inter Milan', nat: 'Poland' },
  { name: 'Matteo Darmian', pos: 'DEF', rat: 79, club: 'Inter Milan', nat: 'Italy' },
  { name: 'Mehdi Taremi', pos: 'FWD', rat: 80, club: 'Inter Milan', nat: 'Iran' },
  { name: 'Carlos Augusto', pos: 'DEF', rat: 78, club: 'Inter Milan', nat: 'Brazil' },

  { name: 'Rafael Leão', pos: 'FWD', rat: 86, club: 'AC Milan', nat: 'Portugal' },
  { name: 'Christian Pulisic', pos: 'MID', rat: 83, club: 'AC Milan', nat: 'USA' },
  { name: 'Theo Hernandez', pos: 'DEF', rat: 87, club: 'AC Milan', nat: 'France' },
  { name: 'Mike Maignan', pos: 'GK', rat: 86, club: 'AC Milan', nat: 'France' },
  { name: 'Fikayo Tomori', pos: 'DEF', rat: 83, club: 'AC Milan', nat: 'England' },
  { name: 'Alvaro Morata', pos: 'FWD', rat: 83, club: 'AC Milan', nat: 'Spain' },
  { name: 'Ismael Bennacer', pos: 'MID', rat: 81, club: 'AC Milan', nat: 'Algeria' },
  { name: 'Tijjani Reijnders', pos: 'MID', rat: 82, club: 'AC Milan', nat: 'Netherlands' },
  { name: 'Ruben Loftus-Cheek', pos: 'MID', rat: 80, club: 'AC Milan', nat: 'England' },
  { name: 'Tammy Abraham', pos: 'FWD', rat: 79, club: 'AC Milan', nat: 'England' },
  { name: 'Strahinja Pavlovic', pos: 'DEF', rat: 79, club: 'AC Milan', nat: 'Serbia' },
  { name: 'Emerson Royal', pos: 'DEF', rat: 77, club: 'AC Milan', nat: 'Brazil' },
  { name: 'Samuel Chukwueze', pos: 'FWD', rat: 78, club: 'AC Milan', nat: 'Nigeria' },
  { name: 'Yunus Musah', pos: 'MID', rat: 77, club: 'AC Milan', nat: 'USA' },
  { name: 'Matteo Gabbia', pos: 'DEF', rat: 79, club: 'AC Milan', nat: 'Italy' },

  { name: 'Dusan Vlahovic', pos: 'FWD', rat: 84, club: 'Juventus', nat: 'Serbia' },
  { name: 'Kenan Yildiz', pos: 'FWD', rat: 79, club: 'Juventus', nat: 'Turkey' },
  { name: 'Teun Koopmeiners', pos: 'MID', rat: 84, club: 'Juventus', nat: 'Netherlands' },
  { name: 'Douglas Luiz', pos: 'MID', rat: 83, club: 'Juventus', nat: 'Brazil' },
  { name: 'Manuel Locatelli', pos: 'MID', rat: 82, club: 'Juventus', nat: 'Italy' },
  { name: 'Gleison Bremer', pos: 'DEF', rat: 85, club: 'Juventus', nat: 'Brazil' },
  { name: 'Federico Gatti', pos: 'DEF', rat: 80, club: 'Juventus', nat: 'Italy' },
  { name: 'Michele Di Gregorio', pos: 'GK', rat: 82, club: 'Juventus', nat: 'Italy' },
  { name: 'Khephren Thuram', pos: 'MID', rat: 79, club: 'Juventus', nat: 'France' },
  { name: 'Weston McKennie', pos: 'MID', rat: 80, club: 'Juventus', nat: 'USA' },
  { name: 'Timothy Weah', pos: 'FWD', rat: 78, club: 'Juventus', nat: 'USA' },
  { name: 'Andrea Cambiaso', pos: 'DEF', rat: 80, club: 'Juventus', nat: 'Italy' },
  { name: 'Pierre Kalulu', pos: 'DEF', rat: 79, club: 'Juventus', nat: 'France' },
  { name: 'Danilo Luiz', pos: 'DEF', rat: 81, club: 'Juventus', nat: 'Brazil' },
  { name: 'Francisco Conceicao', pos: 'FWD', rat: 79, club: 'Juventus', nat: 'Portugal' },
  { name: 'Nico Gonzalez', pos: 'FWD', rat: 81, club: 'Juventus', nat: 'Argentina' },

  { name: 'Khvicha Kvaratskhelia', pos: 'FWD', rat: 85, club: 'Napoli', nat: 'Georgia' },
  { name: 'Victor Osimhen', pos: 'FWD', rat: 87, club: 'Napoli', nat: 'Nigeria' },
  { name: 'Romelu Lukaku', pos: 'FWD', rat: 83, club: 'Napoli', nat: 'Belgium' },
  { name: 'Giovanni Di Lorenzo', pos: 'DEF', rat: 82, club: 'Napoli', nat: 'Italy' },
  { name: 'Stanislav Lobotka', pos: 'MID', rat: 82, club: 'Napoli', nat: 'Slovakia' },
  { name: 'Frank Anguissa', pos: 'MID', rat: 80, club: 'Napoli', nat: 'Cameroon' },
  { name: 'Scott McTominay', pos: 'MID', rat: 80, club: 'Napoli', nat: 'Scotland' },
  { name: 'Billy Gilmour', pos: 'MID', rat: 78, club: 'Napoli', nat: 'Scotland' },
  { name: 'Amir Rrahmani', pos: 'DEF', rat: 80, club: 'Napoli', nat: 'Kosovo' },
  { name: 'Alex Meret', pos: 'GK', rat: 81, club: 'Napoli', nat: 'Italy' },
  { name: 'Mathias Olivera', pos: 'DEF', rat: 78, club: 'Napoli', nat: 'Uruguay' },
  { name: 'Matteo Politano', pos: 'FWD', rat: 80, club: 'Napoli', nat: 'Italy' },
  { name: 'Giacomo Raspadori', pos: 'FWD', rat: 79, club: 'Napoli', nat: 'Italy' },
  { name: 'Giovanni Simeone', pos: 'FWD', rat: 77, club: 'Napoli', nat: 'Argentina' },
  { name: 'David Neres', pos: 'FWD', rat: 80, club: 'Napoli', nat: 'Brazil' },

  { name: 'Paulo Dybala', pos: 'FWD', rat: 85, club: 'AS Roma', nat: 'Argentina' },
  { name: 'Artem Dovbyk', pos: 'FWD', rat: 82, club: 'AS Roma', nat: 'Ukraine' },
  { name: 'Lorenzo Pellegrini', pos: 'MID', rat: 82, club: 'AS Roma', nat: 'Italy' },
  { name: 'Gianluca Mancini', pos: 'DEF', rat: 81, club: 'AS Roma', nat: 'Italy' },
  { name: 'Evan Ndicka', pos: 'DEF', rat: 80, club: 'AS Roma', nat: 'Ivory Coast' },
  { name: 'Bryan Cristante', pos: 'MID', rat: 80, club: 'AS Roma', nat: 'Italy' },
  { name: 'Leandro Paredes', pos: 'MID', rat: 79, club: 'AS Roma', nat: 'Argentina' },
  { name: 'Stephan El Shaarawy', pos: 'FWD', rat: 78, club: 'AS Roma', nat: 'Italy' },
  { name: 'Matias Soulé', pos: 'FWD', rat: 79, club: 'AS Roma', nat: 'Argentina' },
  { name: 'Mats Hummels', pos: 'DEF', rat: 81, club: 'AS Roma', nat: 'Germany' },
  { name: 'Mario Hermoso', pos: 'DEF', rat: 80, club: 'AS Roma', nat: 'Spain' },
  { name: 'Mile Svilar', pos: 'GK', rat: 80, club: 'AS Roma', nat: 'Serbia' },
  { name: 'Zeki Celik', pos: 'DEF', rat: 77, club: 'AS Roma', nat: 'Turkey' },

  { name: 'Mattia Zaccagni', pos: 'FWD', rat: 81, club: 'Lazio', nat: 'Italy' },
  { name: 'Matteo Guendouzi', pos: 'MID', rat: 80, club: 'Lazio', nat: 'France' },
  { name: 'Taty Castellanos', pos: 'FWD', rat: 79, club: 'Lazio', nat: 'Argentina' },
  { name: 'Nicolo Rovella', pos: 'MID', rat: 78, club: 'Lazio', nat: 'Italy' },
  { name: 'Alessio Romagnoli', pos: 'DEF', rat: 80, club: 'Lazio', nat: 'Italy' },
  { name: 'Ivan Provedel', pos: 'GK', rat: 82, club: 'Lazio', nat: 'Italy' },
  { name: 'Manuel Lazzari', pos: 'DEF', rat: 78, club: 'Lazio', nat: 'Italy' },
  { name: 'Boulaye Dia', pos: 'FWD', rat: 79, club: 'Lazio', nat: 'Senegal' },

  { name: 'Ademola Lookman', pos: 'FWD', rat: 83, club: 'Atalanta', nat: 'Nigeria' },
  { name: 'Charles De Ketelaere', pos: 'MID', rat: 81, club: 'Atalanta', nat: 'Belgium' },
  { name: 'Gianluca Scamacca', pos: 'FWD', rat: 81, club: 'Atalanta', nat: 'Italy' },
  { name: 'Giorgio Scalvini', pos: 'DEF', rat: 79, club: 'Atalanta', nat: 'Italy' },
  { name: 'Ederson Silva', pos: 'MID', rat: 81, club: 'Atalanta', nat: 'Brazil' },
  { name: 'Mario Pasalic', pos: 'MID', rat: 79, club: 'Atalanta', nat: 'Croatia' },
  { name: 'Davide Zappacosta', pos: 'DEF', rat: 79, club: 'Atalanta', nat: 'Italy' },
  { name: 'Sead Kolasinac', pos: 'DEF', rat: 78, club: 'Atalanta', nat: 'Bosnia' },
  { name: 'Berat Djimsiti', pos: 'DEF', rat: 78, club: 'Atalanta', nat: 'Albania' },
  { name: 'Marco Carnesecchi', pos: 'GK', rat: 80, club: 'Atalanta', nat: 'Italy' },
  { name: 'Raoul Bellanova', pos: 'DEF', rat: 79, club: 'Atalanta', nat: 'Italy' },
  { name: 'Mateo Retegui', pos: 'FWD', rat: 80, club: 'Atalanta', nat: 'Italy' },

  { name: 'Moise Kean', pos: 'FWD', rat: 79, club: 'Fiorentina', nat: 'Italy' },
  { name: 'David De Gea', pos: 'GK', rat: 80, club: 'Fiorentina', nat: 'Spain' },
  { name: 'Albert Gudmundsson', pos: 'FWD', rat: 80, club: 'Fiorentina', nat: 'Iceland' },
  { name: 'Rolando Mandragora', pos: 'MID', rat: 78, club: 'Fiorentina', nat: 'Italy' },
  { name: 'Cristiano Biraghi', pos: 'DEF', rat: 78, club: 'Fiorentina', nat: 'Italy' },
  { name: 'Dodo Cordoba', pos: 'DEF', rat: 78, club: 'Fiorentina', nat: 'Brazil' },

  { name: 'Riccardo Orsolini', pos: 'FWD', rat: 80, club: 'Bologna', nat: 'Italy' },
  { name: 'Lewis Ferguson', pos: 'MID', rat: 80, club: 'Bologna', nat: 'Scotland' },
  { name: 'Stefan Posch', pos: 'DEF', rat: 78, club: 'Bologna', nat: 'Austria' },
  { name: 'Lukasz Skorupski', pos: 'GK', rat: 79, club: 'Bologna', nat: 'Poland' },
  { name: 'Remo Freuler', pos: 'MID', rat: 79, club: 'Bologna', nat: 'Switzerland' },

  // ==========================================
  // --- BUNDESLIGA (GERMANY) ---
  // ==========================================
  { name: 'Harry Kane', pos: 'FWD', rat: 90, club: 'Bayern Munich', nat: 'England', styles: ['Target Man', 'Pass Master', 'Finesse Shot'], form: [8.6, 8.0, 8.9, 7.5, 9.4], stats: { goals: 36, assists: 10, passAccuracy: 86, defense: 48, physicality: 82, stamina: 83, pace: 72, dribbling: 82, xG90: 0.88, xA90: 0.26 } },
  { name: 'Jamal Musiala', pos: 'MID', rat: 87, club: 'Bayern Munich', nat: 'Germany', styles: ['Dribble Wizard', 'Infiltrator', 'Agile Turn'], form: [8.0, 8.3, 7.8, 8.5, 7.1], stats: { goals: 12, assists: 8, passAccuracy: 86, defense: 58, physicality: 64, stamina: 82, pace: 85, dribbling: 94, xG90: 0.28, xA90: 0.22 } },
  { name: 'Leroy Sané', pos: 'FWD', rat: 84, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'Serge Gnabry', pos: 'FWD', rat: 82, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'Thomas Müller', pos: 'MID', rat: 82, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'Joshua Kimmich', pos: 'MID', rat: 86, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'Leon Goretzka', pos: 'MID', rat: 82, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'João Palhinha', pos: 'MID', rat: 83, club: 'Bayern Munich', nat: 'Portugal', styles: ['Bruiser DEF', 'Slide Tackler', 'Midfield Anchor'], form: [7.5, 7.1, 7.8, 7.2, 7.4], stats: { goals: 3, assists: 1, passAccuracy: 80, defense: 88, physicality: 91, stamina: 89, pace: 68, dribbling: 70, xG90: 0.05, xA90: 0.02 } },
  { name: 'Michael Olise', pos: 'FWD', rat: 83, club: 'Bayern Munich', nat: 'France' },
  { name: 'Alphonso Davies', pos: 'DEF', rat: 83, club: 'Bayern Munich', nat: 'Canada' },
  { name: 'Dayot Upamecano', pos: 'DEF', rat: 82, club: 'Bayern Munich', nat: 'France' },
  { name: 'Min-jae Kim', pos: 'DEF', rat: 83, club: 'Bayern Munich', nat: 'South Korea' },
  { name: 'Manuel Neuer', pos: 'GK', rat: 84, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'Kingsley Coman', pos: 'FWD', rat: 82, club: 'Bayern Munich', nat: 'France' },
  { name: 'Konrad Laimer', pos: 'MID', rat: 81, club: 'Bayern Munich', nat: 'Austria' },
  { name: 'Aleksandar Pavlovic', pos: 'MID', rat: 79, club: 'Bayern Munich', nat: 'Germany' },
  { name: 'Eric Dier', pos: 'DEF', rat: 78, club: 'Bayern Munich', nat: 'England' },
  { name: 'Raphaël Guerreiro', pos: 'DEF', rat: 81, club: 'Bayern Munich', nat: 'Portugal' },
  { name: 'Sacha Boey', pos: 'DEF', rat: 78, club: 'Bayern Munich', nat: 'France' },
  { name: 'Mathys Tel', pos: 'FWD', rat: 77, club: 'Bayern Munich', nat: 'France' },
  { name: 'Hiroki Ito', pos: 'DEF', rat: 79, club: 'Bayern Munich', nat: 'Japan' },

  { name: 'Florian Wirtz', pos: 'MID', rat: 88, club: 'Bayer Leverkusen', nat: 'Germany' },
  { name: 'Granit Xhaka', pos: 'MID', rat: 85, club: 'Bayer Leverkusen', nat: 'Switzerland' },
  { name: 'Victor Boniface', pos: 'FWD', rat: 83, club: 'Bayer Leverkusen', nat: 'Nigeria' },
  { name: 'Jeremie Frimpong', pos: 'DEF', rat: 84, club: 'Bayer Leverkusen', nat: 'Netherlands', styles: ['Wing Back', 'Sprint Machine', 'Dribble Wizard'], form: [8.1, 7.4, 8.0, 8.3, 7.2], stats: { goals: 8, assists: 9, passAccuracy: 82, defense: 68, physicality: 66, stamina: 90, pace: 94, dribbling: 87, xG90: 0.18, xA90: 0.25 } },
  { name: 'Alejandro Grimaldo', pos: 'DEF', rat: 85, club: 'Bayer Leverkusen', nat: 'Spain' },
  { name: 'Patrik Schick', pos: 'FWD', rat: 81, club: 'Bayer Leverkusen', nat: 'Czech Republic' },
  { name: 'Robert Andrich', pos: 'MID', rat: 81, club: 'Bayer Leverkusen', nat: 'Germany' },
  { name: 'Jonathan Tah', pos: 'DEF', rat: 83, club: 'Bayer Leverkusen', nat: 'Germany' },
  { name: 'Edmond Tapsoba', pos: 'DEF', rat: 82, club: 'Bayer Leverkusen', nat: 'Burkina Faso' },
  { name: 'Lukas Hradecky', pos: 'GK', rat: 82, club: 'Bayer Leverkusen', nat: 'Finland' },
  { name: 'Exequiel Palacios', pos: 'MID', rat: 82, club: 'Bayer Leverkusen', nat: 'Argentina' },
  { name: 'Piero Hincapié', pos: 'DEF', rat: 81, club: 'Bayer Leverkusen', nat: 'Ecuador' },
  { name: 'Jonas Hofmann', pos: 'MID', rat: 81, club: 'Bayer Leverkusen', nat: 'Germany' },
  { name: 'Amine Adli', pos: 'FWD', rat: 79, club: 'Bayer Leverkusen', nat: 'Morocco' },
  { name: 'Martin Terrier', pos: 'FWD', rat: 79, club: 'Bayer Leverkusen', nat: 'France' },

  { name: 'Julian Brandt', pos: 'MID', rat: 84, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Serhou Guirassy', pos: 'FWD', rat: 83, club: 'Borussia Dortmund', nat: 'Guinea' },
  { name: 'Nico Schlotterbeck', pos: 'DEF', rat: 82, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Gregor Kobel', pos: 'GK', rat: 85, club: 'Borussia Dortmund', nat: 'Switzerland' },
  { name: 'Emre Can', pos: 'MID', rat: 81, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Marcel Sabitzer', pos: 'MID', rat: 82, club: 'Borussia Dortmund', nat: 'Austria' },
  { name: 'Karim Adeyemi', pos: 'FWD', rat: 80, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Donyell Malen', pos: 'FWD', rat: 81, club: 'Borussia Dortmund', nat: 'Netherlands' },
  { name: 'Julian Ryerson', pos: 'DEF', rat: 80, club: 'Borussia Dortmund', nat: 'Norway' },
  { name: 'Niklas Süle', pos: 'DEF', rat: 81, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Ramy Bensebaini', pos: 'DEF', rat: 79, club: 'Borussia Dortmund', nat: 'Algeria' },
  { name: 'Felix Nmecha', pos: 'MID', rat: 78, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Maximilian Beier', pos: 'FWD', rat: 79, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Jamie Gittens', pos: 'FWD', rat: 78, club: 'Borussia Dortmund', nat: 'England' },
  { name: 'Waldemar Anton', pos: 'DEF', rat: 81, club: 'Borussia Dortmund', nat: 'Germany' },
  { name: 'Pascal Groß', pos: 'MID', rat: 82, club: 'Borussia Dortmund', nat: 'Germany' },

  { name: 'Lois Openda', pos: 'FWD', rat: 83, club: 'RB Leipzig', nat: 'Belgium' },
  { name: 'Benjamin Sesko', pos: 'FWD', rat: 81, club: 'RB Leipzig', nat: 'Slovenia' },
  { name: 'Xavi Simons', pos: 'MID', rat: 84, club: 'RB Leipzig', nat: 'Netherlands' },
  { name: 'Castello Lukeba', pos: 'DEF', rat: 80, club: 'RB Leipzig', nat: 'France' },
  { name: 'Willi Orbán', pos: 'DEF', rat: 81, club: 'RB Leipzig', nat: 'Hungary' },
  { name: 'Péter Gulácsi', pos: 'GK', rat: 81, club: 'RB Leipzig', nat: 'Hungary' },
  { name: 'Amadou Haidara', pos: 'MID', rat: 79, club: 'RB Leipzig', nat: 'Mali' },
  { name: 'Kevin Kampl', pos: 'MID', rat: 78, club: 'RB Leipzig', nat: 'Slovenia' },
  { name: 'Benjamin Henrichs', pos: 'DEF', rat: 79, club: 'RB Leipzig', nat: 'Germany' },
  { name: 'David Raum', pos: 'DEF', rat: 80, club: 'RB Leipzig', nat: 'Germany' },
  { name: 'Christoph Baumgartner', pos: 'MID', rat: 79, club: 'RB Leipzig', nat: 'Austria' },
  { name: 'Lutsharel Geertruida', pos: 'DEF', rat: 80, club: 'RB Leipzig', nat: 'Netherlands' },

  { name: 'Deniz Undav', pos: 'FWD', rat: 81, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Ermedin Demirovic', pos: 'FWD', rat: 79, club: 'Stuttgart', nat: 'Bosnia' },
  { name: 'Atakan Karazor', pos: 'MID', rat: 78, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Enzo Millot', pos: 'MID', rat: 79, club: 'Stuttgart', nat: 'France' },
  { name: 'Angelo Stiller', pos: 'MID', rat: 80, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Alexander Nübel', pos: 'GK', rat: 81, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Jeff Chabot', pos: 'DEF', rat: 78, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Maximilian Mittelstädt', pos: 'DEF', rat: 80, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Josha Vagnoman', pos: 'DEF', rat: 77, club: 'Stuttgart', nat: 'Germany' },
  { name: 'Jamie Leweling', pos: 'FWD', rat: 77, club: 'Stuttgart', nat: 'Germany' },

  { name: 'Omar Marmoush', pos: 'FWD', rat: 81, club: 'Eintracht Frankfurt', nat: 'Egypt' },
  { name: 'Hugo Ekitike', pos: 'FWD', rat: 79, club: 'Eintracht Frankfurt', nat: 'France' },
  { name: 'Mario Götze', pos: 'MID', rat: 80, club: 'Eintracht Frankfurt', nat: 'Germany' },
  { name: 'Kevin Trapp', pos: 'GK', rat: 81, club: 'Eintracht Frankfurt', nat: 'Germany' },
  { name: 'Robin Koch', pos: 'DEF', rat: 79, club: 'Eintracht Frankfurt', nat: 'Germany' },
  { name: 'Ellyes Skhiri', pos: 'MID', rat: 80, club: 'Eintracht Frankfurt', nat: 'Tunisia' },
  { name: 'Fares Chaibi', pos: 'MID', rat: 78, club: 'Eintracht Frankfurt', nat: 'Algeria' },
  { name: 'Hugo Larsson', pos: 'MID', rat: 78, club: 'Eintracht Frankfurt', nat: 'Sweden' },
  { name: 'Ansgar Knauff', pos: 'FWD', rat: 77, club: 'Eintracht Frankfurt', nat: 'Germany' },

  { name: 'Andrej Kramaric', pos: 'FWD', rat: 80, club: 'Hoffenheim', nat: 'Croatia' },
  { name: 'Oliver Baumann', pos: 'GK', rat: 81, club: 'Hoffenheim', nat: 'Germany' },
  { name: 'Grischa Prömel', pos: 'MID', rat: 78, club: 'Hoffenheim', nat: 'Germany' },
  { name: 'Florian Grillitsch', pos: 'MID', rat: 78, club: 'Hoffenheim', nat: 'Austria' },

  { name: 'Alassane Plea', pos: 'FWD', rat: 78, club: 'Monchengladbach', nat: 'France' },
  { name: 'Julian Weigl', pos: 'MID', rat: 78, club: 'Monchengladbach', nat: 'Germany' },
  { name: 'Ko Itakura', pos: 'DEF', rat: 79, club: 'Monchengladbach', nat: 'Japan' },
  { name: 'Jonas Omlin', pos: 'GK', rat: 79, club: 'Monchengladbach', nat: 'Switzerland' },

  { name: 'Kevin Behrens', pos: 'FWD', rat: 76, club: 'Wolfsburg', nat: 'Germany' },
  { name: 'Maximilian Arnold', pos: 'MID', rat: 79, club: 'Wolfsburg', nat: 'Germany' },
  { name: 'Sebastiaan Bornauw', pos: 'DEF', rat: 76, club: 'Wolfsburg', nat: 'Belgium' },
  { name: 'Kamil Grabara', pos: 'GK', rat: 79, club: 'Wolfsburg', nat: 'Poland' },

  // ==========================================
  // --- SAUDI LEAGUE (SAUDI ARABIA) ---
  // ==========================================
  { name: 'Cristiano Ronaldo', pos: 'FWD', rat: 88, club: 'Al Nassr', nat: 'Portugal' },
  { name: 'Sadio Mané', pos: 'FWD', rat: 84, club: 'Al Nassr', nat: 'Senegal' },
  { name: 'Aymeric Laporte', pos: 'DEF', rat: 83, club: 'Al Nassr', nat: 'Spain' },
  { name: 'Marcelo Brozovic', pos: 'MID', rat: 83, club: 'Al Nassr', nat: 'Croatia' },
  { name: 'Otavio Monteiro', pos: 'MID', rat: 82, club: 'Al Nassr', nat: 'Portugal' },
  { name: 'Anderson Talisca', pos: 'FWD', rat: 81, club: 'Al Nassr', nat: 'Brazil' },
  { name: 'Bento Matheus', pos: 'GK', rat: 81, club: 'Al Nassr', nat: 'Brazil' },
  { name: 'Mohamed Simakan', pos: 'DEF', rat: 80, club: 'Al Nassr', nat: 'France' },
  { name: 'Sultan Al-Ghannam', pos: 'DEF', rat: 76, club: 'Al Nassr', nat: 'Saudi Arabia' },
  { name: 'Abdullah Al-Khaibari', pos: 'MID', rat: 74, club: 'Al Nassr', nat: 'Saudi Arabia' },
  { name: 'Ali Lajami', pos: 'DEF', rat: 74, club: 'Al Nassr', nat: 'Saudi Arabia' },

  { name: 'Neymar Jr', pos: 'FWD', rat: 87, club: 'Al Hilal', nat: 'Brazil' },
  { name: 'Aleksandar Mitrovic', pos: 'FWD', rat: 83, club: 'Al Hilal', nat: 'Serbia' },
  { name: 'Sergej Milinkovic-Savic', pos: 'MID', rat: 84, club: 'Al Hilal', nat: 'Serbia' },
  { name: 'Ruben Neves', pos: 'MID', rat: 83, club: 'Al Hilal', nat: 'Portugal' },
  { name: 'Joao Cancelo', pos: 'DEF', rat: 84, club: 'Al Hilal', nat: 'Portugal' },
  { name: 'Kalidou Koulibaly', pos: 'DEF', rat: 82, club: 'Al Hilal', nat: 'Senegal' },
  { name: 'Malcom Oliveira', pos: 'FWD', rat: 81, club: 'Al Hilal', nat: 'Brazil' },
  { name: 'Yassine Bounou', pos: 'GK', rat: 84, club: 'Al Hilal', nat: 'Morocco' },
  { name: 'Renan Lodi', pos: 'DEF', rat: 79, club: 'Al Hilal', nat: 'Brazil' },
  { name: 'Salem Al-Dawsari', pos: 'FWD', rat: 78, club: 'Al Hilal', nat: 'Saudi Arabia' },
  { name: 'Mohamed Kanno', pos: 'MID', rat: 75, club: 'Al Hilal', nat: 'Saudi Arabia' },
  { name: 'Yasir Al-Shahrani', pos: 'DEF', rat: 74, club: 'Al Hilal', nat: 'Saudi Arabia' },

  { name: 'Karim Benzema', pos: 'FWD', rat: 86, club: 'Al Ittihad', nat: 'France' },
  { name: 'N\'Golo Kanté', pos: 'MID', rat: 84, club: 'Al Ittihad', nat: 'France' },
  { name: 'Fabinho Tavares', pos: 'MID', rat: 82, club: 'Al Ittihad', nat: 'Brazil' },
  { name: 'Moussa Diaby', pos: 'FWD', rat: 82, club: 'Al Ittihad', nat: 'France' },
  { name: 'Houssem Aouar', pos: 'MID', rat: 79, club: 'Al Ittihad', nat: 'Algeria' },
  { name: 'Steven Bergwijn', pos: 'FWD', rat: 79, club: 'Al Ittihad', nat: 'Netherlands' },
  { name: 'Luiz Felipe', pos: 'DEF', rat: 78, club: 'Al Ittihad', nat: 'Italy' },
  { name: 'Predrag Rajkovic', pos: 'GK', rat: 79, club: 'Al Ittihad', nat: 'Serbia' },
  { name: 'Fawaz Al-Sqoor', pos: 'DEF', rat: 73, club: 'Al Ittihad', nat: 'Saudi Arabia' },
  { name: 'Hassan Kadesh', pos: 'DEF', rat: 73, club: 'Al Ittihad', nat: 'Saudi Arabia' },

  { name: 'Riyad Mahrez', pos: 'FWD', rat: 83, club: 'Al Ahli', nat: 'Algeria' },
  { name: 'Roberto Firmino', pos: 'FWD', rat: 80, club: 'Al Ahli', nat: 'Brazil' },
  { name: 'Franck Kessié', pos: 'MID', rat: 81, club: 'Al Ahli', nat: 'Ivory Coast' },
  { name: 'Ivan Toney', pos: 'FWD', rat: 82, club: 'Al Ahli', nat: 'England' },
  { name: 'Gabri Veiga', pos: 'MID', rat: 78, club: 'Al Ahli', nat: 'Spain' },
  { name: 'Edouard Mendy', pos: 'GK', rat: 80, club: 'Al Ahli', nat: 'Senegal' },
  { name: 'Merih Demiral', pos: 'DEF', rat: 79, club: 'Al Ahli', nat: 'Turkey' },
  { name: 'Roger Ibañez', pos: 'DEF', rat: 79, club: 'Al Ahli', nat: 'Brazil' },
  { name: 'Firas Al-Buraikan', pos: 'FWD', rat: 75, club: 'Al Ahli', nat: 'Saudi Arabia' },

  { name: 'Georginio Wijnaldum', pos: 'MID', rat: 79, club: 'Al Ettifaq', nat: 'Netherlands' },
  { name: 'Moussa Dembélé', pos: 'FWD', rat: 78, club: 'Al Ettifaq', nat: 'France' },
  { name: 'Demarai Gray', pos: 'FWD', rat: 77, club: 'Al Ettifaq', nat: 'Jamaica' },
  { name: 'Seko Fofana', pos: 'MID', rat: 80, club: 'Al Ettifaq', nat: 'Ivory Coast' },
  { name: 'Alvaro Medran', pos: 'MID', rat: 76, club: 'Al Ettifaq', nat: 'Spain' },
  { name: 'Karl Toko Ekambi', pos: 'FWD', rat: 77, club: 'Al Ettifaq', nat: 'Cameroon' },

  { name: 'Pierre-Emerick Aubameyang', pos: 'FWD', rat: 81, club: 'Al Qadsiah', nat: 'Gabon' },
  { name: 'Nacho Fernandez', pos: 'DEF', rat: 81, club: 'Al Qadsiah', nat: 'Spain' },
  { name: 'Koen Casteels', pos: 'GK', rat: 81, club: 'Al Qadsiah', nat: 'Belgium' },
  { name: 'Nahitan Nandez', pos: 'MID', rat: 78, club: 'Al Qadsiah', nat: 'Uruguay' },
  { name: 'Abdulelah Al-Amri', pos: 'DEF', rat: 74, club: 'Al Qadsiah', nat: 'Saudi Arabia' },
  { name: 'Julian Quiñones', pos: 'FWD', rat: 78, club: 'Al Qadsiah', nat: 'Mexico' },
  { name: 'Cameron Puertas', pos: 'MID', rat: 78, club: 'Al Qadsiah', nat: 'Spain' },

  // ==========================================
  // --- AMERICAN LEAGUE (MLS) ---
  // ==========================================
  { name: 'Lionel Messi', pos: 'FWD', rat: 90, club: 'Inter Miami', nat: 'Argentina', styles: ['Dribble Wizard', 'Finesse Shot', 'Playmaker'], form: [9.0, 9.4, 8.8, 9.5, 9.2], stats: { goals: 28, assists: 16, passAccuracy: 91, defense: 38, physicality: 68, stamina: 78, pace: 80, dribbling: 94, xG90: 0.72, xA90: 0.45 } },
  { name: 'Luis Suarez', pos: 'FWD', rat: 82, club: 'Inter Miami', nat: 'Uruguay' },
  { name: 'Sergio Busquets', pos: 'MID', rat: 81, club: 'Inter Miami', nat: 'Spain' },
  { name: 'Jordi Alba', pos: 'DEF', rat: 80, club: 'Inter Miami', nat: 'Spain' },
  { name: 'Drake Callender', pos: 'GK', rat: 76, club: 'Inter Miami', nat: 'USA' },
  { name: 'Matias Rojas', pos: 'MID', rat: 76, club: 'Inter Miami', nat: 'Paraguay' },
  { name: 'Julian Gressel', pos: 'MID', rat: 75, club: 'Inter Miami', nat: 'USA' },
  { name: 'Leonardo Campana', pos: 'FWD', rat: 75, club: 'Inter Miami', nat: 'Ecuador' },
  { name: 'Benjamin Cremaschi', pos: 'MID', rat: 73, club: 'Inter Miami', nat: 'USA' },
  { name: 'Diego Gómez', pos: 'MID', rat: 75, club: 'Inter Miami', nat: 'Paraguay' },
  { name: 'Tomas Aviles', pos: 'DEF', rat: 73, club: 'Inter Miami', nat: 'Argentina' },
  { name: 'Serhiy Kryvtsov', pos: 'DEF', rat: 72, club: 'Inter Miami', nat: 'Ukraine' },
  { name: 'Nicolas Freire', pos: 'DEF', rat: 73, club: 'Inter Miami', nat: 'Argentina' },
  { name: 'Federico Redondo', pos: 'MID', rat: 74, club: 'Inter Miami', nat: 'Argentina' },

  { name: 'Olivier Giroud', pos: 'FWD', rat: 81, club: 'LAFC', nat: 'France' },
  { name: 'Denis Bouanga', pos: 'FWD', rat: 80, club: 'LAFC', nat: 'Gabon' },
  { name: 'Eduard Atuesta', pos: 'MID', rat: 76, club: 'LAFC', nat: 'Colombia' },
  { name: 'Hugo Lloris', pos: 'GK', rat: 80, club: 'LAFC', nat: 'France' },
  { name: 'Jesus Murillo', pos: 'DEF', rat: 74, club: 'LAFC', nat: 'Colombia' },
  { name: 'Mateusz Bogusz', pos: 'MID', rat: 77, club: 'LAFC', nat: 'Poland' },
  { name: 'Ryan Hollingshead', pos: 'DEF', rat: 73, club: 'LAFC', nat: 'USA' },
  { name: 'Ilie Sánchez', pos: 'MID', rat: 74, club: 'LAFC', nat: 'Spain' },
  { name: 'Timothy Tillman', pos: 'MID', rat: 74, club: 'LAFC', nat: 'Germany' },

  { name: 'Marco Reus', pos: 'MID', rat: 81, club: 'LA Galaxy', nat: 'Germany' },
  { name: 'Riqui Puig', pos: 'MID', rat: 80, club: 'LA Galaxy', nat: 'Spain' },
  { name: 'Gabriel Pec', pos: 'FWD', rat: 78, club: 'LA Galaxy', nat: 'Brazil' },
  { name: 'Joseph Paintsil', pos: 'FWD', rat: 77, club: 'LA Galaxy', nat: 'Ghana' },
  { name: 'Maya Yoshida', pos: 'DEF', rat: 74, club: 'LA Galaxy', nat: 'Japan' },
  { name: 'John McCarthy', pos: 'GK', rat: 74, club: 'LA Galaxy', nat: 'USA' },
  { name: 'Jalen Neal', pos: 'DEF', rat: 71, club: 'LA Galaxy', nat: 'USA' },
  { name: 'Mark Delgado', pos: 'MID', rat: 73, club: 'LA Galaxy', nat: 'USA' },
  { name: 'Gaston Brugman', pos: 'MID', rat: 74, club: 'LA Galaxy', nat: 'Uruguay' },
  { name: 'Dejan Joveljic', pos: 'FWD', rat: 75, club: 'LA Galaxy', nat: 'Serbia' },

  { name: 'Cucho Hernández', pos: 'FWD', rat: 81, club: 'Columbus Crew', nat: 'Colombia' },
  { name: 'Diego Rossi', pos: 'FWD', rat: 78, club: 'Columbus Crew', nat: 'Uruguay' },
  { name: 'Darlington Nagbe', pos: 'MID', rat: 76, club: 'Columbus Crew', nat: 'USA' },
  { name: 'Steven Moreira', pos: 'DEF', rat: 75, club: 'Columbus Crew', nat: 'France' },
  { name: 'Rudy Camacho', pos: 'DEF', rat: 74, club: 'Columbus Crew', nat: 'France' },
  { name: 'Patrick Schulte', pos: 'GK', rat: 75, club: 'Columbus Crew', nat: 'USA' },
  { name: 'Christian Ramirez', pos: 'FWD', rat: 72, club: 'Columbus Crew', nat: 'USA' },

  { name: 'Luciano Acosta', pos: 'MID', rat: 81, club: 'FC Cincinnati', nat: 'Argentina' },
  { name: 'Luca Orellano', pos: 'MID', rat: 77, club: 'FC Cincinnati', nat: 'Argentina' },
  { name: 'Miles Robinson', pos: 'DEF', rat: 75, club: 'FC Cincinnati', nat: 'USA' },
  { name: 'Obinna Nwobodo', pos: 'MID', rat: 75, club: 'FC Cincinnati', nat: 'Nigeria' },
  { name: 'Roman Celentano', pos: 'GK', rat: 75, club: 'FC Cincinnati', nat: 'USA' },
  { name: 'DeAndre Yedlin', pos: 'DEF', rat: 74, club: 'FC Cincinnati', nat: 'USA' },
  { name: 'Pavel Bucha', pos: 'MID', rat: 73, club: 'FC Cincinnati', nat: 'Czech Republic' },
  { name: 'Yuya Kubo', pos: 'FWD', rat: 72, club: 'FC Cincinnati', nat: 'Japan' },

  { name: 'Hany Mukhtar', pos: 'MID', rat: 79, club: 'Nashville SC', nat: 'Germany' },
  { name: 'Walker Zimmerman', pos: 'DEF', rat: 76, club: 'Nashville SC', nat: 'USA' },
  { name: 'Joe Willis', pos: 'GK', rat: 74, club: 'Nashville SC', nat: 'USA' },
  { name: 'Sam Surridge', pos: 'FWD', rat: 74, club: 'Nashville SC', nat: 'England' },
  { name: 'Jacob Shaffelburg', pos: 'FWD', rat: 74, club: 'Nashville SC', nat: 'Canada' },

  { name: 'Christian Benteke', pos: 'FWD', rat: 78, club: 'D.C. United', nat: 'Belgium' },
  { name: 'Mateusz Klich', pos: 'MID', rat: 75, club: 'D.C. United', nat: 'Poland' },
  { name: 'Aaron Herrera', pos: 'DEF', rat: 73, club: 'D.C. United', nat: 'Guatemala' },
  { name: 'Matti Peltola', pos: 'MID', rat: 72, club: 'D.C. United', nat: 'Finland' },

  { name: 'Lewis Morgan', pos: 'MID', rat: 77, club: 'New York Red Bulls', nat: 'Scotland' },
  { name: 'Emil Forsberg', pos: 'MID', rat: 78, club: 'New York Red Bulls', nat: 'Sweden' },
  { name: 'Carlos Coronel', pos: 'GK', rat: 75, club: 'New York Red Bulls', nat: 'Paraguay' },
  { name: 'John Tolkin', pos: 'DEF', rat: 74, club: 'New York Red Bulls', nat: 'USA' },

  { name: 'Facundo Torres', pos: 'FWD', rat: 78, club: 'Orlando City', nat: 'Uruguay' },
  { name: 'Luis Muriel', pos: 'FWD', rat: 76, club: 'Orlando City', nat: 'Colombia' },
  { name: 'Pedro Gallese', pos: 'GK', rat: 77, club: 'Orlando City', nat: 'Peru' },
  { name: 'Robin Jansson', pos: 'DEF', rat: 74, club: 'Orlando City', nat: 'Sweden' },

  { name: 'Evander da Silva', pos: 'MID', rat: 80, club: 'Portland Timbers', nat: 'Brazil' },
  { name: 'Jonathan Rodríguez', pos: 'FWD', rat: 76, club: 'Portland Timbers', nat: 'Uruguay' },
  { name: 'Felipe Mora', pos: 'FWD', rat: 74, club: 'Portland Timbers', nat: 'Chile' },
  { name: 'Diego Chara', pos: 'MID', rat: 73, club: 'Portland Timbers', nat: 'Colombia' },

  { name: 'Cristian Roldan', pos: 'MID', rat: 76, club: 'Seattle Sounders', nat: 'USA' },
  { name: 'Jordan Morris', pos: 'FWD', rat: 75, club: 'Seattle Sounders', nat: 'USA' },
  { name: 'Albert Rusnák', pos: 'MID', rat: 76, club: 'Seattle Sounders', nat: 'Slovakia' },
  { name: 'Stefan Frei', pos: 'GK', rat: 75, club: 'Seattle Sounders', nat: 'Switzerland' },
  { name: 'Nouhou Tolo', pos: 'DEF', rat: 74, club: 'Seattle Sounders', nat: 'Cameroon' },
  { name: 'Jackson Ragen', pos: 'DEF', rat: 73, club: 'Seattle Sounders', nat: 'USA' },
  { name: 'Yeimar Gómez', pos: 'DEF', rat: 74, club: 'Seattle Sounders', nat: 'Colombia' },

  { name: 'Ryan Gauld', pos: 'MID', rat: 79, club: 'Vancouver Whitecaps', nat: 'Scotland' },
  { name: 'Brian White', pos: 'FWD', rat: 75, club: 'Vancouver Whitecaps', nat: 'USA' },
  { name: 'Andrés Cubas', pos: 'MID', rat: 75, club: 'Vancouver Whitecaps', nat: 'Paraguay' },

  { name: 'Carles Gil', pos: 'MID', rat: 79, club: 'New England Revolution', nat: 'Spain' },
  { name: 'Giacomo Vrioni', pos: 'FWD', rat: 73, club: 'New England Revolution', nat: 'Albania' },

  { name: 'Lorenzo Insigne', pos: 'FWD', rat: 79, club: 'Toronto FC', nat: 'Italy' },
  { name: 'Federico Bernardeschi', pos: 'FWD', rat: 78, club: 'Toronto FC', nat: 'Italy' },
  { name: 'Jonathan Osorio', pos: 'MID', rat: 74, club: 'Toronto FC', nat: 'Canada' },
  { name: 'Richie Laryea', pos: 'DEF', rat: 73, club: 'Toronto FC', nat: 'Canada' },
  { name: 'Sean Johnson', pos: 'GK', rat: 75, club: 'Toronto FC', nat: 'USA' },

  { name: 'Teemu Pukki', pos: 'FWD', rat: 75, club: 'Minnesota United', nat: 'Finland' },
  { name: 'Robin Lod', pos: 'MID', rat: 75, club: 'Minnesota United', nat: 'Finland' },
  { name: 'Michael Boxall', pos: 'DEF', rat: 72, club: 'Minnesota United', nat: 'New Zealand' },

  { name: 'Daniel Gazdag', pos: 'MID', rat: 77, club: 'Philadelphia Union', nat: 'Hungary' },
  { name: 'Andre Blake', pos: 'GK', rat: 79, club: 'Philadelphia Union', nat: 'Jamaica' },
  { name: 'Kai Wagner', pos: 'DEF', rat: 76, club: 'Philadelphia Union', nat: 'Germany' },
  { name: 'Mikael Uhre', pos: 'FWD', rat: 73, club: 'Philadelphia Union', nat: 'Denmark' },

  { name: 'Alan Pulido', pos: 'FWD', rat: 74, club: 'Sporting Kansas City', nat: 'Mexico' },
  { name: 'Erik Thommy', pos: 'MID', rat: 74, club: 'Sporting Kansas City', nat: 'Germany' },
  { name: 'Johnny Russell', pos: 'FWD', rat: 73, club: 'Sporting Kansas City', nat: 'Scotland' },

  { name: 'Cristian Espinoza', pos: 'FWD', rat: 77, club: 'San Jose Earthquakes', nat: 'Argentina' },
  { name: 'Hernan Lopez', pos: 'MID', rat: 75, club: 'San Jose Earthquakes', nat: 'Argentina' },

  { name: 'Sebastian Driussi', pos: 'MID', rat: 78, club: 'Austin FC', nat: 'Argentina' },
  { name: 'Gyasi Zardes', pos: 'FWD', rat: 71, club: 'Austin FC', nat: 'USA' },

  { name: 'Diego Chara', pos: 'MID', rat: 73, club: 'Portland Timbers', nat: 'Colombia' },
  { name: 'Zack Steffen', pos: 'GK', rat: 74, club: 'Colorado Rapids', nat: 'USA' },
  { name: 'Djordje Mihailovic', pos: 'MID', rat: 76, club: 'Colorado Rapids', nat: 'USA' },
  { name: 'Rafael Navarro', pos: 'FWD', rat: 74, club: 'Colorado Rapids', nat: 'Brazil' },

  { name: 'Joao Klauss', pos: 'FWD', rat: 75, club: 'St. Louis City SC', nat: 'Brazil' },
  { name: 'Eduard Löwen', pos: 'MID', rat: 76, club: 'St. Louis City SC', nat: 'Germany' },
  { name: 'Roman Bürki', pos: 'GK', rat: 80, club: 'St. Louis City SC', nat: 'Switzerland' },

  { name: 'Xherdan Shaqiri', pos: 'MID', rat: 75, club: 'Chicago Fire', nat: 'Switzerland' },
  { name: 'Hugo Cuypers', pos: 'FWD', rat: 75, club: 'Chicago Fire', nat: 'Belgium' },

  { name: 'Saba Lobjanidze', pos: 'FWD', rat: 74, club: 'Atlanta United', nat: 'Georgia' },
  { name: 'Brad Guzan', pos: 'GK', rat: 72, club: 'Atlanta United', nat: 'USA' },
  { name: 'Alexey Miranchuk', pos: 'MID', rat: 78, club: 'Atlanta United', nat: 'Russia' },

  { name: 'Douglas Costa', pos: 'FWD', rat: 76, club: 'Sydney FC', nat: 'Brazil' } // Guest seed
];

// Stat filler generator to create perfectly customized, realistic attributes
function fillPlayerStats(name: string, pos: PositionType, rating: number): PlayerStats {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const getVariance = (min: number, max: number, seedOffset: number) => {
    const val = Math.abs((hash + seedOffset) % 100) / 100;
    return min + val * (max - min);
  };

  if (pos === 'GK') {
    return {
      goals: 0,
      assists: Math.abs(hash) % 100 < 5 ? 1 : 0,
      passAccuracy: Math.round(70 + (rating - 70) * 0.7 + getVariance(-5, 5, 1)),
      defense: Math.round(rating + getVariance(-2, 3, 2)), // reflex wall / saving
      physicality: Math.round(70 + (rating - 70) * 0.5 + getVariance(-6, 6, 3)),
      stamina: Math.round(60 + getVariance(-5, 5, 4)),
      pace: Math.round(50 + getVariance(-10, 15, 5)),
      dribbling: Math.round(45 + getVariance(-10, 15, 6)),
      xG90: 0,
      xA90: parseFloat((0.01 + getVariance(0, 0.03, 7)).toFixed(2))
    };
  }

  if (pos === 'DEF') {
    const isFullback = name.includes('Arnold') || name.includes('Hakimi') || name.includes('Frimpong') || name.includes('Alba') || name.includes('Gusto') || name.includes('Udogie') || name.includes('Porro') || name.includes('Davies') || name.includes('Grimaldo') || name.includes('Carvajal') || name.includes('Balde') || name.includes('Kounde');
    const paceBase = isFullback ? 84 : 70;
    const passBase = isFullback ? 80 : 74;
    const dribbleBase = isFullback ? 78 : 64;

    return {
      goals: Math.round(getVariance(0, 4, 1) + (rating - 75) * 0.1),
      assists: Math.round(getVariance(0, isFullback ? 8 : 2, 2) + (rating - 75) * 0.2),
      passAccuracy: Math.round(passBase + (rating - 70) * 0.6 + getVariance(-3, 3, 3)),
      defense: Math.round(rating + (isFullback ? -5 : 2) + getVariance(-2, 2, 4)),
      physicality: Math.round(rating + (isFullback ? -8 : 3) + getVariance(-4, 4, 5)),
      stamina: Math.round(80 + (rating - 70) * 0.4 + getVariance(-4, 4, 6)),
      pace: Math.round(paceBase + (rating - 70) * 0.5 + getVariance(-5, 5, 7)),
      dribbling: Math.round(dribbleBase + (rating - 70) * 0.5 + getVariance(-4, 4, 8)),
      xG90: parseFloat((0.02 + (rating - 70) * 0.005 + getVariance(-0.01, 0.02, 9)).toFixed(2)),
      xA90: parseFloat(((isFullback ? 0.15 : 0.03) + (rating - 70) * 0.01 + getVariance(-0.02, 0.03, 10)).toFixed(2))
    };
  }

  if (pos === 'MID') {
    const isAttackingMid = rating >= 84 && (name.includes('Bruyne') || name.includes('Odegaard') || name.includes('Musiala') || name.includes('Wirtz') || name.includes('Fernandes') || name.includes('Palmer') || name.includes('Foden') || name.includes('Pedri') || name.includes('Olmo') || name.includes('Bellingham') || name.includes('Reus') || name.includes('Puig') || name.includes('Acosta'));
    const isDefensiveMid = name.includes('Rodri') || name.includes('Rice') || name.includes('Casemiro') || name.includes('Kanté') || name.includes('Palhinha') || name.includes('Busquets') || name.includes('Tchouameni');
    
    return {
      goals: Math.round(isAttackingMid ? getVariance(8, 15, 1) : isDefensiveMid ? getVariance(1, 4, 1) : getVariance(3, 8, 1)),
      assists: Math.round(isAttackingMid ? getVariance(8, 16, 2) : isDefensiveMid ? getVariance(1, 4, 2) : getVariance(4, 8, 2)),
      passAccuracy: Math.round(82 + (rating - 70) * 0.6 + getVariance(-3, 3, 3)),
      defense: Math.round(isDefensiveMid ? rating + 1 + getVariance(-2, 2, 4) : isAttackingMid ? 45 + getVariance(-5, 5, 4) : 68 + getVariance(-5, 5, 4)),
      physicality: Math.round(isDefensiveMid ? rating - 3 + getVariance(-3, 3, 5) : 65 + (rating - 70) * 0.4 + getVariance(-5, 5, 5)),
      stamina: Math.round(82 + (rating - 70) * 0.5 + getVariance(-4, 4, 6)),
      pace: Math.round(72 + (rating - 70) * 0.3 + getVariance(-6, 8, 7)),
      dribbling: Math.round(isAttackingMid ? rating + getVariance(-1, 3, 8) : 74 + (rating - 70) * 0.4 + getVariance(-5, 5, 8)),
      xG90: parseFloat(((isAttackingMid ? 0.25 : 0.08) + (rating - 70) * 0.01 + getVariance(-0.03, 0.03, 9)).toFixed(2)),
      xA90: parseFloat(((isAttackingMid ? 0.30 : 0.12) + (rating - 70) * 0.01 + getVariance(-0.03, 0.03, 10)).toFixed(2))
    };
  }

  // FWD
  const isWinger = name.includes('Vinícius') || name.includes('Salah') || name.includes('Saka') || name.includes('Leão') || name.includes('Yamal') || name.includes('Diaz') || name.includes('Neymar') || name.includes('Mahrez') || name.includes('Bouanga') || name.includes('Pec');
  
  return {
    goals: Math.round(isWinger ? getVariance(10, 22, 1) + (rating - 75) * 0.8 : getVariance(18, 35, 1) + (rating - 75) * 1.2),
    assists: Math.round(isWinger ? getVariance(8, 15, 2) + (rating - 75) * 0.4 : getVariance(3, 8, 2) + (rating - 75) * 0.1),
    passAccuracy: Math.round(74 + (rating - 70) * 0.4 + getVariance(-4, 4, 3)),
    defense: Math.round(30 + getVariance(-5, 10, 4)),
    physicality: Math.round(isWinger ? 65 + getVariance(-5, 5, 5) : 78 + (rating - 70) * 0.4 + getVariance(-4, 4, 5)),
    stamina: Math.round(76 + (rating - 70) * 0.3 + getVariance(-5, 5, 6)),
    pace: Math.round(isWinger ? 90 + getVariance(-3, 6, 7) : 78 + (rating - 70) * 0.4 + getVariance(-6, 8, 7)),
    dribbling: Math.round(rating + (isWinger ? 3 : -3) + getVariance(-2, 2, 8)),
    xG90: parseFloat(((isWinger ? 0.40 : 0.70) + (rating - 70) * 0.02 + getVariance(-0.05, 0.05, 9)).toFixed(2)),
    xA90: parseFloat(((isWinger ? 0.25 : 0.12) + (rating - 70) * 0.01 + getVariance(-0.03, 0.03, 10)).toFixed(2))
  };
}

// Playstyle generator
function getDynamicPlaystyles(name: string, pos: PositionType, rating: number): string[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const stylesList: string[] = [];
  if (pos === 'GK') {
    stylesList.push(hash % 2 === 0 ? 'Sweeper Keeper' : 'Reflex Wall');
    stylesList.push(hash % 3 === 0 ? 'Aerial Commander' : '1v1 Specialist');
  } else if (pos === 'DEF') {
    const isWingerDEF = name.includes('Arnold') || name.includes('Hakimi') || name.includes('Frimpong') || name.includes('Alba') || name.includes('Gusto') || name.includes('Porro') || name.includes('Davies') || name.includes('Grimaldo');
    if (isWingerDEF) {
      stylesList.push('Wing Back');
      stylesList.push(hash % 2 === 0 ? 'Sprint Machine' : 'High Overlap');
    } else {
      stylesList.push('Ball Playing Defender');
      stylesList.push(hash % 2 === 0 ? 'Block Master' : 'Jockey Expert');
    }
  } else if (pos === 'MID') {
    const dm = name.includes('Rodri') || name.includes('Rice') || name.includes('Casemiro') || name.includes('Kanté') || name.includes('Palhinha') || name.includes('Busquets') || name.includes('Tchouameni');
    if (dm) {
      stylesList.push('Midfield Anchor');
      stylesList.push(hash % 2 === 0 ? 'Interception King' : 'Double Pivot');
    } else {
      stylesList.push('Pass Master');
      stylesList.push(hash % 2 === 0 ? 'Box-to-Box' : 'Dribble Wizard');
    }
  } else {
    // FWD
    const winger = name.includes('Vinícius') || name.includes('Salah') || name.includes('Saka') || name.includes('Leão') || name.includes('Yamal') || name.includes('Diaz') || name.includes('Neymar') || name.includes('Mahrez');
    if (winger) {
      stylesList.push('Dribble Wizard');
      stylesList.push(hash % 2 === 0 ? 'Sprint Machine' : 'Finesse Shot');
    } else {
      stylesList.push('Target Man');
      stylesList.push(hash % 2 === 0 ? 'Infiltrator' : 'Finesse Shot');
    }
  }
  return stylesList;
}

// Form generator
function getDynamicRecentForm(name: string, rating: number): number[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const base = 6.8 + (rating - 75) * 0.05;
  const form: number[] = [];
  for (let i = 0; i < 5; i++) {
    const variance = ((Math.abs(hash + i * 17) % 15) - 7) / 10;
    form.push(parseFloat(Math.max(6.0, Math.min(9.9, base + variance)).toFixed(1)));
  }
  return form;
}

// Assemble full RAW_PLAYERS list programmatically with stable seed IDs
export const RAW_PLAYERS: RawPlayer[] = COMPACT_PLAYERS.map((p, idx) => {
  const finalStats = p.stats 
    ? { ...fillPlayerStats(p.name, p.pos, p.rat), ...p.stats } 
    : fillPlayerStats(p.name, p.pos, p.rat);

  return {
    id: `p-${idx + 1}`,
    name: p.name,
    position: p.pos,
    rating: p.rat,
    stats: finalStats,
    nationality: p.nat,
    club: p.club,
    playstyles: p.styles || getDynamicPlaystyles(p.name, p.pos, p.rat),
    recentForm: p.form || getDynamicRecentForm(p.name, p.rat),
  };
});

// Default Pricing Formula Weights
export interface PricingWeights {
  ratingWeight: number; // weight of raw rating
  goalsWeight: number;
  assistsWeight: number;
  xG90Weight: number;
  xA90Weight: number;
  defendingWeight: number; // defense rating impact
  staminaWeight: number;
}

export const DEFAULT_PRICING_WEIGHTS: PricingWeights = {
  ratingWeight: 0.5,
  goalsWeight: 0.15,
  assistsWeight: 0.1,
  xG90Weight: 0.1,
  xA90Weight: 0.05,
  defendingWeight: 0.05,
  staminaWeight: 0.05,
};

/**
 * Calculates a dynamic valuation based on player stats and regression weights,
 * normalized so that top squad averages fit standard game budgets (e.g. max ~150-200 credits for world class).
 */
export function getPlayersWithDynamicPrices(weights: PricingWeights = DEFAULT_PRICING_WEIGHTS): Player[] {
  // 1. Calculate raw score for each player
  const rawScores = RAW_PLAYERS.map((raw) => {
    const s = raw.stats;
    
    // Normalize stats to 0-1 scale
    const normRating = (raw.rating - 70) / 25; // assumed rating range 70-95
    const normGoals = Math.min(s.goals / 40, 1); // scale to 40 max
    const normAssists = Math.min(s.assists / 20, 1); // scale to 20 max
    const normXG = Math.min(s.xG90 / 1.0, 1);
    const normXA = Math.min(s.xA90 / 0.5, 1);
    const normDef = s.defense / 100;
    const normStam = s.stamina / 100;

    const score = 
      normRating * weights.ratingWeight +
      normGoals * weights.goalsWeight +
      normAssists * weights.assistsWeight +
      normXG * weights.xG90Weight +
      normXA * weights.xA90Weight +
      normDef * weights.defendingWeight +
      normStam * weights.staminaWeight;

    return { id: raw.id, score };
  });

  // Find min and max scores for scaling
  const scores = rawScores.map((r) => r.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const scoreRange = maxScore - minScore || 1;

  // Scale values to fit budget constraints
  const MIN_PRICE = 45;
  const MAX_PRICE = 165;

  return RAW_PLAYERS.map((raw) => {
    const itemScoreObj = rawScores.find((rs) => rs.id === raw.id);
    const score = itemScoreObj ? itemScoreObj.score : minScore;
    
    // Linear interpolation
    const ratio = (score - minScore) / scoreRange;
    const price = Math.round(MIN_PRICE + ratio * (MAX_PRICE - MIN_PRICE));

    return {
      ...raw,
      price,
    };
  });
}
