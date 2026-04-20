import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { resolveDashboardChild } from '../config/eventLabelGroups.js'
import {
  logEventLabelVehicleCoverageSample,
  logEventLabelUnmappedTotals,
} from './dashboardInfluxDiagnostics.js'

type DashboardPayload = typeof mockTspComparisonResponse

type MutableExpandableCell = {
  kind: 'expandable'
  summary: number
  eventLabelRollup?: {
    supportedCount: number
    totalLabels: number
    aggregatePct: number
  }
  groups: { groupId: string; values: number[] }[]
}

/**
 * When several raw Influx label strings map to the same matrix child, distinct-vid counts
 * per raw string are not additive (unknown overlap). Use the max count as a conservative
 * lower bound on union size for the threshold check.
 */
function aggregateDistinctVehiclesByMatrixChild(
  rawCounts: Record<string, number>,
): Map<string, number> {
  const byChild = new Map<string, number>()
  for (const [raw, n] of Object.entries(rawCounts)) {
    const ct = Number(n)
    if (!Number.isFinite(ct) || ct <= 0) {
      continue
    }
    const ref = resolveDashboardChild(raw)
    if (!ref) {
      continue
    }
    const prev = byChild.get(ref.childLabelId) ?? 0
    byChild.set(ref.childLabelId, Math.max(prev, ct))
  }
  return byChild
}

/**
 * For live-mapped TSPs, sets each Event labels / Alarms Info cell to **coverage_pct** =
 * `round((vehicles_with_label / total_entities) * 100)` when `total_entities > 0`, else `0`
 * (distinct `vid`, same window as entities). Parent row gets `supported_count / total_labels ·
 * aggregate_pct` where `aggregate_pct` is the mean of per-label percentages.
 * TSPs without a provider slug keep the curated mock matrix unchanged.
 */
export function mergeEventLabelVehicleCoverageIntoPayload(
  payload: DashboardPayload,
  entityCountByProvider: Record<string, number>,
  labelVidCountByProvider: Record<string, Record<string, number>>,
  slugByTspId: Record<string, string | null>,
  tspNameById: Record<string, string>,
): void {
  const metric = payload.metrics.find((m) => m.id === 'metric-events-alarms')
  if (!metric || metric.type !== 'expandable') {
    return
  }

  const structure = metric.structure.groups
  const valuesByTsp = metric.values as unknown as Record<
    string,
    MutableExpandableCell
  >

  logEventLabelUnmappedTotals(labelVidCountByProvider, slugByTspId)
  logEventLabelVehicleCoverageSample(
    structure,
    slugByTspId,
    tspNameById,
    entityCountByProvider,
    labelVidCountByProvider,
    24,
  )

  for (const tsp of payload.tsps) {
    const slug = slugByTspId[tsp.id]
    const cell = valuesByTsp[tsp.id]
    if (!cell || cell.kind !== 'expandable') {
      continue
    }

    if (!slug) {
      continue
    }

    const totalEntities = entityCountByProvider[slug] ?? 0
    const rawByLabel = labelVidCountByProvider[slug] ?? {}
    const vehiclesByChild = aggregateDistinctVehiclesByMatrixChild(rawByLabel)

    const flatPcts: number[] = []
    const groupsOut = structure.map((g) => {
      const values = g.labels.map((l) => {
        const vehiclesWith = vehiclesByChild.get(l.id) ?? 0
        const coveragePct =
          totalEntities > 0 ? (vehiclesWith / totalEntities) * 100 : 0
        const rounded = Math.round(coveragePct)
        flatPcts.push(rounded)
        return rounded
      })
      return { groupId: g.id, values }
    })

    const totalLabels = flatPcts.length
    const supportedCount = flatPcts.filter((p) => p > 0).length
    const aggregatePct =
      totalLabels > 0
        ? flatPcts.reduce((a, b) => a + b, 0) / totalLabels
        : 0

    cell.summary = supportedCount
    cell.eventLabelRollup = {
      supportedCount,
      totalLabels,
      aggregatePct,
    }
    cell.groups = groupsOut
  }
}
