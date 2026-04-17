import { InfluxDB } from '@influxdata/influxdb-client'
import {
  getInfluxOrg,
  getInfluxQueryTimeoutMs,
  getInfluxToken,
  getInfluxUrl,
} from './influxEnv.js'

let client: InfluxDB | undefined

/** Node transport stores merged options here; used to verify effective socket timeout. */
type NodeTransportLike = { defaultOptions?: { timeout?: number } }

/**
 * Creates the shared Influx client.
 *
 * The SDK default is `timeout: 10000` (10s). We set both top-level `timeout` and
 * `transportOptions.timeout` so the Node `http(s).request` options merge includes an explicit
 * duration (see `NodeHttpTransport`: `...DEFAULT_ConnectionOptions`, then user options, then
 * `transportOptions`). Logging reads `transport.defaultOptions.timeout` to prove what `req.setTimeout` uses.
 */
export function getInfluxClient(): InfluxDB {
  if (!client) {
    const timeoutMs = getInfluxQueryTimeoutMs()
    client = new InfluxDB({
      url: getInfluxUrl(),
      token: getInfluxToken(),
      timeout: timeoutMs,
      transportOptions: {
        timeout: timeoutMs,
      },
    })
    const transport = client.transport as NodeTransportLike
    const effective = transport.defaultOptions?.timeout
    console.log(
      `[influx] client init envTimeoutMs=${timeoutMs} transport.defaultOptions.timeout=${String(effective)} (INFLUX_QUERY_TIMEOUT_MS=${process.env.INFLUX_QUERY_TIMEOUT_MS ?? 'unset'})`,
    )
  }
  return client
}

export function getQueryApi() {
  return getInfluxClient().getQueryApi(getInfluxOrg())
}
