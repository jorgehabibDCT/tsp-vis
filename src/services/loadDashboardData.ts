import { fetchTspComparisonDashboard } from '../api/fetchTspComparisonDashboard'
import { getApiBaseUrl } from '../api/index'
import type { TspComparisonResponse } from '../contracts/tspComparison'
import { mockTspComparisonResponse } from '../data/mockDashboard'

/** Brief delay so the loading UI is observable when using mock fallback. */
const MOCK_LOAD_DELAY_MS = 160

export type DashboardDataSource = 'mock' | 'remote'

export type LoadDashboardDataSuccess = {
  ok: true
  data: TspComparisonResponse
  source: DashboardDataSource
}

export type LoadDashboardDataFailure = {
  ok: false
  error: string
}

export type LoadDashboardDataResult =
  | LoadDashboardDataSuccess
  | LoadDashboardDataFailure

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Loads TSP comparison dashboard data: mock when no API base URL is set,
 * otherwise GET `${VITE_API_URL}${TSP_COMPARISON_DASHBOARD_PATH}`.
 */
export async function loadDashboardData(): Promise<LoadDashboardDataResult> {
  const base = getApiBaseUrl().trim()

  if (!base) {
    await delay(MOCK_LOAD_DELAY_MS)
    return {
      ok: true,
      data: mockTspComparisonResponse,
      source: 'mock',
    }
  }

  try {
    const data = await fetchTspComparisonDashboard(base)
    return { ok: true, data, source: 'remote' }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to load dashboard data'
    return { ok: false, error: message }
  }
}
