import { useCallback, useEffect, useState } from 'react'
import type { TspComparisonResponse } from '../contracts/tspComparison'
import type { DashboardDataSource } from '../services/loadDashboardData'
import { loadDashboardData } from '../services/loadDashboardData'

export type DashboardLoadState =
  | { status: 'loading' }
  | {
      status: 'success'
      model: TspComparisonResponse
      source: DashboardDataSource
    }
  | { status: 'error'; message: string }

export function useDashboardLoad() {
  const [state, setState] = useState<DashboardLoadState>({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await loadDashboardData()
    if (result.ok) {
      setState({
        status: 'success',
        model: result.data,
        source: result.source,
      })
    } else {
      setState({ status: 'error', message: result.error })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { state, reload: load }
}
