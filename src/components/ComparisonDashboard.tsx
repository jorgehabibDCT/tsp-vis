import type { TspComparisonResponse } from '../contracts/tspComparison'
import type { DashboardDataSource } from '../services/loadDashboardData'
import { ComparisonTable } from './ComparisonTable'
import './Dashboard.css'

type ComparisonDashboardProps = {
  model: TspComparisonResponse
  /** When data came from mock fallback, show a subtle badge. */
  dataSource?: DashboardDataSource
}

export function ComparisonDashboard({
  model,
  dataSource,
}: ComparisonDashboardProps) {
  const showMockBadge = dataSource === 'mock'

  return (
    <div className="comparison-dashboard">
      <header className="comparison-dashboard__header">
        <div className="comparison-dashboard__header-row">
          <div className="comparison-dashboard__titles">
            <h1 className="comparison-dashboard__title">TSP Comparison</h1>
            <p className="comparison-dashboard__subtitle">Prototype</p>
          </div>
          {showMockBadge && (
            <span className="comparison-dashboard__badge">Mock data</span>
          )}
        </div>
      </header>
      <main className="comparison-dashboard__main">
        <ComparisonTable model={model} />
      </main>
    </div>
  )
}
