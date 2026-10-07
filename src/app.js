import "./style.css";
import {
  freshSave,
  formations,
  matchLimit,
  roles,
  slotRoles,
} from "./game/types.js";
import {
  metrics,
  autoSquad,
  changeFormation,
  ranked,
  shortlist,
  squadError,
  fit,
} from "./game/ratings.js";
import { createMatchSession, simulate } from "./game/engine.js";
import { opponent, startLeague, standings } from "./game/league.js";
import { loadGame, saveGame, oldArchive, download } from "./game/storage.js";
import {
  esc,
  options,
  button,
  numbers,
  pitch,
  legend,
  playerDetails,
  stats,
  statRows,
} from "./view.js";
const root = document.querySelector("#root");
let save = freshSave(),
  catalog = null,
  catalogError = "",
  ready = false,
  queue = Promise.resolve(),
  storageError = "",
  details = null;
let active = null,
  source = "saved",
  mobile = "pitch",
  filters = { q: "", role: "ALL", club: "", nation: "", rating: 0, price: 15 },
  page = 1,
  live = null,
  liveBusy = false,
  liveError = "";
let mode = "",
  competition = "",
  teamId = "",
  selectedMatch = "",
  analysis = "",
  analysisBusy = false,
  job = null,
  refreshTimer;
let matchSession = null,
  matchMeta = null,
  paused = true,
  speed = 1,
  halfStopped = false,
  matchTimer = null;
const budgets = { Easy: 120, Medium: 100, Hard: 85, "Very Hard": 70 };
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const allPlayers = () =>
  save.league?.snapshot.players || catalog?.players || [];
