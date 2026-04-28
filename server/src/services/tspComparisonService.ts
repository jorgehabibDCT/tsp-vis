import { getTspProviderSlugMap } from '../config/tspProviderMap.js'
import { isInfluxConfigured } from '../lib/influxEnv.js'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { withDashboardResponseCache } from './dashboardResponseCache.js'
import { mergeEventLabelVehicleCoverageIntoPayload } from './mergeEventLabelDashboard.js'
import { recomputeProviderReadinessScores } from '../utils/providerReadinessScore.js'
import {
  INTERNAL_HARDWARE_COHORTS,
  TELTONIKA_INTERNAL_COHORT_SLUG,
  TELTONIKA_PROVIDER_SLUG,
} from '../config/internalHardwareCohorts.js'
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
import { fetchHardwareCohortVidSetsFromMongo } from './mongoHardwareCohorts.js'
import {
  fetchDistinctEntityCountsByVidCohort,
  fetchDistinctVehicleCountByLabelForVidCohort,
  fetchDistinctVehicleCountByRichnessFieldForVidCohort,
  fetchDistinctVehicleCountByRichnessFieldForProvider,
} from './influxVidCohortMetrics.js'
import {
  ensureInternalHardwareColumns,
  mergeInternalHardwareEntityCounts,
  mergeInternalHardwareRichnessCoverage,
} from './internalHardwareCohortMerge.js'

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
  const slugByTspId: Record<string, string | null> = getTspProviderSlugMap()
  const payload = cloneDashboardPayload()

  let internalCohortEntityCounts: Record<string, number> = {}
  let internalCohortLabelCounts: Record<string, Record<string, number>> = {}
  let internalCohortRichnessCounts: Record<string, Record<string, number>> = {}
  const materializedEntityCohorts = new Set<string>()
  let hasCohorts = false
  let cohortVidsForInflux: Record<string, Set<string>> = {}
  try {
    const cohortVids = await fetchHardwareCohortVidSetsFromMongo()
    hasCohorts = INTERNAL_HARDWARE_COHORTS.some(
      (c) => (cohortVids[c.slug]?.size ?? 0) > 0,
    )
    const cohortVidCounts = Object.fromEntries(
      INTERNAL_HARDWARE_COHORTS.map((c) => [c.slug, cohortVids[c.slug]?.size ?? 0]),
    )
    console.log(
      `[hardware-cohorts] gate hasCohorts=${hasCohorts} counts=${JSON.stringify(cohortVidCounts)}`,
    )
    if (hasCohorts) {
      ensureInternalHardwareColumns(payload)
      for (const cohort of INTERNAL_HARDWARE_COHORTS) {
        slugByTspId[cohort.id] = cohort.slug
      }
      cohortVidsForInflux = Object.fromEntries(
        Object.entries(cohortVids).filter(
          ([slug]) => slug !== TELTONIKA_INTERNAL_COHORT_SLUG,
        ),
      )
      console.log(
        `[hardware-cohorts] injecting columns ids=${INTERNAL_HARDWARE_COHORTS.map((c) => c.id).join(',')}`,
      )
      console.log(
        `[hardware-cohorts] strategy teltonika=provider_native others=vid_join non_teltonika_slugs=${Object.keys(cohortVidsForInflux).join(',')}`,
      )
    } else {
      console.log('[hardware-cohorts] skip reason=no_nonempty_cohort_vid_sets')
    }
  } catch (e) {
    console.warn(
      '[hardware-cohorts] Mongo/Influx VID cohort merge failed; skipping cohort columns',
      e,
    )
  }

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
    mergeEntityCountsIntoPayload(
      payload,
      { ...entityCountByProvider, ...internalCohortEntityCounts },
      slugByTspId,
    )
    entitiesQuerySucceeded = true
  } catch (e) {
    console.warn(
      '[tspComparison] Influx entity aggregation failed; leaving Number of Entities mock',
      e,
    )
  }

  if (hasCohorts && entitiesQuerySucceeded) {
    // Explicitly alias provider-native teltonika -> internal cohort column.
    internalCohortEntityCounts[TELTONIKA_INTERNAL_COHORT_SLUG] =
      entityCountByProvider[TELTONIKA_PROVIDER_SLUG] ?? 0
    materializedEntityCohorts.add(TELTONIKA_INTERNAL_COHORT_SLUG)
    console.log(
      `[tspComparison] Teltonika entity alias provider=${TELTONIKA_PROVIDER_SLUG} count=${internalCohortEntityCounts[TELTONIKA_INTERNAL_COHORT_SLUG]}`,
    )

    for (const cohortSlug of Object.keys(cohortVidsForInflux)) {
      try {
        const singleCohortCounts = await fetchDistinctEntityCountsByVidCohort({
          [cohortSlug]: cohortVidsForInflux[cohortSlug] ?? new Set<string>(),
        })
        internalCohortEntityCounts[cohortSlug] = singleCohortCounts[cohortSlug] ?? 0
        materializedEntityCohorts.add(cohortSlug)
      } catch (e) {
        console.warn(
          `[tspComparison] Cohort entity enrichment failed cohort=${cohortSlug}; continuing`,
          e,
        )
      }
    }
    mergeInternalHardwareEntityCounts(payload, internalCohortEntityCounts)
  }

  let eventLabelsQuerySucceeded = false
  let labelVidByProviderBase: Record<string, Record<string, number>> = {}
  try {
    labelVidByProviderBase = await port.fetchDistinctVehicleCountByProviderAndLabel()
    const labelVidByProvider: Record<string, Record<string, number>> = {
      ...labelVidByProviderBase,
    }
    const entityCountForEventMerge: Record<string, number> = {
      ...entityCountByProvider,
    }
    const slugByTspIdForBaselineEventMerge: Record<string, string | null> = {
      ...slugByTspId,
    }
    // Baseline event-label merge should not touch internal cohort columns.
    // They are materialized separately in the cohort pass.
    for (const cohort of INTERNAL_HARDWARE_COHORTS) {
      slugByTspIdForBaselineEventMerge[cohort.id] = null
    }
    logTspSlugMapVsInfluxProviders(
      'event-labels',
      slugByTspId,
      Object.keys(labelVidByProvider),
    )
    mergeEventLabelVehicleCoverageIntoPayload(
      payload,
      entityCountForEventMerge,
      labelVidByProvider,
      slugByTspIdForBaselineEventMerge,
      tspNameById,
    )
    eventLabelsQuerySucceeded = true
  } catch (e) {
    console.warn(
      '[tspComparison] Influx distinct-vid event-label query failed; leaving Event labels / Alarms Info curated mock',
      e,
    )
  }

  // Keep cohort enrichment best-effort so cohort timeouts do not regress
  // baseline provider entities/event-labels for the whole dashboard response.
  if (hasCohorts && entitiesQuerySucceeded && eventLabelsQuerySucceeded) {
    internalCohortLabelCounts[TELTONIKA_INTERNAL_COHORT_SLUG] =
      labelVidByProviderBase[TELTONIKA_PROVIDER_SLUG] ?? {}

    for (const cohortSlug of Object.keys(cohortVidsForInflux)) {
      try {
        const singleCohortLabelCounts = await fetchDistinctVehicleCountByLabelForVidCohort(
          {
            [cohortSlug]: cohortVidsForInflux[cohortSlug] ?? new Set<string>(),
          },
        )
        internalCohortLabelCounts[cohortSlug] =
          singleCohortLabelCounts[cohortSlug] ?? {}
      } catch (e) {
        console.warn(
          `[tspComparison] Cohort event-label enrichment failed cohort=${cohortSlug}; continuing`,
          e,
        )
      }
    }

    const filteredInternalCohortLabelCounts: Record<string, Record<string, number>> = {}
    for (const [slug, counts] of Object.entries(internalCohortLabelCounts)) {
      if (materializedEntityCohorts.has(slug)) {
        filteredInternalCohortLabelCounts[slug] = counts
      }
    }

    try {
      internalCohortRichnessCounts[TELTONIKA_INTERNAL_COHORT_SLUG] =
        await fetchDistinctVehicleCountByRichnessFieldForProvider(
          TELTONIKA_PROVIDER_SLUG,
        )
    } catch (e) {
      console.warn(
        `[tspComparison] Cohort richness enrichment failed cohort=${TELTONIKA_INTERNAL_COHORT_SLUG}; continuing`,
        e,
      )
      internalCohortRichnessCounts[TELTONIKA_INTERNAL_COHORT_SLUG] = {}
    }

    for (const cohortSlug of Object.keys(cohortVidsForInflux)) {
      try {
        const singleCohortRichnessCounts =
          await fetchDistinctVehicleCountByRichnessFieldForVidCohort({
            [cohortSlug]: cohortVidsForInflux[cohortSlug] ?? new Set<string>(),
          })
        internalCohortRichnessCounts[cohortSlug] =
          singleCohortRichnessCounts[cohortSlug] ?? {}
      } catch (e) {
        console.warn(
          `[tspComparison] Cohort richness enrichment failed cohort=${cohortSlug}; continuing`,
          e,
        )
      }
    }

    const filteredInternalCohortRichnessCounts: Record<
      string,
      Record<string, number>
    > = {}
    for (const [slug, counts] of Object.entries(internalCohortRichnessCounts)) {
      if (materializedEntityCohorts.has(slug)) {
        filteredInternalCohortRichnessCounts[slug] = counts
      }
    }

    const slugByTspIdForMaterializedCohorts: Record<string, string | null> = {
      ...slugByTspId,
    }
    for (const cohort of INTERNAL_HARDWARE_COHORTS) {
      if (!materializedEntityCohorts.has(cohort.slug)) {
        slugByTspIdForMaterializedCohorts[cohort.id] = null
      }
    }

    mergeInternalHardwareRichnessCoverage(
      payload,
      internalCohortEntityCounts,
      filteredInternalCohortRichnessCounts,
      materializedEntityCohorts,
    )

    mergeEventLabelVehicleCoverageIntoPayload(
      payload,
      { ...entityCountByProvider, ...internalCohortEntityCounts },
      { ...labelVidByProviderBase, ...filteredInternalCohortLabelCounts },
      slugByTspIdForMaterializedCohorts,
      tspNameById,
    )
  } else if (hasCohorts) {
    console.warn(
      `[tspComparison] Cohort enrichment skipped entitiesOk=${entitiesQuerySucceeded} eventLabelsOk=${eventLabelsQuerySucceeded}`,
    )
  }

  recomputeProviderReadinessScores(payload)
  finalizeDashboardPayload(payload)

  logDashboardBackendLiveVerification({
    tsps: payload.tsps,
    slugByTspId,
    entityByProvider: { ...entityCountByProvider, ...internalCohortEntityCounts },
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
