/**
 * Browser CORS allowlist for this API (Render) + local Vite.
 * Extend via `CORS_ORIGINS` (comma-separated) on Render without code edits.
 */

/** Fixed defaults: local dev + known production frontend. */
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://tsp-vis.vercel.app',
] as const

function parseEnvOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim()
  if (!raw) {
    return []
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function getAllowedOriginSet(): Set<string> {
  return new Set<string>([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseEnvOrigins(),
  ])
}
