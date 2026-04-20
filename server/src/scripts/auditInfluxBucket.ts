import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getQueryApi } from '../lib/influx.js'
import {
  getInfluxBucket,
  getInfluxEntityRange,
  getInfluxEventLabelFields,
  getInfluxOrg,
  getProvidersMeasurement,
  isInfluxConfigured,
} from '../lib/influxEnv.js'

type JsonRecord = Record<string, unknown>

type MeasurementSchema = {
  measurement: string
  fieldKeys: string[]
  tagKeys: string[]
}

type TopCount = { key: string; count: number }

type CandidateFieldAvailability = {
  metricIntent: string
  candidateFields: string[]
  byField: Record<string, { found: boolean; measurements: TopCount[] }>
}

const AUDIT_RANGE = process.env.INFLUX_AUDIT_RANGE?.trim() || '-30d'
const OUTPUT_DIR = resolve(process.cwd(), 'audit-output')
const MARKDOWN_PATH = resolve(process.cwd(), 'INFLUX_BUCKET_AUDIT.md')
const PROVIDERS_MEASUREMENT = getProvidersMeasurement()
const EVENT_LABEL_FIELDS = getInfluxEventLabelFields()

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function toFiniteNumber(v: unknown): number {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : NaN
  }
  if (typeof v === 'bigint') {
    return Number(v)
  }
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

function readField(rec: JsonRecord, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(rec, key)) {
    return rec[key]
  }
  const want = key.toLowerCase()
  for (const [k, v] of Object.entries(rec)) {
    if (k.toLowerCase() === want) {
      return v
    }
  }
  return undefined
}

async function collectRows(flux: string): Promise<JsonRecord[]> {
  const queryApi = getQueryApi()
  const rows = await queryApi.collectRows(flux)
  return rows as JsonRecord[]
}

async function schemaMeasurements(bucket: string): Promise<string[]> {
  const flux = `
import "influxdata/influxdb/schema"
schema.measurements(bucket: "${esc(bucket)}", start: ${AUDIT_RANGE})
`.trim()
  const rows = await collectRows(flux)
  return rows
    .map((r) => String(readField(r, '_value') ?? ''))
    .filter((s) => s.length > 0)
    .sort()
}

async function schemaFieldKeys(
  bucket: string,
  measurement: string,
): Promise<string[]> {
  const flux = `
import "influxdata/influxdb/schema"
schema.fieldKeys(
  bucket: "${esc(bucket)}",
  start: ${AUDIT_RANGE},
  predicate: (r) => r._measurement == "${esc(measurement)}",
)
`.trim()
  const rows = await collectRows(flux)
  return rows
    .map((r) => String(readField(r, '_value') ?? ''))
    .filter((s) => s.length > 0)
    .sort()
}

async function schemaTagKeys(bucket: string, measurement: string): Promise<string[]> {
  const flux = `
import "influxdata/influxdb/schema"
schema.tagKeys(
  bucket: "${esc(bucket)}",
  start: ${AUDIT_RANGE},
  predicate: (r) => r._measurement == "${esc(measurement)}",
)
`.trim()
  const rows = await collectRows(flux)
  return rows
    .map((r) => String(readField(r, '_value') ?? ''))
    .filter((s) => s.length > 0)
    .sort()
}

async function topCountsForTag(
  bucket: string,
  measurement: string,
  tag: string,
  limit = 30,
): Promise<TopCount[]> {
  const flux = `
from(bucket: "${esc(bucket)}")
  |> range(start: ${AUDIT_RANGE})
  |> filter(fn: (r) => r._measurement == "${esc(measurement)}")
  |> filter(fn: (r) => exists r.${tag})
  |> map(fn: (r) => ({ r with k: string(v: r.${tag}), one: 1 }))
  |> filter(fn: (r) => r.k != "")
  |> keep(columns: ["k", "one"])
  |> group(columns: ["k"])
  |> count(column: "one")
  |> sort(columns: ["one"], desc: true)
  |> limit(n: ${limit})
`.trim()
  const rows = await collectRows(flux)
  return rows
    .map((r) => {
      const key = String(readField(r, 'k') ?? '')
      const count = toFiniteNumber(readField(r, 'one'))
      return { key, count }
    })
    .filter((r) => r.key && Number.isFinite(r.count))
}

