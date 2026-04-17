import type { ScalarMetricRow, Tsp } from '../types/dashboard'
import { formatInteger, formatPercent } from '../utils/format'

type ScalarCellsRowProps = {
  metric: ScalarMetricRow
  tsps: Tsp[]
}

export function ScalarCellsRow({ metric, tsps }: ScalarCellsRowProps) {
  return (
    <tr className="comparison-table__row comparison-table__row--scalar">
      <th scope="row" className="comparison-table__label">
        {metric.label}
      </th>
      {tsps.map((tsp) => {
        const cell = metric.values[tsp.id]
        const raw = cell?.value ?? null
        const text =
          metric.kind === 'percent'
            ? formatPercent(raw)
            : formatInteger(raw)
        return (
          <td key={tsp.id} className="comparison-table__num">
            {text}
          </td>
        )
      })}
    </tr>
  )
}
