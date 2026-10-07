import { openDB } from "idb";
import { freshSave } from "./types.js";
import { saveSchema } from "./validation.js";
let revision = 0;
const database = () =>
  openDB("efos-rebuilt", 1, {
    upgrade(db) {
      db.createObjectStore("game");
      db.createObjectStore("archive");
    },
  });
async function loadGame() {
  const db = await database();
  try {
    const saved = await db.get("game", "active");
    revision = saved?._revision || 0;
    if (!saved) return freshSave();
    const checked = saveSchema.safeParse(saved);
    if (checked.success) return checked.data;
    await db.put("archive", saved, `unreadable-${Date.now()}`);
    throw new Error("Saved data could not be read. It has been archived.");
  } finally {
    db.close();
  }
}
async function saveGame(save) {
  const checked = saveSchema.parse(save),
    db = await database();
  try {
    const tx = db.transaction("game", "readwrite");
    const current = await tx.store.get("active");
    if ((current?._revision || 0) !== revision) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error("Another tab changed this game. Reload to continue.");
    }
    await tx.store.put({ ...checked, _revision: revision + 1 }, "active");
    await tx.done;
    revision++;
  } finally {
    db.close();
  }
}
async function oldArchive() {
  const db = await database();
  try {
    const existing = await db.get("archive", "legacy");
    if (existing) return existing;
    let legacy = null;
    const names = await indexedDB.databases();
    if (names.some((d) => d.name === "efos-console")) {
      const old = await openDB("efos-console");
      try {
        if (old.objectStoreNames.contains("saves"))
          legacy = await old.get("saves", "active");
      } finally {
        old.close();
      }
    }
    const local = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (/efos|drafted_players|custom_scouted_players/i.test(key))
        local[key] = localStorage.getItem(key);
    }
    const archive = {
      exportedAt: /* @__PURE__ */ new Date().toISOString(),
      legacy,
      local,
    };
    await db.put("archive", archive, "legacy");
    return archive;
  } finally {
    db.close();
  }
}
function download(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
export { download, loadGame, oldArchive, saveGame };
