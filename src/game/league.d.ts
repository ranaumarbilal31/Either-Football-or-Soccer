import {
  Catalog,
  Competition,
  Fixture,
  League,
  Side,
  Squad,
  Team,
} from "./types";
export declare function opponent(team: Team, catalog: Catalog): Side | null;
export declare function schedule(ids: string[]): Fixture[];
export declare function startLeague(
  comp: Competition,
  catalog: Catalog,
  club: Side,
): League;
export declare function playRound(
  league: League,
  squad: Squad,
  seed: number,
): League;
export declare function standings(league: League): {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}[];
