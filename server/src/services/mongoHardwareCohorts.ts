import type { Filter, Document } from 'mongodb'
import { INTERNAL_HARDWARE_COHORTS } from '../config/internalHardwareCohorts.js'
import { getMongoClient } from '../lib/mongo.js'
import {
  getMongoDbName,
  getMongoVehiclesCollectionName,
  isMongoConfigured,
} from '../lib/mongoEnv.js'

export type HardwareCohortVidSets = Record<string, Set<string>>

type CohortVidCacheEntry = {
  builtAt: number
  data: HardwareCohortVidSets
}

let cohortVidCache: CohortVidCacheEntry | null = null

function getHardwareCohortVidCacheTtlMs(): number {
  const raw = process.env.INTERNAL_HARDWARE_COHORTS_CACHE_TTL_MS?.trim()
  if (!raw) {
    return 15 * 60_000
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : 15 * 60_000
}

function cloneHardwareCohortVidSets(src: HardwareCohortVidSets): HardwareCohortVidSets {
  const out: HardwareCohortVidSets = {}
  for (const [slug, vids] of Object.entries(src)) {
    out[slug] = new Set<string>(vids)
  }
  return out
}

function normalizeVid(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

type CohortDocIdentity = {
  id?: unknown
  id_str?: unknown
  deviceVersion?: {
    device?: unknown
    model?: unknown
    extras?: unknown
  }
}

function canonicalVidFromDoc(doc: CohortDocIdentity): string | null {
  const fromId = normalizeVid(doc.id)
  if (fromId) {
    return fromId
  }
  const fromIdStr = normalizeVid(doc.id_str)
  if (fromIdStr) {
    return fromIdStr
  }
  return null
}

/**
 * Reads Mongo-defined internal hardware cohorts and returns distinct VID sets by cohort slug.
 */
export async function fetchHardwareCohortVidSetsFromMongo(): Promise<HardwareCohortVidSets> {
  const ttlMs = getHardwareCohortVidCacheTtlMs()
  const now = Date.now()
  if (ttlMs > 0 && cohortVidCache && now - cohortVidCache.builtAt < ttlMs) {
    const ageMs = now - cohortVidCache.builtAt
    const expiresInMs = ttlMs - ageMs
    console.log(
      `[mongo/cohorts/cache] hit ageMs=${ageMs} ttlMs=${ttlMs} expiresInMs=${expiresInMs}`,
    )
    return cloneHardwareCohortVidSets(cohortVidCache.data)
  }
  const reason = cohortVidCache ? 'expired' : 'empty'
  console.log(`[mongo/cohorts/cache] miss ttlMs=${ttlMs} reason=${reason}`)

  const out: HardwareCohortVidSets = {}
  for (const c of INTERNAL_HARDWARE_COHORTS) {
    out[c.slug] = new Set<string>()
  }

  const mongoConfigured = isMongoConfigured()
  console.log(`[mongo/cohorts] env_configured=${mongoConfigured}`)
  if (!mongoConfigured) {
    console.log('[mongo/cohorts] skipped reason=env_not_configured')
    return out
  }

  const dbName = getMongoDbName()
  const collName = getMongoVehiclesCollectionName()
  const coll = getMongoClient().db(dbName).collection(collName)

  console.log(
    `[mongo/cohorts] start db=${dbName} collection=${collName} cohorts=${INTERNAL_HARDWARE_COHORTS.length}`,
  )

  for (const cohort of INTERNAL_HARDWARE_COHORTS) {
    const filter = cohort.mongoFilter as Filter<Document>
    console.log(
      `[mongo/cohorts] query cohort=${cohort.name} slug=${cohort.slug} filter=${JSON.stringify(filter)}`,
    )
    const bucket = out[cohort.slug] ?? new Set<string>()

    const docs = (await coll
      .find(filter, {
        projection: {
          _id: 0,
          id: 1,
          id_str: 1,
          'deviceVersion.device': 1,
          'deviceVersion.model': 1,
          'deviceVersion.extras': 1,
        },
      })
      .toArray()) as CohortDocIdentity[]

    let docsWithId = 0
    let docsWithIdStr = 0
    let docsDroppedMissingIdentity = 0
    let docsUsingFallbackIdStr = 0

    for (const doc of docs) {
      if (normalizeVid(doc.id)) {
        docsWithId += 1
      }
      if (normalizeVid(doc.id_str)) {
        docsWithIdStr += 1
      }

      const canonical = canonicalVidFromDoc(doc)
      if (!canonical) {
        docsDroppedMissingIdentity += 1
        continue
      }
      if (!normalizeVid(doc.id) && normalizeVid(doc.id_str)) {
        docsUsingFallbackIdStr += 1
      }
      bucket.add(canonical)
    }

    console.log(
      `[mongo/cohorts] identity cohort=${cohort.name} docs_matched=${docs.length} docs_with_id=${docsWithId} docs_with_id_str=${docsWithIdStr} docs_dropped_missing_identity=${docsDroppedMissingIdentity} docs_using_fallback_id_str=${docsUsingFallbackIdStr}`,
    )
    console.log(
      `[mongo/cohorts] result cohort=${cohort.name} slug=${cohort.slug} canonical_vids=${bucket.size}`,
    )
    if (docs.length > 0) {
      console.log(
        `[mongo/cohorts] sample cohort=${cohort.name} first_doc_identity=${JSON.stringify({
          id: docs[0]?.id ?? null,
          id_str: docs[0]?.id_str ?? null,
        })}`,
      )
    }

    out[cohort.slug] = bucket
  }

  if (ttlMs > 0) {
    cohortVidCache = { builtAt: Date.now(), data: cloneHardwareCohortVidSets(out) }
    console.log(`[mongo/cohorts/cache] store ttlMs=${ttlMs}`)
  } else {
    console.log('[mongo/cohorts/cache] disabled (INTERNAL_HARDWARE_COHORTS_CACHE_TTL_MS=0)')
  }

  return cloneHardwareCohortVidSets(out)
}
