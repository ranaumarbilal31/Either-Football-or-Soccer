import { slotRoles, roles } from "./types.js";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const weights = {
  GK: [0.7, 0.3, 0],
  DEF: [0.6, 0.3, 0.1],
  MID: [0.2, 0.55, 0.25],
  FWD: [0.1, 0.25, 0.65],
};
function ratePlayers(input) {
  const groups = /* @__PURE__ */ new Map();
  for (const p of input) {
    const key = p.role + ":" + p.league;
    groups.set(key, [...(groups.get(key) || []), p]);
  }
  return input.map((p) => {
    const peers = groups.get(p.role + ":" + p.league);
    let total = 0,
      weight = 0;
    ["prevention", "distribution", "attack"].forEach((key, i) => {
      const value2 = p.metrics[key];
      if (value2 === void 0 || !Number.isFinite(value2) || !weights[p.role][i])
        return;
      const pool = peers
        .map((x) => x.metrics[key])
        .filter((x) => x !== void 0 && Number.isFinite(x));
      if (pool.length < 3) return;
      const percentile =
        (pool.filter((x) => x < value2).length +
          0.5 * pool.filter((x) => x === value2).length) /
        pool.length;
      const shrink = p.minutes / (p.minutes + 900);
      total += (0.5 + (percentile - 0.5) * shrink) * weights[p.role][i];
      weight += weights[p.role][i];
    });
    const estimated = weight === 0;
    const baseline = estimated
      ? clamp(4 + 5 * clamp((p.teamStrength - 30) / 65, 0, 1), 4, 9)
      : 4 + (5 * total) / weight;
    const apps = [...p.appearances]
      .filter((a) => a.minutes > 0 && a.grade >= 0 && a.grade <= 10)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    const denominator = apps.reduce((n, _, i) => n + 5 - i, 0);
    const form = apps.length
      ? apps.reduce((n, a, i) => n + a.grade * (5 - i), 0) / denominator
      : null;
    const fw = (0.25 * apps.length) / 5;
    const rating =
      Math.round(
        clamp(baseline * (1 - fw) + (form ?? baseline) * fw, 1, 10) * 10,
      ) / 10;
    const confidence = estimated
      ? 0.15
      : clamp(p.minutes / (p.minutes + 900), 0.2, 1);
    const value = rating * 10;
    const attributes = {
      attack: value * (p.role === "FWD" ? 1 : p.role === "MID" ? 0.84 : 0.5),
      defense: value * (p.role === "DEF" ? 1 : p.role === "MID" ? 0.75 : 0.4),
      passing: value * (p.role === "MID" ? 1 : 0.85),
      keeping: p.role === "GK" ? value : 10,
      stamina: clamp(65 + p.minutes / 100, 65, 90),
    };
    return {
      ...p,
      appearances: apps,
      baseline,
      form,
      estimated,
      rating,
      confidence,
      price: Math.round(clamp(3 + 0.22 * (rating - 3) ** 2, 3, 15) * 2) / 2,
      attributes,
    };
  });
}
const ranked = (players) =>
  [...players].sort(
    (a, b) =>
      b.rating - a.rating ||
      b.confidence - a.confidence ||
      a.id.localeCompare(b.id),
  );
const shortlist = (players) =>
  roles.flatMap((r) =>
    ranked(players.filter((p) => p.role === r))
      .slice(0, 15)
      .map((p) => p.id),
  );
