import type { Filter, Document } from 'mongodb'
import { COHORT_DEFINITIONS, TELTONIKA_PROVIDER_SLUG, TELTONIKA_SLUG } from '../config/cohorts.js'
import type { CohortSlug, CohortSnapshot } from '../types.js'
import { getMongoClient } from '../lib/mongo.js'
import { escapeFluxString, fluxVidArray, getQueryApi } from '../lib/influx.js'

type RefreshConfig = {
  mongoUri: string
  mongoDbName: string
  mongoVehiclesCollection: string
  influxUrl: string
  influxToken: string
  influxOrg: string
  influxBucket: string
  influxMeasurement: string
  influxRange: string
  influxEventLabelFields: string
  refreshIntervalMs: number
}

type CohortMongoInfo = {
  vids: string[]
  docsMatched: number
  canonicalVids: number
}

function normalizeVid(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

function canonicalVidFromDoc(doc: { id?: unknown; id_str?: unknown }): string | null {
  return normalizeVid(doc.id) ?? normalizeVid(doc.id_str)
}

async function fetchCohortMongoInfo(config: RefreshConfig): Promise<Record<CohortSlug, CohortMongoInfo>> {
  const coll = getMongoClient(config.mongoUri)
    .db(config.mongoDbName)
    .collection(config.mongoVehiclesCollection)

  const out = {} as Record<CohortSlug, CohortMongoInfo>
  for (const c of COHORT_DEFINITIONS) {
    const docs = (await coll
      .find(c.mongoFilter as Filter<Document>, {
        projection: { _id: 0, id: 1, id_str: 1 },
      })
      .toArray()) as Array<{ id?: unknown; id_str?: unknown }>

    const vids = new Set<string>()
    for (const doc of docs) {
      const v = canonicalVidFromDoc(doc)
      if (v) vids.add(v)
    }
    out[c.slug] = {
      vids: [...vids],
      docsMatched: docs.length,
      canonicalVids: vids.size,
    }
  }
  return out
}

async function fetchEntitiesByVidSet(
  config: RefreshConfig,
  vids: string[],
): Promise<number> {
  if (vids.length === 0) return 0
  const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => exists r.vid)
  |> filter(fn: (r) => r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(vids)}))
  |> keep(columns: ["_time", "vid"])
  |> group(columns: ["vid"])
  |> first(column: "_time")
  |> group()
  |> count(column: "vid")
`.trim()
  const rows = await getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
  }).collectRows(flux)
  const row = rows[0] as Record<string, unknown> | undefined
  const v = row?.vid ?? row?._value
  return typeof v === 'number' ? v : Number(v ?? 0)
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
  const rows = await getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
  }).collectRows(flux)
  const row = rows[0] as Record<string, unknown> | undefined
  const v = row?.vid ?? row?._value
  return typeof v === 'number' ? v : Number(v ?? 0)
}

async function fetchEventLabelsByVidSet(
  config: RefreshConfig,
  vids: string[],
): Promise<Record<string, number>> {
  if (vids.length === 0) return {}
  const fields = config.influxEventLabelFields.split(',').map((s) => s.trim()).filter(Boolean)
  const fieldOrs = fields.map((f) => `r["_field"] == "${escapeFluxString(f)}"`).join(' or ')
  const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => r["label"] == "label_count")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(vids)}))
  |> map(fn: (r) => ({ r with lbl: string(v: r._value) }))
  |> filter(fn: (r) => r.lbl != "")
  |> keep(columns: ["_time", "vid", "lbl"])
  |> group(columns: ["vid", "lbl"])
  |> first(column: "_time")
  |> group(columns: ["lbl"])
  |> count(column: "vid")
`.trim()
  const rows = await getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
  }).collectRows(flux)
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
  const rows = await getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
  }).collectRows(flux)
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
): Promise<Record<string, number>> {
  if (vids.length === 0) return {}
  const proxyFields = ['hdop', 'dev_dist', 'dev_idle']
  const fieldOrs = proxyFields
    .map((f) => `r["_field"] == "${escapeFluxString(f)}"`)
    .join(' or ')
  const flux = `
from(bucket: "${escapeFluxString(config.influxBucket)}")
  |> range(start: ${config.influxRange})
  |> filter(fn: (r) => r["_measurement"] == "${escapeFluxString(config.influxMeasurement)}")
  |> filter(fn: (r) => ${fieldOrs})
  |> filter(fn: (r) => exists r.vid and r.vid != "")
  |> filter(fn: (r) => contains(value: r.vid, set: ${fluxVidArray(vids)}))
  |> keep(columns: ["_time", "_field", "vid"])
  |> group(columns: ["_field", "vid"])
  |> first(column: "_time")
  |> group(columns: ["_field"])
  |> count(column: "vid")
`.trim()
  const rows = await getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
  }).collectRows(flux)
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
  const rows = await getQueryApi({
    url: config.influxUrl,
    token: config.influxToken,
    org: config.influxOrg,
  }).collectRows(flux)
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

export async function runCohortRefresh(config: RefreshConfig): Promise<CohortSnapshot> {
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  const mongo = await fetchCohortMongoInfo(config)

  const cohorts = {
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
  } satisfies CohortSnapshot['cohorts']

  for (const c of COHORT_DEFINITIONS) {
    try {
      const cohortMongo = mongo[c.slug]
      if (!cohortMongo || cohortMongo.canonicalVids <= 0) {
        cohorts[c.slug] = { entities: 0, eventLabels: {}, richness: {}, status: 'empty' }
        continue
      }
      const entities =
        c.slug === TELTONIKA_SLUG
          ? await fetchEntitiesByProvider(config, TELTONIKA_PROVIDER_SLUG)
          : await fetchEntitiesByVidSet(config, cohortMongo.vids)

      const eventLabels =
        c.slug === TELTONIKA_SLUG
          ? await fetchEventLabelsByProvider(config, TELTONIKA_PROVIDER_SLUG)
          : await fetchEventLabelsByVidSet(config, cohortMongo.vids)

      const richness =
        c.slug === TELTONIKA_SLUG
          ? await fetchRichnessByProvider(config, TELTONIKA_PROVIDER_SLUG)
          : await fetchRichnessByVidSet(config, cohortMongo.vids)

      cohorts[c.slug] = {
        entities,
        eventLabels,
        richness,
        status: entities > 0 ? 'ok' : 'partial',
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
