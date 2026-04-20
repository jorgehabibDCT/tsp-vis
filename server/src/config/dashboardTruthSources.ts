import {
  DASHBOARD_TSPS,
  DATA_RICHNESS_GROUPS,
  EVENT_ALARM_GROUPS,
} from './dashboardMatrixConfig.js'

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
export const DASHBOARD_ROW_SEMANTICS: Record<string, DashboardRowSemantics> = {
  'metric-entities': {
    sourceType: 'live_influx',
    meaning:
      'Distinct entity count per mapped provider in the configured Influx range.',
  },
  'metric-integration': {
    sourceType: 'derived_score',
    meaning: 'Integration coverage percentage per TSP.',
    accuracyNote:
      'Formula is not yet defined; response currently publishes null placeholders.',
  },
  'metric-events-alarms': {
    sourceType: 'curated_matrix',
    meaning:
      'Capability/support matrix for event/alarm label families (presence, not frequency).',
  },
  'metric-data-richness': {
    sourceType: 'curated_matrix',
    meaning:
      'Capability/support matrix for selected event data richness fields (presence, not frequency).',
  },
  'metric-risk-index': {
    sourceType: 'derived_score',
    meaning: 'Curated enablement score summarizing risk-index readiness by TSP.',
    accuracyNote:
      'Current values are curated placeholders until a formal scoring formula is approved.',
  },
}

type EventProfileId = 'event_full' | 'event_standard' | 'event_core' | 'event_min'
type DataProfileId = 'data_full' | 'data_standard' | 'data_core'

const EVENT_PROFILE_LABELS: Record<EventProfileId, string[]> = {
  event_full: EVENT_ALARM_GROUPS.flatMap((g) => g.labels.map((l) => l.id)),
  event_standard: [
    // Tracking / Telematics
    'trckpnt',
    'prdtst',
    'ignon',
    'ignoff',
    'panic',
    'pwrloss',
    'pwrrstd',
    'lwbatt',
    // Driving
    'spd',
    'spdend',
    'idl',
    'idlend',
    'posac',
    'negac',
    'aggr',
    'aggdrvcrv',
    'crash',
    // ADAS / DMS
    'mblypdfcw',
    'mblyfcw',
    'adastlgt',
    'ftgwarning',
    'ftgdistrct',
    'ftgnosblt',
  ],
  event_core: [
    'trckpnt',
    'ignon',
    'ignoff',
    'pwrloss',
    'pwrrstd',
    'lwbatt',
    'spd',
    'spdend',
    'idl',
    'idlend',
    'posac',
    'negac',
    'aggr',
    'aggdrvcrv',
    'crash',
    'ftgwarning',
  ],
  event_min: ['trckpnt', 'ignon', 'ignoff', 'spd', 'idl', 'aggr'],
}

const DATA_PROFILE_LABELS: Record<DataProfileId, string[]> = {
  data_full: ['gps-satellites', 'dop', 'instant-acceleration', 'engine-odometer', 'engine-hourmeter'],
  data_standard: ['gps-satellites', 'dop', 'instant-acceleration', 'engine-odometer'],
  data_core: ['gps-satellites', 'dop', 'engine-odometer'],
}

type TspCuratedTruth = {
  eventProfile: EventProfileId
  dataProfile: DataProfileId
  riskIndex: number
  entityMock: number
}

/**
 * Curated support/score source of truth by TSP.
 * Explicit and easy to audit/edit.
 */
export const CURATED_TRUTH_BY_TSP: Record<string, TspCuratedTruth> = {
  'tsp-santrack-internacional': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    riskIndex: 73,
    entityMock: 2310,
  },
  'tsp-tecnologistik-occidente': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    riskIndex: 58,
    entityMock: 1280,
  },
  'tsp-ontracking-remote-metrics': {
    eventProfile: 'event_standard',
    dataProfile: 'data_standard',
    riskIndex: 65,
    entityMock: 1540,
  },
  'tsp-skymeduza': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    riskIndex: 52,
    entityMock: 980,
  },
  'tsp-skyguardian': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    riskIndex: 56,
    entityMock: 1110,
  },
  'tsp-phoenix-telematics': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    riskIndex: 60,
    entityMock: 1235,
  },
  'tsp-tecno-gps': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    riskIndex: 71,
    entityMock: 2015,
  },
  'tsp-itrack': {
    eventProfile: 'event_standard',
    dataProfile: 'data_standard',
    riskIndex: 68,
    entityMock: 1780,
  },
  'tsp-ttc-total-tracking-center': {
    eventProfile: 'event_full',
    dataProfile: 'data_full',
    riskIndex: 76,
    entityMock: 2490,
  },
  'tsp-ads-logic': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    riskIndex: 49,
    entityMock: 890,
  },
  'tsp-autotracking-world-connect': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    riskIndex: 74,
    entityMock: 2150,
  },
  'tsp-tecnologia-servicios-y-vision': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    riskIndex: 57,
    entityMock: 1190,
  },
  'tsp-navman-wireless-mexico': {
    eventProfile: 'event_core',
    dataProfile: 'data_core',
    riskIndex: 53,
    entityMock: 1040,
  },
  'tsp-hunter': {
    eventProfile: 'event_full',
    dataProfile: 'data_full',
    riskIndex: 81,
    entityMock: 2670,
  },
  'tsp-gorilamx': {
    eventProfile: 'event_core',
    dataProfile: 'data_standard',
    riskIndex: 55,
    entityMock: 1155,
  },
  'tsp-atlantida': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    riskIndex: 50,
    entityMock: 940,
  },
  'tsp-localizadores-gts': {
    eventProfile: 'event_standard',
    dataProfile: 'data_standard',
    riskIndex: 63,
    entityMock: 1395,
  },
  'tsp-blac': {
    eventProfile: 'event_min',
    dataProfile: 'data_core',
    riskIndex: 47,
    entityMock: 760,
  },
  'tsp-motorlink': {
    eventProfile: 'event_standard',
    dataProfile: 'data_full',
    riskIndex: 70,
    entityMock: 1860,
  },
}

type ScalarCell = { kind: 'scalar'; value: number | null }
type ExpandableCell = {
  kind: 'expandable'
  summary: number
  groups: { groupId: string; values: boolean[] }[]
}

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

export const CURATED_RISK_INDEX_VALUES: Record<string, ScalarCell> =
  Object.fromEntries(
    Object.entries(CURATED_TRUTH_BY_TSP).map(([tspId, v]) => [
      tspId,
      { kind: 'scalar', value: v.riskIndex },
    ]),
  )

export const CURATED_ENTITY_MOCK_VALUES: Record<string, ScalarCell> =
  Object.fromEntries(
    Object.entries(CURATED_TRUTH_BY_TSP).map(([tspId, v]) => [
      tspId,
      { kind: 'scalar', value: v.entityMock },
    ]),
  )

/**
 * Explicit placeholder: integration formula is not approved yet.
 * We intentionally publish nulls instead of synthetic percentages.
 */
export const INTEGRATION_UNDEFINED_PLACEHOLDER_VALUES: Record<string, ScalarCell> =
  Object.fromEntries(DASHBOARD_TSPS.map((tsp) => [tsp.id, { kind: 'scalar', value: null }]))
