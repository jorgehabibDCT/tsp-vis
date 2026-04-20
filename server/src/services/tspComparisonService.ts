import { getTspProviderSlugMap } from '../config/tspProviderMap.js'
import { isInfluxConfigured } from '../lib/influxEnv.js'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { withDashboardResponseCache } from './dashboardResponseCache.js'
import { fetchDistinctEntityCountsByProvider } from './influxTspMetrics.js'
import { fetchDistinctVehicleCountByProviderAndLabel } from './influxEventLabels.js'
import { mergeEventLabelVehicleCoverageIntoPayload } from './mergeEventLabelDashboard.js'
import { logTspSlugMapVsInfluxProviders } from './dashboardInfluxDiagnostics.js'

type DashboardPayload = typeof mockTspComparisonResponse

function mergeEntityCountsIntoPayload(
  payload: DashboardPayload,
  byProvider: Record<string, number>,
  slugByTspId: Record<string, string | null>,
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
 * **Number of Entities** and **Event labels / Alarms Info** (for slug-mapped TSPs) use Influx
 * when configured; Integration %, data richness, and Risk Index remain curated mock.
 */
async function buildTspComparisonDashboard(): Promise<DashboardPayload> {
  if (!isInfluxConfigured()) {
    return mockTspComparisonResponse
  }

  const slugByTspId = getTspProviderSlugMap()
  const payload = JSON.parse(
    JSON.stringify(mockTspComparisonResponse),
  ) as DashboardPayload

  let entityCountByProvider: Record<string, number> = {}
  try {
    entityCountByProvider = await fetchDistinctEntityCountsByProvider()
    logTspSlugMapVsInfluxProviders(
      'entities',
      slugByTspId,
      Object.keys(entityCountByProvider),
    )
    mergeEntityCountsIntoPayload(payload, entityCountByProvider, slugByTspId)
  } catch (e) {
    console.warn(
      '[tspComparison] Influx entity aggregation failed; leaving Number of Entities mock',
      e,
    )
  }

  try {
    const labelVidByProvider =
      await fetchDistinctVehicleCountByProviderAndLabel()
    logTspSlugMapVsInfluxProviders(
      'event-labels',
      slugByTspId,
      Object.keys(labelVidByProvider),
    )
    mergeEventLabelVehicleCoverageIntoPayload(
      payload,
      entityCountByProvider,
      labelVidByProvider,
      slugByTspId,
    )
  } catch (e) {
    console.warn(
      '[tspComparison] Influx distinct-vid event-label query failed; leaving Event labels / Alarms Info curated mock',
      e,
    )
  }

  return payload
}

/**
 * Returns the TSP comparison dashboard payload (cached in memory with TTL).
 * When Influx env is set, **Number of Entities** is merged from Flux when the query succeeds.
 * **Event labels / Alarms Info** uses distinct-vehicle coverage vs entities (≥50% default) for
 * TSPs with a provider slug; other capability rows and Risk Index remain curated mock unless
 * extended later.
 */
export async function getTspComparisonDashboard(): Promise<DashboardPayload> {
  return withDashboardResponseCache(buildTspComparisonDashboard)
}
