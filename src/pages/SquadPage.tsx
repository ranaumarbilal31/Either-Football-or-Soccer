import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  WandSparkles,
  Undo2,
  Download,
  Upload,
  Copy,
  Trash2,
  SlidersHorizontal,
  Shield,
} from "lucide-react";
import { activeSquad, createSquad, useGame } from "../state/store";
import { Formation, Formations, slots, slotId } from "../domain/model";
import { chemistry, spent, squadError } from "../domain/squad";
import { parseImport } from "../state/persistence";
import { Avatar, PageHeading } from "../components/Primitives";

export default function SquadPage() {
  const game = useGame();
  const save = game.save;
  const squad = activeSquad(save);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"lineup" | "tactics" | "saves">("lineup");
  const cost = spent(squad);
  const fit = chemistry(squad, save.players);
  const roles = slots(squad.formation);
  const exportSave = () => {
    const blob = new Blob([JSON.stringify(save, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "efos-club-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const pick = (i: number) => navigate(`/players?slot=${i}&role=${roles[i]}`);
  const rows =
    squad.formation === "4-2-3-1"
      ? [[10], [7, 8, 9], [5, 6], [1, 2, 3, 4], [0]]
      : ["FWD", "MID", "DEF", "GK"].map((role) =>
          roles.flatMap((r, i) => (r === role ? [i] : [])),
        );
  return (
    <>
      <PageHeading
        eyebrow="YOUR CLUB. YOUR CALL."
        title="The squad."
        action={
          <Link className="button primary" to="/match">
            Match centre <ArrowRight size={17} />
          </Link>
        }
      >
        Eleven places. Endless possibilities.
      </PageHeading>
      <section className="summary-strip" aria-label="Squad summary">
        <div>
          <span>YOUR STARTING XI</span>
          <strong>
            {squad.members.length}
            <small> / 11</small>
          </strong>
        </div>
        <div>
          <span>CREDITS LEFT</span>
          <strong>
            {squad.budget - cost}
            <small> cr</small>
          </strong>
        </div>
        <div>
          <span>POSITION FIT</span>
          <strong>
            {fit}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>FORMATION</span>
          <strong>{squad.formation}</strong>
        </div>
      </section>
      <div className="section-bar">
        <div className="segmented" aria-label="Squad views">
          {(["lineup", "tactics", "saves"] as const).map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === "saves"
                ? "My clubs"
                : t === "lineup"
                  ? "Lineup"
                  : "Tactics"}
            </button>
          ))}
        </div>
        <button
          className="button quiet"
          disabled={!game.undoStack.length}
          onClick={game.undo}
        >
          <Undo2 size={16} /> Undo
        </button>
      </div>
      {tab === "lineup" && (
        <div className="squad-layout">
          <section className="pitch-panel">
            <header className="panel-heading">
              <div>
                <p className="eyebrow">MATCHDAY BOARD</p>
                <h2>{squad.name}</h2>
              </div>
              <select
                aria-label="Formation"
                value={squad.formation}
                onChange={(e) => game.formation(e.target.value as Formation)}
              >
                {Object.keys(Formations).map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </header>
            <div className="pitch">
              <div className="pitch-lines">
                <div className="centre-circle" />
                <div className="penalty top" />
                <div className="penalty bottom" />
              </div>
              {rows.map((row, rowIndex) => (
                <div className="pitch-row" key={rowIndex}>
                  {roles.map((r, i) => {
                    if (!row.includes(i)) return null;
                    const member = squad.members.find(
                      (m) => m.slot === slotId(i),
                    );
                    const player = save.players.find(
                      (p) => p.id === member?.playerId,
                    );
                    return (
                      <div className="pitch-position" key={i}>
                        <button
                          onClick={() => pick(i)}
                          aria-label={
                            player
                              ? `Replace ${player.name}`
                              : `Choose ${r} for position ${i + 1}`
                          }
                          className={`pitch-player ${player ? "filled" : ""}`}
                        >
                          <div className="shirt">
                            {player ? player.game.overall : <Plus size={18} />}
                          </div>
                          <strong>
                            {player
                              ? player.name.split(" ").slice(-1)[0]
                              : "Add player"}
                          </strong>
                          <span>
                            {r}
                            {player && player.role !== r
                              ? " · out of position"
                              : ""}
                          </span>
                        </button>
                        {player && (
                          <button
                            className="remove-player"
                            aria-label={`Remove ${player.name}`}
                            onClick={() =>
                              game.updateSquad((s) => ({
                                ...s,
                                members: s.members.filter(
                                  (m) => m.slot !== slotId(i),
                                ),
                              }))
                            }
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <footer className="pitch-footer">
              <span>
                <Shield size={15} /> Tap a position to scout its next player
              </span>
              <span>{squad.members.length}/11 ready</span>
            </footer>
          </section>
          <aside className="squad-aside">
            <section className="panel accent-panel">
              <p className="eyebrow">THE MANAGER'S DESK</p>
              <h2>Make it yours.</h2>
              <p>
                Find the right players, give them a role, and see what your
                ideas can do.
              </p>
              <Link to="/players" className="button primary full">
                Explore players <ArrowRight size={17} />
              </Link>
              <button className="button full" onClick={game.fill}>
                <WandSparkles size={17} /> Autofill from discovered players
              </button>
              <small>
                Uses players you have already discovered. Searches never invent
                a missing position.
              </small>
            </section>
            <section className="panel">
              <p className="eyebrow">READINESS</p>
              <h3>
                {squad.members.length === 11
                  ? "Ready for the whistle?"
                  : "A team in the making."}
              </h3>
              <p>
                {squadError(squad, save.players, true) ||
                  "Your XI is valid and within budget. Take it to the match centre."}
              </p>
              <div className="progress">
                <span
                  style={{ width: `${(squad.members.length / 11) * 100}%` }}
                />
              </div>
              <button className="text-button" onClick={() => setTab("tactics")}>
                Set your game plan <ArrowRight size={15} />
              </button>
            </section>
          </aside>
        </div>
      )}
      {tab === "tactics" && (
        <div className="two-columns">
          <section className="panel">
            <p className="eyebrow">THE GAME PLAN</p>
            <h2>Set the tone.</h2>
            {(
              [
                {
                  key: "tempo",
                  name: "Tempo",
                  left: "Patient",
                  right: "Direct",
                  help: "Faster play creates more attempts, at the cost of passing accuracy.",
                },
                {
                  key: "press",
                  name: "Pressing",
                  left: "Conserve",
                  right: "Intense",
                  help: "An intense press consumes more energy through the match.",
                },
                {
                  key: "line",
                  name: "Defensive line",
                  left: "Deep",
                  right: "High",
                  help: "A high line leaves more space behind your defense.",
                },
              ] as const
            ).map((t) => (
              <div className="tactic" key={t.key}>
                <label htmlFor={`tactic-${t.key}`}>
                  {t.name}
                  <strong>{squad.tactics[t.key]}</strong>
                </label>
                <input
                  id={`tactic-${t.key}`}
                  type="range"
                  min="0"
                  max="100"
                  value={squad.tactics[t.key]}
                  onChange={(e) =>
                    game.updateSquad((s) => ({
                      ...s,
                      tactics: {
                        ...s.tactics,
                        [t.key]: Number(e.target.value),
                      },
                    }))
                  }
                />
                <div className="range-labels">
                  <span>{t.left}</span>
                  <span>{t.right}</span>
                </div>
                <p>{t.help}</p>
              </div>
            ))}
          </section>
          <section className="panel">
            <SlidersHorizontal className="orange" />
            <h2>Play your way.</h2>
            <label className="field">
              Sandbox budget
              <select
                value={squad.budget}
                onChange={(e) =>
                  game.updateSquad((s) => ({
                    ...s,
                    budget: Number(e.target.value),
                  }))
                }
              >
                {[
                  ...new Set([
                    500,
                    750,
                    1000,
                    1500,
                    2000,
                    3000,
                    5000,
                    squad.budget,
                  ]),
                ]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n} credits
                    </option>
                  ))}
              </select>
            </label>
            <p>
              You cannot lower the budget below your current spending. Prices
              are locked when you sign a player.
            </p>
            <div className="notice">
              This is a football simulation, not a prediction of real matches.
            </div>
          </section>
        </div>
      )}
      {tab === "saves" && (
        <div className="two-columns">
          <section className="panel">
            <p className="eyebrow">YOUR TOUCHLINE</p>
            <h2>My clubs.</h2>
            <label className="field">
              Active club
              <select
                value={save.activeId}
                onChange={(e) =>
                  game.commit((s) => {
                    s.activeId = e.target.value;
                  })
                }
              >
                {save.squads.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name} · {s.members.length}/11
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Club name
              <input
                key={squad.id + squad.name}
                defaultValue={squad.name}
                maxLength={60}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== squad.name)
                    game.updateSquad((s) => ({ ...s, name }));
                }}
              />
            </label>
            <div className="button-row">
              <button
                className="button"
                onClick={createSquad}
                disabled={save.squads.length >= 30}
              >
                <Plus size={16} /> New club
              </button>
              <button
                className="button"
                disabled={save.squads.length >= 30}
                onClick={() =>
                  game.commit((s) => {
                    const copy = {
                      ...structuredClone(squad),
                      id: crypto.randomUUID(),
                      name: `${squad.name.slice(0, 45)} copy`,
                    };
                    s.squads.push(copy);
                    s.activeId = copy.id;
                  })
                }
              >
                <Copy size={16} /> Duplicate
              </button>
              <button
                className="button"
                onClick={() => {
                  if (game.updateSquad((s) => ({ ...s, members: [] })))
                    game.notify("Lineup cleared. Use Undo to restore it.");
                }}
              >
                <Trash2 size={16} /> Clear XI
              </button>
            </div>
            <p className="save-status">{game.saveStatus}</p>
          </section>
          <section className="panel">
            <p className="eyebrow">TAKE YOUR CLUB WITH YOU</p>
            <h2>Save & restore.</h2>
            <p>
              Your squads stay in this browser. Export a backup to move them to
              another device.
            </p>
            <div className="button-row">
              <button className="button primary" onClick={exportSave}>
                <Download size={17} /> Export save
              </button>
              <label className="button file-button">
                <Upload size={17} /> Import save
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 8_000_000)
                        throw new Error(
                          "Save files must be smaller than 8 MB.",
                        );
                      game.importSave(parseImport(await file.text()));
                      game.notify(
                        "Save imported. Undo restores your previous clubs.",
                      );
                    } catch (error) {
                      game.notify(
                        error instanceof Error
                          ? error.message
                          : "Could not read this save.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p>
              Imports replace your current clubs after validation. You can undo
              the import. Original legacy saves remain untouched.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
