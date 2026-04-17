import { getTspProviderSlugMap } from '../config/tspProviderMap.js'
import { isInfluxConfigured } from '../lib/influxEnv.js'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { fetchDistinctEntityCountsByProvider } from './influxTspMetrics.js'

type DashboardPayload = typeof mockTspComparisonResponse

/**
 * Returns the TSP comparison dashboard payload.
 * When Influx env is set, **Number of Entities** is aggregated from distinct `vid` per `provider` tag;
 * other metrics remain mock. On any Influx failure, returns the full mock payload (unchanged).
 */
export async function getTspComparisonDashboard(): Promise<DashboardPayload> {
  if (!isInfluxConfigured()) {
    return mockTspComparisonResponse
  }

  try {
    const byProvider = await fetchDistinctEntityCountsByProvider()
    const slugByTspId = getTspProviderSlugMap()
    const payload = JSON.parse(
      JSON.stringify(mockTspComparisonResponse),
    ) as DashboardPayload

    const metric = payload.metrics.find((m) => m.id === 'metric-entities')
    if (!metric || metric.type !== 'scalar') {
      return mockTspComparisonResponse
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

    return payload
  } catch (e) {
    console.warn(
      '[tspComparison] Influx entity aggregation failed; using mock for all metrics',
      e,
    )
    return mockTspComparisonResponse
  }
}
