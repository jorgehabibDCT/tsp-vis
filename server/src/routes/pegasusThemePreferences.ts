import { Router, type Request, type Response } from 'express'
import { fetchPegasusThemePreferencesFromUpstream } from '../pegasus/fetchPegasusThemePreferencesFromUpstream.js'

function traceEnabled(): boolean {
  return process.env.PEGASUS_THEME_TRACE === '1'
}

function trace(message: string, detail?: Record<string, unknown>): void {
  if (!traceEnabled()) return
  if (detail) {
    console.info(`[pegasus/theme-route] ${message}`, detail)
  } else {
    console.info(`[pegasus/theme-route] ${message}`)
  }
}

function parseBearerToken(req: Request): string | null {
  const raw = req.headers.authorization
  if (typeof raw !== 'string') return null
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim())
  return m?.[1] ?? null
}

/**
 * `GET /api/v1/pegasus/theme-preferences`
 *
 * Returns Pegasus theme **names** from upstream `GET ${PEGASUS_SITE}/api/apps/pegasus2.0`
 * for the iframe session token. Always **200** with optional `preferences` so the UI can fall back.
 */
export function pegasusThemePreferencesRouter(): Router {
  const r = Router()

  r.get('/pegasus/theme-preferences', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate')

    const token = parseBearerToken(req)
    const siteConfigured = Boolean(process.env.PEGASUS_SITE?.trim())
    trace('request received', {
      hasAuthorizationBearer: Boolean(token),
      pegasusSiteConfigured: siteConfigured,
    })

    if (!token) {
      res.json({ ok: true, preferences: null, source: 'no_token' })
      return
    }

    if (!siteConfigured) {
      res.json({ ok: true, preferences: null, source: 'skipped' })
      return
    }

    try {
      const result = await fetchPegasusThemePreferencesFromUpstream(token)
      const prefs = result.preferences
      const hasPreferences = prefs != null
      trace('upstream completed', {
        upstreamOk: result.upstreamOk,
        upstreamHttpStatus: result.upstreamHttpStatus,
        upstreamPath: result.path,
        themesSource: result.themesSource,
        dataThemesFound: result.dataThemesFound,
        hasPreferences,
        dark: prefs?.dark ?? null,
      })

      const responseSource: 'pegasus' | 'empty' | 'upstream_error' = !result.upstreamOk
        ? 'upstream_error'
        : hasPreferences
          ? 'pegasus'
          : 'empty'

      res.json({
        ok: true,
        preferences: prefs,
        source:
          responseSource === 'pegasus'
            ? 'pegasus'
            : responseSource === 'empty'
              ? 'empty'
              : 'upstream_error',
      })
    } catch {
      res.json({ ok: true, preferences: null, source: 'error' })
    }
  })

  return r
}
