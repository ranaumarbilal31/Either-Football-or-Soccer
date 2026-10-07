import { Event, Match, Side } from "./types";
export declare function createMatchSession(
  home: Side,
  away: Side,
  seed: number,
  playedAt?: string,
): {
  readonly minute: number;
  readonly score: [number, number];
  readonly events: Event[];
  readonly sides: [Side, Side];
  step: () => Event[];
  finish: () => Match;
  updateTactics(side: 0 | 1, tactics: Side["squad"]["tactics"]): void;
  updateSquad(side: 0 | 1, squad: Side["squad"]): void;
};
export declare function simulate(
  home: Side,
  away: Side,
  seed: number,
  playedAt?: string,
): Match;
