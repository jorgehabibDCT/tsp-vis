/**
 * In-memory / UI shape for the TSP comparison dashboard.
 * Mirrors the JSON body of `TspComparisonResponse` (see `src/contracts/tspComparison.ts`).
 */

/**
 * Column-stable IDs for each Tracking Service Provider (TSP).
 */
export type TspId = string

export type TspIntegrationStatus = 'pending_integration' | 'integrated'

/** Bucket slug mapping stance (see `server/src/config/dashboardMatrixConfig.ts`). */
export type ProviderMappingConfidence =
  | 'confident'
  | 'plausible_pending'
  | 'unmapped'

export type Tsp = {
  id: TspId
  name: string
  logoUrl?: string | null
  /** Branded columns awaiting bucket mapping vs CSV-imported provider columns. */
  integrationStatus?: TspIntegrationStatus
  /** Influx `provider` tag when mapped; null when unmapped. */
  providerSlug?: string | null
  providerMappingConfidence?: ProviderMappingConfidence
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
 * Live Influx-backed rollup for Event labels / Alarms Info (slug-mapped TSPs only).
 */
export type EventLabelCoverageRollup = {
  /** Labels with coverage_pct > 0 */
  supportedCount: number
  totalLabels: number
}

/**
 * Per-TSP payload for an expandable metric: roll-up + parallel arrays per group.
 */
export type ExpandableCell = {
  kind: 'expandable'
  summary: number | null
  /** Present when event labels were merged from live entity + label coverage inputs. */
  eventLabelRollup?: EventLabelCoverageRollup
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
