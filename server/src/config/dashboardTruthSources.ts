import {
  DASHBOARD_TSPS,
  DATA_RICHNESS_GROUPS,
  EVENT_ALARM_GROUPS,
  type DashboardTsp,
} from './dashboardMatrixConfig.js'
import { INTEGRATION_FORMULA_PROPOSAL } from './integrationMetricSemantics.js'
import {
  RISK_INDEX_FORMULA_PROPOSAL,
  RISK_INDEX_PLACEHOLDER_SEMANTICS,
} from './riskIndexMetricSemantics.js'

export type DashboardRowSourceType =
  | 'live_influx'
  | 'curated_matrix'
  | 'derived_score'

export type DashboardRowSemantics = {
  sourceType: DashboardRowSourceType
  meaning: string
  accuracyNote?: string
}

/**
 * Source-of-truth semantics per top-level dashboard row.
 * This is intentionally backend-owned and audit-oriented.
 */

/** Internal mapping: dashboard richness row id → audit stance (`server/INFLUX_BUCKET_AUDIT.md`). */
export const DATA_RICHNESS_FIELD_SOURCES: Record<
  string,
  | { kind: 'unsupported' }
  | { kind: 'proxy'; bucketField: string; measurementHint?: string }
> = {
  'gps-satellites': { kind: 'unsupported' },
  dop: {
    kind: 'proxy',
    bucketField: 'hdop',
    measurementHint: 'posted_speed_limits, providers',
  },
  'instant-acceleration': { kind: 'unsupported' },
  'engine-odometer': { kind: 'proxy', bucketField: 'dev_dist' },
  'engine-hourmeter': { kind: 'proxy', bucketField: 'dev_idle' },
}

export const DASHBOARD_ROW_SEMANTICS: Record<string, DashboardRowSemantics> = {
  'metric-entities': {
    sourceType: 'live_influx',
    meaning:
      'Distinct entity count per mapped provider in the configured Influx range.',
  },
  'metric-integration': {
    sourceType: 'derived_score',
    meaning: INTEGRATION_FORMULA_PROPOSAL.meaning,
    accuracyNote:
      `Formula proposal defined but not computable yet: ${INTEGRATION_FORMULA_PROPOSAL.blockingReason}`,
  },
  'metric-events-alarms': {
    sourceType: 'curated_matrix',
    meaning:
      'Label support matrix: curated fallback when no Influx or no provider slug; with Influx, mapped TSPs use distinct-vehicle coverage vs total entities in the evaluation window.',
    accuracyNote:
      'Live-mapped TSPs: each label stores round((vehicles_with_label ÷ distinct entities for the provider) × 100) as coverage_pct; UI bands by pct. Curated fallback (no slug) remains boolean profile matrix.',
  },
  'metric-data-richness': {
    sourceType: 'curated_matrix',
    meaning:
      'Curated per-TSP capability matrix for selected richness dimensions (presence, not frequency).',
    accuracyNote:
      'Bucket-backed semantics: DOP available as hdop (proxy); engine odometer/hourmeter as dev_dist / dev_idle (proxies). GPS satellites and instant acceleration not observed in the audit window — matrix cells remain unsupported until fields appear.',
  },
  'metric-risk-index': {
    sourceType: 'derived_score',
    meaning: RISK_INDEX_FORMULA_PROPOSAL.meaning,
    accuracyNote:
      `Formula proposal defined but not computable yet: ${RISK_INDEX_FORMULA_PROPOSAL.blockingReason} Current values use ${RISK_INDEX_PLACEHOLDER_SEMANTICS.placeholderKind}.`,
  },
}

type EventProfileId = 'event_full' | 'event_standard' | 'event_core' | 'event_min'
type DataProfileId = 'data_full' | 'data_standard' | 'data_core'

const EVENT_PROFILE_LABELS: Record<EventProfileId, string[]> = {
  event_full: EVENT_ALARM_GROUPS.flatMap((g) => g.labels.map((l) => l.id)),
  /** Strong overlap with high-volume `label_type` codes in `server/INFLUX_BUCKET_AUDIT.md`. */
  event_standard: [
    'trckpnt',
    'prdtst',
    'ignon',
    'ignoff',
    'panic',
    'pwrloss',
    'pwrrstd',
    'lwbatt',
    'stp',
    'spd',
    'spdend',
    'idl',
    'idlend',
    'posac',
    'negac',
    'aggr',
    'aggdrvcrv',
    'coldet',
    'mblyhdwrn',
    'mblyfcw',
    'adastlgt',
    'ftgwarning',
    'ftgalarm',
    'ftgdistrct',
    'ftgcamphon',
    'ftgnosblt',
    'ftgcamblck',
    'ftgfoodrnk',
  ],
  event_core: [
    'trckpnt',
    'ignon',
    'ignoff',
    'pwrloss',
    'pwrrstd',
    'lwbatt',
    'stp',
    'spd',
    'idl',
    'idlend',
    'posac',
    'negac',
    'aggr',
    'aggdrvcrv',
    'coldet',
    'ftgwarning',
    'ftgalarm',
    'ftgdistrct',
    'ftgcamphon',
    'ftgcamblck',
    'ftgfoodrnk',
  ],
  event_min: ['trckpnt', 'ignon', 'ignoff', 'stp', 'spd', 'idl', 'aggr'],
}

