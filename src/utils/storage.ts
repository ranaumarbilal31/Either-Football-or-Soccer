export function readStored<T>(key: string, fallback: T, validate: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw === null ? null : JSON.parse(raw);
    return validate(value) ? value as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Storage may be disabled or full; the current session still works. */ }
}
