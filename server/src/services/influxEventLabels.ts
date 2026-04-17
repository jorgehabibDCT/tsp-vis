import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getInfluxEventLabelFields,
  getInfluxQueryTimeoutMs,
  getProvidersMeasurement,
} from '../lib/influxEnv.js'
import { INFLUX_EVENT_LABEL_ROW } from '../config/eventLabelGroups.js'
import {
  logEventLabelInfluxPreMapSample,
  logInfluxRawRowSample,
  parseFluxCountedColumn,
  readFluxRowField,
} from './dashboardInfluxDiagnostics.js'

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
 * **Aggregation:** add **`one: 1`** (not in the group key), `keep` it with `provider` + `lbl`,
 * then `group(columns: ["provider", "lbl"])` and **`count(column: "one")`** — cannot use
 * `_time` (time type) or `lbl` / `provider` (group-key columns) as the aggregate column.
 * collectRows typically returns the count on **`one`**, not `_value`.
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
  |> map(fn: (r) => ({ r with lbl: string(v: r._value), one: 1 }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["_time", "provider", "lbl", "one"])
  |> group(columns: ["provider", "lbl"])
  |> count(column: "one")
`.trim()
}

export function describeEventLabelFluxGuards(flux: string): string {
  const tag = INFLUX_EVENT_LABEL_ROW.labelTagValue
  return `guards label_tag=${flux.includes(tag)} count_one=${flux.includes('count(column: "one")')}`
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

    logInfluxRawRowSample(
      '[diag/event-labels]',
      rows as Record<string, unknown>[],
      3,
    )

    const out: Record<string, Record<string, number>> = {}

    for (const row of rows) {
      const rec = row as Record<string, unknown>
      const pv = readFluxRowField(rec, 'provider')
      const provider = pv != null ? String(pv) : ''
      const lv = readFluxRowField(rec, 'lbl')
      const labelSignal = lv != null ? String(lv) : ''
      const n = parseFluxCountedColumn(rec, 'one')
      if (!provider || !labelSignal || Number.isNaN(n)) {
        continue
      }
      if (!out[provider]) {
        out[provider] = {}
      }
      out[provider][labelSignal] = (out[provider][labelSignal] ?? 0) + n
    }

    logEventLabelInfluxPreMapSample(out, 20)
    if (rows.length > 0 && Object.keys(out).length === 0) {
      logInfluxRawRowSample(
        '[diag/event-labels] post-parse-empty',
        rows as Record<string, unknown>[],
        5,
      )
    }

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
