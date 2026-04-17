/**
 * Base URL for the Render API (scheme + host, no trailing slash).
 * Set **`VITE_API_URL`** on Vercel (Production) to enable remote dashboard data.
 * If unset, the app uses the client-side mock in `loadDashboardData()`.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? ''
}
