/**
 * Extract Pegasus UI theme preference **names** (not resolved colors) from app/user JSON
 * (e.g. `GET /api/apps/pegasus2.0`).
 * Tries, in order: `data.themes`, `data.user.themes`, `user.themes`, `root.themes`.
 * Ported from proto `apps/bff/src/pegasus/pegasusThemePreferencesFromUserBody.ts`.
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

export function resolveThemesRecordFromUserBody(body: unknown): {
  themes: Record<string, unknown> | null
  themesSource: PegasusThemesSourceLabel
} {
  if (!body || typeof body !== 'object') return { themes: null, themesSource: 'none' }
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
      return { themes: raw as Record<string, unknown>, themesSource: label }
    }
  }
  return { themes: null, themesSource: 'none' }
}

export function extractPegasusThemePreferencesWithSource(body: unknown): {
  preferences: PegasusThemePreferenceNames
  themesSource: PegasusThemesSourceLabel
  dataThemesFound: boolean
} {
  const { themes, themesSource } = resolveThemesRecordFromUserBody(body)
  if (!themes) {
    return { preferences: {}, themesSource: 'none', dataThemesFound: false }
  }
  return {
    preferences: mapThemesRecord(themes),
    themesSource,
    dataThemesFound: themesSource === 'data.themes',
  }
}
