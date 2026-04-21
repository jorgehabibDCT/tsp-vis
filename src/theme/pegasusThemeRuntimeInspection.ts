/**
 * Opt-in runtime diagnostics for Pegasus embed theme signals.
 * Enable with `?pegasusThemeDebug=1` or `localStorage.pegasusThemeDebug = '1'`.
 * Does not change theme application — evidence gathering only.
 */

import { getApiBaseUrl } from '../api'
import { captureTokenFromUrlOnce, getBearerToken } from '../auth/memoryToken'
import { isPegasusThemeDebugEnabled } from './pegasusThemeDebugFlag'
import {
  extractPegasusThemePreferencesWithSource,
  resolvePegasusThemeModeFromPrefs,
} from './pegasusAppsThemeExtract'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

const PEGASUS_QUERY_HINTS = [
  'theme',
  'mode',
  'color',
  'dark',
  'pid',
  'auth',
  'domain',
  'tenant',
  'shell',
  'pegasus',
]

function collectQueryHighlights(
  params: URLSearchParams,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of params.entries()) {
    const lower = k.toLowerCase()
    if (PEGASUS_QUERY_HINTS.some((h) => lower.includes(h))) {
      out[k] = v
    }
  }
  return out
}

function scanStorage(kind: 'local' | 'session'): Record<string, string> {
  const store = kind === 'local' ? localStorage : sessionStorage
  const out: Record<string, string> = {}
  const re = /pegasus|shell|theme|mode|tenant|domain|color|dark/i
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key && re.test(key)) {
        out[key] = store.getItem(key) ?? ''
      }
    }
  } catch {
    return { _error: 'storage access blocked' }
  }
  return out
}

function domSnapshot(el: Element, label: string): Record<string, unknown> {
  const ds: Record<string, string> = {}
  if (el instanceof HTMLElement && el.dataset) {
    for (const k of Object.keys(el.dataset)) {
      ds[k] = el.dataset[k] ?? ''
    }
  }
  return {
    label,
    tag: el.tagName,
    id: el.id || null,
    className: el.className || null,
    dataset: ds,
  }
}

function headerSnapshot(res: Response): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    res.headers.forEach((v, k) => {
      out[k] = v
    })
  } catch (e) {
    out._headers_error = e instanceof Error ? e.message : String(e)
  }
  return out
}

function topLevelKeys(value: unknown): string[] {
  if (value === null || value === undefined) {
    return []
  }
  if (typeof value !== 'object') {
    return [`<${typeof value}>`]
  }
  if (Array.isArray(value)) {
    return [`<array length=${value.length}>`]
  }
  return Object.keys(value as object)
}

function nestedKeySample(value: unknown, depth = 0): Record<string, unknown> {
  if (depth > 2 || value === null || typeof value !== 'object') {
    return { value }
  }
  if (Array.isArray(value)) {
    return { type: 'array', length: value.length }
  }
  const o = value as Record<string, unknown>
  const sample: Record<string, unknown> = {}
  for (const k of Object.keys(o).slice(0, 30)) {
    const v = o[k]
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      sample[k] = {
        _keys: Object.keys(v as object).slice(0, 20),
      }
    } else {
      sample[k] = v
    }
  }
  return sample
}

/** Legacy speculative paths (not used by production theme — kept for payload comparison). */
function candidateThemeValues(meta: unknown): {
  path: string
  value: unknown
  tokenGuess: string | null
}[] {
  if (!meta || typeof meta !== 'object') {
    return []
  }
  const root = meta as Record<string, unknown>
  const entries: { path: string; value: unknown }[] = [
    { path: 'theme', value: root.theme },
    { path: 'colorMode', value: root.colorMode },
    { path: 'mode', value: root.mode },
    { path: 'darkMode', value: root.darkMode },
    { path: 'isDark', value: root.isDark },
    {
      path: 'shell.theme',
      value: (root.shell as Record<string, unknown> | undefined)?.theme,
    },
    {
      path: 'shell.mode',
      value: (root.shell as Record<string, unknown> | undefined)?.mode,
    },
    {
      path: 'shell.darkMode',
      value: (root.shell as Record<string, unknown> | undefined)?.darkMode,
    },
    {
      path: 'context.theme',
      value: (root.context as Record<string, unknown> | undefined)?.theme,
    },
    {
      path: 'context.colorMode',
      value: (root.context as Record<string, unknown> | undefined)
        ?.colorMode,
    },
    {
      path: 'context.darkMode',
      value: (root.context as Record<string, unknown> | undefined)?.darkMode,
    },
    {
      path: 'app.theme',
      value: (root.app as Record<string, unknown> | undefined)?.theme,
    },
    {
      path: 'settings.theme',
      value: (root.settings as Record<string, unknown> | undefined)?.theme,
    },
  ]
  return entries.map(({ path, value }) => {
    let tokenGuess: string | null = null
    if (typeof value === 'boolean') {
      tokenGuess = value ? 'dark (bool true)' : 'light (bool false)'
    } else if (typeof value === 'string') {
      const v = value.trim().toLowerCase()
      if (v.includes('dark')) {
        tokenGuess = 'dark (substring)'
      } else if (v.includes('light')) {
        tokenGuess = 'light (substring)'
      }
    }
    return { path, value, tokenGuess }
  })
}

let postMessageListenerAttached = false

