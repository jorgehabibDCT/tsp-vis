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

type ExternalCohortStatus = 'ok' | 'partial' | 'empty' | 'error'
type ExternalCohortItem = {
  entities: number | null
  eventLabels: Record<string, number>
  richness: Record<string, number>
  status: ExternalCohortStatus
}
type ExternalCohortSnapshot = {
  generatedAt?: string
  stale?: boolean
  cohorts?: Record<string, ExternalCohortItem>
  mongo?: Record<string, { docsMatched: number; canonicalVids: number }>
  errors?: string[]
}

const ACTIVE_EXTERNAL_INTERNAL_COHORT_SLUGS = new Set<string>([])

function isStartupPlaceholderSnapshot(body: ExternalCohortSnapshot): boolean {
  const hasStartupInProgressError = (body.errors ?? []).includes('startup_refresh_in_progress')
  if (hasStartupInProgressError) {
    return true
  }

  const mongoEntries = Object.values(body.mongo ?? {})
  const allMongoCountsZero =
    mongoEntries.length > 0 &&
    mongoEntries.every((m) => (m?.docsMatched ?? 0) <= 0 && (m?.canonicalVids ?? 0) <= 0)
  if (!allMongoCountsZero) {
    return false
  }

  const cohortEntries = Object.values(body.cohorts ?? {})
  const hasSuccessfulRefreshEvidence = cohortEntries.some((item) => {
    if (!item) return false
    if (item.status !== 'empty') return true
    if (Number(item.entities ?? 0) > 0) return true
    if (Object.keys(item.eventLabels ?? {}).length > 0) return true
    if (Object.keys(item.richness ?? {}).length > 0) return true
    return false
  })
  return !hasSuccessfulRefreshEvidence
}

function isExternalCohortServiceEnabled(): boolean {
  return process.env.USE_EXTERNAL_COHORT_SERVICE?.trim() === '1'
}

