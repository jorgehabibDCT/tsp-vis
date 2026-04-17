import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getInfluxQueryTimeoutMs,
  getProvidersMeasurement,
} from '../lib/influxEnv.js'
import {
  logEntityInfluxGroupedSample,
  logInfluxRawRowSample,
  parseFluxAggregateValue,
  readFluxRowField,
} from './dashboardInfluxDiagnostics.js'

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
 * After `keep`, there is no `_value`. Both `first()` and `count()` default to `column: "_value"` in Flux
 * (see universe.first / universe.count), so we must use explicit columns:
 * - `first(column: "_time")` — one row per (provider, vid)
 * - `count(column: "vid")` — distinct vids per provider
 *
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
  |> first(column: "_time")
  |> group(columns: ["provider"])
  |> count(column: "vid")
`.trim()
}

/** Single-line summary for log lines (proves critical stages are present). */
export function describeEntityFluxGuards(flux: string): string {
  const hasFirst = flux.includes('first(column: "_time")')
  const hasCount = flux.includes('count(column: "vid")')
  const hasKeep = flux.includes('keep(columns:')
  return `guards keep=${hasKeep} first_time=${hasFirst} count_vid=${hasCount}`
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

  const flux = buildDistinctVidCountByProviderFlux()
  console.log(`[influx/entities] ${describeEntityFluxGuards(flux)}`)
  console.log(
    '[influx/entities] flux query (exact, entity metric only):\n---\n' + flux + '\n---',
  )

  const t0 = Date.now()
  try {
    const queryApi = getQueryApi()
    const rows = await queryApi.collectRows(flux)
    const elapsed = Date.now() - t0
    console.log(
      `[influx/entities] ok elapsedMs=${elapsed} resultRows=${rows.length}`,
    )

    const out: Record<string, number> = {}

    for (const row of rows) {
      const rec = row as Record<string, unknown>
      const pv = readFluxRowField(rec, 'provider')
      const provider = pv != null ? String(pv) : ''
      const n = parseFluxAggregateValue(rec)
      if (!provider || Number.isNaN(n)) {
        continue
      }
      out[provider] = n
    }

    logEntityInfluxGroupedSample(out, 40)
    if (rows.length > 0 && Object.keys(out).length === 0) {
      logInfluxRawRowSample(
        '[diag/entities]',
        rows as Record<string, unknown>[],
        3,
      )
    }

    return out
  } catch (e) {
    const elapsed = Date.now() - t0
    const kind = isTimeoutError(e) ? 'timeout' : 'error'
    console.warn(
      `[influx/entities] ${kind} elapsedMs=${elapsed} range=${range} measurement=${measurement} ${describeEntityFluxGuards(flux)}`,
      e,
    )
    console.warn(
      '[influx/entities] flux query that failed (same string as above):\n---\n' +
        flux +
        '\n---',
    )
    throw e
  }
}
