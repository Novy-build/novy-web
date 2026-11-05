/**
 * Minimal storage contract so repositories stay testable and decoupled from
 * the browser. `window.localStorage` satisfies this structurally.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readJson<T>(storage: StorageLike, key: string): T | null {
  const raw = storage.getItem(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted entries are treated as absent rather than crashing the app.
    console.warn(`[novy] disregarding corrupted storage entry: ${key}`);
    return null;
  }
}

export function writeJson<T>(storage: StorageLike, key: string, value: T): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`[novy] could not persist storage entry: ${key}`);
  }
}

export function removeKey(storage: StorageLike, key: string): void {
  storage.removeItem(key);
}

/** Simulated network latency shared by the local (fake-latency) repositories. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