const DATA_PROFILE_LABELS: Record<DataProfileId, string[]> = {
  /** Proxied richness only; see `DATA_RICHNESS_FIELD_SOURCES`. */
  data_full: ['dop', 'engine-odometer', 'engine-hourmeter'],
  data_standard: ['dop', 'engine-odometer'],
  data_core: ['engine-odometer'],
}

type TspCuratedTruth = {
  eventProfile: EventProfileId
  dataProfile: DataProfileId
  entityMock: number
}

const CSV_BUCKET_TSP_IDS = [
  'tsp-csv-arrendamex',
  'tsp-csv-fleetup',
  'tsp-csv-ftr',
  'tsp-csv-geotrucks',
  'tsp-csv-innovalinks',
  'tsp-csv-logitrack',
  'tsp-csv-lojack',
  'tsp-csv-motum',
  'tsp-csv-numaris',
  'tsp-csv-queclink',
  'tsp-csv-rec',
  'tsp-csv-resser',
  'tsp-csv-samsara',
  'tsp-csv-sitrack',
  'tsp-csv-traffilog',
  'tsp-csv-ubicamovil',
] as const

function csvBucketImportedTspCuratedDefaults(): Record<string, TspCuratedTruth> {
  const out: Record<string, TspCuratedTruth> = {}
  for (let i = 0; i < CSV_BUCKET_TSP_IDS.length; i++) {
    const id = CSV_BUCKET_TSP_IDS[i]
    out[id] = {
      eventProfile: 'event_min',
      dataProfile: 'data_core',
      entityMock: 1000 + i * 41,
    }
  }
  return out
}

/**
 * Curated support/score source of truth by TSP.
 * Explicit and easy to audit/edit.
 */
export const CURATED_TRUTH_BY_TSP: Record<string, TspCuratedTruth> = {
  'tsp-santrack-internacional': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    entityMock: 2310,
  },
  'tsp-tecnologistik-occidente': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    entityMock: 1280,
  },
  'tsp-ontracking-remote-metrics': {
    eventProfile: 'event_standard',
    dataProfile: 'data_standard',
    entityMock: 1540,
  },
  'tsp-skymeduza': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    entityMock: 980,
  },
  'tsp-skyguardian': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    entityMock: 1110,
  },
  'tsp-phoenix-telematics': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    entityMock: 1235,
  },
  'tsp-tecno-gps': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    entityMock: 2015,
  },
  'tsp-itrack': {
    eventProfile: 'event_standard',
    dataProfile: 'data_standard',
    entityMock: 1780,
  },
  'tsp-ttc-total-tracking-center': {
    eventProfile: 'event_full',
    dataProfile: 'data_full',
    entityMock: 2490,
  },
  'tsp-ads-logic': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    entityMock: 890,
  },
  'tsp-autotracking-world-connect': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    entityMock: 2150,
  },
  'tsp-tecnologia-servicios-y-vision': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    entityMock: 1190,
  },
  'tsp-navman-wireless-mexico': {
    eventProfile: 'event_core',
    dataProfile: 'data_core',
    entityMock: 1040,
  },
  'tsp-hunter': {
    eventProfile: 'event_full',
    dataProfile: 'data_full',
    entityMock: 2670,
  },
  'tsp-gorilamx': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    entityMock: 1155,
  },
  'tsp-atlantida': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    entityMock: 940,
  },
  'tsp-localizadores-gts': {
    eventProfile: 'event_standard',
    dataProfile: 'data_standard',
    entityMock: 1395,
  },
  'tsp-blac': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    entityMock: 760,
  },
  'tsp-motorlink': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    entityMock: 1860,
  },
  ...csvBucketImportedTspCuratedDefaults(),
}

type ScalarCell = { kind: 'scalar'; value: number | null }
type ExpandableCell = {
  kind: 'expandable'
  summary: number
  groups: { groupId: string; values: boolean[] }[]
}

/**
 * Builds curated matrices for all `DASHBOARD_TSPS` ids. Pending-integration columns still get
 * structural entries here for config parity; `finalizeDashboardPayload` in
 * `server/src/utils/dashboardPayloadFinalize.ts` **must** strip those cells before the API
 * responds — otherwise Cursor or partial merges can leave misleading curated values on pending
 * columns.
 */
function buildProfileMatrix(
  groups: { id: string; labels: { id: string }[] }[],
  profileToLabels: Record<string, string[]>,
  profileByTsp: Record<string, string>,
): Record<string, ExpandableCell> {
  const out: Record<string, ExpandableCell> = {}
  for (const tsp of DASHBOARD_TSPS) {
    const profile = profileByTsp[tsp.id]
    const enabled = new Set(profileToLabels[profile] ?? [])
    let summary = 0
    const builtGroups = groups.map((g) => {
      const values = g.labels.map((l) => {
        const on = enabled.has(l.id)
        if (on) {
          summary += 1
        }
        return on
      })
      return { groupId: g.id, values }
    })
    out[tsp.id] = { kind: 'expandable', summary, groups: builtGroups }
  }
  return out
}

