import { getMongoClient } from '../lib/mongo.js'
import type {
  CohortSlug,
  HardwareCatalogSnapshot,
  HardwareCatalogVehicle,
} from '../types.js'

type CatalogConfig = {
  mongoUri: string
  mongoDbName: string
  mongoVehiclesCollection: string
}

type VehicleDoc = {
  id?: unknown
  id_str?: unknown
  deviceVersion?: {
    device?: unknown
    model?: unknown
    extras?: unknown
  }
}

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function canonicalVidFromDoc(doc: VehicleDoc): string | null {
  const id = normalizeString(doc.id)
  if (id) return id
  const idStr = normalizeString(doc.id_str)
  if (idStr) return idStr
  return null
}

function classifyCohort(device: string, model: string, extras: string): CohortSlug | null {
  if (device === 'teltonika') return '__internal_teltonika'
  if (model === 'Syrus Lynx') return '__internal_lynx'
  if (device === 'syrus' && extras === 'EG912U') return '__internal_antares'
  if (device === 'syrus' && model !== 'Syrus Lynx' && extras !== 'EG912U') return '__internal_syrus'
  return null
}

export async function runCatalogRefresh(config: CatalogConfig): Promise<HardwareCatalogSnapshot> {
  const coll = getMongoClient(config.mongoUri)
    .db(config.mongoDbName)
    .collection(config.mongoVehiclesCollection)

  const docs = (await coll
    .find(
      {},
      {
        projection: {
          _id: 0,
          id: 1,
          id_str: 1,
          'deviceVersion.device': 1,
          'deviceVersion.model': 1,
          'deviceVersion.extras': 1,
        },
      },
    )
    .toArray()) as VehicleDoc[]

  const vehicles: Record<string, HardwareCatalogVehicle> = {}
  const cohorts: Record<CohortSlug, string[]> = {
    __internal_teltonika: [],
    __internal_lynx: [],
    __internal_antares: [],
    __internal_syrus: [],
  }
  const errors: string[] = []

  for (const doc of docs) {
    const vid = canonicalVidFromDoc(doc)
    if (!vid) continue

    const device = normalizeString(doc.deviceVersion?.device)
    const model = normalizeString(doc.deviceVersion?.model)
    const extras = normalizeString(doc.deviceVersion?.extras)
    const cohortSlug = classifyCohort(device, model, extras)

    vehicles[vid] = {
      vid,
      device,
      model,
      extras,
      cohortSlug,
    }
  }

  for (const vehicle of Object.values(vehicles)) {
    if (!vehicle.cohortSlug) continue
    cohorts[vehicle.cohortSlug].push(vehicle.vid)
  }

  for (const slug of Object.keys(cohorts) as CohortSlug[]) {
    cohorts[slug].sort()
  }

  const counts: Record<CohortSlug, number> = {
    __internal_teltonika: cohorts.__internal_teltonika.length,
    __internal_lynx: cohorts.__internal_lynx.length,
    __internal_antares: cohorts.__internal_antares.length,
    __internal_syrus: cohorts.__internal_syrus.length,
  }

  return {
    generatedAt: new Date().toISOString(),
    stale: false,
    vehicles,
    cohorts,
    counts,
    errors,
  }
}
