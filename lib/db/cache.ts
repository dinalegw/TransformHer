const cache = new Map<string, { value: unknown; expiry: number }>()

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return undefined
  }
  return entry.value as T
}

export function setCache<T>(key: string, value: T, ttlMs = 60_000): void {
  cache.set(key, { value, expiry: Date.now() + ttlMs })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key)
    }
  }
}

export function cacheWrapper<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 60_000,
): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== undefined) return Promise.resolve(cached)
  return fn().then((result) => {
    setCache(key, result, ttlMs)
    return result
  })
}
