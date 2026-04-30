import { COHORT_DEFINITIONS, TELTONIKA_PROVIDER_SLUG, TELTONIKA_SLUG } from '../config/cohorts.js'
import type { CohortSlug, CohortSnapshot, CohortSnapshotItem } from '../types.js'
import { escapeFluxString, fluxVidArray, getQueryApi } from '../lib/influx.js'

type RefreshConfig = {
  influxUrl: string
  influxToken: string
  influxOrg: string
  influxBucket: string
  influxMeasurement: string
  influxRange: string
  influxEventLabelFields: string
  influxVidChunkSize: number
  influxEntitiesVidChunkSize: number
  influxQueryTimeoutMs: number
  refreshIntervalMs: number
}

type CohortMongoInfo = {
  vids: string[]
  docsMatched: number
  canonicalVids: number
}

function buildCohortInfoFromCatalog(
  catalogCohorts: Record<CohortSlug, string[]>,
): Record<CohortSlug, CohortMongoInfo> {
  const out = {} as Record<CohortSlug, CohortMongoInfo>
  for (const c of COHORT_DEFINITIONS) {
    const vids = [...new Set((catalogCohorts[c.slug] ?? []).map((v) => String(v).trim()).filter(Boolean))]
    out[c.slug] = {
      vids,
      // Snapshot contract preserved: expose cohort membership counts in existing mongo block.
      docsMatched: vids.length,
      canonicalVids: vids.length,
    }
  }
  return out
}

async function fetchEntitiesByVidSet(
  config: RefreshConfig,
  vids: string[],
  onChunkError?: (message: string) => void,
): Promise<number> {
  if (vids.length === 0) return 0
  let total = 0
  let successCount = 0
  for (const chunk of chunkArray(vids, config.influxEntitiesVidChunkSize)) {
    const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => exists r.vid)
  |> filter(fn: (r) => r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(chunk)}))
  |> keep(columns: ["vid"])
  |> unique(column: "vid")
  |> group()
  |> count(column: "vid")
`.trim()
    try {
      const rows = await queryApiForConfig(config).collectRows(flux)
      const row = rows[0] as Record<string, unknown> | undefined
      const v = row?.vid ?? row?._value
      const n = typeof v === 'number' ? v : Number(v ?? 0)
      total += Number.isFinite(n) ? n : 0
      successCount += 1
    } catch (e) {
      onChunkError?.(`entities chunk_failed size=${chunk.length} error=${String(e)}`)
    }
  }
  if (successCount === 0) {
    throw new Error('entities all chunks failed')
  }
  return total
}

async function fetchEntitiesByProvider(config: RefreshConfig, providerSlug: string): Promise<number> {
  const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => exists r.provider and r.provider == "${escapeFluxString(providerSlug)}")
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> keep(columns: ["_time", "vid"])
  |> group(columns: ["vid"])
  |> first(column: "_time")
  |> group()
  |> count(column: "vid")
`.trim()
  const rows = await queryApiForConfig(config).collectRows(flux)
  const row = rows[0] as Record<string, unknown> | undefined
  const v = row?.vid ?? row?._value
  return typeof v === 'number' ? v : Number(v ?? 0)
}

