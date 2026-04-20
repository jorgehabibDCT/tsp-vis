import type { ScalarMetricRow, Tsp } from '../types/dashboard'
import { formatInteger, formatPercent } from '../utils/format'

type ScalarCellsRowProps = {
  metric: ScalarMetricRow
  tsps: Tsp[]
}

export function ScalarCellsRow({ metric, tsps }: ScalarCellsRowProps) {
  const isRiskScore = metric.kind === 'score'

  function scoreClass(value: number | null): string {
    if (value === null || Number.isNaN(value)) {
      return 'comparison-table__num--muted'
    }
    if (value >= 75) {
      return 'comparison-table__num--risk-high'
    }
    if (value >= 50) {
      return 'comparison-table__num--risk-medium'
    }
    return 'comparison-table__num--risk-low'
  }

  return (
    <tr
      className={`comparison-table__row comparison-table__row--scalar${
        isRiskScore ? ' comparison-table__row--risk' : ''
      }`}
    >
      <th scope="row" className="comparison-table__label">
        {metric.label}
      </th>
      {tsps.map((tsp) => {
        const cell = metric.values[tsp.id]
        const raw = cell?.value ?? null
        const text = metric.kind === 'percent' ? formatPercent(raw) : formatInteger(raw)
        const cls = isRiskScore
          ? `comparison-table__num comparison-table__num--risk ${scoreClass(raw)}`
          : 'comparison-table__num'
        return (
          <td key={tsp.id} className={cls}>
            {text}
          </td>
        )
      })}
    </tr>
  )
}
