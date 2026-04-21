import type { TspComparisonResponse } from '../contracts/tspComparison'
import type { MetricRow } from '../types/dashboard'

type TspLike = {
  id: string
  name: string
  integrationStatus?: 'pending_integration' | 'integrated'
}

function isPendingIntegration(tsp: TspLike): boolean {
  return tsp.integrationStatus === 'pending_integration'
}

/** Scalar metric id for Provider Readiness Score (used for column order only; formula unchanged). */
export const PROVIDER_READINESS_METRIC_ID = 'metric-risk-index'

export function readProviderReadinessScores(metrics: MetricRow[]): Record<string, number | null> {
  const m = metrics.find(
    (x) => x.id === PROVIDER_READINESS_METRIC_ID && x.type === 'scalar',
  )
  if (!m || m.type !== 'scalar') {
    return {}
  }
  const out: Record<string, number | null> = {}
  for (const [tspId, cell] of Object.entries(m.values)) {
    out[tspId] = cell.value
  }
  return out
}

function isFiniteScore(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * Column order: highest Provider Readiness Score first; equal scores → name A–Z;
 * null/unavailable scores last; among those → name A–Z.
 */
export function sortDashboardTsps<T extends TspLike>(
  tsps: T[],
  readinessByTspId: Record<string, number | null>,
): T[] {
  return [...tsps].sort((a, b) => {
    const pa = readinessByTspId[a.id]
    const pb = readinessByTspId[b.id]
    const aHas = isFiniteScore(pa)
    const bHas = isFiniteScore(pb)
    if (aHas !== bHas) {
      return aHas ? -1 : 1
    }
    if (aHas && bHas) {
      const diff = pb - pa
      if (diff !== 0) {
        return diff > 0 ? 1 : -1
      }
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

function buildUnavailableExpandableCell(structure: {
  groups: { id: string; labels: { id: string }[] }[]
}): {
  kind: 'expandable'
  summary: null
  groups: { groupId: string; values: null[] }[]
} {
  return {
    kind: 'expandable',
    summary: null,
    groups: structure.groups.map((g) => ({
      groupId: g.id,
      values: g.labels.map(() => null),
    })),
  }
}

/** Mirrors server: pending columns must not surface curated/mock metric values in the UI. */
export function applyPendingIntegrationUnavailableState(
  payload: TspComparisonResponse,
): void {
  const pendingIds = new Set(
    payload.tsps.filter(isPendingIntegration).map((t) => t.id),
  )
  if (pendingIds.size === 0) {
    return
  }

  for (const metric of payload.metrics) {
    for (const tspId of pendingIds) {
      if (metric.type === 'scalar') {
        metric.values[tspId] = { kind: 'scalar', value: null }
      } else if (metric.type === 'expandable') {
        metric.values[tspId] = buildUnavailableExpandableCell(metric.structure)
      }
    }
  }
}

export function finalizeDashboardPayload(model: TspComparisonResponse): void {
  const scores = readProviderReadinessScores(model.metrics)
  model.tsps = sortDashboardTsps(model.tsps, scores)
  applyPendingIntegrationUnavailableState(model)
}
