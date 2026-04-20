import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { getEventLabelCoverageThreshold } from '../lib/influxEnv.js'
import { resolveDashboardChild } from '../config/eventLabelGroups.js'
import {
  logEventLabelVehicleCoverageSample,
  logEventLabelUnmappedTotals,
} from './dashboardInfluxDiagnostics.js'

type DashboardPayload = typeof mockTspComparisonResponse

type MutableExpandableCell = {
  kind: 'expandable'
  summary: number
  groups: { groupId: string; values: boolean[] }[]
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
 * For live-mapped TSPs, sets each Event labels / Alarms Info cell to **supported** only when
 * `(vehicles_with_label / total_entities) >= threshold` (distinct `vid`, same window).
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

  const threshold = getEventLabelCoverageThreshold()
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
    threshold,
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

    let summary = 0
    const groupsOut = structure.map((g) => {
      const values = g.labels.map((l) => {
        const vehiclesWith = vehiclesByChild.get(l.id) ?? 0
        const ratio =
          totalEntities > 0 ? vehiclesWith / totalEntities : 0
        const supported =
          totalEntities > 0 && ratio >= threshold
        if (supported) {
          summary += 1
        }
        return supported
      })
      return { groupId: g.id, values }
    })

    cell.summary = summary
    cell.groups = groupsOut
  }
}
