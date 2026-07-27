/**
 * A localStorage-backed external store for `useSyncExternalStore`.
 *
 * Hydrating persisted state with `useState` + `useEffect` means a setState
 * during the first commit, which React now flags as a cascading render — and
 * it also renders one frame of wrong content. Reading through an external
 * store instead gives the server a defined snapshot and the client the real
 * value on its first paint.
 *
 * The `storage` event subscription is a genuine bonus here: two tabs of the
 * customer app stay in step with each other, which is the shape of the whole
 * demo.
 */
export type PersistentStore<T> = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (value: T) => void;
};

export function createPersistentStore<T>(
  key: string,
  fallback: T
): PersistentStore<T> {
  const listeners = new Set<() => void>();

  // getSnapshot must return a stable reference for unchanged state, or React
  // re-renders forever. Cache against the raw string we last parsed.
  let lastRaw: string | null = null;
  let cached: T = fallback;

  function read(): T {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === lastRaw) return cached;
    lastRaw = raw;
    try {
      cached = raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      cached = fallback;
    }
    return cached;
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => fallback,
    set(value) {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(key, raw);
      lastRaw = raw;
      cached = value;
      // `storage` does not fire in the tab that wrote, so notify directly.
      listeners.forEach((l) => l());
    },
  };
}
