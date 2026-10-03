import { openDB } from "idb";
import {
  freshSave,
  gameAttributes,
  Player,
  RoleSchema,
  Save,
  FormationSchema,
  TacticsSchema,
  slots,
} from "../domain/model";
import { validateSave } from "../domain/squad";

const database = () =>
  openDB("efos-console", 1, {
    upgrade(db) {
      db.createObjectStore("saves");
    },
  });
export async function loadSave(): Promise<Save | null> {
  const db = await database();
  try {
    const value = await db.get("saves", "active");
    return value ? validateSave(value) : null;
  } finally {
    db.close();
  }
}
export async function persistSave(
  save: Save,
  expectedRevision: number,
): Promise<void> {
  const checked = validateSave(save);
  const db = await database();
  try {
    const tx = db.transaction("saves", "readwrite");
    const current = await tx.store.get("active");
    if (current && current.revision !== expectedRevision) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error(
        "Another tab changed this save. Export your work, then reload to use the latest version.",
      );
    }
    await tx.store.put(checked, "active");
    await tx.done;
  } finally {
    db.close();
  }
}
export function migrateLegacy(storage: Pick<Storage, "getItem">): Save {
  const save = freshSave();
  const read = (key: string) => {
    try {
      return JSON.parse(storage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const rawDraft = read("drafted_players");
  const custom = read("custom_scouted_players");
  const raw = [
    ...(Array.isArray(rawDraft) ? rawDraft : []),
    ...(Array.isArray(custom) ? custom : []),
  ].slice(0, 2000);
  const mapping = new Map<string, string>();
  for (const p of raw) {
    if (
      !p ||
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 160
    )
      continue;
    const role = RoleSchema.safeParse(p.position);
    if (!role.success) continue;
    const id = `legacy:${p.id}`;
    if (save.players.some((x) => x.id === id)) continue;
    const game = gameAttributes(role.data);
    game.basis = "legacy";
    const legacy: Player = {
      id,
      provider: "legacy",
      providerId: p.id,
      name: p.name,
      role: role.data,
      club:
        typeof p.club === "string" && p.club.length <= 160 && p.club.trim()
          ? p.club
          : null,
      nationality:
        typeof p.nationality === "string" &&
        p.nationality.length <= 160 &&
        p.nationality.trim()
          ? p.nationality
          : null,
      image: null,
      fetchedAt: new Date(0).toISOString(),
      game,
    };
    save.players.push(legacy);
    mapping.set(p.id, id);
  }
  const squad = save.squads[0];
  const formation = FormationSchema.safeParse(read("squad_tactics")?.formation);
  if (formation.success) squad.formation = formation.data;
  const old = read("squad_tactics");
  const tactics = TacticsSchema.safeParse({
    tempo: old?.tempo,
    press: old?.pressingIntensity,
    line: old?.defensiveLine,
  });
  if (tactics.success) squad.tactics = tactics.data;
  const budget = read("budget_limit");
  if (Number.isInteger(budget) && budget >= 500 && budget <= 5000)
    squad.budget = budget;
  // Natural roles recover old assignments safely; unmapped records remain in the player library.
  const roles = slots(squad.formation);
  const oldAssignments = read("slot_assignments");
  const assignedIds = new Map<string, number>();
  if (
    oldAssignments &&
    typeof oldAssignments === "object" &&
    !Array.isArray(oldAssignments)
  ) {
    const counters: Record<string, number> = {};
    roles.forEach((role, index) => {
      counters[role] = (counters[role] || 0) + 1;
      const id = oldAssignments[`${role.toLowerCase()}-${counters[role]}`];
      if (typeof id === "string" && !assignedIds.has(id))
        assignedIds.set(id, index);
    });
  }
  for (const p of Array.isArray(rawDraft) ? rawDraft : []) {
    const id = mapping.get(p?.id);
    const player = save.players.find((x) => x.id === id);
    if (!player || squad.members.some((m) => m.playerId === id)) continue;
    const preferred = assignedIds.get(p.id);
    const index =
      preferred !== undefined &&
      (roles[preferred] === "GK") === (player.role === "GK") &&
      !squad.members.some((m) => m.slot === `slot-${preferred}`)
        ? preferred
        : roles.findIndex(
            (r, i) =>
              r === player.role &&
              !squad.members.some((m) => m.slot === `slot-${i}`),
          );
    const paid =
      Number.isInteger(p.price) && p.price > 0 && p.price <= 1000
        ? p.price
        : player.game.cost;
    if (
      index >= 0 &&
      squad.members.reduce((n, m) => n + m.paid, 0) + paid <= squad.budget
    )
      squad.members.push({ slot: `slot-${index}`, playerId: player.id, paid });
  }
  return validateSave(save);
}
export function parseImport(text: string): Save {
  if (new TextEncoder().encode(text).length > 8_000_000)
    throw new Error("Save files must be smaller than 8 MB.");
  return validateSave(JSON.parse(text));
}
