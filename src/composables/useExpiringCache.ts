export interface CacheItem<T> {
  result: T;
  timestamp: number;
}

export function getCachedValue<T>(
  cache: Map<string, CacheItem<T>>,
  key: string,
  ttlMs: number
): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.result;
  }
  return null;
}

export function setCachedValue<T>(
  cache: Map<string, CacheItem<T>>,
  key: string,
  value: T,
  maxSize: number
): void {
  cache.set(key, { result: value, timestamp: Date.now() });
  if (cache.size > maxSize) {
    const oldestKey = Array.from(cache.keys())[0];
    cache.delete(oldestKey);
  }
}

export function cleanExpiredCache<T>(
  cache: Map<string, CacheItem<T>>,
  ttlMs: number
): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > ttlMs) {
      cache.delete(key);
    }
  }
}
