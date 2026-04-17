import './components/Dashboard.css'
import { ComparisonDashboard } from './components/ComparisonDashboard'
import { DashboardErrorState } from './components/DashboardErrorState'
import { DashboardLoadingState } from './components/DashboardLoadingState'
import { useDashboardLoad } from './hooks/useDashboardLoad'

export default function App() {
  const { state, reload } = useDashboardLoad()

  if (state.status === 'loading') {
    return <DashboardLoadingState />
  }

  if (state.status === 'error') {
    return (
      <DashboardErrorState message={state.message} onRetry={() => void reload()} />
    )
  }

  return (
    <ComparisonDashboard
      model={state.model}
      dataSource={state.source}
    />
  )
}
