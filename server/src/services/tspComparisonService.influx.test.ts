import { describe, expect, it } from 'vitest'
import type { InfluxDashboardQueryPort } from './influxDashboardQueryPort.js'
import { buildTspComparisonDashboardMerged } from './tspComparisonService.js'

describe('buildTspComparisonDashboardMerged', () => {
  it('merges entity counts from the injected port (no live Influx)', async () => {
    const port: InfluxDashboardQueryPort = {
      fetchDistinctEntityCountsByProvider: async () => ({ santrack: 4242 }),
      fetchDistinctVehicleCountByProviderAndLabel: async () => ({}),
    }
    const payload = await buildTspComparisonDashboardMerged(port)
    const ent = payload.metrics.find((m) => m.id === 'metric-entities')
    expect(ent?.type).toBe('scalar')
    if (ent?.type !== 'scalar') throw new Error('expected scalar entities')
    expect(ent.values['tsp-santrack-internacional']?.value).toBe(4242)
  })

  it('does not apply entity merge when the entity port throws', async () => {
    const merged = await buildTspComparisonDashboardMerged({
      fetchDistinctEntityCountsByProvider: async () => ({ santrack: 99999 }),
      fetchDistinctVehicleCountByProviderAndLabel: async () => ({}),
    })
    const untouched = await buildTspComparisonDashboardMerged({
      fetchDistinctEntityCountsByProvider: async () => {
        throw new Error('simulated influx failure')
      },
      fetchDistinctVehicleCountByProviderAndLabel: async () => ({}),
    })
    const g = merged.metrics.find((m) => m.id === 'metric-entities')
    const b = untouched.metrics.find((m) => m.id === 'metric-entities')
    if (g?.type !== 'scalar' || b?.type !== 'scalar') throw new Error('scalar')
    expect(g.values['tsp-santrack-internacional']?.value).toBe(99999)
    expect(b.values['tsp-santrack-internacional']?.value).not.toBe(99999)
  })
})
