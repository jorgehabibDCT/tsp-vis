import { describe, expect, it } from 'vitest'
import { mockTspComparisonResponse } from '../data/mockTspComparison.js'
import { recomputeProviderReadinessScores } from './providerReadinessScore.js'

type Payload = typeof mockTspComparisonResponse

function clonePayload(): Payload {
  return JSON.parse(JSON.stringify(mockTspComparisonResponse)) as Payload
}

describe('recomputeProviderReadinessScores', () => {
  it('writes bounded numeric scores for integrated slug-mapped columns', () => {
    const p = clonePayload()
    recomputeProviderReadinessScores(p)
    const risk = p.metrics.find((m) => m.id === 'metric-risk-index')
    expect(risk?.type).toBe('scalar')
    if (risk?.type !== 'scalar') return
    const v = risk.values['tsp-santrack-internacional']?.value
    expect(typeof v).toBe('number')
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(100)
  })

  it('writes null risk for pending_integration / unmapped slug columns', () => {
    const p = clonePayload()
    recomputeProviderReadinessScores(p)
    const risk = p.metrics.find((m) => m.id === 'metric-risk-index')
    if (risk?.type !== 'scalar') throw new Error('risk scalar')
    expect(risk.values['tsp-skymeduza']?.value).toBeNull()
  })

  it('no-ops when metric-risk-index is missing', () => {
    const p = clonePayload()
    const stripped = {
      ...p,
      metrics: p.metrics.filter((m) => m.id !== 'metric-risk-index'),
    } as unknown as Payload
    recomputeProviderReadinessScores(stripped)
    expect(stripped.metrics.some((m) => m.id === 'metric-risk-index')).toBe(false)
  })
})
