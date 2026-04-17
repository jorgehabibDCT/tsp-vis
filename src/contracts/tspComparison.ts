import type { DashboardModel } from '../types/dashboard'

/**
 * Application-facing contract for the TSP comparison dashboard payload.
 * Intended to match the JSON body returned by the future Render API
 * for the dashboard endpoint (see `src/api/endpoints.ts`).
 *
 * The wire shape matches the in-memory `DashboardModel` used by the UI.
 */
export type TspComparisonResponse = DashboardModel
