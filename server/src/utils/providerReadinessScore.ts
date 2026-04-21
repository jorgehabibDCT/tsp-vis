import type { mockTspComparisonResponse } from '../data/mockTspComparison.js'

type DashboardPayload = typeof mockTspComparisonResponse

type ScalarCell = { kind: 'scalar'; value: number | null }
type ExpandableCell = { kind: 'expandable'; summary: number | null }

function clamp0to100(v: number): number {
  return Math.max(0, Math.min(100, v))
}

function confidenceModifier(
  confidence: 'confident' | 'plausible_pending' | 'unmapped' | undefined,
): number | null {
  if (confidence === 'confident') {
    return 1
  }
  if (confidence === 'plausible_pending') {
    return 0.85
  }
  return null
}

function totalLabels(structure: {
  groups: { labels: { id: string; name: string }[] }[]
}): number {
  return structure.groups.reduce((acc, g) => acc + g.labels.length, 0)
}

/**
 * Active runtime calculator for `metric-risk-index` ("Provider Readiness Score").
 * Recomputes score after entity/event merges so live API payload reflects current matrix state.
 */
export function recomputeProviderReadinessScores(payload: DashboardPayload): void {
  const riskMetric = payload.metrics.find((m) => m.id === 'metric-risk-index')
  const entityMetric = payload.metrics.find((m) => m.id === 'metric-entities')
  const eventMetric = payload.metrics.find((m) => m.id === 'metric-events-alarms')
  const richnessMetric = payload.metrics.find((m) => m.id === 'metric-data-richness')

  if (
    !riskMetric ||
    riskMetric.type !== 'scalar' ||
    !entityMetric ||
    entityMetric.type !== 'scalar' ||
    !eventMetric ||
    eventMetric.type !== 'expandable' ||
    !richnessMetric ||
    richnessMetric.type !== 'expandable'
  ) {
    return
  }

  const riskValues = riskMetric.values as Record<string, ScalarCell>
  const entityValues = entityMetric.values as Record<string, ScalarCell>
  const eventValues = eventMetric.values as Record<string, ExpandableCell>
  const richnessValues = richnessMetric.values as Record<string, ExpandableCell>
  const eventTotal = totalLabels(eventMetric.structure)
  const richnessTotal = totalLabels(richnessMetric.structure)

  const maxEntitiesAmongIntegrated = payload.tsps.reduce((max, tsp) => {
    if (tsp.integrationStatus !== 'integrated') {
      return max
    }
    const entities = entityValues[tsp.id]?.value ?? null
    if (entities === null || !Number.isFinite(entities) || entities <= 0) {
      return max
    }
    return Math.max(max, entities)
  }, 0)

  const debugRows: string[] = []
  let debugCount = 0

  for (const tsp of payload.tsps) {
    const oldScore = riskValues[tsp.id]?.value ?? null

    const entities = entityValues[tsp.id]?.value ?? null
    const eventSupported = eventValues[tsp.id]?.summary ?? null
    const richnessSupported = richnessValues[tsp.id]?.summary ?? null
    const modifier = confidenceModifier(tsp.providerMappingConfidence)

    let nextScore: number | null = null

    if (
      tsp.integrationStatus === 'integrated' &&
      tsp.providerSlug &&
      modifier !== null &&
      entities !== null &&
      Number.isFinite(entities) &&
      entities >= 0 &&
      eventSupported !== null &&
      Number.isFinite(eventSupported) &&
      richnessSupported !== null &&
      Number.isFinite(richnessSupported) &&
      eventTotal > 0 &&
      richnessTotal > 0 &&
      maxEntitiesAmongIntegrated > 0
    ) {
      const breadthScore = (eventSupported / eventTotal) * 100
      const richnessScore = (richnessSupported / richnessTotal) * 100
      const scaleScore = Math.sqrt(entities / maxEntitiesAmongIntegrated) * 100
      const matrixScore = Math.sqrt(breadthScore * richnessScore)
      const baseScore = 0.7 * matrixScore + 0.3 * scaleScore
      nextScore = clamp0to100(Math.round(baseScore * modifier))

      if (debugCount < 3) {
        debugRows.push(
          `${tsp.name}: old=${oldScore ?? 'null'} new=${nextScore} breadth=${breadthScore.toFixed(2)} richness=${richnessScore.toFixed(2)} scale=${scaleScore.toFixed(2)} matrix=${matrixScore.toFixed(2)} base=${baseScore.toFixed(2)} conf=${modifier.toFixed(2)}`,
        )
        debugCount += 1
      }
    }

    riskValues[tsp.id] = { kind: 'scalar', value: nextScore }
  }

  if (debugRows.length > 0) {
    console.log(
      `[dashboard/score] active_calculator=recomputeProviderReadinessScores max_entities_integrated=${maxEntitiesAmongIntegrated}`,
    )
    for (const row of debugRows) {
      console.log(`[dashboard/score] ${row}`)
    }
  }
}
