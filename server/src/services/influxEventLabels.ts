import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getInfluxEventLabelFields,
  getInfluxQueryTimeoutMs,
  getProvidersMeasurement,
} from '../lib/influxEnv.js'
import {
  INFLUX_EVENT_LABEL_ROW,
  normalizeInfluxLabelSignal,
} from '../config/eventLabelGroups.js'

/**
 * Event / alarm label roll-up for the expandable metric.
 *
 * **Measurement:** `providers` (same as entity counts; override `INFLUX_PROVIDERS_MEASUREMENT`).
 * **Rows:** `label == "label_count"` and `_field` in `getInfluxEventLabelFields()` (default
 *   **`label_type` only**) — `_value` is the machine label code. Override env to include
 *   description fields when intentional (may overlap semantically with `label_type`).
 * **Provider:** `provider` tag (same slugs as `TSP_PROVIDER_SLUGS` / entity metric).
 * **Time range:** `INFLUX_ENTITY_RANGE` (default `-3d`), same as entity query.
 *
 * **Aggregation:** `count()` of rows after `keep`, grouped by `(provider, lbl)` where
 * `lbl = string(v: r._value)` (one count per stored point carrying that label signal).
 *
 * **Guards:** `string()` on `_value` avoids mixed-type schema issues; empty `lbl` dropped.
 */
export function buildEventLabelCountsByProviderFlux(): string {
  const bucket = escapeFluxString(getInfluxBucket())
  const measurement = escapeFluxString(getProvidersMeasurement())
  const range = getInfluxEntityRange()
  const fields = getInfluxEventLabelFields()
  if (fields.length === 0) {
    throw new Error('INFLUX_EVENT_LABEL_FIELDS resolved to empty list')
  }
  const fieldOrs = fields
    .map((f) => `r["_field"] == "${escapeFluxString(f)}"`)
    .join(' or ')

  return `
from(bucket: "${bucket}")
  |> range(start: ${range})
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => r["label"] == "${escapeFluxString(INFLUX_EVENT_LABEL_ROW.labelTagValue)}")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.provider)
  |> filter(fn: (r) => r.provider != "")
  |> map(fn: (r) => ({ r with lbl: string(v: r._value) }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["_time", "provider", "lbl"])
  |> group(columns: ["provider", "lbl"])
  |> count(column: "_time")
`.trim()
}

export function describeEventLabelFluxGuards(flux: string): string {
  const tag = INFLUX_EVENT_LABEL_ROW.labelTagValue
  return `guards label_tag=${flux.includes(tag)} count_time=${flux.includes('count(column: "_time")')}`
}

function escapeFluxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Log a small slice of highest-count (provider, label) buckets for rollout validation. */
function logEventLabelCountDiagnostics(
  counts: Record<string, Record<string, number>>,
  sampleLimit: number,
): void {
  type Row = { provider: string; raw: string; norm: string; count: number }
  const rows: Row[] = []
  for (const [provider, byLabel] of Object.entries(counts)) {
    for (const [raw, n] of Object.entries(byLabel)) {
      if (Number.isFinite(n) && n > 0) {
        rows.push({
          provider,
          raw,
          norm: normalizeInfluxLabelSignal(raw),
          count: n,
        })
      }
    }
  }
  rows.sort((a, b) => b.count - a.count)
  const slice = rows.slice(0, sampleLimit)
  if (slice.length === 0) {
    console.log('[influx/event-labels] diag sample: (no rows)')
    return
  }
  console.log(
    `[influx/event-labels] diag sample topN=${slice.length} (provider | norm | count | raw):`,
  )
  for (const r of slice) {
    const rawEsc = r.raw.length > 96 ? `${r.raw.slice(0, 96)}…` : r.raw
    console.log(
      `[influx/event-labels] diag row provider=${r.provider} norm=${r.norm} count=${r.count} raw=${rawEsc}`,
    )
  }
}

function isTimeoutError(e: unknown): boolean {
  if (e && typeof e === 'object' && 'name' in e) {
    return (e as { name: string }).name === 'RequestTimedOutError'
  }
  return /timed?\s*out|timeout/i.test(String(e))
}

/** Nested: Influx `provider` slug -> raw `lbl` string -> row count in range. */
export async function fetchEventLabelCountsByProvider(): Promise<
  Record<string, Record<string, number>>
> {
  const range = getInfluxEntityRange()
  const measurement = getProvidersMeasurement()
  const timeoutMs = getInfluxQueryTimeoutMs()
  const bucket = getInfluxBucket()
  const fields = getInfluxEventLabelFields()

  console.log(
    `[influx/event-labels] start bucket=${bucket} range=${range} measurement=${measurement} fields=${fields.join(',')} envTimeoutMs=${timeoutMs}`,
  )

  const flux = buildEventLabelCountsByProviderFlux()
  console.log(`[influx/event-labels] ${describeEventLabelFluxGuards(flux)}`)
  console.log(
    '[influx/event-labels] flux query (exact):\n---\n' + flux + '\n---',
  )

  const t0 = Date.now()
  try {
    const queryApi = getQueryApi()
    const rows = await queryApi.collectRows(flux)
    const elapsed = Date.now() - t0
    console.log(
      `[influx/event-labels] ok elapsedMs=${elapsed} resultRows=${rows.length}`,
    )

    const out: Record<string, Record<string, number>> = {}

    for (const row of rows) {
      const rec = row as Record<string, unknown>
      const provider = rec.provider != null ? String(rec.provider) : ''
      const labelSignal = rec.lbl != null ? String(rec.lbl) : ''
      const value = rec._value
      const n =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : Number(value)
      if (!provider || !labelSignal || Number.isNaN(n)) {
        continue
      }
      if (!out[provider]) {
        out[provider] = {}
      }
      out[provider][labelSignal] = (out[provider][labelSignal] ?? 0) + n
    }

    logEventLabelCountDiagnostics(out, 15)

    return out
  } catch (e) {
    const elapsed = Date.now() - t0
    const kind = isTimeoutError(e) ? 'timeout' : 'error'
    console.warn(
      `[influx/event-labels] ${kind} elapsedMs=${elapsed} range=${range} measurement=${measurement} ${describeEventLabelFluxGuards(flux)}`,
      e,
    )
    console.warn(
      '[influx/event-labels] flux query that failed:\n---\n' + flux + '\n---',
    )
    throw e
  }
}
