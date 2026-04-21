import { useMemo, useState } from 'react'
import type { Tsp } from '../types/dashboard'
import type { TspComparisonResponse } from '../contracts/tspComparison'
import { METRIC_ID_INTEGRATION_PERCENT } from '../constants/uiMetricIds'
import {
  readProviderReadinessScores,
  sortDashboardTsps,
} from '../utils/dashboardPayloadFinalize'
import { MetricRow } from './MetricRow'

type ComparisonTableProps = {
  model: TspComparisonResponse
}

function tspHeaderClassName(tsp: Tsp): string {
  const base = 'comparison-table__tsp'
  if (tsp.integrationStatus === 'pending_integration') {
    return `${base} comparison-table__tsp--pending-col`
  }
  if (tsp.id.startsWith('tsp-csv-')) {
    return `${base} comparison-table__tsp--csv-provider`
  }
  return `${base} comparison-table__tsp--branded-integrated`
}

export function ComparisonTable({ model }: ComparisonTableProps) {
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null)
  const tsps = useMemo(
    () =>
      sortDashboardTsps(model.tsps, readProviderReadinessScores(model.metrics)),
    [model.metrics, model.tsps],
  )

  const visibleMetrics = useMemo(
    () => model.metrics.filter((m) => m.id !== METRIC_ID_INTEGRATION_PERCENT),
    [model.metrics],
  )

  function toggleExpandable(id: string) {
    setExpandedMetricId((prev) => (prev === id ? null : id))
  }

  return (
    <div
      className="comparison-scroll"
      role="region"
      aria-label="Provider comparison matrix"
    >
      <table className="comparison-table">
        <thead className="comparison-table__thead">
          <tr>
            <th scope="col" className="comparison-table__corner">
              Metric
            </th>
            {tsps.map((tsp) => (
              <th
                key={tsp.id}
                scope="col"
                className={tspHeaderClassName(tsp)}
              >
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
                  <span
                    className="comparison-table__tsp-name"
                    title={tsp.name}
                  >
                    {tsp.name}
                  </span>
                  {tsp.integrationStatus === 'pending_integration' && (
                    <span
                      className="comparison-table__tsp-pending"
                      title="Listed for roadmap visibility; not yet in the live/defensible dataset — metric cells unavailable until provider mapping is validated."
                    >
                      PENDING INTEGRATION
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMetrics.map((metric) => (
            <MetricRow
              key={metric.id}
              metric={metric}
              tsps={tsps}
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
