import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getInfluxEventLabelFields,
  getProvidersMeasurement,
} from '../lib/influxEnv.js'
import { INFLUX_EVENT_LABEL_ROW } from '../config/eventLabelGroups.js'
import { DATA_RICHNESS_FIELD_SOURCES } from '../config/dashboardTruthSources.js'
import {
  parseFluxCountedColumn,
  readFluxRowField,
} from './dashboardInfluxDiagnostics.js'

type VidSetByCohort = Record<string, Set<string>>

function escapeFluxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function fluxVidArray(vids: string[]): string {
  return `[${vids.map((v) => `"${escapeFluxString(v)}"`).join(', ')}]`
}

function cohortEntries(vidsByCohort: VidSetByCohort): Array<[string, string[]]> {
  return Object.entries(vidsByCohort).map(([slug, set]) => [slug, [...set]])
}

function proxyRichnessFields(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [metricLabelId, source] of Object.entries(DATA_RICHNESS_FIELD_SOURCES)) {
    if (source.kind === 'proxy') {
      out[metricLabelId] = source.bucketField
    }
  }
  return out
}

export async function fetchDistinctEntityCountsByVidCohort(
  vidsByCohort: VidSetByCohort,
): Promise<Record<string, number>> {
  const bucket = escapeFluxString(getInfluxBucket())
  const measurement = escapeFluxString(getProvidersMeasurement())
  const range = getInfluxEntityRange()
  const queryApi = getQueryApi()
  const out: Record<string, number> = {}

  for (const [slug, vids] of cohortEntries(vidsByCohort)) {
    if (vids.length === 0) {
      out[slug] = 0
      continue
    }
    const flux = `
from(bucket: "${bucket}")
  |> range(start: ${range})
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => exists r.vid)
  |> filter(fn: (r) => r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(vids)}))
  |> keep(columns: ["_time", "vid"])
  |> group(columns: ["vid"])
  |> first(column: "_time")
  |> group()
  |> count(column: "vid")
`.trim()
    const rows = await queryApi.collectRows(flux)
    let n = 0
    for (const row of rows) {
      const c = parseFluxCountedColumn(row as Record<string, unknown>, 'vid')
      if (Number.isFinite(c)) {
        n = c
      }
    }
    out[slug] = n
    console.log(`[influx/cohort/entities] cohort=${slug} count=${n}`)
  }
  return out
}

export async function fetchDistinctVehicleCountByLabelForVidCohort(
  vidsByCohort: VidSetByCohort,
): Promise<Record<string, Record<string, number>>> {
  const bucket = escapeFluxString(getInfluxBucket())
  const measurement = escapeFluxString(getProvidersMeasurement())
  const range = getInfluxEntityRange()
  const fields = getInfluxEventLabelFields()
  const fieldOrs = fields
    .map((f) => `r["_field"] == "${escapeFluxString(f)}"`)
    .join(' or ')
  const tagValue = escapeFluxString(INFLUX_EVENT_LABEL_ROW.labelTagValue)
  const queryApi = getQueryApi()
  const out: Record<string, Record<string, number>> = {}

  for (const [slug, vids] of cohortEntries(vidsByCohort)) {
    out[slug] = {}
    if (vids.length === 0) {
      continue
    }
    const flux = `
from(bucket: "${bucket}")
  |> range(start: ${range})
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => r["label"] == "${tagValue}")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid)
  |> filter(fn: (r) => r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(vids)}))
  |> map(fn: (r) => ({ r with lbl: string(v: r._value) }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["_time", "vid", "lbl"])
  |> group(columns: ["vid", "lbl"])
  |> first(column: "_time")
  |> group(columns: ["lbl"])
  |> count(column: "vid")
`.trim()
    const rows = await queryApi.collectRows(flux)
    for (const row of rows) {
      const rec = row as Record<string, unknown>
      const lv = readFluxRowField(rec, 'lbl')
      const label = lv != null ? String(lv) : ''
      const n = parseFluxCountedColumn(rec, 'vid')
      if (!label || !Number.isFinite(n)) {
        continue
      }
      out[slug][label] = (out[slug][label] ?? 0) + n
    }
    console.log(
      `[influx/cohort/event-labels] cohort=${slug} labels=${Object.keys(out[slug]).length}`,
    )
  }
  return out
}

export async function fetchDistinctVehicleCountByRichnessFieldForVidCohort(
  vidsByCohort: VidSetByCohort,
): Promise<Record<string, Record<string, number>>> {
  const mapping = proxyRichnessFields()
  const proxyFields = [...new Set(Object.values(mapping))]
  if (proxyFields.length === 0) {
    return {}
  }

  const bucket = escapeFluxString(getInfluxBucket())
  const measurement = escapeFluxString(getProvidersMeasurement())
  const range = getInfluxEntityRange()
  const fieldOrs = proxyFields
    .map((f) => `r["_field"] == "${escapeFluxString(f)}"`)
    .join(' or ')
  const queryApi = getQueryApi()
  const out: Record<string, Record<string, number>> = {}

  for (const [slug, vids] of cohortEntries(vidsByCohort)) {
    out[slug] = {}
    if (vids.length === 0) {
      continue
    }
    const flux = `
from(bucket: "${bucket}")
  |> range(start: ${range})
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid)
  |> filter(fn: (r) => r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(vids)}))
  |> keep(columns: ["_time", "_field", "vid"])
  |> group(columns: ["_field", "vid"])
  |> first(column: "_time")
  |> group(columns: ["_field"])
  |> count(column: "vid")
`.trim()
    const rows = await queryApi.collectRows(flux)
    for (const row of rows) {
      const rec = row as Record<string, unknown>
      const fv = readFluxRowField(rec, '_field')
      const field = fv != null ? String(fv) : ''
      const n = parseFluxCountedColumn(rec, 'vid')
      if (!field || !Number.isFinite(n)) {
        continue
      }
      out[slug][field] = n
    }
    console.log(
      `[influx/cohort/richness] cohort=${slug} fields=${Object.keys(out[slug]).length}`,
    )
  }
  return out
}
