import { captureTokenFromUrlOnce, getBearerToken } from '../auth/memoryToken'
import { getApiBaseUrl } from './index'
import type { PegasusThemePreferenceNames } from '../theme/pegasusAppsThemeExtract'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

export interface PegasusThemePreferencesApiResponse {
  ok: boolean
  preferences: PegasusThemePreferenceNames | null
  source?: string
}

export interface PegasusThemeFetchResult {
  preferences: PegasusThemePreferenceNames | null
  source: string
}

/**
 * `GET ${VITE_API_URL}/api/v1/pegasus/theme-preferences` — theme **names** from Pegasus apps API
 * (proxied by Render API with `PEGASUS_SITE`). Same Bearer token pattern as proto Bitácora web app.
 */
export async function fetchPegasusThemePreferencesFromApi(): Promise<PegasusThemeFetchResult> {
  const apiRoot = normalizeBaseUrl(getApiBaseUrl())
  if (!apiRoot) {
    return { preferences: null, source: 'no_api_base' }
  }

  const token = getBearerToken() ?? captureTokenFromUrlOnce()
  if (!token) {
    return { preferences: null, source: 'no_token' }
  }

  const res = await fetch(`${apiRoot}/api/v1/pegasus/theme-preferences`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    return { preferences: null, source: `http_${res.status}` }
  }

  const body = (await res.json()) as PegasusThemePreferencesApiResponse
  return {
    preferences: body.preferences ?? null,
    source: body.source ?? 'unknown',
  }
}
