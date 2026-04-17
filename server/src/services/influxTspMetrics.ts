import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getProvidersMeasurement,
} from '../lib/influxEnv.js'

/**
 * Assumptions (from repo CSV exploration):
 * - Measurement: `providers` (override: INFLUX_PROVIDERS_MEASUREMENT).
 * - Tags: `provider` (TSP/source slug), `vid` (vehicle / entity id).
 * - Entity count per TSP = distinct `vid` values per `provider` over the time range.
 *
 * Flux: collapse to one row per (provider, vid), then count rows per provider.
 */
export function buildDistinctVidCountByProviderFlux(): string {
  const bucket = escapeFluxString(getInfluxBucket())
  const measurement = escapeFluxString(getProvidersMeasurement())
  const range = getInfluxEntityRange()

  return `
from(bucket: "${bucket}")
  |> range(start: ${range})
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => exists r.provider)
  |> filter(fn: (r) => exists r.vid)
  |> filter(fn: (r) => r.vid != "")
  |> group(columns: ["provider", "vid"])
  |> first()
  |> group(columns: ["provider"])
  |> count()
`.trim()
}

function escapeFluxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Influx `provider` tag value -> distinct vid count in range. */
export async function fetchDistinctEntityCountsByProvider(): Promise<
  Record<string, number>
> {
  const flux = buildDistinctVidCountByProviderFlux()
  const queryApi = getQueryApi()
  const rows = await queryApi.collectRows(flux)
  const out: Record<string, number> = {}

  for (const row of rows) {
    const rec = row as Record<string, unknown>
    const provider = rec.provider != null ? String(rec.provider) : ''
    const value = rec._value
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number(value)
    if (!provider || Number.isNaN(n)) {
      continue
    }
    out[provider] = n
  }

  return out
}