async function fetchExternalCohortSnapshot(): Promise<ExternalCohortSnapshot | null> {
  const baseUrl = process.env.COHORT_SERVICE_BASE_URL?.trim()
  if (!baseUrl) {
    return null
  }
  const timeoutMsRaw = process.env.COHORT_SERVICE_TIMEOUT_MS?.trim()
  const timeoutMs = Number.parseInt(timeoutMsRaw ?? '900', 10)
  const maxStaleMsRaw = process.env.COHORT_SERVICE_MAX_STALE_MS?.trim()
  const maxStaleMs = Number.parseInt(maxStaleMsRaw ?? '600000', 10)
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 900)
  const url = `${baseUrl.replace(/\/$/, '')}/internal-hardware-cohorts/snapshot`
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const elapsedMs = Date.now() - t0
    if (!res.ok) {
      console.warn(
        `[cohort-service/shadow] non_ok status=${res.status} elapsedMs=${elapsedMs} url=${url}`,
      )
      return null
    }
    const body = (await res.json()) as ExternalCohortSnapshot
    const generatedAtMs = body.generatedAt ? new Date(body.generatedAt).getTime() : NaN
    const ageMs = Number.isFinite(generatedAtMs) ? Date.now() - generatedAtMs : NaN
    const staleByAge = Number.isFinite(ageMs) && ageMs > maxStaleMs
    console.log(
      `[cohort-service/shadow] ok elapsedMs=${elapsedMs} stale=${Boolean(body.stale)} staleByAge=${Boolean(staleByAge)} ageMs=${Number.isFinite(ageMs) ? ageMs : 'n/a'} generatedAt=${body.generatedAt ?? 'n/a'} cohorts=${body.cohorts ? Object.keys(body.cohorts).length : 0} errors=${body.errors?.length ?? 0}`,
    )
    if (body.stale || staleByAge) {
      return null
    }
    if (isStartupPlaceholderSnapshot(body)) {
      console.warn(
        `[cohort-service/shadow] snapshot_rejected reason=startup_placeholder generatedAt=${body.generatedAt ?? 'n/a'}`,
      )
      return null
    }
    return body
  } catch (e) {
    const elapsedMs = Date.now() - t0
    console.warn(`[cohort-service/shadow] fetch_failed elapsedMs=${elapsedMs} url=${url}`, e)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function buildUnavailableExpandableCell(structure: {
  groups: { id: string; labels: { id: string }[] }[]
}): { kind: 'expandable'; summary: null; groups: { groupId: string; values: null[] }[] } {
  return {
    kind: 'expandable',
    summary: null,
    groups: structure.groups.map((g) => ({
      groupId: g.id,
      values: g.labels.map(() => null),
    })),
  }
}

function applyExternalCohortSnapshot(
  payload: DashboardPayload,
  snapshot: ExternalCohortSnapshot,
  slugByTspId: Record<string, string | null>,
): void {
  if (!snapshot.cohorts) {
    return
  }

  ensureInternalHardwareColumns(payload)
  for (const cohort of INTERNAL_HARDWARE_COHORTS) {
    slugByTspId[cohort.id] = ACTIVE_EXTERNAL_INTERNAL_COHORT_SLUGS.has(cohort.slug)
      ? cohort.slug
      : null
  }

  const entityMetric = payload.metrics.find(
    (m) => m.id === 'metric-entities' && m.type === 'scalar',
  )
  const eventMetric = payload.metrics.find(
    (m) => m.id === 'metric-events-alarms' && m.type === 'expandable',
  )
  const richnessMetric = payload.metrics.find(
    (m) => m.id === 'metric-data-richness' && m.type === 'expandable',
  )
  if (!entityMetric || !eventMetric || !richnessMetric) {
    return
  }

  const entityCells = entityMetric.values as Record<
    string,
    { kind: 'scalar'; value: number | null }
  >
  type MutableExpandableCell = {
    kind: 'expandable'
    summary: number | null
    groups: { groupId: string; values: Array<number | boolean | null> }[]
  }
  const eventCells = eventMetric.values as Record<string, MutableExpandableCell>
  const richnessCells = richnessMetric.values as Record<string, MutableExpandableCell>

  const materialized = new Set<string>()
  const eventLabelByCohortSlug: Record<string, Record<string, number>> = {}
  const entitiesByCohortSlug: Record<string, number> = {}
  const richnessByCohortSlug: Record<string, Record<string, number>> = {}
  const slugByTspIdForEventMerge = { ...slugByTspId }
  const tspNameById = Object.fromEntries(payload.tsps.map((t) => [t.id, t.name]))

  for (const cohort of INTERNAL_HARDWARE_COHORTS) {
    if (!ACTIVE_EXTERNAL_INTERNAL_COHORT_SLUGS.has(cohort.slug)) {
      entityCells[cohort.id] = { kind: 'scalar', value: null }
      eventCells[cohort.id] = buildUnavailableExpandableCell(eventMetric.structure)
      richnessCells[cohort.id] = buildUnavailableExpandableCell(richnessMetric.structure)
      slugByTspIdForEventMerge[cohort.id] = null
      continue
    }

    const item = snapshot.cohorts[cohort.slug]
    if (!item) {
      entityCells[cohort.id] = { kind: 'scalar', value: null }
      eventCells[cohort.id] = buildUnavailableExpandableCell(eventMetric.structure)
      richnessCells[cohort.id] = buildUnavailableExpandableCell(richnessMetric.structure)
      slugByTspIdForEventMerge[cohort.id] = null
      continue
    }

    if ((item.status === 'ok' || item.status === 'partial') && Number.isFinite(item.entities)) {
      materialized.add(cohort.slug)
      entitiesByCohortSlug[cohort.slug] = Math.max(0, Number(item.entities ?? 0))
      eventLabelByCohortSlug[cohort.slug] = item.eventLabels ?? {}
      richnessByCohortSlug[cohort.slug] = item.richness ?? {}
      entityCells[cohort.id] = { kind: 'scalar', value: Math.max(0, Number(item.entities ?? 0)) }
      continue
    }

    if (item.status === 'empty') {
      entityCells[cohort.id] = { kind: 'scalar', value: 0 }
    } else {
      entityCells[cohort.id] = { kind: 'scalar', value: null }
    }
    eventCells[cohort.id] = buildUnavailableExpandableCell(eventMetric.structure)
    richnessCells[cohort.id] = buildUnavailableExpandableCell(richnessMetric.structure)
    slugByTspIdForEventMerge[cohort.id] = null
  }

  mergeInternalHardwareRichnessCoverage(
    payload,
    entitiesByCohortSlug,
    richnessByCohortSlug,
    materialized,
  )
  mergeEventLabelVehicleCoverageIntoPayload(
    payload,
    entitiesByCohortSlug,
    eventLabelByCohortSlug,
    slugByTspIdForEventMerge,
    tspNameById,
  )
}

async function materializeTeltonikaInternalCohortFromProviderBaseline(params: {
  payload: DashboardPayload
  slugByTspId: Record<string, string | null>
  entitiesQuerySucceeded: boolean
  eventLabelsQuerySucceeded: boolean
  entityCountByProvider: Record<string, number>
  labelVidByProviderBase: Record<string, Record<string, number>>
}): Promise<void> {
  const {
    payload,
    slugByTspId,
    entitiesQuerySucceeded,
    eventLabelsQuerySucceeded,
    entityCountByProvider,
    labelVidByProviderBase,
  } = params
  ensureInternalHardwareColumns(payload)

  for (const cohort of INTERNAL_HARDWARE_COHORTS) {
    slugByTspId[cohort.id] =
      cohort.slug === TELTONIKA_INTERNAL_COHORT_SLUG ? TELTONIKA_INTERNAL_COHORT_SLUG : null
  }

  if (!entitiesQuerySucceeded) {
    return
  }

  const teltonikaEntities = Math.max(0, Number(entityCountByProvider[TELTONIKA_PROVIDER_SLUG] ?? 0))
  const entityMetric = payload.metrics.find((m) => m.id === 'metric-entities' && m.type === 'scalar')
  if (entityMetric) {
    const entityCells = entityMetric.values as Record<string, { kind: 'scalar'; value: number | null }>
    for (const cohort of INTERNAL_HARDWARE_COHORTS) {
      entityCells[cohort.id] = {
        kind: 'scalar',
        value: cohort.slug === TELTONIKA_INTERNAL_COHORT_SLUG ? teltonikaEntities : null,
      }
    }
  }

  if (eventLabelsQuerySucceeded) {
    const tspNameById = Object.fromEntries(payload.tsps.map((t) => [t.id, t.name]))
    const slugByTspIdForTeltonikaOnly: Record<string, string | null> = Object.fromEntries(
      payload.tsps.map((t) => [t.id, null]),
    )
    for (const cohort of INTERNAL_HARDWARE_COHORTS) {
      slugByTspIdForTeltonikaOnly[cohort.id] =
        cohort.slug === TELTONIKA_INTERNAL_COHORT_SLUG ? TELTONIKA_INTERNAL_COHORT_SLUG : null
    }
    mergeEventLabelVehicleCoverageIntoPayload(
      payload,
      { [TELTONIKA_INTERNAL_COHORT_SLUG]: teltonikaEntities },
      {
        [TELTONIKA_INTERNAL_COHORT_SLUG]:
          labelVidByProviderBase[TELTONIKA_PROVIDER_SLUG] ?? {},
      },
      slugByTspIdForTeltonikaOnly,
      tspNameById,
    )
  }

  try {
    const teltonikaRichness = await fetchDistinctVehicleCountByRichnessFieldForProvider(
      TELTONIKA_PROVIDER_SLUG,
    )
    mergeInternalHardwareRichnessCoverage(
      payload,
      { [TELTONIKA_INTERNAL_COHORT_SLUG]: teltonikaEntities },
      { [TELTONIKA_INTERNAL_COHORT_SLUG]: teltonikaRichness },
      new Set<string>([TELTONIKA_INTERNAL_COHORT_SLUG]),
    )
  } catch (e) {
    console.warn(
      `[tspComparison] Teltonika provider-native richness enrichment failed; continuing`,
      e,
    )
  }
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
  const buildStartedAt = Date.now()
  const stage = (name: string, t0: number): void => {
    console.log(`[tspComparison/timing] stage=${name} elapsedMs=${Date.now() - t0}`)
  }

  const slugByTspId: Record<string, string | null> = getTspProviderSlugMap()
  const payload = cloneDashboardPayload()
  const externalCohortServiceEnabled = isExternalCohortServiceEnabled()
  const externalSnapshotStartedAt = Date.now()
  const externalSnapshot = await fetchExternalCohortSnapshot()
  stage('external_snapshot_fetch', externalSnapshotStartedAt)

  let internalCohortEntityCounts: Record<string, number> = {}
  let internalCohortLabelCounts: Record<string, Record<string, number>> = {}
  let internalCohortRichnessCounts: Record<string, Record<string, number>> = {}
  const materializedEntityCohorts = new Set<string>()
  let hasCohorts = false
  let cohortVidsForInflux: Record<string, Set<string>> = {}
  if (!externalCohortServiceEnabled) {
    const inProcessCohortsStartedAt = Date.now()
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
    stage('in_process_cohort_gate', inProcessCohortsStartedAt)
  } else {
    console.log(
      `[cohort-service] external mode enabled snapshot_present=${Boolean(externalSnapshot)}; bypassing in-process cohort path`,
    )
  }

  const tspNameById = Object.fromEntries(
    payload.tsps.map((t) => [t.id, t.name]),
  )

  let entityCountByProvider: Record<string, number> = {}
  let entitiesQuerySucceeded = false
  const entitiesQueryStartedAt = Date.now()
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
  stage('baseline_entities_query_merge', entitiesQueryStartedAt)

  if (!externalCohortServiceEnabled && hasCohorts && entitiesQuerySucceeded) {
    const cohortEntitiesStartedAt = Date.now()
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
    stage('cohort_entities_enrichment', cohortEntitiesStartedAt)
  }

  let eventLabelsQuerySucceeded = false
  let labelVidByProviderBase: Record<string, Record<string, number>> = {}
  const baselineEventLabelsStartedAt = Date.now()
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
  stage('baseline_event_labels_query_merge', baselineEventLabelsStartedAt)

  // Keep cohort enrichment best-effort so cohort timeouts do not regress
  // baseline provider entities/event-labels for the whole dashboard response.
  if (
    !externalCohortServiceEnabled &&
    hasCohorts &&
    entitiesQuerySucceeded &&
    eventLabelsQuerySucceeded
  ) {
    const cohortLabelsRichnessStartedAt = Date.now()
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
    stage('cohort_labels_richness_enrichment', cohortLabelsRichnessStartedAt)
  } else if (!externalCohortServiceEnabled && hasCohorts) {
    console.warn(
      `[tspComparison] Cohort enrichment skipped entitiesOk=${entitiesQuerySucceeded} eventLabelsOk=${eventLabelsQuerySucceeded}`,
    )
  }

  await materializeTeltonikaInternalCohortFromProviderBaseline({
    payload,
    slugByTspId,
    entitiesQuerySucceeded,
    eventLabelsQuerySucceeded,
    entityCountByProvider,
    labelVidByProviderBase,
  })

  if (
    externalCohortServiceEnabled &&
    externalSnapshot &&
    ACTIVE_EXTERNAL_INTERNAL_COHORT_SLUGS.size > 0
  ) {
    const externalMergeStartedAt = Date.now()
    applyExternalCohortSnapshot(payload, externalSnapshot, slugByTspId)
    stage('external_snapshot_merge', externalMergeStartedAt)
  }

  const finalizeStartedAt = Date.now()
  recomputeProviderReadinessScores(payload)
  finalizeDashboardPayload(payload)
  stage('score_finalize', finalizeStartedAt)

  logDashboardBackendLiveVerification({
    tsps: payload.tsps,
    slugByTspId,
    entityByProvider: { ...entityCountByProvider, ...internalCohortEntityCounts },
    metrics: payload.metrics,
    entitiesQuerySucceeded,
    eventLabelsQuerySucceeded,
  })
  console.log(`[tspComparison/timing] total_elapsedMs=${Date.now() - buildStartedAt}`)

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
