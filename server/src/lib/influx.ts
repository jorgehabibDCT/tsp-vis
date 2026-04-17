import { InfluxDB } from '@influxdata/influxdb-client'
import {
  getInfluxOrg,
  getInfluxQueryTimeoutMs,
  getInfluxToken,
  getInfluxUrl,
} from './influxEnv.js'

let client: InfluxDB | undefined

export function getInfluxClient(): InfluxDB {
  if (!client) {
    client = new InfluxDB({
      url: getInfluxUrl(),
      token: getInfluxToken(),
      timeout: getInfluxQueryTimeoutMs(),
    })
  }
  return client
}

export function getQueryApi() {
  return getInfluxClient().getQueryApi(getInfluxOrg())
}
