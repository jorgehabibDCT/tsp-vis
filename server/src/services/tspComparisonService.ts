import { getTspProviderSlugMap } from '../config/tspProviderMap.js'
import { isInfluxConfigured } from '../lib/influxEnv.js'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { withDashboardResponseCache } from './dashboardResponseCache.js'
import { mergeEventLabelVehicleCoverageIntoPayload } from './mergeEventLabelDashboard.js'
import { recomputeProviderReadinessScores } from '../utils/providerReadinessScore.js'
import {
  logTspSlugMapVsInfluxProviders,
  logDashboardBackendLiveVerification,
} from './dashboardInfluxDiagnostics.js'
import {
  finalizeDashboardPayload,
  type DashboardPayload,
} from '../utils/dashboardPayloadFinalize.js'
import {
  defaultInfluxDashboardQueryPort,
  type InfluxDashboardQueryPort,
} from './influxDashboardQueryPort.js'

function cloneDashboardPayload(): DashboardPayload {
  return JSON.parse(
    JSON.stringify(mockTspComparisonResponse),
  ) as DashboardPayload
}

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
 * Influx merge path using an injectable query port (production uses
 * {@link defaultInfluxDashboardQueryPort}). Exported for focused tests only.
 */
export async function buildTspComparisonDashboardMerged(
  port: InfluxDashboardQueryPort,
): Promise<DashboardPayload> {
  const slugByTspId = getTspProviderSlugMap()
  const payload = cloneDashboardPayload()

  const tspNameById = Object.fromEntries(
    payload.tsps.map((t) => [t.id, t.name]),
  )

  let entityCountByProvider: Record<string, number> = {}
  let entitiesQuerySucceeded = false
  try {
    entityCountByProvider = await port.fetchDistinctEntityCountsByProvider()
    logTspSlugMapVsInfluxProviders(
      'entities',
      slugByTspId,
      Object.keys(entityCountByProvider),
    )
    mergeEntityCountsIntoPayload(payload, entityCountByProvider, slugByTspId)
    entitiesQuerySucceeded = true
  } catch (e) {
    console.warn(
      '[tspComparison] Influx entity aggregation failed; leaving Number of Entities mock',
      e,
    )
  }

  let eventLabelsQuerySucceeded = false
  try {
    const labelVidByProvider =
      await port.fetchDistinctVehicleCountByProviderAndLabel()
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
      tspNameById,
    )
    eventLabelsQuerySucceeded = true
  } catch (e) {
    console.warn(
      '[tspComparison] Influx distinct-vid event-label query failed; leaving Event labels / Alarms Info curated mock',
      e,
    )
  }

  recomputeProviderReadinessScores(payload)
  finalizeDashboardPayload(payload)

  logDashboardBackendLiveVerification({
    tsps: payload.tsps,
    slugByTspId,
    entityByProvider: entityCountByProvider,
    metrics: payload.metrics,
    entitiesQuerySucceeded,
    eventLabelsQuerySucceeded,
  })

  return payload
}

/**
 * Assembles the dashboard matrix.
 * **Number of Entities** and **Event labels / Alarms Info** (for slug-mapped TSPs) use Influx
 * when configured; Integration % and data richness remain curated mock for integrated columns.
 * Risk Index/Provider Readiness is recomputed at runtime from the matrix inputs.
 * `finalizeDashboardPayload` sorts columns and clears all metrics for
 * `pending_integration` TSPs (no placeholder data in the API response).
 */
async function buildTspComparisonDashboard(): Promise<DashboardPayload> {
  if (!isInfluxConfigured()) {
    const payload = cloneDashboardPayload()
    recomputeProviderReadinessScores(payload)
    finalizeDashboardPayload(payload)
    return payload
  }

  return buildTspComparisonDashboardMerged(defaultInfluxDashboardQueryPort)
}

/**
 * Returns the assembled dashboard payload (cached in memory with TTL).
 * When Influx env is set, **Number of Entities** is merged from Flux when the query succeeds.
 * **Event labels / Alarms Info** uses distinct-vehicle coverage vs entities (≥50% default) for
 * TSPs with a provider slug; Risk Index/Provider Readiness is then recomputed from matrix inputs.
 */
export async function getTspComparisonDashboard(): Promise<DashboardPayload> {
  return withDashboardResponseCache(buildTspComparisonDashboard)
}
