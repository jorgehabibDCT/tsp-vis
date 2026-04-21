/** Opt-in: `?pegasusThemeDebug=1` or `localStorage.pegasusThemeDebug = '1'`. */
export function isPegasusThemeDebugEnabled(): boolean {
  try {
    if (localStorage.getItem('pegasusThemeDebug') === '1') {
      return true
    }
    return (
      new URLSearchParams(window.location.search).get('pegasusThemeDebug') ===
      '1'
    )
  } catch {
    return false
  }
}
