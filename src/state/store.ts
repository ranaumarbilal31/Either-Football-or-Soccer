import { create } from "zustand";
import {
  blankSquad,
  freshSave,
  Match,
  Player,
  Save,
  Squad,
  slots,
} from "../domain/model";
import {
  assign,
  autofill,
  changeFormation,
  squadError,
  validateSave,
} from "../domain/squad";
import { loadSave, migrateLegacy, persistSave } from "./persistence";

type Store = {
  save: Save;
  ready: boolean;
  saveStatus: string;
  message: string;
  conflict: boolean;
  undoStack: Save[];
  hydrate: () => Promise<void>;
  commit: (update: (save: Save) => void, undo?: boolean) => boolean;
  remember: (players: Player[]) => void;
  updateSquad: (update: (s: Squad) => Squad) => boolean;
  draft: (player: Player, index?: number) => boolean;
  fill: () => void;
  formation: (value: Squad["formation"]) => void;
  undo: () => void;
  notify: (text: string) => void;
  record: (match: Match) => void;
  importSave: (save: Save) => void;
};
let queue = Promise.resolve();
let hydrated: Promise<void> | null = null;
let diskRevision = 0;
let blocked = false;
function enqueue(save: Save) {
  queue = queue.then(async () => {
    if (blocked) return;
    try {
      await persistSave(save, diskRevision);
      diskRevision = save.revision;
      if (useGame.getState().save.revision === save.revision)
        useGame.setState({ saveStatus: "Saved on this device" });
    } catch (error) {
      blocked = true;
      useGame.setState({
        saveStatus: "Save paused — export a backup, then reload",
        conflict: true,
        message:
          error instanceof Error
            ? error.message
            : "Storage is unavailable. Export your work to keep it.",
      });
    }
  });
}
export const useGame = create<Store>((set, get) => ({
  save: freshSave(),
  ready: false,
  saveStatus: "Opening your club…",
  message: "",
  conflict: false,
  undoStack: [],
  hydrate: () => {
    if (hydrated) return hydrated;
    hydrated = (async () => {
      try {
        let save = await loadSave();
        if (!save) {
          try {
            save = migrateLegacy(localStorage);
          } catch {
            save = freshSave();
          }
          await persistSave(save, 0);
        }
        diskRevision = save.revision;
        set({ save, ready: true, saveStatus: "Saved on this device" });
      } catch {
        blocked = true;
        let save: Save;
        try {
          save = migrateLegacy(localStorage);
        } catch {
          save = freshSave();
        }
        set({
          save,
          ready: true,
          conflict: true,
          saveStatus: "Storage unavailable — export to keep your work",
          message:
            "Your browser could not open saved data. Existing data has not been erased.",
        });
      }
    })();
    return hydrated;
  },
  commit: (update, undo = true) => {
    const previous = get().save;
    const next = structuredClone(previous);
    try {
      update(next);
      next.revision = previous.revision + 1;
      validateSave(next);
      set({
        save: next,
        saveStatus: blocked ? get().saveStatus : "Saving…",
        undoStack: undo
          ? [...get().undoStack.slice(-9), previous]
          : get().undoStack,
      });
      enqueue(next);
      return true;
    } catch (error) {
      set({
        message:
          error instanceof Error
            ? error.message
            : "That change could not be applied.",
      });
      return false;
    }
  },
  remember: (players) => {
    const current = get().save;
    const changes = players.filter((p) => {
      const old = current.players.find((v) => v.id === p.id);
      return !old || Date.parse(p.fetchedAt) > Date.parse(old.fetchedAt);
    });
    if (!changes.length) return;
    get().commit((save) => {
      for (const p of changes) {
        const index = save.players.findIndex((v) => v.id === p.id);
        if (index < 0) {
          if (save.players.length < 2000) save.players.push(p);
        } else {
          const old = save.players[index];
          save.players[index] = {
            ...p,
            role: p.role ?? old.role,
            club: p.club ?? old.club,
            nationality: p.nationality ?? old.nationality,
            image: p.image ?? old.image,
          };
        }
      }
    }, false);
  },
  updateSquad: (update) =>
    get().commit((save) => {
      const index = save.squads.findIndex((s) => s.id === save.activeId);
      save.squads[index] = update(save.squads[index]);
    }),
  draft: (player, index) =>
    get().commit((save) => {
      let s = save.squads.find((s) => s.id === save.activeId)!;
      if (!save.players.some((p) => p.id === player.id))
        save.players.push(player);
      if (index === undefined) {
        const available = slots(s.formation);
        index = available.findIndex(
          (r, i) =>
            r === player.role && !s.members.some((m) => m.slot === `slot-${i}`),
        );
        if (index < 0)
          throw new Error(
            "Choose a position on the Squad screen to replace a player.",
          );
      }
      save.squads[save.squads.findIndex((v) => v.id === s.id)] = assign(
        s,
        player,
        index,
        save.players,
      );
    }),
  fill: () => get().updateSquad((s) => autofill(s, get().save.players)),
  formation: (value) =>
    get().updateSquad((s) => changeFormation(s, value, get().save.players)),
  undo: () => {
    const stack = get().undoStack;
    if (!stack.length) return;
    const snapshot = stack[stack.length - 1];
    const ok = get().commit((save) => {
      Object.assign(save, structuredClone(snapshot));
    }, false);
    if (ok)
      set({ undoStack: stack.slice(0, -1), message: "Last change undone." });
  },
  notify: (message) => set({ message }),
  record: (match) => {
    if (get().save.matches.some((m) => m.id === match.id)) return;
    get().commit((save) => {
      save.matches = [match, ...save.matches].slice(0, 50);
    }, false);
  },
  importSave: (save) => {
    get().commit((current) => {
      Object.assign(current, validateSave(save));
    });
  },
}));
export const activeSquad = (save: Save) =>
  save.squads.find((s) => s.id === save.activeId)!;
export function createSquad() {
  useGame.getState().commit((save) => {
    const squad = blankSquad();
    save.squads.push(squad);
    save.activeId = squad.id;
  });
}
export function readyToPlay() {
  const s = useGame.getState().save;
  return !squadError(activeSquad(s), s.players, true);
}
