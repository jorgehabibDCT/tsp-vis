import { useState } from 'react'
import type { TspComparisonResponse } from '../contracts/tspComparison'
import { MetricRow } from './MetricRow'

type ComparisonTableProps = {
  model: TspComparisonResponse
}

export function ComparisonTable({ model }: ComparisonTableProps) {
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null)

  function toggleExpandable(id: string) {
    setExpandedMetricId((prev) => (prev === id ? null : id))
  }

  return (
    <div
      className="comparison-scroll"
      role="region"
      aria-label="TSP comparison table"
    >
      <table className="comparison-table">
        <thead>
          <tr>
            <th scope="col" className="comparison-table__corner">
              Metric
            </th>
            {model.tsps.map((tsp) => (
              <th key={tsp.id} scope="col" className="comparison-table__tsp">
                {tsp.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.metrics.map((metric) => (
            <MetricRow
              key={metric.id}
              metric={metric}
              tsps={model.tsps}
              expanded={
                metric.type === 'expandable' && expandedMetricId === metric.id
              }
              onToggleExpandable={() => toggleExpandable(metric.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