async function topEventLabelValues(bucket: string, limit = 60): Promise<TopCount[]> {
  const fieldFilter =
    EVENT_LABEL_FIELDS.length > 0
      ? EVENT_LABEL_FIELDS
          .map((f) => `r["_field"] == "${esc(f)}"`)
          .join(' or ')
      : 'false'

  const flux = `
from(bucket: "${esc(bucket)}")
  |> range(start: ${AUDIT_RANGE})
  |> filter(fn: (r) => r._measurement == "${esc(PROVIDERS_MEASUREMENT)}")
  |> filter(fn: (r) => r.label == "label_count")
  |> filter(fn: (r) => ${fieldFilter})
  |> map(fn: (r) => ({ r with lbl: string(v: r._value), one: 1 }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["lbl", "one"])
  |> group(columns: ["lbl"])
  |> count(column: "one")
  |> sort(columns: ["one"], desc: true)
  |> limit(n: ${limit})
`.trim()
  const rows = await collectRows(flux)
  return rows
    .map((r) => {
      const key = String(readField(r, 'lbl') ?? '')
      const count = toFiniteNumber(readField(r, 'one'))
      return { key, count }
    })
    .filter((r) => r.key && Number.isFinite(r.count))
}

async function fieldAvailabilityByMeasurement(
  bucket: string,
  field: string,
): Promise<TopCount[]> {
  const flux = `
from(bucket: "${esc(bucket)}")
  |> range(start: ${AUDIT_RANGE})
  |> filter(fn: (r) => r._field == "${esc(field)}")
  |> map(fn: (r) => ({ r with one: 1 }))
  |> keep(columns: ["_measurement", "one"])
  |> group(columns: ["_measurement"])
  |> count(column: "one")
  |> sort(columns: ["one"], desc: true)
  |> limit(n: 20)
`.trim()
  const rows = await collectRows(flux)
  return rows
    .map((r) => ({
      key: String(readField(r, '_measurement') ?? ''),
      count: toFiniteNumber(readField(r, 'one')),
    }))
    .filter((r) => r.key && Number.isFinite(r.count))
}

async function buildCandidateFieldAvailability(
  bucket: string,
): Promise<CandidateFieldAvailability[]> {
  const intents: Array<{ metricIntent: string; candidateFields: string[] }> = [
    {
      metricIntent: 'GPS Satellites',
      candidateFields: ['satellites', 'gps_satellites', 'sats', 'nsat'],
    },
    {
      metricIntent: 'DOP',
      candidateFields: ['dop', 'pdop', 'hdop', 'vdop'],
    },
    {
      metricIntent: 'Instant acceleration',
      candidateFields: [
        'instant_acceleration',
        'acceleration',
        'accel',
        'imu_accel_x',
        'imu_accel_y',
        'imu_accel_z',
      ],
    },
    {
      metricIntent: 'Engine odometer',
      candidateFields: [
        'engine_odometer',
        'odometer',
        'ecu_odometer',
        'dev_dist',
        'dev_dist__km',
      ],
    },
    {
      metricIntent: 'Engine hourmeter',
      candidateFields: ['engine_hourmeter', 'hourmeter', 'engine_hours', 'dev_idle'],
    },
  ]

  const out: CandidateFieldAvailability[] = []
  for (const intent of intents) {
    const byField: CandidateFieldAvailability['byField'] = {}
    for (const f of intent.candidateFields) {
      const measurements = await fieldAvailabilityByMeasurement(bucket, f)
      byField[f] = {
        found: measurements.length > 0,
        measurements,
      }
    }
    out.push({
      metricIntent: intent.metricIntent,
      candidateFields: intent.candidateFields,
      byField,
    })
  }
  return out
}

function mdList(values: string[]): string {
  return values.length ? values.map((v) => `\`${v}\``).join(', ') : '_none_'
}

function toMarkdown(params: {
  bucket: string
  org: string
  measurements: MeasurementSchema[]
  topProviders: TopCount[]
  topLabels: TopCount[]
  candidates: CandidateFieldAvailability[]
}): string {
  const {
    bucket,
    org,
    measurements,
    topProviders,
    topLabels,
    candidates,
  } = params

  const supportRows = [
    '| Number of Entities | Yes (live) | Distinct `vid` by `provider` is directly queryable. |',
    '| Integration % | Not yet | Requires external capability baseline + verification evidence (not in bucket alone). |',
    '| Event labels / Alarms Info | Partial | Label signals are present (`label_count` + label fields), but matrix support semantics still require business mapping. |',
    '| Event Data Fields / Data Richness | Partial | Candidate telemetry fields exist, but canonical field mapping and data quality policy still needed. |',
    '| Risk Index Enablement | Not yet | Needs hybrid formula inputs (including computable Integration % + operational readiness evidence). |',
  ]

  return `# Influx Bucket Audit

## Audit Metadata

- **Org:** \`${org}\`
- **Bucket:** \`${bucket}\`
- **Audit window:** \`${AUDIT_RANGE}\`
- **Providers measurement env:** \`${PROVIDERS_MEASUREMENT}\`
- **Event label fields env:** ${EVENT_LABEL_FIELDS.map((f) => `\`${f}\``).join(', ') || '_none_'}

