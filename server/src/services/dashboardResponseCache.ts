import { mockTspComparisonResponse } from '../data/mockTspComparison.js'

type DashboardPayload = typeof mockTspComparisonResponse

type CacheEntry = {
  payload: DashboardPayload
  builtAt: number
}

let cache: CacheEntry | null = null
let refreshPromise: Promise<void> | null = null

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

  const startRefresh = (): void => {
    if (refreshPromise) {
      return
    }
    const refreshStartedAt = Date.now()
    console.log('[dashboard/cache] refresh start')
    refreshPromise = build()
      .then((fresh) => {
        cache = { payload: clonePayload(fresh), builtAt: Date.now() }
        console.log(
          `[dashboard/cache] refresh ok elapsedMs=${Date.now() - refreshStartedAt} ttlMs=${ttlMs}`,
        )
      })
      .catch((e) => {
        console.warn(
          `[dashboard/cache] refresh failed elapsedMs=${Date.now() - refreshStartedAt}`,
          e,
        )
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  if (ttlMs === 0) {
    console.log('[dashboard/cache] disabled (DASHBOARD_CACHE_TTL_MS=0)')
    const t0 = Date.now()
    const fresh = await build()
    console.log(`[dashboard/cache] bypass_build_ok elapsedMs=${Date.now() - t0}`)
    return fresh
  }

  if (cache && now - cache.builtAt < ttlMs) {
    const ageMs = now - cache.builtAt
    const expiresInMs = ttlMs - ageMs
    console.log(
      `[dashboard/cache] hit ageMs=${ageMs} ttlMs=${ttlMs} expiresInMs=${expiresInMs}`,
    )
    return clonePayload(cache.payload)
  }

  if (cache) {
    const ageMs = now - cache.builtAt
    console.log(
      `[dashboard/cache] stale_serve ageMs=${ageMs} ttlMs=${ttlMs} refresh_in_flight=${Boolean(refreshPromise)}`,
    )
    startRefresh()
    return clonePayload(cache.payload)
  }

  if (refreshPromise) {
    console.log('[dashboard/cache] cold_wait reason=refresh_in_flight')
    await refreshPromise
    if (cache) {
      return clonePayload(cache.payload)
    }
  }

  const reason = cache ? 'expired' : 'empty'
  console.log(
    `[dashboard/cache] cold_miss ttlMs=${ttlMs} reason=${reason} refresh_in_flight=${Boolean(refreshPromise)}`,
  )
  const t0 = Date.now()
  const fresh = await build()
  cache = { payload: clonePayload(fresh), builtAt: Date.now() }
  console.log(`[dashboard/cache] cold_store ttlMs=${ttlMs} elapsedMs=${Date.now() - t0}`)
  return clonePayload(fresh)
}
