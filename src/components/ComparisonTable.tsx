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
        <thead className="comparison-table__thead">
          <tr>
            <th scope="col" className="comparison-table__corner">
              Metric
            </th>
            {model.tsps.map((tsp) => (
              <th key={tsp.id} scope="col" className="comparison-table__tsp">
                <div className="comparison-table__tsp-header">
                  <span className="comparison-table__tsp-logo-wrap" aria-hidden="true">
                    {tsp.logoUrl ? (
                      <img
                        className="comparison-table__tsp-logo"
                        src={tsp.logoUrl}
                        alt=""
                      />
                    ) : (
                      <span className="comparison-table__tsp-logo-placeholder">
                        {tsp.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="comparison-table__tsp-name">{tsp.name}</span>
                </div>
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
