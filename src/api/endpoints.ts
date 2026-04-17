/**
 * Render-style backend: path segment relative to `VITE_API_URL`.
 *
 * Implemented by the Express app in `server/` (mock data until Influx is wired):
 * `GET /api/dashboard/tsp-comparison`
 *
 * Full URL: `${VITE_API_URL}/api/dashboard/tsp-comparison`
 */
export const TSP_COMPARISON_DASHBOARD_PATH = '/api/dashboard/tsp-comparison' as const