function fit(p, role) {
  if (p.role === role) return 1;
  if (p.role === "GK" || role === "GK") return 0;
  if (p.secondary.includes(role)) return 0.9;
  return (p.role === "DEF" && role === "FWD") ||
    (p.role === "FWD" && role === "DEF")
    ? 0.45
    : 0.7;
}
function positions(formation) {
  const slots = slotRoles(formation);
  return slots.map((role, i) => {
    const line = slots
      .map((r, j) => (r === role ? j : -1))
      .filter((j) => j >= 0);
    return {
      x: ((line.indexOf(i) + 1) * 100) / (line.length + 1),
      y: role === "GK" ? 88 : role === "DEF" ? 68 : role === "MID" ? 43 : 18,
    };
  });
}
function edges(formation) {
  const pos = positions(formation),
    r = slotRoles(formation);
  const out = [];
  for (let i = 0; i < 11; i++)
    for (let j = i + 1; j < 11; j++) {
      if (r[i] === r[j] && j === i + 1) out.push([i, j]);
      else if (
        Math.abs(pos[i].y - pos[j].y) <= 26 &&
        r[i] !== r[j] &&
        Math.abs(pos[i].x - pos[j].x) <= 30
      )
        out.push([i, j]);
    }
  return out;
}
function metrics(squad, players) {
  const map = new Map(players.map((p) => [p.id, p])),
    slots = slotRoles(squad.formation),
    selected = squad.ids.map((id) => (id ? map.get(id) : void 0));
  const fits = selected.map((p, i) => (p ? fit(p, slots[i]) : 0));
  const links = edges(squad.formation).map(([a, b]) => {
    const p = selected[a],
      q = selected[b];
    const sameClub = !!p?.clubId && p.clubId === q?.clubId,
      sameLeague = !!p?.league && p.league === q?.league,
      sameNation = !!p?.nationality && p.nationality === q?.nationality;
    const score =
      p && q
        ? Math.round(
            Math.min(
              100,
              20 +
                45 * Number(sameClub) +
                20 * Number(sameLeague) +
                15 * Number(sameNation),
            ) *
              fits[a] *
              fits[b],
          )
        : 0;
    return {
      a,
      b,
      score,
      color:
        score >= 80
          ? "green"
          : score >= 60
            ? "yellow"
            : score >= 40
              ? "orange"
              : "red",
      reason:
        !p || !q
          ? "Empty position"
          : [
              sameClub ? "same club" : "different clubs",
              sameLeague ? "same league" : "different leagues",
              sameNation ? "same nationality" : "different nationalities",
            ].join(", "),
    };
  });
  const positionalFit = fits.reduce((a, b) => a + b, 0) / 11;
  const chemistry =
    0.6 * (links.reduce((n, l) => n + l.score, 0) / Math.max(1, links.length)) +
    0.4 * positionalFit * 100;
  const quality = selected.reduce((n, p) => n + (p?.rating || 0) * 10, 0) / 11;
  return {
    quality,
    chemistry,
    positionalFit,
    strength: quality * positionalFit * (0.65 + (0.35 * chemistry) / 100),
    links,
    cost: selected.reduce((n, p) => n + (p?.price || 0), 0),
    count: selected.filter(Boolean).length,
  };
}
function squadError(s, players, budget = Infinity) {
  const byId = new Map(players.map((p) => [p.id, p]));
  if (s.ids.length !== 11 || s.ids.some((id) => !id || !byId.has(id)))
    return "Choose eleven players before playing.";
  if (new Set(s.ids).size !== 11)
    return "Each player can only be selected once.";
  if (s.ids.some((id, i) => fit(byId.get(id), slotRoles(s.formation)[i]) === 0))
    return "Goalkeepers must stay in the goalkeeper position.";
  if (metrics(s, players).cost > budget)
    return "Your squad is over budget. Adjust your players before playing.";
  return "";
}
function autoSquad(s, players, budget) {
  const ordered = ranked(players);
  const slots = slotRoles(s.formation);
  const chosen = [];
  for (const role of slots) {
    const candidates = ordered
      .filter((p) => p.role === role && !chosen.some((c) => c.id === p.id))
      .sort(
        (a, b) =>
          a.price - b.price || b.rating - a.rating || a.id.localeCompare(b.id),
      );
    if (!candidates.length)
      throw new Error(
        "Not enough players in every position. Refresh the catalog.",
      );
    chosen.push(candidates[0]);
  }
  if (chosen.reduce((n, p) => n + p.price, 0) > budget)
    throw new Error(
      "No complete squad fits this budget. Increase it or refresh the catalog.",
    );
  for (let pass = 0; pass < 3; pass++)
    for (let i = 0; i < 11; i++) {
      let best = chosen[i],
        bestScore = metrics(
          { ...s, ids: chosen.map((p) => p.id) },
          chosen,
        ).strength;
      for (const p of ordered.filter(
        (p2) => p2.role === slots[i] && !chosen.some((c) => c.id === p2.id),
      )) {
        if (
          chosen.reduce((n, c) => n + c.price, 0) - chosen[i].price + p.price >
          budget
        )
          continue;
        const candidate = [...chosen];
        candidate[i] = p;
        const score = metrics(
          { ...s, ids: candidate.map((c) => c.id) },
          candidate,
        ).strength;
        if (score > bestScore + 1e-3) {
          best = p;
          bestScore = score;
        }
      }
      chosen[i] = best;
    }
  return { ...s, ids: chosen.map((p) => p.id) };
}
function changeFormation(s, formation, players) {
  const available = s.ids.filter((id) => !!id);
  const ids = slotRoles(formation).map((role) => {
    const i = available.findIndex(
      (id) => players.find((p) => p.id === id)?.role === role,
    );
    return i < 0 ? null : available.splice(i, 1)[0];
  });
  ids.forEach((id, i) => {
    if (!id && i > 0) {
      const j = available.findIndex(
        (id2) => players.find((p) => p.id === id2)?.role !== "GK",
      );
      if (j >= 0) ids[i] = available.splice(j, 1)[0];
    }
  });
  return { ...s, formation, ids };
}
export {
  autoSquad,
  changeFormation,
  clamp,
  fit,
  metrics,
  positions,
  ranked,
  ratePlayers,
  shortlist,
  squadError,
};
