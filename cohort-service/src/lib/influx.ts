import { InfluxDB } from '@influxdata/influxdb-client'

export type InfluxConfig = {
  url: string
  token: string
  org: string
  timeoutMs?: number
}

export function getQueryApi(config: InfluxConfig) {
  return new InfluxDB({
    url: config.url,
    token: config.token,
    transportOptions:
      typeof config.timeoutMs === 'number' && config.timeoutMs > 0
        ? { timeout: config.timeoutMs }
        : undefined,
  }).getQueryApi(
    config.org,
  )
}

export function escapeFluxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function fluxVidArray(vids: string[]): string {
  return `[${vids.map((v) => `"${escapeFluxString(v)}"`).join(', ')}]`
}
