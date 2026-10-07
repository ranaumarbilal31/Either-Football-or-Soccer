import { slotRoles } from "./game/types.js";
import { positions, fit, metrics } from "./game/ratings.js";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const options = (list, value, placeholder) =>
  (placeholder !== undefined
    ? `<option value="">${esc(placeholder)}</option>`
    : "") +
  list
    .map(
      (x) =>
        `<option value="${esc(x.value ?? x)}" ${(x.value ?? x) === value ? "selected" : ""}>${esc(x.label ?? x)}</option>`,
    )
    .join("");
export const button = (action, label, attrs = "") =>
  `<button data-action="${action}" ${attrs}>${label}</button>`;
export function numbers(squad, players) {
  const m = metrics(squad, players);
  return `<div class="team-numbers"><span><b>${(m.quality / 10).toFixed(1)}<small>/10</small></b>Squad quality</span><span><b>${Math.round(m.chemistry)}<small>/100</small></b>Chemistry</span><span><b>${Math.round(m.strength)}<small>/100</small></b>Effective strength</span></div>`;
}
export const legend = () =>
  '<div class="legend"><span class="green">Strong</span><span class="yellow">Good</span><span class="orange">Developing</span><span class="red">Weak</span></div>';
export function pitch(squad, players, active = null, readonly = false) {
  const pos = positions(squad.formation),
    slots = slotRoles(squad.formation),
    m = metrics(squad, players);
  return `<div class="pitch" aria-label="Squad pitch"><svg class="pitch-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="4" y="4" width="92" height="92" rx="1"/><path d="M4 50H96M30 4V20H70V4M40 4V11H60V4M30 96V80H70V96M40 96V89H60V96"/><ellipse cx="50" cy="50" rx="13" ry="10"/></svg><svg class="chem-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${m.links
    .filter((l) => squad.ids[l.a] && squad.ids[l.b])
    .map(
      (l) =>
        `<line x1="${pos[l.a].x}" y1="${pos[l.a].y}" x2="${pos[l.b].x}" y2="${pos[l.b].y}" class="${l.color}"><title>${slots[l.a]} to ${slots[l.b]}: ${l.score} chemistry, ${esc(l.reason)}</title></line>`,
    )
    .join("")}</svg>${pos
    .map((p, i) => {
      const player = players.find((x) => x.id === squad.ids[i]),
        wrong = player && fit(player, slots[i]) < 1;
      return `<button type="button" class="pitch-player ${active === i ? "active" : ""} ${wrong ? "wrong" : ""}" style="left:${p.x}%;top:${p.y}%" ${readonly ? 'tabindex="-1"' : `data-action="slot" data-slot="${i}"`} aria-label="${slots[i]} slot ${i + 1}: ${esc(player?.name || "empty")}"><span class="shirt">${player ? player.rating.toFixed(1) : "+"}</span><strong>${esc(player?.name || slots[i])}</strong><small>${wrong ? "Position mismatch" : slots[i]}</small></button>`;
    })
    .join("")}</div>`;
}
export function playerDetails(p) {
  return `<dialog aria-labelledby="player-title"><div class="dialog-heading"><div><small>${esc(p.role)} · ${esc(p.club)}</small><h2 id="player-title">${esc(p.name)}</h2></div>${button("close-details", "×", 'aria-label="Close player details"')}</div><div class="detail-grid"><div><b>${p.rating.toFixed(1)}/10</b><small>Ability · ${p.estimated ? "Estimated" : "Statistics based"}</small></div><div><b>${p.price} pts</b><small>Signing cost</small></div><div><b>${Math.round(p.confidence * 100)}%</b><small>Confidence</small></div></div><p>${esc(p.nationality)} · ${p.minutes} season minutes · ${esc(p.source || "Provider data")}</p><h3>Season evidence</h3><div class="evidence-grid">${Object.entries(
    p.season || p.metrics,
  )
    .map(
      ([k, v]) =>
        `<span>${esc(k)}<b>${typeof v === "number" ? Math.round(v * 100) / 100 : "Unavailable"}</b></span>`,
    )
    .join(
      "",
    )}</div><h3>Last five appearances</h3>${p.appearances.length ? `<p>${p.appearances.map((a) => `${esc(a.date)}: ${a.grade}/10`).join(" · ")}</p>` : "<p>No verified individual match history. Form remains unavailable.</p>"}<details><summary>How this rating is calculated</summary><p>Position and competition percentiles, adjusted for playing time: minutes ÷ (minutes + 900). Baseline ${p.baseline.toFixed(2)}/10. Recent form ${p.form?.toFixed(2) || "unavailable"}; its weight grows to 25% with five verified appearances. Missing statistics are excluded.</p><p>Price = half-point rounding of 3 + 0.22 × (rating − 3)², limited to 3–15 points.</p><p>${p.estimated ? "Estimated from real club results because individual statistics are insufficient." : "Role-weighted prevention, distribution and attack evidence."}</p></details>${button("close-details", "Done", 'class="primary"')}</dialog>`;
}
export function stats(events, minute) {
  return [0, 1].map((side) => {
    const own = events.filter((e) => e.side === side),
      shots = own.filter((e) => ["shot", "save", "goal"].includes(e.type));
    return {
      shots: shots.length,
      onTarget: shots.filter((e) => e.type !== "shot").length,
      xg: shots.reduce((n, e) => n + (e.xg || 0), 0).toFixed(2),
      possession: minute
        ? Math.round(
            (own.filter((e) => e.type === "pass").length / (minute * 4)) * 100,
          )
        : 50,
    };
  });
}
export function statRows(s) {
  return `<div class="match-stats">${Object.entries({
    shots: "Shots",
    onTarget: "On target",
    xg: "Expected goals",
    possession: "Possession %",
  })
    .map(
      ([k, label]) =>
        `<div><b>${s[0][k]}</b><span>${label}</span><b>${s[1][k]}</b></div>`,
    )
    .join("")}</div>`;
}
