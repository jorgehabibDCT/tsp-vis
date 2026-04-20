import { getTspProviderSlugMap } from '../config/tspProviderMap.js'
import { isInfluxConfigured } from '../lib/influxEnv.js'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { withDashboardResponseCache } from './dashboardResponseCache.js'
import { fetchDistinctEntityCountsByProvider } from './influxTspMetrics.js'
import {
  logTspSlugMapVsInfluxProviders,
} from './dashboardInfluxDiagnostics.js'

type DashboardPayload = typeof mockTspComparisonResponse

function mergeEntityCountsIntoPayload(
  payload: DashboardPayload,
  byProvider: Record<string, number>,
  slugByTspId: Record<string, string>,
): void {
  const metric = payload.metrics.find((m) => m.id === 'metric-entities')
  if (!metric || metric.type !== 'scalar') {
    return
  }

  const entityCells = metric.values as Record<
    string,
    { kind: 'scalar'; value: number | null }
  >

  for (const tsp of payload.tsps) {
    const slug = slugByTspId[tsp.id]
    if (!slug) {
      entityCells[tsp.id] = { kind: 'scalar', value: null }
      continue
    }
    const n = byProvider[slug]
    entityCells[tsp.id] = {
      kind: 'scalar',
      value: n === undefined ? 0 : n,
    }
  }
}

/**
 * Assembles the dashboard matrix.
 * Only the entities row is Influx-backed in this slice; all other rows remain curated mock.
 */
async function buildTspComparisonDashboard(): Promise<DashboardPayload> {
  if (!isInfluxConfigured()) {
    return mockTspComparisonResponse
  }

  const slugByTspId = getTspProviderSlugMap()
  const payload = JSON.parse(
    JSON.stringify(mockTspComparisonResponse),
  ) as DashboardPayload

  try {
    const byProvider = await fetchDistinctEntityCountsByProvider()
    logTspSlugMapVsInfluxProviders(
      'entities',
      slugByTspId,
      Object.keys(byProvider),
    )
    mergeEntityCountsIntoPayload(payload, byProvider, slugByTspId)
  } catch (e) {
    console.warn(
      '[tspComparison] Influx entity aggregation failed; leaving Number of Entities mock',
      e,
    )
  }

  return payload
}

/**
 * Returns the TSP comparison dashboard payload (cached in memory with TTL).
 * When Influx env is set, **Number of Entities** is merged from Flux when query succeeds.
 * Capability matrix rows and risk score remain curated mock in this slice.
 */
export async function getTspComparisonDashboard(): Promise<DashboardPayload> {
  return withDashboardResponseCache(buildTspComparisonDashboard)
}
