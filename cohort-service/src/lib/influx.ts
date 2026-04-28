import { InfluxDB } from '@influxdata/influxdb-client'

export type InfluxConfig = {
  url: string
  token: string
  org: string
}

export function getQueryApi(config: InfluxConfig) {
  return new InfluxDB({ url: config.url, token: config.token }).getQueryApi(
    config.org,
  )
}

export function escapeFluxString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function fluxVidArray(vids: string[]): string {
  return `[${vids.map((v) => `"${escapeFluxString(v)}"`).join(', ')}]`
}
