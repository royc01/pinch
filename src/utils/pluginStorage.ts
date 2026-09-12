export function isMissingPluginStorageValue(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim().length === 0);
}

/**
 * Pinch mounts several independent surfaces during application startup. They
 * commonly read the same small JSON file at once, so share a short-lived
 * snapshot instead of issuing one file request per surface. Writes and the
 * plugin data-change hook explicitly invalidate this cache.
 */
const PLUGIN_STORAGE_READ_CACHE_TTL_MS = 3_000;

type PluginStorageCacheEntry = {
  value: unknown;
  expiresAt: number;
};

const pluginStorageReadCache = new Map<string, PluginStorageCacheEntry>();
const pluginStorageReadInFlight = new Map<string, Promise<unknown>>();
let pluginStorageReadGeneration = 0;

function clonePluginStorageValue<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return value;
    }
  }
}

function getCachedPluginStorageValue<T>(storageKey: string, now: number): T | undefined {
  const entry = pluginStorageReadCache.get(storageKey);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    pluginStorageReadCache.delete(storageKey);
    return undefined;
  }
  return clonePluginStorageValue(entry.value) as T;
}

/**
 * Reads JSON-style plugin data with in-flight coalescing and a tiny cache.
 * `force` is for mutation preflight reads, which must always observe storage.
 */
export async function readPluginStorageData<T>(
  storageKey: string,
  read: () => Promise<T>,
  options: { force?: boolean } = {}
): Promise<T> {
  const force = options.force === true;
  if (!force) {
    const cached = getCachedPluginStorageValue<T>(storageKey, Date.now());
    if (cached !== undefined || pluginStorageReadCache.has(storageKey)) {
      return cached as T;
    }

    const inFlight = pluginStorageReadInFlight.get(storageKey);
    if (inFlight) {
      return clonePluginStorageValue(await inFlight) as T;
    }
  }

  const generation = pluginStorageReadGeneration;
  const readPromise = read().then((value) => {
    if (generation === pluginStorageReadGeneration) {
      pluginStorageReadCache.set(storageKey, {
        value: clonePluginStorageValue(value),
        expiresAt: Date.now() + PLUGIN_STORAGE_READ_CACHE_TTL_MS
      });
    }
    return value;
  });

  if (!force) {
    pluginStorageReadInFlight.set(storageKey, readPromise);
    void readPromise.then(
      () => {
        if (pluginStorageReadInFlight.get(storageKey) === readPromise) {
          pluginStorageReadInFlight.delete(storageKey);
        }
      },
      () => {
        if (pluginStorageReadInFlight.get(storageKey) === readPromise) {
          pluginStorageReadInFlight.delete(storageKey);
        }
      }
    );
  }

  return clonePluginStorageValue(await readPromise);
}

/** Invalidate one or all startup snapshots after plugin storage changes. */
export function invalidatePluginStorageReadCache(storageKeys?: Iterable<string>): void {
  pluginStorageReadGeneration += 1;
  if (!storageKeys) {
    pluginStorageReadCache.clear();
    pluginStorageReadInFlight.clear();
    return;
  }

  for (const storageKey of storageKeys) {
    pluginStorageReadCache.delete(storageKey);
    pluginStorageReadInFlight.delete(storageKey);
  }
}

/** Seed the short-lived snapshot after this frontend has successfully written it. */
export function updatePluginStorageReadCache(storageKey: string, value: unknown): void {
  invalidatePluginStorageReadCache([storageKey]);
  pluginStorageReadCache.set(storageKey, {
    value: clonePluginStorageValue(value),
    expiresAt: Date.now() + PLUGIN_STORAGE_READ_CACHE_TTL_MS
  });
}

/** Returns true for the expected storage rejection during plugin unload/reload. */
export function isPluginLifecycleEndedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const detail = error as { code?: unknown; msg?: unknown; message?: unknown };
  return detail.code === 410
    && /plugin lifecycle has ended/i.test(String(detail.msg ?? detail.message ?? ''));
}
