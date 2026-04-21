import type { TspComparisonResponse } from '../contracts/tspComparison'
import { ComparisonTable } from './ComparisonTable'
import './Dashboard.css'

type ComparisonDashboardProps = {
  model: TspComparisonResponse
}

export function ComparisonDashboard({ model }: ComparisonDashboardProps) {
  return (
    <div className="comparison-dashboard">
      <main className="comparison-dashboard__main">
        <ComparisonTable model={model} />
      </main>
    </div>
  )
}
