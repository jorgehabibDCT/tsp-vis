import { captureTokenFromUrlOnce, getBearerToken } from '../auth/memoryToken'
import { fetchPegasusThemePreferencesFromApi } from '../api/fetchPegasusThemePreferences'
import { getApiBaseUrl } from '../api'
import { isPegasusThemeDebugEnabled } from './pegasusThemeDebugFlag'
import {
  extractPegasusThemePreferencesWithSource,
  resolvePegasusThemeModeFromPrefs,
  type PegasusThemePreferenceNames,
} from './pegasusAppsThemeExtract'

export { isPegasusThemeDebugEnabled } from './pegasusThemeDebugFlag'

export type AppTheme = 'light' | 'dark'

function logPegasusTheme(message: string, detail?: Record<string, unknown>) {
  if (!isPegasusThemeDebugEnabled()) return
  if (detail) {
    console.debug(`[pegasus/theme] ${message}`, detail)
  } else {
    console.debug(`[pegasus/theme] ${message}`)
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

function applyThemeTokens(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

function prefsMeaningful(p: PegasusThemePreferenceNames): boolean {
  return (
    p.primary != null ||
    p.accent != null ||
    p.warn != null ||
    p.background != null ||
    p.dark !== undefined
  )
}

/**
 * Same-origin `GET /api/apps/pegasus2.0` with Pegasus **`Authenticate`** header (proto upstream style).
 * Used when the iframe is served from the Pegasus origin or when the API proxy is unavailable.
 */
async function fetchThemeModeViaDirectPegasusApps(token: string): Promise<AppTheme | null> {
  const endpoint = `${window.location.origin}/api/apps/pegasus2.0`
  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        Authenticate: token,
      },
      credentials: 'include',
    })
    if (!res.ok) {
      logPegasusTheme('direct pegasus2.0 not ok', { endpoint, status: res.status })
      return null
    }
    const json = (await res.json()) as unknown
    const { preferences } = extractPegasusThemePreferencesWithSource(json)
    if (!prefsMeaningful(preferences)) {
      logPegasusTheme('direct pegasus2.0: no themes bag', { endpoint })
      return null
    }
    return resolvePegasusThemeModeFromPrefs(preferences)
  } catch (e) {
    logPegasusTheme('direct pegasus2.0 threw', {
      endpoint,
      error: e instanceof Error ? e.message : String(e),
    })
    return null
  }
}

/**
 * Pegasus shell theme for iframe embeds — ported from proto Bitácora:
 * - Theme **mode** comes from `data.themes` / `data.user.themes` / … → **`themes.dark === true`**
 * - Preferred path: **`GET /api/v1/pegasus/theme-preferences`** on `VITE_API_URL` with **`Authorization: Bearer`**
 *   (Render proxies to Pegasus with **`Authenticate`**).
 * - Fallback: same-origin **`/api/apps/pegasus2.0`** with **`Authenticate`** when a URL token exists.
 */
export async function initPegasusTheme(): Promise<void> {
  if (isPegasusThemeDebugEnabled()) {
    const { runPegasusThemeRuntimeInspection } = await import('./pegasusThemeRuntimeInspection')
    await runPegasusThemeRuntimeInspection()
  }

  const embedded = window.self !== window.top
  if (!embedded) {
    document.documentElement.removeAttribute('data-pegasus-embed')
    document.documentElement.removeAttribute('data-pegasus-theme-pending')
    applyThemeTokens('light')
    logPegasusTheme('standalone: forced light theme')
    return
  }

  document.documentElement.dataset.pegasusEmbed = 'true'
  document.documentElement.dataset.pegasusThemePending = 'true'
  applyThemeTokens('light')
  logPegasusTheme('embedded: provisional light while theme resolves')

  const token = getBearerToken() ?? captureTokenFromUrlOnce()

  let mode: AppTheme | null = null

  const apiBase = normalizeBaseUrl(getApiBaseUrl())
  if (apiBase && token) {
    try {
      const r = await fetchPegasusThemePreferencesFromApi()
      logPegasusTheme('theme-preferences API result', { source: r.source, hasPrefs: Boolean(r.preferences) })
      if (r.preferences && prefsMeaningful(r.preferences)) {
        mode = resolvePegasusThemeModeFromPrefs(r.preferences)
      } else {
        mode = await fetchThemeModeViaDirectPegasusApps(token)
      }
    } catch (e) {
      logPegasusTheme('theme-preferences API threw', {
        error: e instanceof Error ? e.message : String(e),
      })
      mode = await fetchThemeModeViaDirectPegasusApps(token)
    }
  } else if (token) {
    mode = await fetchThemeModeViaDirectPegasusApps(token)
  }

  const theme = mode ?? 'light'
  applyThemeTokens(theme)
  document.documentElement.removeAttribute('data-pegasus-theme-pending')
  logPegasusTheme('embedded: theme resolved', {
    applied: theme,
    via: mode == null ? 'default' : 'pegasus',
  })
}
