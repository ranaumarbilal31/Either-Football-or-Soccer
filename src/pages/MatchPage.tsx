import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, FastForward, ArrowRight, Trophy } from "lucide-react";
import { activeSquad, useGame } from "../state/store";
import { Match } from "../domain/model";
import { Opponent, Opponents, simulate } from "../domain/engine";
import { chemistry, squadError } from "../domain/squad";
import { PageHeading } from "../components/Primitives";

let playback: { match: Match; minute: number } | null = null;
export default function MatchPage() {
  const game = useGame();
  const squad = activeSquad(game.save);
  const [opponent, setOpponent] = useState<Opponent>("balanced");
  const [match, setMatch] = useState<Match | null>(playback?.match || null);
  const [minute, setMinute] = useState(playback?.minute ?? 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const error = squadError(squad, game.save.players, true);
  useEffect(() => {
    if (match) playback = { match, minute };
  }, [match, minute]);
  useEffect(() => {
    if (!playing || !match) return;
    const id = setInterval(
      () => setMinute((m) => Math.min(90, m + 1)),
      800 / speed,
    );
    return () => clearInterval(id);
  }, [playing, match, speed]);
  useEffect(() => {
    if (match && minute === 90) {
      setPlaying(false);
      game.record(match);
    }
  }, [match, minute, game.record]);
  const start = (instant: boolean) => {
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const result = simulate(
        squad,
        game.save.players,
        opponent,
        seed,
        new Date().toISOString(),
      );
      setMatch(result);
      setMinute(instant ? 90 : 0);
      setPlaying(!instant);
    } catch (e) {
      game.notify(
        e instanceof Error ? e.message : "The match could not start.",
      );
    }
  };
  const events =
    match?.events.filter((e) => e.type !== "pass" && e.minute <= minute) || [];
  const home = events.filter(
    (e) => e.side === "home" && e.type === "goal",
  ).length;
  const away = events.filter(
    (e) => e.side === "away" && e.type === "goal",
  ).length;
  return (
    <>
      <PageHeading eyebrow="UNDER THE FLOODLIGHTS" title="Match centre.">
        Your ideas. Ninety minutes. Let's see what happens.
      </PageHeading>
      {!match ? (
        <div className="two-columns">
          <section className="panel">
            <p className="eyebrow">CHOOSE YOUR TEST</p>
            <h2>The opposition.</h2>
            <div className="opponent-list">
              {Object.entries(Opponents).map(([id, o]) => (
                <button
                  className={`opponent ${opponent === id ? "selected" : ""}`}
                  aria-pressed={opponent === id}
                  key={id}
                  onClick={() => setOpponent(id as Opponent)}
                >
                  <div className="opponent-crest">
                    {o.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </div>
                  <div>
                    <strong>{o.name}</strong>
                    <span>{o.description}</span>
                  </div>
                  <span className="radio-dot" />
                </button>
              ))}
            </div>
            <p className="data-note">
              Original training opponents. These are game teams, not real-world
              squads.
            </p>
          </section>
          <section className="panel match-preview">
            <p className="eyebrow">DRESSING ROOM</p>
            <h2>{squad.name}</h2>
            <div className="mini-stats">
              <div>
                <strong>{squad.members.length}/11</strong>
                <span>Players</span>
              </div>
              <div>
                <strong>{chemistry(squad, game.save.players)}%</strong>
                <span>Position fit</span>
              </div>
              <div>
                <strong>{squad.formation}</strong>
                <span>Shape</span>
              </div>
            </div>
            <p>
              Tempo {squad.tactics.tempo} · Press {squad.tactics.press} · Line{" "}
              {squad.tactics.line}
            </p>
            {error ? (
              <>
                <div className="notice">{error}</div>
                <div className="button-row">
                  <button className="button" onClick={game.fill}>
                    Autofill XI
                  </button>
                  <Link className="button" to="/squad">
                    Go to squad
                  </Link>
                </div>
              </>
            ) : (
              <div className="notice">
                All eleven positions are filled. You're ready.
              </div>
            )}
            <button
              className="button primary full"
              disabled={!!error}
              onClick={() => start(false)}
            >
              <Play size={18} /> Kick off
            </button>
            <button
              className="button full"
              disabled={!!error}
              onClick={() => start(true)}
            >
              <FastForward size={18} /> Instant result
            </button>
          </section>
        </div>
      ) : (
        <>
          <section className="scoreboard">
            <div className="scoreboard-top">
              <span>
                {minute === 90
                  ? "FULL TIME"
                  : playing
                    ? "MATCH IN PROGRESS"
                    : "PLAYBACK PAUSED"}
              </span>
              <span>{minute}′</span>
            </div>
            <div className="score-line">
              <div>
                <div className="match-crest">XI</div>
                <h2>{match.homeName}</h2>
              </div>
              <strong>
                {home}
                <span>:</span>
                {away}
              </strong>
              <div>
                <div className="match-crest away">FC</div>
                <h2>{match.awayName}</h2>
              </div>
            </div>
            <div className="progress">
              <span style={{ width: `${(minute / 90) * 100}%` }} />
            </div>
            <div className="playback-controls">
              {minute < 90 ? (
                <>
                  <button
                    className="button"
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
                    {playing ? "Pause" : "Resume"}
                  </button>
                  <select
                    aria-label="Playback speed"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                  >
                    <option value="1">1× speed</option>
                    <option value="2">2× speed</option>
                    <option value="4">4× speed</option>
                  </select>
                  <button className="button" onClick={() => setMinute(90)}>
                    <FastForward size={16} /> Full time
                  </button>
                </>
              ) : (
                <>
                  <Link
                    className="button primary"
                    to={`/insights?match=${encodeURIComponent(match.id)}`}
                  >
                    Match report <ArrowRight size={17} />
                  </Link>
                  <button
                    className="button"
                    onClick={() => {
                      setMatch(null);
                      playback = null;
                    }}
                  >
                    New match
                  </button>
                </>
              )}
            </div>
          </section>
          <section className="panel commentary">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">FROM THE TOUCHLINE</p>
                <h2>Match commentary.</h2>
              </div>
              <Trophy className="orange" />
            </div>
            <div aria-live="polite" className="current-event">
              {events.at(-1)?.text}
            </div>
            <ol>
              {[...events].reverse().map((e, i) => (
                <li
                  key={`${e.minute}-${i}`}
                  className={e.type === "goal" ? "goal-event" : ""}
                >
                  <span>{e.minute}′</span>
                  <p>{e.text}</p>
                  {e.type === "goal" && <strong>GOAL</strong>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
