import type { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { DASHBOARD_TSPS } from '../config/dashboardMatrixConfig.js'
import {
  DATA_RICHNESS_LABEL_IDS,
  scoreDataRichnessField,
} from '../config/dataRichnessFieldWeights.js'

export type DashboardPayload = typeof mockTspComparisonResponse

type ExpandableCellLike = {
  kind: 'expandable'
  summary: number | null
  eventLabelRollup?: { supportedCount: number; totalLabels: number }
  groups: { groupId: string; values: (number | boolean | null)[] }[]
}

function averageAvailableNumericLabelPercentages(
  cell: ExpandableCellLike,
): number | null {
  const nums: number[] = []
  for (const g of cell.groups) {
    for (const v of g.values) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        nums.push(v)
      }
    }
  }
  if (nums.length === 0) {
    return null
  }
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length
  return Number.isFinite(mean) ? mean : null
}

function countEventLabelTotal(metric: {
  structure: { groups: { labels: unknown[] }[] }
}): number {
  return metric.structure.groups.reduce((a, g) => a + g.labels.length, 0)
}

function getDataRichnessSum(cell: ExpandableCellLike | undefined): number {
  if (!cell || cell.kind !== 'expandable') {
    return 0
  }
  const group = cell.groups.find((g) => g.groupId === 'grp-data-richness')
  const values = group?.values ?? []
  let sum = 0
  for (let i = 0; i < DATA_RICHNESS_LABEL_IDS.length; i++) {
    const id = DATA_RICHNESS_LABEL_IDS[i]!
    const supported = values[i] === true
    sum += scoreDataRichnessField(id, supported)
  }
  return sum
}

function confidenceModifier(
  c: 'confident' | 'plausible_pending' | 'unmapped' | undefined,
): number | null {
  if (c === 'confident') {
    return 1
  }
  if (c === 'plausible_pending') {
    return 0.85
  }
  return null
}

const RICHNESS_DENOM = 5

/**
 * Derived 0–100 score from entities, event breadth/depth, data richness, mapping confidence.
 * Id `metric-risk-index` kept for contract stability; label is "Provider Opportunity Score".
 */
export function applyOpportunityScoresToPayload(payload: DashboardPayload): void {
  const riskMetric = payload.metrics.find((m) => m.id === 'metric-risk-index')
  if (!riskMetric || riskMetric.type !== 'scalar') {
    return
  }
  const entityMetric = payload.metrics.find((m) => m.id === 'metric-entities')
  const eventMetric = payload.metrics.find((m) => m.id === 'metric-events-alarms')
  const drMetric = payload.metrics.find((m) => m.id === 'metric-data-richness')
  if (
    !entityMetric ||
    entityMetric.type !== 'scalar' ||
    !eventMetric ||
    eventMetric.type !== 'expandable' ||
    !drMetric ||
    drMetric.type !== 'expandable'
  ) {
    return
  }

  const integrated = payload.tsps.filter(
    (t) => t.integrationStatus !== 'pending_integration',
  )
  const entityNums = integrated
    .map((t) => {
      const v = entityMetric.values[t.id]?.value
      return v != null && Number.isFinite(v) && v >= 0 ? v : null
    })
    .filter((v): v is number => v != null)
  const maxEntities = entityNums.length > 0 ? Math.max(...entityNums) : 0

  const eventTotal = countEventLabelTotal(eventMetric)
  const values = riskMetric.values as Record<
    string,
    { kind: 'scalar'; value: number | null }
  >

  for (const tsp of payload.tsps) {
    if (tsp.integrationStatus === 'pending_integration') {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }

    const conf =
      tsp.providerMappingConfidence ??
      DASHBOARD_TSPS.find((d) => d.id === tsp.id)?.providerMappingConfidence
    const mod = confidenceModifier(conf)
    if (mod === null) {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }

    const ent = entityMetric.values[tsp.id]?.value
    if (ent === null || !Number.isFinite(ent) || ent < 0) {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }

    const rawEvent = eventMetric.values[tsp.id]
    const eventCell = rawEvent as ExpandableCellLike | undefined
    if (
      !eventCell ||
      eventCell.kind !== 'expandable' ||
      eventCell.summary === null ||
      Number.isNaN(eventCell.summary)
    ) {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }

    const total = eventCell.eventLabelRollup?.totalLabels ?? eventTotal
    const supported =
      eventCell.eventLabelRollup?.supportedCount ?? eventCell.summary
    if (total <= 0) {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }
    const breadthScore = (supported / total) * 100

    const depthAvg = averageAvailableNumericLabelPercentages(eventCell)
    if (depthAvg === null || !Number.isFinite(depthAvg)) {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }
    const depthScore = depthAvg

    const drCell = drMetric.values[tsp.id] as ExpandableCellLike | undefined
    const richSum = getDataRichnessSum(drCell)
    const richnessScore = (richSum / RICHNESS_DENOM) * 100

    if (maxEntities <= 0) {
      values[tsp.id] = { kind: 'scalar', value: null }
      continue
    }
    const scaleScore = Math.sqrt(ent / maxEntities) * 100

    const base =
      0.3 * breadthScore +
      0.3 * depthScore +
      0.25 * richnessScore +
      0.15 * scaleScore
    const final = Math.round(base * mod)
    values[tsp.id] = {
      kind: 'scalar',
      value: Math.min(100, Math.max(0, final)),
    }
  }
}