const availablePlayers = () => {
  const c = save.league?.snapshot || catalog;
  if (!c) return [];
  const ids = new Set(c.availableIds || c.players.map((p) => p.id));
  return c.players.filter((p) => ids.has(p.id));
};
const userSide = () => ({
  name: save.club.name,
  squad: structuredClone(save.squad),
  players: allPlayers().filter(p=>save.squad.ids.includes(p.id)),
});
async function api(url, method = "GET", body) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed. Please retry.");
  return data;
}
function notify(text) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `${esc(text)}${button("dismiss", "×", 'aria-label="Dismiss message"')}`;
  document.body.append(el);
  setTimeout(() => el.remove(), 8000);
}
function update(next, paint = true) {
  save = next;
  queue = queue
    .then(() => saveGame(next))
    .catch((e) => {
      storageError = e.message;
      notify(
        "Your progress could not be saved. Export your game before closing.",
      );
    });
  if (paint) render();
}
function go(path) {
  if (matchSession && path != "/play") {
    paused = true;
    stopClock();
  }
  history.pushState({}, "", path);
  render();
  window.scrollTo({ top: 0 });
}
window.addEventListener("popstate", () => {
  if (matchSession) {
    paused = true;
    stopClock();
  }
  render();
});
async function fetchCatalog() {
  catalogError = "";
  try {
    catalog = await api("/api/v3/catalog");
    if (ready)
      update({ ...save, savedIds: shortlist(availablePlayers()) }, false);
  } catch (e) {
    catalogError = e.message;
  }
  render();
}
function header() {
  const home = location.pathname === "/";
  return `<header class="topbar ${home ? "home-bar" : ""}"><a href="/" data-route class="brand"><img src="/logo.webp" alt="EFOS circular crest"><span>Either Football<br><em>or Soccer</em></span></a>${
    home
      ? '<a class="repo-link" href="https://github.com/ranaumarbilal31/Either-Football-or-Soccer" target="_blank" rel="noreferrer">GitHub ↗</a>'
      : save.club
        ? `<nav aria-label="Main navigation">${[
            ["/squad", "Squad builder"],
            ["/play", "Play"],
            ["/results", "Results"],
            ["/club", "Club settings"],
          ]
            .map(
              ([url, name]) =>
                `<a href="${url}" data-route class="${location.pathname === url ? "active" : ""}">${name}</a>`,
            )
            .join(
              "",
            )}</nav><div class="club-label"><strong>${esc(save.club.name)}</strong><small>${esc(save.club.manager)}</small></div>`
        : ""
  }</header>`;
}
function homeView() {
  return `<main class="landing"><svg class="landing-pitch" viewBox="0 0 1000 700" aria-hidden="true"><g fill="none" stroke="currentColor"><rect x="60" y="50" width="880" height="600"/><path d="M500 50V650M60 200H210V500H60M940 200H790V500H940"/><circle cx="500" cy="350" r="100"/><path class="run" d="M230 550L390 350L570 420L780 160"/></g></svg><div class="landing-content"><p class="eyebrow">WELCOME TO EFOS</p><h1>Football is yours<br>to <em>make.</em></h1><p>Build your club. Find your chemistry.<br>Write your own matchday story.</p>${button("get-started", "Get started <span>↗</span>", 'class="primary" aria-label="Get started"')}</div></main>`;
}
function setupView() {
  const c = save.club || {
    name: "",
    manager: "",
    difficulty: "Medium",
    budget: 100,
  };
  return `<div class="setup-layout"><div><h1>Your club.<br>Your rules<span>.</span></h1><p>Start with an idea. Build an eleven.<br>Give them something to play for.</p><div class="setup-emblem">EF<span>OS</span></div></div><form id="setup-form" class="setup-form panel"><h2>${save.club ? "Club settings" : "Meet the manager"}</h2><label>Team name<input name="name" aria-label="Team name" maxlength="60" placeholder="Your FC" value="${esc(c.name)}"></label><label>Manager name<input name="manager" aria-label="Manager name" maxlength="60" placeholder="What should we call you?" value="${esc(c.manager)}"></label><fieldset><legend>Choose your challenge</legend><div class="difficulty">${Object.entries(
    budgets,
  )
    .map(([d, b]) =>
      button(
        "difficulty",
        `${d}<small>${b} pts</small>`,
        `type="button" data-value="${d}" class="${c.difficulty === d ? "selected" : ""}"`,
      ),
    )
    .join(
      "",
    )}</div></fieldset><label>Your points budget<input name="budget" type="number" aria-label="Points budget" min="55" max="200" step=".5" required value="${c.budget}"></label><input name="difficulty" type="hidden" value="${esc(c.difficulty)}"><p class="muted">A smaller budget means harder choices. Match rules stay fair at every difficulty.</p><button type="submit" class="primary">${save.club ? "Save club settings" : "Continue to squad builder"} <span>↗</span></button>${!save.club ? `<div class="setup-alternatives">${button("skip", "Skip for now", 'type="button"')}${button("setup-auto", "Auto-select club & squad", 'type="button"')}</div>` : `<div class="settings-actions">${button("archive", "Export previous version’s save", 'type="button"')}${button("export", "Export current game", 'type="button"')}${button("refresh", job?.state === "running" ? "Updating players…" : "Update player database", `type="button" ${job?.state === "running" ? "disabled" : ""}`)}</div>${job ? `<p role="status">${esc(job.message)}${job.errors?.map((e) => `<br>${esc(e)}`).join("") || ""}</p>` : ""}`}</form></div>`;
}
function setupDetails() {
  const form = document.querySelector("#setup-form");
  if (!form.reportValidity()) return null;
  const data = new FormData(form);
  return {
    name: String(data.get("name")).trim() || "Your FC",
    manager: String(data.get("manager")).trim() || "Manager",
    budget: Number(data.get("budget")),
    difficulty: String(data.get("difficulty")),
  };
}
function begin(club, auto = false) {
  if (!club) return;
  if (save.league && save.club.budget !== club.budget) {
    notify("Your season budget is locked until the league ends.");
    return;
  }
  try {
    const squad = auto
      ? autoSquad(save.squad, availablePlayers(), club.budget)
      : save.squad;
    update({ ...save, club, squad }, false);
    go("/squad");
  } catch (e) {
    notify(e.message);
  }
}
function filtered() {
  const n = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return ranked(
    availablePlayers().filter(
      (p) =>
        (source !== "saved" || save.savedIds.includes(p.id)) &&
        (filters.role === "ALL" || p.role === filters.role) &&
        (!filters.q ||
          n(`${p.name} ${p.club} ${p.nationality}`).includes(n(filters.q))) &&
        (!filters.club || n(p.club).includes(n(filters.club))) &&
        (!filters.nation || n(p.nationality).includes(n(filters.nation))) &&
        p.rating >= filters.rating &&
        p.price <= filters.price,
    ),
  );
}
function builderView() {
  const ps = allPlayers(),
    m = metrics(save.squad, ps),
    error = squadError(save.squad, ps, save.club.budget),
    shown = filtered();
  page = Math.max(1, Math.min(page, Math.ceil(shown.length / 30) || 1));
  return `<div class="page-title"><div><h1>Build your eleven<span>.</span></h1><p>Find the players. Make the connections. Shape your game.</p></div>${button("choose-match", "Choose your match <span>↗</span>", `class="primary" ${error ? "disabled" : ""}`)}</div><div class="builder-summary"><span><b>${save.club.budget - m.cost}</b> points left <small>of ${save.club.budget}</small></span><span><b>${m.count}</b> / 11 selected</span>${save.league ? "<span>Season prices locked</span>" : ""}${button("manage-budget", "Manage the limit")}${button("auto", "Auto-select squad")}${button("clear-pitch", "Clear pitch")}</div><div class="mobile-tabs">${button("mobile-pitch", "Pitch", `class="${mobile === "pitch" ? "selected" : ""}"`)}${button("mobile-players", "Players", `class="${mobile === "players" ? "selected" : ""}"`)}</div><div class="builder mobile-${mobile}"><section class="pitch-panel"><div class="panel-heading"><h2>${esc(save.club.name)}</h2><label>Formation<select aria-label="Formation" data-change="formation">${options(Object.keys(formations), save.squad.formation)}</select></label></div>${numbers(save.squad, ps)}${pitch(save.squad, ps, active)}${legend()}${active !== null ? `<div class="slot-actions"><span>${slotRoles(save.squad.formation)[active]} selected</span>${save.squad.ids[active] ? button("remove-player", "Remove player") : ""}${button("cancel-slot", "Cancel selection")}</div>` : ""}<details><summary>Tactics & chemistry</summary><p class="muted">Shared clubs, leagues and nationalities strengthen nearby connections. A player outside their natural position loses strength.</p>${tacticControls(save.squad.tactics, "builder")}</details>${error ? `<p class="muted" role="status">${esc(error)}</p>` : ""}</section><section class="scout-panel"><div class="scout-controls"><div class="tabs">${button("source-saved", "Saved players", `class="${source === "saved" ? "selected" : ""}"`)}${button("source-search", "Search all players", `class="${source === "search" ? "selected" : ""}"`)}${button("source-live", "Live search", `class="${source === "live" ? "selected" : ""}"`)}</div><form class="search" id="search-form"><input aria-label="Search players" placeholder="Search a player, club or country" value="${esc(filters.q)}"><button type="submit" class="primary">Search</button></form>${source !== "live" ? `<div class="filters"><label>Position<select aria-label="Position" data-filter="role">${options([{ value: "ALL", label: "All positions" }, ...roles], filters.role)}</select></label><label>Club<input aria-label="Club" data-filter="club" placeholder="Any club" value="${esc(filters.club)}"></label><label>Nationality<input aria-label="Nationality" data-filter="nation" placeholder="Any country" value="${esc(filters.nation)}"></label><label>Min. rating<input aria-label="Min. rating" data-filter="rating" type="number" min="0" max="10" step=".5" value="${filters.rating}"></label><label>Max. points<input aria-label="Max. points" data-filter="price" type="number" min="3" max="15" step=".5" value="${filters.price}"></label></div><div class="list-caption"><span>${shown.length} players · ranked by ability</span><span>Rating / Points</span></div>` : '<p class="muted">Live provider search. Only players with verified database positions can be signed.</p>'}</div><div class="player-list">${
    source === "live"
      ? liveView()
      : shown
          .slice((page - 1) * 30, page * 30)
          .map(playerCard)
          .join("") ||
        `<div class="empty"><h3>No players match</h3><p>Try another name or clear your filters.</p>${button("clear-filters", "Clear filters")}</div>`
  }</div>${source !== "live" && shown.length > 30 ? `<div class="pagination">${button("previous", "Previous", page === 1 ? "disabled" : "")}<span>${page} / ${Math.ceil(shown.length / 30)}</span>${button("next", "Next", page * 30 >= shown.length ? "disabled" : "")}</div>` : ""}</section></div>`;
}
function playerCard(p) {
  const selected = save.squad.ids.includes(p.id);
  return `<article class="player-card ${selected ? "drafted" : ""}" draggable="true" data-player="${esc(p.id)}"><span class="role-badge ${p.role.toLowerCase()}">${p.role}</span><button class="player-name" data-action="details" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.club || p.nationality)} · ${p.estimated ? "Estimated" : "Stats-based"}</small></button><div class="player-value"><b>${p.rating.toFixed(1)}</b><small>${p.price} pts</small></div>${button("assign", selected ? "✓" : "+", `class="add-player" data-id="${esc(p.id)}" aria-label="Add ${esc(p.name)}" ${selected ? "disabled" : ""}`)}</article>`;
}
function liveView() {
  if (liveBusy)
    return '<div class="empty" role="status">Searching live players…</div>';
  if (liveError)
    return `<div class="empty"><p>${esc(liveError)}</p>${button("live-retry", "Retry live search")}</div>`;
  if (!live)
    return '<div class="empty">Enter a player name and press Search.</div>';
  return (
    live.results
      .map((p) => {
        const known = allPlayers().find((x) => x.id === p.playerId);
        return known
          ? playerCard(known)
          : `<article class="player-card"><span class="role-badge">?</span><div class="player-name"><strong>${esc(p.name)}</strong><small>${esc(p.club)} · Position unavailable</small></div><small>Profile only</small></article>`;
      })
      .join("") ||
    '<div class="empty">No live players match. Try another name.</div>'
  );
}
async function runLive() {
  if (filters.q.length < 2) {
    notify("Enter at least two characters.");
    return;
  }
  liveBusy = true;
  liveError = "";
  render();
  try {
    live = await api(`/api/v3/players/live?q=${encodeURIComponent(filters.q)}`);
  } catch (e) {
    liveError = e.message;
  }
  liveBusy = false;
  render();
}
function assign(id, index = active) {
  const ps = allPlayers(),
    p = ps.find((x) => x.id === id);
  if (!p) return;
  const slots = slotRoles(save.squad.formation);
  const slot =
    index ?? slots.findIndex((r, i) => r === p.role && !save.squad.ids[i]);
  if (slot < 0) {
    notify("Select a position on the pitch first.");
    return;
  }
  if (!fit(p, slots[slot])) {
    notify("Goalkeepers can only occupy the goalkeeper slot.");
    return;
  }
  const ids = save.squad.ids.map((x) => (x === id ? null : x));
  ids[slot] = id;
  const squad = { ...save.squad, ids };
  if (metrics(squad, ps).cost > save.club.budget) {
    notify("This player would exceed your points budget.");
    return;
  }
  active = null;
  update({ ...save, squad });
  notify(`${p.name} added to your eleven.`);
}
function tacticControls(t, prefix) {
  return ["tempo", "press", "line"]
    .map(
      (k) =>
        `<label class="range">${k === "line" ? "Defensive line" : k === "press" ? "Pressing" : "Tempo"} <b>${t[k]}</b><input aria-label="${prefix === "match" ? "Match " : ""}${k}" type="range" min="0" max="100" value="${t[k]}" data-tactic="${k}" data-scope="${prefix}"></label>`,
    )
    .join("");
}
function playView() {
  if (matchSession) return matchView();
  if (save.league) return leagueView();
  const error = squadError(save.squad, allPlayers(), save.club.budget);
  if (error)
    return `<div class="empty"><h1>Your team comes first.</h1><p>${esc(error)}</p>${button("back-squad", "Back to squad builder")}</div>`;
  const c = catalog;
  const comps = c.competitions.filter(
    (x) => mode !== "league" || x.kind === "league",
  );
  const comp = comps.find((x) => x.id === competition);
  const teams = c.teams.filter((t) => comp?.teamIds.includes(t.id));
  const team = c.teams.find((t) => t.id === teamId),
    side = team && opponent(team, c);
  return `<div class="page-title"><div><h1>Your matchday<span>.</span></h1><p>Take your place on the touchline.</p></div></div><div class="mode-options">${button("single", "Single match <small>Pick a real opponent</small>", `class="${mode === "single" ? "selected" : ""}"`)}${button("league", "League season <small>Join a league. Play every club.</small>", `class="${mode === "league" ? "selected" : ""}"`)}</div>${
    mode
      ? `<section class="panel match-choice"><label>Choose competition<select aria-label="Choose competition" data-change="competition">${options(
          comps.map((x) => ({
            value: x.id,
            label:
              x.name + (x.kind === "international" ? " · International" : ""),
          })),
          competition,
          "Select a competition",
        )}</select></label>${
          mode === "single" && comp
            ? `<label>Choose opponent<select aria-label="Choose opponent" data-change="opponent">${options(
                teams.map((t) => ({
                  value: t.id,
                  label:
                    t.name + (opponent(t, c) ? "" : " · Lineup unavailable"),
                })),
                teamId,
                "Select an opponent",
              )}</select></label>`
            : ""
        }${
          mode === "league" && comp
            ? `<p>Your FC joins as an extra club and plays every team home and away. Season data and prices stay fixed.</p>${button(
                "enter-league",
                "Enter league",
                `class="primary" ${
                  comp.complete &&
                  comp.teamIds.every((id) => {
                    const t = c.teams.find((t) => t.id === id);
                    return t && opponent(t, c);
                  })
                    ? ""
                    : "disabled"
                }`,
              )}`
            : ""
        }</section>${
          side
            ? `<div class="opponent-grid"><section class="pitch-panel"><div class="panel-heading"><h2>${esc(side.name)}</h2><span>${side.squad.formation}</span></div>${numbers(side.squad, side.players)}${pitch(side.squad, side.players, null, true)}${legend()}</section><section class="panel"><h2>Scouting report</h2><p>${esc(team.style)}</p><p>Recent team results: ${team.results.join(" · ") || "Unavailable"}</p><p>Ability is separate from simulated match performance. Your tactical decisions influence chances, passing and fatigue.</p><div class="opponent-roster">${side.squad.ids
                .map((id) => {
                  const p = side.players.find((x) => x.id === id);
                  return `<div><span>${esc(p.name)} <small>${p.role}</small></span><b>${p.rating.toFixed(1)}/10</b></div>`;
                })
                .join(
                  "",
                )}</div>${button("play-match", "Play match", 'class="primary"')}</section></div>`
            : team
              ? '<p class="notice">This opponent does not have a complete verified lineup.</p>'
              : ""
        }`
      : ""
  }`;
}
function leagueView() {
  const l = save.league,
    pending = l.fixtures.find((f) => !f.result),
    round = pending?.round,
    fixtures = l.fixtures.filter((f) => f.round === round),
    user = fixtures.find((f) => f.home === "user" || f.away === "user");
  const rows = standings(l);
  const ranks = new Map();
  for (const f of l.fixtures)
    if (f.result)
      for (const g of f.result.grades) {
        const p = ranks.get(g.id) || {
          name: g.name,
          total: 0,
          played: 0,
          goals: 0,
        };
        p.total += g.rating;
        p.played++;
        p.goals += g.goals;
        ranks.set(g.id, p);
      }
  return `<div class="page-title"><div><h1>${esc(l.name)}</h1><p>Season prices locked · ${round ? `Round ${round}${user ? "" : " · Your club has a bye"}` : "Season complete"}</p></div>${button("play-round", pending ? "Play next round" : "Season finished", `class="primary" ${pending ? "" : "disabled"}`)}</div><div class="league-layout"><section class="panel table-scroll"><table><thead><tr><th>Pos</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.id === "user" ? "your-row" : ""}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.gf - r.ga}</td><td>${r.points}</td></tr>`).join("")}</tbody></table></section><section class="panel"><h2>${pending ? "Next fixtures" : "Season player rankings"}</h2>${
    pending
      ? fixtures
          .map(
            (f) =>
              `<p>${esc(l.sides[f.home].name)} <span class="muted">vs</span> ${esc(l.sides[f.away].name)}</p>`,
          )
          .join("")
      : [...ranks.values()]
          .sort((a, b) => b.total / b.played - a.total / a.played)
          .slice(0, 20)
          .map(
            (p) =>
              `<p>${esc(p.name)} <b>${(p.total / p.played).toFixed(1)}/10</b> · ${p.goals} goals</p>`,
          )
          .join("")
  }${!pending ? button("end-season", "Finish season & return to squad") : ""}</section></div>`;
}
function launch(home, away, meta = { userIndex: 0 }) {
  matchSession = createMatchSession(home, away, seed());
  matchMeta = meta;
  paused = true;
  halfStopped = false;
  speed = 1;
  go("/play");
}
function nextRound() {
  const l = save.league,
    pending = l.fixtures.find((f) => !f.result);
  if (!pending) return;
  const error = squadError(save.squad, l.snapshot.players, save.club.budget);
  if (error) {
    notify(error);
    return;
  }
  const fixture = l.fixtures.find(
    (f) =>
      f.round === pending.round && (f.home === "user" || f.away === "user"),
  );
  if (!fixture) {
    completeRound(null, pending.round);
    notify("Your club had a bye. The other fixtures have been played.");
    return;
  }
  const sides = structuredClone(l.sides);
  sides.user = userSide();
  launch(sides[fixture.home], sides[fixture.away], {
    userIndex: fixture.home === "user" ? 0 : 1,
    fixtureId: fixture.id,
    round: fixture.round,
  });
}
function completeRound(match, round) {
  const l = structuredClone(save.league),
    baseSeed = seed();
  l.sides.user = userSide();
  for (const [i, f] of l.fixtures.entries()) {
    if (f.round !== round || f.result) continue;
    f.result =
      f.id === matchMeta?.fixtureId && match
        ? match
        : simulate(l.sides[f.home], l.sides[f.away], baseSeed + i);
  }
  update({
    ...save,
    league: l,
    matches: match ? [match, ...save.matches].slice(0, matchLimit) : save.matches,
  });
}
function matchView() {
  const sides = matchSession.sides,
    minute = matchSession.minute,
    idx = matchMeta.userIndex,
    t = sides[idx].squad.tactics;
  const events = matchSession.events;
  const latest=events.at(-1);
  const lastSide=latest?.side??0;
  const lastIndex=latest?sides[lastSide].squad.ids.indexOf(latest.playerId):-1;
  const lastRole=lastIndex>=0?slotRoles(sides[lastSide].squad.formation)[lastIndex]:'MID';
  const ballX=latest&&['goal','save','shot'].includes(latest.type)?(lastSide===0?90:10):lastSide===0?lastRole==='DEF'?25:lastRole==='FWD'?65:43:lastRole==='DEF'?75:lastRole==='FWD'?35:57;
  const ballY=latest&&['goal','save','shot'].includes(latest.type)?50:30+((lastIndex+2)*13)%40;
  const names = new Map(
    sides.flatMap((s) => s.players.map((p) => [p.id, p.name])),
  );
  const commentary = events
    .filter((e) => ["goal", "save", "shot", "error"].includes(e.type))
    .slice(-18)
    .reverse();
  return `<section class="live-match"><div class="match-banner"><span class="live-tag">${minute === 90 ? "Full time" : minute === 45 && halfStopped ? "Half time" : paused ? "Ready on the touchline" : "Match in progress"}</span><b id="match-clock">${minute}′</b><span>Simulated match</span></div><section class="scoreboard"><span>${esc(sides[0].name)}</span><strong>${matchSession.score.join(" : ")}</strong><span>${esc(sides[1].name)}</span></section><div class="match-workspace"><div><div class="match-field" aria-label="Live match pitch"><svg viewBox="0 0 1000 600" aria-hidden="true"><rect x="20" y="20" width="960" height="560" rx="2"/><path d="M500 20V580M20 180H160V420H20M980 180H840V420H980"/><circle cx="500" cy="300" r="80"/></svg>${sides
    .map((s, side) =>
      s.squad.ids
        .map((id, i) => {
          const p = s.players.find((p) => p.id === id);
          const role = slotRoles(s.squad.formation)[i];
          const group = slotRoles(s.squad.formation)
            .map((r, j) => (r === role ? j : -1))
            .filter((j) => j >= 0);
          const x =
            side === 0
              ? role === "GK"
                ? 7
                : role === "DEF"
                  ? 24
                  : role === "MID"
                    ? 42
                    : 62
              : role === "GK"
                ? 93
                : role === "DEF"
                  ? 76
                  : role === "MID"
                    ? 58
                    : 38;
          const y = ((group.indexOf(i) + 1) * 88) / (group.length + 1) + 6;
          const drift =
            minute && role !== "GK" ? Math.sin((minute + i) * 0.7) * 3 : 0;
          return `<span class="match-dot side-${side}" style="left:${x + drift}%;top:${y}%" title="${esc(p.name)}">${i + 1}</span>`;
        })
        .join(""),
    )
    .join(
      "",
    )}<span class="match-ball" style="left:${minute?ballX:50}%;top:${minute?ballY:50}%">⚽</span></div><div class="match-buttons">${button("toggle-match", minute === 90 ? "Full time" : paused ? (minute === 45 ? "Start second half" : "Kick off / Resume") : "Pause match", minute === 90 ? "disabled" : 'class="primary"')}<label>Match speed<select aria-label="Match speed" data-change="speed">${options(
    [1, 2, 4, 10].map((n) => ({ value: String(n), label: `${n}×` })),
    String(speed),
  )}</select></label>${button("finish-match", "Play to full time", minute === 90 ? "disabled" : "")}${minute === 90 ? button("match-report", "View match report", 'class="primary"') : ""}</div>${statRows(stats(events, minute))}</div><section class="panel touchline"><h2>Your touchline</h2><p class="muted">Changes affect the next minute. High pressing costs stamina; a higher line opens space behind your defense.</p><div class="tactical-presets">${button("preset", "Protect lead", 'data-value="defend"')}${button("preset", "Balanced", 'data-value="balanced"')}${button("preset", "Chase goal", 'data-value="attack"')}</div><label>Match formation<select aria-label="Match formation" data-change="match-formation" ${minute === 90 ? "disabled" : ""}>${options(Object.keys(formations), sides[idx].squad.formation)}</select></label>${tacticControls(t, "match")}<h3>Match commentary</h3><div class="commentary" aria-live="polite">${commentary.map((e) => `<p class="event-${e.type}"><b>${e.minute}′</b> ${e.type === "goal" ? "GOAL — " : e.type === "save" ? "Saved effort — " : e.type === "error" ? "Possession error — " : "Shot wide — "}${esc(names.get(e.playerId))}${e.assistId ? ` · Assist: ${esc(names.get(e.assistId))}` : ""}</p>`).join("") || "<p>The teams are ready. Choose your approach and kick off.</p>"}</div></section></div></section>`;
}
function stopClock() {
  clearInterval(matchTimer);
  matchTimer = null;
}
function clock() {
  stopClock();
  if (paused) return;
  matchTimer = setInterval(
    () => {
      if (paused) return;
      advanceMinute();
    },
    Math.max(70, 800 / speed),
  );
}
function advanceMinute() {
  if (!matchSession || matchSession.minute >= 90) return;
  matchSession.step();
  if (matchSession.minute === 45 && !halfStopped) {
    halfStopped = true;
    paused = true;
    stopClock();
    notify("Half time. Adjust your tactics before the second half.");
  }
  if (matchSession.minute === 90) {
    paused = true;
    stopClock();
  }
  renderMatchTick();
}
function renderMatchTick(){
 const template=document.createElement('template');template.innerHTML=matchView();
 for(const selector of ['.match-banner','.scoreboard','.match-stats','.commentary','.match-buttons']){
  const old=root.querySelector(selector),next=template.content.querySelector(selector);if(old&&next)old.replaceWith(next);
 }
 const current=root.querySelectorAll('.match-dot,.match-ball'),next=template.content.querySelectorAll('.match-dot,.match-ball');
 current.forEach((dot,i)=>{if(next[i])dot.style.cssText=next[i].style.cssText;});
}
function completeMatch() {
  if (!matchSession || matchSession.minute !== 90) return;
  const match = matchSession.finish();
  selectedMatch = match.id;
  analysis = "";
  if (save.league && matchMeta.fixtureId) completeRound(match, matchMeta.round);
  else
    update(
      { ...save, matches: [match, ...save.matches].slice(0, matchLimit) },
      false,
    );
  matchSession = null;
  matchMeta = null;
  go("/results");
}
function resultView() {
  const match =
    save.matches.find((m) => m.id === selectedMatch) || save.matches[0];
  if (!match)
    return '<div class="empty"><h1>Your story starts on the pitch.</h1><p>Complete a match to see every player’s performance.</p></div>';
  const grades = [...match.grades].sort(
    (a, b) =>
      b.rating - a.rating || b.goals - a.goals || a.id.localeCompare(b.id),
  );
  return `<div class="page-title"><h1>Match report<span>.</span></h1><label>Match<select data-change="result">${options(
    save.matches.map((m) => ({
      value: m.id,
      label: `${m.names[0]} ${m.score.join("–")} ${m.names[1]}`,
    })),
    match.id,
  )}</select></label></div><section class="scoreboard"><span>${esc(match.names[0])}</span><strong>${match.score.join(" : ")}</strong><span>${esc(match.names[1])}</span></section><div class="report-grid"><section class="panel"><h2>The story of the match</h2>${match.report.map((p) => `<p>${esc(p)}</p>`).join("")}${statRows(match.stats)}${button("analysis", analysisBusy ? "Writing analysis…" : "Gemini match analysis", analysisBusy ? "disabled" : "")}<div class="gemini-report">${analysis ? esc(analysis).replace(/\n/g, "<br>") : ""}</div><h3>Decisive moments</h3>${
    match.events
      .filter((e) => e.type === "goal")
      .map(
        (e) =>
          `<p>${e.minute}′ ${esc(match.grades.find((g) => g.id === e.playerId)?.name)} scores for ${esc(match.names[e.side])}.</p>`,
      )
      .join("") || "<p>Neither side found a goal.</p>"
  }</section><section class="panel"><h2>Player performances</h2><p class="muted">Match grades out of 10, derived from recorded contributions on both teams.</p><div class="performance-list">${grades.map((g) => `<div><span><strong>${esc(g.name)}</strong><small>${esc(match.names[g.side])} · ${g.role} · ${g.goals} goals · ${g.assists} assists · ${g.saves} saves</small></span><b>${g.rating.toFixed(1)}</b></div>`).join("")}</div></section></div>`;
}
function render() {
  if (!ready) {
    root.innerHTML = '<div class="loading">Opening EFOS…</div>';
    return;
  }
  let path = location.pathname;
  if (!save.club && !["/", "/setup"].includes(path)) {
    history.replaceState({}, "", "/setup");
    path = "/setup";
  }
  if (
    save.club &&
    !["/", "/setup", "/club", "/squad", "/play", "/results"].includes(path)
  ) {
    history.replaceState({}, "", "/squad");
    path = "/squad";
  }
  const view =
    path === "/"
      ? homeView()
      : ["/setup", "/club"].includes(path)
        ? setupView()
        : catalogError
          ? `<div class="empty"><h2>Player data is unavailable</h2><p>${esc(catalogError)}</p>${button("retry", "Retry")}</div>`
          : !catalog
            ? '<div class="empty">Loading your player database…</div>'
            : path === "/play"
              ? playView()
              : path === "/results"
                ? resultView()
                : builderView();
  root.innerHTML =
    header() +
    (storageError
      ? `<div class="notice">${esc(storageError)} ${button("export", "Export game")}</div>`
      : "") +
    (path === "/" ? view : `<main class="workspace">${view}</main>`) +
    (details ? playerDetails(details) : "");
  if (details) {
    const dialog = root.querySelector("dialog");
    dialog.showModal();
    dialog.addEventListener("cancel", () => {
      details = null;
    });
  }
}
document.addEventListener("click", async (e) => {
  const link = e.target.closest("a[data-route]");
  if (link) {
    e.preventDefault();
    go(link.getAttribute("href"));
    return;
  }
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const a = el.dataset.action;
  try {
    if (a === "get-started") go(save.club ? "/squad" : "/setup");
    else if (a === "difficulty") {
      const f = document.querySelector("#setup-form");
      f.elements.budget.value = budgets[el.dataset.value];
      f.elements.difficulty.value = el.dataset.value;
      f.querySelectorAll(".difficulty button").forEach((b) =>
        b.classList.toggle("selected", b === el),
      );
    } else if (a === "skip")
      begin({
        name: "Your FC",
        manager: "Manager",
        difficulty: "Medium",
        budget: 100,
      });
    else if (a === "setup-auto") begin(setupDetails(), true);
    else if (a === "auto") {
      active = null;
      update({
        ...save,
        squad: autoSquad(save.squad, availablePlayers(), save.club.budget),
      });
    } else if (a === "clear-pitch") {
      active = null;
      update({ ...save, squad: { ...save.squad, ids: Array(11).fill(null) } });
    } else if (a === "slot") {
      active = Number(el.dataset.slot);
      filters.role = slotRoles(save.squad.formation)[active];
      page = 1;
      mobile = "players";
      render();
    } else if (a === "cancel-slot") {
      active = null;
      filters.role = "ALL";
      render();
    } else if (a === "remove-player") {
      const ids = [...save.squad.ids];
      ids[active] = null;
      update({ ...save, squad: { ...save.squad, ids } });
    } else if (a === "assign") assign(el.dataset.id);
    else if (a === "details") {
      details = allPlayers().find((p) => p.id === el.dataset.id);
      render();
    } else if (a === "close-details") {
      details = null;
      render();
    } else if (
      a === "source-saved" ||
      a === "source-search" ||
      a === "source-live"
    ) {
      source = a.slice(7);
      page = 1;
      render();
    } else if (a === "mobile-pitch" || a === "mobile-players") {
      mobile = a.slice(7);
      render();
    } else if (a === "clear-filters") {
      filters = {
        q: "",
        role: "ALL",
        club: "",
        nation: "",
        rating: 0,
        price: 15,
      };
      page = 1;
      render();
    } else if (a === "previous" || a === "next") {
      page += a === "next" ? 1 : -1;
      render();
    } else if (a === "choose-match") go("/play");
    else if (a === "manage-budget") go("/club");
    else if (a === "back-squad") go("/squad");
    else if (a === "single" || a === "league") {
      mode = a;
      competition = "";
      teamId = "";
      render();
    } else if (a === "play-match") {
      const team = catalog.teams.find((t) => t.id === teamId),
        side = opponent(team, catalog);
      if (!side) throw new Error("Opponent lineup unavailable.");
      launch(userSide(), side);
    } else if (a === "enter-league") {
      const comp = catalog.competitions.find((c) => c.id === competition);
      update({ ...save, league: startLeague(comp, catalog, userSide()) });
    } else if (a === "play-round") nextRound();
    else if (a === "end-season") update({ ...save, league: null });
    else if (a === "toggle-match") {
      paused = !paused;
      render();
      clock();
    } else if (a === "finish-match") {
      paused = true;
      stopClock();
      while (matchSession.minute < 90) matchSession.step();
      render();
    } else if (a === "match-report") completeMatch();
    else if (a === "preset") {
      const values = {
        defend: { tempo: 30, press: 35, line: 30 },
        balanced: { tempo: 50, press: 50, line: 50 },
        attack: { tempo: 80, press: 75, line: 70 },
      };
      matchSession.updateTactics(matchMeta.userIndex, values[el.dataset.value]);
      render();
      notify("Tactical instructions applied from the next minute.");
    } else if (a === "analysis") {
      const m =
        save.matches.find((m) => m.id === selectedMatch) || save.matches[0];
      analysisBusy = true;
      render();
      try {
        analysis = (
          await api("/api/v3/analysis", "POST", {
            names: m.names,
            score: m.score,
            stats: m.stats,
            report: m.report,
          })
        ).report;
      } finally {
        analysisBusy = false;
        render();
      }
    } else if (a === "archive")
      download(await oldArchive(), "efos-previous-save.json");
    else if (a === "export") download(save, "efos-current-game.json");
    else if (a === "retry") await fetchCatalog();
    else if (a === "live-retry") await runLive();
    else if (a === "refresh") await refresh();
    else if (a === "dismiss") el.closest(".toast").remove();
  } catch (error) {
    notify(error.message);
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "setup-form") {
    e.preventDefault();
    begin(setupDetails());
  } else if (e.target.id === "search-form") {
    e.preventDefault();
    filters.q = e.target.querySelector("input").value.trim();
    page = 1;
    if (source === "live") void runLive();
    else {
      source = "search";
      render();
    }
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  try {
    if (el.dataset.filter) {
      filters[el.dataset.filter] = ["price", "rating"].includes(
        el.dataset.filter,
      )
        ? Number(el.value)
        : el.value;
      page = 1;
      render();
    } else if (el.dataset.tactic) {
      const k = el.dataset.tactic;
      if (el.dataset.scope === "match") {
        const s = matchSession.sides[matchMeta.userIndex];
        matchSession.updateTactics(matchMeta.userIndex, {
          ...s.squad.tactics,
          [k]: Number(el.value),
        });
      } else
        update(
          {
            ...save,
            squad: {
              ...save.squad,
              tactics: { ...save.squad.tactics, [k]: Number(el.value) },
            },
          },
          false,
        );
      el.closest("label").querySelector("b").textContent = el.value;
    } else if (el.name === "budget") {
      document.querySelector("#setup-form").elements.difficulty.value =
        "Custom";
      document
        .querySelectorAll(".difficulty button")
        .forEach((b) => b.classList.remove("selected"));
    } else {
      const kind = el.dataset.change;
      if (kind === "formation") {
        active = null;
        update({
          ...save,
          squad: changeFormation(save.squad, el.value, allPlayers()),
        });
      } else if (kind === "competition") {
        competition = el.value;
        teamId = "";
        render();
      } else if (kind === "opponent") {
        teamId = el.value;
        render();
      } else if (kind === "speed") {
        speed = Number(el.value);
        clock();
      } else if (kind === "match-formation") {
        const s = matchSession.sides[matchMeta.userIndex],
          squad = changeFormation(s.squad, el.value, s.players);
        matchSession.updateSquad(matchMeta.userIndex, squad);
        render();
        notify("Formation changed. Positional fit now affects each line.");
      } else if (kind === "result") {
        selectedMatch = el.value;
        analysis = "";
        render();
      }
    }
  } catch (error) {
    notify(error.message);
    render();
  }
});
document.addEventListener("dragstart", (e) => {
  const card = e.target.closest("[data-player]");
  if (card) e.dataTransfer.setData("text/plain", card.dataset.player);
});
document.addEventListener("dragover", (e) => {
  if (e.target.closest("[data-slot]")) e.preventDefault();
});
document.addEventListener("drop", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (slot) {
    e.preventDefault();
    assign(e.dataTransfer.getData("text/plain"), Number(slot.dataset.slot));
  }
});
async function refresh() {
  job = await api("/api/v3/refresh", "POST");
  render();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    try {
      job = await api("/api/v3/refresh");
      if (job.state !== "running") {
        clearInterval(refreshTimer);
        await fetchCatalog();
        notify(job.message);
      } else if (location.pathname === "/club") render();
    } catch {
      clearInterval(refreshTimer);
      notify(
        "Update status unavailable. Your last valid player data remains usable.",
      );
    }
  }, 1500);
}
async function boot() {
  try {
    save = await loadGame();
  } catch (e) {
    storageError = e.message;
  }
  ready = true;
  render();
  void oldArchive().catch(() => {});
  await fetchCatalog();
}
void boot();
