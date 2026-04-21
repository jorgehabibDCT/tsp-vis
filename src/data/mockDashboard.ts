import type { TspComparisonResponse } from '../contracts/tspComparison'
import { MOCK_DASHBOARD_TSPS } from './dashboardTsps'
import { TSP_PROVIDER_META } from './tspProviderMeta'

type MatrixLabel = { id: string; name: string }
type MatrixGroup = { id: string; title: string; labels: MatrixLabel[] }

const tsps = MOCK_DASHBOARD_TSPS.map((t) => ({
  ...t,
  ...TSP_PROVIDER_META[t.id],
}))

const colCount = tsps.length

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

/** Deterministic pseudo-random scalars per column index (fallback mock only). */
function padScalarPattern(base: number[], len: number): number[] {
  const out: number[] = []
  for (let i = 0; i < len; i++) {
    out.push(base[i % base.length] ?? 0)
  }
  return out
}

const eventStrength = padScalarPattern([84, 67, 72, 58, 63, 60, 74, 70, 82, 55, 78, 66, 64, 88, 61, 57, 69, 52, 73], colCount)
const dataStrength = padScalarPattern([92, 78, 81, 75, 72, 76, 88, 84, 90, 69, 87, 73, 68, 94, 70, 66, 80, 64, 85], colCount)
const integrationValues = padScalarPattern([89, 74, 77, 69, 71, 73, 82, 79, 86, 65, 84, 70, 68, 90, 72, 67, 76, 63, 80], colCount)
const entityValues = padScalarPattern([2310, 1280, 1540, 980, 1110, 1235, 2015, 1780, 2490, 890, 2150, 1190, 1040, 2670, 1155, 940, 1395, 760, 1860], colCount)

function buildScalarRow(values: Array<number | null>) {
  return Object.fromEntries(
    tsps.map((tsp, index) => [tsp.id, { kind: 'scalar' as const, value: values[index] ?? null }]),
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

function countTotalLabels(groups: MatrixGroup[]): number {
  return groups.reduce((acc, g) => acc + g.labels.length, 0)
}

function confidenceModifier(conf: string | undefined): number | null {
  if (conf === 'confident') {
    return 1
  }
  if (conf === 'plausible_pending') {
    return 0.85
  }
  return null
}

function clamp0to100(v: number): number {
  return Math.max(0, Math.min(100, v))
}

const eventSupportValues = buildSupportMatrix(eventGroups, eventStrength)
const dataRichnessValues = buildSupportMatrix(dataRichnessGroups, dataStrength)
const totalEventLabels = countTotalLabels(eventGroups)
const totalRichnessLabels = countTotalLabels(dataRichnessGroups)

const maxEntitiesAmongIntegrated = tsps.reduce((max, tsp, idx) => {
  if (tsp.integrationStatus !== 'integrated') {
    return max
  }
  const entities = entityValues[idx] ?? null
  if (entities === null || !Number.isFinite(entities) || entities <= 0) {
    return max
  }
  return Math.max(max, entities)
}, 0)

function computeReadinessValue(tspIndex: number): number | null {
  const tsp = tsps[tspIndex]
  if (!tsp || tsp.integrationStatus !== 'integrated' || !tsp.providerSlug) {
    return null
  }
  const modifier = confidenceModifier(tsp.providerMappingConfidence)
  if (modifier === null || maxEntitiesAmongIntegrated <= 0) {
    return null
  }

  const eventSummary = eventSupportValues[tsp.id]?.summary ?? null
  const richnessSummary = dataRichnessValues[tsp.id]?.summary ?? null
  const entities = entityValues[tspIndex] ?? null
  if (
    eventSummary === null ||
    richnessSummary === null ||
    entities === null ||
    entities < 0 ||
    totalEventLabels <= 0 ||
    totalRichnessLabels <= 0
  ) {
    return null
  }

  const breadthScore = (eventSummary / totalEventLabels) * 100
  const richnessScore = (richnessSummary / totalRichnessLabels) * 100
  const scaleScore = Math.sqrt(entities / maxEntitiesAmongIntegrated) * 100
  const matrixScore = Math.sqrt(breadthScore * richnessScore)
  const baseScore = 0.7 * matrixScore + 0.3 * scaleScore
  return clamp0to100(Math.round(baseScore * modifier))
}

const riskIndexValues = tsps.map((_tsp, tspIndex) => computeReadinessValue(tspIndex))

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
      values: eventSupportValues,
    },
    {
      id: 'metric-data-richness',
      label: 'Event Data Fields / Data Richness',
      type: 'expandable',
      kind: 'support',
      structure: { groups: dataRichnessGroups },
      values: dataRichnessValues,
    },
    {
      id: 'metric-risk-index',
      label: 'Provider Readiness Score',
      type: 'scalar',
      kind: 'score',
      values: buildScalarRow(riskIndexValues),
    },
  ],
}
