import { Player, Role, Squad, Formation } from "./types";
export declare const clamp: (v: number, min: number, max: number) => number;
export declare function ratePlayers(input: Player[]): Player[];
export declare const ranked: (players: Player[]) => Player[];
export declare const shortlist: (players: Player[]) => string[];
export declare function fit(p: Player, role: Role): number;
export declare function positions(formation: Formation): {
  x: number;
  y: number;
}[];
export declare function metrics(
  squad: Squad,
  players: Player[],
): {
  quality: number;
  chemistry: number;
  positionalFit: number;
  strength: number;
  links: {
    a: number;
    b: number;
    score: number;
    color: string;
    reason: string;
  }[];
  cost: number;
  count: number;
};
export declare function squadError(
  s: Squad,
  players: Player[],
  budget?: number,
):
  | "Choose eleven players before playing."
  | "Each player can only be selected once."
  | "Goalkeepers must stay in the goalkeeper position."
  | "Your squad is over budget. Adjust your players before playing."
  | "";
export declare function autoSquad(
  s: Squad,
  players: Player[],
  budget: number,
): Squad;
export declare function changeFormation(
  s: Squad,
  formation: Formation,
  players: Player[],
): Squad;
