/**
 * Pegasus session auth for HTTP routes other than `/api/login?auth=...`.
 * Pegasus expects the raw token in the **`Authenticate`** header (not `Authorization: Bearer`).
 */
export function pegasusAuthenticateRequestHeaders(token: string): Record<string, string> {
  return {
    Authenticate: token,
    Accept: 'application/json',
  }
}
