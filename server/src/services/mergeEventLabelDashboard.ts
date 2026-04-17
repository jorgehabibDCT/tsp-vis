import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { resolveDashboardChild } from '../config/eventLabelGroups.js'

type DashboardPayload = typeof mockTspComparisonResponse

type MutableExpandableCell = {
  kind: 'expandable'
  summary: number | null
  groups: { groupId: string; values: (number | null)[] }[]
}

/**
 * Fills `metric-events-alarms` from Influx counts (`provider` slug -> raw label signal -> count).
 * Parent `summary` is the sum of all **mapped** child cell values (roll-up of displayed rows).
 */
export function mergeEventLabelCountsIntoPayload(
  payload: DashboardPayload,
  countsByProvider: Record<string, Record<string, number>>,
  slugByTspId: Record<string, string>,
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

  for (const tsp of payload.tsps) {
    const slug = slugByTspId[tsp.id]
    const cell = valuesByTsp[tsp.id]
    if (!cell || cell.kind !== 'expandable') {
      continue
    }

    if (!slug) {
      cell.summary = null
      cell.groups = structure.map((g) => ({
        groupId: g.id,
        values: g.labels.map(() => null as number | null),
      }))
      continue
    }

    const groupsOut: MutableExpandableCell['groups'] = structure.map((g) => ({
      groupId: g.id,
      values: g.labels.map(() => 0 as number | null),
    }))

    const labelMap = countsByProvider[slug] ?? {}
    let sum = 0
    for (const [signal, rawN] of Object.entries(labelMap)) {
      const n = Number(rawN)
      if (!Number.isFinite(n) || n <= 0) {
        continue
      }
      const ref = resolveDashboardChild(signal)
      if (!ref) {
        continue
      }
      const gi = structure.findIndex((g) => g.id === ref.groupId)
      if (gi === -1) {
        continue
      }
      const li = structure[gi].labels.findIndex((l) => l.id === ref.childLabelId)
      if (li === -1) {
        continue
      }
      const slot = groupsOut[gi].values[li]
      const prev = typeof slot === 'number' ? slot : 0
      groupsOut[gi].values[li] = prev + n
      sum += n
    }

    cell.summary = sum
    cell.groups = groupsOut
  }
}
