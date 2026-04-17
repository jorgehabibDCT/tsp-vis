import {
  normalizeInfluxLabelSignal,
  resolveDashboardChild,
} from '../config/eventLabelGroups.js'

/** Stable JSON for logs (sorted keys). */
function stableStringify(obj: unknown, maxLen: number): string {
  try {
    const s = JSON.stringify(
      obj,
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      0,
    )
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
  } catch {
    return String(obj)
  }
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

/**
 * Reads a Flux row field by canonical name, then case-insensitive match (SDK / schema variants).
 */
export function readFluxRowField(
  rec: Record<string, unknown>,
  canonical: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(rec, canonical)) {
    return rec[canonical]
  }
  const want = canonical.toLowerCase()
  for (const [k, v] of Object.entries(rec)) {
    if (k.toLowerCase() === want) {
      return v
    }
  }
  return undefined
}

/**
 * Numeric result after Flux `count(column: "<fluxCountedColumn>")`.
 * The Node client often exposes the count on the **counted column** (`vid`, `one`, …), not `_value`.
 * Tries `fluxCountedColumn` first, then optional fallbacks (default `_value` for older / CSV shapes).
 */
export function parseFluxCountedColumn(
  rec: Record<string, unknown>,
  fluxCountedColumn: string,
  fallbackColumns: string[] = ['_value'],
): number {
  const order = [
    fluxCountedColumn,
    ...fallbackColumns.filter((c) => c !== fluxCountedColumn),
  ]
  for (const col of order) {
    const n = toFiniteNumber(readFluxRowField(rec, col))
    if (Number.isFinite(n)) {
      return n
    }
  }
  return NaN
}

/** Log grouped entity counts from Influx before TSP merge. */
export function logEntityInfluxGroupedSample(
  byProvider: Record<string, number>,
  topN: number,
): void {
  const entries = Object.entries(byProvider)
    .filter(([, n]) => Number.isFinite(n))
    .sort((a, b) => b[1] - a[1])
  console.log(
    `[diag/entities] grouped providers=${entries.length} (sample up to ${topN} by count desc)`,
  )
  for (const [provider, count] of entries.slice(0, topN)) {
    console.log(`[diag/entities] row provider=${provider} count=${count}`)
  }
  if (entries.length === 0) {
    console.log('[diag/entities] (no parsed provider buckets — check row shape vs parser)')
  }
}

/** Log TSP→slug map and whether each Influx provider string matches any configured slug. */
export function logTspSlugMapVsInfluxProviders(
  metricLabel: string,
  slugByTspId: Record<string, string>,
  influxProviders: string[],
): void {
  const configuredSlugs = [...new Set(Object.values(slugByTspId))]
  console.log(
    `[diag/${metricLabel}] tsp_id->provider_slug JSON=${stableStringify(slugByTspId, 800)}`,
  )
  console.log(
    `[diag/${metricLabel}] unique_configured_slugs=[${configuredSlugs.map((s) => `"${s}"`).join(', ')}]`,
  )
  const seen = new Set(influxProviders)
  for (const p of seen) {
    const matches = configuredSlugs.includes(p)
    console.log(
      `[diag/${metricLabel}] influx_provider="${p}" matchesConfiguredSlug=${matches}`,
    )
  }
  if (seen.size === 0) {
    console.log(`[diag/${metricLabel}] (no influx provider keys parsed from query)`)
  }
}

/** Top (provider, raw, norm, count) before dashboard child mapping. */
export function logEventLabelInfluxPreMapSample(
  countsByProvider: Record<string, Record<string, number>>,
  topN: number,
): void {
  type Row = { provider: string; raw: string; norm: string; count: number }
  const rows: Row[] = []
  for (const [provider, byLabel] of Object.entries(countsByProvider)) {
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
  const slice = rows.slice(0, topN)
  if (slice.length === 0) {
    console.log(
      '[diag/event-labels] pre-map sample: (no parsed buckets — likely row shape / count parse)',
    )
    return
  }
  console.log(
    `[diag/event-labels] pre-map sample topN=${slice.length} (provider | raw | norm | count)`,
  )
  for (const r of slice) {
    const rawEsc = r.raw.length > 80 ? `${r.raw.slice(0, 80)}…` : r.raw
    console.log(
      `[diag/event-labels] pre-map provider=${r.provider} raw=${rawEsc} norm=${r.norm} count=${r.count}`,
    )
  }
}

/** Counts label→dashboard mapping misses (sum of points not routed to any child row). */
export function logEventLabelUnmappedTotals(
  countsByProvider: Record<string, Record<string, number>>,
  slugByTspId: Record<string, string>,
): void {
  const configuredSlugs = new Set(Object.values(slugByTspId))
  let droppedUnmapped = 0
  let droppedUnknownProvider = 0
  let mappedPoints = 0

  for (const [provider, byLabel] of Object.entries(countsByProvider)) {
    const slugKnown = configuredSlugs.has(provider)
    for (const [signal, rawN] of Object.entries(byLabel)) {
      const n = toFiniteNumber(rawN)
      if (!Number.isFinite(n) || n <= 0) {
        continue
      }
      if (!slugKnown) {
        droppedUnknownProvider += n
        continue
      }
      const ref = resolveDashboardChild(signal)
      if (!ref) {
        droppedUnmapped += n
      } else {
        mappedPoints += n
      }
    }
  }

  console.log(
    `[diag/event-labels] merge mapping: mappedPoints=${mappedPoints} droppedNoChildRule=${droppedUnmapped} droppedUnknownInfluxProvider=${droppedUnknownProvider}`,
  )
}

/** Log first N Flux rows as JSON for schema debugging. */
export function logInfluxRawRowSample(
  prefix: string,
  rows: Record<string, unknown>[],
  n: number,
): void {
  const slice = rows.slice(0, n)
  console.log(
    `${prefix} rawFluxRowSample count=${slice.length} of ${rows.length} (keys per row)`,
  )
  for (let i = 0; i < slice.length; i++) {
    const rec = slice[i]
    const keys = Object.keys(rec).sort().join(',')
    console.log(`${prefix} rawRow[${i}] keys=${keys}`)
    console.log(`${prefix} rawRow[${i}] json=${stableStringify(rec, 1200)}`)
  }
}
