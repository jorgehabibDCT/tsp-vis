import { fetchDistinctEntityCountsByProvider } from './influxTspMetrics.js'
import { fetchDistinctVehicleCountByProviderAndLabel } from './influxEventLabels.js'

/**
 * Minimal seam for Influx-backed dashboard merges. Default implementation delegates to
 * existing modules; tests inject a fake port to avoid live queries.
 */
export type InfluxDashboardQueryPort = {
  fetchDistinctEntityCountsByProvider(): Promise<Record<string, number>>
  fetchDistinctVehicleCountByProviderAndLabel(): Promise<
    Record<string, Record<string, number>>
  >
}

export const defaultInfluxDashboardQueryPort: InfluxDashboardQueryPort = {
  fetchDistinctEntityCountsByProvider,
  fetchDistinctVehicleCountByProviderAndLabel,
}
