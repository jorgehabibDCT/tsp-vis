function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return fallback
  }
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

export function getEnv() {
  return {
    port: parseIntEnv('COHORT_HTTP_PORT', 8081),
    refreshIntervalMs: parseIntEnv('COHORT_REFRESH_INTERVAL_MS', 300_000),
    snapshotMaxStaleMs: parseIntEnv('COHORT_SNAPSHOT_MAX_STALE_MS', 1_800_000),
    mongoUri: process.env.MONGO_URI?.trim() ?? '',
    mongoDbName: process.env.MONGO_DB_NAME?.trim() || 'data_org',
    mongoVehiclesCollection:
      process.env.MONGO_VEHICLES_COLLECTION?.trim() || 'pegasus256_vehicles',
    influxUrl: process.env.INFLUX_URL?.trim() ?? '',
    influxToken: process.env.INFLUX_TOKEN?.trim() ?? '',
    influxOrg: process.env.INFLUX_ORG?.trim() ?? '',
    influxBucket: process.env.INFLUX_BUCKET?.trim() ?? '',
    influxMeasurement:
      process.env.INFLUX_PROVIDERS_MEASUREMENT?.trim() || 'providers',
    influxRange: process.env.INFLUX_ENTITY_RANGE?.trim() || '-3d',
    influxEventLabelFields:
      process.env.INFLUX_EVENT_LABEL_FIELDS?.trim() || 'label_type',
    influxVidChunkSize: parseIntEnv('INFLUX_VID_CHUNK_SIZE', 200),
    influxEntitiesVidChunkSize: parseIntEnv('INFLUX_ENTITIES_VID_CHUNK_SIZE', 50),
    influxQueryTimeoutMs: parseIntEnv('INFLUX_QUERY_TIMEOUT_MS', 120_000),
  }
}

export function validateEnv(env: ReturnType<typeof getEnv>): void {
  const required = [
    ['MONGO_URI', env.mongoUri],
    ['INFLUX_URL', env.influxUrl],
    ['INFLUX_TOKEN', env.influxToken],
    ['INFLUX_ORG', env.influxOrg],
    ['INFLUX_BUCKET', env.influxBucket],
  ]
  const missing = required.filter(([, v]) => !v).map(([k]) => k)
  if (missing.length > 0) {
    throw new Error(
      `[cohort-service] Missing required env vars: ${missing.join(', ')}`,
    )
  }
}
