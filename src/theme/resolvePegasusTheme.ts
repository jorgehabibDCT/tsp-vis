import { getApiBaseUrl } from '../api'

export type AppTheme = 'light' | 'dark'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

function toThemeToken(value: unknown): AppTheme | null {
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
    (root.shell as Record<string, unknown> | undefined)?.theme,
    (root.shell as Record<string, unknown> | undefined)?.mode,
    (root.context as Record<string, unknown> | undefined)?.theme,
    (root.context as Record<string, unknown> | undefined)?.colorMode,
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

function applyTheme(theme: AppTheme): void {
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
      return null
    }
    const json = (await res.json()) as unknown
    return pickThemeFromMetadata(json)
  } catch {
    return null
  }
}

/**
 * Minimal Pegasus shell-theme inheritance for iframe/embed usage.
 * Falls back to the app's default light tokens when context is unavailable.
 */
export async function initPegasusTheme(): Promise<void> {
  const embedded = window.self !== window.top
  if (!embedded) {
    applyTheme('light')
    return
  }
  const theme = (await fetchPegasusMetadataTheme()) ?? 'light'
  applyTheme(theme)
}
