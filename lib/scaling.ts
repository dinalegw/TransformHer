import 'server-only'

/**
 * TransformHer scaling policy.
 *
 * Request distribution is intentionally delegated to Vercel's Function Router.
 * Application instances remain stateless so any healthy instance can serve the
 * next request. Do not introduce in-process session affinity or user-to-instance
 * maps here; that would reduce fault tolerance and defeat horizontal scaling.
 */
export const SCALING_POLICY = Object.freeze({
  trafficDistribution: 'platform-resource-aware',
  sessionMode: 'stateless-signed-cookie',
  stickySessionsRequired: false,
  sharedRateLimitStore: 'postgres',
  databasePoolStrategy: 'pooled-endpoint-preferred',
})

export type DatabaseConnectionSource =
  | 'POSTGRES_URL'
  | 'DATABASE_URL'
  | 'POSTGRES_URL_NON_POOLING'
  | 'DATABASE_URL_UNPOOLED'
  | 'none'

export function getDatabaseConnection(): {
  url: string | null
  source: DatabaseConnectionSource
  pooledPreferred: boolean
} {
  const candidates: Array<{
    source: Exclude<DatabaseConnectionSource, 'none'>
    url: string | undefined
    pooledPreferred: boolean
  }> = [
    // Prefer pooler-compatible URLs first. Under horizontal scaling this keeps
    // a burst of new function instances from opening direct database sessions.
    { source: 'POSTGRES_URL', url: process.env.POSTGRES_URL, pooledPreferred: true },
    { source: 'DATABASE_URL', url: process.env.DATABASE_URL, pooledPreferred: true },
    // Direct/unpooled URLs are compatibility fallbacks only.
    { source: 'POSTGRES_URL_NON_POOLING', url: process.env.POSTGRES_URL_NON_POOLING, pooledPreferred: false },
    { source: 'DATABASE_URL_UNPOOLED', url: process.env.DATABASE_URL_UNPOOLED, pooledPreferred: false },
  ]

  for (const candidate of candidates) {
    const value = candidate.url?.trim()
    if (value) {
      return {
        url: value,
        source: candidate.source,
        pooledPreferred: candidate.pooledPreferred,
      }
    }
  }

  return { url: null, source: 'none', pooledPreferred: false }
}

export function getDbPoolMaxPerInstance(): number {
  const raw = Number.parseInt(process.env.DB_POOL_MAX_PER_INSTANCE || '2', 10)
  if (!Number.isFinite(raw)) return 2

  // A small per-instance cap is deliberate. Vercel can add instances rapidly;
  // the shared Neon pooler should absorb global fan-out instead of each warm
  // process creating a large local pool.
  return Math.min(4, Math.max(1, raw))
}