async function fetchEventLabelsByVidSet(
  config: RefreshConfig,
  vids: string[],
  onChunkError?: (message: string) => void,
): Promise<Record<string, number>> {
  if (vids.length === 0) return {}
  const fields = config.influxEventLabelFields.split(',').map((s) => s.trim()).filter(Boolean)
  const fieldOrs = fields.map((f) => `r["_field"] == "${escapeFluxString(f)}"`).join(' or ')
  const out: Record<string, number> = {}
  let successCount = 0
  for (const chunk of chunkArray(vids, config.influxVidChunkSize)) {
    const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => r["label"] == "label_count")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(chunk)}))
  |> map(fn: (r) => ({ r with lbl: string(v: r._value) }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["_time", "vid", "lbl"])
  |> group(columns: ["vid", "lbl"])
  |> first(column: "_time")
  |> group(columns: ["lbl"])
  |> count(column: "vid")
`.trim()
    try {
      const rows = await queryApiForConfig(config).collectRows(flux)
      for (const row of rows as Array<Record<string, unknown>>) {
        const lbl = String(row.lbl ?? '')
        if (!lbl) continue
        const n = Number(row.vid ?? row._value ?? 0)
        if (!Number.isFinite(n)) continue
        out[lbl] = (out[lbl] ?? 0) + n
      }
      successCount += 1
    } catch (e) {
      onChunkError?.(`eventLabels chunk_failed size=${chunk.length} error=${String(e)}`)
    }
  }
  if (successCount === 0) {
    throw new Error('eventLabels all chunks failed')
  }
  return out
}

async function fetchEventLabelsByProvider(
  config: RefreshConfig,
  providerSlug: string,
): Promise<Record<string, number>> {
  const fields = config.influxEventLabelFields.split(',').map((s) => s.trim()).filter(Boolean)
  const fieldOrs = fields.map((f) => `r["_field"] == "${escapeFluxString(f)}"`).join(' or ')
  const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => exists r.provider and r.provider == "${escapeFluxString(providerSlug)}")
  |> filter(fn: (r) => r["label"] == "label_count")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> map(fn: (r) => ({ r with lbl: string(v: r._value) }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["_time", "vid", "lbl"])
  |> group(columns: ["vid", "lbl"])
  |> first(column: "_time")
  |> group(columns: ["lbl"])
  |> count(column: "vid")
`.trim()
  const rows = await queryApiForConfig(config).collectRows(flux)
  const out: Record<string, number> = {}
  for (const row of rows as Array<Record<string, unknown>>) {
    const lbl = String(row.lbl ?? '')
    if (!lbl) continue
    const n = Number(row.vid ?? row._value ?? 0)
    if (!Number.isFinite(n)) continue
    out[lbl] = n
  }
  return out
}

async function fetchRichnessByVidSet(
  config: RefreshConfig,
  vids: string[],
  onChunkError?: (message: string) => void,
): Promise<Record<string, number>> {
  if (vids.length === 0) return {}
  const proxyFields = ['hdop', 'dev_dist', 'dev_idle']
  const fieldOrs = proxyFields
    .map((f) => `r["_field"] == "${escapeFluxString(f)}"`)
    .join(' or ')
  const out: Record<string, number> = {}
  let successCount = 0
  for (const chunk of chunkArray(vids, config.influxVidChunkSize)) {
    const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(chunk)}))
  |> keep(columns: ["_time", "_field", "vid"])
  |> group(columns: ["_field", "vid"])
  |> first(column: "_time")
  |> group(columns: ["_field"])
  |> count(column: "vid")
`.trim()
    try {
      const rows = await queryApiForConfig(config).collectRows(flux)
      for (const row of rows as Array<Record<string, unknown>>) {
        const field = String(row._field ?? '')
        if (!field) continue
        const n = Number(row.vid ?? row._value ?? 0)
        if (!Number.isFinite(n)) continue
        out[field] = (out[field] ?? 0) + n
      }
      successCount += 1
    } catch (e) {
      onChunkError?.(`richness chunk_failed size=${chunk.length} error=${String(e)}`)
    }
  }
  if (successCount === 0) {
    throw new Error('richness all chunks failed')
  }
  return out
}

function chunkArray<T>(arr: T[], rawChunkSize: number): T[][] {
  const chunkSize = Number.isFinite(rawChunkSize) && rawChunkSize > 0 ? Math.floor(rawChunkSize) : 200
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    out.push(arr.slice(i, i + chunkSize))
  }
  return out
}

function queryApiForConfig(config: RefreshConfig) {
  return getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
    timeoutMs: config.influxQueryTimeoutMs,
  })
}

async function fetchRichnessByProvider(
  config: RefreshConfig,
  providerSlug: string,
): Promise<Record<string, number>> {
  const proxyFields = ['hdop', 'dev_dist', 'dev_idle']
  const fieldOrs = proxyFields
    .map((f) => `r["_field"] == "${escapeFluxString(f)}"`)
    .join(' or ')
  const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => exists r.provider and r.provider == "${escapeFluxString(providerSlug)}")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> keep(columns: ["_time", "_field", "vid"])
  |> group(columns: ["_field", "vid"])
  |> first(column: "_time")
  |> group(columns: ["_field"])
  |> count(column: "vid")
`.trim()
  const rows = await queryApiForConfig(config).collectRows(flux)
  const out: Record<string, number> = {}
  for (const row of rows as Array<Record<string, unknown>>) {
    const field = String(row._field ?? '')
    if (!field) continue
    const n = Number(row.vid ?? row._value ?? 0)
    if (!Number.isFinite(n)) continue
    out[field] = n
  }
  return out
}

