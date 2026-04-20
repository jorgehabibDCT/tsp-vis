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
        <div className="comparison-dashboard__header-panel">
          <div className="comparison-dashboard__header-row">
            <div className="comparison-dashboard__titles">
              <p className="comparison-dashboard__eyebrow">Dashboard</p>
              <h1 className="comparison-dashboard__title">TSP comparison</h1>
            </div>
            {showMockBadge && (
              <span className="comparison-dashboard__badge">Mock data</span>
            )}
          </div>
        </div>
      </header>
      <main className="comparison-dashboard__main">
        <ComparisonTable model={model} />
      </main>
    </div>
  )
}
