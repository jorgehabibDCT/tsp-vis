import type { TspComparisonResponse } from '../contracts/tspComparison'

type MatrixLabel = { id: string; name: string }
type MatrixGroup = { id: string; title: string; labels: MatrixLabel[] }

const tsps = [
  { id: 'tsp-santrack-internacional', name: 'SANTRACK INTERNACIONAL', logoUrl: 'https://gruposantrack.com/wp-content/uploads/2019/07/Santrak-texto-gde.png' },
  { id: 'tsp-tecnologistik-occidente', name: 'TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX)', logoUrl: 'https://www.info-trax.com/lp-infotrax-deteccion-de-jammer/images/logo.png' },
  { id: 'tsp-ontracking-remote-metrics', name: 'ONTRACKING GPS REMOTE METRICS', logoUrl: 'https://portalv3.ontracking.com.mx/ontlogo.svg' },
  { id: 'tsp-skymeduza', name: 'SKYMEDUZA', logoUrl: 'https://skymeduza.com/images/sky-logo2.png' },
  { id: 'tsp-skyguardian', name: 'SKYGUARDIAN', logoUrl: 'https://skyguardian.us/images/simplecms/logo_logotipo-200w.jpg' },
  { id: 'tsp-phoenix-telematics', name: 'PHOENIX TELEMATICS', logoUrl: null },
  { id: 'tsp-tecno-gps', name: 'TECNO-GPS', logoUrl: null },
  { id: 'tsp-itrack', name: 'ITRACK', logoUrl: null },
  { id: 'tsp-ttc-total-tracking-center', name: 'TTC TOTAL TRACKING CENTER', logoUrl: null },
  { id: 'tsp-ads-logic', name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO', logoUrl: null },
  { id: 'tsp-autotracking-world-connect', name: 'AUTOTRACKING WORLD CONNECT', logoUrl: null },
  { id: 'tsp-tecnologia-servicios-y-vision', name: 'TECNOLOGÍA SERVICIOS Y VISION', logoUrl: null },
  { id: 'tsp-navman-wireless-mexico', name: 'NAVMAN WIRELESS DE MÉXICO', logoUrl: null },
  { id: 'tsp-hunter', name: 'HUNTER', logoUrl: null },
  { id: 'tsp-gorilamx', name: 'GORILAMX', logoUrl: null },
  { id: 'tsp-atlantida', name: 'ATLANTIDA', logoUrl: null },
  { id: 'tsp-localizadores-gts', name: 'LOCALIZADORES GTS', logoUrl: null },
  { id: 'tsp-blac', name: 'BLAC', logoUrl: null },
  { id: 'tsp-motorlink', name: 'MOTORLINK', logoUrl: null },
]

const eventGroups: MatrixGroup[] = [
  {
    id: 'grp-tracking-telematics',
    title: 'Tracking / Telematics',
    labels: ['trckpnt', 'prdtst', 'ignon', 'ignoff', 'panic', 'pwrloss', 'pwrrstd', 'lwbatt', 'stp'].map((id) => ({ id, name: id })),
  },
  {
    id: 'grp-driving-behavior',
    title: 'Driving Behavior',
    labels: ['spd', 'spdend', 'idl', 'idlend', 'posac', 'negac', 'aggr', 'aggdrvcrv', 'crnrleft', 'crnrright', 'coldet', 'crash', 'agglnchng'].map((id) => ({ id, name: id })),
  },
  {
    id: 'grp-adas-dms',
    title: 'ADAS & DMS',
    labels: ['mblypdfcw', 'mblyhdwrn', 'mblyrldw', 'mblylldw', 'mblypddng', 'mblyfcw', 'adastlgt', 'mblyspd', 'mdasfvsa', 'mdasfpw', 'mblybrkon', 'mblywprs', 'ftgwarning', 'ftgalarm', 'ftgdrvmis', 'ftgdistrct', 'ftgcamphon', 'ftgnosblt', 'ftgcamsmok', 'ftgcamblck', 'ftgfoodrnk'].map((id) => ({ id, name: id })),
  },
]

const dataRichnessGroups: MatrixGroup[] = [
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

const eventStrength = [84, 67, 72, 58, 63, 60, 74, 70, 82, 55, 78, 66, 64, 88, 61, 57, 69, 52, 73]
const dataStrength = [92, 78, 81, 75, 72, 76, 88, 84, 90, 69, 87, 73, 68, 94, 70, 66, 80, 64, 85]
const integrationValues = [89, 74, 77, 69, 71, 73, 82, 79, 86, 65, 84, 70, 68, 90, 72, 67, 76, 63, 80]
const entityValues = [2310, 1280, 1540, 980, 1110, 1235, 2015, 1780, 2490, 890, 2150, 1190, 1040, 2670, 1155, 940, 1395, 760, 1860]
const riskIndexValues = [73, 58, 65, 52, 56, 60, 71, 68, 76, 49, 74, 57, 53, 81, 55, 50, 63, 47, 70]

function buildScalarRow(values: number[]) {
  return Object.fromEntries(
    tsps.map((tsp, index) => [tsp.id, { kind: 'scalar' as const, value: values[index] ?? 0 }]),
  )
}

function supportEnabled(strength: number, tspIndex: number, groupIndex: number, labelIndex: number): boolean {
  return ((tspIndex * 17 + groupIndex * 11 + labelIndex * 13) % 100) < strength
}

function buildSupportMatrix(groups: MatrixGroup[], strengths: number[]) {
  return Object.fromEntries(
    tsps.map((tsp, tspIndex) => {
      const strength = strengths[tspIndex] ?? 0
      let summary = 0
      const expandedGroups = groups.map((group, groupIndex) => {
        const values = group.labels.map((_label, labelIndex) => {
          const enabled = supportEnabled(strength, tspIndex, groupIndex, labelIndex)
          if (enabled) {
            summary += 1
          }
          return enabled
        })
        return { groupId: group.id, values }
      })
      return [tsp.id, { kind: 'expandable' as const, summary, groups: expandedGroups }]
    }),
  )
}

/**
 * Static fallback payload for local dev and when `VITE_API_URL` is unset.
 * Shape matches `TspComparisonResponse` / future GET dashboard response.
 */
export const mockTspComparisonResponse: TspComparisonResponse = {
  tsps,
  metrics: [
    {
      id: 'metric-entities',
      label: 'Number of Entities (Vehicles or Assets)',
      type: 'scalar',
      kind: 'integer',
      values: buildScalarRow(entityValues),
    },
    {
      id: 'metric-integration',
      label: 'Integration %',
      type: 'scalar',
      kind: 'percent',
      values: buildScalarRow(integrationValues),
    },
    {
      id: 'metric-events-alarms',
      label: 'Event labels / Alarms Info',
      type: 'expandable',
      kind: 'support',
      structure: { groups: eventGroups },
      values: buildSupportMatrix(eventGroups, eventStrength),
    },
    {
      id: 'metric-data-richness',
      label: 'Event Data Fields / Data Richness',
      type: 'expandable',
      kind: 'support',
      structure: { groups: dataRichnessGroups },
      values: buildSupportMatrix(dataRichnessGroups, dataStrength),
    },
    {
      id: 'metric-risk-index',
      label: 'Risk Index Enablement',
      type: 'scalar',
      kind: 'score',
      values: buildScalarRow(riskIndexValues),
    },
  ],
}
