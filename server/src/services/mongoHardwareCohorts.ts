import type { Filter, Document } from 'mongodb'
import { INTERNAL_HARDWARE_COHORTS } from '../config/internalHardwareCohorts.js'
import { getMongoClient } from '../lib/mongo.js'
import {
  getMongoDbName,
  getMongoVehiclesCollectionName,
  isMongoConfigured,
} from '../lib/mongoEnv.js'

export type HardwareCohortVidSets = Record<string, Set<string>>

function normalizeVid(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

/**
 * Reads Mongo-defined internal hardware cohorts and returns distinct VID sets by cohort slug.
 */
export async function fetchHardwareCohortVidSetsFromMongo(): Promise<HardwareCohortVidSets> {
  const out: HardwareCohortVidSets = {}
  for (const c of INTERNAL_HARDWARE_COHORTS) {
    out[c.slug] = new Set<string>()
  }

  if (!isMongoConfigured()) {
    console.log('[mongo/cohorts] skipped (mongo env not configured)')
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
    const values = (await coll.distinct('vid', filter)) as unknown[]
    const bucket = out[cohort.slug] ?? new Set<string>()
    for (const raw of values) {
      const vid = normalizeVid(raw)
      if (vid) {
        bucket.add(vid)
      }
    }
    out[cohort.slug] = bucket
    console.log(
      `[mongo/cohorts] cohort=${cohort.slug} distinct_vids=${bucket.size}`,
    )
  }

  return out
}
