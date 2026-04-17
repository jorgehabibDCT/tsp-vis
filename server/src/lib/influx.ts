import { InfluxDB } from '@influxdata/influxdb-client'
import {
  getInfluxOrg,
  getInfluxToken,
  getInfluxUrl,
} from './influxEnv.js'

let client: InfluxDB | undefined

export function getInfluxClient(): InfluxDB {
  if (!client) {
    client = new InfluxDB({
      url: getInfluxUrl(),
      token: getInfluxToken(),
    })
  }
  return client
}

export function getQueryApi() {
  return getInfluxClient().getQueryApi(getInfluxOrg())
}
