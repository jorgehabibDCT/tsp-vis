/**
 * Future home for Render-backed API clients.
 * Set `VITE_API_URL` in the Vercel project to point at the deployed API.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? ''
}
