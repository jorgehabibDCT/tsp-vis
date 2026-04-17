import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getInfluxQueryTimeoutMs,
  getProvidersMeasurement,
} from '../lib/influxEnv.js'

/**
 * Assumptions (from repo CSV exploration):
 * - Measurement: `providers` (override: INFLUX_PROVIDERS_MEASUREMENT).
 * - Tags: `provider` (TSP/source slug), `vid` (vehicle / entity id).
 * - Entity count per TSP = distinct `vid` values per `provider` over the time range.
 *
 * Important: this measurement has many `_field` values with mixed `_value` types (float vs string).
 * Grouping before dropping `_value` causes `schema collision: cannot group string and float types together`.
 * We keep only `_time`, `provider`, and `vid` so the pipeline never merges heterogeneous `_value` columns.
 *
 * Flux: one row per (provider, vid), then `count(column: "vid")` per provider. Plain `count()` defaults to
 * `column: "_value"`, which no longer exists after `keep` — that caused `no column "_value" exists`.
 * Narrow `INFLUX_ENTITY_RANGE` (default `-3d`) reduces scan cost vs multi-month windows.
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
  |> keep(columns: ["_time", "provider", "vid"])
  |> group(columns: ["provider", "vid"])
  |> first()
  |> group(columns: ["provider"])
  |> count(column: "vid")
`.trim()
}

function escapeFluxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function isTimeoutError(e: unknown): boolean {
  if (e && typeof e === 'object' && 'name' in e) {
    return (e as { name: string }).name === 'RequestTimedOutError'
  }
  return /timed?\s*out|timeout/i.test(String(e))
}

/** Influx `provider` tag value -> distinct vid count in range. */
export async function fetchDistinctEntityCountsByProvider(): Promise<
  Record<string, number>
> {
  const range = getInfluxEntityRange()
  const measurement = getProvidersMeasurement()
  const timeoutMs = getInfluxQueryTimeoutMs()
  const bucket = getInfluxBucket()

  console.log(
    `[influx/entities] start bucket=${bucket} range=${range} measurement=${measurement} envTimeoutMs=${timeoutMs}`,
  )

  const t0 = Date.now()
  try {
    const flux = buildDistinctVidCountByProviderFlux()
    const queryApi = getQueryApi()
    const rows = await queryApi.collectRows(flux)
    const elapsed = Date.now() - t0
    console.log(
      `[influx/entities] ok elapsedMs=${elapsed} resultRows=${rows.length}`,
    )

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
  } catch (e) {
    const elapsed = Date.now() - t0
    const kind = isTimeoutError(e) ? 'timeout' : 'error'
    console.warn(
      `[influx/entities] ${kind} elapsedMs=${elapsed} range=${range} measurement=${measurement}`,
      e,
    )
    throw e
  }
}
