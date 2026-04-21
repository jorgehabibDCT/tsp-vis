import { pegasusAuthenticateRequestHeaders } from './pegasusSessionHeaders.js'
import {
  extractPegasusThemePreferencesWithSource,
  type PegasusThemePreferenceNames,
  type PegasusThemesSourceLabel,
} from './pegasusThemePreferencesFromUserBody.js'

/**
 * Pegasus app settings endpoint for embedded app theme (override via `PEGASUS_THEME_APPS_PATH`).
 * Default: `/api/apps/pegasus2.0`
 */
function pegasusAppsThemeApiPath(): string {
  const raw = process.env.PEGASUS_THEME_APPS_PATH?.trim()
  const t = raw && raw.length > 0 ? raw : '/api/apps/pegasus2.0'
  return t.startsWith('/') ? t : `/${t}`
}

function fetchTimeoutMs(): number {
  const n = Number(process.env.PEGASUS_FETCH_TIMEOUT_MS ?? '10000')
  return Number.isFinite(n) && n > 0 ? n : 10_000
}

export interface PegasusThemeUpstreamResult {
  preferences: PegasusThemePreferenceNames | null
  upstreamHttpStatus: number
  upstreamOk: boolean
  path: string
  themesSource: PegasusThemesSourceLabel
  jsonWasObject: boolean
  dataThemesFound: boolean
}

function isPrefsEmpty(p: PegasusThemePreferenceNames): boolean {
  return (
    p.primary == null &&
    p.accent == null &&
    p.warn == null &&
    p.background == null &&
    p.dark === undefined
  )
}

/**
 * `GET ${PEGASUS_SITE}${/api/apps/pegasus2.0}` — app theme/settings.
 */
export async function fetchPegasusThemePreferencesFromUpstream(
  token: string,
): Promise<PegasusThemeUpstreamResult> {
  const path = pegasusAppsThemeApiPath()
  const site = process.env.PEGASUS_SITE?.trim()
  if (!site) {
    return {
      preferences: null,
      upstreamHttpStatus: 0,
      upstreamOk: false,
      path,
      themesSource: 'none',
      jsonWasObject: false,
      dataThemesFound: false,
    }
  }

  const base = site.replace(/\/$/, '')
  const url = `${base}${path}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs())
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: pegasusAuthenticateRequestHeaders(token),
    })
    const status = res.status
    if (!res.ok || status < 200 || status >= 300) {
      return {
        preferences: null,
        upstreamHttpStatus: status,
        upstreamOk: false,
        path,
        themesSource: 'none',
        jsonWasObject: false,
        dataThemesFound: false,
      }
    }
    let body: unknown
    try {
      body = await res.json()
    } catch {
      return {
        preferences: null,
        upstreamHttpStatus: status,
        upstreamOk: true,
        path,
        themesSource: 'none',
        jsonWasObject: false,
        dataThemesFound: false,
      }
    }
    const jsonWasObject = body != null && typeof body === 'object'
    const { preferences: rawPrefs, themesSource, dataThemesFound } =
      extractPegasusThemePreferencesWithSource(body)
    const prefs = isPrefsEmpty(rawPrefs) ? null : rawPrefs
    return {
      preferences: prefs,
      upstreamHttpStatus: status,
      upstreamOk: true,
      path,
      themesSource,
      jsonWasObject,
      dataThemesFound,
    }
  } catch {
    return {
      preferences: null,
      upstreamHttpStatus: 0,
      upstreamOk: false,
      path,
      themesSource: 'none',
      jsonWasObject: false,
      dataThemesFound: false,
    }
  } finally {
    clearTimeout(timer)
  }
}
