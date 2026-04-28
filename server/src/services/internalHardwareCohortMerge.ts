import { INTERNAL_HARDWARE_COHORTS } from '../config/internalHardwareCohorts.js'
import { DATA_RICHNESS_FIELD_SOURCES } from '../config/dashboardTruthSources.js'
import type { DashboardPayload } from '../utils/dashboardPayloadFinalize.js'

type ScalarCell = { kind: 'scalar'; value: number | null }

function buildUnavailableExpandableCell(structure: {
  groups: { id: string; labels: { id: string }[] }[]
}) {
  return {
    kind: 'expandable' as const,
    summary: null,
    groups: structure.groups.map((g) => ({
      groupId: g.id,
      values: g.labels.map(() => null),
    })),
  }
}

export function ensureInternalHardwareColumns(payload: DashboardPayload): void {
  const existing = new Set(payload.tsps.map((t) => t.id))
  for (const c of INTERNAL_HARDWARE_COHORTS) {
    if (!existing.has(c.id)) {
      payload.tsps.push({
        id: c.id,
        name: c.name,
        logoUrl: null,
        providerSlug: c.slug,
        providerMappingConfidence: 'confident',
        integrationStatus: 'integrated',
      })
    }
  }

  for (const metric of payload.metrics) {
    for (const c of INTERNAL_HARDWARE_COHORTS) {
      if (metric.type === 'scalar') {
        ;(metric.values as Record<string, ScalarCell>)[c.id] = {
          kind: 'scalar',
          value: null,
        }
      } else {
        ;(metric.values as Record<string, unknown>)[c.id] =
          buildUnavailableExpandableCell(metric.structure)
      }
    }
  }
}

export function mergeInternalHardwareEntityCounts(
  payload: DashboardPayload,
  entityByCohortSlug: Record<string, number>,
): void {
  const metric = payload.metrics.find((m) => m.id === 'metric-entities')
  if (!metric || metric.type !== 'scalar') {
    return
  }
  const values = metric.values as Record<string, ScalarCell>
  for (const c of INTERNAL_HARDWARE_COHORTS) {
    const n = entityByCohortSlug[c.slug]
    values[c.id] = {
      kind: 'scalar',
      // Internal cohort entity materialization should stay stable/honest on
      // partial enrichment failures: missing/failed counts render as 0, not null.
      value: Number.isFinite(n) ? n : 0,
    }
  }
}

export function mergeInternalHardwareRichnessCoverage(
  payload: DashboardPayload,
  entitiesByCohortSlug: Record<string, number>,
  richnessByCohortSlug: Record<string, Record<string, number>>,
): void {
  const metric = payload.metrics.find((m) => m.id === 'metric-data-richness')
  if (!metric || metric.type !== 'expandable') {
    return
  }
  const valuesByTsp = metric.values as Record<
    string,
    {
      kind: 'expandable'
      summary: number | null
      groups: { groupId: string; values: Array<boolean | null> }[]
    }
  >

  const proxyByLabelId: Record<string, string | null> = {}
  for (const [labelId, source] of Object.entries(DATA_RICHNESS_FIELD_SOURCES)) {
    proxyByLabelId[labelId] = source.kind === 'proxy' ? source.bucketField : null
  }

  for (const c of INTERNAL_HARDWARE_COHORTS) {
    const entityCount = entitiesByCohortSlug[c.slug] ?? 0
    const byField = richnessByCohortSlug[c.slug] ?? {}

    const groupsOut = metric.structure.groups.map((g) => {
      const vals = g.labels.map((label) => {
        const field = proxyByLabelId[label.id] ?? null
        if (!field || entityCount <= 0) {
          return null
        }
        const supported = (byField[field] ?? 0) > 0
        return supported
      })
      return { groupId: g.id, values: vals }
    })

    const summary = groupsOut.reduce((acc, g) => {
      for (const v of g.values) {
        if (v === true) {
          acc += 1
        }
      }
      return acc
    }, 0)

    valuesByTsp[c.id] = {
      kind: 'expandable',
      summary,
      groups: groupsOut,
    }
  }
}
