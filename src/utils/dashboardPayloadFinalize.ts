import type { TspComparisonResponse } from '../contracts/tspComparison'
import { applyOpportunityScoresToPayload } from '../insights/providerOpportunityScore'

type TspLike = {
  id: string
  name: string
  integrationStatus?: 'pending_integration' | 'integrated'
}

function isPendingIntegration(tsp: TspLike): boolean {
  return tsp.integrationStatus === 'pending_integration'
}

/**
 * Same ordering rule as `server/src/utils/dashboardPayloadFinalize.ts`:
 * integrated columns first (A–Z by display name), then pending integration (A–Z).
 */
export function sortDashboardTsps<T extends TspLike>(tsps: T[]): T[] {
  return [...tsps].sort((a, b) => {
    const pa = isPendingIntegration(a) ? 1 : 0
    const pb = isPendingIntegration(b) ? 1 : 0
    if (pa !== pb) {
      return pa - pb
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
  model.tsps = sortDashboardTsps(model.tsps)
  applyPendingIntegrationUnavailableState(model)
  applyOpportunityScoresToPayload(model)
}