export async function runCohortRefresh(
  config: RefreshConfig,
  catalogCohorts: Record<CohortSlug, string[]>,
): Promise<CohortSnapshot> {
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  const mongo = buildCohortInfoFromCatalog(catalogCohorts)
  for (const c of COHORT_DEFINITIONS) {
    console.log(
      `[cohort-service] snapshot catalog_membership cohort=${c.slug} vids=${mongo[c.slug].canonicalVids}`,
    )
  }

  const cohorts: Record<CohortSlug, CohortSnapshotItem> = {
    __internal_teltonika: {
      entities: null,
      eventLabels: {},
      richness: {},
      status: 'empty',
    },
    __internal_lynx: {
      entities: null,
      eventLabels: {},
      richness: {},
      status: 'empty',
    },
    __internal_antares: {
      entities: null,
      eventLabels: {},
      richness: {},
      status: 'empty',
    },
    __internal_syrus: {
      entities: null,
      eventLabels: {},
      richness: {},
      status: 'empty',
    },
  }

  for (const c of COHORT_DEFINITIONS) {
    try {
      const cohortMongo = mongo[c.slug]
      if (!cohortMongo || cohortMongo.canonicalVids <= 0) {
        cohorts[c.slug] = { entities: 0, eventLabels: {}, richness: {}, status: 'empty' }
        continue
      }
      let partialChunkFailure = false
      const onChunkError = (message: string) => {
        partialChunkFailure = true
        errors.push(`cohort=${c.slug} ${message}`)
      }

      const entities =
        c.slug === TELTONIKA_SLUG
          ? await fetchEntitiesByProvider(config, TELTONIKA_PROVIDER_SLUG)
          : await fetchEntitiesByVidSet(config, cohortMongo.vids, onChunkError)

      const eventLabels =
        c.slug === TELTONIKA_SLUG
          ? await fetchEventLabelsByProvider(config, TELTONIKA_PROVIDER_SLUG)
          : await fetchEventLabelsByVidSet(config, cohortMongo.vids, onChunkError)

      const richness =
        c.slug === TELTONIKA_SLUG
          ? await fetchRichnessByProvider(config, TELTONIKA_PROVIDER_SLUG)
          : await fetchRichnessByVidSet(config, cohortMongo.vids, onChunkError)

      cohorts[c.slug] = {
        entities,
        eventLabels,
        richness,
        status: partialChunkFailure ? 'partial' : entities > 0 ? 'ok' : 'partial',
      }
    } catch (e) {
      errors.push(`cohort=${c.slug} refresh_failed=${String(e)}`)
      cohorts[c.slug] = {
        entities: 0,
        eventLabels: {},
        richness: {},
        status: 'error',
      }
    }
  }

  return {
    version: startedAt,
    generatedAt: startedAt,
    stale: false,
    ttlMs: config.refreshIntervalMs,
    cohorts,
    mongo: {
      __internal_teltonika: {
        docsMatched: mongo.__internal_teltonika.docsMatched,
        canonicalVids: mongo.__internal_teltonika.canonicalVids,
      },
      __internal_lynx: {
        docsMatched: mongo.__internal_lynx.docsMatched,
        canonicalVids: mongo.__internal_lynx.canonicalVids,
      },
      __internal_antares: {
        docsMatched: mongo.__internal_antares.docsMatched,
        canonicalVids: mongo.__internal_antares.canonicalVids,
      },
      __internal_syrus: {
        docsMatched: mongo.__internal_syrus.docsMatched,
        canonicalVids: mongo.__internal_syrus.canonicalVids,
      },
    },
    errors,
  }
}
