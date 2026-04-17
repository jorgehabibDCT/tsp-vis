import { getTspProviderSlugMap } from '../config/tspProviderMap.js'
import { isInfluxConfigured } from '../lib/influxEnv.js'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { withDashboardResponseCache } from './dashboardResponseCache.js'
import { fetchDistinctEntityCountsByProvider } from './influxTspMetrics.js'
import { fetchEventLabelCountsByProvider } from './influxEventLabels.js'
import { mergeEventLabelCountsIntoPayload } from './mergeEventLabelDashboard.js'
import {
  logEventLabelUnmappedTotals,
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
 * Assembles the dashboard (Influx-backed metrics when configured; per-metric fallback to mock).
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

  try {
    const eventCounts = await fetchEventLabelCountsByProvider()
    logTspSlugMapVsInfluxProviders(
      'event-labels',
      slugByTspId,
      Object.keys(eventCounts),
    )
    mergeEventLabelCountsIntoPayload(payload, eventCounts, slugByTspId)
    logEventLabelUnmappedTotals(eventCounts, slugByTspId)
  } catch (e) {
    console.warn(
      '[tspComparison] Influx event label aggregation failed; leaving Event labels / Alarms mock',
      e,
    )
  }

  return payload
}

/**
 * Returns the TSP comparison dashboard payload (cached in memory with TTL).
 * When Influx env is set, **Number of Entities** and **Event labels / Alarms Info** are merged
 * from Flux when queries succeed; **Integration %** stays mock. Failed queries leave that
 * metric’s mock slice unchanged.
 */
export async function getTspComparisonDashboard(): Promise<DashboardPayload> {
  return withDashboardResponseCache(buildTspComparisonDashboard)
}
