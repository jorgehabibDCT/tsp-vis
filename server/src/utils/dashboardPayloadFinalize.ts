import type { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { applyOpportunityScoresToPayload } from './providerOpportunityScore.js'

export type DashboardPayload = typeof mockTspComparisonResponse

type TspLike = {
  id: string
  name: string
  integrationStatus?: 'pending_integration' | 'integrated'
}

function isPendingIntegration(tsp: TspLike): boolean {
  return tsp.integrationStatus === 'pending_integration'
}

/**
 * Column order for the TSP comparison matrix:
 * 1. All integrated columns first (non-`pending_integration`), A–Z by visible display `name`.
 * 2. Then all `pending_integration` columns, A–Z by `name`.
 *
 * **Important (Cursor / config hygiene):** The raw mock payload still materializes curated
 * matrix cells per `DASHBOARD_TSPS` in `dashboardTruthSources.ts`. Without
 * `applyPendingIntegrationUnavailableState`, tools or merges could leave those curated values
 * attached to pending columns — always run finalize before returning the dashboard JSON.
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

/**
 * Pending-integration columns are listed for roadmap visibility but must not show curated
 * placeholders, mock entity counts, matrices, integration %, or risk scores as if they were
 * live/defensible — clear those cells to an explicit unavailable state.
 */
export function applyPendingIntegrationUnavailableState(
  payload: DashboardPayload,
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
        const m = metric as {
          values: Record<string, { kind: 'scalar'; value: number | null }>
        }
        m.values[tspId] = { kind: 'scalar', value: null }
      } else if (metric.type === 'expandable') {
        const m = metric as {
          structure: { groups: { id: string; labels: { id: string }[] }[] }
          values: Record<string, unknown>
        }
        m.values[tspId] = buildUnavailableExpandableCell(m.structure)
      }
    }
  }
}

type MutableDashboardPayload = {
  tsps: TspLike[]
  metrics: DashboardPayload['metrics']
}

export function finalizeDashboardPayload(payload: DashboardPayload): void {
  const mutable = payload as unknown as MutableDashboardPayload
  mutable.tsps = sortDashboardTsps(mutable.tsps)
  applyPendingIntegrationUnavailableState(payload)
  applyOpportunityScoresToPayload(payload)
}
