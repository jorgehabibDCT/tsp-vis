import type { TspComparisonResponse } from '../contracts/tspComparison'
import { TSP_COMPARISON_DASHBOARD_PATH } from './endpoints'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

/**
 * Fetches the TSP comparison dashboard from a deployed API base URL.
 * Call only when `VITE_API_URL` is set; the server route may not exist yet.
 */
export async function fetchTspComparisonDashboard(
  baseUrl: string,
): Promise<TspComparisonResponse> {
  const root = normalizeBaseUrl(baseUrl)
  const url = `${root}${TSP_COMPARISON_DASHBOARD_PATH}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Network error while loading dashboard'
    throw new Error(message)
  }

  if (!res.ok) {
    const snippet = await res.text().catch(() => '')
    const detail = snippet ? `: ${snippet.slice(0, 200)}` : ''
    throw new Error(
      `Dashboard request failed (${res.status} ${res.statusText})${detail}`,
    )
  }

  return res.json() as Promise<TspComparisonResponse>
}
