import { describe, expect, it } from 'vitest'
import {
  extractPegasusThemePreferencesWithSource,
  resolvePegasusThemeModeFromPrefs,
} from './pegasusAppsThemeExtract'

describe('extractPegasusThemePreferencesWithSource', () => {
  it('reads data.themes first (Pegasus apps2.0 shape)', () => {
    const body = {
      data: {
        themes: { dark: true, primary: 'violet' },
      },
      user: { themes: { dark: false } },
    }
    const r = extractPegasusThemePreferencesWithSource(body)
    expect(r.themesSource).toBe('data.themes')
    expect(r.dataThemesFound).toBe(true)
    expect(r.preferences.dark).toBe(true)
    expect(r.preferences.primary).toBe('violet')
  })

  it('falls back to data.user.themes when data.themes missing', () => {
    const body = {
      data: {
        user: { themes: { dark: false, accent: ' Teal ' } },
      },
    }
    const r = extractPegasusThemePreferencesWithSource(body)
    expect(r.themesSource).toBe('data.user.themes')
    expect(r.preferences.dark).toBe(false)
    expect(r.preferences.accent).toBe('teal')
  })

  it('uses user.themes when data paths absent', () => {
    const body = { user: { themes: { dark: true } } }
    const r = extractPegasusThemePreferencesWithSource(body)
    expect(r.themesSource).toBe('user.themes')
    expect(r.preferences.dark).toBe(true)
  })

  it('uses root.themes as last resort', () => {
    const body = { themes: { dark: 'false' } }
    const r = extractPegasusThemePreferencesWithSource(body)
    expect(r.themesSource).toBe('root.themes')
    expect(r.preferences.dark).toBe(false)
  })

  it('returns none for non-object body', () => {
    expect(extractPegasusThemePreferencesWithSource(null).themesSource).toBe('none')
    expect(extractPegasusThemePreferencesWithSource('x').themesSource).toBe('none')
  })

  it('parses dark string true/false', () => {
    const body = { data: { themes: { dark: 'TRUE' } } }
    expect(extractPegasusThemePreferencesWithSource(body).preferences.dark).toBe(true)
    const body2 = { data: { themes: { dark: 'False' } } }
    expect(extractPegasusThemePreferencesWithSource(body2).preferences.dark).toBe(false)
  })
})

describe('resolvePegasusThemeModeFromPrefs', () => {
  it('is dark only when dark === true', () => {
    expect(resolvePegasusThemeModeFromPrefs({ dark: true })).toBe('dark')
    expect(resolvePegasusThemeModeFromPrefs({ dark: false })).toBe('light')
    expect(resolvePegasusThemeModeFromPrefs({})).toBe('light')
    expect(resolvePegasusThemeModeFromPrefs(null)).toBe('light')
  })
})
