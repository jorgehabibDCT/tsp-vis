import type { Filter, Document } from 'mongodb'
import { INTERNAL_HARDWARE_COHORTS } from '../config/internalHardwareCohorts.js'
import { getMongoClient } from '../lib/mongo.js'
import {
  getMongoDbName,
  getMongoVehiclesCollectionName,
  isMongoConfigured,
} from '../lib/mongoEnv.js'

export type HardwareCohortVidSets = Record<string, Set<string>>
const VEHICLE_ID_DISTINCT_FIELDS = ['id_str', 'id', 'vid'] as const

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
    for (const field of VEHICLE_ID_DISTINCT_FIELDS) {
      const values = (await coll.distinct(field, filter)) as unknown[]
      let addedForField = 0
      for (const raw of values) {
        const vid = normalizeVid(raw)
        if (vid && !bucket.has(vid)) {
          bucket.add(vid)
          addedForField += 1
        }
      }
      console.log(
        `[mongo/cohorts] distinct field=${field} cohort=${cohort.name} raw_values=${values.length} added_unique=${addedForField}`,
      )
    }
    out[cohort.slug] = bucket
    console.log(
      `[mongo/cohorts] result cohort=${cohort.name} slug=${cohort.slug} distinct_vids=${bucket.size}`,
    )
  }

  return out
}
