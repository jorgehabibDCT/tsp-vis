/**
 * Same extraction order as proto BFF `pegasusThemePreferencesFromUserBody.ts`
 * for client-side fallback when calling same-origin `/api/apps/pegasus2.0`.
 */
export interface PegasusThemePreferenceNames {
  primary?: string
  accent?: string
  warn?: string
  background?: string
  dark?: boolean
}

export type PegasusThemesSourceLabel =
  | 'data.themes'
  | 'data.user.themes'
  | 'user.themes'
  | 'root.themes'
  | 'none'

function trimLower(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined
  const t = s.trim().toLowerCase()
  return t.length > 0 ? t : undefined
}

function parseDark(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (t === 'true') return true
    if (t === 'false') return false
  }
  return undefined
}

function mapThemesRecord(themes: Record<string, unknown>): PegasusThemePreferenceNames {
  return {
    primary: trimLower(themes.primary),
    accent: trimLower(themes.accent),
    warn: trimLower(themes.warn),
    background: trimLower(themes.background),
    dark: parseDark(themes.dark),
  }
}

export function extractPegasusThemePreferencesWithSource(body: unknown): {
  preferences: PegasusThemePreferenceNames
  themesSource: PegasusThemesSourceLabel
  dataThemesFound: boolean
} {
  if (!body || typeof body !== 'object') {
    return { preferences: {}, themesSource: 'none', dataThemesFound: false }
  }
  const root = body as Record<string, unknown>
  const data =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : undefined
  const user =
    root.user && typeof root.user === 'object' && !Array.isArray(root.user)
      ? (root.user as Record<string, unknown>)
      : undefined
  const dataUser =
    data?.user && typeof data.user === 'object' && !Array.isArray(data.user)
      ? (data.user as Record<string, unknown>)
      : undefined

  const candidates: [PegasusThemesSourceLabel, unknown][] = [
    ['data.themes', data?.themes],
    ['data.user.themes', dataUser?.themes],
    ['user.themes', user?.themes],
    ['root.themes', root.themes],
  ]

  for (const [label, raw] of candidates) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const themes = raw as Record<string, unknown>
      return {
        preferences: mapThemesRecord(themes),
        themesSource: label,
        dataThemesFound: label === 'data.themes',
      }
    }
  }
  return { preferences: {}, themesSource: 'none', dataThemesFound: false }
}

/** `dark === true` → dark; otherwise light (matches proto `resolvePegasusThemeMode`). */
export function resolvePegasusThemeModeFromPrefs(
  prefs: PegasusThemePreferenceNames | null,
): 'light' | 'dark' {
  if (prefs?.dark === true) return 'dark'
  return 'light'
}