## Measurements Found

${measurements.map((m) => `- **\`${m.measurement}\`**`).join('\n')}

## Tags/Fields by Measurement

${measurements
  .map(
    (m) => `### \`${m.measurement}\`

- **Tag keys:** ${mdList(m.tagKeys)}
- **Field keys:** ${mdList(m.fieldKeys)}
`,
  )
  .join('\n')}

## Important Provider Values (Top)

| provider | count |
|---|---:|
${topProviders.map((r) => `| \`${r.key}\` | ${Math.round(r.count)} |`).join('\n') || '| _none_ | 0 |'}

## Important Label Values (Top from label_count)

| label value | count |
|---|---:|
${topLabels.map((r) => `| \`${r.key}\` | ${Math.round(r.count)} |`).join('\n') || '| _none_ | 0 |'}

## Candidate Data-Richness Fields

${candidates
  .map((c) => {
    const lines = c.candidateFields.map((f) => {
      const info = c.byField[f]
      const found = info?.found ? 'yes' : 'no'
      const where =
        info && info.measurements.length
          ? info.measurements
              .slice(0, 4)
              .map((m) => `\`${m.key}\` (${Math.round(m.count)})`)
              .join(', ')
          : '_not observed_'
      return `| \`${f}\` | ${found} | ${where} |`
    })
    return `### ${c.metricIntent}

| candidate field | observed in window | top measurements |
|---|---|---|
${lines.join('\n')}
`
  })
  .join('\n')}

## Reliability / Ambiguity Notes

- The providers measurement appears to contain mixed telemetry and metadata fields; field semantics are not uniform across all providers.
- Label values can be multilingual / code-based depending on field key; label_type is the safest canonical key for grouping.
- Presence of a field does not imply reliable coverage across all providers/vehicles; this audit shows availability, not quality SLA.

## Dashboard Supportability from Bucket

| Dashboard Row | Supportable from bucket today? | Notes |
|---|---|---|
${supportRows.join('\n')}
`
}

async function main() {
  if (!isInfluxConfigured()) {
    throw new Error(
      'Influx env is not fully configured (INFLUX_HOST/TOKEN/ORG/BUCKET).',
    )
  }

  const bucket = getInfluxBucket()
  const org = getInfluxOrg()

  console.log(
    `[audit] start org=${org} bucket=${bucket} range=${AUDIT_RANGE} providersMeasurement=${PROVIDERS_MEASUREMENT}`,
  )

  const measurements = await schemaMeasurements(bucket)
  const schemas: MeasurementSchema[] = []
  for (const measurement of measurements) {
    const [fieldKeys, tagKeys] = await Promise.all([
      schemaFieldKeys(bucket, measurement),
      schemaTagKeys(bucket, measurement),
    ])
    schemas.push({ measurement, fieldKeys, tagKeys })
  }

  const [topProviders, topLabels, candidateAvailability] = await Promise.all([
    topCountsForTag(bucket, PROVIDERS_MEASUREMENT, 'provider', 50),
    topEventLabelValues(bucket, 80),
    buildCandidateFieldAvailability(bucket),
  ])

  await mkdir(OUTPUT_DIR, { recursive: true })
  await Promise.all([
    writeFile(
      resolve(OUTPUT_DIR, 'measurements.json'),
      JSON.stringify(schemas, null, 2) + '\n',
      'utf8',
    ),
    writeFile(
      resolve(OUTPUT_DIR, 'providers.json'),
      JSON.stringify(topProviders, null, 2) + '\n',
      'utf8',
    ),
    writeFile(
      resolve(OUTPUT_DIR, 'labels.json'),
      JSON.stringify(topLabels, null, 2) + '\n',
      'utf8',
    ),
    writeFile(
      resolve(OUTPUT_DIR, 'field-availability.json'),
      JSON.stringify(candidateAvailability, null, 2) + '\n',
      'utf8',
    ),
  ])

  const markdown = toMarkdown({
    bucket,
    org,
    measurements: schemas,
    topProviders,
    topLabels,
    candidates: candidateAvailability,
  })
  await writeFile(MARKDOWN_PATH, markdown, 'utf8')

  console.log(
    `[audit] done measurements=${schemas.length} providers=${topProviders.length} labels=${topLabels.length}`,
  )
  console.log(`[audit] wrote ${MARKDOWN_PATH}`)
}

main().catch((e) => {
  console.error('[audit] failed', e)
  process.exitCode = 1
})
