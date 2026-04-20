import type { TspComparisonResponse } from '../contracts/tspComparison'
import { ComparisonTable } from './ComparisonTable'
import './Dashboard.css'

type ComparisonDashboardProps = {
  model: TspComparisonResponse
}

export function ComparisonDashboard({ model }: ComparisonDashboardProps) {
  return (
    <div className="comparison-dashboard">
      <header className="comparison-dashboard__header">
        <div className="comparison-dashboard__header-panel">
          <h1 className="comparison-dashboard__title">TSP comparison</h1>
        </div>
      </header>
      <main className="comparison-dashboard__main">
        <ComparisonTable model={model} />
      </main>
    </div>
  )
}
