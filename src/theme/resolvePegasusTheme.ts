import { getApiBaseUrl } from '../api'
import { isPegasusThemeDebugEnabled } from './pegasusThemeDebugFlag'

export { isPegasusThemeDebugEnabled } from './pegasusThemeDebugFlag'

/**
 * Pegasus iframe theme inheritance (verification notes):
 *
 * 1) Embed + dark metadata → `data-theme="dark"`, `color-scheme: dark` after fetch; React mounts after.
 * 2) Embed + light metadata → `data-theme="light"` after fetch.
 * 3) Standalone → forced light; embed markers cleared.
 * 4) Embed + failed fetch → provisional light until fetch ends, then light (`??` fallback).
 *
 * Flash: before this module runs, the document may briefly use default `:root` (light). During a
 * slow metadata fetch in embeds, we intentionally keep light until the response to avoid guessing.
 * Enable `?pegasusThemeDebug=1` or `localStorage.pegasusThemeDebug=1` for console diagnostics.
 */

export type AppTheme = 'light' | 'dark'

function logPegasusTheme(message: string, detail?: Record<string, unknown>) {
  if (!isPegasusThemeDebugEnabled()) {
    return
  }
  if (detail) {
    console.debug(`[pegasus/theme] ${message}`, detail)
  } else {
    console.debug(`[pegasus/theme] ${message}`)
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

function toThemeToken(value: unknown): AppTheme | null {
  if (typeof value === 'boolean') {
    return value ? 'dark' : 'light'
  }
  if (typeof value !== 'string') {
    return null
  }
  const v = value.trim().toLowerCase()
  if (v.includes('dark')) {
    return 'dark'
  }
  if (v.includes('light')) {
    return 'light'
  }
  return null
}

function pickThemeFromMetadata(meta: unknown): AppTheme | null {
  if (!meta || typeof meta !== 'object') {
    return null
  }

  const root = meta as Record<string, unknown>
  const candidates = [
    root.theme,
    root.colorMode,
    root.mode,
    root.darkMode,
    root.isDark,
    (root.shell as Record<string, unknown> | undefined)?.theme,
    (root.shell as Record<string, unknown> | undefined)?.mode,
    (root.shell as Record<string, unknown> | undefined)?.darkMode,
    (root.context as Record<string, unknown> | undefined)?.theme,
    (root.context as Record<string, unknown> | undefined)?.colorMode,
    (root.context as Record<string, unknown> | undefined)?.darkMode,
    (root.app as Record<string, unknown> | undefined)?.theme,
    (root.settings as Record<string, unknown> | undefined)?.theme,
  ]

  for (const candidate of candidates) {
    const theme = toThemeToken(candidate)
    if (theme) {
      return theme
    }
  }
  return null
}

function applyThemeTokens(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

async function fetchPegasusMetadataTheme(): Promise<AppTheme | null> {
  const apiBase = normalizeBaseUrl(getApiBaseUrl())
  const endpoint = apiBase
    ? `${apiBase}/api/apps/pegasus2.0`
    : `${window.location.origin}/api/apps/pegasus2.0`

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) {
      logPegasusTheme('metadata fetch not ok', {
        endpoint,
        status: res.status,
        statusText: res.statusText,
      })
      return null
    }
    const json = (await res.json()) as unknown
    return pickThemeFromMetadata(json)
  } catch (e) {
    logPegasusTheme('metadata fetch threw', {
      endpoint,
      error: e instanceof Error ? e.message : String(e),
    })
    return null
  }
}

/**
 * Minimal Pegasus shell-theme inheritance for iframe/embed usage.
 * Falls back to the app's default light tokens when context is unavailable.
 */
export async function initPegasusTheme(): Promise<void> {
  if (isPegasusThemeDebugEnabled()) {
    const { runPegasusThemeRuntimeInspection } = await import(
      './pegasusThemeRuntimeInspection'
    )
    await runPegasusThemeRuntimeInspection()
  }

  const embedded = window.self !== window.top
  if (!embedded) {
    document.documentElement.removeAttribute('data-pegasus-embed')
    document.documentElement.removeAttribute('data-pegasus-theme-pending')
    applyThemeTokens('light')
    logPegasusTheme('standalone: forced light theme', {
      dataTheme: document.documentElement.dataset.theme,
      colorScheme: document.documentElement.style.colorScheme,
    })
    return
  }

  document.documentElement.dataset.pegasusEmbed = 'true'
  document.documentElement.dataset.pegasusThemePending = 'true'
  applyThemeTokens('light')
  logPegasusTheme('embedded: provisional light while metadata loads', {
    dataTheme: document.documentElement.dataset.theme,
    colorScheme: document.documentElement.style.colorScheme,
  })

  const picked = await fetchPegasusMetadataTheme()
  const theme = picked ?? 'light'
  applyThemeTokens(theme)
  document.documentElement.removeAttribute('data-pegasus-theme-pending')
  logPegasusTheme('embedded: theme resolved', {
    pickedFromMetadata: picked,
    applied: theme,
    dataTheme: document.documentElement.dataset.theme,
    colorScheme: document.documentElement.style.colorScheme,
  })
}
