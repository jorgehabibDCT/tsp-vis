import { describe, expect, it } from 'vitest'
import type { TspComparisonResponse } from '../contracts/tspComparison'
import type { MetricRow } from '../types/dashboard'
import {
  applyPendingIntegrationUnavailableState,
  finalizeDashboardPayload,
  readProviderReadinessScores,
  sortDashboardTsps,
} from './dashboardPayloadFinalize'

function minimalMetrics(
  readiness: Record<string, number | null>,
): MetricRow[] {
  const values: Record<string, { kind: 'scalar'; value: number | null }> = {}
  for (const [id, v] of Object.entries(readiness)) {
    values[id] = { kind: 'scalar', value: v }
  }
  return [
    {
      id: 'metric-risk-index',
      label: 'Provider Readiness Score',
      type: 'scalar',
      kind: 'score',
      values,
    },
  ]
}

describe('sortDashboardTsps', () => {
  it('orders finite scores descending, then name A–Z for ties', () => {
    const tsps = [
      { id: 'a', name: 'Zebra', integrationStatus: 'integrated' as const },
      { id: 'b', name: 'Alpha', integrationStatus: 'integrated' as const },
      { id: 'c', name: 'Milo', integrationStatus: 'integrated' as const },
    ]
    const scores = { a: 50, b: 80, c: 80 }
    const out = sortDashboardTsps(tsps, scores)
    expect(out.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('places null / non-finite scores after all numeric scores', () => {
    const tsps = [
      { id: 'x', name: 'B', integrationStatus: 'integrated' as const },
      { id: 'y', name: 'A', integrationStatus: 'integrated' as const },
      { id: 'z', name: 'C', integrationStatus: 'integrated' as const },
    ]
    const scores = { x: 10, y: null as unknown as number, z: Number.NaN }
    const out = sortDashboardTsps(tsps, scores)
    expect(out.map((t) => t.id)).toEqual(['x', 'y', 'z'])
  })

  it('sorts null-score columns by name A–Z', () => {
    const tsps = [
      { id: 'm', name: 'M', integrationStatus: 'integrated' as const },
      { id: 'n', name: 'A', integrationStatus: 'integrated' as const },
    ]
    const scores = { m: null as unknown as number, n: null as unknown as number }
    const out = sortDashboardTsps(tsps, scores)
    expect(out.map((t) => t.id)).toEqual(['n', 'm'])
  })
})

describe('readProviderReadinessScores', () => {
  it('returns empty map when risk metric is absent', () => {
    expect(readProviderReadinessScores([])).toEqual({})
    expect(
      readProviderReadinessScores([
        {
          id: 'metric-entities',
          label: 'Entities',
          type: 'scalar',
          kind: 'integer',
          values: { x: { kind: 'scalar', value: 1 } },
        },
      ]),
    ).toEqual({})
  })
})

describe('applyPendingIntegrationUnavailableState', () => {
  it('nulls scalar and expandable cells for pending_integration columns', () => {
    const model = {
      tsps: [
        {
          id: 'p1',
          name: 'Pending Co',
          integrationStatus: 'pending_integration' as const,
        },
        {
          id: 'i1',
          name: 'Integrated Co',
          integrationStatus: 'integrated' as const,
        },
      ],
      metrics: [
        {
          id: 'metric-entities',
          label: 'Entities',
          type: 'scalar',
          kind: 'integer',
          values: {
            p1: { kind: 'scalar', value: 123 },
            i1: { kind: 'scalar', value: 456 },
          },
        },
        {
          id: 'metric-events-alarms',
          label: 'Events',
          type: 'expandable',
          kind: 'support',
          structure: {
            groups: [
              {
                id: 'g1',
                title: 'G',
                labels: [{ id: 'l1', name: 'l1' }],
              },
            ],
          },
          values: {
            p1: {
              kind: 'expandable',
              summary: 9,
              groups: [{ groupId: 'g1', values: [true] }],
            },
            i1: {
              kind: 'expandable',
              summary: 2,
              groups: [{ groupId: 'g1', values: [false] }],
            },
          },
        },
      ],
    } as unknown as TspComparisonResponse

    applyPendingIntegrationUnavailableState(model)

    const ent = model.metrics[0]
    if (ent.type !== 'scalar') throw new Error('expected scalar')
    expect(ent.values.p1).toEqual({ kind: 'scalar', value: null })
    expect(ent.values.i1).toEqual({ kind: 'scalar', value: 456 })

    const ev = model.metrics[1]
    if (ev.type !== 'expandable') throw new Error('expected expandable')
    expect(ev.values.p1).toEqual({
      kind: 'expandable',
      summary: null,
      groups: [{ groupId: 'g1', values: [null] }],
    })
    expect(ev.values.i1?.kind).toBe('expandable')
  })
})

describe('finalizeDashboardPayload', () => {
  it('sorts then applies pending rules without mutating unrelated tsp order keys', () => {
    const model = {
      tsps: [
        {
          id: 'p',
          name: 'Z',
          integrationStatus: 'pending_integration' as const,
        },
        {
          id: 'i',
          name: 'A',
          integrationStatus: 'integrated' as const,
        },
      ],
      metrics: [
        ...minimalMetrics({ p: 10, i: 90 }),
        {
          id: 'metric-entities',
          label: 'Entities',
          type: 'scalar',
          kind: 'integer',
          values: {
            p: { kind: 'scalar', value: 1 },
            i: { kind: 'scalar', value: 2 },
          },
        },
      ],
    } as unknown as TspComparisonResponse

    finalizeDashboardPayload(model)
    expect(model.tsps.map((t) => t.id)).toEqual(['i', 'p'])
    const ent = model.metrics.find((m) => m.id === 'metric-entities')
    if (!ent || ent.type !== 'scalar') throw new Error('entities')
    expect(ent.values.p.value).toBeNull()
  })
})
