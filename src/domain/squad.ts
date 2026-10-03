import { Player, Save, SaveSchema, Squad, slots, slotId } from "./model";

export const spent = (squad: Squad) =>
  squad.members.reduce((sum, member) => sum + member.paid, 0);
export function squadError(
  squad: Squad,
  players: Player[],
  complete = false,
): string | null {
  if (spent(squad) > squad.budget) return "This squad exceeds its budget.";
  if (complete && squad.members.length !== 11)
    return "Fill all 11 positions before kickoff.";
  if (
    new Set(squad.members.map((m) => m.playerId)).size !==
      squad.members.length ||
    new Set(squad.members.map((m) => m.slot)).size !== squad.members.length
  )
    return "A player or position is used twice.";
  for (const member of squad.members) {
    const index = slots(squad.formation).findIndex(
      (_, i) => slotId(i) === member.slot,
    );
    const p = players.find((p) => p.id === member.playerId);
    if (index < 0 || !p?.role)
      return "A selected player or position is unavailable.";
    if ((p.role === "GK") !== (index === 0))
      return "Goalkeepers must play in goal.";
  }
  return null;
}
export function validateSave(input: unknown): Save {
  const save = SaveSchema.parse(input);
  if (
    !save.squads.some((s) => s.id === save.activeId) ||
    new Set(save.squads.map((s) => s.id)).size !== save.squads.length ||
    new Set(save.players.map((p) => p.id)).size !== save.players.length
  )
    throw new Error("Invalid or duplicate save identities.");
  for (const p of save.players)
    if (p.id !== `${p.provider}:${p.providerId}`)
      throw new Error("Player provider identity is inconsistent.");
  for (const squad of save.squads) {
    const error = squadError(squad, save.players);
    if (error) throw new Error(error);
  }
  if (save.shortlist.some((id) => !save.players.some((p) => p.id === id)))
    throw new Error("Shortlist references a missing player.");
  return save;
}
export function assign(
  squad: Squad,
  player: Player,
  index: number,
  players: Player[],
): Squad {
  const members = squad.members.filter(
    (m) => m.slot !== slotId(index) && m.playerId !== player.id,
  );
  const previous = squad.members.find((m) => m.playerId === player.id);
  const next = {
    ...squad,
    members: [
      ...members,
      {
        slot: slotId(index),
        playerId: player.id,
        paid: previous?.paid ?? player.game.cost,
      },
    ],
  };
  const error = squadError(next, [
    ...players.filter((p) => p.id !== player.id),
    player,
  ]);
  if (error) throw new Error(error);
  return next;
}
export function changeFormation(
  squad: Squad,
  formation: Squad["formation"],
  players: Player[],
): Squad {
  const remaining = [...squad.members];
  const members: Squad["members"] = [];
  slots(formation).forEach((role, index) => {
    const candidate = remaining.findIndex(
      (m) => players.find((p) => p.id === m.playerId)?.role === role,
    );
    if (candidate >= 0)
      members.push({
        ...remaining.splice(candidate, 1)[0],
        slot: slotId(index),
      });
  });
  slots(formation).forEach((role, index) => {
    if (!members.some((m) => m.slot === slotId(index))) {
      const candidate = remaining.findIndex(
        (m) =>
          (players.find((p) => p.id === m.playerId)?.role === "GK") ===
          (role === "GK"),
      );
      if (candidate >= 0)
        members.push({
          ...remaining.splice(candidate, 1)[0],
          slot: slotId(index),
        });
    }
  });
  return { ...squad, formation, members };
}
export function autofill(squad: Squad, players: Player[]): Squad {
  let next = structuredClone(squad);
  const missing = slots(next.formation)
    .map((role, i) => ({ role, i }))
    .filter((s) => !next.members.some((m) => m.slot === slotId(s.i)));
  // Cheapest valid completion first: guarantees feasibility without a greedy star purchase.
  for (const { role, i } of missing) {
    const available = players
      .filter(
        (p) =>
          p.role === role && !next.members.some((m) => m.playerId === p.id),
      )
      .sort(
        (a, b) =>
          a.game.cost - b.game.cost ||
          b.game.overall - a.game.overall ||
          a.id.localeCompare(b.id),
      );
    if (!available.length)
      throw new Error(`Discover more ${role} players to complete this squad.`);
    next = assign(next, available[0], i, players);
  }
  // Spend only remaining credits on same-role improvements in newly filled slots.
  for (const { role, i } of missing) {
    const current = next.members.find((m) => m.slot === slotId(i))!;
    const old = players.find((p) => p.id === current.playerId)!;
    const better = players
      .filter(
        (p) =>
          p.role === role &&
          p.game.overall > old.game.overall &&
          !next.members.some((m) => m.playerId === p.id) &&
          spent(next) - current.paid + p.game.cost <= next.budget,
      )
      .sort(
        (a, b) => b.game.overall - a.game.overall || a.game.cost - b.game.cost,
      )[0];
    if (better) next = assign(next, better, i, players);
  }
  return next;
}
export function chemistry(squad: Squad, players: Player[]) {
  if (!squad.members.length) return 0;
  const fit = squad.members.reduce(
    (sum, m) =>
      sum +
      (players.find((p) => p.id === m.playerId)?.role ===
      slots(squad.formation)[Number(m.slot.slice(5))]
        ? 1
        : 0.65),
    0,
  );
  return Math.round((fit / 11) * 100);
}
