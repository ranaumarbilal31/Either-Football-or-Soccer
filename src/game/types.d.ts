export type Role = "GK" | "DEF" | "MID" | "FWD";
export declare const roles: Role[];
export declare const matchLimit: number;
export declare const formations: {
  readonly "4-3-3": readonly [4, 3, 3];
  readonly "4-4-2": readonly [4, 4, 2];
  readonly "4-2-3-1": readonly [4, 5, 1];
  readonly "3-5-2": readonly [3, 5, 2];
  readonly "5-3-2": readonly [5, 3, 2];
};
export type Formation = keyof typeof formations;
export type Metrics = {
  prevention?: number;
  distribution?: number;
  attack?: number;
};
export type Appearance = {
  date: string;
  fixture: string;
  grade: number;
  minutes: number;
};
export type Player = {
  born?: number;
  source?: string;
  season?: Record<string, number>;
  id: string;
  name: string;
  role: Role;
  secondary: Role[];
  club: string | null;
  clubId: string | null;
  league: string | null;
  nationality: string | null;
  minutes: number;
  metrics: Metrics;
  appearances: Appearance[];
  teamStrength: number;
  fetchedAt: string;
  rating: number;
  baseline: number;
  form: number | null;
  confidence: number;
  price: number;
  estimated: boolean;
  attributes: {
    attack: number;
    defense: number;
    passing: number;
    keeping: number;
    stamina: number;
  };
};
export type Team = {
  id: string;
  name: string;
  kind: "club" | "national";
  country: string;
  playerIds: string[];
  results: ("W" | "D" | "L")[];
  style: string;
  strength: number;
};
export type Competition = {
  id: string;
  name: string;
  kind: "league" | "international" | "cup";
  teamIds: string[];
  complete: boolean;
};
export type Catalog = {
  availableIds?: string[];
  version: 3;
  revision: string;
  fetchedAt: string;
  players: Player[];
  teams: Team[];
  competitions: Competition[];
  notices: string[];
};
export type Squad = {
  formation: Formation;
  ids: (string | null)[];
  tactics: {
    tempo: number;
    press: number;
    line: number;
  };
};
export type Club = {
  name: string;
  manager: string;
  difficulty: string;
  budget: number;
};
export type Side = {
  name: string;
  squad: Squad;
  players: Player[];
};
export type Event = {
  minute: number;
  side: 0 | 1;
  type: "pass" | "shot" | "save" | "goal" | "tackle" | "error";
  playerId: string;
  otherId?: string;
  assistId?: string;
  completed?: boolean;
  xg?: number;
};
export type Grade = {
  id: string;
  name: string;
  side: 0 | 1;
  role: Role;
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  passes: number;
  completed: number;
  errors: number;
};
export type Match = {
  version: 3;
  id: string;
  seed: number;
  playedAt: string;
  names: [string, string];
  score: [number, number];
  events: Event[];
  grades: Grade[];
  stats: {
    shots: number;
    onTarget: number;
    xg: number;
    possession: number;
  }[];
  strengths: number[];
  chemistry: number[];
  report: string[];
};
export type Fixture = {
  id: string;
  round: number;
  home: string;
  away: string;
  result?: Match;
};
export type League = {
  id: string;
  name: string;
  snapshot: Catalog;
  sides: Record<string, Side>;
  fixtures: Fixture[];
};
export type Save = {
  version: 3;
  club: Club | null;
  squad: Squad;
  savedIds: string[];
  matches: Match[];
  league: League | null;
};
export type RefreshJob = {
  id: string;
  state: "idle" | "running" | "complete" | "partial" | "failed";
  progress: number;
  total: number;
  message: string;
  errors: string[];
  updatedAt: string | null;
};
export declare const emptySquad: () => Squad;
export declare const freshSave: () => Save;
export declare function slotRoles(f: Formation): Role[];
