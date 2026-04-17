/**
 * InfluxDB 2.x connection settings (Render / local).
 * All values come from env — never hardcoded secrets.
 */

export function isInfluxConfigured(): boolean {
  return Boolean(
    process.env.INFLUX_HOST?.trim() &&
      process.env.INFLUX_TOKEN?.trim() &&
      process.env.INFLUX_ORG?.trim() &&
      process.env.INFLUX_BUCKET?.trim(),
  )
}

/** Base URL for the InfluxDB HTTP API (with or without scheme). */
export function getInfluxUrl(): string {
  const h = process.env.INFLUX_HOST?.trim()
  if (!h) {
    throw new Error('INFLUX_HOST is not set')
  }
  if (h.startsWith('http://') || h.startsWith('https://')) {
    return h.replace(/\/$/, '')
  }
  return `https://${h.replace(/\/$/, '')}`
}

export function getInfluxToken(): string {
  const t = process.env.INFLUX_TOKEN?.trim()
  if (!t) {
    throw new Error('INFLUX_TOKEN is not set')
  }
  return t
}

export function getInfluxOrg(): string {
  const o = process.env.INFLUX_ORG?.trim()
  if (!o) {
    throw new Error('INFLUX_ORG is not set')
  }
  return o
}

export function getInfluxBucket(): string {
  const b = process.env.INFLUX_BUCKET?.trim()
  if (!b) {
    throw new Error('INFLUX_BUCKET is not set')
  }
  return b
}

/** Flux duration for entity query, e.g. `-90d`. */
export function getInfluxEntityRange(): string {
  return process.env.INFLUX_ENTITY_RANGE?.trim() || '-90d'
}

/** Measurement name containing `provider` and `vid` tags (see 2285.csv exploration). */
export function getProvidersMeasurement(): string {
  return process.env.INFLUX_PROVIDERS_MEASUREMENT?.trim() || 'providers'
}
