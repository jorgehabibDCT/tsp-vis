type MatrixLabel = { id: string; name: string }
type MatrixGroup = { id: string; title: string; labels: MatrixLabel[] }

export type DashboardTsp = {
  id: string
  name: string
  logoUrl: null
  providerSlug: string | null
}

export const DASHBOARD_TSPS: DashboardTsp[] = [
  { id: 'tsp-santrack-internacional', name: 'SANTRACK INTERNACIONAL', logoUrl: null, providerSlug: 'santrack' },
  { id: 'tsp-tecnologistik-occidente', name: 'TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX)', logoUrl: null, providerSlug: null },
  { id: 'tsp-ontracking-remote-metrics', name: 'ONTRACKING GPS REMOTE METRICS', logoUrl: null, providerSlug: null },
  { id: 'tsp-skymeduza', name: 'SKYMEDUZA', logoUrl: null, providerSlug: null },
  { id: 'tsp-skyguardian', name: 'SKYGUARDIAN', logoUrl: null, providerSlug: null },
  { id: 'tsp-phoenix-telematics', name: 'PHOENIX TELEMATICS', logoUrl: null, providerSlug: null },
  { id: 'tsp-tecno-gps', name: 'TECNO-GPS', logoUrl: null, providerSlug: null },
  { id: 'tsp-itrack', name: 'ITRACK', logoUrl: null, providerSlug: null },
  { id: 'tsp-ttc-total-tracking-center', name: 'TTC TOTAL TRACKING CENTER', logoUrl: null, providerSlug: null },
  { id: 'tsp-ads-logic', name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO', logoUrl: null, providerSlug: null },
  { id: 'tsp-autotracking-world-connect', name: 'AUTOTRACKING WORLD CONNECT', logoUrl: null, providerSlug: 'autotracking' },
  { id: 'tsp-tecnologia-servicios-y-vision', name: 'TECNOLOGÍA SERVICIOS Y VISION', logoUrl: null, providerSlug: null },
  { id: 'tsp-navman-wireless-mexico', name: 'NAVMAN WIRELESS DE MÉXICO', logoUrl: null, providerSlug: null },
  { id: 'tsp-hunter', name: 'HUNTER', logoUrl: null, providerSlug: 'hunter' },
  { id: 'tsp-gorilamx', name: 'GORILAMX', logoUrl: null, providerSlug: null },
  { id: 'tsp-atlantida', name: 'ATLANTIDA', logoUrl: null, providerSlug: null },
  { id: 'tsp-localizadores-gts', name: 'LOCALIZADORES GTS', logoUrl: null, providerSlug: null },
  { id: 'tsp-blac', name: 'BLAC', logoUrl: null, providerSlug: null },
  { id: 'tsp-motorlink', name: 'MOTORLINK', logoUrl: null, providerSlug: null },
]

export const EVENT_ALARM_GROUPS: MatrixGroup[] = [
  {
    id: 'grp-tracking-telematics',
    title: 'Tracking / Telematics',
    labels: [
      'trckpnt',
      'prdtst',
      'ignon',
      'ignoff',
      'panic',
      'pwrloss',
      'pwrrstd',
      'lwbatt',
      'stt',
      'stp',
    ].map((id) => ({ id, name: id })),
  },
  {
    id: 'grp-driving-behavior',
    title: 'Driving Behavior',
    labels: [
      'spd',
      'spdend',
      'idl',
      'idlend',
      'posac',
      'negac',
      'aggr',
      'aggdrvcrv',
      'crnrleft',
      'crnrright',
      'coldet',
      'crash',
      'agglnchng',
    ].map((id) => ({ id, name: id })),
  },
  {
    id: 'grp-adas-dms',
    title: 'ADAS & DMS',
    labels: [
      'mblypdfcw',
      'mblyhdwrn',
      'mblyrldw',
      'mblylldw',
      'mblypddng',
      'mblyfcw',
      'adastlgt',
      'mblyspd',
      'mdasfvsa',
      'mdasfpw',
      'mblybrkon',
      'mblywprs',
      'ftgwarning',
      'ftgalarm',
      'ftgdrvmis',
      'ftgdistrct',
      'ftgcamphon',
      'ftgnosblt',
      'ftgcamsmok',
      'ftgcamblck',
      'ftgfoodrnk',
    ].map((id) => ({ id, name: id })),
  },
]

export const DATA_RICHNESS_GROUPS: MatrixGroup[] = [
  {
    id: 'grp-data-richness',
    title: 'Event Data Fields / Data Richness',
    labels: [
      { id: 'gps-satellites', name: 'GPS Satellites' },
      { id: 'dop', name: 'DOP' },
      { id: 'instant-acceleration', name: 'Instant acceleration' },
      { id: 'engine-odometer', name: 'Engine odometer' },
      { id: 'engine-hourmeter', name: 'Engine hourmeter' },
    ],
  },
]

const EVENT_SUPPORT_STRENGTH = [
  84, 67, 72, 58, 63, 60, 74, 70, 82, 55, 78, 66, 64, 88, 61, 57, 69, 52, 73,
]
const DATA_RICHNESS_STRENGTH = [
  92, 78, 81, 75, 72, 76, 88, 84, 90, 69, 87, 73, 68, 94, 70, 66, 80, 64, 85,
]
const RISK_INDEX_VALUES = [
  73, 58, 65, 52, 56, 60, 71, 68, 76, 49, 74, 57, 53, 81, 55, 50, 63, 47, 70,
]
const INTEGRATION_VALUES = [
  89, 74, 77, 69, 71, 73, 82, 79, 86, 65, 84, 70, 68, 90, 72, 67, 76, 63, 80,
]
const MOCK_ENTITY_VALUES = [
  2310, 1280, 1540, 980, 1110, 1235, 2015, 1780, 2490, 890, 2150, 1190, 1040, 2670, 1155, 940, 1395, 760, 1860,
]

function supportEnabled(
  strength: number,
  tspIndex: number,
  groupIndex: number,
  labelIndex: number,
): boolean {
  const score = (tspIndex * 17 + groupIndex * 11 + labelIndex * 13) % 100
  return score < strength
}

export function buildSupportMatrixValues(
  groups: MatrixGroup[],
  strengths: number[],
): Record<string, { kind: 'expandable'; summary: number; groups: { groupId: string; values: boolean[] }[] }> {
  const out: Record<
    string,
    { kind: 'expandable'; summary: number; groups: { groupId: string; values: boolean[] }[] }
  > = {}
  DASHBOARD_TSPS.forEach((tsp, tspIndex) => {
    const strength = strengths[tspIndex] ?? 0
    let summary = 0
    const groupValues = groups.map((group, groupIndex) => {
      const values = group.labels.map((_label, labelIndex) => {
        const enabled = supportEnabled(strength, tspIndex, groupIndex, labelIndex)
        if (enabled) {
          summary += 1
        }
        return enabled
      })
      return { groupId: group.id, values }
    })
    out[tsp.id] = {
      kind: 'expandable',
      summary,
      groups: groupValues,
    }
  })
  return out
}

export function buildScalarValues(
  values: number[],
): Record<string, { kind: 'scalar'; value: number }> {
  const out: Record<string, { kind: 'scalar'; value: number }> = {}
  DASHBOARD_TSPS.forEach((tsp, index) => {
    out[tsp.id] = { kind: 'scalar', value: values[index] ?? 0 }
  })
  return out
}

export function buildProviderSlugDefaults(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tsp of DASHBOARD_TSPS) {
    if (tsp.providerSlug) {
      out[tsp.id] = tsp.providerSlug
    }
  }
  return out
}

export const DASHBOARD_EVENT_SUPPORT_VALUES = buildSupportMatrixValues(
  EVENT_ALARM_GROUPS,
  EVENT_SUPPORT_STRENGTH,
)

export const DASHBOARD_DATA_RICHNESS_VALUES = buildSupportMatrixValues(
  DATA_RICHNESS_GROUPS,
  DATA_RICHNESS_STRENGTH,
)

export const DASHBOARD_RISK_INDEX_VALUES = buildScalarValues(RISK_INDEX_VALUES)
export const DASHBOARD_INTEGRATION_VALUES = buildScalarValues(INTEGRATION_VALUES)
export const DASHBOARD_MOCK_ENTITY_VALUES = buildScalarValues(MOCK_ENTITY_VALUES)
