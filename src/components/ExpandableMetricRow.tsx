import type { ExpandableMetricRow, Tsp } from '../types/dashboard'
import { formatInteger } from '../utils/format'
import { ChevronButton } from './ChevronButton'

type ExpandableMetricRowProps = {
  metric: ExpandableMetricRow
  tsps: Tsp[]
  expanded: boolean
  onToggle: () => void
  detailsId: string
}

export function ExpandableMetricRow({
  metric,
  tsps,
  expanded,
  onToggle,
  detailsId,
}: ExpandableMetricRowProps) {
  return (
    <tr className="comparison-table__row comparison-table__row--expandable-parent">
      <th scope="row" className="comparison-table__label comparison-table__label--with-toggle">
        <span className="comparison-table__toggle-wrap">
          <ChevronButton
            expanded={expanded}
            onClick={onToggle}
            controlsId={detailsId}
            label={metric.label}
          />
          <span className="comparison-table__label-text">{metric.label}</span>
        </span>
      </th>
      {tsps.map((tsp) => {
        const cell = metric.values[tsp.id]
        const raw = cell?.summary ?? null
        return (
          <td key={tsp.id} className="comparison-table__num">
            {formatInteger(raw)}
          </td>
        )
      })}
    </tr>
  )
}
