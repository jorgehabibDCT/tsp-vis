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
              <p className="comparison-dashboard__subtitle">
                Side-by-side metrics across selected providers. Columns are ordered
                alphabetically within two bands: integrated providers first, then columns
                pending integration.
              </p>
              <p className="comparison-dashboard__column-legend" aria-label="Column categories">
                <span className="comparison-dashboard__legend-key comparison-dashboard__legend-key--branded" />
                Branded, integrated
                <span className="comparison-dashboard__legend-sep" aria-hidden="true">
                  ·
                </span>
                <span className="comparison-dashboard__legend-key comparison-dashboard__legend-key--csv" />
                CSV audit provider
                <span className="comparison-dashboard__legend-sep" aria-hidden="true">
                  ·
                </span>
                <span className="comparison-dashboard__legend-key comparison-dashboard__legend-key--pending" />
                Pending integration (metrics unavailable)
              </p>
              <p className="comparison-dashboard__positioning-note">
                Integrated columns use live Influx where a provider slug is mapped; other
                integrated cells use curated matrices. Pending columns appear in the matrix for
                visibility but show no placeholder metrics until mapping is validated.
              </p>
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
