import { z } from "zod";
export declare const saveSchema: z.ZodObject<
  {
    version: z.ZodLiteral<3>;
    club: z.ZodNullable<
      z.ZodObject<
        {
          name: z.ZodString;
          manager: z.ZodString;
          difficulty: z.ZodString;
          budget: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
    squad: z.ZodObject<
      {
        formation: z.ZodEnum<{
          "4-3-3": "4-3-3";
          "4-4-2": "4-4-2";
          "4-2-3-1": "4-2-3-1";
          "3-5-2": "3-5-2";
          "5-3-2": "5-3-2";
        }>;
        ids: z.ZodArray<z.ZodNullable<z.ZodString>>;
        tactics: z.ZodObject<
          {
            tempo: z.ZodNumber;
            press: z.ZodNumber;
            line: z.ZodNumber;
          },
          z.core.$strip
        >;
      },
      z.core.$strip
    >;
    savedIds: z.ZodArray<z.ZodString>;
    matches: z.ZodArray<
      z.ZodObject<
        {
          version: z.ZodLiteral<3>;
          id: z.ZodString;
          seed: z.ZodNumber;
          playedAt: z.ZodString;
          names: z.ZodTuple<[z.ZodString, z.ZodString], null>;
          score: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
          events: z.ZodArray<
            z.ZodObject<
              {
                minute: z.ZodNumber;
                side: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
                type: z.ZodEnum<{
                  pass: "pass";
                  shot: "shot";
                  save: "save";
                  goal: "goal";
                  tackle: "tackle";
                  error: "error";
                }>;
                playerId: z.ZodString;
                otherId: z.ZodOptional<z.ZodString>;
                assistId: z.ZodOptional<z.ZodString>;
                completed: z.ZodOptional<z.ZodBoolean>;
                xg: z.ZodOptional<z.ZodNumber>;
              },
              z.core.$strip
            >
          >;
          grades: z.ZodArray<
            z.ZodObject<
              {
                id: z.ZodString;
                name: z.ZodString;
                side: z.ZodUnion<readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]>;
                role: z.ZodEnum<{
                  GK: "GK";
                  DEF: "DEF";
                  MID: "MID";
                  FWD: "FWD";
                }>;
                rating: z.ZodNumber;
                goals: z.ZodNumber;
                assists: z.ZodNumber;
                saves: z.ZodNumber;
                tackles: z.ZodNumber;
                passes: z.ZodNumber;
                completed: z.ZodNumber;
                errors: z.ZodNumber;
              },
              z.core.$strip
            >
          >;
          stats: z.ZodArray<
            z.ZodObject<
              {
                shots: z.ZodNumber;
                onTarget: z.ZodNumber;
                xg: z.ZodNumber;
                possession: z.ZodNumber;
              },
              z.core.$strip
            >
          >;
          strengths: z.ZodArray<z.ZodNumber>;
          chemistry: z.ZodArray<z.ZodNumber>;
          report: z.ZodArray<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    league: z.ZodNullable<
      z.ZodObject<
        {
          id: z.ZodString;
          name: z.ZodString;
          snapshot: z.ZodObject<
            {
              version: z.ZodLiteral<3>;
              revision: z.ZodString;
              fetchedAt: z.ZodString;
              players: z.ZodArray<
                z.ZodObject<
                  {
                    born: z.ZodOptional<z.ZodNumber>;
                    source: z.ZodOptional<z.ZodString>;
                    season: z.ZodOptional<
                      z.ZodRecord<z.ZodString, z.ZodNumber>
                    >;
                    id: z.ZodString;
                    name: z.ZodString;
                    role: z.ZodEnum<{
                      GK: "GK";
                      DEF: "DEF";
                      MID: "MID";
                      FWD: "FWD";
                    }>;
                    secondary: z.ZodArray<
                      z.ZodEnum<{
                        GK: "GK";
                        DEF: "DEF";
                        MID: "MID";
                        FWD: "FWD";
                      }>
                    >;
                    club: z.ZodNullable<z.ZodString>;
                    clubId: z.ZodNullable<z.ZodString>;
                    league: z.ZodNullable<z.ZodString>;
                    nationality: z.ZodNullable<z.ZodString>;
                    minutes: z.ZodNumber;
                    metrics: z.ZodObject<
                      {
                        prevention: z.ZodOptional<z.ZodNumber>;
                        distribution: z.ZodOptional<z.ZodNumber>;
                        attack: z.ZodOptional<z.ZodNumber>;
                      },
                      z.core.$strip
                    >;
                    appearances: z.ZodArray<
                      z.ZodObject<
                        {
                          date: z.ZodString;
                          fixture: z.ZodString;
                          grade: z.ZodNumber;
                          minutes: z.ZodNumber;
                        },
                        z.core.$strip
                      >
                    >;
                    teamStrength: z.ZodNumber;
                    fetchedAt: z.ZodString;
                    rating: z.ZodNumber;
                    baseline: z.ZodNumber;
                    form: z.ZodNullable<z.ZodNumber>;
                    confidence: z.ZodNumber;
                    price: z.ZodNumber;
                    estimated: z.ZodBoolean;
                    attributes: z.ZodObject<
                      {
                        attack: z.ZodNumber;
                        defense: z.ZodNumber;
                        passing: z.ZodNumber;
                        keeping: z.ZodNumber;
                        stamina: z.ZodNumber;
                      },
                      z.core.$strip
                    >;
                  },
                  z.core.$strip
                >
              >;
              teams: z.ZodArray<
                z.ZodObject<
                  {
                    id: z.ZodString;
                    name: z.ZodString;
                    kind: z.ZodEnum<{
                      club: "club";
                      national: "national";
                    }>;
                    country: z.ZodString;
                    playerIds: z.ZodArray<z.ZodString>;
                    results: z.ZodArray<
                      z.ZodEnum<{
                        W: "W";
                        D: "D";
                        L: "L";
                      }>
                    >;
                    style: z.ZodString;
                    strength: z.ZodNumber;
                  },
                  z.core.$strip
                >
              >;
              competitions: z.ZodArray<
                z.ZodObject<
                  {
                    id: z.ZodString;
                    name: z.ZodString;
                    kind: z.ZodEnum<{
                      league: "league";
                      international: "international";
                      cup: "cup";
                    }>;
                    teamIds: z.ZodArray<z.ZodString>;
                    complete: z.ZodBoolean;
                  },
                  z.core.$strip
                >
              >;
              notices: z.ZodArray<z.ZodString>;
            },
            z.core.$strip
          >;
          sides: z.ZodRecord<
            z.ZodString,
            z.ZodObject<
              {
                name: z.ZodString;
                squad: z.ZodObject<
                  {
                    formation: z.ZodEnum<{
                      "4-3-3": "4-3-3";
                      "4-4-2": "4-4-2";
                      "4-2-3-1": "4-2-3-1";
                      "3-5-2": "3-5-2";
                      "5-3-2": "5-3-2";
                    }>;
                    ids: z.ZodArray<z.ZodNullable<z.ZodString>>;
                    tactics: z.ZodObject<
                      {
                        tempo: z.ZodNumber;
                        press: z.ZodNumber;
                        line: z.ZodNumber;
                      },
                      z.core.$strip
                    >;
                  },
                  z.core.$strip
                >;
                players: z.ZodArray<
                  z.ZodObject<
                    {
                      born: z.ZodOptional<z.ZodNumber>;
                      source: z.ZodOptional<z.ZodString>;
                      season: z.ZodOptional<
                        z.ZodRecord<z.ZodString, z.ZodNumber>
                      >;
                      id: z.ZodString;
                      name: z.ZodString;
                      role: z.ZodEnum<{
                        GK: "GK";
                        DEF: "DEF";
                        MID: "MID";
                        FWD: "FWD";
                      }>;
                      secondary: z.ZodArray<
                        z.ZodEnum<{
                          GK: "GK";
                          DEF: "DEF";
                          MID: "MID";
                          FWD: "FWD";
                        }>
                      >;
                      club: z.ZodNullable<z.ZodString>;
                      clubId: z.ZodNullable<z.ZodString>;
                      league: z.ZodNullable<z.ZodString>;
                      nationality: z.ZodNullable<z.ZodString>;
                      minutes: z.ZodNumber;
                      metrics: z.ZodObject<
                        {
                          prevention: z.ZodOptional<z.ZodNumber>;
                          distribution: z.ZodOptional<z.ZodNumber>;
                          attack: z.ZodOptional<z.ZodNumber>;
                        },
                        z.core.$strip
                      >;
                      appearances: z.ZodArray<
                        z.ZodObject<
                          {
                            date: z.ZodString;
                            fixture: z.ZodString;
                            grade: z.ZodNumber;
                            minutes: z.ZodNumber;
                          },
                          z.core.$strip
                        >
                      >;
                      teamStrength: z.ZodNumber;
                      fetchedAt: z.ZodString;
                      rating: z.ZodNumber;
                      baseline: z.ZodNumber;
                      form: z.ZodNullable<z.ZodNumber>;
                      confidence: z.ZodNumber;
                      price: z.ZodNumber;
                      estimated: z.ZodBoolean;
                      attributes: z.ZodObject<
                        {
                          attack: z.ZodNumber;
                          defense: z.ZodNumber;
                          passing: z.ZodNumber;
                          keeping: z.ZodNumber;
                          stamina: z.ZodNumber;
                        },
                        z.core.$strip
                      >;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          fixtures: z.ZodArray<
            z.ZodObject<
              {
                id: z.ZodString;
                round: z.ZodNumber;
                home: z.ZodString;
                away: z.ZodString;
                result: z.ZodOptional<
                  z.ZodObject<
                    {
                      version: z.ZodLiteral<3>;
                      id: z.ZodString;
                      seed: z.ZodNumber;
                      playedAt: z.ZodString;
                      names: z.ZodTuple<[z.ZodString, z.ZodString], null>;
                      score: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
                      events: z.ZodArray<
                        z.ZodObject<
                          {
                            minute: z.ZodNumber;
                            side: z.ZodUnion<
                              readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]
                            >;
                            type: z.ZodEnum<{
                              pass: "pass";
                              shot: "shot";
                              save: "save";
                              goal: "goal";
                              tackle: "tackle";
                              error: "error";
                            }>;
                            playerId: z.ZodString;
                            otherId: z.ZodOptional<z.ZodString>;
                            assistId: z.ZodOptional<z.ZodString>;
                            completed: z.ZodOptional<z.ZodBoolean>;
                            xg: z.ZodOptional<z.ZodNumber>;
                          },
                          z.core.$strip
                        >
                      >;
                      grades: z.ZodArray<
                        z.ZodObject<
                          {
                            id: z.ZodString;
                            name: z.ZodString;
                            side: z.ZodUnion<
                              readonly [z.ZodLiteral<0>, z.ZodLiteral<1>]
                            >;
                            role: z.ZodEnum<{
                              GK: "GK";
                              DEF: "DEF";
                              MID: "MID";
                              FWD: "FWD";
                            }>;
                            rating: z.ZodNumber;
                            goals: z.ZodNumber;
                            assists: z.ZodNumber;
                            saves: z.ZodNumber;
                            tackles: z.ZodNumber;
                            passes: z.ZodNumber;
                            completed: z.ZodNumber;
                            errors: z.ZodNumber;
                          },
                          z.core.$strip
                        >
                      >;
                      stats: z.ZodArray<
                        z.ZodObject<
                          {
                            shots: z.ZodNumber;
                            onTarget: z.ZodNumber;
                            xg: z.ZodNumber;
                            possession: z.ZodNumber;
                          },
                          z.core.$strip
                        >
                      >;
                      strengths: z.ZodArray<z.ZodNumber>;
                      chemistry: z.ZodArray<z.ZodNumber>;
                      report: z.ZodArray<z.ZodString>;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
