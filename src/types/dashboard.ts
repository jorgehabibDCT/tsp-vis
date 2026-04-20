/**
 * In-memory / UI shape for the TSP comparison dashboard.
 * Mirrors the JSON body of `TspComparisonResponse` (see `src/contracts/tspComparison.ts`).
 */

/**
 * Column-stable IDs for each Tracking Service Provider (TSP).
 */
export type TspId = string

export type TspIntegrationStatus = 'pending_integration' | 'integrated'

export type Tsp = {
  id: TspId
  name: string
  logoUrl?: string | null
  /** Branded columns awaiting bucket mapping vs CSV-imported provider columns. */
  integrationStatus?: TspIntegrationStatus
}

export type ScalarCell = {
  kind: 'scalar'
  value: number | null
}

export type ExpandableGroup = {
  id: string
  title: string
  labels: { id: string; name: string }[]
}

/**
 * Per-TSP payload for an expandable metric: roll-up + parallel arrays per group.
 */
export type ExpandableCell = {
  kind: 'expandable'
  summary: number | null
  groups: {
    groupId: string
    /** Same order and length as `ExpandableGroup.labels` for that group */
    values: (number | boolean | null)[]
  }[]
}

export type ScalarMetricRow = {
  id: string
  label: string
  type: 'scalar'
  kind: 'integer' | 'percent' | 'score'
  values: Record<TspId, ScalarCell>
}

export type ExpandableMetricRow = {
  id: string
  label: string
  type: 'expandable'
  kind?: 'count' | 'support'
  structure: {
    groups: ExpandableGroup[]
  }
  values: Record<TspId, ExpandableCell>
}

export type MetricRow = ScalarMetricRow | ExpandableMetricRow

export type DashboardModel = {
  tsps: Tsp[]
  metrics: MetricRow[]
}
