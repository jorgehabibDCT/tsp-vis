import { mockTspComparisonResponse } from '../data/mockTspComparison.js'

/**
 * Returns the TSP comparison dashboard payload.
 * Today: static mock. Later: swap for Influx aggregation + mapping to the same JSON shape.
 */
export function getTspComparisonDashboard() {
  return mockTspComparisonResponse
}
