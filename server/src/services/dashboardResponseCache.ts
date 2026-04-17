import { mockTspComparisonResponse } from '../data/mockTspComparison.js'

type DashboardPayload = typeof mockTspComparisonResponse

type CacheEntry = {
  payload: DashboardPayload
  builtAt: number
}

let cache: CacheEntry | null = null

/**
 * In-memory TTL cache for the assembled dashboard JSON (Influx + mock merge or full mock).
 * Set `DASHBOARD_CACHE_TTL_MS=0` to disable caching.
 */
export function getDashboardCacheTtlMs(): number {
  const raw = process.env.DASHBOARD_CACHE_TTL_MS?.trim()
  if (!raw) {
    return 60_000
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 60_000
}

function clonePayload(p: DashboardPayload): DashboardPayload {
  return JSON.parse(JSON.stringify(p)) as DashboardPayload
}

/**
 * Returns the result of `build()`, using a cached copy when fresh.
 */
export async function withDashboardResponseCache(
  build: () => Promise<DashboardPayload>,
): Promise<DashboardPayload> {
  const ttlMs = getDashboardCacheTtlMs()
  const now = Date.now()

  if (ttlMs === 0) {
    console.log('[dashboard/cache] disabled (DASHBOARD_CACHE_TTL_MS=0)')
    return build()
  }

  if (cache && now - cache.builtAt < ttlMs) {
    const ageMs = now - cache.builtAt
    const expiresInMs = ttlMs - ageMs
    console.log(
      `[dashboard/cache] hit ageMs=${ageMs} ttlMs=${ttlMs} expiresInMs=${expiresInMs}`,
    )
    return clonePayload(cache.payload)
  }

  const reason = cache ? 'expired' : 'empty'
  console.log(`[dashboard/cache] miss ttlMs=${ttlMs} reason=${reason}`)

  const fresh = await build()
  cache = { payload: clonePayload(fresh), builtAt: Date.now() }

  console.log(`[dashboard/cache] store ttlMs=${ttlMs}`)
  return clonePayload(cache.payload)
}