function attachPostMessageLogger(): void {
  if (postMessageListenerAttached) {
    return
  }
  postMessageListenerAttached = true
  window.addEventListener('message', (ev: MessageEvent) => {
    let dataPreview: unknown = ev.data
    try {
      if (typeof ev.data === 'object' && ev.data !== null) {
        dataPreview = JSON.parse(JSON.stringify(ev.data))
      }
    } catch {
      /* keep raw */
    }
    console.debug('[pegasus/theme-debug] postMessage', {
      origin: ev.origin,
      sourceFrame: ev.source === window.parent ? 'parent' : 'other',
      data: dataPreview,
    })
  })
}

/**
 * Runs full runtime inspection (console). No theme side effects.
 */
export async function runPegasusThemeRuntimeInspection(): Promise<void> {
  if (!isPegasusThemeDebugEnabled()) {
    return
  }

  const section = (title: string) =>
    console.debug(`[pegasus/theme-debug] —— ${title} ——`)

  section('1) Page URL & query')
  const href = window.location.href
  const params = new URLSearchParams(window.location.search)
  console.debug('[pegasus/theme-debug] href', href)
  console.debug('[pegasus/theme-debug] searchParams (all)', {
    ...Object.fromEntries(params.entries()),
  })
  console.debug('[pegasus/theme-debug] query highlights (theme/mode/pid/…)', {
    ...collectQueryHighlights(params),
  })

  section('2) Origin')
  console.debug('[pegasus/theme-debug] location.origin', window.location.origin)

  section('3) Iframe / embed')
  const embedded = window.self !== window.top
  console.debug('[pegasus/theme-debug] embedded (self !== top)', embedded)

  section('4) Vite / API base')
  console.debug('[pegasus/theme-debug] import.meta.env.VITE_API_URL', {
    raw: import.meta.env.VITE_API_URL,
    trimmed: normalizeBaseUrl(String(import.meta.env.VITE_API_URL ?? '')),
  })

  section('5) DOM markers (before React)')
  console.debug('[pegasus/theme-debug] documentElement', {
    ...domSnapshot(document.documentElement, 'html'),
  })
  console.debug('[pegasus/theme-debug] body', {
    ...domSnapshot(document.body, 'body'),
  })

  section('6) Storage keys (heuristic match)')
  console.debug('[pegasus/theme-debug] localStorage', scanStorage('local'))
  console.debug('[pegasus/theme-debug] sessionStorage', scanStorage('session'))

  section('7) postMessage (listener attached for this session)')
  attachPostMessageLogger()

  section('8) GET /api/apps/pegasus2.0')
  const apiBase = normalizeBaseUrl(getApiBaseUrl())
  const endpoint = apiBase
    ? `${apiBase}/api/apps/pegasus2.0`
    : `${window.location.origin}/api/apps/pegasus2.0`
  console.debug('[pegasus/theme-debug] exact fetch URL', endpoint)

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
    console.debug('[pegasus/theme-debug] response', {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      type: res.type,
      redirected: res.redirected,
      url: res.url,
    })
    console.debug('[pegasus/theme-debug] response headers', headerSnapshot(res))

    const text = await res.text()
    console.debug('[pegasus/theme-debug] body length (chars)', text.length)

    let parsed: unknown = null
    let parseError: string | null = null
    try {
      parsed = text.length ? JSON.parse(text) : null
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e)
    }

    console.debug('[pegasus/theme-debug] JSON parsed', {
      parsed: parseError === null,
      parseError,
    })
    if (parsed !== null && parseError === null) {
      console.debug('[pegasus/theme-debug] top-level keys', topLevelKeys(parsed))
      console.debug(
        '[pegasus/theme-debug] nested sample (shallow)',
        nestedKeySample(parsed),
      )
      console.debug('[pegasus/theme-debug] legacy candidate paths', candidateThemeValues(parsed))
      const ext = extractPegasusThemePreferencesWithSource(parsed)
      console.debug('[pegasus/theme-debug] proto themes-bag extraction', {
        themesSource: ext.themesSource,
        preferences: ext.preferences,
        resolvedMode: resolvePegasusThemeModeFromPrefs(ext.preferences),
      })
    } else {
      console.debug('[pegasus/theme-debug] body preview', text.slice(0, 500))
    }
  } catch (e) {
    console.debug('[pegasus/theme-debug] fetch threw', {
      error: e instanceof Error ? e.message : String(e),
    })
  }

  section('9) GET /api/v1/pegasus/theme-preferences (when VITE_API_URL + token)')
  const tok = getBearerToken() ?? captureTokenFromUrlOnce()
  if (apiBase && tok) {
    const tp = `${apiBase}/api/v1/pegasus/theme-preferences`
    console.debug('[pegasus/theme-debug] theme-preferences URL', tp)
    try {
      const res = await fetch(tp, {
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: `Bearer ${tok}` },
      })
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
      console.debug('[pegasus/theme-debug] theme-preferences response', {
        ok: res.ok,
        status: res.status,
        source: body?.source,
        preferences: body?.preferences,
      })
    } catch (e) {
      console.debug('[pegasus/theme-debug] theme-preferences fetch threw', {
        error: e instanceof Error ? e.message : String(e),
      })
    }
  } else {
    console.debug('[pegasus/theme-debug] skip theme-preferences (need VITE_API_URL and auth token)')
  }

  section('10) Summary')
  console.debug(
    '[pegasus/theme-debug] Production uses `data.themes` / `data.user.themes` / … → `themes.dark` (proto BFF extraction). Prefer GET /api/v1/pegasus/theme-preferences with Bearer when VITE_API_URL is set; else same-origin /api/apps/pegasus2.0 with Authenticate header.',
  )
}
