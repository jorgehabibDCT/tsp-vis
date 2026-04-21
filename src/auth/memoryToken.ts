/**
 * Pegasus may pass the session token in the query string as `access_token` and/or `auth`
 * (live iframe launches have been observed with `?auth=...`).
 * Ported from proto `apps/web/src/lib/auth/memoryToken.ts`.
 */
let memoryToken: string | null = null

export function parseAccessTokenFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const accessToken = params.get('access_token')
  const auth = params.get('auth')
  if (accessToken != null && accessToken !== '') return accessToken
  if (auth != null && auth !== '') return auth
  return null
}

export function captureTokenFromUrlOnce(): string | null {
  if (typeof window === 'undefined') return null
  const token = parseAccessTokenFromSearch(window.location.search)
  if (token) {
    memoryToken = token
    const url = new URL(window.location.href)
    url.searchParams.delete('access_token')
    url.searchParams.delete('auth')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }
  return memoryToken
}

export function getBearerToken(): string | null {
  return memoryToken
}

export function clearMemoryToken(): void {
  memoryToken = null
}