export const CURATED_EVENT_SUPPORT_VALUES = buildProfileMatrix(
  EVENT_ALARM_GROUPS,
  EVENT_PROFILE_LABELS,
  Object.fromEntries(
    Object.entries(CURATED_TRUTH_BY_TSP).map(([tspId, v]) => [tspId, v.eventProfile]),
  ),
)

export const CURATED_DATA_RICHNESS_VALUES = buildProfileMatrix(
  DATA_RICHNESS_GROUPS,
  DATA_PROFILE_LABELS,
  Object.fromEntries(
    Object.entries(CURATED_TRUTH_BY_TSP).map(([tspId, v]) => [tspId, v.dataProfile]),
  ),
)

function countTotalLabels(groups: { labels: { id: string }[] }[]): number {
  return groups.reduce((acc, g) => acc + g.labels.length, 0)
}

function clampScore0to100(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function confidenceModifier(
  confidence: DashboardTsp['providerMappingConfidence'],
): number | null {
  if (confidence === 'confident') {
    return 1
  }
  if (confidence === 'plausible_pending') {
    return 0.85
  }
  return null
}

function computeReadinessScore(params: {
  entities: number | null
  maxEntities: number
  eventSupported: number
  eventTotal: number
  richnessSupported: number
  richnessTotal: number
  integrationStatus: DashboardTsp['integrationStatus']
  providerSlug: string | null
  mappingConfidence: DashboardTsp['providerMappingConfidence']
}): number | null {
  const {
    entities,
    maxEntities,
    eventSupported,
    eventTotal,
    richnessSupported,
    richnessTotal,
    integrationStatus,
    providerSlug,
    mappingConfidence,
  } = params

  if (integrationStatus !== 'integrated' || !providerSlug) {
    return null
  }
  const modifier = confidenceModifier(mappingConfidence)
  if (modifier === null) {
    return null
  }
  if (
    entities === null ||
    !Number.isFinite(entities) ||
    entities < 0 ||
    !Number.isFinite(maxEntities) ||
    maxEntities <= 0 ||
    eventTotal <= 0 ||
    richnessTotal <= 0
  ) {
    return null
  }

  const breadthScore = (eventSupported / eventTotal) * 100
  const richnessScore = (richnessSupported / richnessTotal) * 100
  const scaleScore = Math.sqrt(entities / maxEntities) * 100
  const matrixScore = Math.sqrt(breadthScore * richnessScore)
  const baseScore = 0.7 * matrixScore + 0.3 * scaleScore
  return clampScore0to100(Math.round(baseScore * modifier))
}

const EVENT_TOTAL_LABELS = countTotalLabels(EVENT_ALARM_GROUPS)
const RICHNESS_TOTAL_LABELS = countTotalLabels(DATA_RICHNESS_GROUPS)

const MAX_ENTITIES_AMONG_INTEGRATED = DASHBOARD_TSPS.reduce((max, tsp) => {
  if (tsp.integrationStatus !== 'integrated') {
    return max
  }
  const entities = CURATED_TRUTH_BY_TSP[tsp.id]?.entityMock ?? null
  if (entities === null || !Number.isFinite(entities) || entities <= 0) {
    return max
  }
  return Math.max(max, entities)
}, 0)

export const CURATED_RISK_INDEX_VALUES: Record<string, ScalarCell> = Object.fromEntries(
  DASHBOARD_TSPS.map((tsp) => {
    const eventCell = CURATED_EVENT_SUPPORT_VALUES[tsp.id]
    const richnessCell = CURATED_DATA_RICHNESS_VALUES[tsp.id]
    const entities = CURATED_TRUTH_BY_TSP[tsp.id]?.entityMock ?? null
    const score =
      eventCell && richnessCell
        ? computeReadinessScore({
            entities,
            maxEntities: MAX_ENTITIES_AMONG_INTEGRATED,
            eventSupported: eventCell.summary,
            eventTotal: EVENT_TOTAL_LABELS,
            richnessSupported: richnessCell.summary,
            richnessTotal: RICHNESS_TOTAL_LABELS,
            integrationStatus: tsp.integrationStatus,
            providerSlug: tsp.providerSlug,
            mappingConfidence: tsp.providerMappingConfidence,
          })
        : null
    return [tsp.id, { kind: 'scalar', value: score }]
  }),
)

export const CURATED_ENTITY_MOCK_VALUES: Record<string, ScalarCell> =
  Object.fromEntries(
    Object.entries(CURATED_TRUTH_BY_TSP).map(([tspId, v]) => [
      tspId,
      { kind: 'scalar', value: v.entityMock },
    ]),
  )
