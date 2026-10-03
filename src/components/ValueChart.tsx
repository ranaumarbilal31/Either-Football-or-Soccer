import { useId, useMemo, useState } from "react";
import { Player, Roles } from "../domain/model";

export function chartSummary(players: Player[]) {
  const n = players.length;
  const x = n ? players.reduce((s, p) => s + p.game.overall, 0) / n : 0;
  const y = n ? players.reduce((s, p) => s + p.game.cost, 0) / n : 0;
  const xx = players.reduce((s, p) => s + (p.game.overall - x) ** 2, 0),
    yy = players.reduce((s, p) => s + (p.game.cost - y) ** 2, 0),
    xy = players.reduce(
      (s, p) => s + (p.game.overall - x) * (p.game.cost - y),
      0,
    );
  return {
    x,
    y,
    slope: xx ? xy / xx : null,
    r: xx && yy ? xy / Math.sqrt(xx * yy) : null,
    min: Math.min(50, ...players.map((p) => p.game.overall)) - 2,
    max: Math.max(90, ...players.map((p) => p.game.overall)) + 2,
    cost: Math.max(
      150,
      ...players.map((p) => Math.ceil(p.game.cost / 50) * 50),
    ),
  };
}
export default function ValueChart({ players }: { players: Player[] }) {
  const [role, setRole] = useState("ALL");
  const [id, setId] = useState("");
  const clip = useId();
  const data = useMemo(
    () => players.filter((p) => role === "ALL" || p.role === role),
    [players, role],
  );
  const summary = chartSummary(data);
  const selected = data.find((p) => p.id === id);
  const x = (v: number) =>
    58 + ((v - summary.min) / (summary.max - summary.min)) * 494;
  const y = (v: number) => 288 - (v / summary.cost) * 250;
  const colors: Record<string, string> = {
    GK: "#e4bd7b",
    DEF: "#8cabee",
    MID: "#baa4e6",
    FWD: "#f58e62",
  };
  const groups = new Map<string, Player[]>();
  for (const p of data) {
    const key = `${p.game.overall}-${p.game.cost}-${p.role}`;
    groups.set(key, [...(groups.get(key) || []), p]);
  }
  return (
    <section className="panel value-chart">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">QUALITY MEETS VALUE</p>
          <h2>OVR vs cost.</h2>
        </div>
        <span className="badge">{data.length} players</span>
      </div>
      <p>Explore game valuations in your discovered player library.</p>
      <div className="segmented">
        {["ALL", ...Roles].map((r) => (
          <button
            key={r}
            aria-pressed={role === r}
            onClick={() => {
              setRole(r);
              setId("");
            }}
          >
            {r === "ALL" ? "All roles" : r}
          </button>
        ))}
      </div>
      <svg
        className="scatter"
        viewBox="0 0 580 340"
        role="img"
        aria-label="Overall rating versus credit cost. Use the player selector below for exact values."
      >
        <defs>
          <clipPath id={clip}>
            <rect x="52" y="30" width="508" height="265" />
          </clipPath>
        </defs>
        {Array.from({ length: 5 }, (_, i) => (i * summary.cost) / 4).map(
          (t) => (
            <g key={t}>
              <line
                x1="58"
                x2="552"
                y1={y(t)}
                y2={y(t)}
                stroke="#30435a"
                strokeDasharray="3 5"
              />
              <text x="44" y={y(t) + 4} textAnchor="end">
                {Math.round(t)}
              </text>
            </g>
          ),
        )}
        {Array.from(
          { length: 5 },
          (_, i) => summary.min + (i * (summary.max - summary.min)) / 4,
        ).map((t) => (
          <g key={t}>
            <text x={x(t)} y="312" textAnchor="middle">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <text x="58" y="19">
          COST / CREDITS
        </text>
        <text x="305" y="334" textAnchor="middle">
          OVERALL RATING
        </text>
        <g clipPath={`url(#${clip})`}>
          {summary.slope !== null && (
            <line
              x1={x(summary.min)}
              x2={x(summary.max)}
              y1={y(summary.y + summary.slope * (summary.min - summary.x))}
              y2={y(summary.y + summary.slope * (summary.max - summary.x))}
              stroke="#efe6d5"
              strokeDasharray="6 5"
              opacity=".6"
            />
          )}
          {[...groups].map(([key, group]) => (
            <circle
              key={key}
              cx={x(group[0].game.overall)}
              cy={y(group[0].game.cost)}
              r={Math.min(13, 5 + Math.sqrt(group.length))}
              fill={colors[group[0].role || "MID"]}
              fillOpacity=".8"
              stroke="#101c2b"
              strokeWidth="2"
              onClick={() => setId(group[0].id)}
              onPointerEnter={() => setId(group[0].id)}
            >
              <title>
                {group.length} player(s) · {group[0].game.overall} OVR ·{" "}
                {group[0].game.cost} credits
              </title>
            </circle>
          ))}
          {selected && (
            <circle
              cx={x(selected.game.overall)}
              cy={y(selected.game.cost)}
              r="16"
              fill="none"
              stroke="#fff2df"
              strokeWidth="2"
            />
          )}
        </g>
        {!data.length && (
          <text x="300" y="160" textAnchor="middle">
            Discover players to populate this chart
          </text>
        )}
      </svg>
      <div className="chart-inspector">
        <strong>{selected?.name || "Every circle is a price point"}</strong>
        <span>
          {selected
            ? `${selected.game.overall} OVR · ${selected.game.cost} credits · ${selected.club || "Club unavailable"}`
            : "Tap a circle, or choose a player below. Larger circles contain more players."}
        </span>
      </div>
      <label className="field">
        Inspect player
        <select
          value={selected?.id || ""}
          onChange={(e) => setId(e.target.value)}
        >
          <option value="">Choose a player</option>
          {data.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name} · {p.game.overall} OVR · {p.game.cost} cr
            </option>
          ))}
        </select>
      </label>
      <div className="mini-stats">
        <div>
          <strong>{summary.x.toFixed(1)}</strong>
          <span>Average OVR</span>
        </div>
        <div>
          <strong>{summary.y.toFixed(0)}</strong>
          <span>Average cost</span>
        </div>
        <div>
          <strong>{summary.r === null ? "—" : summary.r.toFixed(2)}</strong>
          <span>Correlation r</span>
        </div>
      </div>
      <p className="data-note">
        Dashed line: price trend. Ratings and prices share a game formula, so
        correlation is not evidence of real market value. Baseline players of
        the same role overlap.
      </p>
    </section>
  );
}
